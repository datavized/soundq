/*
todo:
- need test case for request when no currently scheduled events have a stopTime yet
- may need to make scheduleAhead run async in certain cases
*/

export default function repeater(controller, {
	interval,
	duration,
	source,
	options
}) {

	// todo: figure out how to make interval changeable

	// it's up to us to retain any reusable resources
	const pool = [];

	// todo: we'll use this to revoke events if interval changes
	const submitted = new Set();

	const sources = new Map();
	const { context } = controller;

	let latestSubmittedStartTime = -Infinity;
	let latestStartTime = -Infinity;
	let startOptions = undefined;
	let releaseTime = Infinity;

	return {
		request(untilTime) {
			const past = context.currentTime - latestSubmittedStartTime;
			const skipIntervals = Math.max(1, Math.ceil(past / interval));

			// todo: maxTime should account for duration
			const startTime = latestSubmittedStartTime + skipIntervals * interval;
			const maxTime = Math.min(untilTime, releaseTime);
			if (startTime < maxTime && skipIntervals > 0) {

				latestSubmittedStartTime = startTime;

				// each event has start, release (Infinity?) and stop(Infinity?) times
				// todo: get release from options?
				const stopTime = startTime + duration;
				const releaseTime = stopTime;

				const sourceInstance = pool.length ?
					pool.pop() :
					source(controller, options);

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
				return sourceInstance.source.startEvent(soundEvent);
			}
			return null;
		},
		stopEvent(soundEvent) {
			const sourceInstance = sources.get(soundEvent.id);
			if (sourceInstance && sourceInstance.source.stopEvent) {
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
				sources.delete(soundEvent.id);
				pool.push(sourceInstance.source);
				submitted.delete(soundEvent.id);
			}
		},
		start(startTime, opts) {
			// start this whole thing
			startOptions = opts;
			latestSubmittedStartTime = startTime - interval;
			releaseTime = Infinity;
		},
		release(time) {
			releaseTime = time;
			// todo: revoke anything that hasn't started before this time
			// todo: release anything that has started but hasn't stopped
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
			sources.forEach(sourceInstance => {
				if (sourceInstance.releaseTime > time && sourceInstance.source.release) {
					sourceInstance.source.release(time);
				}
			});
		},
		stop(time) {
			// todo: revoke anything that hasn't stopped
			// todo: stop anything that has started but hasn't stopped
			releaseTime = time;
			sources.forEach(sourceInstance => {
				if (sourceInstance.stopTime > time) {
					sourceInstance.source.stop(time);
				}
			});
			startOptions = undefined;
		},
		destroy() {
			while (pool.length) {
				const source = pool.pop();
				if (source.destroy) {
					source.destroy();
				}
			}
		}
	};
}