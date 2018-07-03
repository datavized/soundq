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
		options: buffer,
		interval: 0.2,
		duration: 1
	});
	const shot = soundQ.shot(source);

	const button = document.getElementById('play');
	button.disabled = false;

	let id;
	button.addEventListener('mousedown', () => {
		id = shot.start();
	});
	button.addEventListener('mouseup', () => shot.stop(0, id));

	// button.addEventListener('click', () => {
	// 	console.log('playing');
	// 	shot.play(soundQ.context.currentTime, soundQ.context.currentTime + 2, soundQ.context.currentTime + 2);
	// });
});