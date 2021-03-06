import { AudioContext } from 'standardized-audio-context';
import SoundQ from '../src/index';
import dtmf from '../src/sources/dtmf';
import gainEnvelope from '../src/patches/gainEnvelope';
import html from './dtmf.html';
document.body.insertAdjacentHTML('beforeend', html);

const soundQ = new SoundQ({
	context: new AudioContext()
});

const shot = soundQ.shot(dtmf, gainEnvelope);

const keyGrid = [
	[1, 2, 3, 'A'],
	[4, 5, 6, 'B'],
	[7, 8, 9, 'C'],
	['*', 0, '#', 'D']
];

const div = document.getElementById('grid');
keyGrid.forEach(row => {
	row.forEach(key => {
		const button = document.createElement('button');
		div.appendChild(button);
		let shotId = -1;
		button.textContent = key;

		const up = () => {
			shot.release(soundQ.currentTime, shotId);
			shot.stop(soundQ.currentTime + 0.02, shotId);
		};
		const down = () => {
			up(); // just in case
			shotId = shot.start({key}, {
				attack: 0,
				release: 0.02,
				decay: 0,
				sustain: 0.15
			});
		};
		button.addEventListener('mousedown', down);
		button.addEventListener('mouseup', up);

		button.addEventListener('touchstart', evt => {
			if (evt.touches.length === 1) {
				down();
			}
		});
		button.addEventListener('touchend', evt => {
			if (evt.touches.length === 0) {
				up();
			}
		});
	});
});
