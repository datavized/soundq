import { AudioContext } from 'standardized-audio-context';
import SoundQ from '../src/index';
import oscillator from '../src/sources/oscillator';
import gainEnvelope from '../src/patches/gainEnvelope';
import repeater from '../src/sources/repeater';
import { getKeyNoteFrequency, keys, modes } from '../src/util/scales';

const interval = 0.4;
const duration = 0.4;
const scaleRange = 15; // two whole octaves (inclusive)
const startOctave = 3;

const data = [
	// [1875, 3],
	// [1876, 5],
	// [1877, 7],
	// [1878, 9],
	// [1879, 10],
	// [1880, 18],
	// [1881, 6],
	// [1882, 14],
	// [1883, 11],
	// [1884, 9],
	// [1885, 5],
	// [1886, 11],
	// [1887, 15],
	// [1888, 6],
	// [1889, 11],
	// [1890, 17],
	// [1891, 12],
	// [1892, 15],
	// [1893, 8],
	// [1894, 4]
	['one', 1],
	['two', 2],
	['three', 3],
	['four', 4],
	['five', 5],
	['six', 6],
	['seven', 7],
	['eight', 8],
	['nine', 9],
	['ten', 10]
];

const minimum = data.reduce((prev, row) => Math.min(prev, row[1]), Infinity);
const maximum = data.reduce((prev, row) => Math.max(prev, row[1]), -Infinity);
const valueRange = maximum - minimum;
// const scaleRange = Math.ceil(valueRange) + 1;

function getRowIndex(time) {
	return Math.round(time / interval) % data.length;
}

document.body.insertAdjacentHTML('beforeend', require('./data-synth.html'));
const tableBody = document.getElementById('tableBody');
data.forEach(row => {
	const tr = document.createElement('tr');
	tableBody.appendChild(tr);

	row.forEach(cellValue => {
		const td = document.createElement('td');
		td.textContent = cellValue;
		tr.appendChild(td);
	});
});

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
	cacheExpiration: 2,
	context: new AudioContext()
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
	const now = soundQ.currentTime;
	const playDuration = data.length * interval;
	shot.start(now, ({startTime}, shot) => {
		const rowIndex = getRowIndex(startTime - shot.startTime);
		const value = data[rowIndex][1];
		const normalized = (value - minimum) / valueRange;
		const note = Math.round(normalized * (scaleRange - 1));

		console.log({value}, {normalized}, {note});

		const frequency = getKeyNoteFrequency(note, keySelect.value, modeSelect.value, startOctave);
		return {
			frequency
		};
	});
	shot.release(now + playDuration);
};

const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
startButton.addEventListener('click', start);
stopButton.addEventListener('click', stop);
