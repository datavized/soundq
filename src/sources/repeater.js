/*
todo:
- need test case for request when no currently scheduled events have a stopTime yet
- may need to make scheduleAhead run async in certain cases
*/

import num from '../util/num';
import computeOptions from '../util/computeOptions';

const DEFAULT_INTERVAL = 0.1;
const DEFAULT_DURATION = 1;

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
				const interval = num(controller.get('interval'), DEFAULT_INTERVAL);
				const past = context.currentTime - latestSubmittedStartTime;
				const skipIntervals = Math.max(1, Math.ceil(past / interval));

				// todo: maxTime should account for duration
				const startTime = latestSubmittedStartTime + skipIntervals * interval;
				const maxTime = Math.min(untilTime, releaseTime);
				if (startTime < maxTime && skipIntervals > 0) {

					latestSubmittedStartTime = startTime;

					// each event has start, release (Infinity?) and stop(Infinity?) times
					// todo: get release from options?
					const duration = num(controller.get('duration'), DEFAULT_DURATION);
					const stopTime = startTime + duration;
					const releaseTime = stopTime;

					const sourceInstance = controller.getSource(sourceDef);

					// optionally use a function to compute options passed to each event
					const opts = typeof startOptions === 'function' ? startOptions({startTime, releaseTime, stopTime}, this.shot) : startOptions;
					sourceInstance.start(startTime, opts);
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
							// todo: pass in patch options
							const { startTime, releaseTime, stopTime } = soundEvent;
							patch.start(startTime, releaseTime, stopTime, computeOptions(
								patchOptions,
								{ startTime, releaseTime, stopTime }
							));
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
						// todo: pass in patch options
						patch.start(soundEvent.startTime, soundEvent.releaseTime, soundEvent.stopTime);
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
				if (key === 'interval') {
					revokeFutureSounds();
					controller.schedule();
				}
			},
			start(startTime, opts) {
				// start this whole thing
				startOptions = opts;
				latestSubmittedStartTime = startTime - num(controller.get('interval'), 0.1);
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