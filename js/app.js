/* ═══════════════════════════════════════════
   app.js — Main controller
   Blackout Studio · SIPO Guitar · Iteración 2
═══════════════════════════════════════════ */

import { SCALES, ROOT_LABELS, ROOT_VALS, DEG_COLORS, DEG_EXPLAINED,
         noteArray, getScaleNotes, getScaleSemitones } from './scales.js';
import { INSTRUMENTS, CHROMATIC, OCTAVES, midiToNote, noteToMidi,
         getStringMidis, getDefaultCustom, getStringNames } from './tuning.js';
import { renderFretboard } from './fretboard.js';
import { buildExercise } from './exercises.js';
import { renderNotation, DUR_BEATS } from './notation.js';
import { initAudio, isLoaded, isLoading, switchInstrument } from './soundfont.js';
import { playerPlay, playerStop, playerPause, playerSetBpm,
         playerSetLoop, playerSetMetronome, playerOnBeatChange,
         playerIsPlaying, playerCurrentBeat, playerBpm } from './player.js';

/* ── State ───────────────────────────────── */
const ST = {
  theme:'dark', instrument:'guitar', strings:6,
  tuningKey:'standard', customMidis:null,
  scale:'major', root:'A',
  activePos:'all', activeTab:0, fbMode:'notes',
  bpm: 80, loop: true, metronome: true,
  currentExercise: 'thirds',
  audioReady: false,
};

/* ── Derived ─────────────────────────────── */
function currentMidis() {
  return getStringMidis(ST.instrument, ST.strings, ST.tuningKey, ST.customMidis);
}
function rootMidi() {
  const a = noteArray(ST.root);
  // Return MIDI value in comfortable range for the instrument
  const base = ST.instrument === 'bass' ? 28 : 40;
  const ri   = a.indexOf(ST.root);
  const lowBase = currentMidis()[0] % 12;
  // Find first occurrence of root on low string
  for (let f = 0; f <= 12; f++) {
    if ((lowBase + f) % 12 === ri) return currentMidis()[0] + f;
  }
  return base + ri;
}

/* ── Theme ───────────────────────────────── */
document.getElementById('themeBtn').addEventListener('click', () => {
  ST.theme = ST.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', ST.theme);
  document.getElementById('themeBtn').textContent = ST.theme === 'dark' ? '🌙' : '☀️';
  renderFBOnly();
  renderExerciseArea();
});

/* ── Instrument ──────────────────────────── */
document.querySelectorAll('.inst-btn').forEach(b => b.addEventListener('click', () => {
  ST.instrument = b.dataset.inst;
  ST.strings    = INSTRUMENTS[ST.instrument].defaultStrings;
  ST.tuningKey  = INSTRUMENTS[ST.instrument].defaultTuning;
  ST.customMidis = null; ST.activePos = 'all';
  document.querySelectorAll('.inst-btn').forEach(x => x.classList.toggle('active', x === b));
  renderStrings(); renderTuning(); renderAll();
  if (ST.audioReady) switchInstrument(ST.instrument);
}));

/* ── Strings ─────────────────────────────── */
function renderStrings() {
  const sel = document.getElementById('stringsSelect');
  if (!sel) return;
  sel.innerHTML = INSTRUMENTS[ST.instrument].stringOptions
    .map(n => `<option value="${n}"${n===ST.strings?' selected':''}>${n} cuerdas</option>`)
    .join('');
  sel.onchange = e => {
    ST.strings = parseInt(e.target.value);
    ST.tuningKey = INSTRUMENTS[ST.instrument].defaultTuning;
    ST.customMidis = null; ST.activePos = 'all';
    renderTuning(); renderAll();
  };
}

/* ── Tuning ──────────────────────────────── */
function renderTuning() {
  const sel  = document.getElementById('tuningSelect');
  if (!sel) return;
  const tunings = INSTRUMENTS[ST.instrument].tunings;
  const sk      = `strings${ST.strings}`;
  const avail   = Object.entries(tunings).filter(([k,t]) => k==='custom'||(t[sk]!=null));
  sel.innerHTML = avail.map(([k,t]) =>
    `<option value="${k}"${k===ST.tuningKey?' selected':''}>${t.label}</option>`
  ).join('');
  sel.onchange = e => {
    ST.tuningKey = e.target.value; ST.customMidis = null; ST.activePos = 'all';
    renderCustomTuning(); renderAll();
  };
  renderCustomTuning();
}

function renderCustomTuning() {
  const wrap = document.getElementById('customTuningWrap');
  if (ST.tuningKey !== 'custom') { wrap.innerHTML = ''; return; }
  const midis = ST.customMidis || getDefaultCustom(ST.instrument, ST.strings);
  ST.customMidis = midis;
  wrap.innerHTML = `
    <div class="custom-tuning-label">Afinación personalizada:</div>
    <div class="custom-tuning-grid">
      ${midis.map((m,i) => {
        const {note,octave} = midiToNote(m);
        return `<div class="custom-str-row">
          <span class="cstr-lbl">Cuerda ${i+1}</span>
          <select class="cstr-note sel-sm" data-idx="${i}" data-type="note">
            ${CHROMATIC.map(n=>`<option${n===note?' selected':''}>${n}</option>`).join('')}
          </select>
          <select class="cstr-oct sel-sm" data-idx="${i}" data-type="oct">
            ${OCTAVES.map(o=>`<option${o===octave?' selected':''}>${o}</option>`).join('')}
          </select>
        </div>`;
      }).join('')}
    </div>`;
  wrap.querySelectorAll('select').forEach(sel => sel.addEventListener('change', () => {
    const idx  = parseInt(sel.dataset.idx);
    const type = sel.dataset.type;
    const cur  = midiToNote(ST.customMidis[idx]);
    const note = type==='note' ? sel.value : cur.note;
    const oct  = type==='oct'  ? parseInt(sel.value) : cur.octave;
    ST.customMidis[idx] = noteToMidi(note, oct);
    ST.activePos = 'all'; renderAll();
  }));
}

/* ── Root ────────────────────────────────── */
function renderRoot() {
  const sel = document.getElementById('rootSelect');
  if (!sel) return;
  sel.innerHTML = ROOT_LABELS.map((lbl,i) =>
    `<option value="${ROOT_VALS[i]}"${ROOT_VALS[i]===ST.root?' selected':''}>${lbl}</option>`
  ).join('');
  sel.onchange = e => { ST.root = e.target.value; ST.activePos = 'all'; renderAll(); };
}

/* ── Scale select ────────────────────────── */
document.getElementById('scaleSelect').addEventListener('change', e => {
  ST.scale = e.target.value; ST.activePos = 'all'; renderAll();
});

/* ── Fretboard only ──────────────────────── */
function renderFBOnly() {
  const el = document.getElementById('fb-svg');
  if (!el) return;
  el.innerHTML = renderFretboard({
    stringMidis: currentMidis(), rootMidi: rootMidi(),
    scaleKey: ST.scale, scaleDefs: SCALES[ST.scale],
    activePos: ST.activePos, theme: ST.theme, fbMode: ST.fbMode,
  });
}

/* ── Exercise area ───────────────────────── */
function renderExerciseArea() {
  const container = document.getElementById('exerciseContainer');
  if (!container) return;

  const midis    = currentMidis();
  const rMidi    = rootMidi();
  const s        = SCALES[ST.scale];
  const isGuitar = ST.instrument === 'guitar';

  const exercises = isGuitar ? [
    { id:'thirds',    label:'① Terceras Diatónicas',        desc:'Calentamiento armónico — todas las cuerdas' },
    { id:'3nps',      label:'② 3NPS Posición Completa',     desc:'Ascendente + descendente + no lineal' },
    { id:'seq3',      label:'③ Secuencia de 3',             desc:'1-2-3 / 2-3-4 cruzando cuerdas' },
    { id:'seq4',      label:'④ Secuencia de 4 · Semicorch.', desc:'Grupos de 4 — todo el mástil 0-12' },
    { id:'seq6',      label:'⑤ Secuencia de 6 · Shred',     desc:'Legato + púa alternada combinados' },
    { id:'sweep',     label:'⑥ Sweep Picking 2-3-4-5-6c',   desc:'Neoclásico — todas las formas de barrido' },
    { id:'tapping',   label:'⑦ Tapping Diatónico',          desc:'10as y 12as — extensiones imposibles' },
    { id:'targeting', label:'⑧ Targeting · Chord Tones',    desc:'Aterrizaje forzoso en tiempos fuertes' },
  ] : [
    { id:'thirds',    label:'① Línea Diatónica',            desc:'Fingerstyle — movimiento melódico' },
    { id:'3nps',      label:'② Posición Completa',          desc:'Mástil completo en bajo' },
    { id:'seq3',      label:'③ Secuencia de 3',             desc:'Grupos de tres notas' },
    { id:'seq4',      label:'④ Secuencia de 4',             desc:'Groove en semicorcheas' },
    { id:'walking',   label:'⑤ Walking Bass',               desc:'Root-3rd-5th-approach diatónico' },
    { id:'slap',      label:'⑥ Slap + Pop',                 desc:'S-P-ghost sobre estructura diatónica' },
    { id:'tapping',   label:'⑦ Thumb Tapping',              desc:'Extensiones en el bajo' },
    { id:'targeting', label:'⑧ Targeting',                  desc:'Chord tones en tiempo fuerte' },
  ];

  // Generate current exercise notes
  let notes = [];
  try {
    notes = buildExercise(ST.currentExercise, rMidi, ST.scale, midis, ST.instrument, ST.strings);
  } catch(e) { console.error('Exercise generation failed:', e); }

  const notation = renderNotation({
    notes, stringMidis: midis, instrument: ST.instrument,
    theme: ST.theme, currentBeat: playerCurrentBeat(),
    title: exercises.find(e=>e.id===ST.currentExercise)?.label || '',
  });

  container.innerHTML = `
    <!-- Exercise selector -->
    <div class="ex-selector">
      ${exercises.map(ex => `
        <button class="ex-sel-btn${ex.id===ST.currentExercise?' active':''}"
          data-ex="${ex.id}">
          <span class="ex-sel-label">${ex.label}</span>
          <span class="ex-sel-desc">${ex.desc}</span>
        </button>`).join('')}
    </div>

    <!-- Player controls -->
    <div class="player-bar">
      <div class="player-controls">
        <button class="player-btn" id="btnPlay" title="Play / Pausa">
          ${playerIsPlaying() ? '⏸' : '▶'}
        </button>
        <button class="player-btn" id="btnStop" title="Stop">⏹</button>
      </div>

      <div class="player-bpm">
        <span class="player-bpm-label">BPM</span>
        <input type="range" id="bpmSlider" min="20" max="240"
          value="${ST.bpm}" class="bpm-slider"/>
        <span class="player-bpm-val" id="bpmVal">${ST.bpm}</span>
      </div>

      <div class="player-toggles">
        <button class="player-toggle${ST.loop?' active':''}" id="btnLoop"
          title="Loop">🔁</button>
        <button class="player-toggle${ST.metronome?' active':''}" id="btnMetronome"
          title="Metrónomo">🥁</button>
      </div>

      <div class="player-status" id="playerStatus">
        ${ST.audioReady
          ? '<span class="status-ready">● Listo</span>'
          : '<button class="player-load-btn" id="btnLoadAudio">🎵 Cargar Audio</button>'}
      </div>
    </div>

    <!-- Notation -->
    <div class="notation-wrap">
      <div class="notation-scroll" id="notationSVG">
        ${notation}
      </div>
    </div>

    <!-- Legend -->
    <div class="notation-legend">
      <span>↓↑ Púa alternada</span>
      <span class="leg-h">h Hammer-on</span>
      <span class="leg-p">p Pull-off</span>
      <span class="leg-s">↓↓↓ Sweep</span>
      <span class="leg-t">T Tap</span>
      <span class="leg-b">b Bend</span>
      <span class="leg-v">~ Vibrato</span>
      <span class="leg-sl">S Slap</span>
      <span class="leg-po">P Pop</span>
      <span class="leg-pm">PM Palm mute</span>
    </div>`;

  // Bind exercise selector
  container.querySelectorAll('.ex-sel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      ST.currentExercise = btn.dataset.ex;
      playerStop();
      renderExerciseArea();
    });
  });

  // Bind player buttons
  document.getElementById('btnPlay')?.addEventListener('click', async () => {
    if (!ST.audioReady) {
      await loadAudio();
    }
    if (!ST.audioReady) return;
    if (playerIsPlaying()) {
      playerPause();
    } else {
      const notes = buildExercise(ST.currentExercise, rootMidi(), ST.scale, currentMidis(), ST.instrument, ST.strings);
      playerPlay(notes, currentMidis(), ST.bpm);
    }
    document.getElementById('btnPlay').textContent = playerIsPlaying() ? '⏸' : '▶';
  });

  document.getElementById('btnStop')?.addEventListener('click', () => {
    playerStop();
    document.getElementById('btnPlay').textContent = '▶';
    renderExerciseArea();
  });

  document.getElementById('bpmSlider')?.addEventListener('input', e => {
    ST.bpm = parseInt(e.target.value);
    document.getElementById('bpmVal').textContent = ST.bpm;
    playerSetBpm(ST.bpm);
  });

  document.getElementById('btnLoop')?.addEventListener('click', () => {
    ST.loop = !ST.loop;
    playerSetLoop(ST.loop);
    document.getElementById('btnLoop').classList.toggle('active', ST.loop);
  });

  document.getElementById('btnMetronome')?.addEventListener('click', () => {
    ST.metronome = !ST.metronome;
    playerSetMetronome(ST.metronome);
    document.getElementById('btnMetronome').classList.toggle('active', ST.metronome);
  });

  document.getElementById('btnLoadAudio')?.addEventListener('click', loadAudio);
}

/* ── Load audio ──────────────────────────── */
async function loadAudio() {
  const statusEl = document.getElementById('playerStatus');
  if (statusEl) statusEl.innerHTML = '<span class="status-loading">⏳ Cargando samples...</span>';
  const ok = await initAudio(ST.instrument);
  ST.audioReady = ok;
  if (statusEl) {
    statusEl.innerHTML = ok
      ? '<span class="status-ready">● Listo</span>'
      : '<span class="status-error">✗ Error — verifica conexión</span>';
  }
  if (ok) {
    // Set up beat sync for notation highlight
    playerOnBeatChange(beat => {
      const svg = document.getElementById('notationSVG');
      if (!svg) return;
      const notes = buildExercise(ST.currentExercise, rootMidi(), ST.scale, currentMidis(), ST.instrument, ST.strings);
      svg.innerHTML = renderNotation({
        notes, stringMidis: currentMidis(), instrument: ST.instrument,
        theme: ST.theme, currentBeat: beat,
        title: ST.currentExercise,
      });
    });
    playerOnEnd(() => {
      document.getElementById('btnPlay')?.textContent === '▶';
    });
  }
  return ok;
}

/* ── Interval + chord grid helpers ───────── */
function intervalTrack(notes, formula, degs) {
  let h = `<div class="itrack">`;
  notes.forEach((n,i) => {
    h += `<div class="inote"><div class="inote-n ${i===0?'root':'note'}">${n}</div>
      <div class="inote-d">${degs[i]||''}</div></div>`;
    if (i < formula.length) {
      const f = formula[i], cls = f==='S'?'semi':f==='T+S'?'tone3':'tone';
      h += `<div class="iarrow"><div class="iarrow-l ${cls}">${f}</div>
        <div class="iarrow-line"></div></div>`;
    }
  });
  h += `</div><div class="ilegend">
    <div class="ileg-i"><div class="ileg-dot" style="background:var(--tc1)"></div>T = Tono (2 semitonos)</div>
    <div class="ileg-i"><div class="ileg-dot" style="background:var(--tc2)"></div>S = Semitono (1 semitono)</div>
    ${formula.includes('T+S')?'<div class="ileg-i"><div class="ileg-dot" style="background:var(--tc3)"></div>T+S = Segunda Aumentada</div>':''}
  </div>`;
  return h;
}

function chordGrid(notes, key, root) {
  const s = SCALES[key], a = noteArray(root), ri = a.indexOf(root);
  let h = `<div class="cg">`;
  s.degs.forEach((deg,i) => {
    const cn = (s.cn[i]||[]).map(o=>a[(ri+o+120)%12]).join(' – ');
    const ex = DEG_EXPLAINED[deg]||{};
    h += `<div class="cc" data-dg="${i+1}">
      <div class="cc-deg"><span class="cc-roman">${deg}</span>
        <span class="cc-why">${ex.quality||''}</span></div>
      <div class="cc-name">${notes[i]||'?'}<sup>${s.ct[i]}</sup></div>
      <div class="cc-full">${s.cf[i]}</div>
      <div class="cc-notes">${cn}</div>
      ${ex.why?`<div class="cc-explain">${ex.why}</div>`:''}
    </div>`;
  });
  return h + `</div>`;
}

function degLegend(notes, key) {
  const s = SCALES[key];
  return `<div class="deg-legend">${s.degs.map((deg,i)=>
    `<div class="deg-chip"><div class="deg-dot" style="background:${DEG_COLORS[i]}"></div>
    <span class="deg-roman">${deg}</span><span class="deg-note">${notes[i]||'?'}</span></div>`
  ).join('')}</div>`;
}

function posBtns(key) {
  const s = SCALES[key], cnt = Math.min(s.degs.length,7);
  let h = `<button class="pos-btn all${ST.activePos==='all'?' active':''}" data-pos="all">Todas</button>`;
  for (let i=1;i<=cnt;i++)
    h += `<button class="pos-btn${ST.activePos===i?' active':''}" data-pos="${i}">Pos ${i} · ${s.degs[i-1]||''}</button>`;
  return h;
}

function sessionStrip() {
  return `<div class="sstrip">
    <div class="sseg s1"><span class="sseg-t">0–15 min</span>Calentamiento Armónico</div>
    <div class="sseg s2"><span class="sseg-t">15–35 min</span>Mapeo 3NPS</div>
    <div class="sseg s3"><span class="sseg-t">35–50 min</span>Arpegios Diatónicos</div>
    <div class="sseg s4"><span class="sseg-t">50–65 min</span>Secuenciación</div>
    <div class="sseg s5"><span class="sseg-t">65–75 min</span>Targeting</div>
  </div>`;
}

function renderProgs(key, root) {
  const s = SCALES[key], notes = getScaleNotes(root, key), progs = s.progs||[];
  if (!progs.length) return `<div class="tbox tbox--s"><div class="tbox-ico">🎵</div>
    <div><div class="tbox-lbl">Progresiones</div>
    <div class="tbox-txt">Esta escala se usa como herramienta de color.</div></div></div>`;

  let h = `<div class="tbox tbox--o" style="margin-bottom:20px">
    <div class="tbox-ico">📖</div><div>
    <div class="tbox-lbl">Por qué mayúscula o minúscula</div>
    <div class="tbox-txt"><strong>Mayúscula (I,IV,V) = acorde mayor · minúscula (i,iv,v) = acorde menor · ° = disminuido · b = bemol · # = sostenido.</strong><br>
    El número indica la distancia desde la tónica. Así: <strong>bVII</strong> = acorde mayor cuya raíz está un semitono abajo del 7mo grado.</div>
    </div></div><div class="prog-grid">`;

  progs.forEach(p => {
    const chords = p.degs.map((di,ni) => {
      const isRoot = di===0;
      return `<div class="prog-chord-wrap">
        <span class="prog-chord${isRoot?' root-chord':''}">${notes[di]||'?'}<sup>${s.ct[di]||''}</sup></span>
        <span class="prog-deg">${s.degs[di]||''}</span>
      </div>${ni<p.degs.length-1?'<span class="prog-arrow">→</span>':''}`;
    }).join('');
    h += `<div class="prog-card">
      <div class="prog-card-name">${p.name}</div>
      <div class="prog-chords">${chords}</div>
      <div class="prog-why">${p.why}</div>
      <div class="prog-genre">🎸 ${p.genre}</div>
    </div>`;
  });
  h += `</div>`;
  if (ST.instrument==='bass'&&s.bassApply)
    h += `<div class="tbox tbox--a" style="margin-top:14px"><div class="tbox-ico">🎸</div>
      <div><div class="tbox-lbl">Aplicación para Bajo</div>
      <div class="tbox-txt">${s.bassApply}</div></div></div>`;
  h += `<div class="tbox tbox--o" style="margin-top:14px"><div class="tbox-ico">💡</div>
    <div><div class="tbox-lbl">Cómo usar estas progresiones</div>
    <div class="tbox-txt">Toca la progresión con acordes completos primero. Luego practica el Targeting usando la escala de <strong>${root} ${s.name}</strong>.</div></div></div>`;
  return h;
}

/* ── Main render ─────────────────────────── */
export function renderAll() {
  const s      = SCALES[ST.scale];
  const notes  = getScaleNotes(ST.root, ST.scale);
  const midis  = currentMidis();
  const strNames = getStringNames(midis);
  const rMidi  = rootMidi();
  const fbSVG  = renderFretboard({
    stringMidis: midis, rootMidi: rMidi,
    scaleKey: ST.scale, scaleDefs: s,
    activePos: ST.activePos, theme: ST.theme, fbMode: ST.fbMode,
  });

  document.getElementById('scaleContent').innerHTML = `
    <div class="sh">
      <div class="sh-name">${ST.root} <span>${s.name}</span></div>
      <div class="sh-meta">
        <div class="sh-type">${s.mode}</div>
        <div class="sh-desc">${s.sound.split('.')[0]}.</div>
      </div>
      <div class="sh-right">
        <div class="sh-notes">${notes.join(' – ')}</div>
        <div class="sh-tuning">🎸 ${INSTRUMENTS[ST.instrument].label} · ${ST.strings}c · ${strNames.join('-')}</div>
      </div>
    </div>

    ${sessionStrip()}

    <div class="ctabs" id="ctabs">
      <button class="ctab${ST.activeTab===0?' active':''}" data-t="0">📐 Teoría & Acordes</button>
      <button class="ctab${ST.activeTab===1?' active':''}" data-t="1">🎸 Mapa 3NPS</button>
      <button class="ctab${ST.activeTab===2?' active':''}" data-t="2">🏋️ Ejercicios</button>
      <button class="ctab${ST.activeTab===3?' active':''}" data-t="3">🎶 Progresiones</button>
    </div>

    <!-- TAB 0: TEORÍA + ACORDES -->
    <div class="tpanel${ST.activeTab===0?' active':''}" id="t0">
      <div class="slbl">Fórmula de Intervalos</div>
      <div class="stitle">${ST.root} ${s.name}</div>
      <div class="ssub">Cada flecha = distancia entre notas consecutivas.
        <strong>T = Tono (2 semitonos) · S = Semitono (1 semitono)</strong>.</div>
      ${intervalTrack(notes, s.formula, s.degs)}
      <div class="div"></div>
      <div class="tbox tbox--o"><div class="tbox-ico">🧱</div><div>
        <div class="tbox-lbl">De dónde sale</div>
        <div class="tbox-txt">${s.origin}</div></div></div>
      <div class="tbox tbox--s"><div class="tbox-ico">👂</div><div>
        <div class="tbox-lbl">Cómo suena y por qué</div>
        <div class="tbox-txt">${s.sound}</div></div></div>
      <div class="tbox tbox--a"><div class="tbox-ico">🎯</div><div>
        <div class="tbox-lbl">${ST.instrument==='bass'?'Aplicación para bajo':'Cuándo y sobre qué usarla'}</div>
        <div class="tbox-txt">${ST.instrument==='bass'?s.bassApply:s.apply}</div></div></div>
      <div class="div"></div>
      <div class="slbl">Acordes Diatónicos</div>
      <div class="stitle">Tétradas en ${ST.root} ${s.name}</div>
      <div class="ssub"><strong>Mayúscula = mayor · minúscula = menor · ° = disminuido · b = bemol · # = sostenido.</strong></div>
      ${chordGrid(notes, ST.scale, ST.root)}
    </div>

    <!-- TAB 1: MAPA 3NPS -->
    <div class="tpanel${ST.activeTab===1?' active':''}" id="t1">
      <div class="slbl">Sistema 3 Notas Por Cuerda</div>
      <div class="stitle">Diapasón Completo — ${ST.root} ${s.name}</div>
      <div class="ssub">Trastes 0–22. <strong>Punto con anillo:</strong> tónica.
        <strong>Brillante:</strong> posición activa. <strong>Tenue:</strong> resto.</div>
      ${degLegend(notes, ST.scale)}
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:10px">
        <div class="pos-label" style="margin-bottom:0">Seleccionar Posición 3NPS</div>
        <div class="fb-mode-toggle">
          <button class="fb-mode-btn${ST.fbMode==='notes'?' active':''}" id="fbModeNotes">🎵 Notas</button>
          <button class="fb-mode-btn${ST.fbMode==='degrees'?' active':''}" id="fbModeDegrees">📐 Grados</button>
        </div>
      </div>
      <div class="pos-btns" id="posBtns">${posBtns(ST.scale)}</div>
      <div class="fb-wrap">
        <div class="fb-header">
          <span class="fb-title" id="fbTitle">
            ${ST.activePos==='all'?`Todas las posiciones — ${ST.root} ${s.name}`:`Posición ${ST.activePos} — ${ST.root} ${s.name}`}
          </span>
          <span class="bdg bdg-mode">${s.mode}</span>
          <span class="bdg bdg-key">${ST.root} · ${ST.strings}c</span>
        </div>
        <div class="fb-scroll"><div id="fb-svg">${fbSVG}</div></div>
        <div class="fb-footer">
          <span class="tabn"><strong>Anillo morado:</strong> Tónica (${ST.root})</span>
          <span class="tabn"><strong>3NPS:</strong> ${s.nps3}</span>
        </div>
      </div>
    </div>

    <!-- TAB 2: EJERCICIOS -->
    <div class="tpanel${ST.activeTab===2?' active':''}" id="t2">
      <div class="slbl">Ejercicios de Sesión</div>
      <div class="stitle">Reproductor — ${ST.root} ${s.name} · ${INSTRUMENTS[ST.instrument].label}</div>
      <div class="ssub">Pentagrama + tablatura sincronizados. Ajusta el BPM para practicar despacio y subir gradualmente.</div>
      <div id="exerciseContainer"></div>
    </div>

    <!-- TAB 3: PROGRESIONES -->
    <div class="tpanel${ST.activeTab===3?' active':''}" id="t3">
      <div class="slbl">Progresiones Diatónicas</div>
      <div class="stitle">Progresiones en ${ST.root} ${s.name}</div>
      <div class="ssub">Por qué funcionan armónicamente y cómo leer los grados.</div>
      ${renderProgs(ST.scale, ST.root)}
    </div>`;

  // Bind tabs
  document.querySelectorAll('.ctab').forEach(t => t.addEventListener('click', () => {
    ST.activeTab = parseInt(t.dataset.t);
    document.querySelectorAll('.ctab').forEach(x => x.classList.toggle('active', x===t));
    document.querySelectorAll('.tpanel').forEach(p => p.classList.toggle('active', p.id===`t${ST.activeTab}`));
    if (ST.activeTab === 2) renderExerciseArea();
  }));

  // Bind position buttons
  document.querySelectorAll('.pos-btn').forEach(b => b.addEventListener('click', () => {
    ST.activePos = b.dataset.pos==='all' ? 'all' : parseInt(b.dataset.pos);
    document.querySelectorAll('.pos-btn').forEach(x => x.classList.toggle('active', x===b));
    const ti = document.getElementById('fbTitle');
    if (ti) ti.textContent = ST.activePos==='all'
      ? `Todas las posiciones — ${ST.root} ${s.name}`
      : `Posición ${ST.activePos} (${s.degs[(ST.activePos-1)%s.degs.length]}) — ${ST.root} ${s.name}`;
    renderFBOnly();
  }));

  // Bind fretboard mode toggle
  ['fbModeNotes','fbModeDegrees'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      ST.fbMode = id==='fbModeNotes' ? 'notes' : 'degrees';
      document.querySelectorAll('.fb-mode-btn').forEach(b =>
        b.classList.toggle('active',
          (ST.fbMode==='notes'&&b.id==='fbModeNotes')||(ST.fbMode==='degrees'&&b.id==='fbModeDegrees')
        )
      );
      renderFBOnly();
    });
  });

  // Render exercise area if on that tab
  if (ST.activeTab === 2) renderExerciseArea();
}

/* ── Init ────────────────────────────────── */
export function init() {
  renderStrings();
  renderTuning();
  renderRoot();
  renderAll();
}
