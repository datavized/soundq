import SoundQ from '../src/index';
import dtmf from '../src/sources/dtmf';
// import gainEnvelope from '../src/patches/gainEnvelope';

document.body.insertAdjacentHTML('beforeend', require('./dtmf.html'));

const soundQ = new SoundQ();

const source = soundQ.source(dtmf);
const shot = soundQ.shot(source);

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
			shot.stop(0, shotId);
		};
		const down = () => {
			up(); // just in case
			shotId = shot.start(0, {key});
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
