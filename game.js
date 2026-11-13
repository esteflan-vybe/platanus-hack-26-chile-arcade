(() => {
  'use strict';
  const [mid,screenHeight,fixed0,fixed1,fixed2,fixed3,goldInk, skyInk, creamInk, turboInk, cyanInk, roseInk,chileBlue, chileRed, chileWhite, chileNavy]=[400,600,120,800,272,0.035,0xffd66b, 0xa8ddff, 0xffefcc, 0xffd89c, 0x86f4ff, 0xff8585,0x174786, 0xcf303e, 0xfff6e9, 0x172d4f];
  // Compact private state for the 50 KB limit: spin=A, turn=B, rest=C, held=D, kick=E, life=F, party=G, angle=H, distance=I, intro=J, note=K, ball=L, owner=M, warn=N, spawn=O, birdIn=P, cuts=Q, line=R, elapsed=S, load=T, age=U, tops=V.

  const { PI: pi, abs: mathAbs, cos: mathCos, floor: mathFloor, ceil: mathCeil, sign: mathSign, hypot: mathHypot, max: mathMax,
    min: mathMin, random: mathRandom, round: mathRound, sin: mathSin, atan2: mathAtan2 } = Math;

  const each=((items,visit)=>items.forEach(visit)).bind(0);
  const clock=(scene=>scene.time.now).bind(0);
  const width = fixed1, height = screenHeight;
  const separator = ' · ';
  const head = 'CÓMO JUGAR';
  const barrioTitle = 'LAS BOLITAS';
  const gameOver = 'FIN DE PARTIDA';
  const pointUnit = ' PTS';
  const recordUnit = ' PTS · RÉCORD ';
  const patioScene = 'patio';
  const scoresScene = 'scores';
  const triangleWave = 'triangle';
  const squareWave = 'square';
  const left = 'P1_L';
  const right = 'P1_R';
  const up = 'P1_U';
  const downButton = 'P1_D';
  const action = 'P1_1';
  const backButton = 'P1_2';
  const thirdButton = 'P1_3';
  const sixthButton = 'P1_6';
  const startSolo = 'START1';
  const startDuel = 'START2';
  const chargingPhase = 'chg';
  const menuState = 'menu';
  const patioState = 'select';
  const guideState = 'guide';
  const playState = 'play';
  const aimPhase = 'aim';
  const reviewPhase = 'review';
  const cx = mid, cy = 327, ring = 193, radius = 13;
  const ink = '#fff1d7', muted = '#e0c3a0';
  const playerColors = [0xf84e54, 0x468df3];
  const patioLabel = '↩ Volver a Fonda';
  const duelNames = ['J1 ROJO', 'J2 AZUL'];
  const duelScore = ([a, b]) => duelNames[0] + ' ' + a + separator + duelNames[1] + ' ' + b;
  function duelTitle(label, [a, b]) {
    const win = Number(b > a);
    return label.k('#172d4f')
      .t(a === b ? '¡EMPATE!' : '¡GANA ' + duelNames[win] + '!');
  }
  // Bolitas sweeps faster than Rayuela. Both accelerate after 3.2 seconds.
  const powerAt = (time, bolitas) => 1 - mathAbs((time * (bolitas ? 1.5 : 1.05) + mathMax(0, time - 3.2) ** 2 * 0.35) % 2 - 1);
  const clamp = (value, min, max) => mathMax(min, mathMin(max, value));
  const marble = (x, y, color) => ({ x, y, h:color, u: 0, r: 0, A: 0, o: false });
  const speed = ball => mathHypot(ball.u, ball.r);
  const gap = (a,b) => mathHypot(a.x-b.x,a.y-b.y);

  const CABINET_KEYS = {
    P1_U: ['w'],
    P1_D: ['s'],
    P1_L: ['a'],
    P1_R: ['d'],
    P1_1: ['u', ' '],
    P1_2: ['i', 'Escape'],
    P1_3: ['o'],
    P1_4: ['j'],
    P1_5: ['k'],
    P1_6: ['l'],
    P2_U: ['ArrowUp'],
    P2_D: ['ArrowDown'],
    P2_L: ['ArrowLeft'],
    P2_R: ['ArrowRight'],
    P2_1: ['r'],
    P2_2: ['t'],
    P2_3: ['y'],
    P2_4: ['f'],
    P2_5: ['g'],
    P2_6: ['h'],
    START1: ['Enter'],
    START2: ['2'],
  };
  const confirmButton = button => button === action || button === startSolo;
  const keyToArcade = Object.fromEntries(Object.entries(CABINET_KEYS).flatMap(
    ([button, keys]) => keys.map(key => [key, button])
  ));
  function bindControls(scene, press, release, blur) {
    scene.cameras.main.setZoom(2).setOrigin(0);
    scene.fx = graphics(scene).z(5);
    scene.vL = [];
    scene.hb = graphics(scene).z(3);
    scene.sl = [0, 1].map(() => arcadeText(scene, 0, 0, '', 23, ink).z(4).v(false));
    scene.zG = arcadeText(scene, 550, 554, '', 16).z(4);
    const controller = new AbortController();
    const down = new Set();
    const settings = () => {
      down.clear();
      blur();
      scene.scene.pause();
      scene.scene.launch('settings', scene);
    };
    if (!scene.pb && scene instanceof Barrio)
      scene.pb = arcadeLink(scene, 768, 137, '⚙', settings, true).f(28);
    scene.os = settings;
    const options = { signal: controller.signal };
    const handleKey = event => {
      if (scene.scene.isPaused?.()) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const button = keyToArcade[key];
      if (!button) return;
      if (event.type === 'keyup') {
        if (down.delete(key) && !CABINET_KEYS[button].some(alias => down.has(alias))) release(button);
        return;
      }
      if(event.ctrlKey||event.metaKey||event.altKey)return;
      event.preventDefault();
      if (scene.g && button[1]==='2' && button[3] !== '2' && (scene.e === playState || scene.q && ![menuState,'end'].includes(scene.q)) || down.has(key) || event.repeat) return;
      down.add(key);
      unlockAudio();
      if (!CABINET_KEYS[button].some(alias => alias !== key && down.has(alias))) {
        controlSound(button);
        if (button[3] === '6' && (scene.e === playState || scene instanceof Barrio && scene.q !== menuState && scene.q !== 'end')) settings();
        else press(button);
      }
    };
    window.addEventListener('keydown', handleKey, options);
    window.addEventListener('keyup', handleKey, options);
    const reset = () => {
      down.clear();
      blur();
    };
    scene.game.events.on('blur', reset);
    scene.events.once('shutdown', () => {
      controller.abort();
      scene.game.events.off('blur', reset);
    });
  }

  // Shared fills preserve the same native drawing calls, including opacity.
  function graphics(scene) {
    const g = scene.add.graphics();
    for(const [key,method,n] of ["Bb4","Ee4","Dd3","Ff5","Qq6"])g[key]=(color,...a)=>g.c(color,a[n])[method](...a.slice(0,n));
    for(const [key,method,n] of ["Ll4","Rr3","Hh5","Mm4"])g[key]=(width,color,...a)=>g.p(width,color,a[n])[method](...a.slice(0,n));
    for(const name of 'oclear cfillStyle zsetDepth gfillPoints plineStyle ffillRoundedRect llineBetween dfillCircle efillEllipse qfillTriangle rstrokeCircle hstrokeRoundedRect bfillRect mstrokeEllipse'.split(' '))g[name[0]]=g[name.slice(1)];
    return g;
  }

  function arcadeText(scene, x, y, value, fontSize, color = ink, style = {}) {
    const label = scene.add.text(x, y, value, { resolution: 2, fontFamily: 'monospace', fontSize, color, align: 'center', fontStyle: 'bold', ...style }).setOrigin(0.5);
    for(const name of 'aOrigin zDepth sPosition uColor kBackgroundColor SFixedSize jY fFontSize nLineSpacing tText vVisible'.split(' '))label[name[0]]=label['set'+name.slice(1)];
    return label;
  }

  function activate(object, onPress) {
    let armed = false;
    const reset = () => { armed = false; object.setAlpha?.(1); };
    return object.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { armed = true; object.setAlpha?.(0.75); })
      .on('pointerout', reset)
      .on('pointerupoutside', reset)
      .on('pointerup', pointer => {
        if (!armed) return;
        reset();
        controlSound(action);
        onPress(pointer);
      });
  }

  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const prefs = [true, true, true];
  const startLabel = (duel = false, id) => (duel ? '2 JUGADORES' : id === 3 ? '1 JUGADOR' : 'J1 VS CPU') + separator + (prefs[0] ? duel ? '2' : 'ENTER' : duel ? 'START 2' : 'START 1');
  const replayLabel = () => (prefs[0] ? 'U/R' : 'B1') + ' REVANCHA';
  const pauseLabel = paused => (prefs[0] ? 'J/F ' : 'B4 ') + (paused ? 'Seguir' : 'Pausa');

  function arcadeLink(scene, x, y, text, onPress, plain = false) {
    return activate(arcadeText(scene, x, y, text, 17, ink, {
      backgroundColor: plain ? null : '#254365', padding: { x: 10, y: 15 }
    }).z(4), onPress)
      .on('pointerover', function () { controlSound(left); this.k(plain ? null : '#ffcf75').u(plain ? '#ffcf75' : '#172d4f'); })
      .on('pointerout', function () { this.k(plain ? null : '#254365').u(ink); });
  }


  function paintNavy(g) {
    g.B(chileNavy,0, 0, width, height);
  }

  function star(g, x, y, r) {
    g.c(chileWhite).g(Array.from({ length: 10 }, (_, i) => {
      const a = i * pi / 5 - pi / 2, size = r * (i % 2 ? 0.42 : 1);
      return { x: x + mathCos(a) * size, y: y + mathSin(a) * size };
    }), true);
  }

  function flag(g, x, y, w) {
    const h = w * 2 / 3;
    g.B(chileWhite,x, y, w, h);
    g.B(chileRed,x, y + h / 2, w, h / 2);
    g.B(chileBlue,x, y, h / 2, h / 2);
    star(g, x + h / 4, y + h / 4, h * 0.127);
  }

  const headerThemes = [
    [0x172d4f, 0xffbd79], [0x63382e, 0xe7ad77],
    [0x553247, 0xf2a9c1], [0x174e70, 0x9edcf5]
  ];

  function gameHeader(g, game) {
    const [base, accent] = headerThemes[game] ?? [chileNavy, 0xf3b675];
    g.F(base,0, 0, width, 121, 18);
    g.L(2,accent,38, 59, 620, 59,0.6);
    g.B(accent,0, 119, width, 2);
    g.H(2,goldInk,12, 8, 776, 110, 16,0.65);
    flag(g, 666, 26, 96);
  }

  function bunting(g, x, y, count, spacing) {
    let lastX = x, lastY = y;
    const colors = [chileRed, chileWhite, chileBlue];
    for (let i = 0; i <= count; i++) {
      const px = x + i * spacing;
      const py = y + mathSin(i * pi / count) * 13;
      g.L(1,chileWhite,lastX, lastY, px, py,0.66);
      if (i < count) {
        g.Q(colors[i % 3],px, py, px + spacing - 5, py + 2, px + spacing / 2, py + 17);
      }
      lastX = px;
      lastY = py;
    }
  }

  function vaso(g, x, y, color) {
    g.E(0x3a2630,x + 5, y + 35, 29, 9,0.28);
    g.c(color).g([
      { x: x - 13, y }, { x: x + 13, y },
      { x: x + 8, y: y + 35 }, { x: x - 8, y: y + 35 }
    ], true);
    g.B(chileWhite,x - 5, y + 8, 2, 21,0.35);
    g.E(chileWhite,x, y, 27, 10);
    g.E(0x995344,x, y, 21, 5);
  }

  function mountains(g, y, color) {
    for (const [x,rise,left,right] of [[-12,43,90,125],[122,68,112,96],[251,49,81,137],[389,61,128,104],[514,39,98,126],[649,73,121,87],[790,54,105,119]]) {
      const peak = y-rise;
      g.Q(color,x-left,y,x,peak,x+right,y);
      g.Q(0x304b65,x,peak,x+right,y,x+right*.35,y,.24);
      g.Q(chileWhite,x-left*.18,peak+rise*.3,x,peak,x+right*.24,peak+rise*.38,.8);
    }
  }

  const scoreKey = 'patio-scores-v1';
  const tables = Array.from({ length: 4 }, () => []);
  const arcadeRecords = [0, 0, 0, 0];
  let scoreLoad, scoreWrites = Promise.resolve();

  const highestFirst = (a, b) => b.points - a.points;

  function loadScores() {
    scoreLoad ??= (async () => {
      try {
        const bridge = window.platanusArcadeStorage;
        const saved = bridge ? (await bridge.get(scoreKey)).value :
          JSON.parse(window.localStorage.getItem(scoreKey));
        if (!Array.isArray(saved)) return;
        each(tables,(table, i) => {
          if (!Array.isArray(saved[i])) return;
          const rows = saved[i].filter(row => /^[A-Z]{3}$/.test(row?.name) &&
            Number.isSafeInteger(row?.points) && row.points > 0);
          table.push(...rows.sort(highestFirst).slice(0, 5));
          arcadeRecords[i] = table[0]?.points ?? 0;
        });
      } catch {
        return false;
      }
    })();
    return scoreLoad;
  }

  function saveScore(game, name, points) {
    scoreWrites = scoreWrites.then(async () => {
      const ok=await loadScores();
      const table = tables[game];
      table.push({ name, points });
      table.sort(highestFirst);
      table.splice(5);
      arcadeRecords[game] = table[0].points;
      try {
        if(ok===false)throw 0;
        const bridge = window.platanusArcadeStorage;
        if (bridge) await bridge.set(scoreKey, tables);
        else window.localStorage.setItem(scoreKey, JSON.stringify(tables));
        return true;
      } catch {
        return false;
      }
    });
    return scoreWrites;
  }

  function scoreQualifies(game, points) {
    const table = tables[game];
    return points > 0 && (table.length < 5 || points > table[4].points);
  }

  function makeCheer() {
    const rate = 16000;
    const buffer = audio.createBuffer(1, rate * 1.36, rate);
    const samples = buffer.getChannelData(0);
    let phase = 0;
    for (let i = 0; i < samples.length; i++) {
      const t = i / rate;
      // The short Y glide and bright final I shape the drawn-out U.
      const bright = mathMax(clamp(1 - mathAbs(t - 0.22) / 0.095, 0, 1),
        clamp((t - 1.04) / 0.14, 0, 1));
      const pitch = 208 + 37 * clamp((t - 0.16) / 0.48, 0, 1)
        + 47 * clamp((t - 1.04) / 0.14, 0, 1) + 6 * mathSin(t * 42);
      phase += 2 * pi * pitch / rate;
      let voice = 0;
      for (let harmonic = 1; harmonic <= 14; harmonic++) {
        const frequency = harmonic * pitch;
        const low = (frequency - 340) / 210;
        const vowel = (frequency - 830 - bright * 1470) / 330;
        voice += mathSin(harmonic * phase) * (0.7 / (1 + low * low)
          + 0.8 / (1 + vowel * vowel)) / mathMax(1, harmonic * 0.45);
      }
      const envelope = mathMin(1, t * 25, (1.36 - t) * 12);
      samples[i] = voice * envelope * 0.26;
    }
    return buffer;
  }

  function cheer() {
    if (!audio || !prefs[2]) return;
    const buffer = cheerBuffer ??= makeCheer();
    const shout = audio.createBufferSource();
    shout.buffer = buffer;
    const level = audioGain();
    level.gain.value = 0.85;
    shout.connect(level);
    level.connect(audio.destination);
    shout.start();
    if (musicBus) {
      const now = audioNow();
      musicBus.gain.setTargetAtTime(0.21, now, fixed3);
      musicBus.gain.setTargetAtTime(0.46, now + buffer.duration + 0.48, 0.12);
    }
    const fanfares = [
      [523, 659, 784, 880],
      [392, 523, 587, 784],
      [440, 554, 659, 831]
    ];
    const fanfareStart = buffer.duration + 0.02;
    const notes = fanfares[recordFanfare];
    recordFanfare = (recordFanfare + 1) % fanfares.length;
    each(notes,(note, i) => {
      blip(note, note, i === 3 ? 0.29 : 0.09, 0.026, i === 3 ? triangleWave : squareWave, fanfareStart + i * 0.10);
    });
    blip(notes[0] / 2, notes[0] / 2, 0.27, 0.032, triangleWave, fanfareStart + 0.30);
  }
  let recordFanfare = 0;
  let audio, musicBus, motor, panderetaBuffer, cheerBuffer;
  const audioNow=(()=>audio.currentTime).bind(0), audioGain=(()=>audio.createGain()).bind(0);
  let musicBar = 0, nextBar = 0;

  function unlockAudio() {
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      audio ??= new Context();
      // If the browser rejects audio, continue the intro silently for this session.
      if (audio.state === 'suspended') audio.resume().catch(() => {audio=false;});
    } catch {
      /* The browser may disable sound. */
    }
  }

  window.onpointerup = unlockAudio;

  function blip(from, to, duration, volume, wave = squareWave, delay = 0, destination = audio?.destination) {
    if (!audio || !prefs[2] && destination !== musicBus) return;
    const start = audioNow() + delay;
    const end = start + duration;
    const oscillator = audio.createOscillator(), envelope = audioGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(to, end);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(volume * 1.5, start + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(envelope).connect(destination);
    oscillator.start(start);
    oscillator.stop(end);
  }

  function controlSound(button) {
    const direction = button.slice(-1);
    const pitch = { U: 590, D: 360, L: 440, R: 490 }[direction];
    if (pitch) blip(pitch, pitch * 0.86, 0.042, 0.022, triangleWave);
    else blip(325, 230, 0.034, 0.027, triangleWave);
  }

  function confirmSound() {
    blip(440, 550, 0.07, 0.05);
    blip(660, 880, 0.1, 0.042, squareWave, 0.07);
  }

  function backSound() {
    blip(390, 210, 0.13, 0.046, triangleWave);
  }

  // Six eighth notes per bar, transcribed and adapted from the supplied cueca clip.
  // Each character stores its MIDI note directly. A dot mk a rest.
  const cuecaPhrases = 'L.KLJL|HLGLEL|@..B.B|D.DDE.|E.LEHL|PQ.Q.E|E.EJJG|MHAQG@|P.GPG.|GPCP..|QOGJOM|EHML@J|L.LGLJ|JLJE.H|M.MMML|G.J@BD|DP.J.V|SJ..UR'.split('|');
  const cuecaOrder = '01GH2345|45678923|8494ABCD|EECB89FD|01234567|ABCDCDEF|45678923|ABCD892F'.split('|');
  const cuecaHarmony = '011100231121130111';
  const cuecaChords = [[45, 60, 64], [40, 56, 62], [43, 59, 62], [41, 57, 60]];

  function pandereta(delay, volume, destination = musicBus, rate = 1) {
    if (!prefs[2] && destination !== musicBus) return;
    if (!panderetaBuffer) {
      panderetaBuffer = audio.createBuffer(1, mathCeil(audio.sampleRate * 0.095), audio.sampleRate);
      const samples = panderetaBuffer.getChannelData(0);
      let previous = 0;
      for (let i = 0; i < samples.length; i++) {
        const white = mathRandom() * 2 - 1;
        samples[i] = (white - previous) * 0.5 * (1 - i / samples.length) ** 3;
        previous = white;
      }
    }
    const shake = audio.createBufferSource(), level = audioGain();
    shake.buffer = panderetaBuffer;
    shake.playbackRate.value = rate;
    level.gain.value = volume * 1.5;
    shake.connect(level).connect(destination);
    shake.start(audioNow() + delay);
  }

  function updateMusic() {
    if (!audio || audio.state !== 'running') return;
    if (!musicBus) {
      musicBus = audioGain();
      musicBus.gain.value = 0.46;
      if (prefs[1]) musicBus.connect(audio.destination);
    }

    // Keep a short Web Audio queue so scene changes never reset the musical clock.
    const now = audioNow();
    if (!nextBar || nextBar < now) nextBar = now + 0.02;
    if (nextBar > now + 0.25) return;
    const eighth = 0.1305;
    const section = mathFloor(musicBar / 8), bar = musicBar % 8;
    const phraseIndex = parseInt(cuecaOrder[section][bar], 18);
    const phrase = cuecaPhrases[phraseIndex];
    const chord = cuecaChords[cuecaHarmony[phraseIndex]];
    // The reed lead enters after the four-bar piano pickup.
    const piano = musicBar < 4 || musicBar >= 62;
    const hz = note => 440 * 2 ** ((note - 69) / 12);
    for (let beat = 0; beat < 6; beat++) {
      const delay = nextBar - now + beat * eighth;
      const note = phrase.charCodeAt(beat);
      if (note > 60) {
        const lead = hz(note - (section === 4 ? 12 : 0));
        const accent = beat === 0 || beat === 3;
        const duration = piano ? 0.095 : phrase[beat + 1] === '.' ? 0.24 : 0.16;
        blip(lead, lead, duration, (accent ? 0.053 : 0.036) + (musicBar < 4 ? 0.075 : 0),
          piano ? triangleWave : squareWave, delay, musicBus);
        if (!piano && accent) {
          blip(lead / 2, lead / 2, 0.18, 0.019, triangleWave, delay, musicBus);
        }
      }
      if (musicBar < 2) continue;
      if (beat === 0 || beat === 3) {
        const root = hz(chord[0] + (beat === 3 ? phraseIndex === 2 ? 2 : 7 : 0));
        blip(root, root, 0.19, 0.059, triangleWave, delay, musicBus);
      }
      if (beat === 2 || beat === 4) {
        for (const [index, note] of chord.slice(1).entries()) {
          const voice = hz(note);
          blip(voice, voice, 0.112, 0.032, triangleWave, delay + index * 0.016, musicBus);
        }
        pandereta(delay, beat === 4 ? 0.07 : 0.038);
      }
      if (beat === 5 && (section % 2 || bar === 7)) pandereta(delay + 0.023, 0.038);
    }
    nextBar += 6 * eighth;
    musicBar = (musicBar + 1) % (cuecaOrder.length * 8);
  }

  function stopMotor() {
    if (!motor) return;
    motor.gain.gain.setTargetAtTime(0.0001, audioNow(), 0.025);
    motor.osc.stop(audioNow() + 0.12);
    motor = null;
  }

  function spinSound(spin, bst) {
    if (!prefs[2] || !audio || audio.state !== 'running') return;
    if (!motor) {
      const osc = audio.createOscillator(), gain = audioGain();
      osc.type = triangleWave;
      gain.gain.value = 0.0001;
      osc.connect(gain).connect(audio.destination);
      osc.start();
      motor = { osc, gain };
    }
    motor.osc.frequency.setTargetAtTime(46 + spin * 5 + bst * fixed0, audioNow(), 0.05);
    motor.gain.gain.setTargetAtTime(0.009 + spin * 0.0012, audioNow(), 0.05);
  }

  function celebrate() {
      cheer();
      blip(784, 1047, 0.14, 0.04, squareWave);
      const scores = this.k || this.u;
      this.z9 = this.m > 1 ? playerColors[Number(scores[1] > scores[0])] : 0xffd36a;
      this.G = clock(this);
      this.vL = [];
      if (reducedMotion()) return;
      const colors = [this.z9, chileWhite];
      this.vL = Array.from({ length: 40 }, (_, i) => ({
        s: i % 2 ? 1 : -1,
        v: 20 + mathRandom() * 34,
        vG: 95 + mathRandom() * 155,
        d: mathRandom() * 0.38,
        A: 4 + mathRandom() * 8,
        h: colors[i % colors.length]
      }));
    }

  function drawParty() {
      const { m: mode, e: state, q, i: gid, j: points, k: sum, u: scores, c, h:stat, z4:tag, sl: sides, zG: badge } = this;
      const g = this.fx.o(), zE = this.hb.o();
      const duel = mode > 1;
      const done = state === 'done' || q === 'end';
      const active = state === playState || q && q !== menuState && !done;
      const turn = c ?? this.B;
      const both = gid === 2 && !q;
      const visible = duel && (done || active), cardHeight = done ? 90 : 44;
      each(sides,(card, i) => {
        const value = gid === 3 && !done && turn === i ? points : (sum || scores || [])[i] ?? 0;
        const count = String(value).length + (done ? 4 : duelNames[i].length + 1);
        card.v(visible)
          .s(done ? 270 + i * 260 : 170 + i * 280, done ? 335 : 81)
          .f(mathMin(done ? 23 : 20, (done ? 320 : 350) / count))
          .setPadding(done ? 18 : 10, done ? 14 : 9).S(230, cardHeight)
          .t(visible ? duelNames[i] + (done ? '\n' : ' ') + value + (done ? pointUnit : '') : '');
        if (visible) zE.F(i ? chileBlue : 0xa82736,card.x - 115, card.y - cardHeight / 2, 230, cardHeight, 12);
      });
      badge.v(duel && active).t(both ? this.g?'J1 VS CPU':'J1 + J2\n¡JUEGUEN!' : turn && this.g?'CPU\nPENSANDO':'J' + (turn + 1) + '\nTU TURNO')
        .k(both ? '#172d4f' : turn ? '#174786' : '#a82736');
      if (stat) {
        const timer = both && (active || done), timed = timer && duel && active;
        if (timed) zE.F(chileNavy,338, 125, 124, 34, 17);
        stat.a(timed ? 0.5 : 0, 0).s(timed ? mid : 38, timed ? 128 : duel && active ? 104 : 78)
          .f(timer ? 24 : duel && active ? 13 : 20)
          .u(timer && active && this.U >= 55
            ? !reducedMotion() && this.U * 2 % 2 >= 1 ? '#ff9898' : '#ffdc85'
            : ink);
      }
      if (tag) tag.j(duel && active ? 104 : 78).f(duel && active ? 14 : 20);
      if (this.G === undefined) return;
      const elapsed = (clock(this) - this.G) / 1000;
      if (elapsed > 2.5) {
        this.G = undefined;
        return;
      }
      const fade = 1 - elapsed / 2.5;
      const glow = this.vL.length ? 0.55 + 0.35 * mathCos(elapsed * pi * 3) : 0.7;
      g.H(3,this.z9,145, 152, 510, 329, 16,glow * fade);
      if (duel) g.H(4,this.z9,this.z9 === playerColors[1] ? 415 : 155, 288, 230, 94, 8,glow);
      for (const piece of this.vL) {
        const t = elapsed - piece.d;
        if (t < 0 || t > 1.75) continue;
        const x = mid + piece.s * (251 + piece.v * t);
        const y = 383 - piece.vG * t + 143 * t * t;
        if (y > 495) continue;
        const flutter = 2 + 5 * mathAbs(mathCos(t * piece.A));
        g.B(piece.h,x, y, flutter, 5,1 - t / 1.75);
      }
    }


  class Barrio extends Phaser.Scene {
    constructor() { super('bolitas'); }

    create() {
      const scene = this;
      scene.wA();
      scene.tr = graphics(this);
      scene.wH = graphics(this);
      scene.z1(38, 20, barrioTitle, 28, ink, true);
      arcadeLink(this, 689, 556, patioLabel, () => scene.wO(), true);
      scene.zE = scene.z1(38, 78, '', 20, ink, true);
      scene.z4 = scene.z1(630, 78, '', 17, muted).a(1, 0);
      scene.n = scene.z1(mid, 150, '', 18, ink);
      scene.zF = [
        arcadeLink(this, 238, 458, startLabel(), () => scene.xB(1)),
        arcadeLink(this, 562, 458, startLabel(true), () => scene.xB(2))
      ];
      scene.K = scene.z1(mid, 110, '', 16, '#ffe597', true).a(0.5);
      scene.ov = graphics(this).z(2);
      scene.tt = graphics(this).z(2).setY(-32);
      scene.s = 0;
      scene.l = reducedMotion();
      scene.t = arcadeText(this, screenHeight, 354, '', 20, '#ffdf85').z(4);
      scene.lb = arcadeLink(this, 540, 556, pauseLabel(false), () => { scene.l = !scene.l; });
      scene.z0 = scene.z1(mid, 160, '', 35, ink, true).a(0.5).z(3);
      scene.wM = scene.z1(mid, 281, '', 19, ink, true).a(0.5).z(3);
      scene.wN = scene.z1(mid, 423, '', 18, muted).a(0.5).n(2).z(3);
      scene.D = new Set();
      bindControls(this, button => {
        scene.D.add(button);
        if (button[3] === '2') {
          scene.wO();
        } else if (scene.q === menuState) {
          if (button[3] === '4') scene.l = !scene.l;
          if (button === startSolo) scene.xB(1);
          if (button === startDuel) scene.xB(2);
        } else if (scene.q === 'end') {
          if (button === startSolo || button === startDuel) {
            backSound();
            scene.mn();
          }
          if (button === action || (scene.m > 1 && button === 'P2_1')) scene.xB(scene.g ? 1 : scene.m);
        } else if (scene.q === aimPhase && button === scene.N('1')) {
          scene.d = 0;
          scene.q = chargingPhase;
        }
      }, button => {
        scene.D.delete(button);
        if (scene.q === chargingPhase && button === scene.N('1')) scene.fire();
      }, () => {
        scene.D.clear();
        if (scene.q === chargingPhase) {scene.q = aimPhase;scene.d=0;}
      });
      scene.m = 1;
      scene.zD = arcadeRecords[0];
      scene.mn();
    }

    z1(x, y, value, size, color) {
      return arcadeText(this, x, y, value, size, color, { lineSpacing: 10 }).a(0);
    }

    wA() {
      const g = graphics(this);
      paintNavy(g);
      g.B(0x9c6347,0, 119, width, 414);
      const random = new Phaser.Math.RandomDataGenerator([patioScene]);
      const range = random.realInRange.bind(random);
      for (let i = 0; i < 1800; i++) {
        const x = range(0, width);
        const y = range(121, 531);
        const size = range(0.5, 2.6);
        g.c(i % 2 ? 0xffcd8c : 0x4c2c24, range(0.12, 0.38));
        g.e(x, y, size * 2.4, size);
      }

      for (let i = 0; i < 25; i++) {
        const x = range(18, width - 18);
        const y = range(135, 518);
        if (mathHypot(x - cx, y - cy) < ring + 18) continue;
        const size = range(2, 6);
        g.E(0x52382e,x + 2, y + 2, size * 2, size,0.6);
        g.E(0xd0a681,x, y, size * 2, size,0.72);
      }

      for (const [offset, color, thickness] of [[2, 0x6a4134, 5], [0, 0xeec699, 2]]) {
        g.p(thickness, color, 0.86).beginPath();
        for (let i = 0; i <= 160; i++) {
          const angle = i * pi / 80;
          const r = ring + offset + mathSin(angle * 13) * 1.5 + mathSin(angle * 37) * 0.8;
          const x = cx + mathCos(angle) * r, y = cy + mathSin(angle) * r;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.closePath().strokePath();
      }
      star(g, 45, 145, 10);
      vaso(g, 65, 472, chileRed);
      vaso(g, 733, 472, chileBlue);
      gameHeader(g, 0);
    }

    pn(title, options, detail) {
      this.ov.o().F(0x101c24,78, 121, 644, 373, 18,0.96);
      this.ov.H(2,0x5de3bd,78, 121, 644, 373, 18,0.72);
      this.z0.t(title);
      this.wM.j(this.q === menuState ? 202 : 281).f(this.q === menuState ? 22 : 23).n(6).t(options);
      this.wN.j(this.q === menuState ? 379 : 423).t(detail);
    }

    wO() {
      backSound();
      this.scene.start(patioScene);
    }

    mn() {
      const scene = this;
      scene.G = undefined;
      scene.fx.o();
      each(scene.zF,link => link.v(true));
      scene.q = menuState;
      scene.tr.o();
      scene.wH.o();
      scene.zE.t('SACA BOLITAS');
      scene.z4.t('');
      scene.K.t('');
      scene.n.t('');
      scene.pn(head,
        '1 APUNTA       2 SUELTA       3 PUNTÚA',
        'Mantén y suelta\n' +
        'Saca blancas o rivales: +100\n' +
        'Saca 2 y deja tu bolita dentro: +250\n' +
        'Final: +200 por bolita propia en el círculo');
      scene.lb.v(true);
      guideKeys(this, 0);
      lesson(scene.tt.o(), 0, scene.s);

    }

    N(control) {
      return 'P' + (this.c + 1) + '_' + control;
    }

    xB(mode) {
      const scene = this;
      scene.tt.o();
      scene.t.v(false);
      scene.lb.v(false);
      confirmSound();
      each(scene.zF,link => link.v(false));
      mode = cpuMode(scene,mode);
      scene.m = mode;
      guideKeys(this, 0, true);
      scene.u = [0, 0];
      scene.sh = [0, 0];
      scene.c = 0;
      scene.r = [];
      scene.mk = [];
      scene.vN = 0;
      scene.ov.o();
      each([scene.z0, scene.wM, scene.wN, scene.K],label => label.t(''));
      scene.wC();
      scene.wB();
    }

    wC() {
      const spots = [];
      for (let i = 0; i < 49; i++) {
        const ball = marble(cx + (i % 7 - 3) * 38, cy + (mathFloor(i / 7) - 3) * 38, chileWhite);
        if (this.r.every(other => gap(ball,other) >= 28)) spots.push(ball);
      }
      for (let i = 0; i < 6 && spots.length; i++)
        this.r.push(...spots.splice(mathFloor(mathRandom() * spots.length), 1));
    }

    wB() {
      const scene = this;
      scene.vD = [];
      scene.t.v(false);
      scene.n.s(mid, 150);
      scene.K.t('');
      if (!scene.r.some(ball => ball.M === undefined)) scene.wC();
      const shooterColor = playerColors[scene.c];
      scene.L = marble(cx, cy + ring - 29, shooterColor);
      scene.L.M = scene.c;
      scene.H = -pi / 2;
      if(scene.g && scene.c){
        const target=scene.r.find(ball=>ball.M!==1&&ball.y<470)||scene.r[0];
        const dx=target.x-scene.L.x,dy=target.y-scene.L.y;
        scene.H=mathAtan2(dy,dx)+(mathRandom()-.5)*.12;
        scene._=clamp(mathHypot(dx,dy)/1000+.25,.35,.6);
      }
      scene.q = aimPhase;
      scene.d = 0;
      scene.hp();
      const playerName = 'J' + (scene.c + 1);
      const turn = scene.m > 1 ? playerName : 'SOLO';
      scene.z4.u(scene.m < 2 ? '#ffe597' : scene.c ? '#a7dbff' : '#ffacae');
      scene.z4.t(turn + '  /  TIRO ' + (scene.sh[scene.c] + 1) + ' DE 5');
      scene.n.t('');
    }

    hp() {
      this.zE.t(this.m < 2
        ? this.u[0] + recordUnit + this.zD
        : '');
    }

    fire() {
      const scene = this;
      const power = 190 + powerAt(scene.d, true) * 810;
      scene.L.u = mathCos(scene.H) * power;
      scene.L.r = mathSin(scene.H) * power;
      scene.q = 'roll';
      scene.S = 0;
      scene.z6 = 0;
      scene.vF = 0;
      for (const ball of [scene.L, ...scene.r]) {
        ball.B = ball.x;
        ball.C = ball.y;
        ball.D = 0;
      }
      scene.K.t('');
      scene.n.t('RODANDO');
      blip(190, 100, 0.09, 0.07, triangleWave);
    }

    O(dt) {
      const all = [this.L, ...this.r];
      const balls = all.filter(ball => !ball.o);
      for (const ball of all) {
        ball.x += ball.u * dt;
        ball.y += ball.r * dt;
        const velocity = speed(ball);
        ball.A += velocity * dt / radius;
        const drag = velocity ? mathMax(0, 1 - 210 * dt / velocity) : 0;
        ball.u *= drag;
        ball.r *= drag;
        if (ball.x < -radius || ball.x > width + radius ||
            ball.y < -radius || ball.y > height + radius) {
          ball.u = ball.r = 0;
        }
        if (ball.y < 119 || ball.y > 533 || ball.x < 0 || ball.x > width) continue;
        this.vX(ball);
      }
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i];
        for (let j = i + 1; j < balls.length; j++) {
          const b = balls[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const distance = mathHypot(dx, dy);
          if (distance >= 2 * radius) continue;
          const nx = distance ? dx / distance : 1, ny = distance ? dy / distance : 0;
          const correction = (2 * radius - distance) / 2;
          a.x -= nx * correction;
          a.y -= ny * correction;
          b.x += nx * correction;
          b.y += ny * correction;
          const approach = (a.u - b.u) * nx + (a.r - b.r) * ny;
          if (approach <= 0) continue;
          const impulse = approach * 0.91;
          a.u -= nx * impulse;
          a.r -= ny * impulse;
          b.u += nx * impulse;
          b.r += ny * impulse;
          if (approach > 85) {
            this.dh(a.x + nx * radius, a.y + ny * radius, approach);
            blip(450 + approach, 260, 0.05, 0.033);
          }
        }
      }
      for (const ball of balls) {
        if (mathHypot(ball.x - cx, ball.y - cy) <= ring) continue;
        ball.o = true;
        if (ball !== this.L && ball.M !== this.c) {
          this.vF++;
          blip(570 + 140 * this.vF, 510, 0.14, 0.06);
        }
      }
      return all.some(ball => speed(ball) > 0);
    }

    vX(ball) {
      const dx = ball.x - ball.B, dy = ball.y - ball.C;
      const distance = mathHypot(dx, dy);
      if (distance < 3) return;

      this.mk.push({
        x1: ball.B, y1: ball.C, x2: ball.x, y2: ball.y,
        F: this.vN
      });
      ball.B = ball.x;
      ball.C = ball.y;

      ball.D += distance;
      if (ball.D < 13 || speed(ball) < 45) return;
      ball.D = 0;
      for (const side of [-1, 1]) {
        this.vD.push({
          x: ball.x - dx / distance * radius,
          y: ball.y - dy / distance * radius,
          u: (-dx - dy * side * 2) / distance * 13,
          r: (-dy + dx * side * 2) / distance * 13,
          U: 0, F: 0.34, s: 3
        });
      }
    }

    dh(x, y, speed) {
      const spread = clamp(speed * 0.12, 22, 78);
      for (let i = 0; i < 6; i++) {
        const angle = i * pi / 3 + 0.3;
        const drift = spread * (0.65 + (i % 3) * 0.17);
        this.vD.push({
          x, y, u: mathCos(angle) * drift, r: mathSin(angle) * drift * 0.65,
          U: 0, F: 0.42 + (i % 3) * 0.05, s: 4 + i % 3
        });
      }
    }

    vY(dt) {
      this.vN += dt;
      const lifetime = 2.6;
      this.mk = this.mk.filter(mark => this.vN - mark.F < lifetime);
      this.tr.o();
      for (const { x1, y1, x2, y2, F } of this.mk) {
        const opacity = 1 - (this.vN - F) / lifetime;
        this.tr.L(4,0x55352b,x1, y1, x2, y2,0.32 * opacity);
        this.tr.L(1,0xf5bf84,x1, y1 + 2, x2, y2 + 2,0.42 * opacity);
      }
    }

    se() {
      const scene = this;
      const vU = scene.L.o ? 0 : scene.vF * (scene.vF - 1) * 25;
      const points = scene.vF * 100 + vU;
      blip(points?520:300,points?880:180,.14,.045);
      if(vU)blip(880,1320,.12,.04,squareWave,.12);
      const combo = scene.vF >= 3 ? '¡TERREMOTO!' : '¡COMBO!';
      scene.u[scene.c] += points;
      scene.sh[scene.c]++;
      scene.q = reviewPhase;
      scene.rv = 1.55;
      scene.t.t(combo + ' +' + points).v(vU > 0).s(mid, 245);
      scene.hp();
      scene.n.t(scene.L.o ? 'TU BOLITA: FUERA' : 'TU BOLITA: DENTRO');
      scene.K.t('J' + (scene.c + 1) + '  +' + points + pointUnit +
        (vU ? ' · ' + combo + ' +' + vU : ''));
    }

    nxt() {
      const scene = this;
      scene.r = scene.r.filter(ball => !ball.o);
      if (scene.sh[0] + scene.sh[1] === 5 * scene.m) {
        scene.zA();
        return;
      }
      if (!scene.L.o) scene.r.push(scene.L);
      if (scene.m > 1) scene.c = 1 - scene.c;
      scene.wB();
    }

    zA() {
      const scene = this;
      scene.q = 'end';
      blip(440, 220, 0.24, 0.055, triangleWave);
      const vU = [0, 0];
      for (const ball of [...scene.r, scene.L]) {
        if (!ball.o && ball.M >= 0) vU[ball.M] += 200;
      }
      scene.u[0] += vU[0];
      scene.u[1] += vU[1];
      const one = scene.u[0];
      if ((scene.m < 2 || scene.g) && scoreQualifies(0, one)) {
        scene.scene.start(scoresScene, { game: 0, points: one });
        return;
      }
      scene.K.t('BONO · ' + duelScore(vU));
      scene.hp();
      scene.z4.t(gameOver);
      scene.pn(gameOver, scene.m < 2 ? one + recordUnit + scene.zD :
        '', replayLabel());
      if (scene.m > 1) {
        duelTitle(scene.z0, scene.u);
        if (scene.u[0] !== scene.u[1]) celebrate.call(this);
      }
      guideKeys(this);
      scene.n.t('');
    }

    update(time, delta) {
      const scene = this;
      drawParty.call(this);
      updateMusic();
      if (scene.q === menuState) {
        if (!scene.l) scene.s += mathMin(delta, 50) / 1000;
        lesson(scene.tt.o(), 0, scene.s);
        teachPoints(this, 0);
        scene.lb.t(pauseLabel(scene.l));
        return;
      }
      const dt = mathMin(delta, 50) / 1000;
      scene.vY(dt);
      if(scene.g && scene.c && (scene.q===aimPhase || scene.q===chargingPhase)){
        scene.q=chargingPhase;
        if(scene.d>1.1){scene.d=scene._;scene.fire();}
      }
      if (scene.q === 'end') return;
      if (scene.q === aimPhase || scene.q === chargingPhase) {
        const direction = scene.g && scene.c ? 0 : Number(scene.D.has(scene.N('R'))) - Number(scene.D.has(scene.N('L')));
        scene.H = clamp(scene.H + direction * dt * 1.75, -pi + 0.16, -0.16);
        if (scene.q === chargingPhase) scene.d += dt;
      } else if (scene.q === reviewPhase) {
        scene.rv -= dt;
        if (scene.rv <= 0) scene.nxt();
      } else {
        scene.z6 += dt;
        while (scene.z6 >= 1 / fixed0 && scene.q === 'roll') {
          scene.z6 -= 1 / fixed0;
          scene.S += 1 / fixed0;
          const moving = scene.O(1 / fixed0);
          if (!moving || scene.S >= 5) scene.se();
        }
      }
      for (const grain of scene.vD) {
        grain.U += dt;
        grain.x += grain.u * dt;
        grain.y += grain.r * dt;
      }
      scene.vD = scene.vD.filter(grain => grain.U < grain.F);
      scene.xJ();
    }

    xJ() {
      const scene = this;
      const g = scene.wH;
      g.o();
      if (scene.q === aimPhase || scene.q === chargingPhase) {
        const directionX = mathCos(scene.H), directionY = mathSin(scene.H);
        const power = powerAt(scene.d, true);
        const length = 89 + power * 58;
        for (let d = 21; d <= length; d += 12) {
          g.c(0xfff0c4, 0.95 - 0.65 * d / length);
          g.d(scene.L.x + directionX * d, scene.L.y + directionY * d, 2.7);
        }
        g.F(0x301f24,cx - 52, 513, 104, 10, 5);
        g.F(power > 0.8 ? 0xffb45d : 0x5de3bd,cx - 51, 514, 8 + 94 * power, 8, 4);
      }
      for (const grain of scene.vD) {
        const fade = grain.U / grain.F;
        g.E(0xffd29d,grain.x, grain.y, grain.s + fade * 7, grain.s * 0.6 + fade * 4,(1 - fade) * 0.55);
      }
      if (scene.q === reviewPhase) {
        const pulse = 17 + (1.55 - scene.rv) * 7;
        if (scene.t.visible && !reducedMotion()) {
          scene.t.j(225 + scene.rv * 13).setScale(1 + 0.15 * mathSin(scene.rv * 16));
        }
        if (scene.vF) g.B(0xffedbe,0, 0, width, height,mathMax(0, (scene.rv - 1.4) * 0.65));
        g.R(3,scene.t.visible ? playerColors[scene.c] : 0xffe6a6,scene.L.x, scene.L.y, scene.t.visible ? pulse * 3 : pulse,0.88);
        g.R(1,0x4d3228,scene.L.x, scene.L.y, pulse + 2,0.9);
      }
      for (const ball of [...scene.r, scene.L]) marbleArt(g, ball);
    }


  }

  function marbleArt(g, { x, y, h:color, A: spin = 0 }) {
      g.E(0x36251f,x + 4, y + 9, 29, 17,0.43);
      g.D(0x293039,x, y, radius + 1,0.56);
      g.D(color,x, y, radius,color === 0xfff6e9 ? 0.39 : 0.8);
      g.D(0x203d50,x + 2, y + 2, radius - 3,0.39);
      g.D(0xfff9e9,x - 2, y - 2, radius - 3,0.24);
      const cos = mathCos(spin), sin = mathSin(spin);
      const glassPoint = (dx, dy) => [x + dx * cos - dy * sin, y + dx * sin + dy * cos];
      for (let i = -7; i <= 7; i++) {
        const curve = mathSin(i * 0.42) * 4;
        g.c(color, 0.95).d(...glassPoint(i, curve), 2.8);
        g.c(0xffead3, 0.68).d(...glassPoint(i, curve - 1.5), 1.15);
      }
      g.E(0xffffff,x - 5, y - 6, 8, 4,0.88);
      g.D(0xffffff,x + 1, y - 9, 1.4,0.59);
      g.E(color,x + 5, y + 8, 6, 2.5,0.9);
    }

  const games = [
    [barrioTitle, 'Saca bolitas', 0xffbb72],
    ['LA RAYUELA', 'Apunta a la línea', 0xff916d],
    ['EL TROMPO', 'Recoge aros', 0x67dbad],
    ['EL VOLANTÍN', 'Vuela y esquiva', 0x8bd8ff]
  ];
  const redCutTime = 0.65;
  const redRadius = 18;
  const autoCutTime = 0.17;

  function onThread(x, y, start, end) {
    const dx = end.x - start.x, dy = end.y - start.y;
    const t = clamp(((x - start.x) * dx + (y - start.y) * dy) /
      mathMax(1, dx * dx + dy * dy), 0, 1);
    const px = start.x + dx * t, py = start.y + dy * t;
    return { x: px, y: py, I: mathHypot(px - x, py - y) };
  }

  const roundGuides = [
    '',
    '5 tiros · Mira = impacto\nQuemada: próximo ×2 · Racha ×5',
    '60 s · Chile +500 a los 20/40 s\nBarro frena · Piedra rebota',
    'Blanco +100 · Oro +250\n+10 pts/s\nRojos y cóndores · Duelo por turnos'
  ];

  const boxX = mid, boxY = fixed2, rayCord = 3;
  const rayInside=(x,y,margin=0)=>mathAbs(x-boxX)<=100-margin&&mathAbs(y-boxY)<=76-margin;
  const rayLanding = (aim, charge) => 478 + (aim - 478) * (0.45 + powerAt(charge) * 1.05);
  const rayX = (x, y) => mid + (x - mid) * (rayY(y) + 650) / 960;
  // Low shooter camera: one ground projection for aim, clay, cord and scoring.
  const rayY = y => -650 + 1328784 / (1656 - y);
  const raySize = y => 0.34 + (y - 185) / 650;

  const { Between: randomBetween } = Phaser.Math;
  const stoneZones = [[267, 255], [535, 260], [358, 273], [305, 419], [535, 419]];

  function teachPoints(scene, id) {
    const t = scene.s % 3, ring = t >= 1.2;
    scene.t.t(id === 2 ? ring ? '+200' : '+100' : id ? '+100' : '¡COMBO! +250')
      .v(id === 2 ? t >= 0.44 && t < 0.8 || ring && t < 1.6 : t >= (id ? 2 : 1.6))
      .s(id === 2 ? ring ? 430 : 370 : screenHeight, (id ? 227 : 293) - mathMax(0, t - 2) * 8);
  }

  function stone(g, x, y, size = 1) {
    g.E(0x503124,x + 2 * size, y + 4 * size, 28 * size, 13 * size,0.3)
      .E(0x80766b,x, y, 26 * size, 15 * size)
      .E(0xc8bca7,x - 3 * size, y - 3 * size, 16 * size, 6 * size);
  }

  function mudPatch(g, x, y, size) {
    const lobe = size / 5;
    g.E(0x74422e,x, y, size, size * 0.63)
      .d(x - lobe, y - lobe, lobe)
      .d(x + lobe, y + lobe, lobe);
  }

  function cpuMode(scene,mode){
    scene.g=mode===1&&scene.i!==3;
    duelNames[1]=scene.g?'CPU AZUL':'J2 AZUL';
    return scene.g?2:mode;
  }
  function guideKeys(scene, id, playing) {
    each((scene.zF || [scene.gb, scene.vI]),(button, i) => button?.t(startLabel(i,id)).S(280, 50));
    scene.vJ?.destroy();
    scene.bb?.f(prefs[0]?17:15).t((prefs[0]?'':'B2 ')+patioLabel);
    if (id === undefined) return;
    const caps = scene.vJ = scene.add.container();
    const keyboard = prefs[0];
    for (let seat = 0; seat < (playing && (scene.m < 2 || scene.g || id===3) ? 1 : 2); seat++) {
      const side=playing&&id===3?scene.B:seat;
      const x = 95 + (playing&&id===3?0:side*240);
      const panel = graphics(scene).F(chileNavy,x - 85, 528, 232, 55, 12);
      panel.H(2,playerColors[side],x - 85, 528, 232, 55, 12);
      caps.add(panel);
      caps.add(arcadeText(scene, x - 62, 555, 'J' + (side + 1), 18));
      const move = side ? id ? ' ↑ /←↓→' : '← →' : id ? ' W /ASD' : 'A D';
      if (!keyboard) {
        panel.E(0x41638a,x+12,561,28,12).B(creamInk,x+10,548,4,13).D(playerColors[side],x+12,548,8);
        for (const [dx,dy,key] of [[-18,0,'←'],[18,0,'→'],...(id ? [[0,-18,'↑'],[0,18,'↓']] : [])])
          caps.add(arcadeText(scene,x+12+dx,553+dy,key,14));
      } else each(move.split('/'),(row, y) => {
        each([...row],(key, i) => {
          if (key !== ' ') caps.add(arcadeText(scene, x + (i - 1) * 24, 540 + (y + !id) * 26, key, 18,
            ink, { backgroundColor: '#41638a' }).S(23, 24));
        });
      });
      const keys = keyboard ? side ? 'RYG' : 'UOK' : ['B1', 'B3', 'B5'];
      each((id===3 ? playing?[]:[1,2] : [0]),(k,i)=>{
        const y=id===3 ? 542+i*25 : 555;
        if(!keyboard) panel.D(playerColors[side],x+61,y,12);
        caps.add(arcadeText(scene,x+61,y,keys[k],14,ink, {backgroundColor:keyboard?'#41638a':null}));
        caps.add(arcadeText(scene,x+108,y,id===3 ? ['PICADA','PIRUETA'][i] : id===2?'TURBO':'LANZA',13));
      });
    }
  }

  function dangerRing(g, x, y, radius, progress) {
    g.R(2,roseInk,x, y, radius,0.3).p(3, roseInk, 1)
      .beginPath().arc(x, y, radius, -pi / 2, pi * (2 * progress - 0.5)).strokePath();
  }

  function turboMeter(g, x, y, cooldown, active) {
    const charge = 1 - mathMax(0, cooldown);
    g.B(chileNavy,x - 17, y + 17, 34, 6)
      .B(active ? chileWhite : charge === 1 ? cyanInk : turboInk,x - 16, y + 18, 32 * (active ? 1 : charge), 4);
  }

  function lessonCards(g) {
    for (let x = 106; x < 700; x += 200)
      g.F(0x234464,x, 215, 188, 152, 12).H(1,0x527898,x, 215, 188, 152, 12);
  }

  function lesson(g, id, time = 0) {
    const p = mathMin(1, time % 3 / 2), angle = p * pi * 2, wave = mathSin(angle), hit = mathMax(0, (p - 0.6) / 0.4);
    lessonCards(g);
    if (id < 2) {
      const x = id ? 342 : 142, y = id ? 280 : 336;
      g.F(0x101c24,x, y, 116, 18, 5);
      g.B(0xffca72,x + 3, y + 3, 108 * powerAt(time % 3, !id), 12);
    }
    if (!id) {
      g.L(2,goldInk,200, 315, 200 + wave * 40, 265);
      g.D(goldInk,200 + wave * 40, 265, 3);
      for (let i = 0; i < 3; i++) {
        const x = 200 + i * 200;
        g.R(2,p >= 0.8 && i ? goldInk : skyInk,x, 293, 37);
        const travel=mathMin(p/0.55,1), out=mathMax(0,(p-0.55)/0.45);
        marbleArt(g, { x, y: i ? 337-(i===1?40:43)*travel-out*9 : 315, h: chileRed });
        for (const side of i === 2 ? [-1, 1] : [1])
          marbleArt(g, { x: x + side * (i===2?12+40*out:0), y:273-(i?out*16:0), h: out && i===2?goldInk:chileWhite });
      }
    } else if (id === 1) {
      icon(g, 1, 200, 292, chileRed);
      g.R(2,goldInk,200 + wave * 19, 292 + wave * 8, 5);
      g.D(chileRed,mid, 325, 16);
      icon(g, 1, screenHeight, 292, chileRed);
      const ground = 331 - p * 39;
      tejoArt(g, 608, ground - mathSin(p * pi) * 36, (24 - p * 7) / 34, p === 1 ? goldInk : chileRed, ground);
    } else {
      g.l(screenHeight, 248, screenHeight, 338);
      const top = (x, y) => topArt(g, { x, y: y + 11, H: angle * 4 });
      const move = angle + 0.55 * wave;
      const sx = mathSin(move), cy = mathCos(move);
      const x = 200 + 36 * sx, y = 278 + 10 * cy;
      top(x, y);
      if (p < 0.13) g.L(7,turboInk,x, y, x - 36 * cy, y + 10 * sx).D(chileWhite,x, y, 5);
      turboMeter(g, x, y + 9, 1 - p * 2, p < 0.13);
      if (p < 0.22) g.M(4,0xffd76c,370, 292, 34, 23);
      if (p < 0.59) g.M(4,cyanInk,430, 292, 40, 28,p < 0.42 || mathFloor(time * 12) % 2);
      top(336 + 160 * mathMin(p, 0.8), 268);
      mudPatch(g, 551, 315, 38);
      stone(g, 650, 315, 0.6);
      top(p < 0.3 ? 520 + p * 90 : 547 + (p - 0.3) * 16, 286);
      top(650 - 26 * mathAbs(1 - p * 2), 286);
    }
  }

  function vineyard(g) {
      g.B(0x8bb5ce,0, 122, width, 95);
      mountains(g, 217, 0x597992);
      g.B(0xb77a52,0, 217, width, 309);
      for (let row = 0; row < 8; row++) for (let i = 0; i < 5 + row * 2; i++) {
        const scale = 0.35 + row * 0.1, x = mid + (i - 2 - row) * (48 + row * 8) + (i * 7 + row * 3) % 9 - 4,
          y = 217 + row * 8 + mathAbs(x - mid) * 0.07,
          top = y - (43 + i * 7 % 17) * scale, lean = ((i + row) % 3 - 1) * 7 * scale;
        if (x < -40 || x > 840) continue;
        g.E(0x896343,x, y, 30 * scale, 6,0.6);
        g.L(2 * scale,0x644b31,x, y, x + lean, top + 8).l(x + lean, top + 8, x - 16 * scale, top);
        g.E((i + row) % 2 ? 0x48633a : 0x597646,x - 12 * scale, top, (30 + i % 3 * 5) * scale, 17 * scale)
          .e(x + 14 * scale, top + 3, 29 * scale, 15 * scale);
        for (let berry = 0; berry < 6 + i % 3; berry++)
          g.D(i % 4 ? 0x624565 : 0x9d9d4b,x + (9 + berry % 2 * 6) * scale, top + (12 + mathFloor(berry / 2) * 6) * scale, 4 * scale);
      }
  }

  function tejoArt(g, x, y, scale, color = 0xbcd0df, ground = y) {
        g.E(0x563b30,x + 4, ground + 5 * scale, 36 * scale, 14 * scale,0.58);
        g.E(0x343d49,x, y + 3 * scale, 34 * scale, 18 * scale);
        g.E(color,x, y, 34 * scale, 15 * scale);
        g.E(0xe8eff2,x - 5 * scale, y - 3 * scale, 14 * scale, 4 * scale);
  }

  function topArt(g, top, c = -1) {
      const { x, y, b:bst, cd, E: kick, H: angle = 0 } = top;
      const color = playerColors[mathMax(0, c)];
      const highlight = c <= 0 ? 0xffb6af : 0xd3eeff;
      g.E(0x503124,x + 6, y + 8, 43, 19,0.6);
      g.Q(0x6b382d,x - 22, y - 13, x + 22, y - 13, x, y + 13);
      g.E(color,x, y - 14, 45, 23);
      if (bst > 0) {
        g.L(7,turboInk,x, y + 4, x - top.u * 0.15, y + 4 - top.r * 0.15,bst * 2.6)
          .D(chileWhite,x, y, 5);
      }
      if (c >= 0) turboMeter(g, x, y, mathMax(cd, kick), bst);
      const gleam = mathSin(angle) * 11;
      g.E(highlight,x + gleam, y - 15, 13, 6);
      g.F(0xe5b484,x - 4, y - 33, 8, 15, 3);
    }


  function icon(g, index, x, y, color, t) {
      if (index === 0) {
        g.R(1,color,x, y, 28);
        for (const [dx, dy, tint] of [[-10, -7, chileRed], [11, -8, 0x6cbcf1], [1, 13, color]]) {
          marbleArt(g, { x: x + dx, y: y + dy, h: tint, A: t * 4 });
        }
      } else if (index === 1) {
        if (t >= 0) {
          g.E(0xb77a52,x, y + 23, 100, 52);
          for (let v = x - 36; v <= x + 36; v += 24)
            g.L(2,0x64733c,v, y - 10, v, y - 31)
              .E(0x567643,v, y - 30, 19, 9).D(0x77518a,v + 4, y - 19, 3);
          const tray = [{ x: x - 25, y: y - 6 }, { x: x + 25, y: y - 6 },
            { x: x + 41, y: y + 26 }, { x: x - 41, y: y + 26 }];
          g.c(0xad7658).g(tray, true).p(5, 0x633729).strokePoints(tray, true);
          g.L(2,creamInk,x - 30, y + 9, x + 30, y + 9);
          tejoArt(g, x - 13, y + 16, 0.55);
          const flight = mathMin(1, t % 3), ground = y + 40 - 31 * flight;
          tejoArt(g, x + 12 * flight, ground - 80 * flight * (1 - flight), 0.4, 0xbcd0df, ground);
        } else {
          g.F(0xad7658,x - 29, y - 22, 58, 44, 5);
          g.L(2,chileWhite,x - 29, y, x + 29, y);
          tejoArt(g, x - 14, y + 4, 0.65);
        }
      } else if (index === 2) {
        g.M(2,creamInk,x, y + 24, 78, 24,0.55);
        g.M(2,cyanInk,x + 31, y + 24, 21, 13);
        topArt(g, { x, y: y + 11, H: t * 8 });
      } else {
        g.E(0xe2f1f5,x - 19, y - 32, 48, 12,0.7);
        g.Q(0x526d89,x - 49, y + 35, x - 3, y - 10, x + 49, y + 35);
        g.Q(creamInk,x - 15, y + 2, x - 3, y - 10, x + 11, y + 2);
        const kx = x + mathSin(t * 2) * 5, ky = y - 8 + mathCos(t * 1.5) * 3;
        g.L(1,creamInk,kx, ky + 20, x - 12, y + 49);
        kiteArt(g, kx, ky, chileBlue, 1, 1.1);
      }
    }


  class Patio extends Phaser.Scene {
    constructor(key = patioScene) { super(key); }

    create() {
      const scene = this;
      unlockAudio();
      if (scene.i === undefined) {
        scene.i = 3;
        scene.op();
      }
      scene.wJ = arcadeRecords;
      loadScores();
      scene.D = new Set();
      scene.A = graphics(this);
      const label = (x, y, size, color) => arcadeText(this, x, y, '', size, color);
      scene.fs = label(38, 20, 28).a(0, 0);
      scene.h = label(38, 78, 17).a(0, 0).z(4);
      scene.vA = label(mid, 561, 18).n(1);
      scene.vU = label(0, 0, 16, '#baffff').setStroke('#173247', 4).z(1).t('+200').v(false);
      scene.E = label(mid, 140, 16).v(false);
      scene.sk=[0,1].map(i=>arcadeLink(this,310+i*125,552,'',()=>scene.ab(i),true).f(14).S(116,48).v(false));
      scene.pb = arcadeLink(this, 768, 550, '⚙︎', () => scene.e === patioState ? scene.zC() : scene.os(), true).f(28);
      scene.q5 = [0, 1, 2].map(i => arcadeLink(this, mid, 230 + i * 90, '', pointer => {
        prefs[i] = pointer ? pointer.worldX<mid : !prefs[i];
        if (i === 1 && musicBus) {
          if (prefs[i]) musicBus.connect(audio.destination);
          else musicBus.disconnect();
        }
        scene.zC();
      }, true));
      scene.vR = arcadeLink(this, mid, 480, '', () => scene.or(), true);
      scene.bb = arcadeLink(this, 689, 556, patioLabel, () => scene.wO(), true);
      scene.zs = games.map((_, i) => activate(scene.add.zone(
        220 + i % 2 * 360, 226.5 + mathFloor(i / 2) * 158, 340, 139
      ), () => {
          if (scene.J || scene.e !== patioState) return;
          scene.i = i;
          scene.H();
        }).on('pointerover', () => {
          if (!scene.J && scene.e === patioState && scene.i !== i) {
            scene.i = i;
            scene.pv = clock(scene);
            controlSound(left);
          }
        }));
      scene.wK = label(mid, 300, 24).z(1).k('#192531').setPadding(18);
      scene.wL = label(mid, 256, 33).z(2).v(false);
      scene.uf = graphics(this).z(2);
      scene.t = label(screenHeight, 259, 20, '#ffdf85').z(4).v(false);
      scene.gh = label(mid, 162, 28).t(head).z(3);
      scene.q4 = label(mid, 380, 20).n(2).z(3);
      scene._ = graphics(this).z(3).setY(-32);
      scene.vS = [200, mid, screenHeight].map(x => label(x, 197, 18).z(4));
      scene.a = [200, mid, screenHeight].map(x => label(x, 322, 18).z(4));
      scene.gb = arcadeLink(this, 252, 458, startLabel(), () => scene.zB());
      scene.vI = arcadeLink(this, 548, 458, startLabel(true), () => scene.zB(2));
      const toggle = () => {
        scene.l = !scene.l;
        scene.db.t(pauseLabel(scene.l));
      };
      scene.db = arcadeLink(this, 540, 556, '', toggle);
      scene.vQ = games.map(([, description], i) => {
        const x = 279 + i % 2 * 360, y = 199 + mathFloor(i / 2) * 158;
        return [
          label(x, y, 24),
          label(x, y + 32, 15, '#e9c29b').t(description),
          label(x, y + 61, 15, '#a9d8f3')
        ];
      });
      scene.events.once('shutdown', () => {
        stopMotor();
      });
      bindControls(this, button => {
        if (scene.J) return;
        scene.D.add(button);
        if (scene.e === patioState) {
          button = button.replace('P2_', 'P1_');
          const previous = scene.i;
          if (button === left || button === right) scene.i ^= 1;
          if (button === up || button === downButton) scene.i ^= 2;
          if (button === thirdButton) scene.or();
          if (button === sixthButton) scene.zC();
          if (previous !== scene.i) { scene.pv = clock(scene); blip(510 + scene.i * 90, 390, 0.075, 0.046); }
          if (confirmButton(button)) scene.H();
        } else if (button[3] === '2') {
          scene.wO();
        } else if (scene.e === 'prefs') {
          const option = scene.q5[Number(button.slice(-1)) - 3];
          option?.emit('pointerdown');
          option?.emit('pointerup');
        } else if (scene.e === guideState) {
          if (button[3] === '4') toggle();
          if (button[3] === '3') scene.z7 = 0.32;
          if (button[3] === '5') scene.vC = 5;
          if (button === startDuel) scene.zB(2);
          if (confirmButton(button)) scene.zB();
        } else if (scene.e === 'done' && (confirmButton(button) || scene.m > 1 && button === 'P2_1')) {
          const mode = scene.g ? 1 : scene.m;
          scene.H();
          scene.zB(mode);
        } else if (scene.e === playState) {
          if (scene.i === 3) for(let i=0;i<2;i++)
            if(button==='P'+(scene.B+1)+'_'+(i?5:3))scene.ab(i);
          const c = button === action ? 0 : button === 'P2_1' ? 1 : -1;
          if (c < 0 || c >= scene.m) return;
          if (scene.i === 1 && c === scene.B && !scene.w && !scene.C) {
            scene.d = 0;
            scene.T = true;
          }
          if (scene.i === 2) scene.bo(scene.V[c]);

        }
      }, button => {
        scene.D.delete(button);
        if (button === 'P' + (scene.B + 1) + '_1' && scene.T && scene.e === playState) scene.tj();
      }, () => {
        scene.D.clear();
        scene.T = false;
        scene.d = 0;
      });
      scene.r5();
    }

    op() {
      window.focus();
      // Center the artwork and credit as a group. The prompt stands alone.
      const artOffsetX = -38.5, artOffsetY = -7;
      const g = graphics(this).z(5).setPosition(artOffsetX, artOffsetY);
      this.J = true;
      g.B(0,-artOffsetX, -artOffsetY, width, height);
      const credit = arcadeText(this, width / 2, height / 2, 'ENTER / CLIC · JUGAR', 32).z(5);
      const gate=this.time.addEvent({delay:fixed0,loop:true,callback:() => {
        if(audio && audio.state!=='running')return;
        gate.remove();
        credit.j(353).t('Creado por @esteflan-vybe');
        g.E(0xffce77,mid, 312, 106, 27)
          .q(365, 251, 453, 312, 347, 312).q(365, 251, 435, 251, 453, 312);
        g.E(0xa45029,mid, 251, 70, 25);
        // The far lens narrows as the flan turns toward the monitor.
        g.L(3,0x131c20,368, 269, 390, 276);
        g.B(0x131c20,411, 275, 14, 4)
          .q(385, 273, 415, 275, 405, 286)
          .q(440, fixed2, 422, 275, 430, 283);
        g.L(2,0x437268,394, 275, 410, 277).l(425, 276, 435, 274);
        g.p(3, 0x542f25).beginPath().arc(415, 284, 14, 0.18, 1.48).strokePath();
        g.B(0x254257,452, 266, 72, 52).b(434, 318, 96, 8).c(0x88edaa);
        for (let i = 0; i < 12; i++) {
          this.time.delayedCall(100 + i * 95, () => {
            g.b(462 + i % 3 * 14, 278 + mathFloor(i / 3) * 10, 10, 3);
            if (!audio) return;
            pandereta(0, 0.18, audio.destination, 1.8 + mathRandom());
            blip(1180, 940, 0.026, 0.064, triangleWave);
          });
        }
        // Compressed C–F–G–C flourish, based on the supplied success reference.
        this.time.delayedCall(1600, () => each([523, 698, 784, 1047],(hz, i) =>
          blip(hz, hz, 0.32 - i * 0.047, 0.068, triangleWave, i * 0.047)));
        this.tweens.add({ targets: [g, credit], alpha: 0, y: '-=12', delay: 1750, duration: 400,
          onComplete: () => { this.J = false; g.destroy(); credit.destroy(); } });
      }});
    }

    wO() {
      backSound();
      this.r5();
    }

    or() {
      if (this.J) return;
      confirmSound();
      this.scene.start(scoresScene, { game: this.i });
    }

    zC() {
      this.e = 'prefs';
      this.wD(false);
      this.fs.t(this.pg ? 'PAUSA · AJUSTES' : 'AJUSTES');
      this.bb.t(this.pg ? '↩ ' + (prefs[0] ? 'I/T' : 'B2') + ' · Seguir' : patioLabel);
      this.h.t('');
      this.vA.t('');
      this.uf.o();
      each(this.q5,(button, i) => {
        this.uf.F(0x203a60,185, 192 + i * 90, 430, 76, 38);
        const choices = i ? ['ON', 'OFF'] : ['TECLADO', 'GABINETE'];
        button.v(true).f(18).setPadding(10, 12).S(430, 76).t(
          ['CONTROLES', 'MÚSICA', 'EFECTOS DE SONIDO'][i] + '\n' +
          choices.map((name, option) => (prefs[i] === !option ? '☑ ' : '☐ ') + name).join('   ') +
          separator + (prefs[0] ? ['O', 'J', 'K'][i] : 'B' + (i + 3)));
      });
    }

    wD(visible) {
      this.pb.v(visible).s(768, 550);
      this.fs.s(visible ? mid : 38, visible ? 61 : 20).a(visible ? 0.5 : 0, visible ? 0.5 : 0).f(visible ? 40 : 28).setFontFamily(visible ? 'Impact, sans-serif' : 'monospace');
      this.vR.v(visible).t('RÉCORDS · ' + (prefs[0] ? 'O' : 'B3'));
      this.bb.v(!visible);
      each(this.vQ.flat(),label => label.v(visible));
      for (const label of [this.E, this.wK, this.wL]) label.v(false);
      for (const zone of this.zs) {
        if (visible) zone.setInteractive({ useHandCursor: true });
        else zone.disableInteractive();
      }
    }

    r5() {
      const scene = this;
      scene.G = undefined;
      scene.fx.o();
      duelNames[0] = 'J1 ROJO';
      stopMotor();
      scene.gd(false);
      scene.wD(true);
      each(scene.q5,button => button.v(false));
      scene.g=false;
      scene.e = patioState;
      scene.T = false;
      scene.pv = clock(scene);
      scene.fs.t('LA FONDA ARCADE');
      scene.h.t('');
      scene.vA.t((prefs[0] ? 'WASD · U' : 'JOYSTICK · B1') + ' Jugar');
    }

    H(turn = 0) {
      const scene = this;
      scene.G = undefined;
      scene.fx.o();
      if (scene.J) return;
      confirmSound();
      if (scene.i === 0) {
        scene.scene.start('bolitas');
        return;
      }
      scene.e = guideState;
      scene.wD(false);
      scene.fs.t(games[scene.i][0]);
      scene.j = 0;
      scene.m = 1;
      scene.B = turn;
      scene.U = scene.z6 = scene.d = scene.sh = 0;
      scene.kn = scene.Q = scene.cp = scene.ca = scene.rh = scene.v = scene.F = 0;
      if (!turn) scene.k = [0, 0];
      scene.u = scene.r = 0;
      scene.vM = [];
      scene.ds = [];
      scene.z8 = [];
      scene.x = mid;
      scene.M = boxY;
      scene.T = false;
      scene.w = null;
      scene.C = null;
      scene.$ = [0, 0];
      scene.V = [scene.nt(mid)];
      scene.rg = scene.rk = [];
      scene.ks = [];
      scene.n = [];
      scene.red = 2;
      scene.vH = false;
      scene.O = 0.65;
      scene.bd = [];
      scene.N = null;
      scene.P = 12 + mathRandom() * 4;
      scene.vG = 16;
      scene.o = '';
      scene.f = null;
      scene.R = 0.18;
      scene.z5 = scene.i === 3;
      scene.y = scene.z5 ? 475 : 345;
      scene.h.t('¡A JUGAR!');
      const isKite = scene.i === 3;
      scene.q4.t(roundGuides[scene.i]);
      scene.l = reducedMotion();
      scene.s = 0;
      scene.z7 = scene.vC = scene.tc = scene.p = 0;
      scene.I = 586;
      scene.dy = 301;
      scene.b = false;
      scene.K = '';
      scene.gd(true);
    }

    gd(visible) {
      const scene = this;
      guideKeys(this, visible ? scene.i : undefined);
      scene.t.v(false);
      scene.vA.t('').v(!visible);
      for (const label of [scene.gh, scene.q4, scene.gb, scene.vI]) label.v(visible);
      scene.uf.o();
      scene._.o();
      const showDemo = visible && scene.i === 3;
      scene.db.v(visible).t(pauseLabel(scene.l));
      if (showDemo) { scene.a[0].t((prefs[0] ? 'O/Y' : 'B3') + ' · 2.5 s'); scene.kg(0); }
      each(scene.vS.concat(scene.a),label => label.v(visible));
      if (!showDemo) {
        const ray = scene.i === 1;
        each(scene.vS,(label, i) => label.t((ray ? ['1 APUNTA', '2 CARGA', '3 SUELTA'] : ['1 MUEVE', '2 RECOGE', '3 ESQUIVA'])[i]));
        each(scene.a,(label, i) => label.j(!ray && i === 1 ? 312 : 322).t((ray ? ['', 'Mantén y suelta', 'Toca la línea'] : ['TURBO', 'Oro 100\nCeleste 200', ''])[i]));
      } else each(scene.vS,(label, i) => label.t(['PICADA', 'PIRUETA', 'CORTA / ESQUIVA'][i]));
      if (visible) {
        const [, accent] = headerThemes[scene.i];
        scene.uf.F(0x172638,76, 128, 648, 366, 18,0.98);
        scene.uf.H(2,accent,76, 128, 648, 366, 18);
        if (!showDemo) lesson(scene._, scene.i);
      }
    }

    kg(dt) {
      const scene = this;
      scene.z7 = scene.z7 < -2.18 ? 0.32 : scene.z7 - dt;
      scene.vC = mathMax(0, scene.vC - dt) || 5;
      scene.a[1].j(322).t((prefs[0] ? 'K/G' : 'B5') + ' · ' + mathCeil(scene.vC) + ' s');
      const angle = scene.vC > 4.2 ? (5 - scene.vC) * pi / 0.4 : 0;
      scene.I = clamp(scene.I + scene.W(left, right) * 76 * dt, 518, 678);
      scene.dy = clamp(scene.dy + (56 * scene.W(up, downButton) - (scene.b && scene.s > 2.25 ? 85 : 0)) * dt, 253, 325);
      if (scene.p > 0) {
        scene.p = mathMax(0, scene.p - dt);
        if (!scene.p) {
          scene.s = scene.tc = 0;
          scene.b = !scene.b;
          scene.I = 586;
          scene.dy = 301;
        }
      } else {
        scene.s += dt;
      }
      const g = scene._.o();
      lessonCards(g);

      for (const [x, y] of [[210, 257 + 55 * (scene.z7 > 0 ? 1 - scene.z7 / 0.32 : mathMax(0, 1 + scene.z7))], [410 + mathSin(angle) * 22, 290 - mathCos(angle) * 22]]) {
        g.L(1,0xd3e8f4,x, y + 12, x - 12, 339);
        g.D(0xffcc79,x - 12, 339, 3);
        kiteArt(g, x, y, 0x79caff, 1, 0.55);
      }
      g.L(2,skyInk,156, 262, 156, 312);
      g.Q(skyInk,150, 307, 156, 316, 162, 307);
      g.R(2,skyInk,410, 290, 22,angle ? 1 : 0.5);

      const rivalX = 677 - scene.s * 43;
      const rivalY = scene.b ? 296 : 254;
      const start = { x: rivalX, y: rivalY + 12 };
      const end = { x: rivalX - 16, y: 339 };
      const bodyDistance = mathHypot(scene.I - rivalX, scene.dy - rivalY);
      const near = scene.b ? bodyDistance < 34 : onThread(scene.I, scene.dy, start, end).I < 23;
      const contact = scene.b ? bodyDistance < 13 : near;
      const limit = scene.b ? redCutTime : autoCutTime;
      if (!scene.p) {
        const escaped = scene.b && !near && scene.tc > 0;
        scene.tc = contact ? mathMin(limit, scene.tc + dt * (scene.b ? 3 : 1)) : 0;
        if ((contact && scene.tc >= limit) || escaped || scene.s > 3.65) {
          scene.K = contact && scene.tc >= limit ? (scene.b ? '¡TE CORTÓ!' : '¡CORTE!') :
            scene.b ? '¡ESQUIVADO!' : 'Acércate';
          scene.p = 0.95;
        }
      }
      const sliced = scene.K === '¡CORTE!' && scene.p > 0;
      if (near && !scene.p) {
        const tint = scene.b ? roseInk : 0xffdc8d;
        if (scene.b) dangerRing(g, scene.I, scene.dy, 15, scene.tc / limit);
        else g.R(2,tint,scene.I, scene.dy, 15);
      }
      if (scene.b) {
        g.R(1.5,0xffa1a1,rivalX, rivalY, 13);
      }
      const drift = 0.95 - scene.p;
      for (const [x, y, color, cut] of [
        [scene.I, scene.dy, 0x79caff, scene.p && scene.K === '¡TE CORTÓ!'],
        [rivalX, rivalY, scene.b ? chileRed : 0xe6f4dc, sliced]
      ]) {
        if (!cut) g.L(1,color,x, y + 12, x - 16, 339,0.7);
        else g.R(2,goldInk,x, y, 3 + drift * 30,scene.p);
        kiteArt(g, x + (cut ? drift * 60 : 0), y - (cut ? drift * 55 : 0), color, cut ? scene.p : 1, 0.55);
      }
      const prompt = scene.p ? sliced ? "+100 · ¡CORTE!" : scene.K : scene.b
        ? (near ? '¡ALÉJATE!' : 'Evita al rojo')
        : (near ? 'Corte automático' : 'Busca hilo');
      scene.a[2].t(prompt).u(scene.b ? '#ffaaaa' : '#ffdc8d');
    }

    zB(mode = 1) {
      const scene = this;
      if (scene.e !== guideState) return;
      confirmSound();
      mode = cpuMode(scene,mode);
      scene.m = mode;
      if (scene.i === 3) duelNames[0] = 'J1 CHILE';
      if (scene.i === 2) {
        if (mode > 1) {
          scene.V = [scene.nt(280), scene.nt(520)];
        }
        const zH = scene.zH = ((scene.zH || 0) + randomBetween(1, 4)) % 5;
        scene.rk = stoneZones.map(([x, y], i) =>
          [x + randomBetween(-22, 22), y + randomBetween(-22, 22), (i + zH) % 5 < 2]);
        scene.br(scene.V);
        for (let i = 0; i < 3; i++) scene.ar();
        scene.ri = 6;
        scene.ch = 20;
        scene.Q = false;
      }
      scene.gd(false);
      scene.E.v(scene.i === 3);
      if (scene.z5) {
        scene.E.t((mode > 1 ? duelNames[scene.B] + separator : '') + '↑ DESPEGA');
      }
      scene.e = playState;
      scene.pb.v(true).s(768, 137);
      guideKeys(this, scene.i, true);
    }

    zA() {
      const scene = this;
      if (scene.i === 3 && scene.m > 1) {
        scene.k[scene.B] = scene.j;
        if (!scene.B) {
          scene.D.clear();
          scene.H(1);
          scene.zB(2);
          return;
        }
      }
      scene.e = 'done';
      guideKeys(this);
      scene.vA.t('');
      scene.E.v(false);
      stopMotor();
      blip(330, 165, 0.23, 0.045, triangleWave);
      if(scene.g)scene.j=scene.k[0];
      if ((scene.m < 2 || scene.g) && scoreQualifies(scene.i, scene.j)) {
        scene.scene.start(scoresScene, { game: scene.i, points: scene.j, kiteLoss: scene.o });
        return;
      }
      const duel = scene.m > 1;
      if (duel) {
        duelTitle(scene.wL, scene.k).v(true);
        if (scene.k[0] !== scene.k[1]) celebrate.call(this);
      }
      const result = (scene.o || gameOver) + '\n' + scene.j + recordUnit + scene.wJ[scene.i];
      scene.wK.j(duel ? 431 : 300).t(duel ? replayLabel() : result + '\n\n' + replayLabel()).v(true);
    }

    W(negative, positive) {
      if (this.i === 3 && this.B) {
        negative = negative.replace('1', '2');
        positive = positive.replace('1', '2');
      }
      return Number(this.D.has(positive)) - Number(this.D.has(negative));
    }

    tj() {
      this.T = false;
      blip(280, 95, 0.12, 0.04, triangleWave);
      const time = 900 / 980;
      const ly = rayLanding(this.M, this.d);
      this.w = {
        x: mid, y: 478, z: 0, u: (this.x - mid) / time,
        r: (ly - 478) / time, ly,
        v: 450, a: true, M: this.B
      };
    }

    Y(dt, dx, dy = 0) {
      const scene = this;
      if (scene.C) {
        scene.C.F -= dt;
        if (scene.C.F <= 0) {
          if (scene.m > 1 && scene.C.p) scene.ds.push(scene.C);
          scene.C = null;
          if (scene.sh === 5 * scene.m) scene.zA();
          else if (scene.m > 1) {
            scene.B = 1 - scene.B;
            scene.x = mid;
            scene.M = boxY;
          }
        }
      } else if (scene.w) {
        const shot = scene.w;
        // Exact ballistic time to the clay; X/Y advance with the same clock as Z.
        const step = shot.a ? mathMin(dt,(shot.v + Math.sqrt(shot.v * shot.v + 1960 * shot.z)) / 980) : dt;
        shot.x += shot.u * step;
        shot.y += shot.r * step;
        if (shot.a) {
          shot.z += (shot.v - 490 * step) * step;
          shot.v -= 980 * step;
          if (step < dt || shot.z <= 1e-8) {
            shot.z = 0;
            shot.ly = 0;
            scene.vW(shot);
            if (scene.bt(shot)) return;
            const offsetX = shot.x - boxX, offsetY = shot.y - boxY;
            const clay = rayInside(shot.x,shot.y);
            const side = mathAbs(offsetX) >= 90, end = mathAbs(offsetY) >= 66;
            if (clay && (side || end)) {
              // The wooden lip kicks the disc back onto the clay.
              shot.u = side ? -mathSign(offsetX) * 60 : shot.u * 0.12;
              shot.r = end ? -mathSign(offsetY) * 60 : shot.r * 0.12;
              shot.v = 115;
              blip(540, 200, 0.07, 0.045, triangleWave);
              return;
            }
            shot.u *= clay ? fixed3 : 0.25;
            shot.r *= clay ? fixed3 : 0.25;
            shot.v *= clay ? -0.025 : -0.14;
            shot.a = shot.v > 18;
          }
        } else {
          if (scene.bt(shot)) return;
          const drag = mathMax(0, 1 - 460 * dt / (mathHypot(shot.u, shot.r) || 1));
          shot.u *= drag;
          shot.r *= drag;
          if (!drag) scene.stj(shot);
        }
      } else {
        scene.x = clamp(scene.x + dx * 235 * dt, 175, 625);
        scene.M = clamp(scene.M + dy * 100 * dt, 195, 349);
        if (scene.T) scene.d += dt;
      }
      if(scene.g && scene.B && !scene.C && !scene.w && scene.e===playState){
        if(!scene.d){
          scene.x=330+mathRandom()*140;
          scene.M=boxY+(mathRandom()-.5)*30;
        }
        scene.d+=dt/2;
        if(scene.d>.56)scene.tj();
      }
      const sh = scene.sh + (scene.C ? 0 : 1);
      const tejo = 'TEJO ' + mathCeil(sh / scene.m) + '/5';
      const seq = scene.$[scene.B];
      const result = scene.C ? separator + (seq === 5 ? '¡PURO FUEGO!' : seq ? 'QUEMADA' : '+' + scene.C.p) : '';
      const next = seq && (!scene.C || sh <= 4 * scene.m + scene.B) ?
        ' · SIG. ×' + (seq + 1) : '';
      if (scene.e === playState) scene.h.t(tejo + (scene.m < 2 ? separator + scene.j + pointUnit : '') + result + next);
    }

    bt(shot) {
      const blocked = (x, y) => this.ds.find(disc => mathHypot(disc.x - x, disc.y - y) < 20);
      const disc = blocked(shot.x, shot.y);
      if (!disc) return false;
      const dx = shot.x - disc.x, dy = shot.y - disc.y;
      const normal = mathHypot(dx, dy) > 3 ? mathAtan2(dy, dx) : mathAtan2(-shot.r,-shot.u);

      // Prefer the vW normal. In a cluster, look for the closest free landing.
      for (let radius = 22; ; radius += 22) {
        for (let i = 0; i < 12; i++) {
          const angle = normal + (i % 2 ? 1 : -1) * mathFloor((i + 1) / 2) * pi / 6;
          const x = disc.x + mathCos(angle) * radius, y = disc.y + mathSin(angle) * radius;
          if (blocked(x, y)||!rayInside(x,y,12)) continue;
          shot.a = true;
          shot.v = 155;
          const flightTime = 2 * shot.v / 980;
          shot.u = (x - shot.x) / flightTime;
          shot.r = (y - shot.y) / flightTime;
          blip(1100, 430, 0.08, 0.055);
          return true;
        }
      }
    }

    vW(shot) {
      const str = clamp(-shot.v / 450, 0.12, 1);
      blip(155 + str * 110, 48, 0.07 + str * 0.1, str * 0.084, triangleWave);
      blip(720, 135, 0.045, str * 0.026);
      this.vM.push({ x: shot.x, y: shot.y, s:str });
      for (let i = 0; i < 14 * str; i++) {
        const angle = i * 2.4;
        const speed = (26 + (i % 4) * 18) * str;
        this.z8.push({
          x: shot.x, y: shot.y, u: mathCos(angle) * speed,
          r: mathSin(angle) * speed * 0.45 - 24, F: 0.62 + i % 3 * 0.08
        });
      }
    }

    stj(shot) {
      const scene = this;
      const y=rayY(shot.y),above=shot.y<boxY;
      const edge = y + (above?12:-7.5)*raySize(y) + (above?1:-1)*rayCord/2;
      const near = 1656 - 1328784 / (edge + 650);
      const distance = mathMax(0,(above?-1:1)*(near-boxY));
      const span = 76 - mathAbs(near-shot.y);
      const inside = rayInside(shot.x,shot.y);
      const points = inside ? distance ? clamp(99-mathRound(89*distance/span),10,99) : 100 : 0;
      const multi=1+scene.$[scene.B], earned = points * multi;
      scene.j += earned;
      scene.k[scene.B] += earned;
      if (points === 100) {
        scene.$[scene.B]++;
        confirmSound();
      } else {
        scene.$[scene.B] = 0;
        if (points) blip(620, 740, 0.1, 0.04);
      }
      scene.sh++;
      scene.C = { ...shot, F: 1.15, p: earned };
      scene.S(rayX(shot.x, shot.y) + 60, rayY(shot.y), multi>1?'×'+multi+' → '+earned:earned, points === 100 ? '#ffdc78' : ink, 21);
      scene.w = null;
      scene.d = 0;
    }

    L(dt, targetX, targetY, response, left, right, top, bottom, bounce = 0, body = this) {
      const blend = 1 - Math.exp(-response * dt);
      body.u += (targetX - body.u) * blend;
      body.r += (targetY - body.r) * blend;
      const x = body.x + body.u * dt, y = body.y + body.r * dt;
      body.x = clamp(x, left, right);
      body.y = clamp(y, top, bottom);
      if (x !== body.x) body.u *= -bounce;
      if (y !== body.y) body.r *= -bounce;
    }

    bo(top) {
      if (top.cd > 0 || top.E > 0) return;
      top.b = 0.26;
      top.cd = 1;
      blip(130,330,0.18,fixed3,triangleWave);
    }

    nt(x) {
      return { x, y: 345, u: 0, r: 0, A: 14, b: 0, cd: 0, E: 0, H: 0 };
    }

    ar() {
      const occupied = [...this.V, ...this.rg];
      const clear = (x, y) => occupied.every(point => mathHypot(x - point.x, y - point.y) >= 48) &&
        this.rk.every(([sx, sy]) => mathHypot(x - sx, y - sy) >= 42);
      for (let attempt = 0; attempt < 18; attempt++) {
        const [x,y] = attempt < 12 ? [randomBetween(184,616),randomBetween(208,455)] :
          [[192,215],[330,215],[470,215],[608,215],[192,448],[608,448]][attempt-12];
        if (!clear(x,y)) continue;
        this.rg.push({x,y});
        return;
      }
    }

    br(spinning) {
      let zD, bestDistance = 0;
      for (const x of [192, mid, 608]) {
        for (const y of [215, 330, 448]) {
          if (this.rg.some(ring => mathHypot(ring.x - x, ring.y - y) < 56)) continue;
          const distance = mathMin(...spinning.map(top => mathHypot(top.x - x, top.y - y)));
          if (distance > bestDistance) {
            zD = { x, y, F: 2.8 };
            bestDistance = distance;
          }
        }
      }
      if (!zD) return;
      this.rg.push(zD);
      blip(570, 950, 0.12, 0.032, triangleWave);
    }

    Z(dt) {
      const scene = this;
      const { V: tops, rg: rings, k: sum } = this;
      if(scene.U>=scene.ch && scene.ch<=40){
        scene.ch+=20;
        rings.push({x:mid,y:215,u:0,r:0,ch:true});
        blip(650,1300,.2,.04);
      }
      for(const ring of rings)if(ring.ch){
        const near=tops.reduce((a,b)=>gap(a,ring)<gap(b,ring)?a:b);
        const flee=gap(ring,near)<fixed0?0:1;
        const angle=mathAtan2(ring.y-near.y+(654-2*ring.y)*flee,ring.x-near.x+(fixed1-2*ring.x)*flee)+mathSin(scene.U*3)*.7;
        scene.L(dt,mathCos(angle)*310,mathSin(angle)*310,10,180,620,200,455,.9,ring);
      }
      each(tops,(top, i) => {
        const p = 'P' + (i + 1) + '_';
        const target=rings.find(r=>r.ch)||rings[0]||top;
        const bot=scene.g && i;
        const dx = bot ? clamp((target.x-top.x)/35,-.7,.7) : scene.W(p + 'L', p + 'R'), dy = bot ? clamp((target.y-top.y)/35,-.7,.7) : scene.W(p + 'U', p + 'D');

        top.b = mathMax(0, top.b - dt);
        top.cd = mathMax(0,top.cd-dt);
        if(bot && !top.e && gap(target,top)>65)scene.bo(top);
        if (top.E > 0) {
          const step = mathMin(dt, top.E);
          top.E -= step;
          // Reflect at the walls without losing speed or travel distance.
          for (const [axis, velocity, min, max] of [['x', 'u', 160, 640], ['y', 'r', 180, 475]]) {
            const next = top[axis] + top[velocity] * step;
            const edge = clamp(next, min, max);
            top[axis] = 2 * edge - next;
            if (edge !== next) top[velocity] *= -1;
          }
          if (top.E === 0) top.u = top.r = 0;
        } else {
          // Recoil locks steering, so only spend spin while the c has control.
          top.e = scene.rk.some(([x, y, mud]) => mud && mathHypot(top.x - x, top.y - y) < 37);
          const speed = top.e ? 90 : top.b > 0 ? 365 : 190;
          const direction = mathMax(1, mathHypot(dx, dy));
          scene.L(dt, dx * speed / direction, dy * speed / direction,
            top.b > 0 ? 13 : 7, 160, 640, 180, 475, 0.55, top);
          for (const [x, y, mud] of scene.rk) {
            const dx = top.x - x, dy = top.y - y;
            const distance = mathHypot(dx, dy);
            if (mud || distance >= 22) continue;
            const recoil = 150 / (distance || 1);
            top.u = (dx || !distance) * recoil;
            top.r = dy * recoil;
            top.E = 0.16;
            blip(320, 160, 0.05, 0.027, triangleWave);
            break;
          }
        }
        top.H += dt * (7 + top.A * 2.2 + top.b * 35) * (top.e ? 0.65 : 1);
      });
      const [p1, p2] = tops;
      if (p2 && !p1.E && !p2.E) {
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const distance = mathHypot(dx, dy);
        if (distance >= 38) scene.Q = false;
        else if (!scene.Q) {
          scene.Q = true;
          const vx = distance ? 420 * dx / distance : 420;
          const vy = distance ? 420 * dy / distance : 0;
          p1.u = -vx;
          p1.r = -vy;
          p2.u = vx;
          p2.r = vy;
          p1.E = p2.E = 0.32;
          const boosted = Number(p1.b > 0) - Number(p2.b > 0);
          if (boosted) {
            const top = boosted > 0 ? p1 : p2;
            blip(660, 990, 0.09, 0.03, triangleWave, 0.06);
          }
          if (p1.b && p2.b) scene.S((p1.x + p2.x) / 2, p1.y, '¡CHISPA!', '#fff9ec', 19);
          p1.b = p2.b = 0;
          blip(280, 85, 0.12, 0.055, triangleWave);
          blip(720, 420, 0.055, 0.023);
        }
      }
      const spinning = tops;
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        const vU = ring.F !== undefined;
        if (vU) {
          ring.F -= dt;
          if (ring.F <= 0) {
            rings.splice(i, 1);
            continue;
          }
        }
        const distances = tops.map(top => gap(ring,top));
        const c = distances[1] < distances[0] ? 1 : 0;
        if (distances[c] > 29) continue;
        rings.splice(i, 1);
        if (!vU && !ring.ch) scene.ar();
        const points = ring.ch ? 500 : vU ? 200 : 100;
        scene.j += points;
        sum[c] += points;
        const popupX = ring.x + (ring.x < mid ? 42 : -42);
        scene.S(popupX, ring.y - 10, points, ring.ch ? '#ffdc78' : vU ? '#baffff' : '#fff9ec', vU ? 23 : 19);
        blip(590 + c * 85, 880, 0.11, 0.045);
        if (vU) blip(880, 1320, 0.14, fixed3, triangleWave, 0.07);
      }
      scene.ri -= dt;
      if (scene.ri <= 0) {
        scene.br(spinning);
        scene.ri = 6;
      }
      spinSound(14,
        mathMax(...spinning.map(top => top.b)));
      const remaining = mathMax(0, 60 - scene.U);
      scene.h.t(remaining.toFixed(1) + ' s' + (p2 ? '' : ' · ' + scene.j + pointUnit));
      if (!remaining) scene.zA();
    }

    r4(dt, dx, dy) {
      const scene = this;
      const { U: age } = this;
      for (const kite of scene.n) {
        kite.F -= dt;
        kite.x += kite.u * dt;
        kite.y += kite.r * dt;
        kite.r -= 33 * dt;
      }
      scene.n = scene.n.filter(kite => kite.F > 0);
      const gust = mathSin(age * 2.2 + scene.y * 0.019) * 71;
      const updraft = mathCos(age * 2.7 + scene.x * 0.013) * 48;
      const rise = mathMax(0, -dy);
      scene.R = clamp(scene.R + rise * 0.5 * dt, 0, 1);
      const altitude = 465 - scene.R * 270;
      scene.v = mathMax(0, scene.v - dt);
      const tension = clamp((altitude - scene.y) * 1.15, -145, 145);
      scene.F = mathMax(0, scene.F - dt);
      const spin = scene.F > 4.2 ? (5 - scene.F) * pi / 0.4 : 0;
      scene.L(dt, spin ? mathCos(spin) * 314 : dx * 226 + gust * (0.65 + scene.R),
        spin ? -mathSin(spin) * 314 : scene.v > 2.18 ? 520 : dy * 235 + tension + updraft,
        spin || scene.v > 2.18 ? 1000 : 3.2, 28, 772, 179, 500);
      scene.vG -= dt * (scene.y > 455 ? 1.55 : 0.30);
      scene.O -= dt;
      if (scene.O <= 0) scene.ss();
      const previousTarget = scene.f?.w;
      scene.f = null;
      let danger = false;
      scene.rh = 0;
      const thread = scene.X();
      for (const kite of scene.ks) {
        if (kite.e) {
          const dx = scene.x - kite.c, dy = scene.y - kite.d;
          const near = mathHypot(dx, dy) < 240;
          if(age>=kite.e)kite.u=kite.c<mid?-180:180;
          else if (near) {
            kite.u += clamp(clamp(dx * 1.1, -150, 150) - kite.u, -150 * dt, 150 * dt);
            kite.r += clamp(clamp(dy * 0.8, -90, 90) - kite.r, -fixed0 * dt, fixed0 * dt);
          } else kite.r = -10;
        }
        kite.c += kite.u * dt;
        kite.d += kite.r * dt;
        // Vertices on a 3×3 grid, traversed as Z, N and M.
        const gold = kite.h === goldInk;
        const path = gold ? '604286' : kite.e ? '60826' : '02680';
        const q = (age * (gold ? 7 : kite.e ? 5 : 3) + kite.q) % (path.length - 1);
        const segment = q | 0, t = q - segment;
        const a = +path[segment], b = +path[segment + 1];
        const blend = (from, to) => from + (to - from) * t - 1;
        kite.x = kite.c + blend(a % 3, b % 3) * 32;
        kite.y = clamp(kite.d + blend(a / 3 | 0, b / 3 | 0) * 24, 178, 500);
        if (kite.x < 29 || kite.x > 771) {
          kite.f = 0;
          continue;
        }
        if (kite.e) {
          const bodyDistance = gap(kite,scene);
          const touching = bodyDistance < redRadius || thread.some((p, i, a) =>
            i && onThread(kite.x, kite.y, a[i - 1], p).I < redRadius);
          danger ||= bodyDistance < 145 || touching;
          kite.f = touching ? mathMin(redCutTime, (kite.f ?? 0) + dt * (bodyDistance < redRadius ? 3 : 1)) : mathMax(0, (kite.f ?? 0) - dt);
          scene.rh = mathMax(scene.rh, kite.f);
        } else {
          const point = scene.tpn(kite);
          if (point.I <= 54 && (!scene.f || point.I < scene.f.I)) {
            scene.f = { ...point, w:kite };
          }
        }
      }
      if (scene.f) {
        scene.ca = (previousTarget === scene.f.w ? scene.ca : 0) + dt;
        if (scene.ca >= autoCutTime) {
          scene.ck(scene.f);
          scene.f = null;
          scene.ca = 0;
        }
      } else {
        scene.ca = 0;
      }
      if (danger && !scene.vH) blip(520, 310, 0.14, 0.044);
      scene.vH = danger;
      const birdHit = scene.bs(dt, thread);
      scene.ks = scene.ks.filter(kite => !kite.g && mathAbs(kite.c - mid) < 485 && kite.d > 119);
      scene.j = mathFloor(age * 10) + scene.cp;
      scene.h.t((age >= 26 ? 'INSANO · ' : '') + (scene.m < 2 ? scene.j + pointUnit + separator : '') + 'AIRE ' + mathMax(0, scene.vG).toFixed(1));
      if (birdHit) scene.o = '¡CÓNDOR AL HILO!';
      else if (scene.rh >= redCutTime) scene.o = '¡CORTARON TU HILO!';
      else if (scene.vG <= 0) scene.o = 'SIN AIRE';
      scene.E.t(danger && scene.N ? '¡ROJO Y CÓNDOR!' :
        danger ? '¡ESQUIVA AL ROJO!' :
        scene.N ? '¡CUIDADO WN UN CONDOR!' :
        scene.f ? 'CORTE AUTO' :
        scene.Q === 5 ? '¡REY DEL CIELO!' : age >= 26 ? '¡MODO INSANO!' : 'CORTA HILOS');
      scene.E.u(scene.N?'#ff8585':ink);
      if (scene.o) {
        if (birdHit || scene.rh >= redCutTime) blip(1800, 85, 0.32, 0.075);
        scene.zA();
      }
    }

    ab(i) {
      if(this.e!==playState||this.z5)return;
      if(!i&&!this.v){
        this.r=520;this.R=mathMax(0,this.R-.2);this.v=2.5;
        blip(235,520,.13,.038,triangleWave);
      }
      if(i&&!this.F){this.F=5;blip(410,125,.19,.047,triangleWave);}
    }

    ss() {
      const { U: age, kn: kiteNo } = this;
      const red = kiteNo >= this.red &&
        this.ks.filter(kite => kite.e).length < mathMin(7, 1 + mathFloor(age / 7));
      const lane = kiteNo < 2 ? kiteNo : randomBetween(0, 2);
      if (red) this.red = kiteNo + (age < 12 ? randomBetween(2, 3) : age < 26 || kiteNo % 4 === 0 ? 2 : 1);
      const speed = red ? mathMin(180, 90 + age * 2) : mathMin(230, 105 + age * 3);
      const x = lane === 0 ? -52 : lane === 1 ? width + 52 :
        clamp(this.x + randomBetween(-185, 185), 100, 700);
      const y = lane === 2 ? 500 : clamp(this.y + randomBetween(-92, 85), 188, 460);
      this.ks.push({
        x, y, c: x, d: y, q: mathRandom() * 6, e:red?age+6+mathRandom()*4:0,
        u: lane === 0 ? speed : lane === 1 ? -speed : randomBetween(-36, 36),
        r: lane === 2 ? -speed * 0.83 : -10,
        h: red ? chileRed : mathRandom() < 0.12 ? goldInk : 0xe6f4dc
      });
      this.kn++;
      this.O = mathMax(0.35, 1.25 - age * fixed3);
    }

    vK(kite) {
      const length = mathMax(0, 522 - kite.y - 20);
      return { x: clamp(kite.x - kite.u * length * 0.0035, 12, 788), y: 522 };
    }

    tpn(kite) {
      return onThread(this.x, this.y, { x: kite.x, y: kite.y + 20 }, this.vK(kite));
    }

    X() {
      const length = 502 - this.y;
      return Array.from({ length: 9 }, (_, i) => {
        const t = i / 8;
        return {
          x: this.x - this.u * t * 0.2 + mathSin(this.U * 6 - t * 8) * t * (8 + this.R * 17) * (1 - mathAbs(this.v)),
          y: this.y + 20 + length * t
        };
      });
    }

    bs(dt, thread = this.X()) {
      const scene = this;
      scene.P -= dt;
      if (scene.P <= 0) {
        const side = mathRandom() < 0.5 ? 1 : -1;
        scene.bd.push({ x: side > 0 ? -45 : width + 45,
          b: randomBetween(208, 245), u: side * randomBetween(105, 148) });
        scene.P = 18 + mathRandom() * 8;
      }
      scene.N = null;
      let snagged = false;
      const segments = thread.slice(1);
      const touches = (x, y, age) => {
        if (mathAbs(x - scene.x) > mathAbs(scene.u) * 0.2 + 90) return false;
        const flap = scene.wF(x, age) - 7;
        // Sample across the body and both wings, matching the drawn wingspan.
        for (let offset = -34; offset <= 34; offset += 8.5) {
          const px = x + offset, py = y + flap * mathAbs(offset) / 34;
          if (mathAbs(px - scene.x) / 18 + mathAbs(py - scene.y) / 22 < 1.34 ||
              segments.some((point, i) => onThread(px, py, thread[i], point).I < 7)) return true;
        }
      };
      for (const bird of scene.bd) {
        bird.x += bird.u * dt;
        bird.y = scene.by(bird, bird.x, scene.U);
        const contact = touches(bird.x, bird.y, scene.U);
        let approach = contact ? 0 : null;
        for (let step = 1; approach === null && step <= 22; step++) {
          const ahead = step * 0.08;
          const x = bird.x + bird.u * ahead;
          if (touches(x, scene.by(bird, x, scene.U + ahead), scene.U + ahead)) approach = ahead;
        }
        // Warn as soon as a condor is headed across the c's lane.
        approach ??= (scene.x - bird.x) / bird.u;
        if (approach < 0) continue;
        if (!scene.N || approach < scene.N.a) {
          const x = bird.x + bird.u * approach;
          scene.N = { w:bird, a:approach, x, y: scene.by(bird, x, scene.U + approach) };
        }
        if (contact) snagged = true;
      }
      scene.bd = scene.bd.filter(bird => bird.x > -55 && bird.x < width + 55);
      return snagged;
    }

    wF(x, age) {
      return mathSin(age * 8 + x * 0.01) * 10;
    }

    by(bird, x, age) {
      return bird.b + 200 * mathMax(0,1-mathAbs(x-mid)/260);
    }

    S(x, y, points, color, size) {
      const popup = arcadeText(this, x, y, typeof points === 'number' ? '+' + points + pointUnit : points, size, color,
        { stroke: '#163149', strokeThickness: 4 }).z(1);
      this.tweens.add({ targets: popup, y: y - 38, alpha: 0, scale: 1.25, duration: 950,
        onComplete: () => popup.destroy() });
    }

    ck({ w:kite, x, y }) {
      kite.g = true;
      const end = this.vK(kite);
      this.n.push({
        ...kite, F: 1.65, u: kite.u * 0.72, r: -48,
        j: x, k: y, l: x - kite.x, m: y - kite.y - 20, i:end
      });
      this.Q++;
      const gold = kite.h === goldInk;
      const points = gold ? 250 : 100;
      this.cp += points;
      this.S(clamp(x, 70, 730), mathMax(183, y - 14), points,
        gold ? '#ffdc78' : '#fff9ec', gold ? 25 : 20);
      blip(2300, 260, 0.047, 0.074);
      blip(275, 1100, 0.34, 0.047, triangleWave, fixed3);
      this.vG = mathMin(16, this.vG + (gold ? 3.4 : 1.9));
    }

    update(_, delta) {
      const scene = this;
      if (!scene.J) updateMusic();
      const dt = mathMin(delta, 50) / 1000;
      if (scene.e === guideState) {
        if (scene.i === 3) { if (!scene.l) scene.kg(dt); }
        else {
          if (!scene.l) scene.s += dt;
          lesson(scene._.o(), scene.i, scene.s);
          teachPoints(this, scene.i);
        }
      }
      if (scene.z5 && scene.e === playState && scene.W(up, downButton) < 0) scene.z5 = false;
      if (scene.e === playState && !scene.z5) {
        scene.U += dt;
        const dx = scene.W(left, right), dy = scene.W(up, downButton);
        if (scene.i === 1) {
          scene.z6 += dt;
          while (scene.z6 >= 1 / fixed0 && scene.e === playState) {
            const aim = scene.B === 0 ? dx : scene.W('P2_L', 'P2_R');
            scene.Y(1 / fixed0, aim, scene.B === 0 ? dy : scene.W('P2_U', 'P2_D'));
            scene.z6 -= 1 / fixed0;
          }
          for (const puff of scene.z8) {
            puff.x += puff.u * dt;
            puff.y += puff.r * dt;
            puff.F -= dt;
          }
          scene.z8 = scene.z8.filter(puff => puff.F > 0);
        }
        if (scene.i === 2) scene.Z(dt);
        if (scene.i === 3) scene.r4(dt, dx, dy);
      }
      scene.xJ();
      drawParty.call(this);
    }

    xJ() {
      const scene = this;
      scene.vU.v(false);
      each(scene.sk,b=>b.v(scene.i===3&&scene.e===playState&&!scene.z5));
      const g = scene.A.o();
      paintNavy(g);
      g.B(chileRed,0, 582, width, 18);
      if (scene.e === 'prefs') return gameHeader(g, -1);
      if (scene.e === patioState) {
        vineyard(g);
        g.B(0xb77a52,0,506,width,76);
        bunting(g, 50, 122, 14, 50);
        g.B(0x986841,56, 500, 5, 69).b(156, 500, 5, 69);
        g.save().scaleCanvas(.65,.65);
        vaso(g,132,802,chileRed);
        vaso(g,203,802,chileBlue);
        g.restore();
        g.B(0x744d35,56, 548, 105, 19);
        g.B(0xdda35f,52, 544, 113, 6);
        g.Q(0x796743,48, 500, 108, 468, 168, 500);
        for (let i = 1; i < 6; i++)
          g.D(i%2?chileRed:creamInk,48+i*20,498,4);
        for(const x of [44,176]){
          g.B(0x48633a,x,500,2,18).e(x,510,14,5);
          g.E(chileRed,x,523,12,23).e(x,531,18,6).E(0xffb1a6,x,533,12,2);
        }
        // Huaso: wide straw chupalla and a striped manta.
        g.B(0x554039,568, 541, 22, 25);
        g.F(chileRed,559, 519, 40, 29, 6);
        g.B(0xffcb85,559, 529, 40, 4).b(559, 537, 40, 3)
          .d(579, 511, 11);
        g.F(0xc6a066,568, 487, 22, 16, 4).e(579, 502, 48, 9);
        g.B(0x606572,631, 533, 6, 34).b(728, 533, 6, 34);
        g.F(0x39353a,622, 508, 121, 34, 6);
        g.B(0x241f24,629, 515, 107, 17);
        for (let i = 0; i < 8; i++)
          g.D(i % 2 ? 0xf05a30 : goldInk,635 + i * 13, 526, 2.5)
            .L(1,0x92949b,632 + i * 14, 513, 632 + i * 14, 534);
        for (let i = 0; i < 3; i++) {
          const skewer = 641 + i * 35;
          const rise = reducedMotion() ? 0.5 : (clock(scene) / 1800 + i / 3) % 1;
          g.E(creamInk,skewer + 8 + mathSin(rise * 8 + i) * 3, 501 - rise * 19, 7 + rise * 8, 3 + rise * 5,0.14 * (1 - rise));
          g.L(2,0xffd496,skewer, 537, skewer + 10, 504);
          for (let j = 0; j < 3; j++) {
            g.F(j === 1 ? 0xd9b18b : 0x8f3d28,skewer + 7 - j * 3, 508 + j * 7, 12, 6, 2);
          }
        }
        each(games,([name, , color], i) => {
          const x = 50 + i % 2 * 360, y = 157 + mathFloor(i / 2) * 158;
          const selected = i === scene.i;
          g.F(chileNavy,x,y,340,139,18,.96);
          g.H(selected ? 3 : 1,selected ? goldInk : 0x647b9c,x, y, 340, 139, 18);
          g.F(i % 2 ? 0x397fa0 : 0x986646,x + 10, y + 20, 104, 100, 14)
            .E(i === 3 ? 0x526d89 : i === 1 ? 0xb77a52 : 0xb07851,x + 62, y + 109, 104, 22);
          icon(g, i, x + 62, y + 70, color, selected && !reducedMotion() ? (clock(scene) - scene.pv) / 1000 : 1);
          scene.vQ[i][2].t('RÉCORD ' + scene.wJ[i]);
          scene.vQ[i][0].t(name).u(selected ? '#ffdf85' : ink);
        });
      } else if (scene.i === 1) scene.dr(g);
      else if (scene.i === 2) scene.dt(g);
      else if (scene.i === 3) scene.dk(g);
      if (scene.e === patioState) {
        g.F(0x461b25,24, 10, 752, 102, 18).F(0x941f32,30, 16, 740, 90, 14);
        g.H(3,goldInk,24, 10, 752, 102, 18);
        for(let i=0;i<32;i++){
          const x=48+(i<16?i:31-i)*47,y=i<16?20:104;
          const lit=reducedMotion()||(i+32-mathFloor(clock(scene)/110)%32)%32<12;
          g.D(goldInk,x,y,10,lit?.5:.16).D(lit?creamInk:goldInk,x,y,4,lit?1:.55);
        }
        flag(g, 64, 38, 72);
        flag(g, 664, 38, 72);
      } else gameHeader(g, scene.i);
    }

    dr(g) {
      const scene = this;
      const { w:vV, C: rest, B: turn } = this;
      vineyard(g);
      vaso(g, 72, 469, chileRed);
      vaso(g, 723, 469, chileBlue);
      const ground = (x, y) => ({ x: rayX(x, y), y: rayY(y) });
      const face = (color, x, y, r, b) => g.c(color).g([ground(x,y),ground(r,y),ground(r,b),ground(x,b)],true);
      face(0xad7650,286,181,514,361);
      face(0x563526,286,361,514,374);
      face(0x593d2d,296,192,504,352);
      face(0x98765b,300,196,500,348);
      for (let i = 0; i < 35; i++) {
        const y = 201 + i * 4, x = 305 + (i * 47 % 188);
        g.E(i % 2 ? 0xb29879 : 0x73563f,rayX(x, y), rayY(y), 6, 2,0.6);
      }
      const left = rayX(300,boxY), right = rayX(500,boxY), line = rayY(boxY);
      g.L(3,0x4a3025,left,line+1,right,line+1,.5);
      g.L(rayCord,0xffe9bb,left,line,right,line);
      for(const x of [left,right]) g.E(0x57483b,x,line,4,2);
      const shot = vV || rest;
      if (!shot && scene.e === playState) {
        const aim = rayLanding(scene.M, scene.d);
        const tgt = rayX(scene.x, aim);
        g.L(2,playerColors[turn],mid, 478, tgt, rayY(aim),0.8);
        g.r(tgt, rayY(aim), 9).l(tgt - 14, rayY(aim), tgt + 14, rayY(aim));
        g.F(0x513629,310, 501, 180, 10, 5);
        g.B(0xffca72,310, 501, 180 * powerAt(scene.d), 10);
      }
      for (const mark of scene.vM) {
        g.E(0x5e392d,rayX(mark.x, mark.y), rayY(mark.y), 24, 9,mark.s * 0.46);
        g.M(1,0xf7b882,rayX(mark.x, mark.y), rayY(mark.y) + 2, 24, 9,mark.s * 0.52);
      }
      for (const puff of scene.z8) {
        const size = 11 + (0.8 - puff.F) * 25;
        g.E(0xf2bf89,rayX(puff.x, puff.y), rayY(puff.y), size, size * 0.65,puff.F * 0.55);
      }
      for (const disc of [...scene.ds, shot || { x: mid, y: 478, M: turn }]) {
        const groundY = rayY(disc.y), x = rayX(disc.x,disc.y);
        const y = groundY - (disc.z ?? 0) * (groundY + 650) / 960;
        const scale = raySize(groundY);
        tejoArt(g, x, y, scale, playerColors[disc.M], groundY);
      }
    }

    dt(g) {
      const { rk: rocks, rg: rings, V: tops } = this;
      g.B(0x986646,0, 122, width, 404);
      for (let i = 0; i < 90; i++)
        g.E(i % 2 ? 0xb07851 : 0x875839,i * 83 % fixed1, 160 + i * 47 % 350, 4 + i % 7, 2 + i % 3,0.5);
      for (const x of [51, 749]) for (let y = 185; y < 450; y += 75)
        g.L(3,0x617747,x, y, x - 7, y - 12).l(x, y, x + 6, y - 16);
      g.L(3,0xc69a6a,55, 190, 55, 300);
      flag(g, 55, 192, 48);
      g.B(0x69472f,698, 282, 7, 36).b(764, 282, 7, 36).f(690, 275, 88, 8, 3);
      g.E(0xdcb568,734, 268, 62, 13).f(718, 247, 32, 22, 7);
      g.B(chileRed,719, 261, 30, 5);
      vaso(g, 64, 434, chileRed);
      vaso(g, 737, 434, chileBlue);
      g.H(2,creamInk,137, 152, 526, 345, 30,0.3);
      for (const [x, y, mud] of rocks) {
        if (mud) mudPatch(g, x, y, 74);
        else stone(g, x, y);
      }
      for (const ring of rings) {
        if(ring.ch){
          const t=reducedMotion()?0:this.U*12, flap=mathSin(t)*14;
          for(const side of [-1,1]){
            g.Q(goldInk,ring.x+side*18,ring.y,ring.x+side*56,ring.y-16-flap,ring.x+side*30,ring.y-5);
          }
          g.M(5,[chileRed,chileWhite,chileBlue][mathFloor(t/4)%3],ring.x,ring.y,62,44)
            .M(3,goldInk,ring.x,ring.y,50,36);
          flag(g,ring.x-18,ring.y-12,36);
        } else if (ring.F === undefined) {
          g.M(4,0xffd76c,ring.x, ring.y, 30, 20);
        } else {
          const alpha = ring.F < 1 ? 0.65 + 0.35 * mathCos(ring.F * 4 * pi) : 1;
          g.E(0x173247,ring.x, ring.y, 53, 37);
          g.M(4,cyanInk,ring.x, ring.y, 49, 33,alpha)
            .m(ring.x, ring.y, 33, 20);
          if (this.e === playState) this.vU.s(ring.x, ring.y - 30).v(true);
        }
      }
      each(tops,(top, i) => topArt(g, top, i));
    }

    dk(g) {
      const scene = this;
      const { U: age, R: line } = this;
      g.B(0x397fa0,0, 122, width, 404);
      for (let i = 0; i < 7; i++) {
        const x = ((i * 135 + age * (13 + i)) % 890) - 45;
        g.E(0xd8eff2,x, 160 + i * 52, 100, 18,0.23);
      }
      mountains(g, 525, 0x486b83);
      g.p(2, 0xb7d9e8, 0.7).strokeRect(12, 158, 776, 364);
      for (let i = 0; i < 24; i++) {
        const x = 20 + i * 32;
        g.L(2,0xb7d9e8,x, 158, x + 7, 165,0.5);
        g.l(x, 515, x + 7, 522);
      }
      for (const kite of scene.ks) {
        const end = scene.vK(kite);
        g.L(kite.e ? 2.5 : 1.5,kite.e ? 0xff9298 : creamInk,kite.x, kite.y + 20, end.x, end.y,0.9);
        if (kite.e) {
          g.R(1.5,0xffafb4,kite.x, kite.y, redRadius,0.8);
        }
        kiteArt(g, kite.x, kite.y, kite.h);
      }
      for (const kite of scene.n) {
        const elapsed = 1.65 - kite.F;
        const alpha = mathMin(1, kite.F * 2.5);
        const kick = mathMax(0, 1 - elapsed * 3.4);
        if (kick > 0) {
          g.L(1.5,creamInk,kite.i.x, kite.i.y,
            kite.i.x + (kite.j - kite.i.x) * kick, kite.i.y + (kite.k - kite.i.y) * kick,kick);
          g.R(2,0xffde84,kite.j, kite.k, 3 + elapsed * 57,kick);
        }
        g.L(1.5,creamInk,kite.x, kite.y + 20,
          kite.x + kite.l * 0.45 + mathSin(elapsed * 18) * 8,
          kite.y + 20 + kite.m * 0.45,alpha);
        kiteArt(g, kite.x, kite.y, kite.h, alpha);
      }
      if (scene.f) {
        g.R(2,0xffdf89,scene.f.x, scene.f.y, 9);
        g.l(scene.x, scene.y, scene.f.x, scene.f.y);
        g.B(0xffdf89,scene.x - 18, scene.y + 26, 36 * scene.ca / autoCutTime, 3);
      }
      if (scene.vH) dangerRing(g, scene.x, scene.y, 29, scene.rh / redCutTime);
      const thread = scene.X();
      g.p(1.7, 0xb7eeff, 0.92);
      for (let i = 1; i < thread.length; i++) {
        g.l(thread[i - 1].x, thread[i - 1].y, thread[i].x, thread[i].y);
      }
      if (scene.N) {
        const bird = scene.N.w;
        g.R(2,roseInk,bird.x, bird.y, 28,0.8);
      }
      for (const bird of scene.bd) {
        const { x, y } = bird;
        const flap = scene.wF(x, age);
        g.Q(0x17283b,x - 34, y - 7 + flap, x - 6, y - 5, x, y + 8);
        g.q(x + 34, y - 7 + flap, x + 6, y - 5, x, y + 8);
        g.e(x, y + 1, 19, 11);
        g.E(chileWhite,x + mathSign(bird.u) * 7, y, 6, 5);
      }
      kiteArt(g, scene.x, scene.y, scene.m > 1 && scene.B ? playerColors[1] : chileBlue);
      if(scene.e===playState&&!scene.z5)each(scene.sk,(b,i)=>{
        const cd=i?scene.F:scene.v,total=i?5:2.5,active=cd>total-(i?.8:.32),x=252+i*125;
        const color=active?goldInk:cd?0x647b9c:cyanInk;
        g.F(chileNavy,x,528,116,49,9).H(2,color,x,528,116,49,9)
          .B(color,x+5,571,106*(1-cd/total),4);
        b.t((prefs[0]?(scene.B?'YG':'OK')[i]:'B'+(i?5:3))+' '+['PICADA','PIRUETA'][i]+'\n'+(cd?cd.toFixed(1)+' s':'LISTO'));
      });
      if (scene.E.visible) {
        g.F(chileNavy,173, 129, 454, 28, 6);
        g.B(chileWhite,183, 153, 80 * line, 3);
      }
    }


  }

  function kiteArt(g, x, y, color, alpha = 1, scale = 1) {
    const half = 18 * scale, high = 21 * scale, low = 22 * scale;
      g.Q(color,x, y - high, x - half, y, x, y + low,alpha);
      g.Q(color === chileBlue ? chileWhite : color,x, y - high, x + half, y, x, y + low,0.87 * alpha);
      if (color === chileBlue) {
        g.Q(chileRed,x - half, y, x + half, y, x, y + low,alpha);
        star(g, x - 6 * scale, y - 8 * scale, 3 * scale);
      }
      g.L(1,0x233e54,x - half, y, x + half, y,alpha);
      g.l(x, y - high, x, y + low);
    }

  class Scores extends Phaser.Scene {
    constructor() { super(scoresScene); }

    create({ game, points, kiteLoss }) {
      const scene = this;
      scene.i = game;
      scene.j = points;
      const change=d=>{
        if(scene.sv||scene.j!==undefined)return;
        scene.i=(scene.i+d+4)%4;scene.v();
      };
      scene.b=[-1,1].map((d,i)=>arcadeLink(this,125+i*550,145,d<0?'◀':'▶',()=>change(d),true).f(26));
      scene.vP = [0, 0, 0];
      scene.z = 0;
      scene.sv = true;
      scene.o = kiteLoss;
      scene.uf = graphics(this);
      const label = (x, y, size, origin = 0.5) =>
        arcadeText(this, x, y, '', size, ink, { lineSpacing: 13 }).a(origin, 0.5);
      scene.z0 = label(38, 20, 28).a(0, 0);
      scene.d = label(mid, 145, 20);
      scene.H = label(mid, 312, 27);
      scene.vA = label(223, 541, 16);
      scene.r = Array.from({ length: 6 }, (_, i) => [
        label(200, 182 + i * 54, i ? 23 : 15, 0),
        label(395, 182 + i * 54, i ? 23 : 15),
        label(595, 182 + i * 54, i ? 23 : 15, 1)
      ]);
      scene.s = arcadeLink(this, 475, 541, 'GUARDAR · ' + (prefs[0] ? 'U/R' : 'B1'), () => scene.wE());
      arcadeLink(this, 689, 556, patioLabel, () => scene.back(), true);
      scene.G = undefined;
      scene.v();
      bindControls(this, button => {
        if (scene.sv) return;
        button = button.replace('P2_', 'P1_');
        if (button === backButton) {
          scene.back();
        } else if (scene.j !== undefined) {
          if (button === left) scene.z = (scene.z + 2) % 3;
          if (button === right) scene.z = (scene.z + 1) % 3;
          if (button === up) scene.vP[scene.z] = (scene.vP[scene.z] + 1) % 26;
          if (button === downButton) scene.vP[scene.z] = (scene.vP[scene.z] + 25) % 26;
          if (confirmButton(button)) scene.wE();
          else scene.v();
        } else {
          if(button===left||button===right)change(button===left?-1:1);
        }
      }, () => {}, () => {});
      const celebration = scene.fx;
      loadScores().then(() => {
        if (!scene.scene.isActive() || scene.fx !== celebration) return;
        scene.sv = false;
        const qualified = scoreQualifies(game, scene.j);
        if (scene.j > arcadeRecords[game]) celebrate.call(this);
        if (!qualified) scene.j = undefined;
        scene.v();
      });
    }

    v() {
      const scene = this;
      const entering = scene.j !== undefined;
      const g = scene.uf.o();
      const [, accent] = headerThemes[scene.i];
      paintNavy(g);
      gameHeader(g, scene.i);
      g.L(2,accent,169, 207, 631, 207,0.6);
      g.B(chileRed,0, 582, width, 18);
      scene.d.t(games[scene.i][0]);
      each(scene.r.flat(),label => label.v(!entering));
      scene.H.v(entering);
      scene.s.v(entering);
      each(scene.b,button=>button.v(!entering));
      if (entering) {
        const record = scene.j > arcadeRecords[scene.i];
        scene.z0.t(record ? '¡NUEVO RÉCORD! · ¡UYUUUUUI!' : '¡TOP 5!');
        scene.H.t((scene.o ? scene.o + '\n' : '') + scene.j + ' PTS\n\n' + scene.vP.map((letter, i) => {
          const character = String.fromCharCode(65 + letter);
          return i === scene.z ? '[' + character + ']' : ' ' + character + ' ';
        }).join(' ') + '\n\nINICIALES');
        scene.vA.t('←→ Casilla · ↑↓ Letra');
      } else {
        scene.z0.t('RÉCORDS');
        const rows = tables[scene.i];
        each(scene.r[0],(label, i) => label.t(['PUESTO', 'INICIALES', 'PUNTOS'][i]));
        for (let i = 0; i < 5; i++) {
          const row = rows[i];
          g.L(1,accent,169, 258 + i * 54, 631, 258 + i * 54,0.2);
          if (row && i === 0) g.B(accent,169, 220, 3, 31);
          const values = [String(i + 1).padStart(2, '0'), row?.name ?? '—', row ? String(row.points) : '—'];
          each(scene.r[i + 1],(label, j) => {
            label.t(values[j]);
            if (j === 2) label.f(values[j].length > 10 ? 17 : 23);
          });
        }
        scene.vA.t('←→ Juego');
      }
    }

    async wE() {
      const scene = this;
      if (scene.sv || scene.j === undefined) return;
      scene.sv = true;
      confirmSound();
      const name = String.fromCharCode(...scene.vP.map(letter => 65 + letter));
      const saved = await saveScore(scene.i, name, scene.j);
      scene.j = undefined;
      scene.fx.o();
      scene.G = undefined;
      scene.sv = false;
      scene.v();
      if (!saved) scene.vA.t('SOLO ESTA SESIÓN');
    }

    back() {
      if (this.sv) return;
      backSound();
      this.scene.start(patioScene);
    }

    update() {
      updateMusic();
      drawParty.call(this);
    }
  }

  class Settings extends Patio {
    constructor() { super('settings'); }
    init(parent) { this.pg = parent; this.i = 0; }
    create() {
      const name = duelNames[0];
      super.create();
      duelNames[0] = name;
      this.zC();
      this.bb.s(650, 556);
    }
    wO() {
      const parent = this.pg;
      if(parent.e===patioState) parent.r5();
      guideKeys(parent, parent.e==='done'||parent.q === 'end' ? undefined : parent.i ?? 0, parent.e === playState || parent.q && parent.q !== menuState);
      parent.scene.resume();
      this.scene.stop();
    }
  }

  new Phaser.Game({
    width: 1600,
    height: 1200,
    parent: 'game-root',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [Patio, Barrio, Scores, Settings],
    backgroundColor: '#101c24'
  });
})();
