/*
 * audio.js — drum & backing-track synthesis using the Web Audio API.
 * Every sound is generated in code, so the tool needs no audio files.
 */
(function (global) {
  "use strict";

  let ctx = null;
  let master = null;

  let unlocked = false;

  function ensureContext() {
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    // Safari/iOS and some sandboxed iframes only "unlock" audio when a sound
    // is started synchronously inside the user gesture. Play a silent blip.
    if (!unlocked) {
      try {
        const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        unlocked = true;
      } catch (e) { /* ignore */ }
    }
    return ctx;
  }

  function now() {
    return ctx ? ctx.currentTime : 0;
  }

  // Reusable white-noise buffer for snare/hats/crash.
  let noiseBuffer = null;
  function getNoise() {
    if (!noiseBuffer) {
      const len = ctx.sampleRate * 1.0;
      noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  function env(gainNode, time, peak, decay) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, time);
    g.exponentialRampToValueAtTime(peak, time + 0.002);
    g.exponentialRampToValueAtTime(0.0001, time + decay);
  }

  // ---- Drum voices -------------------------------------------------------
  const voices = {
    kick(time, vel = 1) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
      env(gain, time, 0.9 * vel, 0.4);
      osc.connect(gain).connect(master);
      osc.start(time);
      osc.stop(time + 0.45);
    },

    snare(time, vel = 1) {
      // noise body
      const noise = ctx.createBufferSource();
      noise.buffer = getNoise();
      const nf = ctx.createBiquadFilter();
      nf.type = "highpass";
      nf.frequency.value = 1500;
      const ng = ctx.createGain();
      env(ng, time, 0.7 * vel, 0.2);
      noise.connect(nf).connect(ng).connect(master);
      noise.start(time);
      noise.stop(time + 0.25);
      // tonal snap
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, time);
      env(og, time, 0.35 * vel, 0.12);
      osc.connect(og).connect(master);
      osc.start(time);
      osc.stop(time + 0.15);
    },

    ghost(time) {
      voices.snare(time, 0.28);
    },

    hihat(time, vel = 1, open = false) {
      const noise = ctx.createBufferSource();
      noise.buffer = getNoise();
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 7000;
      const g = ctx.createGain();
      const decay = open ? 0.32 : 0.06;
      env(g, time, 0.4 * vel, decay);
      noise.connect(hp).connect(g).connect(master);
      noise.start(time);
      noise.stop(time + decay + 0.05);
    },

    openhat(time, vel = 1) {
      voices.hihat(time, vel, true);
    },

    ride(time, vel = 1) {
      const noise = ctx.createBufferSource();
      noise.buffer = getNoise();
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 9000;
      bp.Q.value = 2;
      const g = ctx.createGain();
      env(g, time, 0.22 * vel, 0.25);
      noise.connect(bp).connect(g).connect(master);
      // bell tone
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = 520;
      const og = ctx.createGain();
      env(og, time, 0.08 * vel, 0.3);
      osc.connect(og).connect(master);
      noise.start(time); noise.stop(time + 0.3);
      osc.start(time); osc.stop(time + 0.32);
    },

    crash(time, vel = 1) {
      const noise = ctx.createBufferSource();
      noise.buffer = getNoise();
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 5000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(0.5 * vel, time + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 1.2);
      noise.connect(hp).connect(g).connect(master);
      noise.start(time);
      noise.stop(time + 1.3);
    },

    tom(time, vel = 1, freq = 140) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, time + 0.2);
      env(gain, time, 0.7 * vel, 0.3);
      osc.connect(gain).connect(master);
      osc.start(time);
      osc.stop(time + 0.35);
    },
    tomHigh(time, vel = 1) { voices.tom(time, vel, 220); },
    tomMid(time, vel = 1) { voices.tom(time, vel, 150); },
    tomLow(time, vel = 1) { voices.tom(time, vel, 100); },

    // Metronome click
    click(time, accent = false) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = accent ? 1500 : 1000;
      env(g, time, accent ? 0.5 : 0.3, 0.04);
      osc.connect(g).connect(master);
      osc.start(time);
      osc.stop(time + 0.06);
    },

    // Simple bass note for the backing track
    bass(time, midi, dur = 0.25, vel = 0.6) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sawtooth";
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      osc.frequency.value = freq;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 600;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(vel, time + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(lp).connect(g).connect(master);
      osc.start(time);
      osc.stop(time + dur + 0.05);
    },

    // Soft chord stab for the backing track
    chord(time, midis, dur = 0.4, vel = 0.18) {
      midis.forEach((m) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
        g.gain.setValueAtTime(0.0001, time);
        g.gain.exponentialRampToValueAtTime(vel, time + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
        osc.connect(g).connect(master);
        osc.start(time);
        osc.stop(time + dur + 0.05);
      });
    },
  };

  function play(name, time, ...args) {
    if (voices[name]) voices[name](time, ...args);
  }

  global.DrumAudio = {
    ensureContext,
    now,
    play,
    get ctx() { return ctx; },
    get master() { return master; },
  };
})(window);
