/*
 * classics.js — public-domain songs whose actual melodies AND lyrics are
 * reproduced in full (melody + lyrics + chords + bass + drums). These tunes are
 * NOT copyrighted, so the real song plays; mute the Drums toggle to play along.
 *
 * Each song: { genre, level, title, composer, bpm, groove, repeat, bars }
 *   bars: one entry per bar — { chord:<bass-octave midi>, mel:[[step,midi,dur]], lyric:"" }
 *   melody midi is in the C4 (60) octave; step 0..15; dur in 16th steps.
 */
(function (global) {
  "use strict";

  const POP_BEAT = { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------x-------" };
  const ROCK_BEAT = { hihat: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------x-------" };
  const C = 36, D = 38, E = 40, F = 41, G = 43;

  global.DrumClassics = [
    {
      genre: "pop", level: 1, title: "Ode to Joy", composer: "Beethoven (public domain)",
      bpm: 100, groove: POP_BEAT, repeat: 2,
      bars: [
        { chord: C, mel: [[0,64,4],[4,64,4],[8,65,4],[12,67,4]], lyric: "Joyful, joyful," },
        { chord: G, mel: [[0,67,4],[4,65,4],[8,64,4],[12,62,4]], lyric: "we adore thee," },
        { chord: C, mel: [[0,60,4],[4,60,4],[8,62,4],[12,64,4]], lyric: "God of glory," },
        { chord: G, mel: [[0,64,6],[6,62,2],[8,62,8]],          lyric: "Lord of love;" },
        { chord: C, mel: [[0,64,4],[4,64,4],[8,65,4],[12,67,4]], lyric: "Hearts unfold like" },
        { chord: G, mel: [[0,67,4],[4,65,4],[8,64,4],[12,62,4]], lyric: "flow'rs before thee," },
        { chord: C, mel: [[0,60,4],[4,60,4],[8,62,4],[12,64,4]], lyric: "opening to" },
        { chord: C, mel: [[0,62,4],[4,60,4],[8,60,8]],          lyric: "the sun above." },
      ],
    },
    {
      genre: "pop", level: 1, title: "Twinkle Twinkle Little Star", composer: "Traditional (public domain)",
      bpm: 96, groove: POP_BEAT, repeat: 2,
      bars: [
        { chord: C, mel: [[0,60,4],[4,60,4],[8,67,4],[12,67,4]], lyric: "Twinkle, twinkle," },
        { chord: F, mel: [[0,69,4],[4,69,4],[8,67,8]],          lyric: "little star," },
        { chord: F, mel: [[0,65,4],[4,65,4],[8,64,4],[12,64,4]], lyric: "how I wonder" },
        { chord: C, mel: [[0,62,4],[4,62,4],[8,60,8]],          lyric: "what you are!" },
        { chord: C, mel: [[0,67,4],[4,67,4],[8,65,4],[12,65,4]], lyric: "Up above the" },
        { chord: G, mel: [[0,64,4],[4,64,4],[8,62,8]],          lyric: "world so high," },
        { chord: C, mel: [[0,67,4],[4,67,4],[8,65,4],[12,65,4]], lyric: "like a diamond" },
        { chord: G, mel: [[0,64,4],[4,64,4],[8,62,8]],          lyric: "in the sky." },
      ],
    },
    {
      genre: "pop", level: 1, title: "Jingle Bells", composer: "James Pierpont (public domain)",
      bpm: 120, groove: POP_BEAT, repeat: 2,
      bars: [
        { chord: C, mel: [[0,64,4],[4,64,4],[8,64,8]],          lyric: "Jingle bells," },
        { chord: C, mel: [[0,64,4],[4,64,4],[8,64,8]],          lyric: "jingle bells," },
        { chord: C, mel: [[0,64,4],[4,67,4],[8,60,4],[12,62,4]], lyric: "jingle all the" },
        { chord: C, mel: [[0,64,16]],                           lyric: "way!" },
        { chord: F, mel: [[0,65,4],[4,65,4],[8,65,4],[12,65,4]], lyric: "Oh what fun it" },
        { chord: C, mel: [[0,65,4],[4,64,4],[8,64,4],[12,64,4]], lyric: "is to ride in a" },
        { chord: G, mel: [[0,64,4],[4,62,4],[8,62,4],[12,64,4]], lyric: "one-horse open" },
        { chord: G, mel: [[0,62,4],[4,67,8]],                   lyric: "sleigh!" },
      ],
    },
    {
      genre: "rock", level: 1, title: "Mary Had a Little Lamb", composer: "Traditional (public domain)",
      bpm: 100, groove: ROCK_BEAT, repeat: 2,
      bars: [
        { chord: C, mel: [[0,64,4],[4,62,4],[8,60,4],[12,62,4]], lyric: "Mary had a" },
        { chord: C, mel: [[0,64,4],[4,64,4],[8,64,8]],          lyric: "little lamb," },
        { chord: G, mel: [[0,62,4],[4,62,4],[8,62,8]],          lyric: "little lamb," },
        { chord: C, mel: [[0,64,4],[4,67,4],[8,67,8]],          lyric: "little lamb," },
        { chord: C, mel: [[0,64,4],[4,62,4],[8,60,4],[12,62,4]], lyric: "Mary had a" },
        { chord: C, mel: [[0,64,4],[4,64,4],[8,64,4],[12,64,4]], lyric: "little lamb whose" },
        { chord: G, mel: [[0,62,4],[4,62,4],[8,64,4],[12,62,4]], lyric: "fleece was white as" },
        { chord: C, mel: [[0,60,16]],                           lyric: "snow." },
      ],
    },
  ];
})(window);
