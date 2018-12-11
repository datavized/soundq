Source Factory:
- [x] methods
  - start(startTime, releaseTime)
  - release(id or all, time)
  - stop(id or all, time)
- [x] register with sink
- [x] tell sink when the next event is ready
- [x] listen to sink for when we want another event
  - insert anything before specified time
- [ ] tell sink to cancel a previously provided event
- [ ] unregister from sink

Source
- [x] new instance created by factory when 

Sink/Q
- [x] receive events from all/any sources
- [x] place incoming events in queue and sort
- [ ] if too many active events in audio context, cancel
  - tell source to cancel
  - tear down resources
- [x] start events in audio context
  - set up any resources (source nodes, patches)
  - call start on source nodes (or source plugin)
- [x] ask source for more events as needed `request`
  - indicate next scheduled time
- [x] tell source we're done playing all submitted events `finish`

Patch
- mostly same as before
- composable
- does not affect duration
- receiving methods
  - [x] create function/closure
  - [x] start
  - [x] release
  - [x] stop
  - [ ] destroy

Source types
- [x] generic `AudioScheduledSourceNode`
- [x] buffer
  - wrap generic
- [x] oscillator
  - wrap generic
- [ ] multi
  - takes another source as an option
  - copy multiShot
- [x] repeater
  - takes another source as an option
- [x] DTMF?
  - for fun/practice
  - combine two oscillators?
  - https://en.wikipedia.org/wiki/Dual-tone_multi-frequency_signaling
  - end at zero crossing?
- [ ] Synthesizer
  - See for instruments: https://padenot.github.io/litsynth/
  - more instruments: https://www.npmjs.com/package/synth-kit
  - https://github.com/andyhall/webaudio-instruments
- [ ] Sampler
- https://archive.org/details/total_harmonic_distortion
- https://archive.org/details/g-town-church-sampling-project
- https://www.samplephonics.com/products/free/sampler-instruments/the-leeds-town-hall-organ
- http://www.philharmonia.co.uk/explore/sound_samples [NO LICENSE, but can ask Esa-Pekka]
- https://embertone.com/freebies/intstrings-lite.php
- https://cymatics.fm/blog/ultimate-list-of-free-live-instruments-samples/

Patch ideas
- [x] Panner
- [ ] 3D Panner
- [x] ADSR Envelope
  see https://blog.landr.com/adsr-envelopes-infographic/
- [ ] Grain
- window functions (usable in grain?)
  - [x] trapezoidal
  - [ ] Hann
  - [ ] Hamming
  - [ ] Tukey
  - [ ] Gaussian
  - implement this using periodic wave
    - https://devdocs.io/dom/periodicwave
    - https://jackschaedler.github.io/circles-sines-signals/complex.html
    - https://en.wikipedia.org/wiki/Window_function#Hann_and_Hamming_windows
    - http://michaelkrzyzaniak.com/AudioSynthesis/2_Audio_Synthesis/11_Granular_Synthesis/1_Window_Functions/
- [x] Compose (util for composing multiple patches into one)

More samples:


Data Synthesis
- [x] Implement playback modules
  - audio playback plugin
  - UI interface

- [x] Update sound file playback for plugin architecture

- [x] Basic synthesizer
  - one instrument
  - pick key/mode
  - pick range of octaves
  - one note at a time

- [ ] Play triad/chord as long as necessary?

- [ ] Add advanced arpeggio option?
  https://codepen.io/jakealbaugh/full/qNrZyw

- [ ] Different synthesizer instrument options

- [ ] Piano?
  https://github.com/Tonejs/Tone.js/blob/master/examples/sampler.html

- [ ] Church Organ
  https://archive.org/details/g-town-church-sampling-project

- [ ] Church Mandolin

- [ ] Church toy glockenspiel
