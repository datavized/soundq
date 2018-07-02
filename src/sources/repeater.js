/*
todo:
- need test case for drain when no currently scheduled events have an endTime yet
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
	const submitted = [];
	// const started = [];
	const sources = new Map();
	const { context } = controller;

	let latestStartTime = -Infinity;
	let startOptions = undefined;
	let releaseTime = Infinity;

	return {
		drain(untilTime) {
			const past = Math.min(context.currentTime - latestStartTime);
			const skipIntervals = Math.ceil(past / interval);
			latestStartTime += skipIntervals * interval;

			// todo: submit a single event?
			// todo: maxTime should account for duration
			for (let startTime = latestStartTime, maxTime = Math.min(untilTime, releaseTime); startTime < maxTime; startTime += interval) {

				// each event has start, release (Infinity?) and end(Infinity?) times
				// todo: get release from options?
				// todo: use a function to compute options passed to each event
				const stopTime = startTime + duration;
				const releaseTime = stopTime;

				const sourceInstance = pool.length ?
					pool.pop() :
					source(controller, options);

				const eventId = sourceInstance.start(startTime);
				if (sourceInstance.release) {
					sourceInstance.release(releaseTime);
				}
				if (sourceInstance.stop) {
					sourceInstance.stop(stopTime);
				}

				sources.set(eventId, {
					startTime,
					releaseTime,
					stopTime,
					source: sourceInstance
				});
				submitted.push(sourceInstance);

				break;
			}
		},
		// cancel(event) {},
		startEvent(soundEvent) {
			const sourceInstance = sources.get(event.id);
			if (sourceInstance && sourceInstance.source.startEvent) {
				return sourceInstance.source.startEvent(soundEvent, startOptions);
			}
			return null;
		},
		stopEvent(soundEvent) {
			const sourceInstance = sources.get(event.id);
			if (sourceInstance && sourceInstance.source.stopEvent) {
				sourceInstance.source.stopEvent(soundEvent);
			}
		},
		finishEvent(soundEvent) {
			const sourceInstance = sources.get(event.id);
			if (sourceInstance) {
				if (sourceInstance.source.finishEvent) {
					sourceInstance.source.finishEvent(soundEvent);
				}
				sources.delete(event.id);
				pool.push(sourceInstance.source);
			}
		},
		start(startTime, opts) {
			// start this whole thing

			// todo: optionally use a function to compute options passed to each event
			// todo: stack options up, since they may change?
			startOptions = opts;
			latestStartTime = startTime - interval;
		},
		release(time) {
			releaseTime = time;
			// todo: revoke anything that hasn't started before this time
			// todo: release anything that has started but hasn't stopped
			sources.forEach(sourceInstance => {
				if (sourceInstance.releaseTime > time) {
					sourceInstance.source.release(time);
				}
			});
		},
		stop(time) {
			// todo: revoke anything that hasn't ended
			// todo: stop anything that has started but hasn't stopped
			sources.forEach(sourceInstance => {
				if (sourceInstance.stopTime > time) {
					sourceInstance.source.stop(time);
				}
			});
			startOptions = undefined;
		},
		finish(time) {
			// todo: clean anything out of pending queue that ends before this time
		},
		destroy() {}
	};
}