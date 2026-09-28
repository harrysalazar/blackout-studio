/* ═══════════════════════════════════════════
   exercises.js — Exercise generator v3
   Blackout Studio · SIPO Guitar

   Philosophy: Each exercise = a clean 4-measure
   pattern. Short, readable, musically valid.
   Fret range: 5-14. No open strings.
   Tapping: LH 5-9, RH tap 12-17.
═══════════════════════════════════════════ */

import { getScaleSemitones, SCALES } from './scales.js';

// ── Get scale notes on neck, sorted by pitch ──
function scaleDots(rootMidi, semis, stringMidis, minF=5, maxF=14){
  const rc = rootMidi % 12;
  const out = [];
  stringMidis.forEach((base, si) => {
    for(let f = minF; f <= maxF; f++){
      const rel = ((base + f) - rc + 120) % 12;
      if(semis.includes(rel))
        out.push({ midi: base+f, fret: f, string: si,
          rel, degIdx: semis.indexOf(rel) });
    }
  });
  return out.sort((a,b) => a.midi - b.midi);
}

// ── Position: 3 notes per string starting at anchor ──
function positionNotes(rootMidi, semis, stringMidis, anchor=5){
  const rc  = rootMidi % 12;
  const out = [];
  stringMidis.forEach((base, si) => {
    let n = 0;
    for(let f = Math.max(anchor-1,5); f <= anchor+6 && n < 3; f++){
      const rel = ((base+f)-rc+120)%12;
      if(semis.includes(rel)){
        out.push({ midi:base+f, fret:f, string:si,
          rel, degIdx:semis.indexOf(rel) });
        n++;
      }
    }
  });
  return out.sort((a,b) => a.string - b.string || a.fret - b.fret);
}

// ── Find anchor fret for root on low string ──
function rootAnchor(rootMidi, stringMidis){
  const rc   = rootMidi % 12;
  const base = stringMidis[0] % 12;
  for(let f = 5; f <= 14; f++)
    if((base+f)%12 === rc) return f;
  return 7;
}

// ── Build a note object ──────────────────────
function N(dot, dur, beat, tech=null, pick=null, finger=null){
  return { ...dot, dur, beat, measure: Math.floor(beat/4),
    technique: tech, pick, finger: finger || ([1,2,3,4][dot.degIdx%4]||1) };
}

/* ════════════════════════════════════════════
   BLOCK 1 — Diatonic Thirds (4 measures)
   Pattern: two-note intervals ascending then desc
════════════════════════════════════════════ */
export function generateThirds(rootMidi, scaleKey, stringMidis){
  const semis  = getScaleSemitones(scaleKey);
  const anchor = rootAnchor(rootMidi, stringMidis);
  const pos    = positionNotes(rootMidi, semis, stringMidis, anchor);

  // Take first two strings for clarity
  const str0 = pos.filter(n => n.string === 0).slice(0, 3);
  const str1 = pos.filter(n => n.string === 1).slice(0, 3);
  if(str0.length < 3 || str1.length < 2) return [];

  const notes = []; let beat = 0;

  // Measure 1: Ascending thirds on strings 1-2
  // Each pair = one scale note + the note a third above it
  for(let i = 0; i < 3; i++){
    const n1 = str0[i];
    const n2 = str1[Math.min(i, str1.length-1)];
    notes.push(N(n1, 'e', beat, null, 'down', i+1)); beat += 0.5;
    notes.push(N(n2, 'e', beat, null, 'up',   i+1)); beat += 0.5;
  }
  // Rest of measure 1 - two more pairs
  const str2 = pos.filter(n => n.string === 2).slice(0,2);
  if(str2.length >= 1){
    notes.push(N(str1[str1.length-1],'e',beat,null,'down')); beat+=0.5;
    notes.push(N(str2[0],'e',beat,null,'up')); beat+=0.5;
  }

  // Measure 2: Descending thirds
  const str3 = pos.filter(n=>n.string===3).slice(0,3);
  const hi   = [...str2, ...str1, ...str0].reverse();
  for(let i=0;i<4&&i<hi.length-1;i++){
    notes.push(N(hi[i],  'e', beat, null, 'up')); beat+=0.5;
    notes.push(N(hi[i+1],'e', beat, null, 'down')); beat+=0.5;
  }

  // Measure 3: Skip pattern (1-3-2-4) with 16ths
  const all4 = [...str0,...str1].slice(0,6);
  [0,2,1,3,0,2,1,3].forEach((idx,j)=>{
    const n = all4[idx % all4.length];
    if(n) notes.push(N(n,'s',beat,null,j%2?'up':'down'));
    beat+=0.25;
  });

  // Measure 4: Resolve to root
  const rootNote = pos.find(n=>n.rel===0) || str0[0];
  const third    = pos.find(n=>n.rel===semis[2])||str1[0];
  const fifth    = pos.find(n=>n.rel===semis[4])||str0[2];
  [rootNote,third,fifth,rootNote].forEach((n,i)=>{
    if(n) notes.push(N(n, i===3?'h':'q', beat, i===3?'~':null));
    beat += i===3 ? 2 : 1;
  });

  return notes;
}

/* ════════════════════════════════════════════
   BLOCK 2 — 3NPS Ascending + Descending (4 msr)
════════════════════════════════════════════ */
export function generate3NPS(rootMidi, scaleKey, stringMidis){
  const semis  = getScaleSemitones(scaleKey);
  const anchor = rootAnchor(rootMidi, stringMidis);
  const pos    = positionNotes(rootMidi, semis, stringMidis, anchor);
  if(pos.length < 6) return [];

  const notes  = []; let beat = 0; let pick = true;

  // Measures 1-2: Ascending (all strings, 16ths)
  pos.forEach(n => {
    notes.push(N(n, 's', beat, null, pick?'down':'up'));
    beat += 0.25; pick = !pick;
  });
  // Pad to measure boundary
  while(beat % 4 !== 0){ beat += 0.25; }

  // Measures 3-4: Descending
  [...pos].reverse().forEach(n => {
    notes.push(N(n,'s',beat,null,pick?'up':'down'));
    beat+=0.25; pick=!pick;
  });
  while(beat%4!==0){ beat+=0.25; }

  return notes;
}

/* ════════════════════════════════════════════
   BLOCK 3 — Sequence of 3 (4 measures)
   Pattern: 1-2-3, 2-3-4, 3-4-5 (triplets)
════════════════════════════════════════════ */
export function generateSeq3(rootMidi, scaleKey, stringMidis){
  const semis  = getScaleSemitones(scaleKey);
  const anchor = rootAnchor(rootMidi, stringMidis);
  const pos    = positionNotes(rootMidi, semis, stringMidis, anchor);
  if(pos.length < 6) return [];

  const notes = []; let beat = 0;

  // Measures 1-2: Ascending groups of 3 (triplets)
  for(let i = 0; i < pos.length-2 && beat < 8; i++){
    [pos[i], pos[i+1], pos[i+2]].forEach((n,j) => {
      const tech = (j===2 && n.string !== pos[i].string) ? 'h' : null;
      notes.push(N(n,'t',beat,tech,j===0?'down':null));
      beat += 1/3;
    });
  }
  while(beat%4>0.01){ beat+=1/3; } // align

  // Measures 3-4: Descending groups of 3
  const rev = [...pos].reverse();
  for(let i = 0; i < rev.length-2 && beat < 16; i++){
    [rev[i],rev[i+1],rev[i+2]].forEach((n,j) => {
      const tech = j===2&&n.string!==rev[i].string?'p':null;
      notes.push(N(n,'t',beat,tech,j===0?'up':null));
      beat+=1/3;
    });
  }

  return notes;
}

/* ════════════════════════════════════════════
   BLOCK 4 — Sequence of 4 (4 measures, 16ths)
   Pattern: 1-2-3-4, 2-3-4-5, up 4 back 2
════════════════════════════════════════════ */
export function generateSeq4(rootMidi, scaleKey, stringMidis){
  const semis  = getScaleSemitones(scaleKey);
  const anchor = rootAnchor(rootMidi, stringMidis);
  const pos    = positionNotes(rootMidi, semis, stringMidis, anchor);
  if(pos.length < 7) return [];

  const notes = []; let beat = 0; let pick = true;

  // Measures 1-2: Groups of 4 ascending
  for(let i = 0; i < pos.length-3 && beat < 8; i++){
    [pos[i],pos[i+1],pos[i+2],pos[i+3]].forEach(n => {
      notes.push(N(n,'s',beat,null,pick?'down':'up'));
      beat+=0.25; pick=!pick;
    });
  }
  while(beat%4>0.01){ beat+=0.25; pick=!pick; }

  // Measures 3-4: Up 4 back 2 (non-linear)
  for(let i = 0; i < pos.length-5 && beat < 16; i+=2){
    [pos[i],pos[i+1],pos[i+2],pos[i+3],
     pos[i+2],pos[i+1]].forEach(n => {
      if(!n) return;
      notes.push(N(n,'s',beat,null,pick?'down':'up'));
      beat+=0.25; pick=!pick;
    });
  }

  return notes;
}

/* ════════════════════════════════════════════
   BLOCK 5 — Sequence of 6 / Shred (4 measures)
   Pattern: 1-2-3-2-1-2 (legato + pick)
════════════════════════════════════════════ */
export function generateSeq6(rootMidi, scaleKey, stringMidis){
  const semis  = getScaleSemitones(scaleKey);
  const anchor = rootAnchor(rootMidi, stringMidis);
  const pos    = positionNotes(rootMidi, semis, stringMidis, anchor);
  if(pos.length < 5) return [];

  const notes = []; let beat = 0;

  // Measures 1-2: Alternate picking groups of 6
  for(let i = 0; i < pos.length-2 && beat < 8; i++){
    const grp = [pos[i],pos[i+1],pos[i+2],pos[i+1],pos[i],pos[i+1]];
    grp.forEach((n,j) => {
      notes.push(N(n,'s',beat,
        j===1?'h':j===3||j===4?'p':null,
        j===0?'down':null));
      beat+=0.25;
    });
  }
  while(beat%4>0.01){ beat+=0.25; }

  // Measures 3-4: Legato only (pick first of each 6)
  for(let i = 0; i < pos.length-5 && beat < 16; i++){
    const grp=[pos[i],pos[i+1],pos[i+2],pos[i+3],pos[i+2],pos[i+1]];
    grp.forEach((n,j) => {
      notes.push(N(n,'s',beat,j===0?null:j<3?'h':'p',j===0?'down':null));
      beat+=0.25;
    });
  }

  return notes;
}

/* ════════════════════════════════════════════
   BLOCK 6 — Sweep Picking (4 measures)
   2-3-4-5-6 string arpeggios, neoclassical
════════════════════════════════════════════ */
export function generateSweep(rootMidi, scaleKey, stringMidis, stringCount){
  const semis = getScaleSemitones(scaleKey);
  const s     = SCALES[scaleKey];
  const rc    = rootMidi % 12;
  const notes = []; let beat = 0;

  // Use I, IV, V degrees for classic neoclassical movement
  const mainDegs = [0, Math.min(3, s.degs.length-1), Math.min(4, s.degs.length-1)];

  mainDegs.forEach(degIdx => {
    const cSemis = [0,2,4,6].map(st => semis[(degIdx+st)%semis.length]);

    // Try each string count from high to low
    [Math.min(stringCount,6), 5, 4, 3, 2].forEach(sc => {
      if(sc > stringMidis.length || beat >= 16) return;
      const strSlice = stringMidis.slice(0, sc);
      const voicing  = buildVoicing(rc, cSemis, semis, strSlice, sc);
      if(voicing.length < 2) return;

      // Ascending sweep
      voicing.forEach((n, i) => {
        const isTop = i === voicing.length-1;
        notes.push(N({...n, string:n.string},'s',beat,
          isTop?'h':'sweep_d', i===0?'down':null));
        beat+=0.25;
      });

      // Descending sweep
      [...voicing].reverse().forEach((n, i) => {
        notes.push(N({...n, string:n.string},'s',beat,
          i===0?'p':'sweep_u', i===0?'up':null));
        beat+=0.25;
      });
    });
  });

  // Fill to 4 measures
  while(beat%4!==0&&notes.length>0){
    const last=notes[notes.length-1];
    notes.push(N(last,'s',beat,null,null)); beat+=0.25;
  }

  return notes;
}

function buildVoicing(rc, chordSemis, scaleSemis, strMidis, maxStr){
  const v=[]; let prevFret=5;
  for(let si=0;si<strMidis.length&&v.length<maxStr;si++){
    const base=strMidis[si];
    for(let f=Math.max(prevFret-2,5);f<=14;f++){
      const rel=((base+f)-rc+120)%12;
      if(chordSemis.includes(rel)){
        v.push({midi:base+f,fret:f,string:si,rel,degIdx:scaleSemis.indexOf(rel)});
        prevFret=f; break;
      }
    }
  }
  return v;
}

/* ════════════════════════════════════════════
   BLOCK 7 — Tapping (4 measures)
   LH: frets 5-9, RH tap: frets 12-17
════════════════════════════════════════════ */
export function generateTapping(rootMidi, scaleKey, stringMidis){
  const semis = getScaleSemitones(scaleKey);
  const rc    = rootMidi % 12;
  const notes = []; let beat = 0;

  // Work on strings 0-3 (avoid the highest, easier to tap on middle strings)
  const workStrings = stringMidis.slice(0, Math.min(4, stringMidis.length));

  workStrings.forEach((base, si) => {
    if(beat >= 16) return;

    // Left hand: first two scale notes in fret 5-9
    const lh = [];
    for(let f=5; f<=10&&lh.length<2; f++){
      const rel=((base+f)-rc+120)%12;
      if(semis.includes(rel)) lh.push({fret:f,rel,degIdx:semis.indexOf(rel)});
    }
    // Tap: scale note in fret 12-17 (chord tone preferred)
    const tapList=[];
    for(let f=12;f<=17;f++){
      const rel=((base+f)-rc+120)%12;
      if(semis.includes(rel)) tapList.push({fret:f,rel,degIdx:semis.indexOf(rel)});
    }

    if(lh.length<2||tapList.length<1) return;

    const n1  = lh[0], n2 = lh[1], tap = tapList[0];
    const make = (dot,f) => ({midi:base+f,fret:f,string:si,rel:dot.rel,degIdx:dot.degIdx});

    // One repetition of the tap pattern per string
    // ↓ pick → h → T (tap) → p → p (two pull-offs back)
    const pattern = [
      {...make(n1,n1.fret),  dur:'s', technique:null,  pick:'down', finger:1},
      {...make(n2,n2.fret),  dur:'s', technique:'h',   pick:null,   finger:3},
      {...make(tap,tap.fret),dur:'s', technique:'tap',  pick:null,   finger:'T'},
      {...make(n2,n2.fret),  dur:'s', technique:'p',   pick:null,   finger:3},
    ];

    pattern.forEach(n => {
      notes.push({...n, beat, measure:Math.floor(beat/4)});
      beat+=0.25;
    });

    // Repeat the pattern once more on the same string
    pattern.forEach(n => {
      notes.push({...n, beat, measure:Math.floor(beat/4)});
      beat+=0.25;
    });
  });

  return notes;
}

/* ════════════════════════════════════════════
   BLOCK 8 — Targeting (4 measures)
   Improvised phrase landing on chord tones
   on beats 1 and 3
════════════════════════════════════════════ */
export function generateTargeting(rootMidi, scaleKey, stringMidis){
  const semis  = getScaleSemitones(scaleKey);
  const s      = SCALES[scaleKey];
  const notes  = []; let beat = 0;

  // 4 chord changes, 1 measure each: I IV V I
  const progDegs = [0,
    Math.min(3,s.degs.length-1),
    Math.min(4,s.degs.length-1),
    0];

  progDegs.forEach(degIdx => {
    const chordRoot  = semis[degIdx];
    const chordThird = semis[(degIdx+2)%semis.length];
    const chordFifth = semis[(degIdx+4)%semis.length];

    // All scale notes in comfortable zone
    const all = scaleDots(rootMidi, semis, stringMidis, 5, 14);

    // Target note 1: root of chord on beat 1 (midrange string)
    const rootNotes  = all.filter(n=>n.rel===chordRoot&&n.string>=1&&n.string<=3);
    const target1    = rootNotes[Math.floor(rootNotes.length/2)] || all.find(n=>n.rel===chordRoot);

    // Approach: 3 scale notes leading up to target1
    const approach = all.filter(n =>
      n.midi < (target1?.midi||60) &&
      n.midi >= (target1?.midi||60)-5
    ).slice(-3);

    approach.forEach(n => {
      notes.push(N(n,'s',beat,null,'down')); beat+=0.25;
    });

    // Beat 1: TARGET (root of chord) + vibrato
    if(target1){
      notes.push({...N(target1,'q',beat,'~',null), isTarget:true}); beat+=1;
    }

    // Beats 2-2.5: Scale movement
    const fill1 = all.filter(n=>n.midi>(target1?.midi||60)&&n.midi<=(target1?.midi||60)+5).slice(0,2);
    fill1.forEach(n=>{ notes.push(N(n,'s',beat,null,'down')); beat+=0.25; });

    // Beat 3: TARGET (fifth of chord)
    const fifthNotes = all.filter(n=>n.rel===chordFifth&&n.string>=1&&n.string<=3);
    const target2    = fifthNotes[Math.floor(fifthNotes.length/2)] || all.find(n=>n.rel===chordFifth);
    if(target2){
      notes.push({...N(target2,'e',beat,'~',null), isTarget:true}); beat+=0.5;
    }

    // Beats 3.5-4: Descend back
    const fill2 = all.filter(n=>n.midi<(target2?.midi||60)&&n.midi>=(target2?.midi||60)-4).slice(-2);
    fill2.forEach(n=>{ notes.push(N(n,'s',beat,null,'up')); beat+=0.25; });

    // Align to next measure
    while(beat%4!==0&&beat%4>0.01){
      const pad=all[Math.round(beat*2)%all.length];
      if(pad) notes.push(N(pad,'s',beat,null,null));
      beat+=0.25;
    }
  });

  return notes;
}

/* ════════════════════════════════════════════
   BASS — Walking Bass (4 measures)
════════════════════════════════════════════ */
export function generateBassWalking(rootMidi, scaleKey, stringMidis){
  const semis = getScaleSemitones(scaleKey);
  const s     = SCALES[scaleKey];
  const notes = []; let beat = 0;
  const progDegs = [0, Math.min(3,s.degs.length-1),
                    Math.min(4,s.degs.length-1), 0];

  progDegs.forEach((degIdx,ci) => {
    const cTones = [0,2,4].map(st=>semis[(degIdx+st)%semis.length]);
    const nextDeg= progDegs[(ci+1)%progDegs.length];

    const root = scaleDots(rootMidi,[semis[degIdx]],stringMidis,4,12).filter(n=>n.string===0)[0];
    const third= scaleDots(rootMidi,[cTones[1]],stringMidis,4,12).filter(n=>n.string<=1)[0];
    const fifth= scaleDots(rootMidi,[cTones[2]],stringMidis,4,12).filter(n=>n.string<=1)[0];

    // Chromatic approach to next root
    const nextSemi = semis[nextDeg];
    const nextMidi = rootMidi + nextSemi + 12;
    const appMidi  = nextMidi - 1;
    const appFret  = appMidi - stringMidis[0];
    const appOk    = appFret>=4&&appFret<=14;

    [root,third,fifth].forEach((n,i) => {
      if(!n){beat++;return;}
      notes.push({...n,dur:'q',beat,measure:Math.floor(beat/4),
        technique:null,pick:'finger',finger:i+1}); beat++;
    });

    if(appOk){
      notes.push({midi:appMidi,fret:appFret,string:0,dur:'q',
        beat,measure:Math.floor(beat/4),
        technique:'h',pick:'finger',rel:-1,degIdx:-1}); beat++;
    } else { beat++; }
  });

  return notes;
}

/* ════════════════════════════════════════════
   BASS — Slap + Pop (4 measures)
════════════════════════════════════════════ */
export function generateSlapPop(rootMidi, scaleKey, stringMidis){
  const semis = getScaleSemitones(scaleKey);
  const notes = []; let beat = 0;

  const root  = scaleDots(rootMidi,[0],stringMidis,5,12).filter(n=>n.string===0)[0];
  const fifth = scaleDots(rootMidi,[semis[4]||7],stringMidis,5,12).filter(n=>n.string<=1)[0];
  const oct   = root ? {...root,midi:root.midi+12,fret:root.fret+12,string:Math.min(1,stringMidis.length-1)} : null;

  for(let m=0;m<4;m++){
    // S S P ghost
    if(root) notes.push({...root,dur:'e',beat,measure:m,technique:'slap',pick:'slap'}); beat+=0.5;
    if(oct&&oct.fret<=17) notes.push({...oct,dur:'e',beat,measure:m,technique:'slap',pick:'slap'}); beat+=0.5;
    if(fifth) notes.push({...fifth,dur:'e',beat,measure:m,technique:'pop',pick:'pop'}); beat+=0.5;
    if(root) notes.push({...root,dur:'s',beat,measure:m,technique:'pm',pick:'slap',isMuted:true}); beat+=0.25;
    beat+=0.25; // 16th rest
  }
  return notes;
}

/* ── Master builder ──────────────────────── */
export function buildExercise(type, rootMidi, scaleKey, stringMidis, instrument, stringCount){
  try{
    switch(type){
      case 'thirds':    return generateThirds(rootMidi,scaleKey,stringMidis);
      case '3nps':      return generate3NPS(rootMidi,scaleKey,stringMidis);
      case 'seq3':      return generateSeq3(rootMidi,scaleKey,stringMidis);
      case 'seq4':      return generateSeq4(rootMidi,scaleKey,stringMidis);
      case 'seq6':      return generateSeq6(rootMidi,scaleKey,stringMidis);
      case 'sweep':     return generateSweep(rootMidi,scaleKey,stringMidis,stringCount||6);
      case 'tapping':   return generateTapping(rootMidi,scaleKey,stringMidis);
      case 'targeting': return generateTargeting(rootMidi,scaleKey,stringMidis);
      case 'walking':   return generateBassWalking(rootMidi,scaleKey,stringMidis);
      case 'slap':      return generateSlapPop(rootMidi,scaleKey,stringMidis);
      default: return [];
    }
  }catch(e){ console.error('Exercise error:',type,e); return []; }
}
