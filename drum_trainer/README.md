# 🥁 Drum Trainer

An interactive, browser-based tool for learning to play the drums. Pick a
genre and a starting level, then play along with a backing groove while reading
the drum notes — your level rises automatically as you keep practicing.

> Note: this tool lives in its own folder and is independent of the traffic
> speed-harmonization code in the rest of this repository.

## Features

- **Choose your level.** Start wherever you like; each genre has 5 levels that
  build from a basic beat up to grooves with fills.
- **Levels go up as you practice.** Complete enough loops of the current pattern
  and the tool automatically advances you to the next, harder level (with a
  crash-cymbal celebration). Your level per genre is saved between sessions.
- **Pick a genre to play along with.** Rock, Pop, Funk, and Jazz (Swing). Each
  genre plays its own backing track (bass + chord stabs) so you groove along
  with "the song."
- **Play along with real songs.** Each genre includes famous tracks with their
  signature drum groove shown in notation and a bass/chord backing to play
  over. Choosing a song auto-sets its tempo:
  - **Rock** — *We Will Rock You* (Queen), *Back in Black* (AC/DC)
  - **Pop** — *Billie Jean* (Michael Jackson), *Rolling in the Deep* (Adele)
  - **Funk** — *Superstition* (Stevie Wonder), *Uptown Funk* (Mark Ronson ft. Bruno Mars)
  - **Jazz** — *So What* (Miles Davis), *Autumn Leaves* (standard)

  The backings are simplified, original arrangements (drum groove, bassline,
  and chords) for practice — not recordings of the songs.
- **Classic acoustic drum sounds.** The kit is synthesized to sound like a real
  acoustic drum set (kick with beater click, layered snare, cymbal washes),
  not a retro electronic kit.
- **"Test sound" + live meter** to confirm audio is working on your device.
- **See and learn the drum notes.** Every pattern is shown two ways:
  - a **live step-sequencer grid** with a moving playhead, and
  - standard **text drum tab** (`HH`, `SN`, `KK`, …) with a count ruler
    (`1 e & a 2 e & a …`).
- **Adjustable tempo**, optional **metronome**, optional **count-in**, and
  **practice pads** you can hit with the mouse or keyboard (`A S D F J K`).

All sounds — the drum kit *and* the backing track — are generated live with the
Web Audio API, so there are no audio files to download.

## How to use

1. Open `index.html` in a modern browser (Chrome, Edge, or Firefox).
2. Choose a **Genre** and a starting **Level**.
3. Press **▶ Play** (or the spacebar) and play along.
4. Read the grid and the drum tab to learn what to hit and when.
5. Keep practicing — after a few loops you'll level up automatically.

### Reading the notation

| Symbol | Meaning              |
|--------|----------------------|
| `x`    | Hit                  |
| `o`    | Open hi-hat / accent |
| `g`    | Ghost note (soft)    |
| `-`    | Rest                 |

The tab labels: `CC` crash, `RD` ride, `OH` open hi-hat, `HH` hi-hat,
`T1/T2/T3` toms, `SN` snare, `KK` kick.

## Files

| File          | Purpose                                                |
|---------------|--------------------------------------------------------|
| `index.html`  | Page structure                                         |
| `styles.css`  | Styling / dark theme                                   |
| `audio.js`    | Web Audio drum-kit and backing-track synthesis         |
| `patterns.js` | Genre + level groove definitions and backing tracks    |
| `app.js`      | UI, scheduler, playhead, and level-progression logic   |

No build step or dependencies — just open the HTML file.
