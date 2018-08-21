import { AudioContext } from 'standardized-audio-context';
import SoundQ from '../src/index';

import bufferSource from '../src/sources/buffer';
// import granulizer from '../src/sources/granulizer';
import repeater from '../src/sources/repeater';
import compose from '../src/patches/compose';
import panner from '../src/patches/panner';
import trapezoid from '../src/patches/trapezoid';

import { Knob } from 'uil/src/proto/Knob';
import dragDrop from './util/drag-drop';

let seed = 9876;
function random() {
	const x = Math.sin(seed++) * 10000;
	return x - Math.floor(x);
}

document.title = 'Granular Synthesis Sequence';
document.body.insertAdjacentHTML('beforeend', require('./grain-sequence.html'));

const audioContext = new AudioContext();
// const envelopeGrain = compose([grain, gainEnvelope]);

function getAudioBuffer(url) {
	return fetch(url)
		.then(response => response.arrayBuffer())
		.then(buffer => audioContext.decodeAudioData(buffer));
}

const tempo = 60; // bpm
const secondsPerBeat = 60 / tempo;
// const eighthNoteLength = secondsPerBeat / 2;

// const startButton = document.getElementById('start');
// const stopButton = document.getElementById('stop');

const soundQ = new SoundQ({
	maxLiveSounds: 1000,
	context: new AudioContext()
});
const grain = compose([trapezoid, panner]);

const defaultLayerOptions = {
	offset: 3.9,
	amplitude: 0.1,
	crossFade: 0,
	decay: 0,
	hold: 0,
	length: 0.3,
	transpose: 1,
	spread: 0,
	panSpread: 0.25
};

const controlDefs = [
	{
		key: 'amplitude',
		name: 'Amplitude',
		min: 0,
		max: 1,
		val: 0.1
	},
	{
		key: 'rate',
		name: 'Rate',
		min: 0.5, // every 2 seconds
		max: 50, // every 1/50th of a second
		val: 40,
		cb: (val, layer) => {
			layer.shot.set('source.interval', 1 / val);
		}
	},
	{
		key: 'length',
		name: 'Grain Length',
		min: 0.01,
		max: 2,
		cb: (val, layer) => {
			layer.shot.set('source.duration', val);
		}
	},
	{
		key: 'spread',
		name: 'Offset Spread',
		min: 0,
		max: 1
	},
	{
		key: 'crossFade',
		name: 'X-Fade',
		min: 0,
		max: 1
	},
	// {
	// 	key: 'attack',
	// 	name: 'Attack',
	// 	min: 0,
	// 	max: 2,
	// 	precision: 3
	// },
	// {
	// 	key: 'release',
	// 	name: 'Release',
	// 	min: 0,
	// 	max: 3
	// },
	{
		key: 'pitch',
		name: 'Pitch',
		min: -12,
		max: 12,
		val: 0,
		cb: (val, layer) => {
			const t = Math.pow(2, val / 12);
			layer.grainOptions.transpose = t;
		}
	},
	{
		key: 'panSpread',
		name: 'Pan Spread',
		min: 0,
		max: 1
	}
];

const layers = [
	// low
	{
		rate: 0.25,
		opts: {
			length: 1.8,
			crossFade: 0.9,
			attack: 0.1 * 0.4,
			release: 0.9 * 1.5,
			pitch: -12,
			spread: 0
		}
	},
	{
		rate: 1,
		opts: {
			length: 1.4,
			crossFade: 0.7,
			attack: 0.1 * 0.4,
			release: 0.9 * 1.5,
			pitch: -12
		}
	},
	{
		rate: 2,
		opts: {
			length: 0.47,
			crossFade: 0.33,
			attack: 0.05 * 0.4,
			release: 0.3 * 1.5,
			pitch: -12
		}
	},
	{
		rate: 4,
		opts: {
			length: 0.08,
			crossFade: 0.25,
			attack: 0.01 * 0.4,
			release: 0.05 * 1.5,
			pitch: -5
		}
	},

	// mid-range
	{
		rate: 1,
		opts: {
			length: 2.5,
			crossFade: 0.1,
			attack: 0.1 * 0.4,
			release: 1.6 * 1.5,
			pitch: 0
		}
	},
	{
		rate: 2,
		opts: {
			length: 0.47,
			crossFade: 0.1,
			attack: 0.05 * 0.4,
			release: 0.3 * 1.5,
			pitch: 0
		}
	},
	{
		rate: 4,
		opts: {
			length: 0.15,
			crossFade: 0.1,
			attack: 0.01 * 0.4,
			release: 0.1 * 1.5,
			pitch: 7
		}
	},

	// high
	{
		rate: 4,
		opts: {
			length: 0.15,
			crossFade: 0.1,
			attack: 0.01 * 0.4,
			release: 0.1 * 1.5,
			pitch: 12
		}
	}
];
// layers.length = 1;

const shots = [];
const sequencers = [];
const knobs = [];

const parent = document.createElement('div');
document.body.appendChild(parent);

function buildControls(layer) {
	const container = document.createElement('div');
	container.classList.add('layer-controls');
	parent.appendChild(container);

	const playing = document.createElement('input');
	playing.type = 'checkbox';
	// playing.checked = !i;
	container.appendChild(playing);
	// todo: add click listener

	const grainOptions = layer.grainOptions;

	layer.opts.attack = Math.max(layer.opts.attack, 0.015);
	layer.opts.length = layer.opts.attack + layer.opts.release;

	controlDefs.forEach(def => {
		const value = layer.opts[def.key] !== undefined ?
			layer.opts[def.key] :
			def.val !== undefined ? def.val : grainOptions[def.key];
		const knob = new Knob({
			target: container,
			name: def.name,
			w: 75,
			min: def.min || 0,
			max: def.max || 1,
			step: def.step || 0.0001,
			precision: def.precision,
			value,
			fontColor: '#444444',
			titleColor: '#000000'
		});
		const cb = def.cb ?
			val => def.cb(val, layer) :
			val => grainOptions[def.key] = val;

		cb(value);
		knob.onChange(cb);
		knobs.push(knob);
	});

	const start = () => {
		layer.shot.start(audioContext.currentTime, layer.bufferSourceOptions);//, audioContext.currentTime + 10);
	};

	const stop = () => {
		layer.shot.stop();
	};

	playing.addEventListener('click', () => {
		if (playing.checked) {
			start();
		} else {
			stop();
		}
	});
}

const audioFile = require('./audio/forest.mp3');
// const audioFile = require('./audio/spanish-caravan.mp3');
function loadedBuffer(buffer) {
	// startButton.disabled = false;
	// stopButton.disabled = false;

	// clean up
	knobs.forEach(knob => knob.clear());
	knobs.length = 0;
	sequencers.forEach(seq => seq.destroy());
	sequencers.length = 0;
	shots.forEach(shot => shot.destroy());
	shots.length = 0;
	parent.innerHTML = '';

	layers.forEach(layer => {
		const beatInterval = secondsPerBeat / layer.rate;
		const beatDuration = beatInterval * 0.5;
		// const beatSustainDuration = beatDuration - grainOptions.release - grainOptions.

		const grainOptions = Object.assign({}, defaultLayerOptions);
		layer.grainOptions = grainOptions;

		const seq = [];
		for (let i = 0; i < 4; i++) {
			seq.push(random() * buffer.duration);
		}

		/*
		todo: separate out options
		- sequence repeater options
			- beat interval
			- beat duration
		- grain repeater options
			- interval
			- duration (grain length)
		- buffer source options
			- offset (and spread) [computed from sequence & spread]
			- playbackRate (transpose) [computed from pitch]
		- grain patch options
			- panner: panSpread
			- trapezoid: amplitude, crossFade
		*/

		function grainRepeatOptions() {
			return {
				interval: grainOptions.interval,
				duration: grainOptions.length
			};
		}

		function bufferSourceOptions({startTime}, shot) {
			const index = Math.round((startTime - shot.startTime) / beatInterval) % seq.length;
			const gro = grainRepeatOptions();
			return {
				...gro,
				offset: seq[index],
				playbackRate: grainOptions.transpose
			};
		}

		function grainPatchOptions() {
			// just use these unchanged
			return grainOptions;
		}

		const grainRepeater = repeater(bufferSource(buffer), grain, grainPatchOptions);
		const sequencer = repeater(grainRepeater); // todo: add envelope, options
		// sequencers.push(sequencer);

		const shot = soundQ.shot(sequencer)
			.set({
				interval: beatInterval,
				duration: beatDuration,
				'source.interval': grainOptions.interval,
				'source.duration': grainOptions.length,
				random: 0.0005 // just enough to humanize?
			});
		shots.push(shot);

		// const sequence = repeater(granularShot, {
		// 	interval: beatInterval
		// }, {
		// 	duration: beatDuration
		// });

		// shots.push(shot);
		// granularShots.push(granularShot);



		// const { seq } = layer;
		// seq.length = 0;
		// for (let i = 0; i < 4; i++) {
		// 	seq.push(random() * buffer.duration);
		// }

		Object.assign(layer, {
			shot,
			bufferSourceOptions
		});

		buildControls(layer);
	});
}

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
