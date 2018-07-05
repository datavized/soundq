export default function (node) {
	if (!(node instanceof AudioScheduledSourceNode)) {
		throw new Error('Node source requires an AudioScheduledSourceNode');
	}

	return function audioNode(controller) {
		let started = false;
		let eventId = 0;
		let submitted = false;
		let startTime = Infinity;
		let stopTime = Infinity;

		function stop(time) {
			stopTime = time;
			if (eventId && stopTime < Infinity) {
				// signal to controller that we're ready to end this event
				// controller will call finishEvent for us
				controller.stop(eventId, stopTime);
			}
		}

		function ended() {
			node.onended = null;
			controller.revoke(eventId);
		}

		function stopEvent({ stopTime }) {
			if (started) {
				node.stop(stopTime);
			}
		}

		return {
			expired() {
				return submitted;
			},
			request(untilTime) {
				if (untilTime > startTime && !submitted) {
					submitted = true;
					return {
						startTime,
						stopTime
					};
				}
				return null;
			},
			startEvent(sound, offset) {
				const { startTime, stopTime } = sound;
				eventId = sound.id;
				started = true;
				node.onended = ended;
				node.start(startTime, offset || 0);

				if (stopTime < Infinity) {
					stopEvent(sound);
				}

				return {
					output: node
				};
			},
			stopEvent,
			start(time) {
				startTime = time;
				stopTime = Infinity;
			},
			// release: stop,
			stop

			// This has no finishEvent because it cannot be restarted
			// Audio nodes cannot be reused, so you just need to create a new instance
			// node should be disconnected by core code and automatically garbage collected
		};
	};
}