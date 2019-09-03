import { AudioContext } from 'standardized-audio-context';
import SoundQ from '../src/index';
import oscillator from '../src/sources/oscillator';
import gainEnvelope from '../src/patches/gainEnvelope';
import html from './oscillator.html';
document.body.insertAdjacentHTML('beforeend', html);

const soundQ = new SoundQ({
	cacheExpiration: 2,
	context: new AudioContext()
});

// const oscillatorNode = soundQ.context.createOscillator();
// oscillatorNode.frequency.value = 440;
// const shot = soundQ.shot(audioNodeSource, oscillatorNode);
const shot = soundQ.shot(oscillator, gainEnvelope);

const button = document.getElementById('play');
button.disabled = false;

// let id = 0;
// button.addEventListener('mousedown', () => {
// 	console.log('starting');
// 	id = shot.start({ frequency: 440 + Math.random() * 200 });
// });
// button.addEventListener('mouseup', () => shot.stop(soundQ.currentTime, id));

button.addEventListener('click', () => {
	// for (let i = 0; i < 5; i++) {
	// 	const start = 0 + i * 2;
	// 	const stop = start + 0.5;
	// 	const id = shot.start(soundQ.currentTime + start);
	// 	shot.stop(soundQ.currentTime + stop, id);
	// }
	const id = shot.start(soundQ.currentTime, { frequency: 440 + Math.random() * 200 });
	shot.release(soundQ.currentTime + 0.6, id);
	shot.stop(soundQ.currentTime + 1, id);
});
