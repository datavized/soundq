import audioNodeSource from './node';

export default function oscillator(controller) {
	let frequency = 440;

	const {
		context
	} = controller;

	let output = null;
	let nodeSource = null;

	let submitted = false;
	let startTime = Infinity;
	let stopTime = Infinity;

	return {
		done() {
			return nodeSource.done && nodeSource.done();
		},
		start(time, options = {}) {
			startTime = time;
			stopTime = Infinity;
			frequency = options.frequency || 440;
		},
		stop(time) {
			stopTime = time;
			if (nodeSource) {
				nodeSource.stop(stopTime);
			}
		},
		finish() {
			submitted = false;
			startTime = Infinity;
			if (nodeSource && nodeSource.finish) {
				nodeSource.finish();
			}
			nodeSource = null;
		},
		request(untilTime) {
			if (untilTime > startTime && !submitted) {
				// create oscillator and start nodeSource
				output = context.createOscillator();
				output.frequency.setValueAtTime(frequency, startTime);
				nodeSource = audioNodeSource(output)(controller);
				nodeSource.start(startTime);
				nodeSource.stop(stopTime);

				submitted = true;

				return nodeSource.request(untilTime);
			}
			return null;
		},
		startEvent(soundEvent) {
			return nodeSource.startEvent && nodeSource.startEvent(soundEvent) || null;
		},
		stopEvent(soundEvent) {
			if (nodeSource) {
				nodeSource.stopEvent(soundEvent);
			}
		},
		finishEvent(soundEvent) {
			if (nodeSource && nodeSource.finishEvent) {
				nodeSource.finishEvent(soundEvent);
			}
		}
	};
}