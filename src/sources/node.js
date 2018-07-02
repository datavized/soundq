export default function audioNode(controller, node) {
	let started = false;
	let eventId = 0;

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
		start(startTime) {
			// start this whole thing
			// we don't need to queue up events, so just submit one right away
			// we'll let the controller manage the queue for us

			// todo: don't submit until drained!
			eventId = controller.submit({
				startTime
			});
		},
		// release: stop,
		stop
	};
}