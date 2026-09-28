/* ═══════════════════════════════════════════
   player.js — Playback engine
   Blackout Studio · SIPO Guitar · Iteración 2

   Controls exercise playback:
   - BPM-accurate scheduling
   - Beat-synchronized notation highlight
   - Metronome click track
   - Loop mode
   - Per-note technique playback
═══════════════════════════════════════════ */

import { playNote, resumeAudio, getAudioTime, isLoaded } from './soundfont.js';
import { DUR_BEATS } from './notation.js';

/* ── Player state ───────────────────────── */
const P = {
  playing:     false,
  bpm:         80,
  notes:       [],
  startTime:   0,       // audio context time when playback started
  beatOffset:  0,       // which beat we started from
  currentBeat: -1,
  loop:        true,
  totalBeats:  0,
  onBeatChange: null,   // callback(beat) for notation highlight
  onEnd:        null,   // callback() when playback ends
  tickInterval: null,   // requestAnimationFrame id
  metronome:   true,
  stringMidis: [],
  scheduledUntil: 0,    // how far ahead we've scheduled audio
};

/* ── BPM to seconds per beat ─────────────── */
function secPerBeat() { return 60 / P.bpm; }

/* ── Start playback ──────────────────────── */
export function playerPlay(notes, stringMidis, bpm = 80, fromBeat = 0) {
  if (!isLoaded()) return false;
  resumeAudio();

  P.notes       = notes;
  P.stringMidis = stringMidis;
  P.bpm         = bpm;
  P.beatOffset  = fromBeat;
  P.startTime   = getAudioTime();
  P.playing     = true;
  P.scheduledUntil = P.startTime;
  P.totalBeats  = Math.max(...notes.map(n => n.beat + DUR_BEATS[n.dur||'s']));
  P.currentBeat = fromBeat;

  scheduleAudio();
  tick();
  return true;
}

/* ── Stop ────────────────────────────────── */
export function playerStop() {
  P.playing     = false;
  P.currentBeat = -1;
  if (P.tickInterval) cancelAnimationFrame(P.tickInterval);
  if (P.onBeatChange) P.onBeatChange(-1);
}

/* ── Pause / resume ──────────────────────── */
export function playerPause() {
  if (P.playing) {
    P.beatOffset = P.currentBeat;
    playerStop();
  }
}

/* ── Set BPM ─────────────────────────────── */
export function playerSetBpm(bpm) {
  const wasPlaying = P.playing;
  if (wasPlaying) playerPause();
  P.bpm = Math.max(20, Math.min(300, bpm));
  if (wasPlaying) playerPlay(P.notes, P.stringMidis, P.bpm, P.beatOffset);
}

/* ── Toggle loop ─────────────────────────── */
export function playerSetLoop(loop) { P.loop = loop; }

/* ── Toggle metronome ────────────────────── */
export function playerSetMetronome(on) { P.metronome = on; }

/* ── Set callbacks ───────────────────────── */
export function playerOnBeatChange(fn) { P.onBeatChange = fn; }
export function playerOnEnd(fn)        { P.onEnd = fn; }

/* ── Current beat ────────────────────────── */
export function playerCurrentBeat()    { return P.currentBeat; }
export function playerIsPlaying()      { return P.playing; }
export function playerBpm()            { return P.bpm; }

/* ── Audio scheduler (look-ahead) ───────── */
// Schedules audio 0.2 seconds ahead to prevent gaps
const LOOKAHEAD = 0.2; // seconds

function scheduleAudio() {
  if (!P.playing) return;

  const now       = getAudioTime();
  const scheduleUntil = now + LOOKAHEAD;

  while (P.scheduledUntil < scheduleUntil) {
    const beat    = P.beatOffset + (P.scheduledUntil - P.startTime) / secPerBeat();
    const loopedBeat = P.loop ? beat % P.totalBeats : beat;

    if (!P.loop && loopedBeat >= P.totalBeats) {
      P.playing = false;
      if (P.onEnd) P.onEnd();
      return;
    }

    // Find notes at this beat
    const notesAtBeat = P.notes.filter(n => {
      const nb = P.loop ? n.beat % P.totalBeats : n.beat;
      return Math.abs(nb - loopedBeat) < 0.01;
    });

    notesAtBeat.forEach(n => {
      const audioTime = P.scheduledUntil;
      const durSec    = DUR_BEATS[n.dur||'s'] * secPerBeat();

      // Technique-specific velocity and duration
      const { velocity, duration } = getTechParams(n.technique, durSec);

      playNote(n.midi, duration, audioTime - getAudioTime(), velocity);
    });

    // Metronome click on beat integers
    if (P.metronome && Math.abs(loopedBeat - Math.round(loopedBeat)) < 0.01) {
      const isDownBeat = Math.round(loopedBeat) % 4 === 0;
      // High pitched click for downbeat, lower for other beats
      playNote(isDownBeat ? 76 : 72, 0.05, P.scheduledUntil - getAudioTime(), 0.3);
    }

    P.scheduledUntil += secPerBeat() * 0.125; // advance by 1/32 note
  }

  setTimeout(scheduleAudio, 50); // reschedule
}

/* ── Technique playback params ───────────── */
function getTechParams(technique, baseDur) {
  switch(technique) {
    case 'h':       return { velocity: 0.5, duration: baseDur * 0.9 };
    case 'p':       return { velocity: 0.4, duration: baseDur * 0.8 };
    case 'b':       return { velocity: 0.8, duration: baseDur * 1.2 };
    case '~':       return { velocity: 0.7, duration: baseDur * 1.1 };
    case 'sweep_d':
    case 'sweep_u': return { velocity: 0.75, duration: baseDur * 0.85 };
    case 'tap':     return { velocity: 0.6, duration: baseDur * 0.9 };
    case 'slap':    return { velocity: 0.9, duration: baseDur * 0.6 };
    case 'pop':     return { velocity: 0.85, duration: baseDur * 0.7 };
    case 'pm':      return { velocity: 0.6, duration: baseDur * 0.4 };
    default:        return { velocity: 0.75, duration: baseDur * 0.95 };
  }
}

/* ── Animation tick (UI sync) ────────────── */
function tick() {
  if (!P.playing) return;

  const now  = getAudioTime();
  const elapsed = now - P.startTime;
  const beat = P.beatOffset + elapsed / secPerBeat();
  const loopedBeat = P.loop ? beat % P.totalBeats : beat;

  if (!P.loop && loopedBeat >= P.totalBeats) {
    playerStop();
    if (P.onEnd) P.onEnd();
    return;
  }

  if (Math.abs(loopedBeat - P.currentBeat) > 0.05) {
    P.currentBeat = loopedBeat;
    if (P.onBeatChange) P.onBeatChange(loopedBeat);
  }

  P.tickInterval = requestAnimationFrame(tick);
}
