import { AudioContext } from 'standardized-audio-context';
import SoundQ from '../src/index';
import bufferSource from '../src/sources/buffer';
import repeater from '../src/sources/repeater';
import panner from '../src/patches/panner';
import html from './repeater.html';
document.body.insertAdjacentHTML('beforeend', html);

const soundQ = new SoundQ({
	cacheExpiration: 2,
	context: new AudioContext()
});

function getAudioBuffer(url) {
	return fetch(url)
		.then(response => response.arrayBuffer())
		.then(buffer => soundQ.context.decodeAudioData(buffer));
}

let interval = 0.5;

const audioFile = require('./audio/footstep-snow.mp3');
getAudioBuffer(audioFile).then(buffer => {

	const shot = soundQ.shot(repeater(bufferSource(buffer), panner, ({startTime}, shot) => {
		// example of a patch within a repeater
		// alternate left and right steps
		return {
			pan: 0.5 * (Math.round((startTime - shot.startTime) % (interval * 2)) * 2 - 1)
		};
	}));
	shot.set({
		interval,
		duration: 1
	});

	document.getElementById('interval').addEventListener('input', evt => {
		interval = parseFloat(evt.target.value);
		shot.set('interval', interval);
	});

	const holdButton = document.getElementById('play');
	const startButton = document.getElementById('start');
	const stopButton = document.getElementById('stop');

	holdButton.disabled = false;
	startButton.disabled = false;
	stopButton.disabled = false;

	function stop() {
		shot.release();
	}

	function start() {
		shot.stop();
		shot.start();
	}

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