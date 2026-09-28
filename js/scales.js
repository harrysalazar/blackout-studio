/* ═══════════════════════════════════════════
   scales.js — Music theory data
   Blackout Studio · SIPO Guitar
═══════════════════════════════════════════ */

export const NOTES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const NOTES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
export const USE_FLAT    = new Set(['F','Bb','Eb','Ab','Db','Gb']);

export const ROOT_LABELS = ['C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab','A','A#/Bb','B'];
export const ROOT_VALS   = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

export const DEG_COLORS = [
  '#7c3aed','#06b6d4','#10b981','#f59e0b',
  '#ef4444','#ec4899','#a78bfa','#64748b'
];

export function noteArray(root) {
  return USE_FLAT.has(root) ? NOTES_FLAT : NOTES_SHARP;
}

export function noteAt(root, semitones) {
  const a = noteArray(root);
  return a[(a.indexOf(root) + semitones + 120) % 12];
}

export function getScaleNotes(root, key) {
  const s  = SCALES[key];
  const a  = noteArray(root);
  const ri = a.indexOf(root);
  const notes = [root];
  let acc = 0;
  s.intervals.forEach((st, i) => {
    if (i < s.intervals.length - 1) {
      acc += st;
      notes.push(a[(ri + acc) % 12]);
    }
  });
  return notes;
}

export function getScaleSemitones(key) {
  const s = SCALES[key];
  let acc = 0;
  const semis = [0];
  for (let i = 0; i < s.intervals.length - 1; i++) {
    acc += s.intervals[i];
    semis.push(acc % 12);
  }
  return semis;
}

/* ── Degree display helpers ─────────────────────────────────────── */
// Explains Roman numeral notation for display
export const DEG_EXPLAINED = {
  'I':    { roman:'I',    quality:'Mayor',           suffix:'maj7',   why:'Mayúscula = acorde mayor. Tónica.' },
  'II':   { roman:'II',   quality:'Mayor',           suffix:'7',      why:'Mayúscula = acorde mayor.' },
  'III':  { roman:'III',  quality:'Mayor',           suffix:'maj7',   why:'Mayúscula = acorde mayor.' },
  'IV':   { roman:'IV',   quality:'Mayor',           suffix:'maj7',   why:'Mayúscula = acorde mayor. Subdominante.' },
  'V':    { roman:'V',    quality:'Dominante',       suffix:'7',      why:'Mayúscula = mayor. V con 7ma = dominante — máxima tensión.' },
  'VI':   { roman:'VI',   quality:'Mayor',           suffix:'maj7',   why:'Mayúscula = acorde mayor.' },
  'VII':  { roman:'VII',  quality:'Mayor',           suffix:'maj7',   why:'Mayúscula = acorde mayor.' },
  'i':    { roman:'i',    quality:'Menor',           suffix:'m7',     why:'Minúscula = acorde menor. Tónica menor.' },
  'ii':   { roman:'ii',   quality:'Menor',           suffix:'m7',     why:'Minúscula = acorde menor.' },
  'iii':  { roman:'iii',  quality:'Menor',           suffix:'m7',     why:'Minúscula = acorde menor.' },
  'iv':   { roman:'iv',   quality:'Menor',           suffix:'m7',     why:'Minúscula = acorde menor. Subdominante menor.' },
  'v':    { roman:'v',    quality:'Menor',           suffix:'m7',     why:'Minúscula = acorde menor. V sin tensión dominante.' },
  'vi':   { roman:'vi',   quality:'Menor',           suffix:'m7',     why:'Minúscula = acorde menor. Relativo menor.' },
  'vii':  { roman:'vii',  quality:'Menor',           suffix:'m7',     why:'Minúscula = acorde menor.' },
  'ii°':  { roman:'ii°',  quality:'Semidisminuido',  suffix:'m7b5',   why:'° = disminuido. Minúscula = base menor.' },
  'vi°':  { roman:'vi°',  quality:'Semidisminuido',  suffix:'m7b5',   why:'° = disminuido.' },
  'v°':   { roman:'v°',   quality:'Semidisminuido',  suffix:'m7b5',   why:'° = disminuido.' },
  'i°':   { roman:'i°',   quality:'Semidisminuido',  suffix:'m7b5',   why:'° = disminuido. Solo en Locrio.' },
  'VII°': { roman:'VII°', quality:'Disminuido',      suffix:'dim7',   why:'° = disminuido completo. VII en Menor Armónica.' },
  '#IV':  { roman:'#IV',  quality:'Mayor',           suffix:'m7b5',   why:'# = alterado. La nota característica del Lidio.' },
  'bII':  { roman:'bII',  quality:'Mayor',           suffix:'maj7',   why:'b = bemol (un semitono abajo). El movimiento Frigio.' },
  'bIII': { roman:'bIII', quality:'Mayor',           suffix:'maj7',   why:'b = bemol. 3ra menor en contexto mayor.' },
  'bVI':  { roman:'bVI',  quality:'Mayor',           suffix:'maj7',   why:'b = bemol. 6ta menor, muy usada en rock.' },
  'bVII': { roman:'bVII', quality:'Mayor',           suffix:'7',      why:'b = bemol. La 7ma del Mixolidio/Eólico — el acorde de rock.' },
  'bV':   { roman:'bV',   quality:'Mayor',           suffix:'maj7',   why:'b = bemol. 5ta disminuida — el tritono.' },
  'bvii': { roman:'bvii', quality:'Menor',           suffix:'m7',     why:'Minúscula + b = menor bemol.' },
};

/* ── Scale definitions ──────────────────────────────────────────── */
export const SCALES = {
  major: {
    name: 'Mayor', mode: 'Jónico — Modo I de la Escala Mayor',
    intervals: [2,2,1,2,2,2,1],
    formula:   ['T','T','S','T','T','T','S'],
    degs:      ['I','II','III','IV','V','VI','VII'],
    ct:        ['Maj7','m7','m7','Maj7','7','m7','m7b5'],
    cf:        ['Mayor 7ma mayor','Menor 7ma menor','Menor 7ma menor','Mayor 7ma mayor','Dominante 7','Menor 7ma menor','Semidisminuido'],
    cn:        [[0,4,7,11],[2,5,9,0],[4,7,11,2],[5,9,0,4],[7,11,2,5],[9,0,4,7],[11,2,5,9]],
    origin:    'Imagina 7 escalones con distancias exactas: Tono, Tono, Semitono, Tono, Tono, Tono, Semitono. Si subes esos escalones desde cualquier nota, tocaste una escala mayor. Todo en la música tonal parte de aquí.',
    sound:     'Alegre, brillante, estable. El oído siente que llegó cuando resuelve en la tónica. Pop, rock melódico, himnos.',
    apply:     'Sobre acordes Maj7 y progresiones mayores. Pop, Rock clásico, Country, Folk.',
    nps3:      'La Posición 1 empieza en la raíz en la 6ª cuerda. Las 7 posiciones son la misma geometría desplazada consecutivamente por el mástil.',
    bassApply: 'Líneas de bajo mayores sobre I–IV–V. Walking bass diatónico. Groove en pop y funk mayor.',
    progs: [
      { name:'I–V–vi–IV · La Progresión del Pop', degs:[0,4,5,3],
        why:'La más usada en pop moderno. I da estabilidad, V tensión, vi color melancólico, IV respira antes de volver.', genre:'Pop · Rock · Country' },
      { name:'I–IV–V · Blues Mayor', degs:[0,3,4],
        why:'Los tres acordes fundamentales. I es home, IV eleva suavemente, V lleva al máximo y jala de vuelta.', genre:'Blues · Rock · Country' },
      { name:'ii–V–I · Cadencia Jazz', degs:[1,4,0],
        why:'La cadencia reina del jazz. ii7 prepara, V7 crea tensión con su tritono, I resuelve.', genre:'Jazz · Bossa Nova · Fusion' },
      { name:'I–vi–IV–V · Doo-Wop', degs:[0,5,3,4],
        why:'El vi añade sabor menor que contrasta con el brillo del I. Nostálgica, predecible, efectiva.', genre:'Pop clásico · Rock 50s · Soul' }
    ]
  },
  dorian: {
    name: 'Dórico', mode: 'Modo II — 2° grado de la Escala Mayor',
    intervals: [2,1,2,2,2,1,2],
    formula:   ['T','S','T','T','T','S','T'],
    degs:      ['i','ii°','bIII','IV','v','vi','bVII'],
    ct:        ['m7','m7b5','Maj7','7','m7','m7','Maj7'],
    cf:        ['Menor 7ma menor','Semidisminuido','Mayor 7ma mayor','Dominante 7','Menor 7ma menor','Menor 7ma menor','Mayor 7ma mayor'],
    cn:        [[0,3,7,10],[2,5,8,0],[3,7,10,2],[5,9,0,3],[7,10,2,5],[9,0,3,7],[10,2,5,9]],
    origin:    'C Mayor empezando en D: D E F G A B C D. La 6ta mayor (B en D Dórico) es la nota que lo separa del Eólico y le da ese brillo característico.',
    sound:     'Menor con brillo. Más luminoso que el Eólico. Funk, jazz modal, rock psicodélico. Santana vive aquí.',
    apply:     'Sobre acordes m7 sin b6. Funk, Jazz, Fusion. "So What" Miles Davis, "Evil Ways" Santana.',
    nps3:      'Geométricamente idéntico al Mayor. Si sabes Pos.1 del Mayor, el Dórico es la misma forma desde el bloque 2.',
    bassApply: 'Groove de bajo funk sobre i–IV. Walking bass en i–ii. Líneas de slap en tonalidades menores brillantes.',
    progs: [
      { name:'i–IV · El Movimiento Dórico', degs:[0,3],
        why:'IV mayor sobre tónica menor — solo posible en Dórico. Esa diferencia de un semitono (la 6ta mayor) es toda la identidad del modo.', genre:'Funk · Jazz Modal · Rock' },
      { name:'i–bVII–IV–i · Groove Funk', degs:[0,6,3,0],
        why:'Loop cíclico sin resolución clara. El bVII evita la cadencia dominante, manteniendo el groove suspendido indefinidamente.', genre:'Funk · Soul · R&B' },
      { name:'i–II–bVII · Color Modal', degs:[0,1,6],
        why:'El II mayor es exclusivo del Dórico en contexto menor. Su aparición confirma el modo con brillo inesperado.', genre:'Jazz · Fusion · Rock Prog' }
    ]
  },
  phrygian: {
    name: 'Frigio', mode: 'Modo III — 3° grado de la Escala Mayor',
    intervals: [1,2,2,2,1,2,2],
    formula:   ['S','T','T','T','S','T','T'],
    degs:      ['i','bII','bIII','iv','v°','bVI','bvii'],
    ct:        ['m7','Maj7','7','m7','m7b5','Maj7','m7'],
    cf:        ['Menor 7ma menor','Mayor 7ma mayor','Dominante 7','Menor 7ma menor','Semidisminuido','Mayor 7ma mayor','Menor 7ma menor'],
    cn:        [[0,3,7,10],[1,5,8,0],[3,7,10,1],[5,8,0,3],[7,10,1,5],[8,0,3,7],[10,1,5,8]],
    origin:    'C Mayor empezando en E: E F G A B C D E. El semitono entre raíz y 2da (E–F) es la firma. Ese medio paso define todo.',
    sound:     'Oscuro, dramático, español, árabe, agresivo. El bII es el movimiento más característico del flamenco y del metal.',
    apply:     'Sobre acordes m en metal, flamenco, música árabe. "Wherever I May Roam" Metallica.',
    nps3:      'El semitono al inicio del patrón — primer intervalo es 1 traste, no 2.',
    bassApply: 'Riffs de bajo frigio sobre i–bII. Líneas de metal con el semitono inicial como ancla.',
    progs: [
      { name:'i–bII · El Riff Frigio', degs:[0,1],
        why:'Acorde mayor un semitono arriba de la raíz menor — imposible en cualquier otro modo. Metallica, Slayer, todo el flamenco.', genre:'Metal · Flamenco · Música árabe' },
      { name:'i–bVII–bVI–bII · Cascada Frigia', degs:[0,6,5,1],
        why:'Baja por el mástil hasta el bII. La llegada al bII es la tensión máxima. Drama puro.', genre:'Metal Extremo · Flamenco · Prog' }
    ]
  },
  lydian: {
    name: 'Lidio', mode: 'Modo IV — 4° grado de la Escala Mayor',
    intervals: [2,2,2,1,2,2,1],
    formula:   ['T','T','T','S','T','T','S'],
    degs:      ['I','II','III','#IV','V','VI','VII'],
    ct:        ['Maj7#11','7','m7','m7b5','Maj7','m7','m7'],
    cf:        ['Mayor 7ma mayor con #4','Dominante 7','Menor 7ma menor','Semidisminuido','Mayor 7ma mayor','Menor 7ma menor','Menor 7ma menor'],
    cn:        [[0,4,7,11],[2,6,9,0],[4,7,11,2],[6,9,0,4],[7,11,2,6],[9,0,4,7],[11,2,6,9]],
    origin:    'C Mayor empezando en F: F G A B C D E F. El B en lugar del Bb esperado — el #4 que crea la sensación de flotar.',
    sound:     'Mágico, etéreo, flotante, cinematográfico. El #4 suspende al oído entre tensión y reposo.',
    apply:     'Sobre Maj7#11. Rock instrumental, Fusion, Cine. Satriani, John Williams.',
    nps3:      'Igual al Mayor con la 4ta un traste más alto. Un traste de diferencia, todo el sonido.',
    bassApply: 'Líneas de bajo flotantes sobre I–II. Pedal de tónica con la 5ta del bII como color.',
    progs: [
      { name:'I–II · El Movimiento Lidio', degs:[0,1],
        why:'El II mayor a un tono completo arriba. El #4 convierte la cuarta perfecta en tritono — eso crea el "float". Satriani lo usa constantemente.', genre:'Rock Instrumental · Fusion · Cine' },
      { name:'I–II–III–II · Loop Flotante', degs:[0,1,2,1],
        why:'Loop sin resolución clara. Ningún acorde tiene función dominante — textura suspendida indefinidamente.', genre:'Post-Rock · Ambient · Instrumental' }
    ]
  },
  mixolydian: {
    name: 'Mixolidio', mode: 'Modo V — 5° grado de la Escala Mayor',
    intervals: [2,2,1,2,2,1,2],
    formula:   ['T','T','S','T','T','S','T'],
    degs:      ['I','II','III','IV','v','vi°','bVII'],
    ct:        ['7','m7','m7b5','Maj7','m7','m7b5','Maj7'],
    cf:        ['Dominante 7','Menor 7ma menor','Semidisminuido','Mayor 7ma mayor','Menor 7ma menor','Semidisminuido','Mayor 7ma mayor'],
    cn:        [[0,4,7,10],[2,5,9,0],[4,7,10,2],[5,9,0,4],[7,10,2,5],[9,0,4,7],[10,2,5,9]],
    origin:    'C Mayor empezando en G: G A B C D E F G. La 7ma menor (F en lugar de F#) es la diferencia. Mayor con la séptima rebajada.',
    sound:     'El sonido del rock y el blues. Mayor con suciedad en la 7ma. AC/DC, Stones, Led Zeppelin.',
    apply:     'Sobre dom7. Blues, Rock, Funk, Reggae.',
    nps3:      'Igual al Mayor con la última nota de cada posición bajada un traste.',
    bassApply: 'El idioma del bajo en blues y rock. Líneas de bajo con la 7ma menor como nota de paso fundamental.',
    progs: [
      { name:'I–bVII–IV · El Riff de Rock', degs:[0,6,3],
        why:'El trío definitorio del rock clásico. El bVII evita la resolución dominante — libre y poderoso. "Sweet Home Alabama".', genre:'Rock · Blues Rock · Country Rock' },
      { name:'I7–IV · Blues Básico', degs:[0,3],
        why:'El I con 7ma dominante es el centro del blues. La 7ma crea tensión permanente que no resuelve — eso ES el blues.', genre:'Blues · Rock · Jazz' }
    ]
  },
  aeolian: {
    name: 'Menor Natural', mode: 'Eólico — Modo VI de la Escala Mayor',
    intervals: [2,1,2,2,1,2,2],
    formula:   ['T','S','T','T','S','T','T'],
    degs:      ['i','ii°','bIII','iv','v','bVI','bVII'],
    ct:        ['m7','m7b5','Maj7','m7','m7','Maj7','7'],
    cf:        ['Menor 7ma menor','Semidisminuido','Mayor 7ma mayor','Menor 7ma menor','Menor 7ma menor','Mayor 7ma mayor','Dominante 7'],
    cn:        [[0,3,7,10],[2,5,8,0],[3,7,10,2],[5,8,0,3],[7,10,2,5],[8,0,3,7],[10,2,5,8]],
    origin:    'C Mayor empezando en A: A B C D E F G A. La 6ta menor (F) es lo que lo separa del Dórico — todo es oscuro de manera consistente.',
    sound:     'Oscuro, melancólico, poderoso. El sonido del rock y el metal moderno.',
    apply:     'Sobre i, im7, progresiones i–bVII–bVI. Metal, Rock, Baladas.',
    nps3:      'El patrón más practicado en rock/metal. Empieza en E (posición XII con cuerdas al aire disponibles).',
    bassApply: 'El idioma del bajista de metal. Riffs de bajo en i–bVII–bVI. Groove oscuro, palm mute en raíz.',
    progs: [
      { name:'i–bVII–bVI–bVII · El Riff de Metal', degs:[0,6,5,6],
        why:'La progresión definitoria del metal. i establece oscuridad, bVII da potencia, bVI es el punto más bajo, bVII crea anticipación.', genre:'Metal · Rock · Balada Rock' },
      { name:'i–bVI–bIII–bVII · Canon Menor', degs:[0,5,2,6],
        why:'La progresión descendente crea un movimiento de bajo satisfactorio que el oído encuentra intuitivamente correcto.', genre:'Pop · Rock · Metal Melódico' },
      { name:'i–iv–v · Menor Clásica', degs:[0,3,4],
        why:'Sin el V dominante armónico — el v menor da carácter más antiguo y modal. Folk oscuro, doom metal.', genre:'Folk · Doom Metal · Medieval' },
      { name:'i–bIII–iv–bVII · Power Ballad', degs:[0,2,3,6],
        why:'El bIII añade luminosidad, iv da profundidad, bVII es el vuelo antes de volver. Anatomía de la power ballad.', genre:'Power Ballad · AOR · Rock Melódico' }
    ]
  },
  locrian: {
    name: 'Locrio', mode: 'Modo VII — 7° grado de la Escala Mayor',
    intervals: [1,2,2,1,2,2,2],
    formula:   ['S','T','T','S','T','T','T'],
    degs:      ['i°','bII','bIII','iv','bV','bVI','bvii'],
    ct:        ['m7b5','Maj7','m7','m7','Maj7','7','m7'],
    cf:        ['Semidisminuido','Mayor 7ma mayor','Menor 7ma menor','Menor 7ma menor','Mayor 7ma mayor','Dominante 7','Menor 7ma menor'],
    cn:        [[0,3,6,10],[1,5,8,0],[3,6,10,1],[5,8,0,3],[6,10,1,5],[8,0,3,6],[10,1,5,8]],
    origin:    'C Mayor empezando en B: B C D E F G A B. La 5ta disminuida hace imposible un acorde estable sobre la raíz.',
    sound:     'Máxima tensión e inestabilidad. El bV hace que todo suene a punto de caerse.',
    apply:     'Sobre m7b5. Jazz, metal progresivo. Más herramienta que idioma.',
    nps3:      'Dos semitonos al inicio — dedos apretados al comienzo.',
    bassApply: 'Línea de bajo sobre el ii° en cadencias jazz. Riff de metal extremo con el tritono como ancla.',
    progs: [
      { name:'i°–bII · El Único Movimiento Locrio', degs:[0,1],
        why:'El bII es el único movimiento que da reposo al Locrio. El i° no puede sostenerse como tónica real.', genre:'Jazz · Metal Progresivo · Avant-garde' }
    ]
  },
  harm_minor: {
    name: 'Menor Armónica', mode: 'Menor con 7ma Mayor — fuera de la familia Mayor',
    intervals: [2,1,2,2,1,3,1],
    formula:   ['T','S','T','T','S','T+S','S'],
    degs:      ['i','ii°','bIII+','iv','V','bVI','VII°'],
    ct:        ['mMaj7','m7b5','Maj7#5','m7','7','Maj7','dim7'],
    cf:        ['Menor 7ma mayor','Semidisminuido','Mayor aumentado','Menor 7ma menor','Dominante 7','Mayor 7ma mayor','Disminuido completo'],
    cn:        [[0,3,7,11],[2,5,8,0],[3,7,11,2],[5,8,0,3],[7,11,2,5],[8,0,3,7],[11,2,5,8]],
    origin:    'Eólico con la 7ma subida un semitono. Eso convierte el v menor en V dominante con tritono. El precio: la Segunda Aumentada (T+S) entre 6ta y 7ma.',
    sound:     'Dramático, épico, oriental, flamenco, neoclásico. El T+S es la firma de la música del Mediterráneo.',
    apply:     'Sobre i (menor) y V7 resolviendo a im. Metal neoclásico, Flamenco. Malmsteen.',
    nps3:      'El T+S crea una extensión forzada en el patrón. En alguna cuerda el dedo 4 se estira un traste extra.',
    bassApply: 'Línea de bajo clásica i–V–i con la sensible (7ma mayor). Riffs neoclásicos con resolución dramática.',
    progs: [
      { name:'i–V · La Cadencia Armónica', degs:[0,4],
        why:'El V dominante con tritono resolviendo al i menor. No es posible en Eólico. La Menor Armónica existe para hacer posible esta cadencia.', genre:'Metal Neoclásico · Flamenco · Clásico' },
      { name:'i–iv–V–i · Cadencia Clásica Menor', degs:[0,3,4,0],
        why:'La progresión cadencial completa de la música tonal menor. Bach, Beethoven, Malmsteen, Paganini.', genre:'Clásico · Neoclásico · Metal Técnico' }
    ]
  },
  mel_minor: {
    name: 'Menor Melódica', mode: 'Menor con 6ta y 7ma mayores (ascendente)',
    intervals: [2,1,2,2,2,2,1],
    formula:   ['T','S','T','T','T','T','S'],
    degs:      ['i','ii','bIII+','IV','V','vi°','VII°'],
    ct:        ['mMaj7','m7','Maj7#5','7','7','m7b5','m7b5'],
    cf:        ['Menor 7ma mayor','Menor 7ma menor','Mayor aumentado','Dominante 7','Dominante 7','Semidisminuido','Semidisminuido'],
    cn:        [[0,3,7,11],[2,5,9,0],[3,7,11,2],[5,9,0,3],[7,11,2,5],[9,0,3,7],[11,2,5,9]],
    origin:    'La Armónica con la 6ta también subida. Casi idéntica a la Mayor excepto por la 3ra menor. Sus modos son más usados que la escala en sí.',
    sound:     'Sofisticado, ambiguo, moderno. Jazz, Fusion. Holdsworth, Guthrie Govan.',
    apply:     'Modo IV (Lidio Dominante) sobre dom7#11. Modo VII (Alterada) sobre dom7alt.',
    nps3:      'Casi idéntica a la Mayor en el patrón. Un ajuste de 1 traste en la 3ra.',
    bassApply: 'Walking bass sofisticado en jazz. Líneas sobre ii–V alterados. El Lidio Dominante en el bajo fusion.',
    progs: [
      { name:'iMaj7–ii · Loop Jazzístico', degs:[0,1],
        why:'El ii de la Menor Melódica es m7 (no m7b5). Loops más fluidos sin inestabilidad del semidisminuido.', genre:'Jazz · Fusion · Bossa Nova' }
    ]
  },
  dim_ws: {
    name: 'Disminuida Simétrica', mode: 'Octatónica T–S · 8 notas',
    intervals: [2,1,2,1,2,1,2,1],
    formula:   ['T','S','T','S','T','S','T','S'],
    degs:      ['I','II','bIII','IV','bV','bVI','VI','VII'],
    ct:        ['dim7','m7','Maj7','7b5','dim7','Maj7','7','dim7'],
    cf:        ['Disminuido completo','Menor 7ma','Mayor 7ma','Dom 7b5','Disminuido','Mayor 7ma','Dominante 7','Disminuido'],
    cn:        [[0,3,6,9],[2,5,9,0],[3,7,10,2],[5,9,0,3],[6,9,0,3],[8,0,3,7],[9,0,4,7],[11,2,5,8]],
    origin:    'No pertenece a la familia Mayor. 8 notas alternando T–S. Solo existen 3 escalas disminuidas T–S — las demás son la misma desde otro grado.',
    sound:     'Tenebroso, inestable, horror cinematográfico, jazz avanzado.',
    apply:     'Sobre dim7 y dom7b9. Jazz bebop, música de terror, metal extremo.',
    nps3:      'El patrón se repite cada 3 trastes — memoriza el primer bloque y transpones.',
    bassApply: 'Riffs de bajo simétricos sobre dim7. Movimientos cromáticos en jazz.',
    progs: [
      { name:'dim7–im · Resolución Disminuida', degs:[0,3],
        why:'Cuatro resoluciones posibles desde el dim7. Cada nota puede actuar como sensible.', genre:'Jazz · Metal Técnico · Clásico' }
    ]
  },
  dim_sw: {
    name: 'Disminuida Dominante', mode: 'Octatónica S–T · 8 notas',
    intervals: [1,2,1,2,1,2,1,2],
    formula:   ['S','T','S','T','S','T','S','T'],
    degs:      ['I','bII','bIII','III','bV','V','VI','bVII'],
    ct:        ['7','Maj7','7','dim7','dim7','7','Maj7','7'],
    cf:        ['Dominante 7','Mayor 7ma','Dominante 7','Disminuido','Disminuido','Dominante 7','Mayor 7ma','Dominante 7'],
    cn:        [[0,4,7,10],[1,5,8,0],[3,6,10,1],[4,7,10,1],[6,9,0,4],[7,11,2,5],[9,0,4,7],[10,2,5,9]],
    origin:    'La disminuida octatónica empezando por el Semitono. Mismas notas posibles, diferente aplicación sobre dominantes.',
    sound:     'Cromatismo controlado, jazzy-bebop. El sonido sobre dominantes con tensiones.',
    apply:     'Sobre dom7, dom7b9, dom7#9. Bebop, Jazz moderno.',
    nps3:      'Empieza con 1 traste (S), luego 2 (T). Alternancia identificable.',
    bassApply: 'Líneas cromáticas sobre V7. Walking bass con b9 y #9.',
    progs: [
      { name:'V7alt–i · Cadencia Alterada', degs:[0,4],
        why:'El dominante con b9 y #9 simultáneamente — máxima tensión. La resolución al im es dramática.', genre:'Jazz · Bebop · Fusion' }
    ]
  }
};
