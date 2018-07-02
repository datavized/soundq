import SoundQ from '../src/index';
import oscillator from '../src/sources/oscillator';
// import audioNodeSource from '../src/sources/node';

document.body.insertAdjacentHTML('beforeend', require('./oscillator.html'));

const soundQ = new SoundQ({
	// maxLiveSounds: 20
});

// const oscillatorNode = soundQ.context.createOscillator();
// oscillatorNode.frequency.value = 440;
// const shot = soundQ.shot(audioNodeSource, oscillatorNode);
const source = soundQ.source(oscillator);
const shot = soundQ.shot(source);

const button = document.getElementById('play');
button.disabled = false;

// let id = 0;
// button.addEventListener('mousedown', () => {
// 	console.log('starting');
// 	id = shot.start(0, { frequency: 440 + Math.random() * 200 });
// });
// button.addEventListener('mouseup', () => shot.stop(0, id));

button.addEventListener('click', () => {
	console.log('playing');
	// for (let i = 0; i < 5; i++) {
	// 	const start = 500 + i * 2;
	// 	const end = start + 0.5;
	// 	shot.start(soundQ.context.currentTime + start).stop(soundQ.context.currentTime + end);
	// }
	const id = shot.start(soundQ.context.currentTime, { frequency: 440 + Math.random() * 200 });
	shot.stop(soundQ.context.currentTime + 1, id);
});
