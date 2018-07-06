/*
todo:
- need test case for request when no currently scheduled events have a stopTime yet
- may need to make scheduleAhead run async in certain cases
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

		const submitted = new Set();
		const sources = new Map();
		const patches = new Map();
		const { context } = controller;

		let latestSubmittedStartTime = -Infinity;
		let latestStartTime = -Infinity;
		let startOptions = undefined;
		let releaseTime = Infinity;

		function startPatch(patch, props, soundEvent) {
			const startOpts = {...props};
			delete startOpts.duration;
			delete startOpts.interval;

			const { startTime, releaseTime, stopTime } = soundEvent;
			patch.start(startTime, releaseTime, stopTime, Object.assign(startOpts, computeOptions(
				patchOptions,
				{ startTime, releaseTime, stopTime }
			)));
		}

		function revokeFutureSounds() {
			submitted.forEach(id => {
				const s = sources.get(id);
				if (s) {
					if (s.startTime >= releaseTime) {
						controller.revoke(id);
					} else {
						latestStartTime = Math.max(latestStartTime, s.startTime);
					}
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
				const startTime = latestSubmittedStartTime + skipIntervals * intervalVal;
				const maxTime = Math.min(untilTime, releaseTime);
				if (startTime < maxTime && skipIntervals > 0) {

					latestSubmittedStartTime = startTime;

					// each event has start, release (Infinity?) and stop(Infinity?) time
					// todo: get release from options?

					const stopTime = startTime + num(duration, DEFAULT_DURATION);
					const releaseTime = stopTime;

					const sourceInstance = controller.getSource(sourceDef);

					// optionally use a function to compute options passed to each event
					sourceInstance.start(startTime, Object.assign(restProps, computeOptions(startOptions, {startTime, releaseTime, stopTime}, this.shot)));
					if (sourceInstance.release) {
						sourceInstance.release(releaseTime);
					}
					if (sourceInstance.stop) {
						sourceInstance.stop(stopTime);
					}

					const event = sourceInstance.request(untilTime);
					if (event) {
						const id = controller.submit(event);
						sources.set(id, {
							startTime,
							releaseTime,
							stopTime,
							source: sourceInstance
						});

						submitted.add(id);
						return id;
					}
				}
				return 0;
			},
			startEvent(soundEvent) {
				const sourceInstance = sources.get(soundEvent.id);
				if (sourceInstance && sourceInstance.source.startEvent) {
					const soundEventConfig = sourceInstance.source.startEvent(soundEvent);
					if (patchDef) {
						const patch = controller.getPatch(patchDef);
						patches.set(soundEvent.id, patch);
						if (patch && patch.start) {
							startPatch(patch, this.props, soundEvent);
						}

						if (patch.input) {
							soundEventConfig.output.connect(patch.input);
							return {
								output: patch.output
							};
						}
					}
					return soundEventConfig;
				}
				return null;
			},
			stopEvent(soundEvent) {
				const sourceInstance = sources.get(soundEvent.id);
				if (sourceInstance && sourceInstance.source.stopEvent) {
					const patch = patches.get(soundEvent.id);
					if (patch && patch.start) {
						startPatch(patch, this.props, soundEvent);
					}

					sourceInstance.source.stopEvent(soundEvent);
				}
			},
			finishEvent(soundEvent) {
				const sourceInstance = sources.get(soundEvent.id);
				if (sourceInstance) {
					if (sourceInstance.startTime < context.currentTime) {
						latestStartTime = Math.max(latestStartTime, sourceInstance.startTime);
					}
					if (sourceInstance.source.finishEvent) {
						sourceInstance.source.finishEvent(soundEvent);
					}

					const patch = patches.get(soundEvent.id);
					if (patch) {
						controller.freePatch(patch);
						patches.delete(soundEvent.id);
					}

					sources.delete(soundEvent.id);
					controller.freeSource(sourceInstance.source);
					submitted.delete(soundEvent.id);
				}
			},
			set(key) {
				/*
				todo: undo most of these. they should be done in a wrapper source
				*/
				if (cancelProperties.indexOf(key) >= 0) {
					revokeFutureSounds();
					controller.schedule();
				}
			},
			start(startTime, opts) {
				// start this whole thing
				startOptions = opts;
				latestSubmittedStartTime = startTime - num(controller.get('interval'), DEFAULT_INTERVAL);
				releaseTime = Infinity;
			},
			release(time) {
				releaseTime = time;

				// revoke anything that hasn't started before this time
				// release anything that has started but hasn't stopped
				revokeFutureSounds();

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
				releaseTime = time;
				sources.forEach(sourceInstance => {
					if (sourceInstance.stopTime > time) {
						sourceInstance.source.stop(time);
					}
				});
				startOptions = undefined;
			}
		};
	};
}