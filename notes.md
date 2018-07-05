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

Patch ideas
- [ ] Panner
- [x] ADSR Envelope
  see https://blog.landr.com/adsr-envelopes-infographic/
- [ ] Grain
- [ ] window functions (usable in grain?)
implement this using periodic wave
  - https://devdocs.io/dom/periodicwave
  - https://jackschaedler.github.io/circles-sines-signals/complex.html
  - https://en.wikipedia.org/wiki/Window_function#Hann_and_Hamming_windows
  - http://michaelkrzyzaniak.com/AudioSynthesis/2_Audio_Synthesis/11_Granular_Synthesis/1_Window_Functions/
- [ ] Compose (util for composing multiple patches into one)
