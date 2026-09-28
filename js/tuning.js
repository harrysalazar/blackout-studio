/* ═══════════════════════════════════════════
   tuning.js — Instrument & tuning config
   Blackout Studio · SIPO Guitar
═══════════════════════════════════════════ */

// MIDI note numbers (C4 = 60)
// E2=40, A2=45, D3=50, G3=55, B3=59, E4=64

export const INSTRUMENTS = {
  guitar: {
    label: 'Guitarra',
    icon:  '🎸',
    stringOptions: [6, 7],
    defaultStrings: 6,
    defaultTuning: 'standard',
    tunings: {
      standard:   { label: 'Standard',          strings6: [40,45,50,55,59,64],  strings7: [35,40,45,50,55,59,64] },
      drop_d:     { label: 'Drop D',             strings6: [38,45,50,55,59,64],  strings7: [35,38,45,50,55,59,64] },
      half_down:  { label: 'Half Step Down',     strings6: [39,44,49,54,58,63],  strings7: [34,39,44,49,54,58,63] },
      full_down:  { label: 'Full Step Down',     strings6: [38,43,48,53,57,62],  strings7: [33,38,43,48,53,57,62] },
      drop_c:     { label: 'Drop C',             strings6: [36,43,48,53,57,62],  strings7: [31,36,43,48,53,57,62] },
      open_g:     { label: 'Open G',             strings6: [38,45,50,55,59,62],  strings7: null },
      open_e:     { label: 'Open E',             strings6: [40,47,52,56,59,64],  strings7: null },
      dadgad:     { label: 'DADGAD',             strings6: [38,45,50,55,57,62],  strings7: null },
      custom:     { label: 'Personalizada',      strings6: null, strings7: null }
    }
  },
  bass: {
    label: 'Bajo',
    icon:  '🎸',
    stringOptions: [4, 5, 6],
    defaultStrings: 4,
    defaultTuning: 'standard',
    tunings: {
      standard:   { label: 'Standard',          strings4: [28,33,38,43],        strings5: [23,28,33,38,43],        strings6: [23,28,33,38,43,47] },
      drop_d:     { label: 'Drop D',             strings4: [26,33,38,43],        strings5: [23,26,33,38,43],        strings6: [23,26,33,38,43,47] },
      half_down:  { label: 'Half Step Down',     strings4: [27,32,37,42],        strings5: [22,27,32,37,42],        strings6: [22,27,32,37,42,46] },
      full_down:  { label: 'Full Step Down',     strings4: [26,31,36,41],        strings5: [21,26,31,36,41],        strings6: [21,26,31,36,41,45] },
      drop_c:     { label: 'Drop C (4c)',        strings4: [24,31,36,41],        strings5: null,                    strings6: null },
      custom:     { label: 'Personalizada',      strings4: null, strings5: null, strings6: null }
    }
  }
};

// All chromatic notes for custom tuning selector
export const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const OCTAVES   = [0,1,2,3,4,5,6];

// Convert MIDI number to note + octave
export function midiToNote(midi) {
  const note   = CHROMATIC[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { note, octave, label: `${note}${octave}` };
}

// Convert note + octave to MIDI
export function noteToMidi(note, octave) {
  return (octave + 1) * 12 + CHROMATIC.indexOf(note);
}

// Get string MIDI values for current config
export function getStringMidis(instrument, stringCount, tuningKey, customMidis) {
  if (tuningKey === 'custom') return customMidis || getDefaultCustom(instrument, stringCount);
  const t = INSTRUMENTS[instrument].tunings[tuningKey];
  if (!t) return getDefaultCustom(instrument, stringCount);
  const key = `strings${stringCount}`;
  return t[key] || getDefaultCustom(instrument, stringCount);
}

// Default custom tuning (same as standard)
export function getDefaultCustom(instrument, stringCount) {
  const std = INSTRUMENTS[instrument].tunings['standard'];
  const key = `strings${stringCount}`;
  return (std[key] || []).slice();
}

// String names for display (low to high)
export function getStringNames(midis) {
  return midis.map(m => midiToNote(m).note);
}
