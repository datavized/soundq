import num from '../util/num';

const DEFAULT_AMPLITUDE = 1;
const DEFAULT_CROSSFADE = 0.1;

export default function trapezoid(context) {
	const gain = context.createGain();
	gain.gain.value = 0;

	// at least 8 samples long
	const minFadeDuration = 8 / context.sampleRate;

	return {
		node: gain,
		start(startTime, releaseTime, stopTime, options = {}) {
			const amplitude = num(options.amplitude, DEFAULT_AMPLITUDE); // value
			const crossFade = num(options.crossFade, DEFAULT_CROSSFADE); // time in seconds

			const length = stopTime - startTime;
			const fadeDuration = Math.min(Math.max(crossFade, minFadeDuration), length / 2);
			const fadeInTime = startTime + fadeDuration;
			const fadeOutTime = stopTime - fadeDuration;

			gain.gain.cancelScheduledValues(context.currentTime);
			gain.gain.setValueAtTime(0.0, startTime);
			gain.gain.linearRampToValueAtTime(amplitude, fadeInTime);
			if (fadeOutTime < Infinity) {
				gain.gain.setValueAtTime(amplitude, fadeOutTime);
				gain.gain.linearRampToValueAtTime(0, stopTime);
			}
		},
		stop() {
			gain.gain.cancelScheduledValues(context.currentTime);
			gain.gain.value = 0;
		}
	};
}
