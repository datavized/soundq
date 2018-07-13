import eventEmitter from 'event-emitter';
import allOff from 'event-emitter/all-off';
import createAudioContext from 'ios-safe-audio-context';
import num from './util/num';
import computeOptions from './util/computeOptions';

// todo: MIN_LOOK_AHEAD might be longer for offline context
const MIN_LOOK_AHEAD = 0.05; // seconds
const MAX_SCHEDULED_SOUNDS = 40;

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

	const cacheExpiration = Math.max(0, num(options.cacheExpiration, 10)) * 1000; // seconds -> milliseconds

	// queues, maps and sets for various pools and events
	const allShots = new Set();
	const liveShots = new Map(); // by id
	const sourcePools = new Map();
	const patchPools = new Map();
	const soundEvents = new Map();
	const unscheduledQueue = [];
	const playedSounds = [];

	let scheduling = false;
	let earliestStopTime = Infinity;
	let cleanUpTimeout = 0;
	let destroyed = false;

	function cleanUp() {
		clearTimeout(cleanUpTimeout);
		cleanUpTimeout = 0;

		const now = Date.now();
		let maxAge = -1;

		function cleanPool(pool, key, map) {
			while (pool.length) {
				const obj = pool[0];
				const age = now - obj.lastUsed;
				if (age < cacheExpiration && !destroyed) {
					maxAge = Math.max(maxAge, age);
					return;
				}

				if (obj.destroy) {
					obj.destroy();
				}
				pool.shift();
			}

			// Delete empty pool from map
			map.delete(key);
		}

		patchPools.forEach(cleanPool);
		sourcePools.forEach(cleanPool);

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
		const {
			patch,
			patchOptions,
			startTime,
			releaseTime,
			stopTime
		} = source;
		if (patch && patch.start && stopTime > context.currentTime) {
			// compute patch options if there are any functions
			patch.start(startTime, releaseTime, stopTime, computeOptions(
				patchOptions,
				{ startTime, releaseTime, stopTime }
			));
		}
	}

	function startSoundEvent(sound) {
		const { source, shot } = sound;
		if (source.startEvent) {
			sound = Object.assign(sound, source.startEvent(sound));
			sound.scheduled = true;
		}

		if (shot) {
			if (shot.patchDef && !shot.patch) {
				shot.patch = getPatch(shot.patchDef);
			}
			updatePatch(shot);
		}

		// todo: use optional output destination
		if (sound.output && sound.output.connect) {
			const dest = shot && shot.patch && shot.patch.input || context.destination;
			sound.output.connect(dest);

			if (shot && shot.patch && shot.patch.output) {
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

		let untilTime = Infinity;
		liveShots.forEach(shot => {
			const { source } = shot;
			if (source.request && shot.stopTime > context.currentTime) {
				let event = null;
				do {
					untilTime = Math.min(untilTime, earliestStopTime + MIN_LOOK_AHEAD);
					event = source.request(untilTime);
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
			if (sound.stopTime > Math.max(context.currentTime, sound.startTime)) {
				startSoundEvent(sound);
			} else {
				// we missed one!
				revoke(sound.id);
			}
		}

		scheduling = false;
	}

	function calculateEarliestStopTime() {
		earliestStopTime = Infinity;
		for (let i = 0; i < playedSounds.length; i++) {
			const {startTime, stopTime} = playedSounds[i];
			if (stopTime > context.currentTime && stopTime > startTime) {
				earliestStopTime = stopTime;
				break;
			}
		}
	}

	function revoke(eventId) {
		const sound = soundEvents.get(eventId);
		if (sound) {
			const { source, shot } = sound;
			sound.stopped = true;

			if (sound.scheduled) {
				const index = playedSounds.findIndex(s => s.id === eventId);
				if (index >= 0) {
					playedSounds.splice(index, 1);
				}

				if (source.finishEvent) {
					source.finishEvent(sound);
				}

				if (sound.output) {
					sound.output.disconnect();
				}
			}

			soundEvents.delete(eventId);
			source.events.delete(sound);
			shot.source.events.delete(sound);
			// todo: fire sound stop event

			if (shot && !source.events.size && !shot.source.events.size && (shot.stopTime <= context.currentTime || shot.source.done && shot.source.done())) {
				// todo: fire shot stop event
				liveShots.delete(shot.id);

				if (source.finish) {
					source.finish();
				}

				freeSource(source);

				if (shot.patch) {
					freePatch(shot.patch);
					shot.patch = null;
				}
			}

			calculateEarliestStopTime();

			if (sound.startTime < context.currentTime) {
				// only schedule further if this sound has actually played
				scheduleSounds();
			}
		}
	}

	function stop(id, stopTime) {
		const sound = soundEvents.get(id);
		if (sound && sound.stopTime !== stopTime) {
			sound.stopTime = stopTime;
			if (sound.scheduled) {
				if (sound.source.stopEvent) {
					sound.source.stopEvent(sound);
				}

				// re-sort played sounds, update earliest stopTime if needed
				playedSounds.sort(sortPlayed);

				calculateEarliestStopTime();

			}
			scheduleSounds();
		}
	}

	this.context = context;

	function makeShotSource(definition) {
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

				if (soundEvents.has(id) && soundEvent.scheduled) {
					// todo: update this? maybe cannot be changed if already started
				} else {
					const needsSorting = unscheduledQueue.length && soundEvent.startTime <= unscheduledQueue[unscheduledQueue.length - 1].startTime;
					const newSound = !soundEvents.has(id);
					if (newSound) {
						unscheduledQueue.push(soundEvent);
					}
					if (needsSorting) {
						// only sort when we need to
						unscheduledQueue.sort(sortUnscheduled);
					}
					soundEvents.set(id, soundEvent);
					source.events.add(soundEvent);

					if (soundEvent.stopTime >= context.currentTime) {
						earliestStopTime = Math.min(earliestStopTime, soundEvent.stopTime);
					}
				}

				return id;
			},

			// means we're really, really done with this
			revoke,

			// clean up
			stop,

			get: key => source.props[key],

			// in case source wants to build in a patch
			getPatch,
			freePatch,

			// add get/release source
			getSource,
			freeSource,

			schedule: scheduleSounds
		};

		source = Object.assign(definition(controller), {
			controller,
			events: new Set(),
			definition,
			shot: null,
			props: {},
			lastUsed: Number.MAX_SAFE_INTEGER
		});

		const set = source.set;
		source.set = (key, val) => {
			if (!source.shot || source.shot.props !== source.props) {
				source.props[key] = val;
			}
			if (set) {
				set.call(source, key, val);
			}
		};

		return source;
	}

	function startSourceShot(shot, time, options) {
		// todo: what if we're already active?
		const { source } = shot;
		if (source.start) {
			source.start(time, options);
		}
		// todo: set release, stopTime to Infinity

		scheduleSounds();
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
		scheduleSounds();
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
		scheduleSounds();
	}

	function getSource(definition) {
		const pool = sourcePools.get(definition);
		if (pool && pool.length) {
			return pool.pop();
		}

		return makeShotSource(definition);
	}

	function freeSource(source) {
		const expired = typeof source.expired === 'function' ?
			source.expired() :
			!!source.expired;
		if (expired) {
			/*
			Some sources cannot be re-used (e.g. AudioScheduledSourceNode),
			so destroy them rather than adding back to the pool.
			*/
			if (source.destroy) {
				source.destroy();
			}
			return;
		}

		let pool = sourcePools.get(source.definition);
		if (!pool) {
			pool = [];
			sourcePools.set(source.definition, pool);
		}

		source.shot = null;
		source.lastUsed = Date.now();

		pool.push(source);
		scheduleCleanUp();
	}

	function getPatch(definition) {
		const pool = patchPools.get(definition);
		if (pool && pool.length) {
			return pool.pop();
		}

		const patch = definition(context);
		patch.definition = definition;
		patch.lastUsed = Number.MAX_SAFE_INTEGER;

		if (patch.input === undefined) {
			patch.input = patch.node;
		}
		if (!patch.output === undefined) {
			patch.output = patch.node;
		}

		return patch;
	}

	function freePatch(patch) {
		if (patch.reset) {
			patch.reset();
		}
		if (patch.input) {
			patch.input.disconnect();
		}
		if (patch.output) {
			patch.output.disconnect();
		}

		const expired = typeof patch.expired === 'function' ?
			patch.expired() :
			!!patch.expired;

		if (expired) {
			if (patch.destroy) {
				patch.destroy();
			}
			return;
		}

		// return it to the pool
		let pool = patchPools.get(patch.definition);
		if (!pool) {
			pool = [];
			patchPools.set(patch.definition, pool);
		}

		// store timestamp for pruning later
		patch.lastUsed = Date.now();
		pool.push(patch);
		scheduleCleanUp();
	}

	this.shot = (sourceFn, patchDef) => {
		// todo: if source is a buffer, create a new source for it
		// todo: if source is an AudioScheduledSourceNode, create new source for it?
		// todo: shuffle around order so code makes sense
		// todo: get destination somewhere. shot options? play options?

		const defaultProps = {};

		// todo: emit events
		const shot = {
			context,

			/*
			We may decide to merge options and patchOptions somehow
			*/
			start(startTime = 0, options, patchOptions) {
				if (typeof startTime !== 'number' && startTime !== undefined) {
					patchOptions = options;
					options = startTime;
					startTime = 0;
				}

				const id = nextShotId++;
				const source = getSource(sourceFn);
				startTime = Math.max(context.currentTime, startTime);

				const shotInfo = {
					id,
					shot,
					source,
					patchDef,
					startTime,
					releaseTime: Infinity,
					stopTime: Infinity,
					props: {...defaultProps},
					patchOptions
				};

				source.shot = shotInfo;
				source.props = shotInfo.props;

				for (const key in source.props) {
					if (source.props.hasOwnProperty(key)) {
						source.set(key, source.props[key]);
					}
				}

				liveShots.set(id, shotInfo);
				startSourceShot(shotInfo, startTime, options);
				return id;
			},
			release(releaseTime = 0, id) {
				releaseTime = Math.max(context.currentTime, releaseTime);

				// handle missing id for this shot def
				if (id === undefined) {
					liveShots.forEach(s => {
						if (s.shot === shot && s.releaseTime > releaseTime) {
							releaseSourceShot(s, releaseTime);
						}
					});
					return shot;
				}

				const s = liveShots.get(id);
				if (s && s.shot === shot) {
					releaseSourceShot(s, releaseTime);
				}

				return shot;
			},
			stop(stopTime = 0, id) {
				stopTime = Math.max(context.currentTime, stopTime);

				// handle missing id for this shot def
				if (id === undefined) {
					liveShots.forEach(s => {
						if (s.shot === shot && s.stopTime > stopTime) {
							stopSourceShot(s, stopTime);
						}
					});
					return shot;
				}

				const s = liveShots.get(id);
				if (s && s.shot === shot) {
					stopSourceShot(s, stopTime);
				}

				return shot;
			},
			set(id, key, value) {
				if (typeof id !== 'number') {
					value = key;
					key = id;
					id = undefined;
				}

				const shotInfo = liveShots.get(id);
				if (id !== undefined && !shotInfo) {
					return shot;
				}

				const props = shotInfo ? shotInfo.props : defaultProps;

				if (typeof key === 'string') {
					props[key] = value;
					if (shotInfo && shotInfo.source.set) {
						shotInfo.source.set(key, value);
					}
				} else if (key && typeof key === 'object') {
					Object.assign(props, key);
					if (id) {
						for (const k in key) {
							if (key.hasOwnProperty(k)) {
								shot.set(id, k, key[k]);
							}
						}
					}
				}

				if (id === undefined) {
					liveShots.forEach(s => {
						if (s.shot === shot/* && s.startTime > context.currentTime*/) {
							shot.set(s.id, key, value);
						}
					});
				}

				return shot;
			},
			destroy() {
				// todo: remove any event listeners
				liveShots.forEach(s => {
					if (s.shot === shot) {
						stopSourceShot(s, context.currentTime);
						s.source.events.forEach(e => revoke(e.id));
					}
				});
				allShots.delete(shot);
			}
		};

		allShots.add(shot);

		return shot;
	};

	this.stop = time => {
		allShots.forEach(s => s.stop(time));
	};

	this.destroy = () => {
		destroyed = true;

		allShots.forEach(s => s.destroy());
		cleanUp();
		releaseMainContext(this);

		this.emit('destroy');
		allOff(this);
	};
}

eventEmitter(SoundQ.prototype);

export default SoundQ;
