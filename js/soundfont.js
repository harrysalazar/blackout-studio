/* ═══════════════════════════════════════════
   soundfont.js — Audio engine
   Blackout Studio · SIPO Guitar · Iteración 2
   Uses Tone.js + Soundfont-player samples
═══════════════════════════════════════════ */

const SF = {
  ctx: null,
  buffers: {},       // midi_note → AudioBuffer
  instrument: 'guitar',
  loading: false,
  loaded: false,
  masterGain: null,
  volume: 0.8,

  // SoundFont sample URLs — Gleitz soundfont CDN
  URLS: {
    guitar: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_guitar_clean-mp3.js',
    bass:   'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_bass_finger-mp3.js',
  },

  // MIDI note range to load (guitar: E2=40 to E6=88, bass: B0=23 to G4=55)
  RANGES: {
    guitar: { min: 40, max: 88 },
    bass:   { min: 23, max: 67 },
  },
};

export async function initAudio(instrument = 'guitar') {
  if (SF.loading) return;
  SF.loading = true;
  SF.instrument = instrument;
  SF.loaded = false;

  try {
    SF.ctx = new (window.AudioContext || window.webkitAudioContext)();
    SF.masterGain = SF.ctx.createGain();
    SF.masterGain.gain.value = SF.volume;
    SF.masterGain.connect(SF.ctx.destination);
    await loadSoundFont(instrument);
    SF.loaded = true;
    SF.loading = false;
    return true;
  } catch(e) {
    console.error('Audio init failed:', e);
    SF.loading = false;
    return false;
  }
}

async function loadSoundFont(instrument) {
  const url = SF.URLS[instrument];
  // Load the soundfont JS file (MIDI.js format — base64 encoded mp3s)
  return new Promise((resolve, reject) => {
    // Inject script tag to load soundfont
    const existing = document.getElementById('sf-script');
    if (existing) existing.remove();

    window.MIDI = window.MIDI || {};
    window.MIDI.Soundfont = window.MIDI.Soundfont || {};

    const script = document.createElement('script');
    script.id = 'sf-script';
    script.src = url;
    script.onload = async () => {
      try {
        // Parse loaded soundfont — it sets window.MIDI.Soundfont[instrumentName]
        const instKey = instrument === 'guitar' ? 'electric_guitar_clean' : 'electric_bass_finger';
        const sfData = window.MIDI && window.MIDI.Soundfont && window.MIDI.Soundfont[instKey];
        if (!sfData) { resolve(); return; }

        // Decode base64 audio for needed note range
        const range = SF.RANGES[instrument];
        const decodePromises = [];
        for (const [noteKey, b64] of Object.entries(sfData)) {
          const midi = noteKeyToMidi(noteKey);
          if (midi >= range.min && midi <= range.max) {
            decodePromises.push(decodeNote(midi, b64));
          }
        }
        await Promise.all(decodePromises);
        resolve();
      } catch(e) { reject(e); }
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function noteKeyToMidi(key) {
  // Key format: "A4", "Bb3", "C#5" etc.
  const NOTE_MAP = {C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
  const m = key.match(/^([A-G][b#]?)(\d)$/);
  if (!m) return -1;
  return (parseInt(m[2]) + 1) * 12 + (NOTE_MAP[m[1]] ?? -1);
}

async function decodeNote(midi, b64) {
  try {
    const binary = atob(b64.split(',')[1] || b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const buffer = await SF.ctx.decodeAudioData(bytes.buffer);
    SF.buffers[midi] = buffer;
  } catch(e) { /* skip failed notes */ }
}

/* ── Play a single note ─────────────────────────────────────────── */
export function playNote(midi, duration = 0.5, time = 0, velocity = 0.8) {
  if (!SF.loaded || !SF.ctx || !SF.buffers[midi]) return;

  const t = SF.ctx.currentTime + time;

  // Find nearest loaded buffer
  let buffer = SF.buffers[midi];
  if (!buffer) {
    // find closest
    let closest = null, minDist = 999;
    for (const [key, buf] of Object.entries(SF.buffers)) {
      const dist = Math.abs(parseInt(key) - midi);
      if (dist < minDist) { minDist = dist; closest = buf; }
    }
    buffer = closest;
  }
  if (!buffer) return;

  const source = SF.ctx.createBufferSource();
  source.buffer = buffer;

  // Pitch shift if needed
  const loadedMidi = Object.keys(SF.buffers).find(k => SF.buffers[k] === buffer);
  if (loadedMidi) source.playbackRate.value = Math.pow(2, (midi - parseInt(loadedMidi)) / 12);

  const gainNode = SF.ctx.createGain();
  gainNode.gain.setValueAtTime(velocity * SF.volume, t);
  gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration + 0.1);

  source.connect(gainNode);
  gainNode.connect(SF.masterGain);
  source.start(t);
  source.stop(t + duration + 0.15);
}

/* ── Resume context (needed after user gesture) ─────────────────── */
export function resumeAudio() {
  if (SF.ctx && SF.ctx.state === 'suspended') SF.ctx.resume();
}

/* ── Get AudioContext current time ──────────────────────────────── */
export function getAudioTime() {
  return SF.ctx ? SF.ctx.currentTime : 0;
}

/* ── Set volume ─────────────────────────────────────────────────── */
export function setVolume(v) {
  SF.volume = v;
  if (SF.masterGain) SF.masterGain.gain.value = v;
}

/* ── Is loaded ──────────────────────────────────────────────────── */
export function isLoaded() { return SF.loaded; }
export function isLoading() { return SF.loading; }

/* ── Switch instrument ──────────────────────────────────────────── */
export function switchInstrument(instrument) {
  SF.buffers = {};
  SF.loaded = false;
  SF.loading = false;
  return initAudio(instrument);
}
