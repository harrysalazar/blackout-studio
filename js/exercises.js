/* ═══════════════════════════════════════════
   exercises.js — Exercise generator v2
   Blackout Studio · SIPO Guitar
   
   All exercises generate in fret range 4-17.
   Tapping: left hand 5-9, tap 12-17.
   No open strings unless root is E/A/D/G/B.
═══════════════════════════════════════════ */

import { getScaleSemitones, SCALES } from './scales.js';

// ── Scale note collection ─────────────────
function scaleDots(rootMidi, semis, stringMidis, minFret=4, maxFret=16){
  const rc = rootMidi%12;
  const dots = [];
  stringMidis.forEach((base,si)=>{
    for(let f=minFret;f<=maxFret;f++){
      const rel=((base+f)-rc+120)%12;
      if(semis.includes(rel))
        dots.push({midi:base+f,fret:f,string:si,rel,degIdx:semis.indexOf(rel)});
    }
  });
  return dots;
}

// ── Sort by pitch ────────────────────────
function byPitch(a,b){ return a.midi-b.midi; }
function byStr(a,b)  { return a.string-b.string||a.fret-b.fret; }

// ── Build note object ────────────────────
function N(dot, dur, beat, technique=null, pick=null, finger=null){
  return{...dot, dur, beat, measure:Math.floor(beat/4),
    technique, pick, finger: finger||getFinger(dot.degIdx)};
}

function getFinger(d){ return [1,2,3,4,1,2,3,4][d%4]||1; }

/* ════════════════════════════════════════
   BLOCK 1 — Diatonic Thirds
════════════════════════════════════════ */
export function generateThirds(rootMidi, scaleKey, stringMidis){
  const semis = getScaleSemitones(scaleKey);
  const all   = scaleDots(rootMidi,semis,stringMidis,4,14).sort(byPitch);
  const notes = [];
  let beat    = 0;

  // Ascending thirds (skip one scale degree)
  for(let i=0;i<all.length-2;i++){
    notes.push(N(all[i],   'e', beat, null, i%2?'up':'down')); beat+=0.5;
    notes.push(N(all[i+2], 'e', beat, null, i%2?'down':'up')); beat+=0.5;
  }
  // Descending
  for(let i=all.length-1;i>=2;i--){
    notes.push(N(all[i],   'e', beat, null, 'up')); beat+=0.5;
    notes.push(N(all[i-2], 'e', beat, null, 'down')); beat+=0.5;
  }
  // Skip pattern 1-3-2-4
  for(let i=0;i<all.length-3;i+=2){
    [all[i],all[i+2],all[i+1],all[i+3]].forEach((n,j)=>{
      if(!n)return;
      notes.push(N(n,'s',beat,null,j%2?'up':'down')); beat+=0.25;
    });
  }
  return notes;
}

/* ════════════════════════════════════════
   BLOCK 2 — 3NPS Full Position
════════════════════════════════════════ */
export function generate3NPS(rootMidi, scaleKey, stringMidis){
  const semis   = getScaleSemitones(scaleKey);
  const rc      = rootMidi%12;
  const lowBase = stringMidis[0]%12;

  // Find anchor fret (root on low string, in fret 4-9 area)
  let anchor = 5;
  for(let f=4;f<=16;f++){
    if((lowBase+f)%12===rc){ anchor=f; break; }
  }

  // 3 notes per string in this position
  const pos = [];
  stringMidis.forEach((base,si)=>{
    let found=0;
    for(let f=Math.max(anchor-1,4);f<=anchor+6&&found<3;f++){
      const rel=((base+f)-rc+120)%12;
      if(semis.includes(rel)){
        pos.push({midi:base+f,fret:f,string:si,rel,degIdx:semis.indexOf(rel)});
        found++;
      }
    }
  });

  const notes=[]; let beat=0;
  const asc=[...pos].sort(byStr);

  // Ascending ↓↑↓
  let pick=true;
  asc.forEach(n=>{ notes.push(N(n,'s',beat,null,pick?'down':'up')); beat+=0.25; pick=!pick; });
  // Descending
  [...asc].reverse().forEach(n=>{ notes.push(N(n,'s',beat,null,pick?'up':'down')); beat+=0.25; pick=!pick; });
  // Up 2 back 1
  for(let si=0;si<stringMidis.length-1;si++){
    const s0=asc.filter(n=>n.string===si);
    const s1=asc.filter(n=>n.string===si+1);
    [...s0,...s1,...(si>0?asc.filter(n=>n.string===si-1).slice(-1):[])].forEach(n=>{
      notes.push(N(n,'s',beat,null,pick?'down':'up')); beat+=0.25; pick=!pick;
    });
  }
  return notes;
}

/* ════════════════════════════════════════
   BLOCK 3 — Sequence of 3
════════════════════════════════════════ */
export function generateSeq3(rootMidi, scaleKey, stringMidis){
  const semis = getScaleSemitones(scaleKey);
  const all   = scaleDots(rootMidi,semis,stringMidis,4,14).sort(byPitch);
  const notes = []; let beat=0;

  // Ascending 1-2-3, 2-3-4...
  for(let i=0;i<all.length-2;i++){
    [all[i],all[i+1],all[i+2]].forEach((n,j)=>{
      const tech = j===2&&n.string!==all[i].string?'h':null;
      notes.push(N(n,'t',beat,tech,j===0?'down':null)); beat+=1/3;
    });
  }
  // Descending 3-2-1
  const rev=[...all].reverse();
  for(let i=0;i<rev.length-2;i++){
    [rev[i],rev[i+1],rev[i+2]].forEach((n,j)=>{
      const tech = j===2&&n.string!==rev[i].string?'p':null;
      notes.push(N(n,'t',beat,tech,j===0?'up':null)); beat+=1/3;
    });
  }
  return notes;
}

/* ════════════════════════════════════════
   BLOCK 4 — Sequence of 4
════════════════════════════════════════ */
export function generateSeq4(rootMidi, scaleKey, stringMidis){
  const semis = getScaleSemitones(scaleKey);
  const all   = scaleDots(rootMidi,semis,stringMidis,4,14).sort(byPitch);
  const notes = []; let beat=0;
  let pick=true;

  for(let i=0;i<all.length-3;i++){
    [all[i],all[i+1],all[i+2],all[i+3]].forEach(n=>{
      notes.push(N(n,'s',beat,null,pick?'down':'up')); beat+=0.25; pick=!pick;
    });
  }
  const rev=[...all].reverse();
  for(let i=0;i<rev.length-3;i++){
    [rev[i],rev[i+1],rev[i+2],rev[i+3]].forEach(n=>{
      notes.push(N(n,'s',beat,null,pick?'up':'down')); beat+=0.25; pick=!pick;
    });
  }
  // Up 4 back 2
  for(let i=0;i<all.length-5;i+=2){
    [all[i],all[i+1],all[i+2],all[i+3],all[i+2],all[i+1]].forEach(n=>{
      if(!n)return;
      notes.push(N(n,'s',beat,null,pick?'down':'up')); beat+=0.25; pick=!pick;
    });
  }
  return notes;
}

/* ════════════════════════════════════════
   BLOCK 5 — Sequence of 6 (Shred)
════════════════════════════════════════ */
export function generateSeq6(rootMidi, scaleKey, stringMidis){
  const semis = getScaleSemitones(scaleKey);
  const all   = scaleDots(rootMidi,semis,stringMidis,4,14).sort(byPitch);
  const notes = []; let beat=0;

  // Alternate picking: 1-2-3-2-1-2
  for(let i=0;i<all.length-2;i++){
    const grp=[all[i],all[i+1],all[i+2],all[i+1],all[i],all[i+1]];
    grp.forEach((n,j)=>{
      const tech=j===1?'h':j===3?'p':j===4?'p':null;
      notes.push(N(n,'s',beat,tech,j===0?'down':null)); beat+=0.25;
    });
  }
  // Legato variant: pick only first of each 6
  for(let i=0;i<Math.min(all.length-5,18);i++){
    const grp=[all[i],all[i+1],all[i+2],all[i+3],all[i+2],all[i+1]];
    grp.forEach((n,j)=>{
      notes.push(N(n,'s',beat,j===0?null:j<3?'h':'p',j===0?'down':null)); beat+=0.25;
    });
  }
  return notes;
}

/* ════════════════════════════════════════
   BLOCK 6 — Sweep Picking (2-3-4-5-6 str)
   Neoclassical style
════════════════════════════════════════ */
export function generateSweep(rootMidi, scaleKey, stringMidis, stringCount){
  const semis = getScaleSemitones(scaleKey);
  const s     = SCALES[scaleKey];
  const rc    = rootMidi%12;
  const notes = []; let beat=0;

  s.degs.forEach((_,degIdx)=>{
    // Chord tones: root+3rd+5th+7th of this degree
    const cSemis=[0,2,4,6].map(step=>semis[(degIdx+step)%semis.length]);

    // Build voicings for different string counts
    [6,5,4,3,2].forEach(sc=>{
      if(sc>stringMidis.length)return;
      const strSlice = stringMidis.slice(0, sc);
      const voicing  = buildVoicing(rc, cSemis, semis, strSlice, sc, 4, 14);
      if(voicing.length<sc*0.6)return;

      // Ascending sweep
      voicing.forEach((n,i)=>{
        const isTop = i===voicing.length-1;
        notes.push(N({...n,string:n.string},'s',beat,
          isTop?'h':'sweep_d', i===0?'down':null,
          getFinger(n.degIdx))); beat+=0.25;
      });
      // Descending sweep
      [...voicing].reverse().forEach((n,i)=>{
        const isTop = i===0;
        notes.push(N({...n,string:n.string},'s',beat,
          isTop?'p':'sweep_u', i===0?'up':null)); beat+=0.25;
      });
    });
  });

  return notes;
}

function buildVoicing(rc, chordSemis, scaleSemis, strMidis, maxStr, minF, maxF){
  const v=[];
  let prevFret=minF;
  for(let si=0;si<strMidis.length&&v.length<maxStr;si++){
    const base=strMidis[si];
    let best=null;
    for(let f=Math.max(minF,prevFret-2);f<=maxF;f++){
      const rel=((base+f)-rc+120)%12;
      if(chordSemis.includes(rel)){
        best={midi:base+f,fret:f,string:si,rel,degIdx:scaleSemis.indexOf(rel)};
        break;
      }
    }
    if(best){ v.push(best); prevFret=best.fret; }
  }
  return v;
}

/* ════════════════════════════════════════
   BLOCK 7 — Tapping
   Left hand: frets 5-9, tap: frets 12-17
════════════════════════════════════════ */
export function generateTapping(rootMidi, scaleKey, stringMidis){
  const semis = getScaleSemitones(scaleKey);
  const rc    = rootMidi%12;
  const notes = []; let beat=0;

  stringMidis.forEach((base,si)=>{
    if(si>stringMidis.length-2)return; // skip highest

    // Left hand notes: frets 5-9
    const lhFrets=[];
    for(let f=5;f<=10;f++){
      const rel=((base+f)-rc+120)%12;
      if(semis.includes(rel))lhFrets.push({f,rel,degIdx:semis.indexOf(rel)});
    }
    // Tap notes: frets 12-17
    const tapFrets=[];
    for(let f=12;f<=17;f++){
      const rel=((base+f)-rc+120)%12;
      if(semis.includes(rel))tapFrets.push({f,rel,degIdx:semis.indexOf(rel)});
    }

    for(let i=0;i<lhFrets.length-1&&tapFrets.length>0;i+=2){
      const n1  = lhFrets[i];
      const n2  = lhFrets[i+1]||lhFrets[i];
      const tap = tapFrets[i%tapFrets.length];
      if(!n1||!tap)continue;

      const mk=(dot,f)=>({midi:base+f,fret:f,string:si,
        rel:dot.rel,degIdx:dot.degIdx});

      // Pattern: pick → hammer → tap → pull → pull
      [
        {...mk(n1,n1.f), dur:'s', beat, technique:null,  pick:'down', finger:1},
        {...mk(n2,n2.f), dur:'s', beat:beat+0.25, technique:'h', pick:null, finger:3},
        {...mk(tap,tap.f),dur:'s',beat:beat+0.5,technique:'tap',pick:null,finger:'T'},
        {...mk(n2,n2.f), dur:'s', beat:beat+0.75,technique:'p', pick:null, finger:3},
        {...mk(n1,n1.f), dur:'s', beat:beat+1,  technique:'p', pick:null, finger:1},
      ].forEach(n=>notes.push({...n,measure:Math.floor(n.beat/4)}));
      beat+=1.25;
    }
  });
  return notes;
}

/* ════════════════════════════════════════
   BLOCK 8 — Targeting
════════════════════════════════════════ */
export function generateTargeting(rootMidi, scaleKey, stringMidis){
  const semis = getScaleSemitones(scaleKey);
  const s     = SCALES[scaleKey];
  const notes = []; let beat=0;

  // Prog: i bVII bVI bVII
  const progDegs=[0,Math.min(6,s.degs.length-1),
                    Math.min(5,s.degs.length-1),
                    Math.min(6,s.degs.length-1)];

  progDegs.forEach(degIdx=>{
    const rootSemi=semis[degIdx];
    const fifthSemi=semis[(degIdx+4)%semis.length];

    // Target notes in comfortable zone
    const allScale = scaleDots(rootMidi,semis,stringMidis,5,14).sort(byPitch);
    const targets  = scaleDots(rootMidi,[rootSemi],stringMidis,5,14).sort(byPitch);
    const target   = targets[Math.floor(targets.length/2)];

    // Approach: 3 scale notes leading to target
    const approach = allScale.filter(n=>n.midi<(target?.midi||60)&&n.midi>=(target?.midi||60)-7).slice(-3);
    approach.forEach(n=>{
      notes.push(N(n,'s',beat,null,beat%0.5<0.01?'down':'up')); beat+=0.25;
    });
    if(target){
      notes.push({...N(target,'q',beat,'~',null),isTarget:true}); beat+=1;
    }
    // Fill to beat 3
    while(beat%4<3&&allScale.length>0){
      const n=allScale[Math.round(beat*3)%allScale.length];
      notes.push(N(n,'s',beat,null,null)); beat+=0.25;
    }
    // Fifth on beat 3
    const fifths=scaleDots(rootMidi,[fifthSemi],stringMidis,5,14).sort(byPitch);
    const fifth =fifths[Math.floor(fifths.length/2)];
    if(fifth){ notes.push({...N(fifth,'e',beat,'~',null),isTarget:true}); beat+=0.5; }
    // Pad to end of measure
    while(beat%4!==0&&beat%4>0.01){
      if(allScale.length>0) notes.push(N(allScale[Math.round(beat)%allScale.length],'s',beat,null,null));
      beat+=0.25;
    }
  });
  return notes;
}

/* ════════════════════════════════════════
   BASS — Walking Bass
════════════════════════════════════════ */
export function generateBassWalking(rootMidi, scaleKey, stringMidis){
  const semis = getScaleSemitones(scaleKey);
  const s     = SCALES[scaleKey];
  const notes = []; let beat=0;
  const progDegs=[0,3,4,0];

  progDegs.forEach((degIdx,ci)=>{
    const cTones=[0,2,4].map(st=>semis[(degIdx+st)%semis.length]);
    const nextDeg=progDegs[(ci+1)%progDegs.length];

    // Root on low string, fret 4-12
    const root5th=scaleDots(rootMidi,[semis[degIdx]],stringMidis,4,12)
      .filter(n=>n.string===0)[0];
    const third=scaleDots(rootMidi,[cTones[1]],stringMidis,4,12)
      .filter(n=>n.string<=1)[0];
    const fifth=scaleDots(rootMidi,[cTones[2]],stringMidis,4,12)
      .filter(n=>n.string<=1)[0];

    // Chromatic approach (semitone below next root)
    const nextRootBase=rootMidi+semis[nextDeg];
    const approachMidi=nextRootBase-1;
    const approachFret=approachMidi-stringMidis[0];
    const approachOk=approachFret>=4&&approachFret<=14;

    [root5th,third,fifth].forEach((n,i)=>{
      if(!n){beat++;return;}
      notes.push({...n,dur:'q',beat,measure:Math.floor(beat/4),
        technique:i===1?null:null,pick:'finger',finger:i+1});
      beat++;
    });
    if(approachOk){
      notes.push({midi:approachMidi,fret:approachFret,string:0,
        dur:'q',beat,measure:Math.floor(beat/4),
        technique:'h',pick:'finger',rel:-1,degIdx:-1});
    }
    beat++;
  });
  return notes;
}

/* ════════════════════════════════════════
   BASS — Slap + Pop
════════════════════════════════════════ */
export function generateSlapPop(rootMidi, scaleKey, stringMidis){
  const semis = getScaleSemitones(scaleKey);
  const notes = []; let beat=0;

  const root=scaleDots(rootMidi,[0],stringMidis,4,12).filter(n=>n.string===0)[0];
  const fifth=scaleDots(rootMidi,[semis[4]||7],stringMidis,4,12).filter(n=>n.string<=1)[0];
  // Octave: same fret+12 on string above
  const oct = root?{...root,midi:root.midi+12,fret:root.fret+12,string:1}:null;

  for(let m=0;m<4;m++){
    if(root) notes.push({...root,dur:'e',beat,measure:m,technique:'slap',pick:'slap'}); beat+=0.5;
    if(oct&&oct.fret<=17) notes.push({...oct,dur:'e',beat,measure:m,technique:'slap',pick:'slap'}); beat+=0.5;
    if(fifth) notes.push({...fifth,dur:'e',beat,measure:m,technique:'pop',pick:'pop'}); beat+=0.5;
    if(root) notes.push({...root,dur:'s',beat,measure:m,technique:'pm',pick:'slap',isMuted:true}); beat+=0.25;
    beat+=0.25; // rest
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
      case 'sweep':     return generateSweep(rootMidi,scaleKey,stringMidis,stringCount);
      case 'tapping':   return generateTapping(rootMidi,scaleKey,stringMidis);
      case 'targeting': return generateTargeting(rootMidi,scaleKey,stringMidis);
      case 'walking':   return generateBassWalking(rootMidi,scaleKey,stringMidis);
      case 'slap':      return generateSlapPop(rootMidi,scaleKey,stringMidis);
      default: return [];
    }
  }catch(e){ console.error('Exercise error:',e); return []; }
}
