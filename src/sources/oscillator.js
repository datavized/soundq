import audioNodeSource from './node';

export default function oscillator(controller) {
	let frequency = 440;

	const {
		context
	} = controller;

	let output = null;
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
			const { startTime } = sound;
			output.frequency.setValueAtTime(frequency, startTime);
			return nodeSource.startEvent(sound);
		},
		stopEvent,
		start(startTime, options = {}) {
			frequency = options.frequency || 440;

			output = context.createOscillator();
			nodeSource = audioNodeSource(controller, output);
			return nodeSource.start(startTime);
		},
		stop,
		finishEvent() {
			nodeSource = null;
		}
	};
}