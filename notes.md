Source Factory:
- methods
  - start(startTime, releaseTime)
  - release(id or all, time)
  - stop(id or all, time)
- register with sink
- tell sink when the next event is ready
- listen to sink for when we want another event
  - insert anything before specified time
- tell sink to cancel a previously provided event
- unregister from sink

Source
- new instance created by factory when 

Sink/Q
- receive events from all/any sources
- place incoming events in queue and sort
- if too many active events in audio context, cancel
  - tell source to cancel
  - tear down resources
- start events in audio context
  - set up any resources (source nodes, patches)
  - call start on source nodes (or source plugin)
- ask source for more events as needed `request`
  - indicate next scheduled time
- tell source we're done playing all submitted events `finish`

Patch
- mostly same as before
- composable
- does not affect duration
- receiving methods
  - create function/closure
  - start
  - release
  - stop
  - destroy


Source types
- generic `AudioScheduledSourceNode`
- buffer
  - wrap generic
- oscillator
  - wrap generic
- multi
  - takes another source as an option
  - copy multiShot
- repeater
  - takes another source as an option
- DTMF?
  - for fun/practice
  - combine two oscillators?
  - https://en.wikipedia.org/wiki/Dual-tone_multi-frequency_signaling
  - end at zero crossing?
