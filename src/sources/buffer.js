import audioNodeSource from './node';

export default function bufferSource(controller, options) {
	const {
		context
	} = controller;

	const buffer = options instanceof AudioBuffer ? options : options.buffer;
	const offset = buffer !== options && options.offset || 0;
	let bufferSourceNode = null;
	let nodeSource = null;

	function stop(stopTime) {
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
		// todo: implement drain
		startEvent(sound) {
			bufferSourceNode.buffer = buffer;
			return nodeSource.startEvent(sound, offset);
		},
		stopEvent,
		start(startTime) {
			// todo: don't make buffer until we need it?
			// create bufferSourceNode and start nodeSource in drain
			bufferSourceNode = context.createBufferSource();
			nodeSource = audioNodeSource(controller, bufferSourceNode);
			return nodeSource.start(startTime);
		},
		stop,
		finishEvent() {
			nodeSource = null;
		}
	};
}