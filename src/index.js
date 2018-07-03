import eventEmitter from 'event-emitter';
import allOff from 'event-emitter/all-off';
import createAudioContext from 'ios-safe-audio-context';
import num from './util/num';
// import MultiMap from './util/MultiMap';

/*
definitions:
- "active" shots have been started but not yet stopped
- "live" shots have been started and possibly stopped or
  not, but still have some live/pending sound events in the queue
*/

// todo: MIN_LOOK_AHEAD might be longer for offline context
const MIN_LOOK_AHEAD = 0.05; // seconds
// const MIN_LATENCY = 0.05;
const MAX_SCHEDULED_SOUNDS = 40;
// const MIN_INTERVAL = 0.000001;

let mainContext = null;
const mainContextUsers = new Set();

function getMainContext(instance) {
	if (!mainContext) {
		mainContext = createAudioContext();
	}
	mainContextUsers.add(instance);
	return mainContext;
}

function releaseMainContext(instance) {
	mainContextUsers.delete(instance);
	if (!mainContextUsers.size && mainContext) {
		if (mainContext.close && mainContext.state !== 'closed') {
			mainContext.close();
		}
		mainContext = null;
	}
}

// sort by start time
function sortUnscheduled(a, b) {
	const startDiff = a.startTime - b.startTime;
	if (startDiff) {
		return startDiff;
	}

	const stopDiff = a.stopTime - b.stopTime;
	if (stopDiff) {
		return stopDiff;
	}

	const releaseDiff = a.releaseTime - b.releaseTime;
	if (releaseDiff) {
		return releaseDiff;
	}

	return a.id - b.id;
}

function sortPlayed(a, b) {
	const stopDiff = a.stopTime - b.stopTime;
	if (stopDiff) {
		return stopDiff;
	}

	const releaseDiff = a.releaseTime - b.releaseTime;
	if (releaseDiff) {
		return releaseDiff;
	}

	const startDiff = a.startTime - b.startTime;
	if (startDiff) {
		return startDiff;
	}

	return a.id - b.id;
}

let nextSoundEventId = 1;
let nextShotId = 1;

function SoundQ(options = {}) {
	const context = options.context || getMainContext(this);

	// todo: get pool limits from options
	const cacheExpiration = Math.max(0, num(options.cacheExpiration, 10)) * 1000; // seconds -> milliseconds
	// todo: periodically empty out old instances from source pools

	// queues, maps and sets for various pools and events
	const allSources = new Map();
	const allShots = new Set();
	const liveShots = new Map(); // by id
	const patchPools = new Map();
	const soundEvents = new Map();
	const unscheduledQueue = [];
	const playedSounds = [];

	let scheduling = false;
	let earliestStopTime = Infinity;
	let cleanUpTimeout = 0;

	function cleanUp() {
		clearTimeout(cleanUpTimeout);
		cleanUpTimeout = 0;

		const now = Date.now();
		let maxAge = -1;

		function cleanPool(pool) {
			while (pool.length) {
				const obj = pool[0];
				const age = now - obj.lastUsed;
				if (age < cacheExpiration) {
					maxAge = Math.max(maxAge, age);
					return;
				}

				if (obj.destroy) {
					obj.destroy();
				}
				pool.shift();
			}
		}

		patchPools.forEach(cleanPool);
		allSources.forEach(({pool}) => cleanPool(pool));

		if (maxAge >= 0) {
			cleanUpTimeout = setTimeout(cleanUp, Math.max(20, cacheExpiration - maxAge));
		}
	}

	function scheduleCleanUp() {
		if (!cleanUpTimeout) {
			cleanUpTimeout = setTimeout(cleanUp, cacheExpiration);
		}
	}

	function updatePatch(source) {
		const { patch, startTime, releaseTime, stopTime } = source;
		if (patch) {
			if (patch.start) {
				patch.start(startTime);
			}
			if (patch.release) {
				patch.release(releaseTime);
			}
			if (patch.stop) {
				patch.stop(stopTime);
			}
		}
	}

	function startSoundEvent(sound) {
		const { source, shot } = sound;
		if (source.startEvent) {
			sound = Object.assign(sound, source.startEvent(sound));
			sound.scheduled = true;
		}

		// todo: set up patch from pool w/ *options*
		if (shot.patchDef && !shot.patch) {
			shot.patch = getPatch(shot.patchDef);
		}
		updatePatch(shot);

		// todo: use optional output destination
		if (sound.output && sound.output.connect) {
			const dest = shot.patch && shot.patch.input || context.destination;
			sound.output.connect(dest);

			if (shot.patch && shot.patch.output) {
				shot.patch.output.connect(context.destination);
			}
		}

		const needsSorting = playedSounds.length && sound.startTime <= playedSounds[0].startTime;
		playedSounds.push(sound);
		if (needsSorting) {
			playedSounds.sort(sortPlayed);
		}
	}

	/*
	Schedule individual sound events generated by sources
	*/
	function scheduleSounds() {
		if (scheduling) {
			return;
		}

		scheduling = true;

		const urgentTime = context.currentTime + MIN_LOOK_AHEAD;
		liveShots.forEach(shot => {
			const { source } = shot;
			if (source.request && shot.stopTime > context.currentTime) {
				let event = null;
				do {
					event = source.request(urgentTime);
					if (event && typeof event === 'object') {
						source.controller.submit(event);
					}
				} while (event);
			}
		});


		liveShots.forEach(shot => {
			const { source } = shot;
			if (source.request && shot.stopTime > context.currentTime) {
				let event = null;
				do {
					event = source.request(earliestStopTime + MIN_LOOK_AHEAD);
					if (event && typeof event === 'object') {
						source.controller.submit(event);
						earliestStopTime = Math.min(earliestStopTime, event.stopTime);
					}
				} while (event);
			}
		});
		/*
		todo: loop through any started sound events
		- fade out anything that's been playing a long time if we're over the limit
		- cancel anything that's too far out
		- this queue is sorted by stop time
		*/
		// for (let i = 0, n = playedSounds.length; i < n; i++) {
		// 	const sound = playedSounds[i];
		// }

		/*
		todo: loop through submitted sound events
		- cancel anything that's too far out
		- this queue is sorted by start time
		  - so we can end early
		  - efficiently store earliest stopTime
		  - probably faster to use binary insert
		*/
		while (unscheduledQueue.length && playedSounds.length < MAX_SCHEDULED_SOUNDS) {
			const sound = unscheduledQueue.shift();

			/*
			todo:
			note that the time between NOW and startTime should be less than min latency...
			Use the time between the FIRST stopTime of scheduled sound and startTime.
			*/
			if (sound.stopTime > context.currentTime) {
				startSoundEvent(sound);
			} else {
				// we missed one!
				// todo: make this do something! we're probably leaking memory here
				revoke(sound.id);
			}
		}

		scheduling = false;
	}

	/*
	Schedule shots initiated by calls to .start on a shot
	*/
	function scheduleShots() {
		scheduleSounds();
	}

	function calculateEarliestStopTime() {
		earliestStopTime = Infinity;
		for (let i = 0; i < playedSounds.length; i++) {
			const st = playedSounds[i].stopTime;
			if (st > context.currentTime) {
				earliestStopTime = st;
				break;
			}
		}
	}

	function revoke(eventId) {
		const index = playedSounds.findIndex(s => s.id === eventId);
		if (index >= 0) {

			const sound = playedSounds[index];
			const { source, shot } = sound;
			sound.stopped = true;

			playedSounds.splice(index, 1);

			if (source.finishEvent) {
				source.finishEvent(sound);
			}

			if (sound.output) {
				sound.output.disconnect();
			}

			soundEvents.delete(eventId);
			source.events.delete(sound);
			// todo: fire stop event

			if (!source.events.size && (shot.stopTime <= context.currentTime || source.done && source.done())) {
				liveShots.delete(shot.id);
				source.lastUsed = Date.now();
				source.pool.push(source);
				scheduleCleanUp();

				if (source.finish) {
					source.finish();
				}

				if (shot.patch) {
					releasePatch(shot.patch);
					shot.patch = null;
				}
			}

			calculateEarliestStopTime();

			if (sound.startTime < context.currentTime) {
				// only schedule further if this sound has actually played
				scheduleShots();
			}
		}
	}

	function stop(id, stopTime) {
		const sound = soundEvents.get(id);
		if (id && sound.stopTime !== stopTime) {
			sound.stopTime = stopTime;
			if (sound.scheduled) {
				if (sound.source.stopEvent) {
					sound.source.stopEvent(sound);
				}

				// re-sort played sounds, update earliest stopTime if needed
				playedSounds.sort(sortPlayed);

				calculateEarliestStopTime();

			}
			scheduleShots();
		}
	}

	this.context = context;

	function makeShotSource(sourceDef) {
		const {
			definition,
			options,
			pool
		} = sourceDef;

		let source = null;

		const controller = {
			context,

			// todo: move functions up to top level if possible
			submit(details) {
				const id = details.id || nextSoundEventId++;
				const soundEvent = soundEvents.get(id) || {
					id,
					source,
					shot: source.shot,
					output: null,
					stopped: false,
					scheduled: false,

					// todo: we probably don't need release on individual events
					// source can handle it internally
					releaseTime: Infinity,
					stopTime: Infinity
				};
				Object.assign(soundEvent, details);
				soundEvent.releaseTime = Math.min(soundEvent.releaseTime, soundEvent.stopTime);

				if (!soundEvents.has(id)) {
					const needsSorting = unscheduledQueue.length && soundEvent.startTime <= unscheduledQueue[0].startTime;
					unscheduledQueue.push(soundEvent);
					if (needsSorting) {
						// only sort when we need to
						unscheduledQueue.sort(sortUnscheduled);
					}
					soundEvents.set(id, soundEvent);
					source.events.add(soundEvent);

					if (soundEvent.stopTime >= context.currentTime) {
						earliestStopTime = Math.min(earliestStopTime, soundEvent.stopTime);
					}
				} else {
					console.warn('double submit on event', soundEvent);
				}

				// todo: allow updating of already played event
				// scheduleSounds(); ?

				return id;
			},

			// means we're really, really done with this
			revoke,

			// clean up
			stop,

			// in case source wants to build in a patch
			getPatch,
			releasePatch
		};

		source = Object.assign(definition(controller, options), {
			controller,
			events: new Set(),
			pool,
			patchDef: null, // todo: don't store patch stuff here
			patch: null,
			shot: null,
			lastUsed: Number.MAX_SAFE_INTEGER
		});

		return source;
	}

	function startSourceShot(shot, time, options) {
		// todo: what if we're already active?
		const { source } = shot;
		if (source.start) {
			source.start(time, options);
		}
		// todo: set release, stopTime to Infinity

		scheduleShots();
	}

	function releaseSourceShot(shot, time) {
		// todo: what if we're already released?
		const { source } = shot;
		shot.releaseTime = time;
		if (source.release) {
			source.release(time);
		} else if (source.stop) {
			source.stop(time);
		}
		updatePatch(shot);
		scheduleShots();
	}

	function stopSourceShot(shot, time) {
		// todo: what if we're already stopped?
		// todo: release if release time is before this
		const { source } = shot;
		shot.stopTime = time;
		if (source.stop) {
			source.stop(time);
		}
		updatePatch(shot);
		scheduleShots();
	}

	function getPatch(definition) {
		let patch = null;
		let pool = patchPools.get(definition);
		if (!pool) {
			pool = [];
			patchPools.set(definition, pool);
		}

		if (pool.length) {
			patch = pool.pop();
		} else {
			patch = definition(context/*, me*/);
			patch.definition = definition;
			patch.lastUsed = Number.MAX_SAFE_INTEGER;

			if (!patch.input) {
				patch.input = patch.output || patch.node;
			}
			if (!patch.output) {
				patch.output = patch.input || patch.node;
			}
		}

		return patch;
	}

	function releasePatch(patch) {
		if (patch.input) {
			patch.input.disconnect();
		}
		if (patch.output) {
			patch.output.disconnect();
		}

		// return it to the pool
		const pool = patchPools.get(patch.definition);
		if (pool) {
			// store timestamp for pruning later
			patch.lastUsed = Date.now();
			pool.push(patch);
			scheduleCleanUp();
		}
	}

	/*
	todo: can we eliminate this?
	- just pass def and options to source every time (too many params?)
	- store pool in MultiMap
	*/
	this.source = (definition, options) => {
		const s = Symbol();
		allSources.set(s, {
			definition,
			options,
			pool: []
		});
		return s;
	};

	this.shot = (sourceFn, patchDef) => {
		// todo: if source is a buffer, create a new source for it
		// todo: if source is an AudioScheduledSourceNode, create new source for it?
		// todo: shuffle around order so code makes sense
		// todo: get destination somewhere. shot options? play options?

		// if (options === undefined && typeof patch !== 'function') {
		// 	options = patch;
		// 	patch = null;
		// }

		const sourceDef = allSources.get(sourceFn);
		if (!sourceDef) {
			throw new Error('Unknown source');
		}

		const {
			// definition,
			// options: sourceOpts,
			pool: sourcePool
		} = sourceDef;

		// todo: emit events
		const shot = {
			context,
			start(startTime = context.currentTime, options) {
				const id = nextShotId++;
				const source = sourcePool.length ?
					sourcePool.pop() :
					makeShotSource(sourceDef);

				source.patchDef = patchDef;

				const shotInfo = {
					id,
					shot,
					source,
					patchDef,
					startTime,
					releaseTime: Infinity,
					stopTime: Infinity
				};

				source.shot = shotInfo;

				liveShots.set(id, shotInfo);
				startSourceShot(shotInfo, startTime, options);
				return id;
			},
			release(releaseTime = context.currentTime, id) {
				// handle missing id for this shot def
				if (id === undefined) {
					liveShots.forEach(s => {
						if (s.shot === shot && s.releaseTime > releaseTime) {
							releaseSourceShot(s, releaseTime);
						}
					});
					return;
				}

				const s = liveShots.get(id);
				if (s) {
					releaseSourceShot(s, releaseTime);
				}
			},
			stop(stopTime = context.currentTime, id) {
				// handle missing id for this shot def
				if (id === undefined) {
					liveShots.forEach(s => {
						if (s.shot === shot && s.stopTime > stopTime) {
							stopSourceShot(s, stopTime);
						}
					});
					return;
				}

				const s = liveShots.get(id);
				if (s) {
					stopSourceShot(s, stopTime);
				}
			},
			destroy() {
				// todo: remove any event listeners
				liveShots.forEach(s => {
					if (s.shot === shot) {
						stopSourceShot(s, 0);
						s.source.events.forEach(e => revoke(e.id));
					}
				});
				sourcePool.forEach(source => {
					if (source.destroy) {
						source.destroy();
					}
				});
				sourcePool.length = 0;
				allShots.delete(shot);
			}
		};

		allShots.add(shot);

		return shot;
	};

	this.destroy = () => {
		allShots.forEach(s => s.destroy());
		releaseMainContext(this);

		this.emit('destroy');
		allOff(this);
	};
}

eventEmitter(SoundQ.prototype);

export default SoundQ;
