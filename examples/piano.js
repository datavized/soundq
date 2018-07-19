import SoundQ from '../src/index';
import samplerSource from '../src/sources/sampler';
import gainEnvelope from '../src/patches/gainEnvelope';
import { getNoteMidi } from './util/scales';

document.body.insertAdjacentHTML('beforeend', require('./buffer.html'));

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

Promise.all(promises).then(() => {

	const shot = soundQ.shot(samplerSource(samples), gainEnvelope);

	const button = document.getElementById('play');
	button.disabled = false;

	let id;
	button.addEventListener('mousedown', () => {
		const midiNote = 21 + Math.round(Math.random() * 87);
		id = shot.start(0, midiNote, envelopeOptions);
	});
	button.addEventListener('mouseup', () => {
		shot.release(soundQ.currentTime, id)
			.stop(soundQ.currentTime + 1, id);
	});

	// button.addEventListener('click', () => {
	// 	console.log('playing');
	// 	const id = shot.start(soundQ.context.currentTime);
	// 	shot.stop(soundQ.context.currentTime + 2, id);
	// });
});