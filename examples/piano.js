import SoundQ from '../src/index';
import samplerSource from '../src/sources/sampler';
import gainEnvelope from '../src/patches/gainEnvelope';
import { getNoteMidi, keys } from '../src/util/scales';

document.body.insertAdjacentHTML('beforeend', require('./piano.html'));

const soundQ = new SoundQ({
	// maxLiveSounds: 20
});

function getAudioBuffer(url) {
	return fetch(url)
		.then(response => response.arrayBuffer())
		.then(buffer => soundQ.context.decodeAudioData(buffer));
}

const RELEASE_TIME = 0.2;

const envelopeOptions = {
	release: RELEASE_TIME,
	attack: 0,
	decay: 0,
	sustain: 1
};

const sampleUrls = {
	A0: require('./audio/salamander/A0.mp3'),
	A1: require('./audio/salamander/A1.mp3'),
	A2: require('./audio/salamander/A2.mp3'),
	A3: require('./audio/salamander/A3.mp3'),
	A4: require('./audio/salamander/A4.mp3'),
	A5: require('./audio/salamander/A5.mp3'),
	A6: require('./audio/salamander/A6.mp3'),
	A7: require('./audio/salamander/A7.mp3'),
	C1: require('./audio/salamander/C1.mp3'),
	C2: require('./audio/salamander/C2.mp3'),
	C3: require('./audio/salamander/C3.mp3'),
	C4: require('./audio/salamander/C4.mp3'),
	C5: require('./audio/salamander/C5.mp3'),
	C6: require('./audio/salamander/C6.mp3'),
	C7: require('./audio/salamander/C7.mp3'),
	C8: require('./audio/salamander/C8.mp3'),
	Ds1: require('./audio/salamander/Ds1.mp3'),
	Ds2: require('./audio/salamander/Ds2.mp3'),
	Ds3: require('./audio/salamander/Ds3.mp3'),
	Ds4: require('./audio/salamander/Ds4.mp3'),
	Ds5: require('./audio/salamander/Ds5.mp3'),
	Ds6: require('./audio/salamander/Ds6.mp3'),
	Ds7: require('./audio/salamander/Ds7.mp3'),
	Fs1: require('./audio/salamander/Fs1.mp3'),
	Fs2: require('./audio/salamander/Fs2.mp3'),
	Fs3: require('./audio/salamander/Fs3.mp3'),
	Fs4: require('./audio/salamander/Fs4.mp3'),
	Fs5: require('./audio/salamander/Fs5.mp3'),
	Fs6: require('./audio/salamander/Fs6.mp3'),
	Fs7: require('./audio/salamander/Fs7.mp3')
};
const samples = {};
const promises = Object.keys(sampleUrls).map(async key => {
	const buffer = await getAudioBuffer(sampleUrls[key]);
	// const match = /([a-z]+)([0-9]+)/i.exec(key);
	const match = /^([a-g]{1}(?:b|#|x|bb)?)(-?[0-9]+)/i.exec(key);
	if (match) {
		const noteName = match[1];
		const octave = parseInt(match[2], 10);
		const note = getNoteMidi(noteName, octave);
		samples[note] = buffer;
	}
});

const OCTAVES = 2;
const START_OCTAVE = 3;
Promise.all(promises).then(() => {

	const shot = soundQ.shot(samplerSource(samples), gainEnvelope);
	const keyboard = document.getElementById('keyboard');
	const keyShots = [];

	for (let i = 0; i < OCTAVES; i++) {
		const octave = i + START_OCTAVE;
		keys.forEach((noteName, scaleIndex) => {
			const key = document.createElement('span');
			key.textContent = noteName + octave;
			if (noteName.length > 1) {
				key.classList.add('ebony');
			}
			keyboard.appendChild(key);

			const index = octave * keys.length + scaleIndex;
			const note = getNoteMidi(noteName, octave);
			const start = () => {
				const oldShot = keyShots[index];
				if (oldShot >= 0) {
					shot.stop(0, oldShot);
				}

				const id = shot.start(0, note, envelopeOptions);
				keyShots[index] = id;
			};

			const stop = () => {
				const id = keyShots[index];
				if (id >= 0) {
					shot.release(soundQ.currentTime, id)
						.stop(soundQ.currentTime + 1, id);
				}
			};

			key.addEventListener('mousedown', start);
			key.addEventListener('mouseup', stop);
			key.addEventListener('touchstart', evt => {
				if (evt.touches.length === 1) {
					start();
				}
			});
			key.addEventListener('touchend', evt => {
				if (evt.touches.length === 0) {
					stop();
				}
			});
		});
	}
});