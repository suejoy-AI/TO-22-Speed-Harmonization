/*
 * app.js — UI, scheduling, and level progression for the Drum Trainer.
 */
(function () {
  "use strict";

  const { INSTRUMENTS, GENRES } = window.DrumPatterns;
  const Audio = window.DrumAudio;

  const STEPS = 16;
  const LOOPS_PER_LEVEL = 4; // completed loops needed to advance a level
  const STORAGE_KEY = "drumTrainer.v1";

  // ---- DOM ---------------------------------------------------------------
  const el = {
    genre: document.getElementById("genre"),
    songSearch: document.getElementById("song-search"),
    searchResults: document.getElementById("search-results"),
    song: document.getElementById("song"),
    songLabel: document.getElementById("song-label"),
    songHint: document.getElementById("song-hint"),
    level: document.getElementById("level"),
    levelBadge: document.getElementById("level-badge"),
    levelName: document.getElementById("level-name"),
    tempo: document.getElementById("tempo"),
    tempoValue: document.getElementById("tempo-value"),
    metronome: document.getElementById("metronome"),
    backing: document.getElementById("backing"),
    countin: document.getElementById("countin"),
    play: document.getElementById("play"),
    stop: document.getElementById("stop"),
    testSound: document.getElementById("test-sound"),
    meterFill: document.getElementById("meter-fill"),
    audioStatus: document.getElementById("audio-status"),
    loopsCount: document.getElementById("loops-count"),
    progressFill: document.getElementById("progress-fill"),
    resetProgress: document.getElementById("reset-progress"),
    patternTitle: document.getElementById("pattern-title"),
    patternTip: document.getElementById("pattern-tip"),
    grid: document.getElementById("grid"),
    drumTab: document.getElementById("drum-tab"),
    pads: document.getElementById("pads"),
  };

  // ---- State -------------------------------------------------------------
  const state = {
    genre: "rock",
    level: 1, // 1-based
    song: -1, // -1 = practice patterns (level mode); >=0 = song index
    tempo: 80,
    loopsCompleted: 0,
    isPlaying: false,
    timeline: null, // array of bars when playing a full song
    barPos: 0,
    ending: false,
  };

  // ---- Song arrangement engine -------------------------------------------
  // A song plays a full structure (intro/verse/chorus/bridge/outro) with groove
  // variation, fills on transitions, a chord progression, and a real ending —
  // instead of one looping bar.
  const SONG_STRUCTURE = {
    rock: [["Intro",2,"intro"],["Verse",4,"verse"],["Chorus",4,"chorus"],["Verse",4,"verse"],["Chorus",4,"chorus"],["Bridge",2,"intro"],["Chorus",4,"chorus"],["Outro",2,"outro"]],
    pop:  [["Intro",2,"intro"],["Verse",4,"verse"],["Chorus",4,"chorus"],["Verse",4,"verse"],["Chorus",4,"chorus"],["Bridge",2,"intro"],["Chorus",4,"chorus"],["Outro",2,"outro"]],
    funk: [["Intro",2,"intro"],["Groove",4,"verse"],["Chorus",4,"chorus"],["Groove",4,"verse"],["Breakdown",2,"intro"],["Chorus",4,"chorus"],["Groove",4,"verse"],["Outro",2,"outro"]],
    jazz: [["Head A",4,"verse"],["Head B",4,"chorus"],["Solo",8,"chorus"],["Head A",4,"verse"],["Head B",4,"chorus"],["Outro",2,"outro"]],
  };
  const SONG_PROG = { rock: [0,0,5,7], pop: [0,7,9,5], funk: [0,0,0,5], jazz: [0,5,7,0] };
  const BASS_OFFSETS = {
    rock: [0,null,null,null,null,null,7,null,0,null,null,null,7,null,null,null],
    pop:  [0,null,null,null,7,null,null,null,0,null,0,null,7,null,null,null],
    funk: [0,null,0,null,null,0,null,null,7,null,null,0,0,null,null,null],
    jazz: [0,null,null,null,5,null,null,null,7,null,null,null,10,null,null,null],
  };
  const CHORD_SHAPE = { rock: [12,19,24], pop: [12,16,19], funk: [12,15,19], jazz: [12,15,19,22] };
  const CHORD_STEPS = { rock: [0,8], pop: [0,4,8,12], funk: [0,8], jazz: [0,8] };
  const FILLS = {
    rock: { tomHigh:"--------x-x-----", tomMid:"------------x---", tomLow:"-------------x-x", snare:"x-x-x-----------", kick:"x---------------" },
    pop:  { snare:"----x-x-x-x-xxxx", tomMid:"------------x-x-", tomLow:"--------------xx", kick:"x---------------" },
    funk: { snare:"x-xx-xx-x-xx-xxx", kick:"x-------x-------" },
    jazz: { snare:"x-xxx-xxx-xxx-xx", tomMid:"----x-------x---", kick:"x-------x-------" },
  };

  function introGroove(verse) {
    const g = {};
    if (verse.ride) g.ride = verse.ride;
    else g.hihat = verse.hihat || "x-x-x-x-x-x-x-x-";
    g.kick = "x-------x-------";
    return g;
  }
  function chorusGroove(ch) {
    const g = Object.assign({}, ch);
    g.crash = "x---------------";
    return g;
  }
  function outroGroove(verse, finalBar) {
    if (finalBar) return { crash: "x---------------", kick: "x-------x-------" };
    return Object.assign({ crash: "x---------------" }, verse);
  }
  function songBacking(root, genre) {
    const off = BASS_OFFSETS[genre];
    const bass = off.map((o) => (o === null ? 0 : root + o));
    const chords = CHORD_STEPS[genre].map((step) => ({
      step, midis: CHORD_SHAPE[genre].map((iv) => root + iv), dur: 0.5,
    }));
    return { bass, chords };
  }
  function buildTimeline(song, genre) {
    const struct = SONG_STRUCTURE[genre];
    const prog = SONG_PROG[genre];
    const R = song.root || 40;
    const bars = [];
    let pi = 0;
    struct.forEach(([name, count, kind]) => {
      for (let bi = 0; bi < count; bi++) {
        const root = R + prog[pi % prog.length];
        pi++;
        const lastOfSection = bi === count - 1;
        let tracks;
        if (kind === "verse" && lastOfSection) tracks = FILLS[genre];
        else if (kind === "intro") tracks = introGroove(song.tracks);
        else if (kind === "chorus") tracks = chorusGroove(song.gChorus || song.tracks);
        else if (kind === "outro") tracks = outroGroove(song.tracks, lastOfSection);
        else tracks = song.tracks;
        bars.push({ tracks, section: name, backing: songBacking(root, genre) });
      }
    });
    return bars;
  }
  function songBarCount(genre) {
    return SONG_STRUCTURE[genre].reduce((a, s) => a + s[1], 0);
  }

  function currentGenre() { return GENRES[state.genre]; }
  function maxLevel() { return currentGenre().levels.length; }
  function songMode() { return state.song >= 0; }
  function currentSongList() {
    const byGenre = window.DrumSongs && window.DrumSongs[state.genre];
    return (byGenre && byGenre[state.level]) || [];
  }
  function currentSong() { return currentSongList()[state.song]; }
  function currentPattern() {
    return songMode() ? currentSong() : currentGenre().levels[state.level - 1];
  }
  function currentBacking() {
    return songMode() ? songBacking(currentSong().root, state.genre) : currentGenre().backing;
  }
  // Tracks shown in the grid/tab right now (live bar while a song plays,
  // otherwise the selected song's main groove or the practice pattern).
  function displayTracks() {
    if (songMode() && state.isPlaying && state.timeline) {
      return state.timeline[Math.min(state.barPos, state.timeline.length - 1)].tracks;
    }
    if (songMode()) return currentSong().tracks;
    return currentPattern().tracks;
  }

  // ---- Persistence -------------------------------------------------------
  function save() {
    try {
      const data = { genre: state.genre, levelByGenre: load().levelByGenre || {} };
      data.levelByGenre[state.genre] = state.level;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* storage may be unavailable */ }
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }

  // ---- Build genre + level selectors -------------------------------------
  function buildGenreOptions() {
    Object.keys(GENRES).forEach((key) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = GENRES[key].label;
      el.genre.appendChild(opt);
    });
  }

  function buildSongOptions() {
    el.song.innerHTML = "";
    const none = document.createElement("option");
    none.value = "-1";
    none.textContent = "Practice patterns (no song)";
    el.song.appendChild(none);
    const list = currentSongList();
    list.forEach((s, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `${s.title} — ${s.artist}`;
      el.song.appendChild(opt);
    });
    el.song.value = String(state.song);
    if (el.songLabel) el.songLabel.textContent = `Song to play along (Level ${state.level})`;
    if (el.songHint) el.songHint.textContent = `${list.length} songs at this level — raise the level for harder songs.`;
  }

  // ---- Global song search (across every genre and level) -----------------
  let songIndex = [];
  function buildSongIndex() {
    songIndex = [];
    const D = window.DrumSongs || {};
    Object.keys(D).forEach((genre) => {
      const label = (GENRES[genre] && GENRES[genre].label) || genre;
      for (let lvl = 1; lvl <= 5; lvl++) {
        (D[genre][lvl] || []).forEach((s, idx) => {
          songIndex.push({ genre, genreLabel: label, level: lvl, idx, title: s.title, artist: s.artist });
        });
      }
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function hideResults() {
    el.searchResults.hidden = true;
    el.searchResults.innerHTML = "";
  }

  function runSearch() {
    const q = el.songSearch.value.trim().toLowerCase();
    if (!q) { hideResults(); return; }
    const matches = songIndex.filter((s) =>
      s.title.toLowerCase().indexOf(q) >= 0 || s.artist.toLowerCase().indexOf(q) >= 0
    ).slice(0, 20);
    el.searchResults.innerHTML = "";
    if (!matches.length) {
      const e = document.createElement("div");
      e.className = "search-empty";
      e.textContent = "No songs match that search.";
      el.searchResults.appendChild(e);
      el.searchResults.hidden = false;
      return;
    }
    matches.forEach((m, i) => {
      const row = document.createElement("div");
      row.className = "search-item" + (i === 0 ? " active" : "");
      row.innerHTML =
        `<span><span class="si-name">${escapeHtml(m.title)}</span> ` +
        `<span class="si-artist">— ${escapeHtml(m.artist)}</span></span>` +
        `<span class="si-tag">${escapeHtml(m.genreLabel)} · L${m.level}</span>`;
      row.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        selectGlobalSong(m.genre, m.level, m.idx);
      });
      el.searchResults.appendChild(row);
    });
    el.searchResults.hidden = false;
  }

  function selectGlobalSong(genre, level, idx) {
    state.genre = genre;
    el.genre.value = genre;
    el.level.max = maxLevel();
    state.level = Math.max(1, Math.min(level, maxLevel()));
    el.level.value = state.level;
    state.song = idx;
    buildSongOptions();
    el.song.value = String(idx);
    const s = currentSong();
    if (s) { el.tempo.value = s.bpm; state.tempo = s.bpm; el.tempoValue.textContent = s.bpm; }
    state.loopsCompleted = 0;
    save();
    refreshPatternUI();
    el.songSearch.value = "";
    hideResults();
  }

  // ---- Rendering ---------------------------------------------------------
  // Tracks used by a groove, in INSTRUMENTS display order.
  function usedInstruments(tracks) {
    const t = tracks || displayTracks();
    return INSTRUMENTS.filter((i) => t[i.key]);
  }

  let cellRefs = {}; // key -> [cell elements per step]

  function renderGrid(tracks) {
    const t = tracks || displayTracks();
    el.grid.innerHTML = "";
    cellRefs = {};

    usedInstruments(t).forEach((inst) => {
      const pattern = t[inst.key];
      const row = document.createElement("div");
      row.className = "grid-row";

      const label = document.createElement("div");
      label.className = "row-label";
      label.textContent = inst.label;
      row.appendChild(label);

      const steps = document.createElement("div");
      steps.className = "steps";
      steps.style.gridTemplateColumns = `repeat(${STEPS}, 1fr)`;

      cellRefs[inst.key] = [];
      for (let s = 0; s < STEPS; s++) {
        const ch = pattern[s] || "-";
        const cell = document.createElement("div");
        cell.className = "cell";
        if (s % 4 === 0) cell.classList.add("beat");
        if (s % 4 === 0) cell.classList.add("beatline");
        if (ch !== "-") {
          cell.classList.add("on");
          if (ch === "o") cell.classList.add("accent");
          if (ch === "g") cell.style.opacity = "0.45";
        }
        steps.appendChild(cell);
        cellRefs[inst.key].push(cell);
      }
      row.appendChild(steps);
      el.grid.appendChild(row);
    });
  }

  function renderTab(tracks) {
    const t = tracks || displayTracks();
    const lines = [];
    // count ruler
    let ruler = "  |";
    const counts = ["1", "e", "&", "a", "2", "e", "&", "a", "3", "e", "&", "a", "4", "e", "&", "a"];
    ruler += counts.join("");
    lines.push(ruler + "|");
    usedInstruments(t).forEach((inst) => {
      lines.push(inst.tab + "|" + t[inst.key] + "|");
    });
    el.drumTab.textContent = lines.join("\n");
  }

  function renderBar(tracks) {
    renderGrid(tracks);
    renderTab(tracks);
  }

  function renderPads() {
    const padDefs = [
      { voice: "kick", label: "Kick", key: "A" },
      { voice: "snare", label: "Snare", key: "S" },
      { voice: "hihat", label: "Hi-Hat", key: "D" },
      { voice: "openhat", label: "Open HH", key: "F" },
      { voice: "tomMid", label: "Tom", key: "J" },
      { voice: "crash", label: "Crash", key: "K" },
    ];
    el.pads.innerHTML = "";
    padDefs.forEach((pad) => {
      const div = document.createElement("div");
      div.className = "pad";
      div.dataset.voice = pad.voice;
      div.dataset.key = pad.key.toLowerCase();
      div.innerHTML = `<span class="pad-name">${pad.label}</span><span class="pad-key">${pad.key}</span>`;
      div.addEventListener("mousedown", () => hitPad(pad.voice, div));
      el.pads.appendChild(div);
    });
  }

  function hitPad(voice, node) {
    Audio.ensureContext();
    Audio.play(voice, Audio.now() + 0.001);
    if (node) {
      node.classList.add("hit");
      setTimeout(() => node.classList.remove("hit"), 100);
    }
  }

  function refreshPatternUI() {
    const p = currentPattern();
    if (songMode()) {
      const s = currentSong();
      el.patternTitle.textContent = `${currentGenre().label} · ♫ ${s.title} — ${s.artist}`;
      el.patternTip.textContent = `${s.tip} · Press Play for the full song (intro → verses → choruses → outro).`;
      el.levelName.textContent = `Playing along: ${s.title}`;
    } else {
      el.patternTitle.textContent = `${currentGenre().label} · Level ${state.level}: ${p.name}`;
      el.patternTip.textContent = p.tip;
      el.levelBadge.textContent = state.level;
      el.levelName.textContent = p.name;
      el.level.value = state.level;
    }
    el.song.value = String(state.song);
    renderGrid();
    renderTab();
    updateProgressUI();
  }

  function updateProgressUI() {
    if (songMode()) {
      if (state.isPlaying && state.timeline) return; // live bar shown by updateSongProgress
      el.loopsCount.textContent = `Full song ready — ${songBarCount(state.genre)} bars`;
      el.progressFill.style.width = "0%";
      return;
    }
    if (state.level >= maxLevel()) {
      el.loopsCount.textContent = "Max level reached 🎉";
      el.progressFill.style.width = "100%";
      return;
    }
    el.loopsCount.textContent = `${state.loopsCompleted} / ${LOOPS_PER_LEVEL} loops`;
    el.progressFill.style.width = `${(state.loopsCompleted / LOOPS_PER_LEVEL) * 100}%`;
  }

  // ---- Scheduler ---------------------------------------------------------
  let schedulerTimer = null;
  let currentStep = 0;
  let nextNoteTime = 0;
  let countInRemaining = 0;
  const visualQueue = [];

  function stepDuration() {
    return (60 / state.tempo) / 4; // 16th-note duration
  }

  function swingOffset(step) {
    const swing = currentGenre().swing || 0;
    // delay the swung 8th-note offbeats (the "&" of each beat)
    if (swing > 0 && step % 4 === 2) return swing * stepDuration();
    return 0;
  }

  function activeBar() {
    if (songMode() && state.isPlaying && state.timeline) return state.timeline[state.barPos];
    return { tracks: currentPattern().tracks, backing: currentBacking() };
  }

  function scheduleStep(step, time) {
    const bar = activeBar();
    const tracks = bar.tracks;
    const hitTime = time + swingOffset(step);

    // metronome (quarter notes)
    if (el.metronome.checked && step % 4 === 0) {
      Audio.play("click", time, step === 0);
    }

    // drum voices for this step
    usedInstruments(tracks).forEach((inst) => {
      const ch = tracks[inst.key][step];
      if (!ch || ch === "-") return;
      if (ch === "g") {
        Audio.play("ghost", hitTime);
      } else if (ch === "o") {
        Audio.play(inst.voice === "hihat" ? "openhat" : inst.voice, hitTime, 1);
      } else {
        Audio.play(inst.voice, hitTime, 1);
      }
    });

    // backing track
    if (el.backing.checked) {
      const b = bar.backing;
      if (b) {
        const note = b.bass[step];
        if (note) Audio.play("bass", hitTime, note, stepDuration() * 2);
        const chord = b.chords.find((c) => c.step === step);
        if (chord) Audio.play("chord", hitTime, chord.midis, chord.dur);
      }
    }

    visualQueue.push({ step, time: hitTime, bar: (songMode() && state.timeline) ? state.barPos : undefined });
  }

  function advanceNote() {
    nextNoteTime += stepDuration();
    currentStep++;
    if (currentStep >= STEPS) {
      currentStep = 0;
      if (songMode() && state.isPlaying && state.timeline) {
        state.barPos++;
        if (state.barPos >= state.timeline.length) state.ending = true; // song finished
      } else {
        onLoopComplete();
      }
    }
  }

  function onLoopComplete() {
    if (countInRemaining > 0) return; // count-in bars don't count
    if (songMode()) return; // songs don't auto-advance levels
    if (state.level >= maxLevel()) return;
    state.loopsCompleted++;
    if (state.loopsCompleted >= LOOPS_PER_LEVEL) {
      levelUp();
    }
    updateProgressUI();
  }

  function levelUp() {
    state.level++;
    state.loopsCompleted = 0;
    save();
    // celebratory crash, then swap to the new pattern's notation
    Audio.play("crash", Audio.now() + 0.02);
    buildSongOptions(); // unlock this level's songs
    refreshPatternUI();
    flashLevelUp();
  }

  function flashLevelUp() {
    el.levelBadge.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.5)" }, { transform: "scale(1)" }],
      { duration: 500 }
    );
  }

  function scheduler() {
    const ctx = Audio.ctx;
    while (nextNoteTime < ctx.currentTime + 0.1 && !state.ending) {
      if (countInRemaining > 0) {
        // play count-in clicks on the quarter notes of one bar
        if (currentStep % 4 === 0) {
          Audio.play("click", nextNoteTime, currentStep === 0);
        }
        visualQueue.push({ step: currentStep, time: nextNoteTime, countIn: true });
        nextNoteTime += stepDuration();
        currentStep++;
        if (currentStep >= STEPS) {
          currentStep = 0;
          countInRemaining--;
        }
      } else {
        scheduleStep(currentStep, nextNoteTime);
        advanceNote();
      }
    }
    if (state.ending) {
      // let the last bar ring out, then stop and show "complete"
      const finishAt = nextNoteTime + 0.6;
      const ms = Math.max(0, (finishAt - ctx.currentTime) * 1000);
      setTimeout(finishSong, ms);
      return; // don't re-arm
    }
    schedulerTimer = setTimeout(scheduler, 25);
  }

  function finishSong() {
    stop();
    state.ending = false;
    state.timeline = null;
    el.loopsCount.textContent = "✓ Song complete — press Play to hear it again";
    el.progressFill.style.width = "100%";
    renderBar(currentSong().tracks); // back to the preview groove
  }

  // ---- Playhead animation ------------------------------------------------
  let lastDrawnStep = -1;
  let lastDrawnBar = -1;
  function draw() {
    if (!state.isPlaying) return;
    const ctx = Audio.ctx;
    let step = lastDrawnStep;
    let bar = lastDrawnBar;
    while (visualQueue.length && visualQueue[0].time <= ctx.currentTime) {
      const it = visualQueue.shift();
      step = it.step;
      if (it.bar !== undefined) bar = it.bar;
    }
    // a song moved to a new bar — swap the notation to that bar's groove
    if (bar !== lastDrawnBar && bar >= 0 && state.timeline && state.timeline[bar]) {
      renderBar(state.timeline[bar].tracks);
      updateSongProgress(bar);
      lastDrawnBar = bar;
      lastDrawnStep = -1;
    }
    if (step !== lastDrawnStep) {
      highlightStep(step);
      lastDrawnStep = step;
    }
    requestAnimationFrame(draw);
  }

  function updateSongProgress(bar) {
    const b = state.timeline[bar];
    el.loopsCount.textContent = `${b.section} — bar ${bar + 1} / ${state.timeline.length}`;
    el.progressFill.style.width = `${((bar + 1) / state.timeline.length) * 100}%`;
  }

  function highlightStep(step) {
    Object.keys(cellRefs).forEach((key) => {
      cellRefs[key].forEach((cell, i) => {
        cell.classList.toggle("playing", i === step);
      });
    });
  }

  function clearHighlight() {
    Object.keys(cellRefs).forEach((key) => {
      cellRefs[key].forEach((cell) => cell.classList.remove("playing"));
    });
  }

  // ---- Output level meter (sound diagnostics) ----------------------------
  let meterRunning = false;
  let sawSound = false;
  function startMeter() {
    if (meterRunning) return;
    meterRunning = true;
    const tick = () => {
      const lvl = Audio.level();
      el.meterFill.style.width = Math.min(100, Math.round(lvl * 140)) + "%";
      if (lvl > 0.02 && !sawSound) {
        sawSound = true;
        el.audioStatus.textContent =
          "🔊 Audio IS being produced. If you still hear nothing, the sound is leaving the app — check device volume, output device, and (on claude.ai) that the tab isn't muted.";
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function testSound() {
    Audio.testTone();
    el.audioStatus.textContent = "Playing a test tone…";
    startMeter();
  }

  // ---- Transport ---------------------------------------------------------
  function play() {
    Audio.ensureContext();
    if (state.isPlaying) return;
    state.isPlaying = true;
    state.ending = false;
    currentStep = 0;
    lastDrawnStep = -1;
    lastDrawnBar = -1;
    state.barPos = 0;
    visualQueue.length = 0;
    // build the full-song timeline when a song is selected
    state.timeline = songMode() ? buildTimeline(currentSong(), state.genre) : null;
    if (state.timeline) renderBar(state.timeline[0].tracks);
    countInRemaining = el.countin.checked ? 1 : 0;
    nextNoteTime = Audio.ctx.currentTime + 0.1;
    el.play.disabled = true;
    el.stop.disabled = false;
    scheduler();
    requestAnimationFrame(draw);
    startMeter();
  }

  function stop() {
    state.isPlaying = false;
    state.ending = false;
    if (schedulerTimer) clearTimeout(schedulerTimer);
    schedulerTimer = null;
    visualQueue.length = 0;
    clearHighlight();
    el.play.disabled = false;
    el.stop.disabled = true;
  }

  // ---- Events ------------------------------------------------------------
  function setLevel(level, { resetProgress = true } = {}) {
    state.song = -1; // choosing a level returns to practice mode
    state.level = Math.max(1, Math.min(level, maxLevel()));
    if (resetProgress) state.loopsCompleted = 0;
    buildSongOptions(); // songs are per-level
    el.tempo.value = currentPattern().bpm;
    state.tempo = currentPattern().bpm;
    el.tempoValue.textContent = state.tempo;
    save();
    refreshPatternUI();
  }

  function selectSong(idx) {
    if (idx < 0) {
      setLevel(state.level); // back to practice patterns
      return;
    }
    state.song = idx;
    const s = currentSong();
    el.tempo.value = s.bpm;
    state.tempo = s.bpm;
    el.tempoValue.textContent = s.bpm;
    refreshPatternUI();
  }

  function onGenreChange() {
    state.genre = el.genre.value;
    state.song = -1;
    buildSongOptions();
    el.level.max = maxLevel();
    const saved = load();
    const lvl = (saved.levelByGenre && saved.levelByGenre[state.genre]) || 1;
    setLevel(lvl);
  }

  function bindEvents() {
    el.genre.addEventListener("change", onGenreChange);

    el.level.addEventListener("input", () => {
      setLevel(parseInt(el.level.value, 10));
    });

    el.song.addEventListener("change", () => {
      selectSong(parseInt(el.song.value, 10));
    });

    el.songSearch.addEventListener("input", runSearch);
    el.songSearch.addEventListener("focus", runSearch);
    el.songSearch.addEventListener("blur", () => setTimeout(hideResults, 150));
    el.songSearch.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        el.songSearch.value = "";
        hideResults();
        el.songSearch.blur();
      } else if (e.key === "Enter") {
        const first = el.searchResults.querySelector(".search-item");
        if (first) { e.preventDefault(); first.dispatchEvent(new MouseEvent("mousedown")); }
      }
    });

    el.tempo.addEventListener("input", () => {
      state.tempo = parseInt(el.tempo.value, 10);
      el.tempoValue.textContent = state.tempo;
    });

    el.play.addEventListener("click", play);
    el.stop.addEventListener("click", stop);
    el.testSound.addEventListener("click", testSound);

    el.resetProgress.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEY);
      state.loopsCompleted = 0;
      setLevel(1);
    });

    // keyboard pads
    document.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      // don't trigger pads/spacebar while typing in a field
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const pad = el.pads.querySelector(`.pad[data-key="${e.key.toLowerCase()}"]`);
      if (pad) {
        e.preventDefault();
        hitPad(pad.dataset.voice, pad);
      }
      if (e.code === "Space") {
        e.preventDefault();
        state.isPlaying ? stop() : play();
      }
    });
  }

  // ---- Init --------------------------------------------------------------
  function init() {
    buildGenreOptions();
    const saved = load();
    state.genre = saved.genre && GENRES[saved.genre] ? saved.genre : "rock";
    el.genre.value = state.genre;
    buildSongIndex();
    buildSongOptions();
    el.level.max = maxLevel();
    const lvl = (saved.levelByGenre && saved.levelByGenre[state.genre]) || 1;
    renderPads();
    bindEvents();
    setLevel(lvl);
  }

  init();
})();
