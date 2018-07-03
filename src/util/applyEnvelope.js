// https://en.wikipedia.org/wiki/Synthesizer#Attack_Decay_Sustain_Release_(ADSR)_envelope

import num from './num';

export default function applyEnvelope(param, startTime = 0, releaseTime = Infinity, stopTime = Infinity, options = {}) {
	const peak = num(options.peak,  param.defaultValue); // value
	const start = options.start || 0; // value
	const attack = num(options.attack, 0.1); // time
	const decay = num(options.decay, 0.2); // time
	const sustain = num(options.sustain, 0.5); // value
	// const release = num(options.release, 0.5); // time - todo: use this!
	// const hold = num(options.hold, computeHold(attack, decay, release, duration)); // time

	// todo: make this more natural
	releaseTime = Math.min(releaseTime, stopTime);

	const peakTime = Math.min(startTime + attack, releaseTime);
	const startSustainTime = Math.min(peakTime + decay, releaseTime);

	param.setValueAtTime(start, startTime);
	param.linearRampToValueAtTime(peak, peakTime);
	param.linearRampToValueAtTime(sustain, startSustainTime);

	if (releaseTime < Infinity) {
		param.setValueAtTime(sustain, releaseTime);
	}

	if (stopTime < Infinity) {
		// const endTime = startReleaseTime + release * playbackRate;
		param.linearRampToValueAtTime(0, stopTime);
	}
}