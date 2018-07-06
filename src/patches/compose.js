/*
todo:
- find a way to adjust duration going forward
  e.g. cut it short for grains
- set default options
*/

export default function compose(definitions) {
	return context => {
		const patches = definitions.map(def => def(context));
		const first = patches[0];
		let input = first.input || first.node;
		let output = null;

		for (let i = 1, previous = input; i < patches.length; i++) {
			const patch = patches[i];
			const next = patch.input || patch.node;
			if (!input) {
				input = previous;
			}
			if (previous && next) {
				previous.connect(next);
			}
			output = previous = patch.output || patch.node || previous;
		}

		return {
			input,
			output,
			start(startTime, releaseTime, stopTime, options) {
				patches.forEach((patch, i) => {
					if (patch.start) {
						patch.start(
							startTime,
							releaseTime,
							stopTime,
							Array.isArray(options) ? options[i] : options
						);
					}
				});
			},
			destroy() {
				patches.forEach(patch => {
					if (patch.destroy) {
						patch.destroy();
					}
				});
				patches.length = 0;
			}
		};
	};
}
