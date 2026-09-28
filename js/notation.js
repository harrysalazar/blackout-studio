/* ═══════════════════════════════════════════
   notation.js — Staff + Tab SVG renderer v2
   Blackout Studio · SIPO Guitar
   
   Renders multi-system notation:
   - 3 measures per system, wraps vertically
   - Thin engraved-style note heads
   - Staff + Tab per system
   - Technique markers: h p b ~ sweep T S P PM
═══════════════════════════════════════════ */

export const DUR_BEATS  = { w:4, h:2, q:1, e:0.5, s:0.25, t:1/3 };
const DUR_FLAGS          = { w:0, h:0, q:0, e:1, s:2, t:1 };
const DUR_FILLED         = { w:false, h:false, q:true, e:true, s:true, t:true };
const MEASURES_PER_LINE  = 3;

/* ── Layout ─────────────────────────────── */
const L = {
  PAD_L:      56,   // left margin (clef + time sig)
  PAD_R:      20,
  PAD_TOP:    24,
  BEAT_W:     48,   // px per beat
  STAFF_GAP:  7,    // px between staff lines
  STAFF_LINES:5,
  TAB_GAP:    13,   // px between tab string lines
  STAFF_TO_TAB: 38, // gap between bottom staff line and top tab line
  SYS_GAP:    28,   // gap between systems (bottom tab to next top staff)
  CLEF_W:     38,
};

function staffH(){ return (L.STAFF_LINES-1)*L.STAFF_GAP; }
function tabH(n) { return (n-1)*L.TAB_GAP; }
function sysH(n) { return staffH() + L.STAFF_TO_TAB + tabH(n); }

function lineY(base, line){ return base + line * L.STAFF_GAP; }
function tabStrY(base, si) { return base + si * L.TAB_GAP; }

/* ── Colors ──────────────────────────────── */
function C(theme){
  const d = theme==='dark';
  return {
    bg:    d?'#111827':'#ffffff',
    staff: d?'#334155':'#94a3b8',
    note:  d?'#f1f5f9':'#0f172a',
    acc:   d?'#f1f5f9':'#0f172a',
    tab:   d?'#a78bfa':'#6d28d9',
    h:     d?'#06b6d4':'#0891b2',
    sweep: d?'#7c3aed':'#5b21b6',
    tap:   d?'#ec4899':'#be185d',
    slap:  d?'#f59e0b':'#d97706',
    pop:   d?'#10b981':'#059669',
    dim:   d?'#475569':'#94a3b8',
    bar:   d?'#334155':'#94a3b8',
    hl:    '#f59e0b',
    clef:  d?'#64748b':'#475569',
    target:d?'#ef4444':'#dc2626',
  };
}

/* ── MIDI → staff position ───────────────── */
// Returns y offset from top staff line (positive = below)
// Treble clef: top line = F5(77), spaces E5 D5 C5 B4, bottom line = E4(64)
// Each step = half a STAFF_GAP
const DIA = [0,0,1,1,2,3,3,4,4,5,5,6]; // semitone → diatonic step in octave
const DIA_SEMI = [0,2,4,5,7,9,11]; // diatonic step → semitone

function midiToStaffY(midi, staffTopY){
  // Convert midi to diatonic position
  const oct  = Math.floor(midi/12)-1;
  const semi = midi%12;
  // Find diatonic step (0=C, 1=D, ... 6=B)
  let dStep = DIA[semi];
  const absPos = oct*7 + dStep; // absolute diatonic position from C(-1)
  // Treble clef reference: B4 = midi 71
  // B4 diatonic abs = 4*7+6 = 34
  const B4_ABS = 34;
  const stepsFromB4 = B4_ABS - absPos; // positive = below B4
  const yOffset = stepsFromB4 * (L.STAFF_GAP/2);
  return {
    y: staffTopY + yOffset,
    isAccidental: ![0,2,4,5,7,9,11].includes(semi),
    acc: [1,3,6,8,10].includes(semi) ? '#' : 'b',
    dStep, absPos
  };
}

/* ── Note head (thin, engraved style) ────── */
function noteHead(x, y, filled, color, isActive){
  const col = isActive ? '#f59e0b' : color;
  if (!filled) {
    // Open note head (whole/half) — thin ellipse
    return `<ellipse cx="${x}" cy="${y}" rx="5.5" ry="3.8"
      fill="none" stroke="${col}" stroke-width="1.2"
      transform="rotate(-18,${x},${y})"/>`;
  }
  // Filled note head — solid thin ellipse
  return `<ellipse cx="${x}" cy="${y}" rx="5" ry="3.5"
    fill="${col}" stroke="${col}" stroke-width="0.5"
    transform="rotate(-18,${x},${y})"/>`;
}

/* ── Stem ────────────────────────────────── */
function stem(x, noteY, stemUp, color){
  const len   = 26;
  const nx    = x + (stemUp ? 4.5 : -4.5);
  const y1    = stemUp ? noteY - len : noteY + len;
  const y2    = stemUp ? noteY - 2  : noteY + 2;
  return `<line x1="${nx}" y1="${y1}" x2="${nx}" y2="${y2}"
    stroke="${color}" stroke-width="1"/>`;
}

/* ── Flag ────────────────────────────────── */
function flags(x, noteY, stemUp, count, color){
  let out = '';
  const nx = x + (stemUp ? 4.5 : -4.5);
  const sy = stemUp ? noteY - 26 : noteY + 26;
  for(let i=0;i<count;i++){
    const fy  = stemUp ? sy + i*6 : sy - i*6;
    const dir = stemUp ? 1 : -1;
    out += `<path d="M${nx} ${fy} C${nx+10} ${fy+5*dir} ${nx+12} ${fy+12*dir} ${nx+6} ${fy+18*dir}"
      fill="none" stroke="${color}" stroke-width="1.1"/>`;
  }
  return out;
}

/* ── Ledger lines ─────────────────────────── */
function ledgers(x, staffTopY, noteY, color){
  let out = '';
  const staffBot = staffTopY + (L.STAFF_LINES-1)*L.STAFF_GAP;
  // Check if ledger lines are needed above or below staff
  // Each ledger line at a line position (not space)
  for(let l = -1; l >= -6; l--){
    const ly = staffTopY + l*L.STAFF_GAP;
    if(Math.abs(noteY - ly) < L.STAFF_GAP*0.6){
      out += `<line x1="${x-9}" y1="${ly}" x2="${x+9}" y2="${ly}"
        stroke="${color}" stroke-width="1"/>`;
    }
  }
  for(let l = L.STAFF_LINES; l <= L.STAFF_LINES+5; l++){
    const ly = staffTopY + l*L.STAFF_GAP;
    if(Math.abs(noteY - ly) < L.STAFF_GAP*0.6){
      out += `<line x1="${x-9}" y1="${ly}" x2="${x+9}" y2="${ly}"
        stroke="${color}" stroke-width="1"/>`;
    }
  }
  return out;
}

/* ── Technique arc (h/p slur) ─────────────── */
function techArc(x1, x2, y, tech, color){
  const mx = (x1+x2)/2;
  const arc = tech==='h' ? -10 : 10;
  return `<path d="M${x1} ${y-6} Q${mx} ${y-6+arc} ${x2} ${y-6}"
    fill="none" stroke="${color}" stroke-width="1"/>
  <text x="${mx}" y="${y-14}" font-size="8" text-anchor="middle"
    fill="${color}" font-weight="600">${tech}</text>`;
}

/* ── Main render ─────────────────────────── */
export function renderNotation({ notes, stringMidis, instrument='guitar',
  theme='dark', currentBeat=-1, title='' }){

  if(!notes||notes.length===0) return emptyStaff(theme, title);

  const col    = C(theme);
  const nStr   = stringMidis.length;
  const beatsPerMeasure = 4;
  const totalBeats = Math.max(...notes.map(n=>n.beat+(DUR_BEATS[n.dur||'s']||0.25)));
  const totalMeasures  = Math.ceil(totalBeats / beatsPerMeasure);
  const totalSystems   = Math.ceil(totalMeasures / MEASURES_PER_LINE);

  // Canvas dimensions
  const measuresW = MEASURES_PER_LINE * beatsPerMeasure * L.BEAT_W;
  const W  = L.PAD_L + L.CLEF_W + measuresW + L.PAD_R;
  const SH = sysH(nStr);  // height of one system
  const H  = L.PAD_TOP + totalSystems*(SH + L.SYS_GAP) + 20;

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"
    style="font-family:Inter,sans-serif;width:100%;height:auto">`;
  svg += `<rect width="${W}" height="${H}" fill="${col.bg}"/>`;

  // Title
  if(title){
    svg += `<text x="${W/2}" y="16" text-anchor="middle" font-size="11"
      font-weight="700" fill="${col.dim}" letter-spacing="0.5">${title}</text>`;
  }

  // Render each system
  for(let sys=0; sys<totalSystems; sys++){
    const sysMeasureStart = sys * MEASURES_PER_LINE;
    const sysMeasureEnd   = Math.min(sysMeasureStart + MEASURES_PER_LINE, totalMeasures);
    const sysBeatStart    = sysMeasureStart * beatsPerMeasure;
    const sysBeatEnd      = sysMeasureEnd   * beatsPerMeasure;

    const sysY     = L.PAD_TOP + sys*(SH + L.SYS_GAP);
    const staffTopY = sysY;
    const tabTopY   = sysY + staffH() + L.STAFF_TO_TAB;

    // ── Staff lines ──
    for(let l=0;l<L.STAFF_LINES;l++){
      const y = lineY(staffTopY, l);
      svg += `<line x1="${L.PAD_L}" y1="${y}" x2="${W-L.PAD_R}" y2="${y}"
        stroke="${col.staff}" stroke-width="0.8"/>`;
    }

    // ── Clef (only first system gets full clef+timesig, rest get clef only) ──
    svg += `<text x="${L.PAD_L+2}" y="${staffTopY+28}" font-size="42"
      fill="${col.clef}" font-family="serif" opacity="0.85">𝄞</text>`;

    if(sys===0){
      // Time signature
      svg += `<text x="${L.PAD_L+28}" y="${staffTopY+11}" text-anchor="middle"
        font-size="16" font-weight="900" fill="${col.note}">4</text>`;
      svg += `<text x="${L.PAD_L+28}" y="${staffTopY+25}" text-anchor="middle"
        font-size="16" font-weight="900" fill="${col.note}">4</text>`;
    }

    // ── Tab lines ──
    svg += `<text x="${L.PAD_L-14}" y="${tabTopY+5}" font-size="14"
      font-weight="900" fill="${col.tab}" text-anchor="middle">T</text>`;
    svg += `<text x="${L.PAD_L-14}" y="${tabTopY+5+(nStr>4?9:11)}" font-size="14"
      font-weight="900" fill="${col.tab}" text-anchor="middle">A</text>`;
    svg += `<text x="${L.PAD_L-14}" y="${tabTopY+5+(nStr>4?18:22)}" font-size="14"
      font-weight="900" fill="${col.tab}" text-anchor="middle">B</text>`;

    for(let si=0;si<nStr;si++){
      const y = tabStrY(tabTopY, si);
      svg += `<line x1="${L.PAD_L}" y1="${y}" x2="${W-L.PAD_R}" y2="${y}"
        stroke="${col.staff}" stroke-width="${si===0||si===nStr-1?0.9:0.6}"/>`;
    }

    // ── Barlines for this system ──
    for(let m=0;m<=sysMeasureEnd-sysMeasureStart;m++){
      const x = L.PAD_L + L.CLEF_W + m * beatsPerMeasure * L.BEAT_W;
      const bw = m===0||m===sysMeasureEnd-sysMeasureStart?1.5:0.8;
      svg += `<line x1="${x}" y1="${staffTopY}" x2="${x}"
        y2="${staffTopY+staffH()}" stroke="${col.bar}" stroke-width="${bw}"/>`;
      svg += `<line x1="${x}" y1="${tabTopY}" x2="${x}"
        y2="${tabTopY+tabH(nStr)}" stroke="${col.bar}" stroke-width="${bw}"/>`;
    }

    // ── Notes in this system ──
    const sysNotes = notes.filter(n=>n.beat>=sysBeatStart && n.beat<sysBeatEnd);

    // Pre-pass: collect x positions
    const noteX = (n) => {
      const localBeat = n.beat - sysBeatStart;
      return L.PAD_L + L.CLEF_W + localBeat * L.BEAT_W + L.BEAT_W/2;
    };

    sysNotes.forEach((n, ni) => {
      const x      = noteX(n);
      const dur    = n.dur||'s';
      const filled = DUR_FILLED[dur];
      const nFlags = DUR_FLAGS[dur];
      const isActive = currentBeat>=n.beat && currentBeat<n.beat+(DUR_BEATS[dur]||0.25);
      const noteColor = isActive ? col.hl : col.note;

      // ── Staff note ──
      const sp     = midiToStaffY(n.midi, staffTopY);
      const stemUp = sp.y > staffTopY + staffH()/2;

      svg += noteHead(x, sp.y, filled, noteColor, isActive);
      if(dur!=='w'){
        svg += stem(x, sp.y, stemUp, noteColor);
        if(nFlags>0) svg += flags(x, sp.y, stemUp, nFlags, noteColor);
      }
      svg += ledgers(x, staffTopY, sp.y, col.note);

      if(sp.isAccidental){
        svg += `<text x="${x-11}" y="${sp.y+3.5}" font-size="10"
          fill="${col.acc}" text-anchor="middle">${sp.acc}</text>`;
      }

      // ── Tab number ──
      // si: 0=low string. Tab displays high string at top.
      const dispSi = nStr-1-n.string;
      const ty     = tabStrY(tabTopY, dispSi);
      const fStr   = n.isMuted?'x':String(n.fret??0);
      const fw     = fStr.length>1?13:9;
      const techColor = getTechColor(n.technique, col);
      const tabColor  = isActive ? col.hl : techColor;

      svg += `<rect x="${x-fw/2-1}" y="${ty-6}" width="${fw+2}" height="12"
        fill="${col.bg}" rx="1"/>`;
      svg += `<text x="${x}" y="${ty+4}" font-size="${fStr.length>1?9:11}"
        text-anchor="middle" font-weight="700" fill="${tabColor}">${fStr}</text>`;

      // ── Technique over tab ──
      if(n.technique){
        svg += renderTech(n, x, ty, col);
      }

      // ── Pick direction below tab ──
      if(n.pick==='down'||n.pick==='up'){
        svg += `<text x="${x}" y="${tabTopY+tabH(nStr)+14}"
          font-size="9" text-anchor="middle" fill="${col.dim}">${n.pick==='down'?'↓':'↑'}</text>`;
      } else if(n.pick==='slap'){
        svg += `<text x="${x}" y="${tabTopY+tabH(nStr)+14}"
          font-size="8" text-anchor="middle" font-weight="700" fill="${col.slap}">S</text>`;
      } else if(n.pick==='pop'){
        svg += `<text x="${x}" y="${tabTopY+tabH(nStr)+14}"
          font-size="8" text-anchor="middle" font-weight="700" fill="${col.pop}">P</text>`;
      }
    });

    // ── H/P slurs ──
    sysNotes.forEach((n, ni) => {
      if(n.technique==='h'||n.technique==='p'){
        const prev = sysNotes[ni-1];
        if(!prev) return;
        const x1  = noteX(prev);
        const x2  = noteX(n);
        const dispSi = nStr-1-n.string;
        const ty  = tabStrY(tabTopY, dispSi);
        svg += techArc(x1, x2, ty, n.technique, col.h);
      }
    });
  }

  svg += `</svg>`;
  return svg;
}

function renderTech(n, x, ty, col){
  switch(n.technique){
    case 'sweep_d':
      return `<text x="${x}" y="${ty-9}" font-size="8" text-anchor="middle"
        fill="${col.sweep}" font-weight="700">↓</text>`;
    case 'sweep_u':
      return `<text x="${x}" y="${ty-9}" font-size="8" text-anchor="middle"
        fill="${col.sweep}" font-weight="700">↑</text>`;
    case 'tap':
      return `<circle cx="${x}" cy="${ty}" r="7" fill="none"
        stroke="${col.tap}" stroke-width="1.2"/>`;
    case 'b':
      return `<text x="${x+7}" y="${ty-9}" font-size="8" fill="${col.h}">b</text>
        <path d="M${x} ${ty-6} Q${x+7} ${ty-14} ${x+5} ${ty-20}"
        fill="none" stroke="${col.h}" stroke-width="1"/>`;
    case '~':
      return `<path d="M${x-7} ${ty-9} Q${x-3} ${ty-13} ${x} ${ty-9}
        Q${x+3} ${ty-5} ${x+7} ${ty-9}"
        fill="none" stroke="${col.h}" stroke-width="1"/>`;
    case 'slap':
      return `<text x="${x}" y="${ty-9}" font-size="8" text-anchor="middle"
        fill="${col.slap}" font-weight="700">S</text>`;
    case 'pop':
      return `<text x="${x}" y="${ty-9}" font-size="8" text-anchor="middle"
        fill="${col.pop}" font-weight="700">P</text>`;
    case 'pm':
      return `<text x="${x}" y="${ty-9}" font-size="7" text-anchor="middle"
        fill="${col.dim}">PM</text>`;
    default: return '';
  }
}

function getTechColor(tech, col){
  if(!tech) return col.tab;
  if(tech==='h'||tech==='p'||tech==='b'||tech==='~') return col.h;
  if(tech==='sweep_d'||tech==='sweep_u') return col.sweep;
  if(tech==='tap') return col.tap;
  if(tech==='slap') return col.slap;
  if(tech==='pop') return col.pop;
  return col.tab;
}

function emptyStaff(theme, title){
  const col = C(theme);
  return `<svg viewBox="0 0 600 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="600" height="100" fill="${col.bg}"/>
    <text x="300" y="55" text-anchor="middle" font-size="13"
      fill="${col.dim}">${title||'Selecciona un ejercicio'}</text>
  </svg>`;
}

export function beatToX(beat, beatsPerMeasure=4){
  const m = Math.floor(beat/beatsPerMeasure);
  const b = beat%beatsPerMeasure;
  return L.PAD_L + L.CLEF_W + m*beatsPerMeasure*L.BEAT_W + b*L.BEAT_W + L.BEAT_W/2;
}
