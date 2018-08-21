import { AudioContext } from 'standardized-audio-context';
import SoundQ from '../src/index';
import bufferSource from '../src/sources/buffer';

document.body.insertAdjacentHTML('beforeend', require('./buffer.html'));

const soundQ = new SoundQ({
	// maxLiveSounds: 20
	context: new AudioContext()
});

function getAudioBuffer(url) {
	return fetch(url)
		.then(response => response.arrayBuffer())
		.then(buffer => new Promise(resolve => soundQ.context.decodeAudioData(buffer, resolve)));
}

const audioFile = require('./audio/forest.mp3');
getAudioBuffer(audioFile).then(buffer => {

	const shot = soundQ.shot(bufferSource(buffer));

	const button = document.getElementById('play');
	button.disabled = false;

	let id;
	button.addEventListener('mousedown', () => {
		id = shot.start();
	});
	button.addEventListener('mouseup', () => shot.stop(soundQ.currentTime, id));

	// button.addEventListener('click', () => {
	// 	console.log('playing');
	// 	const id = shot.start(soundQ.currentTime);
	// 	shot.stop(soundQ.context.currentTime + 2, id);
	// });
});