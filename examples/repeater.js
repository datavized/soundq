import SoundQ from '../src/index';
import bufferSource from '../src/sources/buffer';
import repeater from '../src/sources/repeater';

document.body.insertAdjacentHTML('beforeend', require('./repeater.html'));

const soundQ = new SoundQ({
	cacheExpiration: 2
});

function getAudioBuffer(url) {
	return fetch(url)
		.then(response => response.arrayBuffer())
		.then(buffer => soundQ.context.decodeAudioData(buffer));
}

const audioFile = require('./audio/footstep-snow.mp3');
getAudioBuffer(audioFile).then(buffer => {

	const source = soundQ.source(repeater, {
		source: bufferSource,
		options: buffer
	});
	const shot = soundQ.shot(source);
	shot.set({
		interval: 0.5,
		duration: 1
	});

	document.getElementById('interval').addEventListener('input', evt => {
		shot.set('interval', parseFloat(evt.target.value));
	});

	const button = document.getElementById('play');
	const start = document.getElementById('start');
	const stop = document.getElementById('stop');

	button.disabled = false;
	start.disabled = false;
	stop.disabled = false;

	button.addEventListener('mousedown', () => {
		shot.stop();
		shot.start();
	});
	button.addEventListener('mouseup', () => shot.stop());

	start.addEventListener('click', () => {
		shot.stop();
		shot.start();
	});
	stop.addEventListener('click', () => {
		shot.stop();
	});
});