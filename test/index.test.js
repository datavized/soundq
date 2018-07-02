require('web-audio-test-api');

// const SoundQ = require('../src');
import SoundQ from '../src';
// console.log('SoundQ', SoundQ);

describe('SoundQ', () => {
	describe('constructor(soundQ: SoundQ)', () => {
		it('works', () => {
			const soundQ = new SoundQ();

			expect(soundQ).toBeInstanceOf(SoundQ);
			// assert(soundQ[BUFSRC] instanceof global.AudioBufferSourceNode);
			// assert(soundQ[BUFSRC].buffer instanceof global.AudioBuffer);
			// assert(soundQ[BUFSRC].loop === true);
			// assert(soundQ[BUFSRC] === soundQ[OUTLET]);

			// let soundQ2 = new SoundQ(audioContext);

			// assert(soundQ[BUFSRC] !== soundQ2[BUFSRC]);
			// assert(soundQ[BUFSRC].buffer === soundQ2[BUFSRC].buffer);
			// assert([].slice.call(soundQ[BUFSRC].buffer.getChannelData(0)).some(x => x !== 0));
		});
	});
});
