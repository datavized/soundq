import audioNodeSource from './node';

export default function bufferSource(controller, options) {
	const {
		context
	} = controller;

	const buffer = options instanceof AudioBuffer ? options : options.buffer;
	const offset = buffer !== options && options.offset || 0;
	let bufferSourceNode = null;
	let nodeSource = null;

	let eventId = 0;
	let startTime = Infinity;
	let stopTime = Infinity;

	function stop(time) {
		stopTime = time;
		if (nodeSource) {
			nodeSource.stop(stopTime);
		}
	}

	function stopEvent(event) {
		if (nodeSource) {
			nodeSource.stopEvent(event);
		}
	}

	return {
		drain(untilTime) {
			if (untilTime >= startTime) {
				// create bufferSourceNode and start nodeSource
				bufferSourceNode = context.createBufferSource();
				nodeSource = audioNodeSource(controller, bufferSourceNode);
				nodeSource.start(startTime);
				nodeSource.stop(stopTime);

				eventId = nodeSource.drain(untilTime);
			}
			return eventId;
		},
		startEvent(sound) {
			bufferSourceNode.buffer = buffer;
			return nodeSource.startEvent(sound, offset);
		},
		stopEvent,
		start(time) {
			startTime = time;
		},
		stop,
		finishEvent() {
			nodeSource = null;
		}
	};
}