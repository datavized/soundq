import audioNodeSource from './node';

export default function oscillator(controller) {
	let frequency = 440;

	const {
		context
	} = controller;

	let output = null;
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
		eventId = 0;
		if (nodeSource) {
			nodeSource.stopEvent(event);
		}
	}

	return {
		drain(untilTime) {
			if (untilTime >= startTime && !eventId) {
				// create oscillator and start nodeSource
				output = context.createOscillator();
				nodeSource = audioNodeSource(controller, output);
				nodeSource.start(startTime);
				nodeSource.stop(stopTime);

				eventId = nodeSource.drain(untilTime);
				return eventId;
			}
			return 0;
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
			eventId = 0;
			if (nodeSource) {
				nodeSource.finishEvent(soundEvent);
			}
			nodeSource = null;
		}
	};
}