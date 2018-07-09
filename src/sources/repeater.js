/*
todo:
- need test case for request when no currently scheduled events have a stopTime yet
- may need to make scheduleAhead run async in certain cases
*/

/*
todo:
Each source instance needs a `parent` object
- with start/release/stop times
- point to parent source
- set of prop values
- parent may be a shot or it may be another source that created it
- parent will have its own coarse-level callbacks (finish)
- repeater should not need any event-level callbacks
*/

import num from '../util/num';
import computeOptions from '../util/computeOptions';

const DEFAULT_INTERVAL = 0.1;
const DEFAULT_DURATION = 1;
const cancelProperties = ['interval', 'duration', 'playbackRate'];

/*
todo: find a better place to pass patchOptions
*/
export default function (sourceDef, patchDef, patchOptions) {
	if (typeof sourceDef !== 'function') {
		throw new Error('Repeater requires a source definition function');
	}

	if (patchDef && typeof patchDef !== 'function') {
		throw new Error('Repeater patch definition needs to be a function');
	}

	return function repeater(controller) {

		const sources = new Set();
		const sourcesByEvent = new Map();
		const patches = new Map();
		const { context } = controller;

		let latestSubmittedStartTime = -Infinity;
		let latestStartTime = -Infinity;
		let startOptions = undefined;
		let startTime = Infinity;
		let releaseTime = Infinity;
		let stopTime = Infinity;

		function startPatch(patch, props, sourceInstance, shot) {
			const startOpts = {...props};
			delete startOpts.duration;
			delete startOpts.interval;

			const { startTime, releaseTime, stopTime } = sourceInstance;
			patch.start(startTime, releaseTime, stopTime, Object.assign(startOpts, computeOptions(
				patchOptions,
				{ startTime, releaseTime, stopTime },
				shot
			)));
		}

		function freeSourceInstance(sourceInstance) {
			const { source } = sourceInstance;
			if (source.finish) {
				source.finish();
			}
			sources.delete(source);
			controller.freeSource(source);

			if (sourceInstance.startTime < context.currentTime) {
				latestStartTime = Math.max(latestStartTime, sourceInstance.startTime);
			}

			// clean up patch
			const patch = patches.get(sourceInstance);
			if (patch) {
				controller.freePatch(patch);
				patches.delete(sourceInstance);
			}
		}

		function stopFutureSounds() {
			// stop and free any sources that haven't started yet
			latestStartTime = Infinity;
			sources.forEach(sourceInstance => {
				if (sourceInstance.startTime >= releaseTime) {
					sourceInstance.source.stop(releaseTime);
				} else {
					latestStartTime = Math.max(latestStartTime, sourceInstance.startTime);
				}
			});
			latestSubmittedStartTime = Math.min(latestStartTime, latestSubmittedStartTime);
		}

		return {
			request(untilTime) {
				const {
					duration,
					interval,
					...restProps
				} = this.props;

				const intervalVal = num(interval, DEFAULT_INTERVAL);
				const past = context.currentTime - latestSubmittedStartTime;
				const skipIntervals = Math.max(1, Math.ceil(past / intervalVal));

				// todo: maxTime should account for duration
				// todo: allow for some randomness added to startTime here
				const startTime = latestSubmittedStartTime + skipIntervals * intervalVal;
				const maxTime = Math.min(untilTime, releaseTime);
				if (startTime < maxTime && skipIntervals > 0) {

					latestSubmittedStartTime = startTime;

					// each event has start, release (Infinity?) and stop(Infinity?) time
					// todo: get release from options?

					const stopTime = startTime + num(duration, DEFAULT_DURATION);
					const releaseTime = stopTime;

					const sourceInstance = controller.getSource(sourceDef);
					sourceInstance.shot = this.shot;
					sourceInstance.name = 'nested!'; // temp

					// optionally use a function to compute options passed to each event
					sourceInstance.start(startTime, Object.assign(restProps, computeOptions(startOptions, {startTime, releaseTime, stopTime}, this.shot)));
					if (sourceInstance.release) {
						sourceInstance.release(releaseTime);
					}
					if (sourceInstance.stop) {
						sourceInstance.stop(stopTime);
					}
					sources.add({
						startTime,
						releaseTime,
						stopTime,
						source: sourceInstance
					});
				}

				let anyEventsSubmitted = false;
				sources.forEach(sourceInstance => {
					const event = sourceInstance.source.request(untilTime);
					if (event) {
						const id = controller.submit(event);
						sourcesByEvent.set(id, sourceInstance);

						anyEventsSubmitted = true;
					}
				});
				return anyEventsSubmitted;
			},
			startEvent(soundEvent) {
				const sourceInstance = sourcesByEvent.get(soundEvent.id);
				let patch = patches.get(sourceInstance);
				if (patchDef && !patch) {
					patch = controller.getPatch(patchDef);
					patches.set(sourceInstance, patch);
					if (patch && patch.start) {
						startPatch(patch, this.props, sourceInstance, {startTime, releaseTime, stopTime});
					}

				}
				if (sourceInstance && sourceInstance.source.startEvent) {
					const soundEventConfig = sourceInstance.source.startEvent(soundEvent);
					if (soundEventConfig && patch && patch.input) {
						soundEventConfig.output.connect(patch.input);
						return {
							output: patch.output
						};
					}
					return soundEventConfig;
				}
				return null;
			},
			stopEvent(soundEvent) {
				const sourceInstance = sourcesByEvent.get(soundEvent.id);
				if (sourceInstance && sourceInstance.source.stopEvent) {
					const patch = patches.get(soundEvent.id);
					if (patch && patch.start) {
						startPatch(patch, this.props, sourceInstance, {startTime, releaseTime, stopTime});
					}

					sourceInstance.source.stopEvent(soundEvent);
				}
			},
			finishEvent(soundEvent) {
				const sourceInstance = sourcesByEvent.get(soundEvent.id);
				if (sourceInstance) {
					const { source, stopTime } = sourceInstance;
					if (source.finishEvent) {
						source.finishEvent(soundEvent);
					}

					sourcesByEvent.delete(soundEvent.id);
					if (!source.events.size && (stopTime <= context.currentTime || source.done && source.done())) {
						freeSourceInstance(sourceInstance);
					}
				}
			},
			set(key) {
				/*
				todo: undo most of these. they should be done in a wrapper source
				*/
				if (cancelProperties.indexOf(key) >= 0) {
					stopFutureSounds();
					controller.schedule();
				}
			},
			start(time, opts) {
				// start this whole thing
				startOptions = opts;
				startTime = time;
				latestSubmittedStartTime = startTime - num(controller.get('interval'), DEFAULT_INTERVAL);
				latestStartTime = latestSubmittedStartTime;
				releaseTime = Infinity;
			},
			release(time) {
				releaseTime = time;

				// revoke anything that hasn't started before this time
				// release anything that has started but hasn't stopped
				stopFutureSounds();

				sources.forEach(sourceInstance => {
					if (sourceInstance.releaseTime > time && sourceInstance.source.release) {
						sourceInstance.source.release(time);
					}
					if (sourceInstance.startTime > time && sourceInstance.source.stop) {
						sourceInstance.source.stop(time);
					}
				});
			},
			stop(time) {
				if (time < releaseTime) {
					this.release(time);
				}
				stopTime = time;
				sources.forEach(sourceInstance => {
					if (sourceInstance.stopTime > time) {
						sourceInstance.source.stop(time);
					}
				});
				startOptions = undefined;
			},
			finish() {
			}
		};
	};
}