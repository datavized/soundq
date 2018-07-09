import SoundQ from '../src/index';

import bufferSource from '../src/sources/buffer';
// import granulizer from '../src/sources/granulizer';
import repeater from '../src/sources/repeater';
import compose from '../src/patches/compose';
import panner from '../src/patches/panner';
import trapezoid from '../src/patches/trapezoid';

import dragDrop from './util/drag-drop';
import drawWaveform from 'draw-wave';
import { Knob } from 'uil/src/proto/Knob';
// import { Button } from 'uil/src/proto/Button';

document.title = 'Granular Synthesis';
document.body.insertAdjacentHTML('beforeend', require('./grain.html'));

const audioContext = new AudioContext();

function getAudioBuffer(url) {
	return fetch(url)
		.then(response => response.arrayBuffer())
		.then(buffer => audioContext.decodeAudioData(buffer));
}

const grainOptions = {
	amplitude: 0.1,
	crossFadeRelative: 0.5,
	crossFade: 0.5,
	length: 0.6,
	spread: 0.1,
	panSpread: 0.25
};

const repeaterOptions = {
	offset: 3.9, //Math.random() * 0.5, // Math.random() * buffer.duration,
	transpose: 1
};

let granular = null;
let audioBuffer = null;
let playing = false;
let mouseIsDown = false;

const grain = compose([trapezoid, panner]);
const calcGrainOptions = grainOptions;

/*
todo: add pitch jitter
*/
function calcRepeaterOptions({startTime}) {
	const spread = grainOptions.spread;
	const length = grainOptions.length;
	const offset = mouseIsDown ? grainOptions.offset : startTime % audioBuffer.duration;

	const randomOffset = Math.random() * spread - spread / 2;
	const maxOffset = audioBuffer.duration - length / repeaterOptions.transpose;
	const adjustedOffset = Math.max(0, Math.min(maxOffset, offset + randomOffset));
	return {
		playbackRate: repeaterOptions.transpose, // temp
		offset: adjustedOffset
	};
}

function setCrossFade() {
	grainOptions.crossFade = grainOptions.crossFadeRelative * 0.5 * (grainOptions.length || 1);
}

const controlDefs = [
	{
		key: 'amplitude',
		name: 'Amplitude',
		min: 0,
		max: 1,
		target: grainOptions
	},
	{
		key: 'rate',
		name: 'Rate',
		min: 0.5, // every 2 seconds
		max: 50, // every 1/50th of a second
		val: 40,
		cb: val => {
			if (granular) {
				granular.set('interval', 1 / val);
			}
		}
	},
	{
		key: 'length',
		name: 'Grain Length',
		min: 0.01,
		max: 2,
		val: grainOptions.length,
		cb: val => {
			grainOptions.length = val;
			if (granular) {
				granular.set('duration', val);
			}
			setCrossFade();
		}
	},
	{
		key: 'spread',
		name: 'Offset Spread',
		min: 0,
		max: 1,
		target: grainOptions
	},
	{
		key: 'crossFade',
		name: 'X-Fade',
		min: 0,
		max: 1,
		val: 0.5,
		// target: grainOptions
		cb: val => {
			grainOptions.crossFadeRelative = val;
			setCrossFade();
		}
	},
	{
		key: 'transpose',
		name: 'Pitch',
		min: -12,
		max: 12,
		val: 0,
		cb: val => {
			const t = Math.pow(2, val / 12);
			repeaterOptions.transpose = t;
			granular.set('playbackRate', t);
		}
	},
	{
		key: 'panSpread',
		name: 'Pan Spread',
		min: 0,
		max: 1,
		target: grainOptions
	}
];

controlDefs.forEach(def => {
	const knob = new Knob({
		name: def.name,
		w: 75,
		min: def.min || 0,
		max: def.max || 1,
		step: def.step || 0.0001,
		value: def.val === undefined ? grainOptions[def.key] : def.val,
		fontColor: '#444444',
		titleColor: '#000000'
	});
	if (def.cb) {
		knob.onChange(def.cb);
	} else if (def.target) {
		knob.onChange(val => def.target[def.key] = val);
	}
});


const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const touch = document.getElementById('touch');
const playhead = document.getElementById('playhead');
const waveformContainer = document.getElementById('waveform-container');

const soundQ = new SoundQ({
	maxLiveSounds: 1000
});

const start = () => {
	if (granular && !playing) {
		playing = true;
		granular.start(calcRepeaterOptions);
	}
};

const stop = () => {
	if (granular && playing) {
		playing = false;
		granular.release();
	}
};

startButton.addEventListener('click', start);
stopButton.addEventListener('click', stop);

touch.addEventListener('mousedown', start);
touch.addEventListener('touchstart', start);

touch.addEventListener('mouseup', stop);
touch.addEventListener('touchstop', evt => {
	if (granular && !evt.touches.length) {
		stop();
	}
});

function doMouse(evt) {
	if (evt.type === 'mousedown') {
		mouseIsDown = true;
	} else if (evt.type === 'mouseup') {
		mouseIsDown = false;
	}
	const x = evt.pageX;
	if (audioBuffer && mouseIsDown) {
		grainOptions.offset = x / window.innerWidth * audioBuffer.duration;
		playhead.style.left = 100 * grainOptions.offset / audioBuffer.duration + '%';
	}
}

// function doTouch(evt) {
// 	console.log('touch', evt);
// 	if (evt.touches.length) {
// 	}
// }

waveformContainer.addEventListener('mousedown', doMouse);
waveformContainer.addEventListener('mousemove', doMouse);
waveformContainer.addEventListener('mouseup', doMouse);
// waveformContainer.addEventListener('touchstart', doTouch);
// waveformContainer.addEventListener('touchmove', doTouch);
// waveformContainer.addEventListener('touchend', doTouch);

function loadedBuffer(buffer) {

	audioBuffer = buffer;
	startButton.disabled = false;
	stopButton.disabled = false;
	touch.disabled = false;

	stop();

	if (granular) {
		granular.destroy();
	}

	const canvas = document.getElementById('waveform');
	canvas.width = 800 * window.devicePixelRatio;
	canvas.height = 200 * window.devicePixelRatio;
	drawWaveform.canvas(canvas, buffer);

	grainOptions.offset = Math.random() * buffer.duration;
	playhead.style.left = 100 * grainOptions.offset / buffer.duration + '%';

	granular = soundQ
		// .shot(granulizer(bufferSource(buffer)/*, grain, calcGrainOptions*/))
		.shot(repeater(bufferSource(buffer), grain, calcGrainOptions))
		.set({
			// length: 0.6,
			// rate: 40,
			// offset: 3.9,
			// spread: 0,
			// transpose: 1 // todo: change this to playbackRate
		});
	// todo: adjust amplitude based on amount of overlap? or use dynamic compressor
}

const audioFile = require('./audio/forest-hi44.wav');
getAudioBuffer(audioFile).then(loadedBuffer);
dragDrop(files => {
	const el = document.createElement('audio');
	let audioFile = null;
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		if (file && file.size && el.canPlayType(file.type)) {
			audioFile = file;
			break;
		}
	}

	if (!audioFile) {
		return;
	}

	const reader = new FileReader();
	reader.onload = () => {
		audioContext.decodeAudioData(reader.result, loadedBuffer);
	};
	reader.readAsArrayBuffer(audioFile);
});
