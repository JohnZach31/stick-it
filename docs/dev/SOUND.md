# Sound language

Stick-It's UI sounds are **tiny jazz chords**, generated with Web Audio (no audio files). Each is 3-4 notes strummed a few milliseconds apart, soft, and over within about half a second. They only play from the person's own action (never from a sync echo), only after a user gesture, and obey Settings → Sounds (on/off and volume).

| Cue | Sound | Voicing (Hz) | Length |
| --- | --- | --- | --- |
| Done | paper-stamp thump, then **B dim7** leaning into **C6/9** | B3 246.94, D4 293.66, F4 349.23, Ab4 415.30 → C4 261.63, E4 329.63, A4 440.00, D5 587.33 | ~0.55 s |
| Restore | one light **Eb dim7** sting | Eb4 311.13, Gb4 369.99, A4 440.00, C5 523.25 | ~0.25 s |
| Trash | soft thump with a low D3 (no chord: it should feel like putting something down) | D3 146.83 | ~0.15 s |

Levels: each note is at most ~0.075 of full scale times the volume setting, and everything goes through a soft compressor and a 3.2 kHz low-pass, so a chord cannot clip or sound sharp. The Sounds preview plays the Done cue.
