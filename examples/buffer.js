import SoundQ from '../src/index';
import bufferSource from '../src/sources/buffer';

document.body.insertAdjacentHTML('beforeend', require('./buffer.html'));

const soundQ = new SoundQ({
	// maxLiveSounds: 20
});

function getAudioBuffer(url) {
	return fetch(url)
		.then(response => response.arrayBuffer())
		.then(buffer => soundQ.context.decodeAudioData(buffer));
}

const audioFile = require('./audio/forest.mp3');
getAudioBuffer(audioFile).then(buffer => {

	const source = soundQ.source(bufferSource, buffer);
	const shot = soundQ.shot(source);

	const button = document.getElementById('play');
	button.disabled = false;

	let id;
	button.addEventListener('mousedown', () => {
		console.log('starting');
		id = shot.start(0);
	});
	button.addEventListener('mouseup', () => shot.stop(0, id));

	// button.addEventListener('click', () => {
	// 	console.log('playing');
	// 	shot.play(soundQ.context.currentTime, soundQ.context.currentTime + 2, soundQ.context.currentTime + 2);
	// });
});