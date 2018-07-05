/*
audio source:
https://freesound.org/people/InspectorJ/sounds/397946/

also try: https://freesound.org/people/skiersailor/sounds/75263/
*/

import SoundQ from '../src/index';
import bufferSource from '../src/sources/buffer';
import gainEnvelope from '../src/patches/gainEnvelope';

document.body.insertAdjacentHTML('beforeend', require('./envelope.html'));

const audioContext = new AudioContext();

function getAudioBuffer(url) {
	return fetch(url)
		.then(response => response.arrayBuffer())
		.then(buffer => audioContext.decodeAudioData(buffer));
}

const soundQ = new SoundQ();

const audioFile = require('./audio/tiny.mp3');
getAudioBuffer(audioFile).then(buffer => {
	const shot = soundQ.shot(bufferSource(buffer), gainEnvelope);

	const ranges = {};
	const envelopeOptions = {};
	const values = {};
	function updateOptions() {
		const { attack, decay, release, sustain } = values;
		const total = attack + decay + release;
		const scale = Math.min(1, buffer.duration / total);
		envelopeOptions.attack = attack * scale;
		envelopeOptions.decay = decay * scale;
		envelopeOptions.release = release * scale;
		envelopeOptions.sustain = sustain;
	}
	['attack', 'decay', 'sustain', 'release'].forEach(id => {
		const input = document.getElementById(id);
		ranges[id] = input;
		values[id] = parseFloat(input.value);
		input.addEventListener('input', () => {
			values[id] = parseFloat(input.value);
			updateOptions();
		});
	});
	updateOptions();

	const holdButton = document.getElementById('hold');
	const playButton = document.getElementById('play');
	const startButton = document.getElementById('start');
	const stopButton = document.getElementById('stop');

	playButton.disabled = false;
	holdButton.disabled = false;
	startButton.disabled = false;
	stopButton.disabled = false;

	let id = 0;

	function stop() {
		shot.release(soundQ.context.currentTime, id);
		shot.stop(soundQ.context.currentTime + envelopeOptions.release, id);
	}

	function start() {
		stop();
		id = shot.start({ loop: true }, envelopeOptions);
	}

	function play() {
		const playbackRate = 1 + Math.random() * 0.5 - 0.25;
		const start = soundQ.context.currentTime;
		const stop = start + buffer.duration / playbackRate;
		const release = stop - envelopeOptions.release;
		const i = shot.start(start, {
			playbackRate
		}, envelopeOptions);
		shot.release(release, i).stop(stop, i);
	}

	playButton.addEventListener('click', play);

	holdButton.addEventListener('mousedown', start);
	holdButton.addEventListener('mouseup', stop);

	holdButton.addEventListener('touchstart', evt => {
		if (evt.touches.length === 1) {
			start();
		}
	});
	holdButton.addEventListener('touchend', evt => {
		if (evt.touches.length === 0) {
			stop();
		}
	});

	startButton.addEventListener('click', start);
	stopButton.addEventListener('click', stop);
});
