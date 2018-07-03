export default function audioNode(controller, node) {
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
		stop,
		finishEvent() {
			submitted = false;
			startTime = Infinity;
			eventId = 0;
		}
	};
}