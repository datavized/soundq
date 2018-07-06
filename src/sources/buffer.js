import audioNodeSource from './node';

export default function bufferSourceFactory(buffer) {
	if (!(buffer instanceof AudioBuffer)) {
		throw new Error('Buffer source requires an AudioBuffer');
	}

	return function bufferSource(controller) {
		const {
			context
		} = controller;

		let bufferSourceNode = null;
		let nodeSource = null;

		let submitted = false;
		let startTime = Infinity;
		let stopTime = Infinity;
		let done = true;

		let startOptions = {};

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
			done() {
				return done;
			},
			request(untilTime) {
				if (untilTime > startTime && !submitted) {
					const loop = !!startOptions.loop;
					const loopStart = startOptions.loopStart || 0;
					const loopEnd = startOptions.loopEnd || 0;
					const playbackRate = startOptions.playbackRate > 0 ? startOptions.playbackRate : 1;

					// create bufferSourceNode and start nodeSource
					bufferSourceNode = context.createBufferSource();
					bufferSourceNode.loop = loop;
					bufferSourceNode.loopStart = loopStart;
					bufferSourceNode.loopEnd = loopEnd;
					bufferSourceNode.playbackRate.value = playbackRate;
					nodeSource = audioNodeSource(bufferSourceNode)(controller);

					const start = Math.max(startTime, context.currentTime);
					const offset = startOptions.offset || 0;
					nodeSource.start(start, offset);
					nodeSource.stop(loop ? stopTime : Math.min(stopTime, start + buffer.duration / playbackRate));

					submitted = true;

					return nodeSource.request(untilTime);
				}

				return null;
			},
			startEvent(sound) {
				bufferSourceNode.buffer = buffer;
				return nodeSource.startEvent(sound);
			},
			stopEvent,
			start(time, opts) {
				done = false;
				startTime = time;
				stopTime = Infinity;
				startOptions = opts || {};
			},
			stop,
			finishEvent(soundEvent) {
				done = true;
				submitted = false;
				startTime = Infinity;
				if (nodeSource && nodeSource.finishEvent) {
					nodeSource.finishEvent(soundEvent);
				}
				nodeSource = null;
			}
		};
	};
}