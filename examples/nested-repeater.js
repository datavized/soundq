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

	const innerRepeater = repeater(bufferSource(buffer));
	const outerRepeater = repeater(innerRepeater);
	const shot = soundQ.shot(outerRepeater);
	shot.set({
		interval: 10,
		duration: 3.05
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
		shot.start({
			foo: 'meh'
		});
		// soundQ.context.suspend(0).then(() => {
		// 	debugger;
		// 	shot.start();
		// 	soundQ.context.resume();
		// });
	}

	holdButton.addEventListener('mousedown', start);
	holdButton.addEventListener('mouseup', () => {
		shot.release();
	});

	holdButton.addEventListener('touchstart', evt => {
		if (evt.touches.length === 1) {
			start();
		}
	});
	holdButton.addEventListener('touchend', evt => {
		if (evt.touches.length === 0) {
			shot.release();
		}
	});

	startButton.addEventListener('click', start);
	stopButton.addEventListener('click', stop);
});