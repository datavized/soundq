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

	let latestStartTime = -Infinity;
	let startOptions = undefined;
	let releaseTime = Infinity;

	return {
		request(untilTime) {
			const past = context.currentTime - latestStartTime;
			const skipIntervals = Math.max(1, Math.ceil(past / interval));

			// todo: maxTime should account for duration
			const startTime = latestStartTime + skipIntervals * interval;
			const maxTime = Math.min(untilTime, releaseTime);
			if (startTime < maxTime && skipIntervals > 0) {

				latestStartTime = startTime;

				// each event has start, release (Infinity?) and stop(Infinity?) times
				// todo: get release from options?
				// todo: use a function to compute options passed to each event
				const stopTime = startTime + duration;
				const releaseTime = stopTime;

				const sourceInstance = pool.length ?
					pool.pop() :
					source(controller, options);

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
					// console.log('submitted', startTime, stopTime, stopTime - startTime);
					submitted.add(sourceInstance);
					return id;
				}
			}
			return 0;
		},
		// cancel(event) {},
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
				if (sourceInstance.source.finishEvent) {
					sourceInstance.source.finishEvent(soundEvent);
				}
				sources.delete(soundEvent.id);
				pool.push(sourceInstance.source);
				submitted.delete(sourceInstance);
			}
		},
		start(startTime, opts) {
			// start this whole thing

			// todo: optionally use a function to compute options passed to each event
			// todo: stack options up, since they may change?
			startOptions = opts;
			latestStartTime = startTime - interval;
			releaseTime = Infinity;
		},
		release(time) {
			releaseTime = time;
			// todo: revoke anything that hasn't started before this time
			// todo: release anything that has started but hasn't stopped
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