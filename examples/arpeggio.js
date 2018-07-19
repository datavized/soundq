import SoundQ from '../src/index';
import oscillator from '../src/sources/oscillator';
import gainEnvelope from '../src/patches/gainEnvelope';
import repeater from '../src/sources/repeater';
import { getKeyNoteFrequency, keys, modes } from '../src/util/scales';

const interval = 0.4;
const duration = 0.4;

const notes = [0, 1, 2, 3, 4, 3, 2, 1];

document.body.insertAdjacentHTML('beforeend', require('./arpeggio.html'));

const modeSelect = document.getElementById('mode');
const keySelect = document.getElementById('key');

keys.forEach(k => {
	const option = document.createElement('option');
	option.value = k;
	option.textContent = k;
	keySelect.appendChild(option);
});

modes.forEach(mode => {
	const option = document.createElement('option');
	option.value = mode;
	option.textContent = mode[0].toUpperCase() + mode.substr(1);
	modeSelect.appendChild(option);
});

const soundQ = new SoundQ({
	cacheExpiration: 2
});

const shot = soundQ.shot(repeater(oscillator, gainEnvelope, {
	attack: 0.08,
	decay: 0.1,
	release: 0.2
}))
	.set({
		interval,
		duration
	});

const stop = () => {
	shot.release();
};
const start = () => {
	shot.stop();
	shot.start(0, ({startTime}, shot) => {
		const note = notes[Math.round((startTime - shot.startTime) / interval) % notes.length];
		const frequency = getKeyNoteFrequency(note, keySelect.value, modeSelect.value);
		return {
			frequency
		};
	});
};

const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
startButton.addEventListener('click', start);
stopButton.addEventListener('click', stop);
