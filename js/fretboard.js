/* ═══════════════════════════════════════════
   fretboard.js — SVG fretboard engine
   Blackout Studio · SIPO Guitar
═══════════════════════════════════════════ */

import { getScaleSemitones, DEG_COLORS } from './scales.js';
import { getStringNames } from './tuning.js';

const FRET_MARKERS_SINGLE = [3,5,7,9,15,17,19,21];
const FRET_MARKERS_DOUBLE = [12,24];

/* ── Layout constants ───────────────────────────────────────────── */
const FRET_W   = 44;   // px per fret
const STR_GAP  = 30;   // px between strings
const PAD_L    = 52;   // left padding (string labels)
const PAD_TOP  = 30;   // top padding
const PAD_BOT  = 32;   // bottom (fret numbers)
const NUT_W    = 4;

/* ── Compute 3NPS positions for a given tuning + scale ─────────── */
export function computePositions(stringMidis, rootMidi, scaleSemis, totalFrets = 22) {
  const stringCount = stringMidis.length;
  const rootClass   = rootMidi % 12;

  // Find all frets on low string where root appears
  const lowBase = stringMidis[0] % 12;
  const rootFretsLow = [];
  for (let f = 0; f <= totalFrets; f++) {
    if ((lowBase + f) % 12 === rootClass) rootFretsLow.push(f);
  }

  // For each starting fret on low string, collect a 3NPS position
  // A position = exactly 3 scale notes per string, in ascending order
  // starting within a 4-fret window from the anchor fret
  const positions = [];

  // We want 7 positions (one per scale degree) spanning the neck
  // Start anchor = fret on low string for each scale degree note
  const degFretsLow = scaleSemis.map(semi => {
    const target = (rootClass + semi) % 12;
    for (let f = 0; f <= totalFrets; f++) {
      if ((lowBase + f) % 12 === target) return f;
    }
    return 0;
  });

  degFretsLow.forEach((anchorFret, posIdx) => {
    const pos = { idx: posIdx, dots: [], startFret: anchorFret };

    stringMidis.forEach((baseMidi, si) => {
      const strBase = baseMidi % 12;
      let found = 0;
      // Search in window: anchor - 1 to anchor + 5
      const winStart = Math.max(0, anchorFret - 1);
      const winEnd   = Math.min(totalFrets, anchorFret + 6);

      for (let f = winStart; f <= winEnd && found < 3; f++) {
        const noteClass = (strBase + f) % 12;
        const relSemi   = (noteClass - rootClass + 12) % 12;
        if (scaleSemis.includes(relSemi)) {
          pos.dots.push({ f, si, relSemi, degIdx: scaleSemis.indexOf(relSemi) });
          found++;
        }
      }
    });

    positions.push(pos);
  });

  return positions;
}

/* ── Collect ALL scale dots on the full neck ────────────────────── */
export function collectAllDots(stringMidis, rootMidi, scaleSemis, totalFrets = 22) {
  const rootClass = rootMidi % 12;
  const dots = [];
  stringMidis.forEach((baseMidi, si) => {
    const strBase = baseMidi % 12;
    for (let f = 0; f <= totalFrets; f++) {
      const noteClass = (strBase + f) % 12;
      const relSemi   = (noteClass - rootClass + 12) % 12;
      if (scaleSemis.includes(relSemi)) {
        dots.push({ f, si, relSemi, degIdx: scaleSemis.indexOf(relSemi) });
      }
    }
  });
  return dots;
}

/* ── Main SVG renderer ──────────────────────────────────────────── */
export function renderFretboard({
  stringMidis,
  rootMidi,
  scaleKey,
  scaleDefs,       // SCALES[scaleKey]
  activePos,       // 'all' | 1-7
  theme = 'dark',
  totalFrets = 22,
}) {
  const scaleSemis  = getScaleSemitones(scaleKey);
  const rootClass   = rootMidi % 12;
  const strNames    = getStringNames(stringMidis);
  const stringCount = stringMidis.length;

  // Colors
  const isDark = theme === 'dark';
  const C = {
    bg:       isDark ? '#111827' : '#ffffff',
    nut:      isDark ? '#94a3b8' : '#475569',
    fretLine: isDark ? '#1e293b' : '#cbd5e1',
    strLine:  isDark ? '#334155' : '#94a3b8',
    marker:   isDark ? '#1e293b' : '#e2e8f0',
    fretNum:  isDark ? '#475569' : '#64748b',
    dimDot:   isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    dimTxt:   isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)',
    strLbl:   isDark ? '#64748b' : '#94a3b8',
  };

  // Layout
  const W = PAD_L + totalFrets * FRET_W + 20;
  const H = PAD_TOP + (stringCount - 1) * STR_GAP + PAD_BOT + 20;

  // String Y positions (index 0 = low string = BOTTOM of diagram)
  function strY(si) {
    return PAD_TOP + (stringCount - 1 - si) * STR_GAP;
  }
  // Fret X center
  function fretXCenter(f) {
    if (f === 0) return PAD_L - FRET_W * 0.5;
    return PAD_L + (f - 0.5) * FRET_W;
  }

  // Compute positions & active dots
  const positions  = computePositions(stringMidis, rootMidi, scaleSemis, totalFrets);
  const allDots    = collectAllDots(stringMidis, rootMidi, scaleSemis, totalFrets);

  let activeSet = new Set();
  if (activePos !== 'all') {
    const pi = parseInt(activePos) - 1;
    if (positions[pi]) {
      positions[pi].dots.forEach(d => activeSet.add(`${d.f}-${d.si}`));
    }
  }

  // Note name lookup
  const NOTE_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  function noteName(midi, semi) {
    return NOTE_SHARP[(midi + semi) % 12] || '?';
  }
  // Get note at fret on string
  function noteAtFret(baseMidi, fret) {
    return NOTE_SHARP[(baseMidi + fret) % 12];
  }

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="font-family:Inter,sans-serif;min-width:800px;max-width:100%">`;
  svg += `<rect width="${W}" height="${H}" fill="${C.bg}" rx="10"/>`;

  // ── String labels ──
  strNames.slice().reverse().forEach((lbl, di) => {
    // di=0 → high string (top of diagram)
    const si = stringCount - 1 - di;
    const y  = strY(si);
    svg += `<text x="22" y="${y + 4}" font-size="11" fill="${C.strLbl}" font-weight="700" text-anchor="middle">${lbl}</text>`;
  });

  // ── Nut ──
  svg += `<line x1="${PAD_L}" y1="${strY(stringCount-1) - 10}" x2="${PAD_L}" y2="${strY(0) + 10}" stroke="${C.nut}" stroke-width="${NUT_W}" stroke-linecap="round"/>`;

  // ── Fret lines + numbers ──
  for (let f = 1; f <= totalFrets; f++) {
    const x = PAD_L + f * FRET_W;
    svg += `<line x1="${x}" y1="${strY(stringCount-1) - 8}" x2="${x}" y2="${strY(0) + 8}" stroke="${C.fretLine}" stroke-width="1"/>`;
    svg += `<text x="${PAD_L + (f - 0.5) * FRET_W}" y="${strY(0) + 22}" font-size="9" fill="${C.fretNum}" text-anchor="middle">${f}</text>`;
  }
  svg += `<text x="${PAD_L - FRET_W * 0.5}" y="${strY(0) + 22}" font-size="9" fill="${C.fretNum}" text-anchor="middle">0</text>`;

  // ── Fret position markers ──
  FRET_MARKERS_SINGLE.forEach(f => {
    if (f > totalFrets) return;
    const x   = PAD_L + (f - 0.5) * FRET_W;
    const yMid = strY(Math.floor((stringCount - 1) / 2));
    svg += `<circle cx="${x}" cy="${yMid}" r="4" fill="${C.marker}"/>`;
  });
  FRET_MARKERS_DOUBLE.forEach(f => {
    if (f > totalFrets) return;
    const x = PAD_L + (f - 0.5) * FRET_W;
    const y1 = strY(Math.floor(stringCount / 2));
    const y2 = strY(Math.floor(stringCount / 2) - 1);
    svg += `<circle cx="${x}" cy="${y1}" r="4" fill="${C.marker}"/>`;
    svg += `<circle cx="${x}" cy="${y2}" r="4" fill="${C.marker}"/>`;
  });

  // ── String lines ──
  for (let si = 0; si < stringCount; si++) {
    const y     = strY(si);
    const thick = 0.7 + (si * (2.2 / stringCount));
    svg += `<line x1="${PAD_L}" y1="${y}" x2="${PAD_L + totalFrets * FRET_W}" y2="${y}" stroke="${C.strLine}" stroke-width="${thick}"/>`;
  }

  // ── Scale dots ──
  // Draw dimmed first (background layer), then active on top
  allDots.forEach(({ f, si, relSemi, degIdx }) => {
    const key     = `${f}-${si}`;
    const isActive = activePos === 'all' || activeSet.has(key);
    const isRoot   = relSemi === 0;
    const x        = fretXCenter(f);
    const y        = strY(si);
    const noteLabel = noteAtFret(stringMidis[si], f);

    if (!isActive) {
      svg += `<circle cx="${x}" cy="${y}" r="8" fill="${C.dimDot}"/>`;
      svg += `<text x="${x}" y="${y + 3.5}" font-size="7" fill="${C.dimTxt}" text-anchor="middle" font-weight="600">${noteLabel}</text>`;
    }
  });

  allDots.forEach(({ f, si, relSemi, degIdx }) => {
    const key     = `${f}-${si}`;
    const isActive = activePos === 'all' || activeSet.has(key);
    if (!isActive) return;

    const isRoot    = relSemi === 0;
    const x         = fretXCenter(f);
    const y         = strY(si);
    const col       = DEG_COLORS[degIdx % DEG_COLORS.length];
    const noteLabel = noteAtFret(stringMidis[si], f);
    const r         = isRoot ? 13 : 10;

    // Glow for root
    if (isRoot) svg += `<circle cx="${x}" cy="${y}" r="${r + 5}" fill="${col}" opacity="0.18"/>`;
    svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/>`;
    if (isRoot) svg += `<circle cx="${x}" cy="${y}" r="${r + 2}" fill="none" stroke="${col}" stroke-width="2" opacity="0.6"/>`;

    svg += `<text x="${x}" y="${y + 4}" font-size="${isRoot ? 9 : 8}" fill="#fff" text-anchor="middle" font-weight="800">${noteLabel}</text>`;

    const deg = scaleDefs.degs[degIdx] || '';
    svg += `<text x="${x}" y="${y + r + 12}" font-size="7" fill="${col}" text-anchor="middle" font-weight="700" opacity="0.9">${deg}</text>`;
  });

  svg += `</svg>`;
  return svg;
}
