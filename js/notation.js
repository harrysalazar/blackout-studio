/* ═══════════════════════════════════════════
   notation.js — Staff + Tab SVG renderer
   Blackout Studio · SIPO Guitar · Iteración 2

   Renders a grand staff (treble clef + tab)
   with full technique notation:
   h=hammer-on p=pull-off b=bend ~=vibrato
   sweep_d/u T=tap slap pop pm=palm mute
═══════════════════════════════════════════ */

/* ── Layout constants ───────────────────── */
const L = {
  STAFF_TOP:    40,    // Y of top staff line
  STAFF_GAP:    8,     // px between staff lines
  STAFF_LINES:  5,
  TAB_TOP:      160,   // Y of top tab line
  TAB_GAP:      14,    // px between tab strings
  PAD_L:        60,    // left margin
  PAD_R:        20,
  BEAT_W:       52,    // px per beat
  NOTE_R:       6,     // note head radius
  CLEF_W:       40,    // clef + time sig space
};

/* ── Staff line Y positions ─────────────── */
function lineY(line) {
  // line 0 = top line, 4 = bottom line
  return L.STAFF_TOP + line * L.STAFF_GAP;
}

/* ── Tab string Y ────────────────────────── */
function tabY(si, totalStrings) {
  // si 0 = highest string (top of tab)
  return L.TAB_TOP + si * L.TAB_GAP;
}

/* ── MIDI to staff position ──────────────── */
// Returns {line: float, ledger: bool}
// line 0 = top staff line (E5 in treble clef)
// Middle C = C4 = line 6 (below staff)
const TREBLE_BOTTOM = 40; // MIDI of bottom line (E2)
const SEMITONES_IN_SCALE = [0,2,4,5,7,9,11]; // C major positions

function midiToStaffPos(midi) {
  // Convert MIDI to diatonic position relative to treble clef
  const octave   = Math.floor(midi / 12) - 1;
  const semitone = midi % 12;

  // Find the diatonic step (0-6)
  let diaStep = 0;
  for (let i = SEMITONES_IN_SCALE.length - 1; i >= 0; i--) {
    if (semitone >= SEMITONES_IN_SCALE[i]) { diaStep = i; break; }
  }

  // Absolute diatonic position from C0
  const absPos = octave * 7 + diaStep;

  // Treble clef: B4 = line 0 (top), G4 = line 1...
  // E4 = bottom line = line 4
  // B4 in absolute = 4*7+6 = 34
  const B4_ABS = 4 * 7 + 6; // B4
  const staffPos = (B4_ABS - absPos) / 2; // half-spaces

  return {
    y:      L.STAFF_TOP + staffPos * L.STAFF_GAP,
    pos:    staffPos,
    octave, diaStep,
    isAccidental: !SEMITONES_IN_SCALE.includes(semitone),
    accidental: semitone === (SEMITONES_IN_SCALE[diaStep] + 1) % 12 ? '#' : 'b',
  };
}

/* ── Duration to beat length ─────────────── */
const DUR_BEATS = { w:4, h:2, q:1, e:0.5, s:0.25, t:1/3 };
const DUR_FLAGS  = { w:0, h:0, q:0, e:1,   s:2,    t:1   };
const DUR_FILLED = { w:false, h:false, q:true, e:true, s:true, t:true };

/* ── Color palette ───────────────────────── */
function getColors(theme) {
  const d = theme === 'dark';
  return {
    bg:     d ? '#111827' : '#ffffff',
    staff:  d ? '#334155' : '#94a3b8',
    note:   d ? '#f1f5f9' : '#0f172a',
    tab:    d ? '#a78bfa' : '#6d28d9',
    tech:   d ? '#06b6d4' : '#0891b2',
    target: d ? '#ef4444' : '#dc2626',
    slap:   d ? '#f59e0b' : '#d97706',
    pop:    d ? '#10b981' : '#059669',
    sweep:  d ? '#7c3aed' : '#5b21b6',
    tap:    d ? '#ec4899' : '#be185d',
    dim:    d ? '#475569' : '#94a3b8',
    clef:   d ? '#64748b' : '#475569',
  };
}

/* ════════════════════════════════════════════
   MAIN RENDER FUNCTION
════════════════════════════════════════════ */
export function renderNotation({
  notes,
  stringMidis,
  instrument = 'guitar',
  theme      = 'dark',
  currentBeat = -1,   // for playback highlight
  timeSignature = [4, 4],
  title = '',
}) {
  if (!notes || notes.length === 0) return '<svg></svg>';

  const totalStrings = stringMidis.length;
  const C            = getColors(theme);
  const maxBeat      = Math.max(...notes.map(n => n.beat + DUR_BEATS[n.dur||'s']));
  const measures     = Math.ceil(maxBeat / timeSignature[0]);
  const totalW       = L.PAD_L + L.CLEF_W + measures * timeSignature[0] * L.BEAT_W + L.PAD_R;
  const totalH       = L.TAB_TOP + totalStrings * L.TAB_GAP + 50;

  let svg = `<svg viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg" style="font-family:Inter,sans-serif;width:100%;height:auto">`;
  svg += `<rect width="${totalW}" height="${totalH}" fill="${C.bg}"/>`;

  // ── Title ──
  if (title) {
    svg += `<text x="${totalW/2}" y="20" text-anchor="middle" font-size="12"
      font-weight="700" fill="${C.dim}" letter-spacing="1">${title}</text>`;
  }

  // ── Staff lines ──
  for (let line = 0; line < L.STAFF_LINES; line++) {
    const y = lineY(line);
    svg += `<line x1="${L.PAD_L}" y1="${y}" x2="${totalW - L.PAD_R}" y2="${y}"
      stroke="${C.staff}" stroke-width="1"/>`;
  }

  // ── Treble clef ──
  svg += renderTrebleClef(L.PAD_L + 4, L.STAFF_TOP, C.clef);

  // ── Time signature ──
  const tsX = L.PAD_L + 28;
  svg += `<text x="${tsX}" y="${L.STAFF_TOP + 10}" text-anchor="middle"
    font-size="18" font-weight="900" fill="${C.note}">${timeSignature[0]}</text>`;
  svg += `<text x="${tsX}" y="${L.STAFF_TOP + 26}" text-anchor="middle"
    font-size="18" font-weight="900" fill="${C.note}">${timeSignature[1]}</text>`;

  // ── Tab label ──
  svg += `<text x="${L.PAD_L - 8}" y="${tabY(0, totalStrings) + 6}"
    text-anchor="middle" font-size="18" font-weight="900" fill="${C.tab}">T</text>`;
  svg += `<text x="${L.PAD_L - 8}" y="${tabY(1, totalStrings) + 6}"
    text-anchor="middle" font-size="18" font-weight="900" fill="${C.tab}">A</text>`;
  svg += `<text x="${L.PAD_L - 8}" y="${tabY(2, totalStrings) + 6}"
    text-anchor="middle" font-size="18" font-weight="900" fill="${C.tab}">B</text>`;

  // ── Tab lines ──
  for (let si = 0; si < totalStrings; si++) {
    const y = tabY(si, totalStrings);
    svg += `<line x1="${L.PAD_L}" y1="${y}" x2="${totalW - L.PAD_R}" y2="${y}"
      stroke="${C.staff}" stroke-width="${si===0||si===totalStrings-1?1.5:1}"/>`;
  }

  // ── Barlines ──
  for (let m = 0; m <= measures; m++) {
    const x = L.PAD_L + L.CLEF_W + m * timeSignature[0] * L.BEAT_W;
    svg += `<line x1="${x}" y1="${lineY(0)}" x2="${x}" y2="${lineY(4)}"
      stroke="${C.staff}" stroke-width="${m===0||m===measures?2:1}"/>`;
    svg += `<line x1="${x}" y1="${tabY(0,totalStrings)}" x2="${x}" y2="${tabY(totalStrings-1,totalStrings)}"
      stroke="${C.staff}" stroke-width="${m===0||m===measures?2:1}"/>`;
  }

  // ── Notes ──
  const noteXMap = {};
  notes.forEach((n, idx) => {
    const x = beatToX(n.beat, timeSignature[0]);
    noteXMap[idx] = x;

    const isActive  = currentBeat >= n.beat && currentBeat < n.beat + DUR_BEATS[n.dur||'s'];
    const fillColor = isActive ? '#f59e0b' : C.note;

    // ── Staff note ──
    const sp = midiToStaffPos(n.midi);
    svg += renderStaffNote(x, sp, n.dur||'s', fillColor, C.note, isActive);

    // ── Ledger lines ──
    if (sp.pos < 0 || sp.pos > 4) {
      const ledgerY = sp.y;
      svg += `<line x1="${x-10}" y1="${ledgerY}" x2="${x+10}" y2="${ledgerY}"
        stroke="${C.note}" stroke-width="1.2"/>`;
    }

    // ── Accidental ──
    if (sp.isAccidental) {
      svg += `<text x="${x-12}" y="${sp.y+4}" font-size="11" fill="${C.note}"
        text-anchor="middle">${sp.accidental}</text>`;
    }

    // ── Tab number ──
    const tabStringIdx = totalStrings - 1 - n.string; // flip: high e at top
    const ty = tabY(tabStringIdx, totalStrings);
    const techColor = getTechColor(n.technique, C);
    const fretStr   = n.isMuted ? 'x' : String(n.fret ?? 0);
    const fretW     = fretStr.length > 1 ? 14 : 10;

    // White bg to cover string line
    svg += `<rect x="${x-fretW/2}" y="${ty-7}" width="${fretW}" height="13"
      fill="${C.bg}" rx="2"/>`;
    svg += `<text x="${x}" y="${ty+4}" font-size="${fretStr.length>1?10:12}"
      text-anchor="middle" font-weight="800"
      fill="${isActive?'#f59e0b':techColor}">${fretStr}</text>`;

    // ── Technique markers ──
    if (n.technique) {
      svg += renderTechniqueMarker(n, idx, notes, x, ty, C);
    }

    // ── Pick direction ──
    if (n.pick === 'down' || n.pick === 'up') {
      const arrow = n.pick === 'down' ? '↓' : '↑';
      svg += `<text x="${x}" y="${L.TAB_TOP + totalStrings*L.TAB_GAP + 14}"
        font-size="10" text-anchor="middle" fill="${C.dim}">${arrow}</text>`;
    } else if (n.pick === 'slap') {
      svg += `<text x="${x}" y="${L.TAB_TOP + totalStrings*L.TAB_GAP + 14}"
        font-size="9" text-anchor="middle" font-weight="700" fill="${C.slap}">S</text>`;
    } else if (n.pick === 'pop') {
      svg += `<text x="${x}" y="${L.TAB_TOP + totalStrings*L.TAB_GAP + 14}"
        font-size="9" text-anchor="middle" font-weight="700" fill="${C.pop}">P</text>`;
    }

    // ── Finger number ──
    if (n.finger && n.finger !== 'T') {
      svg += `<text x="${x}" y="${ty - 10}" font-size="8"
        text-anchor="middle" fill="${C.dim}">${n.finger}</text>`;
    }
  });

  // ── Slurs / ties for hammer-ons and pull-offs ──
  notes.forEach((n, idx) => {
    if (n.technique === 'h' || n.technique === 'p') {
      const prev = notes[idx-1];
      if (!prev) return;
      const x1 = noteXMap[idx-1] || 0;
      const x2 = noteXMap[idx]   || 0;
      const tabStringIdx = totalStrings - 1 - n.string;
      const ty  = tabY(tabStringIdx, totalStrings);
      const arc = n.technique === 'h' ? -12 : 12;
      const mx  = (x1 + x2) / 2;

      svg += `<path d="M${x1} ${ty-8} Q${mx} ${ty-8+arc} ${x2} ${ty-8}"
        fill="none" stroke="${C.tech}" stroke-width="1.2"/>`;
      svg += `<text x="${mx}" y="${ty - 18}" font-size="9" text-anchor="middle"
        fill="${C.tech}" font-weight="700">${n.technique}</text>`;
    }
  });

  svg += `</svg>`;
  return svg;
}

/* ── Technique marker renderer ──────────── */
function renderTechniqueMarker(n, idx, notes, x, ty, C) {
  let out = '';
  switch(n.technique) {
    case 'sweep_d':
      out += `<text x="${x}" y="${ty-12}" font-size="9" text-anchor="middle"
        fill="${C.sweep}" font-weight="800">↓</text>`;
      break;
    case 'sweep_u':
      out += `<text x="${x}" y="${ty-12}" font-size="9" text-anchor="middle"
        fill="${C.sweep}" font-weight="800">↑</text>`;
      break;
    case 'tap':
      out += `<circle cx="${x}" cy="${ty}" r="8" fill="none"
        stroke="${C.tap}" stroke-width="1.5"/>`;
      out += `<text x="${x}" y="${ty+4}" font-size="9" text-anchor="middle"
        fill="${C.tap}" font-weight="800">T</text>`;
      break;
    case 'b':
      out += `<text x="${x+8}" y="${ty-12}" font-size="9"
        fill="${C.tech}" font-weight="700">b</text>`;
      out += `<path d="M${x} ${ty-8} Q${x+8} ${ty-16} ${x+6} ${ty-22}"
        fill="none" stroke="${C.tech}" stroke-width="1.2"/>`;
      break;
    case '~':
      out += `<path d="M${x-8} ${ty-10} Q${x-4} ${ty-14} ${x} ${ty-10}
        Q${x+4} ${ty-6} ${x+8} ${ty-10}"
        fill="none" stroke="${C.tech}" stroke-width="1.2"/>`;
      break;
    case 'slap':
      out += `<text x="${x}" y="${ty-12}" font-size="9" text-anchor="middle"
        fill="${C.slap}" font-weight="800">S</text>`;
      break;
    case 'pop':
      out += `<text x="${x}" y="${ty-12}" font-size="9" text-anchor="middle"
        fill="${C.pop}" font-weight="800">P</text>`;
      break;
    case 'pm':
      out += `<text x="${x}" y="${ty-12}" font-size="8" text-anchor="middle"
        fill="${C.dim}">PM</text>`;
      break;
  }
  return out;
}

/* ── Staff note renderer ─────────────────── */
function renderStaffNote(x, sp, dur, fill, stroke, isActive) {
  const filled = DUR_FILLED[dur];
  const flags  = DUR_FLAGS[dur];
  const stemUp = sp.pos >= 2; // stem direction
  let out = '';

  // Note head
  if (dur === 'w') {
    out += `<ellipse cx="${x}" cy="${sp.y}" rx="7" ry="5"
      fill="none" stroke="${fill}" stroke-width="1.5"/>`;
  } else {
    out += `<ellipse cx="${x}" cy="${sp.y}" rx="${L.NOTE_R}" ry="4.5"
      fill="${filled?fill:'none'}" stroke="${stroke}" stroke-width="1.2"
      transform="rotate(-15,${x},${sp.y})"/>`;
  }

  // Stem
  if (dur !== 'w') {
    const stemY1 = stemUp ? sp.y - 28 : sp.y + 28;
    const stemY2 = sp.y + (stemUp ? -2 : 2);
    out += `<line x1="${x+(stemUp?4:-4)}" y1="${stemY1}"
      x2="${x+(stemUp?4:-4)}" y2="${stemY2}"
      stroke="${stroke}" stroke-width="1.2"/>`;

    // Flags
    for (let f = 0; f < flags; f++) {
      const fy = stemUp ? stemY1 + f*6 : stemY1 - f*6;
      const dir = stemUp ? 1 : -1;
      out += `<path d="M${x+(stemUp?4:-4)} ${fy} Q${x+16} ${fy+8*dir} ${x+12} ${fy+16*dir}"
        fill="none" stroke="${stroke}" stroke-width="1.5"/>`;
    }
  }

  return out;
}

/* ── Treble clef SVG path ────────────────── */
function renderTrebleClef(x, y, color) {
  // Simplified treble clef using path
  return `<text x="${x}" y="${y + 28}" font-size="48" fill="${color}"
    font-family="serif" opacity="0.8">𝄞</text>`;
}

/* ── Beat to X coordinate ────────────────── */
function beatToX(beat, beatsPerMeasure) {
  const measure   = Math.floor(beat / beatsPerMeasure);
  const beatInMsr = beat % beatsPerMeasure;
  return L.PAD_L + L.CLEF_W + measure * beatsPerMeasure * L.BEAT_W + beatInMsr * L.BEAT_W + L.BEAT_W/2;
}

/* ── Tech color ──────────────────────────── */
function getTechColor(tech, C) {
  if (!tech) return C.tab;
  if (tech === 'h' || tech === 'p' || tech === 'b' || tech === '~') return C.tech;
  if (tech === 'sweep_d' || tech === 'sweep_u') return C.sweep;
  if (tech === 'tap') return C.tap;
  if (tech === 'slap') return C.slap;
  if (tech === 'pop') return C.pop;
  if (tech === 'pm') return C.dim;
  return C.tab;
}

/* ── Export beat-to-X for player sync ────── */
export { beatToX, DUR_BEATS };
