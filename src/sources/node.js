export default function audioNode(controller, node) {
	let started = false;
	let eventId = 0;
	let startTime = Infinity;

	function stop(stopTime) {
		if (eventId && stopTime < Infinity) {
			// signal to controller that we're ready to end this event
			// controller will call finishEvent for us
			controller.end(eventId, stopTime);
		}
	}

	function ended() {
		node.onended = null;
		controller.revoke(eventId);
	}

	function stopEvent({ stopTime }) {
		if (started) {
			console.log('stopping at', stopTime, 'now is', controller.context.currentTime);
			node.stop(stopTime);
		}
	}

	return {
		drain(untilTime) {
			if (untilTime >= startTime) {
				eventId = controller.submit({
					startTime
				});
			}
			return eventId;
		},
		startEvent(sound, offset) {
			const { startTime, stopTime } = sound;
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
		},
		// release: stop,
		stop
	};
}