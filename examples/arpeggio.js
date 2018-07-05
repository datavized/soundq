import SoundQ from '../src/index';
import oscillator from '../src/sources/oscillator';
import gainEnvelope from '../src/patches/gainEnvelope';
import repeater from '../src/sources/repeater';

const BASE = 440; // A
const step = Math.pow(2, 1 / 12);
const freq = n => BASE * Math.pow(step, n);
const interval = 0.4;

// const notes = [
// 	0,
// 	2,
// 	4,
// 	5,
// 	7
// ];

const notes = [
	0,
	4,
	7,
	2
];

document.body.insertAdjacentHTML('beforeend', require('./arpeggio.html'));

const soundQ = new SoundQ({
	cacheExpiration: 2
});

const shot = soundQ.shot(repeater(oscillator), gainEnvelope)
	.set({
		interval,
		duration: 0.39
	});

const button = document.getElementById('play');
button.addEventListener('mousedown', () => {
	shot.start(0, ({startTime}, shot) => ({
		frequency: freq(Math.floor((startTime - shot.startTime) / interval) % notes.length)
	}));
});
button.addEventListener('mouseup', () => shot.release(0));
