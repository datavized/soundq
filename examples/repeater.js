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

	const shot = soundQ.shot(repeater(bufferSource(buffer)));
	shot.set({
		interval: 0.5,
		duration: 1
	});

	document.getElementById('interval').addEventListener('input', evt => {
		shot.set('interval', parseFloat(evt.target.value));
	});

	const holdButton = document.getElementById('play');
	const startButton = document.getElementById('start');
	const stopButton = document.getElementById('stop');

	holdButton.disabled = false;
	startButton.disabled = false;
	stopButton.disabled = false;

	function stop() {
		shot.stop();
	}

	function start() {
		stop();
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