import applyEnvelope from '../util/applyEnvelope';

export default function gainEnvelope(context) {
	const gainNode = context.createGain();
	const gain = gainNode.gain;

	let startTime = -1;
	let releaseTime = Infinity;
	let stopTime = Infinity;
	let options = {};

	function apply() {
		gain.cancelScheduledValues(context.currentTime);
		applyEnvelope(gain, startTime, releaseTime, stopTime, options);
	}

	return {
		input: gainNode,
		output: gainNode,
		start(time, opts = {}) {
			if (startTime !== time || opts !== options) {
				startTime = time;
				releaseTime = Infinity;
				stopTime = Infinity;
				options = opts;

				apply();
			}
		},
		release(time) {
			if (releaseTime !== time) {
				releaseTime = time;
				apply();
			}
		},
		stop(time) {
			if (stopTime !== time) {
				stopTime = time;
				apply();
			}
		}
	};
}
