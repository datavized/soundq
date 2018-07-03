import audioNodeSource from './node';

export default function bufferSource(controller, options) {
	const {
		context
	} = controller;

	const hasOptions = !(options instanceof AudioBuffer);
	const buffer = hasOptions ? options.buffer : options;
	const offset = hasOptions && options.offset || 0;
	const loop = !!(hasOptions && options.loop);
	const playbackRate = hasOptions && options.playbackRate || 1;

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
		if (nodeSource) {
			nodeSource.stopEvent(event);
		}
	}

	return {
		request(untilTime) {
			if (untilTime >= startTime && !submitted) {
				// create bufferSourceNode and start nodeSource
				bufferSourceNode = context.createBufferSource();
				bufferSourceNode.loop = loop;
				bufferSourceNode.playbackRate.value = playbackRate;
				nodeSource = audioNodeSource(controller, bufferSourceNode);

				const start = Math.max(startTime, context.currentTime);
				nodeSource.start(start);
				nodeSource.stop(loop ? stopTime : Math.min(stopTime, start + buffer.duration * playbackRate));

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
			startTime = Infinity;
			if (nodeSource) {
				nodeSource.finishEvent(soundEvent);
			}
			nodeSource = null;
		}
	};
}