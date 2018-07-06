export default function trapezoid(context) {
	const gain = context.createGain();
	gain.gain.value = 0;

	// at least 8 samples long
	const minFadeDuration = 8 / context.sampleRate;

	return {
		node: gain,
		start(startTime, releaseTime, stopTime, options = {}) {
			const {
				amplitude,
				crossFade, // time in seconds
				pan
			} = options;

			const length = stopTime - startTime;
			const fadeDuration = Math.max(minFadeDuration, crossFade);
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
