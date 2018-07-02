export default function audioNode(controller, node) {
	let started = false;
	let eventId = 0;
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
			// console.log('stopping at', stopTime, 'now is', controller.context.currentTime);
			node.stop(stopTime);
		}
	}

	return {
		drain(untilTime) {
			if (untilTime >= startTime && !eventId) {
				eventId = controller.submit({
					startTime,
					stopTime
				});
				return eventId;
			}
			return 0;
		},
		startEvent(sound, offset) {
			const { startTime, stopTime } = sound;
			started = true;
			node.onended = ended;
			node.start(startTime, offset || 0);
			console.log('started node', startTime);

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
			eventId = 0;
		}
	};
}