import { AudioContext } from 'standardized-audio-context';
import SoundQ from '../src/index';
import samplerSource from '../src/sources/sampler';
import gainEnvelope from '../src/patches/gainEnvelope';
import { getNoteMidi, keys } from '../src/util/scales';
import html from './piano.html';
document.body.insertAdjacentHTML('beforeend', html);

const soundQ = new SoundQ({
	// maxLiveSounds: 20,
	context: new AudioContext()
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

/*
todo: per-instrument configuration
- octave range
- release time
*/
const instruments = [
	{
		name: 'Piano',
		minOctave: 0,
		maxOctave: 7, // plus C8
		samples: {
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
		}
	},
	{
		name: 'Church Organ',
		minOctave: 2,
		maxOctave: 6,
		samples: {
			// todo: batch convert to mp3
			As2: require('./audio/Church_Organ/organ-tutti-As2.mp3'),
			As3: require('./audio/Church_Organ/organ-tutti-As3.mp3'),
			As4: require('./audio/Church_Organ/organ-tutti-As4.mp3'),
			As5: require('./audio/Church_Organ/organ-tutti-As5.mp3'),
			A2: require('./audio/Church_Organ/organ-tutti-A2.mp3'),
			A3: require('./audio/Church_Organ/organ-tutti-A3.mp3'),
			A4: require('./audio/Church_Organ/organ-tutti-A4.mp3'),
			A5: require('./audio/Church_Organ/organ-tutti-A5.mp3'),
			B2: require('./audio/Church_Organ/organ-tutti-B2.mp3'),
			B3: require('./audio/Church_Organ/organ-tutti-B3.mp3'),
			B4: require('./audio/Church_Organ/organ-tutti-B4.mp3'),
			B5: require('./audio/Church_Organ/organ-tutti-B5.mp3'),
			Cs2: require('./audio/Church_Organ/organ-tutti-Cs2.mp3'),
			Cs3: require('./audio/Church_Organ/organ-tutti-Cs3.mp3'),
			Cs4: require('./audio/Church_Organ/organ-tutti-Cs4.mp3'),
			Cs5: require('./audio/Church_Organ/organ-tutti-Cs5.mp3'),
			Cs6: require('./audio/Church_Organ/organ-tutti-Cs6.mp3'),
			C2: require('./audio/Church_Organ/organ-tutti-C2.mp3'),
			C3: require('./audio/Church_Organ/organ-tutti-C3.mp3'),
			C4: require('./audio/Church_Organ/organ-tutti-C4.mp3'),
			C5: require('./audio/Church_Organ/organ-tutti-C5.mp3'),
			C6: require('./audio/Church_Organ/organ-tutti-C6.mp3'),
			Ds2: require('./audio/Church_Organ/organ-tutti-Ds2.mp3'),
			Ds3: require('./audio/Church_Organ/organ-tutti-Ds3.mp3'),
			Ds4: require('./audio/Church_Organ/organ-tutti-Ds4.mp3'),
			Ds5: require('./audio/Church_Organ/organ-tutti-Ds5.mp3'),
			Ds6: require('./audio/Church_Organ/organ-tutti-Ds6.mp3'),
			D2: require('./audio/Church_Organ/organ-tutti-D2.mp3'),
			D3: require('./audio/Church_Organ/organ-tutti-D3.mp3'),
			D4: require('./audio/Church_Organ/organ-tutti-D4.mp3'),
			D5: require('./audio/Church_Organ/organ-tutti-D5.mp3'),
			D6: require('./audio/Church_Organ/organ-tutti-D6.mp3'),
			E2: require('./audio/Church_Organ/organ-tutti-E2.mp3'),
			E3: require('./audio/Church_Organ/organ-tutti-E3.mp3'),
			E4: require('./audio/Church_Organ/organ-tutti-E4.mp3'),
			E5: require('./audio/Church_Organ/organ-tutti-E5.mp3'),
			E6: require('./audio/Church_Organ/organ-tutti-E6.mp3'),
			Fs2: require('./audio/Church_Organ/organ-tutti-Fs2.mp3'),
			Fs3: require('./audio/Church_Organ/organ-tutti-Fs3.mp3'),
			Fs4: require('./audio/Church_Organ/organ-tutti-Fs4.mp3'),
			Fs5: require('./audio/Church_Organ/organ-tutti-Fs5.mp3'),
			Fs6: require('./audio/Church_Organ/organ-tutti-Fs6.mp3'),
			F2: require('./audio/Church_Organ/organ-tutti-F2.mp3'),
			F3: require('./audio/Church_Organ/organ-tutti-F3.mp3'),
			F4: require('./audio/Church_Organ/organ-tutti-F4.mp3'),
			F5: require('./audio/Church_Organ/organ-tutti-F5.mp3'),
			F6: require('./audio/Church_Organ/organ-tutti-F6.mp3'),
			Gs2: require('./audio/Church_Organ/organ-tutti-Gs2.mp3'),
			Gs3: require('./audio/Church_Organ/organ-tutti-Gs3.mp3'),
			Gs4: require('./audio/Church_Organ/organ-tutti-Gs4.mp3'),
			Gs5: require('./audio/Church_Organ/organ-tutti-Gs5.mp3'),
			G2: require('./audio/Church_Organ/organ-tutti-G2.mp3'),
			G3: require('./audio/Church_Organ/organ-tutti-G3.mp3'),
			G4: require('./audio/Church_Organ/organ-tutti-G4.mp3'),
			G5: require('./audio/Church_Organ/organ-tutti-G5.mp3'),
			G6: require('./audio/Church_Organ/organ-tutti-G6.mp3')
		}
	},
	{
		name: 'Mandolin',
		minOctave: 3,
		maxOctave: 6,
		samples: {
			G4: require('./audio/mandolin/mandolin-G4.mp3'),
			G3: require('./audio/mandolin/mandolin-G3.mp3'),
			Fs6: require('./audio/mandolin/mandolin-Fs6.mp3'),
			Fs5: require('./audio/mandolin/mandolin-Fs5.mp3'),
			E4: require('./audio/mandolin/mandolin-E4.mp3'),
			Ds6: require('./audio/mandolin/mandolin-Ds6.mp3'),
			Ds5: require('./audio/mandolin/mandolin-Ds5.mp3'),
			C6: require('./audio/mandolin/mandolin-C6.mp3'),
			C5: require('./audio/mandolin/mandolin-C5.mp3'),
			Cs4: require('./audio/mandolin/mandolin-Cs4.mp3'),
			A6: require('./audio/mandolin/mandolin-A6.mp3'),
			A5: require('./audio/mandolin/mandolin-A5.mp3'),
			As4: require('./audio/mandolin/mandolin-As4.mp3'),
			As3: require('./audio/mandolin/mandolin-As3.mp3')
		}
	}
];

let shot = null;

const OCTAVES = 2;
const START_OCTAVE = 3;
function makeKeyboard() {
	const keyboard = document.getElementById('keyboard');
	const keyShots = [];

	Array.from(Array(OCTAVES), (n, i) => {
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
				if (!shot) {
					return;
				}

				const oldShot = keyShots[index];
				if (oldShot >= 0) {
					shot.stop(soundQ.currentTime, oldShot);
				}

				const id = shot.start(soundQ.currentTime, { note }, envelopeOptions);
				keyShots[index] = id;
			};

			const stop = () => {
				if (!shot) {
					return;
				}

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
	});
}

function selectInstrument(index) {
	if (shot) {
		shot.destroy();
		shot = null;
	}

	const instrument = instruments[index];
	const sampleUrls = instrument.samples;
	const samples = {};
	const promises = Object.keys(sampleUrls).map(async key => {
		const buffer = await getAudioBuffer(sampleUrls[key]);
		// const match = /([a-z]+)([0-9]+)/i.exec(key);
		// const match = /^([a-g]{1}(?:b|#|x|bb)?)(-?[0-9]+)/i.exec(key);
		const match = /([a-z]+)([0-9]+)/i.exec(key);
		if (match) {
			const noteName = match[1].replace('s', '#');
			const octave = parseInt(match[2], 10);
			const note = getNoteMidi(noteName, octave);
			samples[note] = buffer;
		} else {
			console.log('no match', key);
		}
	});

	Promise.all(promises).then(() => {
		shot = soundQ.shot(samplerSource(samples), gainEnvelope);
	});
}

makeKeyboard();
selectInstrument(0);

const instrument = document.getElementById('instrument');
instruments.forEach((inst, i) => {
	const opt = document.createElement('option');
	opt.value = i;
	opt.textContent = inst.name;
	instrument.appendChild(opt);
});
instrument.addEventListener('change', () => {
	selectInstrument(parseInt(instrument.value, 10));
});