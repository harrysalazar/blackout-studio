/* ═══════════════════════════════════════════
   exercises.js — Exercise generator
   Blackout Studio · SIPO Guitar · Iteración 2

   Generates complex, non-linear exercises for
   all 8 practice blocks. Each exercise returns
   an array of Note objects ready for notation
   and audio playback.

   Note = { midi, fret, string, dur, technique,
            beat, measure, finger }
   dur: 'w'=whole 'h'=half 'q'=quarter
        'e'=eighth 's'=sixteenth 't'=triplet
   technique: null | 'h' | 'p' | 'b' | '~' |
              'sweep_d' | 'sweep_u' | 'tap' |
              'slap' | 'pop' | 'pm'
═══════════════════════════════════════════ */

import { getScaleSemitones, SCALES } from './scales.js';

/* ── Standard tuning MIDI bases (low→high) ── */
const STD_GUITAR_6 = [40,45,50,55,59,64];
const STD_GUITAR_7 = [35,40,45,50,55,59,64];
const STD_BASS_4   = [28,33,38,43];
const STD_BASS_5   = [23,28,33,38,43];
const STD_BASS_6   = [23,28,33,38,43,47];

/* ── Get string MIDI bases from tuning state ─ */
function getStringBases(stringMidis) { return stringMidis; }

/* ── Find fret for a target MIDI on a string ─ */
function fretFor(baseMidi, targetMidi) {
  const f = targetMidi - baseMidi;
  return (f >= 0 && f <= 24) ? f : null;
}

/* ── Get scale notes as MIDI values ────────── */
function buildScaleMidis(rootMidi, semis, stringMidis, minFret=0, maxFret=22) {
  const notes = [];
  stringMidis.forEach((base, si) => {
    for (let f = minFret; f <= maxFret; f++) {
      const midi = base + f;
      const rel  = (midi - rootMidi + 120) % 12;
      if (semis.includes(rel)) {
        notes.push({ midi, fret: f, string: si, rel,
          degIdx: semis.indexOf(rel) });
      }
    }
  });
  return notes;
}

/* ── Get chord tones (tétrada) for a degree ─ */
function getChordTones(rootMidi, scaleSemis, degIdx, stringMidis) {
  // Chord = root + 3rd + 5th + 7th (diatonic)
  const intervals = [0, 2, 4, 6].map(step =>
    scaleSemis[(degIdx + step) % scaleSemis.length]
  );
  return buildScaleMidis(rootMidi, intervals, stringMidis);
}

/* ═══════════════════════════════════════════
   BLOCK 1 — Diatonic Thirds (Harmonic Warmup)
   All strings, ascending + descending + skip
═══════════════════════════════════════════ */
export function generateThirds(rootMidi, scaleKey, stringMidis) {
  const semis = getScaleSemitones(scaleKey);
  const allNotes = buildScaleMidis(rootMidi, semis, stringMidis, 0, 15);

  // Sort by midi ascending
  allNotes.sort((a,b) => a.midi - b.midi);

  const notes = [];
  let beat = 0;

  // Phase 1: Simple thirds ascending (note + note 2 degrees up, simultaneous)
  // We do melodic thirds (play one then the other)
  for (let i = 0; i < allNotes.length - 2; i++) {
    const n1 = allNotes[i];
    const n2 = allNotes[i + 2]; // 2 scale steps = a third
    notes.push({ ...n1, dur:'e', beat: beat, measure: Math.floor(beat/4),
      technique: null, finger: getFingerForDeg(n1.degIdx) });
    beat += 0.5;
    notes.push({ ...n2, dur:'e', beat: beat, measure: Math.floor(beat/4),
      technique: null, finger: getFingerForDeg(n2.degIdx) });
    beat += 0.5;
  }

  // Phase 2: Descending thirds
  for (let i = allNotes.length - 1; i >= 2; i--) {
    const n1 = allNotes[i];
    const n2 = allNotes[i - 2];
    notes.push({ ...n1, dur:'e', beat, measure: Math.floor(beat/4), technique: null });
    beat += 0.5;
    notes.push({ ...n2, dur:'e', beat, measure: Math.floor(beat/4), technique: null });
    beat += 0.5;
  }

  // Phase 3: Skip pattern (1-3-2-4-3-5...) — non-linear
  for (let i = 0; i < allNotes.length - 3; i += 2) {
    [allNotes[i], allNotes[i+2], allNotes[i+1], allNotes[i+3]].forEach(n => {
      if (!n) return;
      notes.push({ ...n, dur:'s', beat, measure: Math.floor(beat/4), technique: null });
      beat += 0.25;
    });
  }

  return notes;
}

/* ═══════════════════════════════════════════
   BLOCK 2 — 3NPS Full Position + Cross-string
═══════════════════════════════════════════ */
export function generate3NPS(rootMidi, scaleKey, stringMidis, posIdx = 0) {
  const semis = getScaleSemitones(scaleKey);
  const lowBase = stringMidis[0] % 12;
  const rootClass = rootMidi % 12;

  // Find position anchor on low string
  const degTarget = (rootClass + semis[posIdx]) % 12;
  let anchor = 0;
  for (let f = 0; f <= 22; f++) {
    if ((lowBase + f) % 12 === degTarget) { anchor = f; break; }
  }

  // Build 3 notes per string
  const posNotes = [];
  stringMidis.forEach((base, si) => {
    let found = 0;
    for (let f = Math.max(0, anchor-1); f <= Math.min(22, anchor+6) && found < 3; f++) {
      const midi = base + f;
      const rel  = (midi - rootMidi + 120) % 12;
      if (semis.includes(rel)) {
        posNotes.push({ midi, fret: f, string: si, rel,
          degIdx: semis.indexOf(rel) });
        found++;
      }
    }
  });

  const notes = [];
  let beat = 0;

  // Phase 1: Ascending ↓↑↓ ↑↓↑ per string
  const asc = [...posNotes].sort((a,b) => a.string - b.string || a.fret - b.fret);
  asc.forEach((n, i) => {
    notes.push({ ...n, dur:'s', beat, measure: Math.floor(beat/4),
      technique: null, pick: i%2===0 ? 'down':'up',
      finger: getFingerForDeg(n.degIdx) });
    beat += 0.25;
  });

  // Phase 2: Descending
  const desc = [...asc].reverse();
  desc.forEach((n,i) => {
    notes.push({ ...n, dur:'s', beat, measure: Math.floor(beat/4),
      technique: null, pick: i%2===0 ? 'up':'down' });
    beat += 0.25;
  });

  // Phase 3: Up 2 strings, back 1 string (non-linear)
  const strings = [...new Set(asc.map(n=>n.string))];
  for (let si = 0; si < strings.length - 1; si++) {
    const strNotes = asc.filter(n=>n.string===si);
    const nextStrNotes = asc.filter(n=>n.string===si+1);
    strNotes.forEach(n => {
      notes.push({ ...n, dur:'s', beat, measure: Math.floor(beat/4), technique: null });
      beat += 0.25;
    });
    nextStrNotes.forEach(n => {
      notes.push({ ...n, dur:'s', beat, measure: Math.floor(beat/4), technique: null });
      beat += 0.25;
    });
    if (si > 0) {
      const prevStr = asc.filter(n=>n.string===si-1);
      prevStr.slice(-1).forEach(n => {
        notes.push({ ...n, dur:'s', beat, measure: Math.floor(beat/4), technique: null });
        beat += 0.25;
      });
    }
  }

  return notes;
}

/* ═══════════════════════════════════════════
   BLOCK 3 — Sequence of 3 (cross-string)
═══════════════════════════════════════════ */
export function generateSeq3(rootMidi, scaleKey, stringMidis) {
  const semis  = getScaleSemitones(scaleKey);
  const allN   = buildScaleMidis(rootMidi, semis, stringMidis, 0, 14);
  allN.sort((a,b) => a.midi - b.midi);

  const notes = [];
  let beat = 0;

  // Pattern: 1-2-3, 2-3-4, 3-4-5...
  for (let i = 0; i < allN.length - 2; i++) {
    [allN[i], allN[i+1], allN[i+2]].forEach((n,j) => {
      notes.push({ ...n, dur:'t', beat, measure: Math.floor(beat/4),
        technique: j===2&&i%3===0 ? 'h' : null,
        finger: getFingerForDeg(n.degIdx) });
      beat += 1/3;
    });
  }

  // Descending: 3-2-1, 4-3-2...
  const rev = [...allN].reverse();
  for (let i = 0; i < rev.length - 2; i++) {
    [rev[i], rev[i+1], rev[i+2]].forEach((n,j) => {
      notes.push({ ...n, dur:'t', beat, measure: Math.floor(beat/4),
        technique: j===2&&i%3===0 ? 'p' : null });
      beat += 1/3;
    });
  }

  return notes;
}

/* ═══════════════════════════════════════════
   BLOCK 4 — Sequence of 4 (16th notes)
   Covers full neck 0-12
═══════════════════════════════════════════ */
export function generateSeq4(rootMidi, scaleKey, stringMidis) {
  const semis = getScaleSemitones(scaleKey);
  const allN  = buildScaleMidis(rootMidi, semis, stringMidis, 0, 14);
  allN.sort((a,b) => a.midi - b.midi);

  const notes = [];
  let beat = 0;

  // Ascending groups of 4
  for (let i = 0; i < allN.length - 3; i++) {
    [allN[i],allN[i+1],allN[i+2],allN[i+3]].forEach((n,j) => {
      notes.push({ ...n, dur:'s', beat, measure: Math.floor(beat/4),
        technique: null, pick: j%2===0 ? 'down':'up',
        finger: getFingerForDeg(n.degIdx) });
      beat += 0.25;
    });
  }

  // Descending groups of 4
  const rev = [...allN].reverse();
  for (let i = 0; i < rev.length - 3; i++) {
    [rev[i],rev[i+1],rev[i+2],rev[i+3]].forEach((n,j) => {
      notes.push({ ...n, dur:'s', beat, measure: Math.floor(beat/4),
        technique: null, pick: j%2===0 ? 'up':'down' });
      beat += 0.25;
    });
  }

  // Non-linear: up 4, back 2, up 4, back 2...
  for (let i = 0; i < allN.length - 5; i += 2) {
    [allN[i],allN[i+1],allN[i+2],allN[i+3],allN[i+2],allN[i+1]].forEach((n,j) => {
      if (!n) return;
      notes.push({ ...n, dur:'s', beat, measure: Math.floor(beat/4), technique: null });
      beat += 0.25;
    });
  }

  return notes;
}

/* ═══════════════════════════════════════════
   BLOCK 5 — Sequence of 6 (Shred + Legato)
═══════════════════════════════════════════ */
export function generateSeq6(rootMidi, scaleKey, stringMidis) {
  const semis = getScaleSemitones(scaleKey);
  const allN  = buildScaleMidis(rootMidi, semis, stringMidis, 0, 14);
  allN.sort((a,b) => a.midi - b.midi);

  const notes = [];
  let beat = 0;

  // Pattern: 1-2-3-2-1-2, 2-3-4-3-2-3...
  for (let i = 0; i < allN.length - 2; i++) {
    const grp = [allN[i],allN[i+1],allN[i+2],allN[i+1],allN[i],allN[i+1]];
    grp.forEach((n,j) => {
      const tech = j===1?'h':j===3?'p':j===4?'p':null;
      notes.push({ ...n, dur:'s', beat, measure: Math.floor(beat/4),
        technique: tech, pick: j===0?'down':null,
        finger: getFingerForDeg(n.degIdx) });
      beat += 0.25;
    });
  }

  // Legato variant — only pick first note of each 6
  for (let i = 0; i < Math.min(allN.length - 5, 24); i++) {
    const grp = [allN[i],allN[i+1],allN[i+2],allN[i+3],allN[i+2],allN[i+1]];
    grp.forEach((n,j) => {
      notes.push({ ...n, dur:'s', beat, measure: Math.floor(beat/4),
        technique: j===0?null:j<3?'h':'p',
        pick: j===0?'down':null });
      beat += 0.25;
    });
  }

  return notes;
}

/* ═══════════════════════════════════════════
   BLOCK 6 — Sweep Picking (2,3,4,5,6 strings)
   Neoclassical style
═══════════════════════════════════════════ */
export function generateSweep(rootMidi, scaleKey, stringMidis, stringCount) {
  const semis  = getScaleSemitones(scaleKey);
  const s      = SCALES[scaleKey];
  const notes  = [];
  let beat     = 0;

  // Generate sweep arpeggio for each diatonic degree
  s.degs.forEach((deg, degIdx) => {
    // Chord tones for this degree: root + 3rd + 5th (triad) + 7th (tetrad)
    const chordSemis = [0,2,4,6].map(step =>
      semis[(degIdx + step) % semis.length]
    );

    // Find chord voicing on consecutive strings
    const voicing = buildSweepVoicing(
      rootMidi, chordSemis, semis, degIdx,
      stringMidis, stringCount
    );

    if (voicing.length === 0) return;

    // ── Ascending sweep ↓↓↓...
    voicing.forEach((n, i) => {
      const isLast  = i === voicing.length - 1;
      const tech    = isLast ? 'h' : 'sweep_d'; // hammer on top
      notes.push({ ...n, dur:'s', beat, measure: Math.floor(beat/4),
        technique: tech, pick: i===0?'down':null,
        finger: getFingerForDeg(n.degIdx) });
      beat += 0.25;
    });

    // ── Descending sweep ↑↑↑...
    [...voicing].reverse().forEach((n, i) => {
      const isFirst = i === 0;
      const tech    = isFirst ? 'p' : 'sweep_u';
      notes.push({ ...n, dur:'s', beat, measure: Math.floor(beat/4),
        technique: tech, pick: i===0?'up':null });
      beat += 0.25;
    });
  });

  // ── 2-string dyads (neoclassical triads) ──
  // Sweep up 2 strings then immediately link to next chord
  s.degs.forEach((deg, degIdx) => {
    const chordSemis = [0,2,4].map(step => semis[(degIdx+step)%semis.length]);
    // Use strings 1-2 (high strings for neoclassical flavor)
    const highStr = stringMidis.slice(-3);
    const dyad    = buildSweepVoicing(rootMidi, chordSemis, semis, degIdx, highStr, 2);
    if (dyad.length < 2) return;

    // Ascending
    dyad.forEach((n,i) => {
      notes.push({ ...n, string: stringMidis.length-3+n.string,
        dur:'s', beat, measure: Math.floor(beat/4),
        technique: i===dyad.length-1?'h':'sweep_d',
        pick: i===0?'down':null });
      beat += 0.25;
    });
    // Descending
    [...dyad].reverse().forEach((n,i) => {
      notes.push({ ...n, string: stringMidis.length-3+n.string,
        dur:'s', beat, measure: Math.floor(beat/4),
        technique: i===0?'p':'sweep_u', pick: i===0?'up':null });
      beat += 0.25;
    });
  });

  return notes;
}

function buildSweepVoicing(rootMidi, chordSemis, scaleSemis, degIdx, stringMidis, maxStrings) {
  const voicing = [];
  const count   = Math.min(maxStrings, stringMidis.length);

  // Try to find one chord tone per string, ascending
  for (let si = 0; si < count; si++) {
    const base    = stringMidis[si];
    let bestNote  = null;
    let bestFret  = 999;

    // Find lowest fret on this string that matches a chord tone
    for (let f = 0; f <= 17; f++) {
      const midi = base + f;
      const rel  = (midi - rootMidi + 120) % 12;
      if (chordSemis.includes(rel)) {
        // Prefer frets near previous note's fret
        const prevFret = voicing.length > 0 ? voicing[voicing.length-1].fret : 0;
        if (f >= prevFret - 2 && f < bestFret) {
          bestFret = f;
          bestNote = { midi, fret: f, string: si, rel,
            degIdx: scaleSemis.indexOf(rel) };
        }
      }
    }
    if (bestNote) voicing.push(bestNote);
  }
  return voicing;
}

/* ═══════════════════════════════════════════
   BLOCK 7 — Tapping (2 left + 1 tap right)
   Diatonic intervals: 10ths, 12ths
═══════════════════════════════════════════ */
export function generateTapping(rootMidi, scaleKey, stringMidis) {
  const semis = getScaleSemitones(scaleKey);
  const s     = SCALES[scaleKey];
  const notes = [];
  let beat    = 0;

  // For each string, create tap pattern:
  // Left: fret X (finger 1), fret X+2 (finger 3/4), Tap: fret X+7 or X+12
  stringMidis.forEach((base, si) => {
    if (si > stringMidis.length - 2) return; // skip highest string

    // Find 3 positions: low, mid, high (tap)
    const scaleFretsOnStr = [];
    for (let f = 0; f <= 22; f++) {
      const rel = ((base+f) - rootMidi + 120) % 12;
      if (semis.includes(rel)) scaleFretsOnStr.push({f, rel, degIdx:semis.indexOf(rel)});
    }

    // Take groups of 3: [0]=finger1, [2]=finger4, [7-9 frets up]=tap
    for (let i = 0; i < scaleFretsOnStr.length - 8; i += 3) {
      const n1   = scaleFretsOnStr[i];
      const n2   = scaleFretsOnStr[i+2];
      const tapN = scaleFretsOnStr[i+7] || scaleFretsOnStr[i+6];
      if (!tapN) continue;

      // Pattern: n1 (pick) → n2 (hammer) → tap → n2 (pull) → n1 (pull)
      [
        { ...n1,   technique: null,   pick:'down', dur:'s' },
        { ...n2,   technique: 'h',    pick: null,  dur:'s' },
        { ...tapN, technique: 'tap',  pick: null,  dur:'s' },
        { ...n2,   technique: 'p',    pick: null,  dur:'s' },
        { ...n1,   technique: 'p',    pick: null,  dur:'s' },
      ].forEach(n => {
        notes.push({ ...n, midi: base+n.f, string: si,
          beat, measure: Math.floor(beat/4),
          finger: n.technique==='tap'?'T':getFingerForDeg(n.degIdx) });
        beat += 0.25;
      });
    }
  });

  return notes;
}

/* ═══════════════════════════════════════════
   BLOCK 8 — Targeting (chord tones on beats)
═══════════════════════════════════════════ */
export function generateTargeting(rootMidi, scaleKey, stringMidis) {
  const semis = getScaleSemitones(scaleKey);
  const s     = SCALES[scaleKey];
  const notes = [];
  let beat    = 0;

  // Progression: i – bVII – bVI – bVII (rock/metal)
  // Use degrees 0, 6, 5, 6 of scale
  const progDegs = [0, Math.min(6, s.degs.length-1),
                    Math.min(5, s.degs.length-1),
                    Math.min(6, s.degs.length-1)];

  progDegs.forEach(degIdx => {
    // Chord tones for this degree
    const chordSemis = [0,2,4].map(step =>
      semis[(degIdx + step) % semis.length]
    );

    // Beat 1: MUST land on root of chord (targeting)
    const rootSemi   = semis[degIdx];
    const rootNotes  = buildScaleMidis(rootMidi, [rootSemi], stringMidis, 4, 14);
    const targetNote = rootNotes[Math.floor(rootNotes.length/2)]; // midrange

    // Approach: scale run leading to chord tone
    const allScale = buildScaleMidis(rootMidi, semis, stringMidis, 4, 14);
    allScale.sort((a,b) => a.midi - b.midi);

    // Find notes below target
    const approach = allScale.filter(n =>
      n.midi < (targetNote?.midi||60) &&
      n.midi >= (targetNote?.midi||60) - 7
    ).slice(-3);

    // Play approach notes then target
    approach.forEach(n => {
      notes.push({ ...n, dur:'s', beat, measure: Math.floor(beat/4),
        technique: null, isApproach: true });
      beat += 0.25;
    });

    if (targetNote) {
      notes.push({ ...targetNote, dur:'q', beat, measure: Math.floor(beat/4),
        technique: '~', isTarget: true,
        finger: getFingerForDeg(targetNote.degIdx) });
      beat += 1;
    }

    // Beat 3: land on 5th of chord
    const fifthSemi  = semis[(degIdx + 4) % semis.length];
    const fifthNotes = buildScaleMidis(rootMidi, [fifthSemi], stringMidis, 4, 14);
    const fifth      = fifthNotes[Math.floor(fifthNotes.length/2)];

    // Fill beats 2-3 with scale passing tones
    const fill = allScale.filter(n =>
      n.midi > (targetNote?.midi||60) &&
      n.midi < (fifth?.midi||65)
    ).slice(0, 3);

    fill.forEach(n => {
      notes.push({ ...n, dur:'s', beat, measure: Math.floor(beat/4),
        technique: null });
      beat += 0.25;
    });

    if (fifth) {
      notes.push({ ...fifth, dur:'e', beat, measure: Math.floor(beat/4),
        technique: '~', isTarget: true });
      beat += 0.5;
    }

    // Fill to end of measure
    while (beat % 4 !== 0) {
      const pad = allScale[Math.floor(beat) % allScale.length];
      if (pad) notes.push({ ...pad, dur:'s', beat, measure: Math.floor(beat/4),
        technique: null });
      beat += 0.25;
    }
  });

  return notes;
}

/* ═══════════════════════════════════════════
   BASS EXERCISES
═══════════════════════════════════════════ */
export function generateBassWalking(rootMidi, scaleKey, stringMidis) {
  const semis = getScaleSemitones(scaleKey);
  const s     = SCALES[scaleKey];
  const notes = [];
  let beat    = 0;

  // Walking bass: root on beat 1, 3rd on beat 2, 5th on beat 3,
  // chromatic approach on beat 4 leading to next root
  const progDegs = [0, 3, 4, 0]; // I IV V I

  progDegs.forEach((degIdx, ci) => {
    const chordTones = [0,2,4].map(step =>
      semis[(degIdx + step) % semis.length]
    );

    const nextDeg = progDegs[(ci+1) % progDegs.length];
    const nextRoot = semis[nextDeg];

    // Beat 1: root (on low string)
    const rootSemi = semis[degIdx];
    const rootNote = buildScaleMidis(rootMidi, [rootSemi], stringMidis, 0, 12)
      .filter(n => n.string === 0)[0];

    // Beat 2: 3rd
    const thirdNote = buildScaleMidis(rootMidi, [chordTones[1]], stringMidis, 0, 12)
      .filter(n => n.string <= 1)[0];

    // Beat 3: 5th
    const fifthNote = buildScaleMidis(rootMidi, [chordTones[2]], stringMidis, 0, 12)
      .filter(n => n.string <= 1)[0];

    // Beat 4: chromatic approach to next root (semitone below)
    const nextRootMidi = rootMidi + nextRoot;
    const approachMidi = nextRootMidi - 1;
    const approachFret = approachMidi - stringMidis[0];

    [rootNote, thirdNote, fifthNote].forEach((n,i) => {
      if (!n) { beat++; return; }
      notes.push({ ...n, dur:'q', beat, measure: Math.floor(beat/4),
        technique: i===1?'p':null, pick: 'finger' });
      beat++;
    });

    // Chromatic approach
    if (approachFret >= 0 && approachFret <= 22) {
      notes.push({ midi: approachMidi, fret: approachFret, string: 0,
        dur:'q', beat, measure: Math.floor(beat/4),
        technique: 'h', pick: 'finger', rel: -1, degIdx: -1 });
    }
    beat++;
  });

  return notes;
}

export function generateSlapPop(rootMidi, scaleKey, stringMidis) {
  const semis = getScaleSemitones(scaleKey);
  const notes = [];
  let beat    = 0;

  // Classic slap pattern: S(root) S(oct) P(5th) S(root) ghost ghost...
  const rootNote = buildScaleMidis(rootMidi, [0], stringMidis, 0, 12)
    .filter(n=>n.string===0)[0];
  const octNote  = rootNote ? {...rootNote, midi:rootNote.midi+12,
    fret:rootNote.fret+12, string:1} : null;
  const fifthNote = buildScaleMidis(rootMidi, [semis[4]||7], stringMidis, 0,12)
    .filter(n=>n.string<=1)[0];

  for (let measure = 0; measure < 4; measure++) {
    // Slap root
    if (rootNote) {
      notes.push({ ...rootNote, dur:'e', beat, measure, technique:'slap', pick:'slap' });
    }
    beat += 0.5;

    // Slap octave
    if (octNote) {
      notes.push({ ...octNote, dur:'e', beat, measure, technique:'slap', pick:'slap' });
    }
    beat += 0.5;

    // Pop 5th
    if (fifthNote) {
      notes.push({ ...fifthNote, dur:'e', beat, measure, technique:'pop', pick:'pop' });
    }
    beat += 0.5;

    // Ghost note (muted)
    if (rootNote) {
      notes.push({ ...rootNote, dur:'s', beat, measure, technique:'pm',
        pick:'slap', isMuted:true });
    }
    beat += 0.5;
  }

  return notes;
}

/* ── Helper: finger assignment by degree ─── */
function getFingerForDeg(degIdx) {
  const map = [1,2,3,4,1,2,3,4];
  return map[degIdx % 4] || 1;
}

/* ── Master exercise builder ─────────────── */
export function buildExercise(type, rootMidi, scaleKey, stringMidis, instrument, stringCount) {
  switch(type) {
    case 'thirds':    return generateThirds(rootMidi, scaleKey, stringMidis);
    case '3nps':      return generate3NPS(rootMidi, scaleKey, stringMidis);
    case 'seq3':      return generateSeq3(rootMidi, scaleKey, stringMidis);
    case 'seq4':      return generateSeq4(rootMidi, scaleKey, stringMidis);
    case 'seq6':      return generateSeq6(rootMidi, scaleKey, stringMidis);
    case 'sweep':     return generateSweep(rootMidi, scaleKey, stringMidis, stringCount);
    case 'tapping':   return generateTapping(rootMidi, scaleKey, stringMidis);
    case 'targeting': return generateTargeting(rootMidi, scaleKey, stringMidis);
    case 'walking':   return generateBassWalking(rootMidi, scaleKey, stringMidis);
    case 'slap':      return generateSlapPop(rootMidi, scaleKey, stringMidis);
    default:          return [];
  }
}
