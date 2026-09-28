/* ═══════════════════════════════════════════
   app.js — Main controller
   Blackout Studio · SIPO Guitar · Iteración 2
═══════════════════════════════════════════ */

import { SCALES, ROOT_LABELS, ROOT_VALS, DEG_COLORS, DEG_EXPLAINED,
         noteArray, getScaleNotes, getScaleSemitones } from './scales.js';
import { INSTRUMENTS, CHROMATIC, OCTAVES, midiToNote, noteToMidi,
         getStringMidis, getDefaultCustom, getStringNames } from './tuning.js';
import { renderFretboard } from './fretboard.js';


/* ── State ───────────────────────────────── */
const ST = {
  theme:'dark', instrument:'guitar', strings:6,
  tuningKey:'standard', customMidis:null,
  scale:'major', root:'A',
  activePos:'all', activeTab:0, fbMode:'notes',
  bpm: 80, currentExercise: 'thirds',
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

/* ── Exercise area — MuseScore embeds ────── */
function renderExerciseArea() {
  const container = document.getElementById('exerciseContainer');
  if(!container) return;
  const isGuitar = ST.instrument === 'guitar';

  const exercises = isGuitar ? [
    { id:'thirds',    label:'① Terceras Diatónicas',
      desc:'Dos notas separadas por una tercera diatónica, todas las cuerdas. Púa alternada estricta ↓↑. El calentamiento fundamental.',
      bpm:'60–80', tech:'Púa alternada' },
    { id:'3nps',      label:'② 3NPS Posición Completa',
      desc:'Escala completa 3 notas por cuerda. Ascendente ↓↑↓, descendente ↑↓↑, luego sube 2 cuerdas y baja 1.',
      bpm:'60→120', tech:'Púa ↓↑↓ por cuerda' },
    { id:'seq3',      label:'③ Secuencia de 3',
      desc:'Patrón 1-2-3, 2-3-4, 3-4-5... Tresillos cruzando cuerdas. Ascendente y descendente.',
      bpm:'60–100', tech:'Tresillos · Alt. picking' },
    { id:'seq4',      label:'④ Secuencia de 4',
      desc:'Grupos de 4 notas en semicorcheas. Patrón no lineal: sube 4, baja 2. Toda la posición.',
      bpm:'60–120', tech:'↓↑↓↑ por grupo' },
    { id:'seq6',      label:'⑤ Secuencia de 6 · Shred',
      desc:'Patrón 1-2-3-2-1-2 con púa alternada. Variante legato: solo se púa la primera nota de cada 6.',
      bpm:'50–140', tech:'Alt. picking + Legato' },
    { id:'sweep',     label:'⑥ Sweep Picking 2-3-4-5-6c',
      desc:'Arpegios de tétrada en barrido sobre I, IV, V. Sweep neoclásico ↓↓↓ sube / ↑↑↑ baja + hammer-on en cima.',
      bpm:'50–80', tech:'Sweep + h-p' },
    { id:'tapping',   label:'⑦ Tapping Diatónico',
      desc:'Mano izquierda trastes 5-9 (dedos 1 y 3). Tap mano derecha trastes 12-17. Intervalos de 10ª y 12ª. Patrón: ↓ h T p.',
      bpm:'70–100', tech:'↓ h T p' },
    { id:'targeting', label:'⑧ Targeting · Chord Tones',
      desc:'Frase libre sobre i–IV–V–i. OBLIGATORIO: chord tone (raíz, 3ra o 5ta) en beat 1 y beat 3 de cada compás. El ejercicio más importante.',
      bpm:'80–120', tech:'Libre — chord tones en beats fuertes' },
  ] : [
    { id:'walking',   label:'① Walking Bass',
      desc:'Root beat 1, 3ra beat 2, 5ta beat 3, aproximación cromática beat 4. Sobre I–IV–V–I.',
      bpm:'80–120', tech:'Fingerstyle' },
    { id:'slap',      label:'② Slap + Pop',
      desc:'S en raíz, S en octava, P en quinta, ghost muted. Estructura diatónica.',
      bpm:'90–120', tech:'Slap · Pop · Ghost' },
    { id:'thirds',    label:'③ Línea Diatónica',
      desc:'Terceras diatónicas en movimiento melódico por el mástil.',
      bpm:'60–90', tech:'Fingerstyle' },
    { id:'seq4',      label:'④ Groove Semicorcheas',
      desc:'Grupos de 4 notas. Groove preciso, desplazamiento de posición.',
      bpm:'70–100', tech:'Fingerstyle' },
    { id:'targeting', label:'⑤ Targeting',
      desc:'Chord tones en tiempo fuerte sobre progresión real.',
      bpm:'80–120', tech:'Libre' },
    { id:'tapping',   label:'⑥ Thumb Tapping',
      desc:'Pulgar en raíz (bajo), tap índice derecho en octava/quinta alta.',
      bpm:'60–90', tech:'Pulgar + Tap' },
  ];

  const activeEx = exercises.find(e=>e.id===ST.currentExercise)||exercises[0];
  const savedUrl = sessionStorage.getItem(`ms_${ST.scale}_${ST.root}_${ST.currentExercise}`)||'';

  container.innerHTML = `
    <div class="ex-tabs">
      ${exercises.map(ex=>`
        <button class="ex-tab-btn${ex.id===ST.currentExercise?' active':''}"
          data-ex="${ex.id}">${ex.label}</button>`).join('')}
    </div>

    <div class="ex-panel">
      <div class="ex-panel-header">
        <div class="ex-panel-meta">
          <span class="bdg bdg-mode">BPM: ${activeEx.bpm}</span>
          <span class="bdg bdg-key">${activeEx.tech}</span>
        </div>
        <div class="ex-panel-desc">${activeEx.desc}</div>
      </div>

      <div class="ms-input-row">
        <div class="ms-input-label">📎 URL del score en MuseScore.com</div>
        <div class="ms-input-group">
          <input type="url" class="ms-url-input" id="msUrlInput"
            placeholder="https://musescore.com/user/tu-usuario/scores/tu-score"
            value="${savedUrl}"/>
          <button class="ms-embed-btn" id="msEmbedBtn">Cargar</button>
        </div>
        <div class="ms-input-hint">Importa el MusicXML a MuseScore → edita → sube a musescore.com → pega el link aquí</div>
      </div>

      <div class="ms-embed-area" id="msEmbedArea">
        ${savedUrl ? buildMsEmbed(savedUrl) : buildUploadSlot(ST.currentExercise)}
      </div>

      <div class="bpm-ref-bar">
        <span class="bpm-ref-label">Referencia BPM</span>
        <input type="range" class="bpm-slider" id="bpmRef" min="20" max="240" value="${ST.bpm}"/>
        <span class="bpm-ref-val" id="bpmRefVal">${ST.bpm}</span>
        <span class="bpm-ref-hint">Empieza lento, sube cuando el patrón esté limpio</span>
      </div>
    </div>`;

  container.querySelectorAll('.ex-tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{ ST.currentExercise=btn.dataset.ex; renderExerciseArea(); });
  });

  document.getElementById('msEmbedBtn')?.addEventListener('click',()=>{
    const url=(document.getElementById('msUrlInput')?.value||'').trim();
    if(!url) return;
    sessionStorage.setItem(`ms_${ST.scale}_${ST.root}_${ST.currentExercise}`,url);
    document.getElementById('msEmbedArea').innerHTML=buildMsEmbed(url);
  });

  document.getElementById('msUrlInput')?.addEventListener('keydown',e=>{
    if(e.key==='Enter') document.getElementById('msEmbedBtn')?.click();
  });

  document.getElementById('bpmRef')?.addEventListener('input',e=>{
    ST.bpm=parseInt(e.target.value);
    document.getElementById('bpmRefVal').textContent=ST.bpm;
  });

  container.querySelectorAll('.ms-img-input').forEach(inp=>{
    inp.addEventListener('change',e=>loadImg(e.target,e.target.dataset.target));
  });
}

function buildMsEmbed(url){
  const embedUrl=url.includes('/embed')?url:url.replace(/\/?$/,'')+'/embed';
  return `<iframe src="${embedUrl}" width="100%" height="480" frameborder="0"
    allowfullscreen allow="autoplay; fullscreen"
    style="border-radius:8px;display:block"></iframe>`;
}

function buildUploadSlot(exId){
  return `<div class="ms-upload-area">
    <div class="ms-upload-icon">🎼</div>
    <div class="ms-upload-title">Sube el score a MuseScore.com y pega el link arriba</div>
    <div class="ms-upload-sub">O exporta como imagen desde MuseScore y súbela aquí</div>
    <label class="ms-img-label">
      <input type="file" class="ms-img-input" accept="image/*" data-target="ms-img-${exId}"/>
      📸 Subir imagen (PNG/JPG)
    </label>
    <div id="ms-img-${exId}" style="margin-top:10px"></div>
  </div>`;
}

function loadImg(inp,targetId){
  if(!inp.files||!inp.files[0])return;
  const r=new FileReader();
  r.onload=e=>{
    const el=document.getElementById(targetId);
    if(el) el.innerHTML=`<img src="${e.target.result}" style="width:100%;border-radius:8px"/>`;
  };
  r.readAsDataURL(inp.files[0]);
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
