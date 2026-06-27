/*
 * audio.js — drum & backing-track synthesis using the Web Audio API.
 * Every sound is generated in code, so the tool needs no audio files.
 */
(function (global) {
  "use strict";

  let ctx = null;
  let master = null;
  let analyser = null;
  let reverb = null;

  let unlocked = false;

  function ensureContext() {
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 1.0;
      master.connect(ctx.destination);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      master.connect(analyser); // tap for the output level meter

      // Light room reverb so the kit sounds like a real kit in a room,
      // not dry triggered samples. master -> convolver -> wet -> out.
      try {
        reverb = ctx.createConvolver();
        reverb.buffer = makeImpulse(0.6, 2.4);
        const wet = ctx.createGain();
        wet.gain.value = 0.16;
        master.connect(reverb);
        reverb.connect(wet);
        wet.connect(ctx.destination);
      } catch (e) { reverb = null; }
    }
    if (ctx.state === "suspended") ctx.resume();
    loadSamples();
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

  // Synthesized impulse response for a warm small room. The noise is run
  // through a one-pole lowpass so the tail isn't a harsh metallic hiss.
  function makeImpulse(duration, decay) {
    const len = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = last + 0.22 * (white - last); // warm (lowpassed) diffuse tail
        data[i] = last * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  // ---- Sampled acoustic drum kit (CC0 samples in window.DrumSamples) ------
  const SAMPLE_NAMES = ["kick", "snare", "hihat", "openhat", "ride", "crash", "tomHigh", "tomMid", "tomLow"];
  const buffers = {};
  let samplesRequested = false;

  function b64ToArrayBuffer(dataUri) {
    const b64 = dataUri.indexOf(",") >= 0 ? dataUri.slice(dataUri.indexOf(",") + 1) : dataUri;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  function loadSamples() {
    if (samplesRequested || !global.DrumSamples) return;
    samplesRequested = true;
    SAMPLE_NAMES.forEach((name) => {
      const uri = global.DrumSamples[name];
      if (!uri) return;
      try {
        ctx.decodeAudioData(
          b64ToArrayBuffer(uri),
          (buf) => { buffers[name] = buf; },
          () => { /* fall back to synth voice for this drum */ }
        );
      } catch (e) { /* fall back to synth */ }
    });
  }

  function playSample(name, time, vel) {
    const buf = buffers[name];
    if (!buf) return false;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    // Humanize: real drums never sound identical twice. Vary level and pitch
    // slightly per hit so repeated notes don't sound machine-gunned.
    src.playbackRate.value = 1 + (Math.random() * 0.04 - 0.02);
    const g = ctx.createGain();
    g.gain.value = Math.max(0.0001, vel * (0.88 + Math.random() * 0.22));
    src.connect(g).connect(master);
    src.start(time);
    return true;
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

  // Convenience: a one-shot white-noise source.
  function noiseSource() {
    const n = ctx.createBufferSource();
    n.buffer = getNoise();
    return n;
  }

  // ---- Drum voices (acoustic / classic kit) ------------------------------
  // Each drum layers a tuned shell tone with noise transients so it reads as
  // a real, miked-up kit rather than an electronic/retro synth voice.
  const voices = {
    kick(time, vel = 1) {
      // Resonant shell: a fast pitch sweep gives the "thump" of a real bass drum.
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(125, time);
      osc.frequency.exponentialRampToValueAtTime(48, time + 0.07);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(vel, time + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.34);
      osc.connect(gain).connect(master);
      osc.start(time);
      osc.stop(time + 0.4);

      // Beater click: a short mid burst that makes the attack sound acoustic.
      const click = noiseSource();
      const cf = ctx.createBiquadFilter();
      cf.type = "bandpass";
      cf.frequency.value = 2600;
      cf.Q.value = 1.2;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.4 * vel, time);
      cg.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
      click.connect(cf).connect(cg).connect(master);
      click.start(time);
      click.stop(time + 0.05);
    },

    snare(time, vel = 1) {
      // Drum shell: two detuned tones with a quick downward bend = wood/metal body.
      [196, 278].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(f, time);
        o.frequency.exponentialRampToValueAtTime(f * 0.82, time + 0.1);
        g.gain.setValueAtTime(0.0001, time);
        g.gain.exponentialRampToValueAtTime((i ? 0.18 : 0.32) * vel, time + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
        o.connect(g).connect(master);
        o.start(time);
        o.stop(time + 0.2);
      });

      // Snare wires: band-limited noise with a natural tail = the rattle/crack.
      const noise = noiseSource();
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1700;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 8500;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, time);
      ng.gain.exponentialRampToValueAtTime(0.55 * vel, time + 0.004);
      ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.19);
      noise.connect(hp).connect(lp).connect(ng).connect(master);
      noise.start(time);
      noise.stop(time + 0.24);
    },

    ghost(time) {
      voices.snare(time, 0.3);
    },

    // Acoustic hi-hat: bright filtered noise with a resonant "sizzle" peak.
    hihat(time, vel = 1, open = false) {
      const decay = open ? 0.42 : 0.055;
      const noise = noiseSource();
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 8200;
      const peak = ctx.createBiquadFilter();
      peak.type = "peaking";
      peak.frequency.value = 11000;
      peak.Q.value = 3;
      peak.gain.value = 8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime((open ? 0.32 : 0.4) * vel, time + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
      noise.connect(hp).connect(peak).connect(g).connect(master);
      noise.start(time);
      noise.stop(time + decay + 0.05);
    },

    openhat(time, vel = 1) {
      voices.hihat(time, vel, true);
    },

    // Ride cymbal: a struck "ping" (bell partials) over a shimmering noise wash.
    ride(time, vel = 1) {
      const wash = noiseSource();
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 7000;
      bp.Q.value = 1.5;
      const wg = ctx.createGain();
      wg.gain.setValueAtTime(0.0001, time);
      wg.gain.exponentialRampToValueAtTime(0.18 * vel, time + 0.005);
      wg.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);
      wash.connect(bp).connect(wg).connect(master);
      wash.start(time);
      wash.stop(time + 0.55);

      // bell ping (two inharmonic partials)
      [840, 1180].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, time);
        g.gain.exponentialRampToValueAtTime((i ? 0.05 : 0.1) * vel, time + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.4);
        o.connect(g).connect(master);
        o.start(time);
        o.stop(time + 0.45);
      });
    },

    // Crash: a wide, long noise wash with a fast swell and slow decay.
    crash(time, vel = 1) {
      const noise = noiseSource();
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 3500;
      const peak = ctx.createBiquadFilter();
      peak.type = "peaking";
      peak.frequency.value = 6500;
      peak.Q.value = 1.2;
      peak.gain.value = 6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(0.55 * vel, time + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 1.5);
      noise.connect(hp).connect(peak).connect(g).connect(master);
      noise.start(time);
      noise.stop(time + 1.6);
    },

    // Tom: tuned shell with a pitch drop plus a short stick attack.
    tom(time, vel = 1, freq = 140) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.55, time + 0.22);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.75 * vel, time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);
      osc.connect(gain).connect(master);
      osc.start(time);
      osc.stop(time + 0.38);

      // stick attack on the skin
      const tick = noiseSource();
      const tf = ctx.createBiquadFilter();
      tf.type = "bandpass";
      tf.frequency.value = 3200;
      const tg = ctx.createGain();
      tg.gain.setValueAtTime(0.18 * vel, time);
      tg.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);
      tick.connect(tf).connect(tg).connect(master);
      tick.start(time);
      tick.stop(time + 0.04);
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

    // Melody / lead voice for public-domain songs (the actual tune).
    lead(time, midi, dur = 0.25, vel = 0.5) {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const o1 = ctx.createOscillator();
      o1.type = "triangle";
      o1.frequency.value = freq;
      const o2 = ctx.createOscillator();
      o2.type = "sine";
      o2.frequency.value = freq * 2; // octave shimmer
      const g = ctx.createGain();
      const hold = Math.max(0.06, dur * 0.8);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(vel, time + 0.015);
      g.gain.setValueAtTime(vel, time + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.05);
      const g2 = ctx.createGain();
      g2.gain.value = 0.28;
      o2.connect(g2).connect(g);
      o1.connect(g).connect(master);
      o1.start(time); o1.stop(time + dur + 0.1);
      o2.start(time); o2.stop(time + dur + 0.1);
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
    // Prefer the real acoustic samples; fall back to synthesis if not loaded.
    const vel = typeof args[0] === "number" ? args[0] : 1;
    if (name === "ghost") {
      if (playSample("snare", time, 0.3)) return;
    } else if (SAMPLE_NAMES.indexOf(name) >= 0) {
      if (playSample(name, time, vel * 0.9)) return;
    }
    if (voices[name]) voices[name](time, ...args);
  }

  // A loud, unmistakable test tone for diagnosing "I can't hear anything".
  function testTone() {
    ensureContext();
    const t = ctx.currentTime + 0.02;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587, t);        // D5
    osc.frequency.setValueAtTime(880, t + 0.25); // A5
    osc.frequency.setValueAtTime(587, t + 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.02);
    g.gain.setValueAtTime(0.7, t + 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 0.9);
  }

  // Current output level (0..1), read from the analyser tap.
  function level() {
    if (!analyser) return 0;
    const buf = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buf);
    let max = 0;
    for (let i = 0; i < buf.length; i++) {
      const d = Math.abs(buf[i] - 128);
      if (d > max) max = d;
    }
    return max / 128;
  }

  global.DrumAudio = {
    ensureContext,
    now,
    play,
    testTone,
    level,
    get ctx() { return ctx; },
    get master() { return master; },
    get analyser() { return analyser; },
    get loadedSamples() { return Object.keys(buffers).length; },
  };
})(window);
