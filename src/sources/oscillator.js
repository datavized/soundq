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
			if (untilTime > startTime && !submitted) {
				// create oscillator and start nodeSource
				output = context.createOscillator();
				nodeSource = audioNodeSource(controller, output);
				nodeSource.start(startTime);
				nodeSource.stop(stopTime);

				submitted = true;

				return nodeSource.request(untilTime);
			}
			return null;
		},
		startEvent(sound) {
			const { startTime } = sound;
			output.frequency.setValueAtTime(frequency, startTime);
			return nodeSource.startEvent(sound);
		},
		stopEvent,
		start(time, options = {}) {
			startTime = time;
			stopTime = Infinity;
			frequency = options.frequency || 440;
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