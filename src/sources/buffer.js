import audioNodeSource from './node';

export default function bufferSource(controller, options) {
	const {
		context
	} = controller;

	const buffer = options instanceof AudioBuffer ? options : options.buffer;
	const offset = buffer !== options && options.offset || 0;
	let bufferSourceNode = null;
	let nodeSource = null;

	let submitted = false;
	let startTime = Infinity;
	let stopTime = Infinity;

	function stop(time) {
		stopTime = time;
		if (nodeSource) {
			nodeSource.stop(stopTime);
		}
	}

	function stopEvent(event) {
		submitted = false;
		if (nodeSource) {
			nodeSource.stopEvent(event);
		}
	}

	return {
		request(untilTime) {
			if (untilTime >= startTime && !submitted) {
				// create bufferSourceNode and start nodeSource
				bufferSourceNode = context.createBufferSource();
				nodeSource = audioNodeSource(controller, bufferSourceNode);
				nodeSource.start(startTime);
				nodeSource.stop(stopTime);

				submitted = true;

				return nodeSource.request(untilTime);
			}

			return null;
		},
		startEvent(sound) {
			bufferSourceNode.buffer = buffer;
			return nodeSource.startEvent(sound, offset);
		},
		stopEvent,
		start(time) {
			startTime = time;
			stopTime = Infinity;
		},
		stop,
		finishEvent(soundEvent) {
			submitted = false;
			if (nodeSource) {
				nodeSource.finishEvent(soundEvent);
			}
			nodeSource = null;
		}
	};
}