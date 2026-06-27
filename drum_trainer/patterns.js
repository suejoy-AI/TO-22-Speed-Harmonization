/*
 * patterns.js — drum grooves organized by genre and level.
 *
 * Each track is a 16-step string (one bar of 16th notes). Characters:
 *   '-' rest   'x' normal hit   'o' open hi-hat / accent   'g' ghost note
 * Beats land on steps 0, 4, 8, 12.
 *
 * Backing tracks (bass + chord stabs) are arrays of {step, ...} events so the
 * tool can "play the song" the user grooves along with.
 */
(function (global) {
  "use strict";

  // Visual + audio mapping. Order = top-to-bottom in the grid / tab.
  const INSTRUMENTS = [
    { key: "crash", label: "Crash", tab: "CC", voice: "crash" },
    { key: "ride", label: "Ride", tab: "RD", voice: "ride" },
    { key: "openhat", label: "Open HH", tab: "OH", voice: "openhat" },
    { key: "hihat", label: "Hi-Hat", tab: "HH", voice: "hihat" },
    { key: "tomHigh", label: "Hi Tom", tab: "T1", voice: "tomHigh" },
    { key: "tomMid", label: "Mid Tom", tab: "T2", voice: "tomMid" },
    { key: "tomLow", label: "Floor Tom", tab: "T3", voice: "tomLow" },
    { key: "snare", label: "Snare", tab: "SN", voice: "snare" },
    { key: "kick", label: "Kick", tab: "KK", voice: "kick" },
  ];

  // Helper to keep chord arrays terse.
  const chordEvents = (root3rd5th, steps) =>
    steps.map((s) => ({ step: s, midis: root3rd5th, dur: 0.5 }));

  const GENRES = {
    rock: {
      label: "Rock",
      swing: 0,
      levels: [
        {
          name: "Basic Rock Beat",
          tip: "The foundation of rock. Steady 8th-note hi-hats, kick on 1 & 3, snare on 2 & 4.",
          bpm: 80,
          tracks: {
            hihat: "x-x-x-x-x-x-x-x-",
            snare: "----x-------x---",
            kick:  "x-------x-------",
          },
        },
        {
          name: "Driving Rock",
          tip: "Add a pickup kick before beat 3 to push the groove forward.",
          bpm: 95,
          tracks: {
            hihat: "x-x-x-x-x-x-x-x-",
            snare: "----x-------x---",
            kick:  "x-----x-x-------",
          },
        },
        {
          name: "16th-Note Rock",
          tip: "Hi-hats now play steady 16ths — keep your wrist relaxed and even.",
          bpm: 100,
          tracks: {
            hihat: "xxxxxxxxxxxxxxxx",
            snare: "----x-------x---",
            kick:  "x-----x-x---x---",
          },
        },
        {
          name: "Rock with Open Hats",
          tip: "Open the hi-hat on the upbeats for an anthemic, lifted feel.",
          bpm: 110,
          tracks: {
            openhat: "--o---o---o---o-",
            hihat:   "x-x-x-x-x-x-x-x-",
            snare:   "----x-------x---",
            kick:    "x--x--x-x--x----",
          },
        },
        {
          name: "Rock Groove + Fill",
          tip: "Crash on beat 1 and a tom fill across beat 4 to round out the bar.",
          bpm: 120,
          tracks: {
            crash:   "x---------------",
            hihat:   "x-x-x-x-x-x-----",
            tomHigh: "------------x---",
            tomMid:  "-------------x--",
            tomLow:  "--------------xx",
            snare:   "----x-------x---",
            kick:    "x-----x-x-------",
          },
        },
      ],
      backing: {
        bass: [40, 0, 0, 0, 40, 0, 47, 0, 43, 0, 0, 0, 45, 0, 47, 0],
        chords: chordEvents([52, 55, 59], [0, 8]), // Em
      },
    },

    pop: {
      label: "Pop",
      swing: 0,
      levels: [
        {
          name: "Four-on-the-Floor",
          tip: "Kick on every beat — the heartbeat of modern pop and dance.",
          bpm: 100,
          tracks: {
            hihat: "x-x-x-x-x-x-x-x-",
            snare: "----x-------x---",
            kick:  "x---x---x---x---",
          },
        },
        {
          name: "Pop Backbeat",
          tip: "Classic pop: snare snaps on 2 & 4 with a syncopated kick.",
          bpm: 105,
          tracks: {
            hihat: "x-x-x-x-x-x-x-x-",
            snare: "----x-------x---",
            kick:  "x---x---x-x-x---",
          },
        },
        {
          name: "Pop with Claps",
          tip: "Open hat accents on the upbeats add shimmer and lift.",
          bpm: 112,
          tracks: {
            openhat: "------o-------o-",
            hihat:   "x-x-x-x-x-x-x-x-",
            snare:   "----x-------x---",
            kick:    "x---x-x-x---x-x-",
          },
        },
        {
          name: "Bright Pop 16ths",
          tip: "Steady 16th hats with ghost notes on the snare for a tight, busy feel.",
          bpm: 118,
          tracks: {
            hihat: "xxxxxxxxxxxxxxxx",
            snare: "--g-x---g-g-x-g-",
            kick:  "x---x-x-x---x---",
          },
        },
        {
          name: "Pop Anthem + Crash",
          tip: "Crash opener, driving kick, and an open-hat hook on beat 4.",
          bpm: 124,
          tracks: {
            crash:   "x---------------",
            openhat: "--------------o-",
            hihat:   "x-x-x-x-x-x-x---",
            snare:   "----x-------x---",
            kick:    "x---x---x---x-x-",
          },
        },
      ],
      backing: {
        bass: [48, 0, 48, 0, 53, 0, 0, 0, 45, 0, 45, 0, 50, 0, 0, 0],
        chords: chordEvents([60, 64, 67], [0, 4, 8, 12]), // C
      },
    },

    funk: {
      label: "Funk",
      swing: 0.15,
      levels: [
        {
          name: "Funk Foundation",
          tip: "Tight 16th hats and a snare on 2 & 4 — keep it in the pocket.",
          bpm: 92,
          tracks: {
            hihat: "xxxxxxxxxxxxxxxx",
            snare: "----x-------x---",
            kick:  "x-------x-x-----",
          },
        },
        {
          name: "Ghost-Note Funk",
          tip: "Soft ghost notes between the backbeats are the secret to funk feel.",
          bpm: 96,
          tracks: {
            hihat: "xxxxxxxxxxxxxxxx",
            snare: "--g-x-g---g-x-g-",
            kick:  "x--x----x-x-----",
          },
        },
        {
          name: "Syncopated Funk",
          tip: "Push the kick off the grid — syncopation drives funk forward.",
          bpm: 100,
          tracks: {
            hihat: "x-xxx-xxx-xxx-xx",
            snare: "--g-x-g-g-g-x-g-",
            kick:  "x--x--x---x-x---",
          },
        },
        {
          name: "Open-Hat Funk",
          tip: "Bark an open hat on the 'e' of beat 3 for that classic funk shout.",
          bpm: 104,
          tracks: {
            openhat: "---------o------",
            hihat:   "x-xxx-xx--xxx-xx",
            snare:   "--g-x-g---g-x-g-",
            kick:    "x--x--x-x-x-----",
          },
        },
        {
          name: "Funk Groove + Fill",
          tip: "Crash accent plus a quick tom-and-snare fill to cap the bar.",
          bpm: 108,
          tracks: {
            crash:   "x---------------",
            hihat:   "x-xxx-xxx-xx----",
            tomMid:  "------------x-x-",
            tomLow:  "-------------x-x",
            snare:   "--g-x-g---g-x---",
            kick:    "x--x--x---x-----",
          },
        },
      ],
      backing: {
        bass: [40, 0, 40, 43, 0, 40, 0, 0, 45, 0, 0, 43, 40, 0, 0, 0],
        chords: chordEvents([52, 55, 59], [0, 6, 10]), // E7-ish stab
      },
    },

    jazz: {
      label: "Jazz (Swing)",
      swing: 0.5,
      levels: [
        {
          name: "Swing Ride",
          tip: "The spang-a-lang ride pattern with a relaxed swing feel — the soul of jazz.",
          bpm: 110,
          tracks: {
            ride:  "x---x-x-x---x-x-",
            hihat: "----x-------x---",
            kick:  "x-------x-------",
          },
        },
        {
          name: "Ride + Hi-Hat Foot",
          tip: "Hi-hat foot chicks on 2 & 4 lock the time underneath the ride.",
          bpm: 120,
          tracks: {
            ride:  "x---x-x-x---x-x-",
            hihat: "----x-------x---",
            snare: "------g-------g-",
            kick:  "x-------x-------",
          },
        },
        {
          name: "Comping Jazz",
          tip: "Sprinkle snare 'comps' between the ride hits to converse with the band.",
          bpm: 130,
          tracks: {
            ride:  "x---x-x-x---x-x-",
            hihat: "----x-------x---",
            snare: "--g---g-g---g-x-",
            kick:  "x-----x-x-----x-",
          },
        },
        {
          name: "Up-Tempo Swing",
          tip: "Faster swing — keep the ride light and let the feel float.",
          bpm: 150,
          tracks: {
            ride:  "x---x-x-x---x-x-",
            hihat: "----x-------x---",
            snare: "--g-x-g-g-g-x-g-",
            kick:  "x---x-x-x---x-x-",
          },
        },
        {
          name: "Jazz Trading Fours",
          tip: "Open up with toms and snare — like trading a four-bar solo with the band.",
          bpm: 160,
          tracks: {
            ride:    "x---x-x---------",
            hihat:   "----x-------x---",
            tomHigh: "--------x-x-----",
            tomMid:  "----------x-x---",
            snare:   "--g---g-----x-x-",
            kick:    "x-------x-------",
          },
        },
      ],
      backing: {
        // walking-ish bass line
        bass: [45, 0, 0, 0, 47, 0, 0, 0, 48, 0, 0, 0, 50, 0, 52, 0],
        chords: chordEvents([57, 60, 64], [0, 8]), // Am7 color
      },
    },
  };

  global.DrumPatterns = { INSTRUMENTS, GENRES };
})(window);
