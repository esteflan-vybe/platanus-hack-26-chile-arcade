(() => {
  'use strict';
  // Compact private state for the 50 KB limit: spin=A, turn=B, rest=C, held=D, kick=E, life=F, party=G, angle=H, distance=I, intro=J, note=K, ball=L, owner=M, warn=N, spawn=O, birdIn=P, cuts=Q, line=R, elapsed=S, load=T, age=U, tops=V.

  const { PI: pi, abs: mathAbs, cos: mathCos, floor: mathFloor, ceil: mathCeil, sign: mathSign, hypot: mathHypot, max: mathMax,
    min: mathMin, random: mathRandom, round: mathRound, sin: mathSin } = Math;

  const width = 800, height = 600;
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
  const patioState = 'select';
  const guideState = 'guide';
  const playState = 'play';
  const aimPhase = 'aim';
  const reviewPhase = 'review';
  const cx = 400, cy = 327, ring = 193, radius = 13;
  const ink = '#fff1d7', muted = '#e0c3a0';
  const [goldInk, skyInk, creamInk, turboInk, cyanInk, roseInk] = [0xffd66b, 0xa8ddff, 0xffefcc, 0xffd89c, 0x86f4ff, 0xff8585];
  const playerColors = [0xf84e54, 0x468df3];
  const patioLabel = '↩ Volver a Fonda';
  const duelNames = ['J1 ROJO', 'J2 AZUL'];
  const duelScore = ([a, b]) => duelNames[0] + ' ' + a + separator + duelNames[1] + ' ' + b;
  function duelTitle(label, [a, b]) {
    const win = Number(b > a);
    return label.bg('#172d4f')
      .t(a === b ? '¡EMPATE!' : '¡GANA ' + duelNames[win] + '!');
  }
  // Bolitas sweeps faster than Rayuela. Both accelerate after 3.2 seconds.
  const powerAt = (time, bolitas) => 1 - mathAbs((time * (bolitas ? 1.5 : 1.05) + mathMax(0, time - 3.2) ** 2 * 0.35) % 2 - 1);
  const clamp = (value, min, max) => mathMax(min, mathMin(max, value));
  const marble = (x, y, color) => ({ x, y, color, vx: 0, vy: 0, A: 0, out: false });
  const speed = ball => mathHypot(ball.vx, ball.vy);

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
    scene.z11 = [];
    scene.hb = graphics(scene).z(3);
    scene.sl = [0, 1].map(() => arcadeText(scene, 0, 0, '', 23, ink).z(4).v(false));
    scene.bdg = arcadeText(scene, 550, 554, '', 16).z(4);
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
      event.preventDefault();
      if (down.has(key) || event.repeat) return;
      down.add(key);
      unlockAudio();
      if (!CABINET_KEYS[button].some(alias => alias !== key && down.has(alias))) {
        controlSound(button);
        if (button[3] === '6' && (scene.st === playState || scene instanceof Barrio && scene.ph !== 'menu' && scene.ph !== 'end')) settings();
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

  function graphics(scene) {
    const g = scene.add.graphics();
    g.cl = g.clear;
    g.c = g.fillStyle;
    g.z = g.setDepth;
    g.poly = g.fillPoints;
    g.p = g.lineStyle;
    g.rb = g.fillRoundedRect;
    g.l = g.lineBetween;
    g.dot = g.fillCircle;
    g.e = g.fillEllipse;
    g.tri = g.fillTriangle;
    g.r = g.strokeCircle;
    g.edge = g.strokeRoundedRect;
    g.b = g.fillRect;
    g.rim = g.strokeEllipse;
    return g;
  }

  function arcadeText(scene, x, y, value, fontSize, color = ink, style = {}) {
    const label = scene.add.text(x, y, value, { resolution: 2, fontFamily: 'monospace', fontSize, color, align: 'center', fontStyle: 'bold', ...style }).setOrigin(0.5);
    label.a = label.setOrigin;
    label.z = label.setDepth;
    label.xy = label.setPosition;
    label.fg = label.setColor;
    label.bg = label.setBackgroundColor;
    label.fs = label.setFixedSize;
    label.yAt = label.setY;
    label.f = label.setFontSize;
    label.ls = label.setLineSpacing;
    label.t = label.setText;
    label.v = label.setVisible;
    return label;
  }

  function activate(object, onPress) {
    let armed = false;
    const reset = () => { armed = false; object.setAlpha?.(1); };
    return object.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { armed = true; object.setAlpha?.(0.75); })
      .on('pointerout', reset)
      .on('pointerupoutside', reset)
      .on('pointerup', () => {
        if (!armed) return;
        reset();
        controlSound(action);
        onPress();
      });
  }

  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const prefs = [true, true, true];
  const startLabel = (duel = false) => (duel ? '2 JUGADORES' : '1 JUGADOR') + separator + (prefs[0] ? duel ? '2' : 'ENTER' : duel ? 'START 2' : 'START 1');
  const replayLabel = () => (prefs[0] ? 'U/R' : 'B1') + ' REVANCHA';
  const pauseLabel = paused => (prefs[0] ? 'J/F ' : 'B4 ') + (paused ? 'Seguir' : 'Pausa');

  function arcadeLink(scene, x, y, text, onPress, plain = false) {
    return activate(arcadeText(scene, x, y, text, 17, ink, {
      backgroundColor: plain ? null : '#254365', padding: { x: 10, y: 15 }
    }).z(4), onPress)
      .on('pointerover', function () { controlSound(left); this.bg(plain ? null : '#ffcf75').fg(plain ? '#ffcf75' : '#172d4f'); })
      .on('pointerout', function () { this.bg(plain ? null : '#254365').fg(ink); });
  }

  const [chileBlue, chileRed, chileWhite, chileNavy] = [0x174786, 0xcf303e, 0xfff6e9, 0x172d4f];

  function paintNavy(g) {
    g.c(chileNavy).b(0, 0, width, height);
  }

  function star(g, x, y, r) {
    g.c(chileWhite).poly(Array.from({ length: 10 }, (_, i) => {
      const a = i * pi / 5 - pi / 2, size = r * (i % 2 ? 0.42 : 1);
      return { x: x + mathCos(a) * size, y: y + mathSin(a) * size };
    }), true);
  }

  function flag(g, x, y, w) {
    const h = w * 2 / 3;
    g.c(chileWhite).b(x, y, w, h);
    g.c(chileRed).b(x, y + h / 2, w, h / 2);
    g.c(chileBlue).b(x, y, h / 2, h / 2);
    star(g, x + h / 4, y + h / 4, h * 0.127);
  }

  const headerThemes = [
    [0x172d4f, 0xffbd79], [0x63382e, 0xe7ad77],
    [0x553247, 0xf2a9c1], [0x174e70, 0x9edcf5]
  ];

  function gameHeader(g, game) {
    const [base, accent] = headerThemes[game] ?? [chileNavy, 0xf3b675];
    g.c(base).rb(0, 0, width, 121, 18);
    g.p(2, accent, 0.6).l(38, 59, 620, 59);
    g.c(accent).b(0, 119, width, 2);
    g.p(2, goldInk, 0.65).edge(12, 8, 776, 110, 16);
    flag(g, 666, 26, 96);
  }

  function bunting(g, x, y, count, spacing) {
    let lastX = x, lastY = y;
    const colors = [chileRed, chileWhite, chileBlue];
    for (let i = 0; i <= count; i++) {
      const px = x + i * spacing;
      const py = y + mathSin(i * pi / count) * 13;
      g.p(1, chileWhite, 0.66).l(lastX, lastY, px, py);
      if (i < count) {
        g.c(colors[i % 3]).tri(px, py, px + spacing - 5, py + 2, px + spacing / 2, py + 17);
      }
      lastX = px;
      lastY = py;
    }
  }

  function vaso(g, x, y, color) {
    g.c(0x3a2630, 0.28).e(x + 5, y + 35, 29, 9);
    g.c(color).poly([
      { x: x - 13, y }, { x: x + 13, y },
      { x: x + 8, y: y + 35 }, { x: x - 8, y: y + 35 }
    ], true);
    g.c(chileWhite, 0.35).b(x - 5, y + 8, 2, 21);
    g.c(chileWhite).e(x, y, 27, 10);
    g.c(0x995344).e(x, y, 21, 5);
  }

  function mountains(g, y, color) {
    for (let i = 0; i < 7; i++) {
      const x = i * 139 - 20, peak = y - 44 - (i % 3) * 24;
      g.c(color).tri(x - 98, y, x, peak, x + 110, y);
      g.c(chileWhite, 0.78)
        .tri(x - 20, peak + 19, x, peak, x + 24, peak + 19);
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
        tables.forEach((table, i) => {
          if (!Array.isArray(saved[i])) return;
          const rows = saved[i].filter(row => /^[A-Z]{3}$/.test(row?.name) &&
            Number.isSafeInteger(row?.points) && row.points > 0);
          table.push(...rows.sort(highestFirst).slice(0, 5));
          arcadeRecords[i] = table[0]?.points ?? 0;
        });
      } catch {
        /* Session scores remain available without persistent storage. */
      }
    })();
    return scoreLoad;
  }

  function saveScore(game, name, points) {
    scoreWrites = scoreWrites.then(async () => {
      await loadScores();
      const table = tables[game];
      table.push({ name, points });
      table.sort(highestFirst);
      table.splice(5);
      arcadeRecords[game] = table[0].points;
      try {
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
    shout.connect(audio.destination);
    shout.start();
    if (musicBus) {
      const now = audio.currentTime;
      musicBus.gain.setTargetAtTime(0.21, now, 0.035);
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
    notes.forEach((note, i) => {
      blip(note, note, i === 3 ? 0.29 : 0.09, 0.026, i === 3 ? triangleWave : squareWave, fanfareStart + i * 0.10);
    });
    blip(notes[0] / 2, notes[0] / 2, 0.27, 0.032, triangleWave, fanfareStart + 0.30);
  }
  let recordFanfare = 0;
  let audio, musicBus, motor, panderetaBuffer, cheerBuffer;
  let musicBar = 0, nextBar = 0;

  function unlockAudio() {
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      audio ??= new Context();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
    } catch {
      /* The browser may disable sound. */
    }
  }

  window.onpointerup = unlockAudio;

  function blip(from, to, duration, volume, wave = squareWave, delay = 0, destination = audio?.destination) {
    if (!audio || !prefs[2] && destination !== musicBus) return;
    const start = audio.currentTime + delay;
    const end = start + duration;
    const oscillator = audio.createOscillator(), envelope = audio.createGain();
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
  const cuecaPhrases = [
    'L.KLJL', 'HLGLEL', '@..B.B', 'D.DDE.', 'E.LEHL', 'PQ.Q.E', 'E.EJJG', 'MHAQG@',
    'P.GPG.', 'GPCP..', 'QOGJOM', 'EHML@J', 'L.LGLJ', 'JLJE.H', 'M.MMML', 'G.J@BD', 'DP.J.V', 'SJ..UR'
  ];
  const cuecaOrder = [
    '01GH2345', '45678923', '8494ABCD', 'EECB89FD',
    '01234567', 'ABCDCDEF', '45678923', 'ABCD892F'
  ];
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
    const shake = audio.createBufferSource(), level = audio.createGain();
    shake.buffer = panderetaBuffer;
    shake.playbackRate.value = rate;
    level.gain.value = volume * 1.5;
    shake.connect(level).connect(destination);
    shake.start(audio.currentTime + delay);
  }

  function updateMusic() {
    if (!audio || audio.state !== 'running') return;
    if (!musicBus) {
      musicBus = audio.createGain();
      musicBus.gain.value = 0.46;
      if (prefs[1]) musicBus.connect(audio.destination);
    }

    // Keep a short Web Audio queue so scene changes never reset the musical clock.
    const now = audio.currentTime;
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
    motor.gain.gain.setTargetAtTime(0.0001, audio.currentTime, 0.025);
    motor.osc.stop(audio.currentTime + 0.12);
    motor = null;
  }

  function spinSound(spin, bst) {
    if (!prefs[2] || !audio || audio.state !== 'running') return;
    if (!motor) {
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = triangleWave;
      gain.gain.value = 0.0001;
      osc.connect(gain).connect(audio.destination);
      osc.start();
      motor = { osc, gain };
    }
    motor.osc.frequency.setTargetAtTime(46 + spin * 5 + bst * 120, audio.currentTime, 0.05);
    motor.gain.gain.setTargetAtTime(0.009 + spin * 0.0012, audio.currentTime, 0.05);
  }

  function celebrate() {
      cheer();
      blip(784, 1047, 0.14, 0.04, squareWave);
      const scores = this.k || this.sc;
      this.z9 = this.md === 2 ? playerColors[Number(scores[1] > scores[0])] : 0xffd36a;
      this.G = this.time.now;
      this.z11 = [];
      if (reducedMotion()) return;
      const colors = [this.z9, chileWhite];
      this.z11 = Array.from({ length: 40 }, (_, i) => ({
        side: i % 2 ? 1 : -1,
        speed: 20 + mathRandom() * 34,
        q16: 95 + mathRandom() * 155,
        delay: mathRandom() * 0.38,
        A: 4 + mathRandom() * 8,
        color: colors[i % colors.length]
      }));
    }

  function drawParty() {
      const { md: mode, st: state, ph, i: gid, j: points, k: sum, sc: scores, pl, q11:stat, z4:tag, sl: sides, bdg: badge } = this;
      const g = this.fx.cl(), hud = this.hb.cl();
      const duel = mode === 2;
      const done = state === 'done' || ph === 'end';
      const active = state === playState || ph && ph !== 'menu' && !done;
      const turn = pl ?? this.B;
      const both = gid === 2 && !ph;
      const visible = duel && (done || active), cardHeight = done ? 90 : 44;
      sides.forEach((card, i) => {
        const value = gid === 3 && !done && turn === i ? points : (sum || scores || [])[i] ?? 0;
        const count = String(value).length + (done ? 4 : duelNames[i].length + 1);
        card.v(visible)
          .xy(done ? 270 + i * 260 : 170 + i * 280, done ? 335 : 81)
          .f(mathMin(done ? 23 : 20, (done ? 320 : 350) / count))
          .setPadding(done ? 18 : 10, done ? 14 : 9).fs(230, cardHeight)
          .t(visible ? duelNames[i] + (done ? '\n' : ' ') + value + (done ? pointUnit : '') : '');
        if (visible) hud.c(i ? chileBlue : 0xa82736).rb(card.x - 115, card.y - cardHeight / 2, 230, cardHeight, 12);
      });
      badge.v(duel && active).t(both ? 'J1 + J2\n¡JUEGUEN!' : 'J' + (turn + 1) + '\nTU TURNO')
        .bg(both ? '#172d4f' : turn ? '#174786' : '#a82736');
      if (stat) {
        const timer = both && (active || done), timed = timer && duel && active;
        if (timed) hud.c(chileNavy).rb(338, 125, 124, 34, 17);
        stat.a(timed ? 0.5 : 0, 0).xy(timed ? 400 : 38, timed ? 128 : duel && active ? 104 : 78)
          .f(timer ? 24 : duel && active ? 13 : 20)
          .fg(timer && active && this.U >= 25
            ? !reducedMotion() && this.U * 2 % 2 >= 1 ? '#ff9898' : '#ffdc85'
            : ink);
      }
      if (tag) tag.yAt(duel && active ? 104 : 78).f(duel && active ? 14 : 20);
      if (this.G === undefined) return;
      const elapsed = (this.time.now - this.G) / 1000;
      if (elapsed > 2.5) {
        this.G = undefined;
        return;
      }
      const fade = 1 - elapsed / 2.5;
      const glow = this.z11.length ? 0.55 + 0.35 * mathCos(elapsed * pi * 3) : 0.7;
      g.p(3, this.z9, glow * fade).edge(145, 152, 510, 329, 16);
      if (duel) g.p(4, this.z9, glow).edge(this.z9 === playerColors[1] ? 415 : 155, 288, 230, 94, 8);
      for (const piece of this.z11) {
        const t = elapsed - piece.delay;
        if (t < 0 || t > 1.75) continue;
        const x = 400 + piece.side * (251 + piece.speed * t);
        const y = 383 - piece.q16 * t + 143 * t * t;
        if (y > 495) continue;
        const flutter = 2 + 5 * mathAbs(mathCos(t * piece.A));
        g.c(piece.color, 1 - t / 1.75).b(x, y, flutter, 5);
      }
    }


  class Barrio extends Phaser.Scene {
    constructor() { super('bolitas'); }

    create() {
      const scene = this;
      scene.court();
      scene.tr = graphics(this);
      scene.board = graphics(this);
      scene.z1(38, 20, barrioTitle, 28, ink, true);
      arcadeLink(this, 689, 556, patioLabel, () => scene.home(), true);
      scene.hud = scene.z1(38, 78, '', 20, ink, true);
      scene.z4 = scene.z1(630, 78, '', 17, muted).a(1, 0);
      scene.n = scene.z1(400, 150, '', 18, ink);
      scene.mds = [
        arcadeLink(this, 238, 490, startLabel(), () => scene.start(1)),
        arcadeLink(this, 562, 490, startLabel(true), () => scene.start(2))
      ];
      scene.K = scene.z1(400, 110, '', 16, '#ffe597', true).a(0.5);
      scene.ov = graphics(this).z(2);
      scene.tt = graphics(this).z(2);
      scene.q9 = 0;
      scene.fr = reducedMotion();
      scene.tp = arcadeText(this, 600, 354, '', 20, '#ffdf85').z(4);
      scene.lb = arcadeLink(this, 540, 556, pauseLabel(false), () => { scene.fr = !scene.fr; });
      scene.z0 = scene.z1(400, 192, '', 35, ink, true).a(0.5).z(3);
      scene.opt = scene.z1(400, 281, '', 19, ink, true).a(0.5).z(3);
      scene.dtl = scene.z1(400, 423, '', 18, muted).a(0.5).ls(2).z(3);
      scene.D = new Set();
      bindControls(this, button => {
        scene.D.add(button);
        if (button[3] === '2') {
          scene.home();
        } else if (scene.ph === 'menu') {
          if (button[3] === '4') scene.fr = !scene.fr;
          if (button === startSolo) scene.start(1);
          if (button === startDuel) scene.start(2);
        } else if (scene.ph === 'end') {
          if (button === startSolo || button === startDuel) {
            backSound();
            scene.mn();
          }
          if (button === action || (scene.md === 2 && button === 'P2_1')) scene.start(scene.md);
        } else if (scene.ph === aimPhase && button === scene.tkb('1')) {
          scene.z2 = 0;
          scene.ph = chargingPhase;
        }
      }, button => {
        scene.D.delete(button);
        if (scene.ph === chargingPhase && button === scene.tkb('1')) scene.fire();
      }, () => {
        scene.D.clear();
        if (scene.ph === chargingPhase) scene.ph = aimPhase;
      });
      scene.md = 1;
      scene.best = arcadeRecords[0];
      scene.mn();
    }

    z1(x, y, value, size, color) {
      return arcadeText(this, x, y, value, size, color, { lineSpacing: 10 }).a(0);
    }

    court() {
      const g = graphics(this);
      paintNavy(g);
      g.c(0x9c6347).b(0, 119, width, 414);
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
        g.c(0x52382e, 0.6).e(x + 2, y + 2, size * 2, size);
        g.c(0xd0a681, 0.72).e(x, y, size * 2, size);
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
      this.ov.cl().c(0x101c24, 0.96).rb(78, 153, 644, 373, 18);
      this.ov.p(2, 0x5de3bd, 0.72).edge(78, 153, 644, 373, 18);
      this.z0.t(title);
      this.opt.yAt(this.ph === 'menu' ? 234 : 281).f(this.ph === 'menu' ? 22 : 23).ls(6).t(options);
      this.dtl.yAt(this.ph === 'menu' ? 411 : 423).t(detail);
    }

    home() {
      backSound();
      this.scene.start(patioScene);
    }

    mn() {
      const scene = this;
      scene.G = undefined;
      scene.fx.cl();
      scene.mds.forEach(link => link.v(true));
      scene.ph = 'menu';
      scene.tr.cl();
      scene.board.cl();
      scene.hud.t('SACA BOLITAS');
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
      lesson(scene.tt.cl(), 0, scene.q9);

    }

    tkb(control) {
      return 'P' + (this.pl + 1) + '_' + control;
    }

    start(mode) {
      const scene = this;
      scene.tt.cl();
      scene.tp.v(false);
      scene.lb.v(false);
      confirmSound();
      scene.mds.forEach(link => link.v(false));
      scene.md = mode;
      guideKeys(this, 0, true);
      scene.sc = [0, 0];
      scene.sh = [0, 0];
      scene.pl = 0;
      scene.bl = [];
      scene.mk = [];
      scene.z13 = 0;
      scene.ov.cl();
      [scene.z0, scene.opt, scene.dtl, scene.K].forEach(label => label.t(''));
      scene.rack();
      scene.ready();
    }

    rack() {
      const spots = [];
      for (let i = 0; i < 49; i++) {
        const ball = marble(cx + (i % 7 - 3) * 38, cy + (mathFloor(i / 7) - 3) * 38, chileWhite);
        if (this.bl.every(other => mathHypot(ball.x - other.x, ball.y - other.y) >= 28)) spots.push(ball);
      }
      for (let i = 0; i < 6 && spots.length; i++)
        this.bl.push(...spots.splice(mathFloor(mathRandom() * spots.length), 1));
    }

    ready() {
      const scene = this;
      scene.q13 = [];
      scene.tp.v(false);
      scene.n.xy(400, 150);
      scene.K.t('');
      if (!scene.bl.some(ball => ball.M === undefined)) scene.rack();
      const shooterColor = playerColors[scene.pl];
      scene.L = marble(cx, cy + ring - 29, shooterColor);
      scene.L.M = scene.pl;
      scene.H = -pi / 2;
      scene.ph = aimPhase;
      scene.z2 = 0;
      scene.hp();
      const playerName = 'J' + (scene.pl + 1);
      const turn = scene.md === 2 ? playerName : 'SOLO';
      scene.z4.fg(scene.md === 1 ? '#ffe597' : scene.pl ? '#a7dbff' : '#ffacae');
      scene.z4.t(turn + '  /  TIRO ' + (scene.sh[scene.pl] + 1) + ' DE 5');
      scene.n.t('');
    }

    hp() {
      this.hud.t(this.md === 1
        ? this.sc[0] + recordUnit + this.best
        : '');
    }

    fire() {
      const scene = this;
      const power = 190 + powerAt(scene.z2, true) * 810;
      scene.L.vx = mathCos(scene.H) * power;
      scene.L.vy = mathSin(scene.H) * power;
      scene.ph = 'roll';
      scene.S = 0;
      scene.z6 = 0;
      scene.q15 = 0;
      for (const ball of [scene.L, ...scene.bl]) {
        ball.q0 = ball.x;
        ball.q1 = ball.y;
        ball.q2 = 0;
      }
      scene.K.t('');
      scene.n.t('RODANDO');
      blip(190, 100, 0.09, 0.07, triangleWave);
    }

    step(dt) {
      const all = [this.L, ...this.bl];
      const balls = all.filter(ball => !ball.out);
      for (const ball of all) {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        const velocity = speed(ball);
        ball.A += velocity * dt / radius;
        const drag = velocity ? mathMax(0, 1 - 210 * dt / velocity) : 0;
        ball.vx *= drag;
        ball.vy *= drag;
        if (ball.x < -radius || ball.x > width + radius ||
            ball.y < -radius || ball.y > height + radius) {
          ball.vx = ball.vy = 0;
        }
        if (ball.y < 119 || ball.y > 533 || ball.x < 0 || ball.x > width) continue;
        this.stamp(ball);
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
          const approach = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (approach <= 0) continue;
          const impulse = approach * 0.91;
          a.vx -= nx * impulse;
          a.vy -= ny * impulse;
          b.vx += nx * impulse;
          b.vy += ny * impulse;
          if (approach > 85) {
            this.dh(a.x + nx * radius, a.y + ny * radius, approach);
            blip(450 + approach, 260, 0.05, 0.033);
          }
        }
      }
      for (const ball of balls) {
        if (mathHypot(ball.x - cx, ball.y - cy) <= ring) continue;
        ball.out = true;
        if (ball !== this.L && ball.M !== this.pl) {
          this.q15++;
          blip(570 + 140 * this.q15, 510, 0.14, 0.06);
        }
      }
      return all.some(ball => speed(ball) > 0);
    }

    stamp(ball) {
      const dx = ball.x - ball.q0, dy = ball.y - ball.q1;
      const distance = mathHypot(dx, dy);
      if (distance < 3) return;

      this.mk.push({
        x1: ball.q0, y1: ball.q1, x2: ball.x, y2: ball.y,
        created: this.z13
      });
      ball.q0 = ball.x;
      ball.q1 = ball.y;

      ball.q2 += distance;
      if (ball.q2 < 13 || speed(ball) < 45) return;
      ball.q2 = 0;
      for (const side of [-1, 1]) {
        this.q13.push({
          x: ball.x - dx / distance * radius,
          y: ball.y - dy / distance * radius,
          vx: (-dx - dy * side * 2) / distance * 13,
          vy: (-dy + dx * side * 2) / distance * 13,
          U: 0, F: 0.34, size: 3
        });
      }
    }

    dh(x, y, speed) {
      const spread = clamp(speed * 0.12, 22, 78);
      for (let i = 0; i < 6; i++) {
        const angle = i * pi / 3 + 0.3;
        const drift = spread * (0.65 + (i % 3) * 0.17);
        this.q13.push({
          x, y, vx: mathCos(angle) * drift, vy: mathSin(angle) * drift * 0.65,
          U: 0, F: 0.42 + (i % 3) * 0.05, size: 4 + i % 3
        });
      }
    }

    trails(dt) {
      this.z13 += dt;
      const lifetime = 2.6;
      this.mk = this.mk.filter(mark => this.z13 - mark.created < lifetime);
      this.tr.cl();
      for (const { x1, y1, x2, y2, created } of this.mk) {
        const opacity = 1 - (this.z13 - created) / lifetime;
        this.tr.p(4, 0x55352b, 0.32 * opacity).l(x1, y1, x2, y2);
        this.tr.p(1, 0xf5bf84, 0.42 * opacity).l(x1, y1 + 2, x2, y2 + 2);
      }
    }

    se() {
      const scene = this;
      const bon = scene.L.out ? 0 : scene.q15 * (scene.q15 - 1) * 25;
      const points = scene.q15 * 100 + bon;
      const combo = scene.q15 >= 3 ? '¡TERREMOTO!' : '¡COMBO!';
      scene.sc[scene.pl] += points;
      scene.sh[scene.pl]++;
      scene.ph = reviewPhase;
      scene.rv = 1.55;
      scene.tp.t(combo + ' +' + points).v(bon > 0).xy(400, 245);
      scene.hp();
      scene.n.t(scene.L.out ? 'TU BOLITA: FUERA' : 'TU BOLITA: DENTRO');
      scene.K.t('J' + (scene.pl + 1) + '  +' + points + pointUnit +
        (bon ? ' · ' + combo + ' +' + bon : ''));
    }

    nxt() {
      const scene = this;
      scene.bl = scene.bl.filter(ball => !ball.out);
      if (scene.sh[0] + scene.sh[1] === 5 * scene.md) {
        scene.end();
        return;
      }
      if (!scene.L.out) scene.bl.push(scene.L);
      if (scene.md === 2) scene.pl = 1 - scene.pl;
      scene.ready();
    }

    end() {
      const scene = this;
      scene.ph = 'end';
      blip(440, 220, 0.24, 0.055, triangleWave);
      const bon = [0, 0];
      for (const ball of [...scene.bl, scene.L]) {
        if (!ball.out && ball.M >= 0) bon[ball.M] += 200;
      }
      scene.sc[0] += bon[0];
      scene.sc[1] += bon[1];
      const one = scene.sc[0];
      if (scene.md === 1 && scoreQualifies(0, one)) {
        scene.scene.start(scoresScene, { game: 0, points: one });
        return;
      }
      scene.K.t('BONO · ' + duelScore(bon));
      scene.hp();
      scene.z4.t(gameOver);
      scene.pn(gameOver, scene.md === 1 ? one + recordUnit + scene.best :
        '', replayLabel());
      if (scene.md === 2) {
        duelTitle(scene.z0, scene.sc);
        if (scene.sc[0] !== scene.sc[1]) celebrate.call(this);
      }
      guideKeys(this);
      scene.n.t('');
    }

    update(time, delta) {
      const scene = this;
      drawParty.call(this);
      updateMusic();
      if (scene.ph === 'menu') {
        if (!scene.fr) scene.q9 += mathMin(delta, 50) / 1000;
        lesson(scene.tt.cl(), 0, scene.q9);
        teachPoints(this, 0);
        scene.lb.t(pauseLabel(scene.fr));
        return;
      }
      const dt = mathMin(delta, 50) / 1000;
      scene.trails(dt);
      if (scene.ph === 'end') return;
      if (scene.ph === aimPhase || scene.ph === chargingPhase) {
        const direction = Number(scene.D.has(scene.tkb('R'))) - Number(scene.D.has(scene.tkb('L')));
        scene.H = clamp(scene.H + direction * dt * 1.75, -pi + 0.16, -0.16);
        if (scene.ph === chargingPhase) scene.z2 += dt;
      } else if (scene.ph === reviewPhase) {
        scene.rv -= dt;
        if (scene.rv <= 0) scene.nxt();
      } else {
        scene.z6 += dt;
        while (scene.z6 >= 1 / 120 && scene.ph === 'roll') {
          scene.z6 -= 1 / 120;
          scene.S += 1 / 120;
          const moving = scene.step(1 / 120);
          if (!moving || scene.S >= 5) scene.se();
        }
      }
      for (const grain of scene.q13) {
        grain.U += dt;
        grain.x += grain.vx * dt;
        grain.y += grain.vy * dt;
      }
      scene.q13 = scene.q13.filter(grain => grain.U < grain.F);
      scene.draw();
    }

    draw() {
      const scene = this;
      const g = scene.board;
      g.cl();
      if (scene.ph === aimPhase || scene.ph === chargingPhase) {
        const directionX = mathCos(scene.H), directionY = mathSin(scene.H);
        const power = powerAt(scene.z2, true);
        const length = 89 + power * 58;
        for (let d = 21; d <= length; d += 12) {
          g.c(0xfff0c4, 0.95 - 0.65 * d / length);
          g.dot(scene.L.x + directionX * d, scene.L.y + directionY * d, 2.7);
        }
        g.c(0x301f24).rb(cx - 52, 513, 104, 10, 5);
        g.c(power > 0.8 ? 0xffb45d : 0x5de3bd).rb(cx - 51, 514, 8 + 94 * power, 8, 4);
      }
      for (const grain of scene.q13) {
        const fade = grain.U / grain.F;
        g.c(0xffd29d, (1 - fade) * 0.55)
          .e(grain.x, grain.y, grain.size + fade * 7, grain.size * 0.6 + fade * 4);
      }
      if (scene.ph === reviewPhase) {
        const pulse = 17 + (1.55 - scene.rv) * 7;
        if (scene.tp.visible && !reducedMotion()) {
          scene.tp.yAt(225 + scene.rv * 13).setScale(1 + 0.15 * mathSin(scene.rv * 16));
        }
        if (scene.q15) g.c(0xffedbe, mathMax(0, (scene.rv - 1.4) * 0.65))
          .b(0, 0, width, height);
        g.p(3, scene.tp.visible ? playerColors[scene.pl] : 0xffe6a6, 0.88).r(scene.L.x, scene.L.y, scene.tp.visible ? pulse * 3 : pulse);
        g.p(1, 0x4d3228, 0.9).r(scene.L.x, scene.L.y, pulse + 2);
      }
      for (const ball of [...scene.bl, scene.L]) marbleArt(g, ball);
    }


  }

  function marbleArt(g, { x, y, color, A: spin = 0 }) {
      g.c(0x36251f, 0.43).e(x + 4, y + 9, 29, 17);
      g.c(0x293039, 0.56).dot(x, y, radius + 1);
      g.c(color, color === 0xfff6e9 ? 0.39 : 0.8).dot(x, y, radius);
      g.c(0x203d50, 0.39).dot(x + 2, y + 2, radius - 3);
      g.c(0xfff9e9, 0.24).dot(x - 2, y - 2, radius - 3);
      const cos = mathCos(spin), sin = mathSin(spin);
      const glassPoint = (dx, dy) => [x + dx * cos - dy * sin, y + dx * sin + dy * cos];
      for (let i = -7; i <= 7; i++) {
        const curve = mathSin(i * 0.42) * 4;
        g.c(color, 0.95).dot(...glassPoint(i, curve), 2.8);
        g.c(0xffead3, 0.68).dot(...glassPoint(i, curve - 1.5), 1.15);
      }
      g.c(0xffffff, 0.88).e(x - 5, y - 6, 8, 4);
      g.c(0xffffff, 0.59).dot(x + 1, y - 9, 1.4);
      g.c(color, 0.9).e(x + 5, y + 8, 6, 2.5);
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
    '5 tiros · Apunta a la línea\nQuemada: ×2 al próximo tiro · Racha ×5',
    '30 s · Suma puntos\nBarro frena · Piedra rebota',
    'Blanco +100 · Oro +250\n+10 pts/s\nRojos y cóndores · Duelo por turnos'
  ];

  const boxX = 400, boxY = 256;
  const rayLanding = (aim, charge) => 478 + (aim - 478) * (0.5 + powerAt(charge) * 0.85);
  const rayX = (x, y) => 400 + (x - 400) * (rayY(y) - 217) / 150;
  // Ground-plane perspective: cajon and vineyard share the horizon at y=217.
  const rayY = y => 217 + 29232 / (590 - y);

  const { Between: randomBetween } = Phaser.Math;
  const stoneZones = [[267, 255], [535, 260], [358, 273], [305, 419], [535, 419]];

  function teachPoints(scene, id) {
    const t = scene.q9 % 3, ring = t >= 1.2;
    scene.tp.t(id === 2 ? ring ? '+200' : '+100' : id ? '+100' : '¡COMBO! +250')
      .v(id === 2 ? t >= 0.44 && t < 0.8 || ring && t < 1.6 : t >= (id ? 2 : 1.6))
      .xy(id === 2 ? ring ? 430 : 370 : 600, (id ? 259 : 325) - mathMax(0, t - 2) * 8);
  }

  function stone(g, x, y, size = 1) {
    g.c(0x503124, 0.3).e(x + 2 * size, y + 4 * size, 28 * size, 13 * size)
      .c(0x80766b).e(x, y, 26 * size, 15 * size)
      .c(0xc8bca7).e(x - 3 * size, y - 3 * size, 16 * size, 6 * size);
  }

  function mudPatch(g, x, y, size) {
    const lobe = size / 5;
    g.c(0x74422e).e(x, y, size, size * 0.63)
      .dot(x - lobe, y - lobe, lobe)
      .dot(x + lobe, y + lobe, lobe);
  }

  function guideKeys(scene, id, playing) {
    (scene.mds || [scene.gb, scene.q18]).forEach((button, i) => button?.t(startLabel(i)).fs(280, 50));
    scene.q19?.destroy();
    scene.bb?.f(prefs[0]?17:15).t((prefs[0]?'':'B2 ')+patioLabel);
    if (id === undefined) return;
    const caps = scene.q19 = scene.add.container();
    const keyboard = prefs[0];
    for (let side = 0; side < (playing && scene.md === 1 ? 1 : 2); side++) {
      const x = 95 + side * 240;
      const panel = graphics(scene).c(chileNavy).rb(x - 85, 528, 232, 55, 12);
      panel.p(2, playerColors[side]).edge(x - 85, 528, 232, 55, 12);
      caps.add(panel);
      caps.add(arcadeText(scene, x - 62, 555, 'J' + (side + 1), 18));
      const move = side ? id ? ' ↑ /←↓→' : '← →' : id ? ' W /ASD' : 'A D';
      if (!keyboard) {
        panel.c(0x41638a).e(x+12,561,28,12).c(creamInk).b(x+10,548,4,13).c(playerColors[side]).dot(x+12,548,8);
        for (const [dx,dy,key] of [[-18,0,'←'],[18,0,'→'],...(id ? [[0,-18,'↑'],[0,18,'↓']] : [])])
          caps.add(arcadeText(scene,x+12+dx,553+dy,key,14));
      } else move.split('/').forEach((row, y) => {
        [...row].forEach((key, i) => {
          if (key !== ' ') caps.add(arcadeText(scene, x + (i - 1) * 24, 540 + (y + !id) * 26, key, 18,
            ink, { backgroundColor: '#41638a' }).fs(23, 24));
        });
      });
      const keys = keyboard ? side ? ['R', 'Y', 'G'] : ['U', 'O', 'K'] : ['B1', 'B3', 'B5'];
      (id===3 ? [1,2] : [0]).forEach((k,i)=>{
        const y=id===3 ? 542+i*25 : 555;
        if(!keyboard) panel.c(playerColors[side]).dot(x+61,y,12);
        caps.add(arcadeText(scene,x+61,y,keys[k],14,ink, {backgroundColor:keyboard?'#41638a':null}));
        caps.add(arcadeText(scene,x+108,y,id===3 ? ['PICADA','PIRUETA'][i] : id===2?'TURBO':'LANZA',13));
      });
    }
  }

  function dangerRing(g, x, y, radius, progress) {
    g.p(2, roseInk, 0.3).r(x, y, radius).p(3, roseInk, 1)
      .beginPath().arc(x, y, radius, -pi / 2, pi * (2 * progress - 0.5)).strokePath();
  }

  function turboMeter(g, x, y, cooldown, active) {
    const charge = 1 - mathMax(0, cooldown);
    g.c(chileNavy).b(x - 17, y + 17, 34, 6)
      .c(active ? chileWhite : charge === 1 ? cyanInk : turboInk)
      .b(x - 16, y + 18, 32 * (active ? 1 : charge), 4);
  }

  function lessonCards(g) {
    for (let x = 106; x < 700; x += 200)
      g.c(0x234464).rb(x, 215, 188, 152, 3).p(1, 0x527898).edge(x, 215, 188, 152, 3);
  }

  function lesson(g, id, time = 0) {
    const p = mathMin(1, time % 3 / 2), angle = p * pi * 2, wave = mathSin(angle), hit = mathMax(0, (p - 0.6) / 0.4);
    lessonCards(g);
    if (id < 2) {
      const x = id ? 342 : 142, y = id ? 280 : 336;
      g.c(0x101c24).rb(x, y, 116, 18, 5);
      g.c(0xffca72).b(x + 3, y + 3, 108 * powerAt(time % 3, !id), 12);
    }
    if (!id) {
      g.p(2, goldInk).l(200, 315, 200 + wave * 40, 265);
      g.c(goldInk).dot(200 + wave * 40, 265, 3);
      for (let i = 0; i < 3; i++) {
        const x = 200 + i * 200;
        g.p(2, p >= 0.8 && i ? goldInk : skyInk).r(x, 293, 37);
        const travel=mathMin(p/0.55,1), out=mathMax(0,(p-0.55)/0.45);
        marbleArt(g, { x, y: i ? 337-(i===1?40:43)*travel-out*9 : 315, color: chileRed });
        for (const side of i === 2 ? [-1, 1] : [1])
          marbleArt(g, { x: x + side * (i===2?12+40*out:0), y:273-(i?out*16:0), color: out && i===2?goldInk:chileWhite });
      }
    } else if (id === 1) {
      icon(g, 1, 200, 292, chileRed);
      g.p(2, goldInk).r(200 + wave * 19, 292 + wave * 8, 5);
      g.c(chileRed).dot(400, 325, 16);
      icon(g, 1, 600, 292, chileRed);
      const ground = 331 - p * 39;
      tejoArt(g, 608, ground - mathSin(p * pi) * 36, (24 - p * 7) / 34, p === 1 ? goldInk : chileRed, ground);
    } else {
      g.l(600, 248, 600, 338);
      const top = (x, y) => topArt(g, { x, y: y + 11, H: angle * 4 });
      const move = angle + 0.55 * wave;
      const sx = mathSin(move), cy = mathCos(move);
      const x = 200 + 36 * sx, y = 278 + 10 * cy;
      top(x, y);
      if (p < 0.13) g.p(7, turboInk).l(x, y, x - 36 * cy, y + 10 * sx).c(chileWhite).dot(x, y, 5);
      turboMeter(g, x, y + 9, 1 - p * 2, p < 0.13);
      if (p < 0.22) g.p(4, 0xffd76c).rim(370, 292, 34, 23);
      if (p < 0.59) g.p(4, cyanInk, p < 0.42 || mathFloor(time * 12) % 2).rim(430, 292, 40, 28);
      top(336 + 160 * mathMin(p, 0.8), 268);
      mudPatch(g, 551, 315, 38);
      stone(g, 650, 315, 0.6);
      top(p < 0.3 ? 520 + p * 90 : 547 + (p - 0.3) * 16, 286);
      top(650 - 26 * mathAbs(1 - p * 2), 286);
    }
  }

  function tejoArt(g, x, y, scale, color = 0xbcd0df, ground = y) {
        g.c(0x563b30, 0.58).e(x + 4, ground + 5, 36 * scale, 14 * scale);
        g.c(0x343d49).e(x, y + 3, 34 * scale, 18 * scale);
        g.c(color)
          .e(x, y, 34 * scale, 15 * scale);
        g.c(0xe8eff2).e(x - 5 * scale, y - 3 * scale, 14 * scale, 4 * scale);
  }

  function topArt(g, top, pl = -1) {
      const { x, y, bst, cd, E: kick, H: angle = 0 } = top;
      const color = playerColors[mathMax(0, pl)];
      const highlight = pl <= 0 ? 0xffb6af : 0xd3eeff;
      g.c(0x503124, 0.6).e(x + 6, y + 8, 43, 19);
      g.c(0x6b382d).tri(x - 22, y - 13, x + 22, y - 13, x, y + 13);
      g.c(color).e(x, y - 14, 45, 23);
      if (bst > 0) {
        g.p(7, turboInk, bst * 2.6)
          .l(x, y + 4, x - top.vx * 0.15, y + 4 - top.vy * 0.15)
          .c(chileWhite).dot(x, y, 5);
      }
      if (pl >= 0) turboMeter(g, x, y, mathMax(cd, kick), bst);
      const gleam = mathSin(angle) * 11;
      g.c(highlight).e(x + gleam, y - 15, 13, 6);
      g.c(0xe5b484).rb(x - 4, y - 33, 8, 15, 3);
    }


  function icon(g, index, x, y, color, t) {
      if (index === 0) {
        g.p(1, color).r(x, y, 28);
        for (const [dx, dy, tint] of [[-10, -7, chileRed], [11, -8, 0x6cbcf1], [1, 13, color]]) {
          marbleArt(g, { x: x + dx, y: y + dy, color: tint, A: t * 4 });
        }
      } else if (index === 1) {
        if (t >= 0) {
          g.c(0xb77a52).e(x, y + 23, 100, 52);
          for (let v = x - 36; v <= x + 36; v += 24)
            g.p(2, 0x64733c).l(v, y - 10, v, y - 31)
              .c(0x567643).e(v, y - 30, 19, 9).c(0x77518a).dot(v + 4, y - 19, 3);
          const tray = [{ x: x - 25, y: y - 6 }, { x: x + 25, y: y - 6 },
            { x: x + 41, y: y + 26 }, { x: x - 41, y: y + 26 }];
          g.c(0xad7658).poly(tray, true).p(5, 0x633729).strokePoints(tray, true);
          g.p(2, creamInk).l(x - 30, y + 9, x + 30, y + 9);
          tejoArt(g, x - 13, y + 16, 0.55);
          const flight = mathMin(1, t % 3), ground = y + 40 - 31 * flight;
          tejoArt(g, x + 12 * flight, ground - 80 * flight * (1 - flight), 0.4, 0xbcd0df, ground);
        } else {
          g.c(0xad7658).rb(x - 29, y - 22, 58, 44, 5);
          g.p(2, chileWhite).l(x - 29, y, x + 29, y);
          tejoArt(g, x - 14, y + 4, 0.65);
        }
      } else if (index === 2) {
        g.p(2, creamInk, 0.55).rim(x, y + 24, 78, 24);
        g.p(2, cyanInk).rim(x + 31, y + 24, 21, 13);
        topArt(g, { x, y: y + 11, H: t * 8 });
      } else {
        g.c(0xe2f1f5, 0.7).e(x - 19, y - 32, 48, 12);
        g.c(0x526d89).tri(x - 49, y + 35, x - 3, y - 10, x + 49, y + 35);
        g.c(creamInk).tri(x - 15, y + 2, x - 3, y - 10, x + 11, y + 2);
        const kx = x + mathSin(t * 2) * 5, ky = y - 8 + mathCos(t * 1.5) * 3;
        g.p(1, creamInk).l(kx, ky + 20, x - 12, y + 49);
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
      scene.rec = arcadeRecords;
      loadScores();
      scene.D = new Set();
      scene.art = graphics(this);
      const label = (x, y, size, color) => arcadeText(this, x, y, '', size, color);
      scene.q14 = label(38, 20, 28).a(0, 0);
      scene.q11 = label(38, 78, 17).a(0, 0).z(4);
      scene.q10 = label(400, 561, 18).ls(1);
      scene.bon = label(0, 0, 16, '#baffff').setStroke('#173247', 4).z(1).t('+200').v(false);
      scene.gl = label(400, 140, 16).v(false);
      scene.pb = arcadeLink(this, 768, 550, '⚙︎', () => scene.st === playState ? scene.os() : scene.cfg(), true).f(28);
      scene.q5 = [0, 1, 2].map(i => arcadeLink(this, 400, 230 + i * 90, '', () => {
        prefs[i] = !prefs[i];
        if (i === 1 && musicBus) {
          if (prefs[i]) musicBus.connect(audio.destination);
          else musicBus.disconnect();
        }
        scene.cfg();
      }, true));
      scene.rbn = arcadeLink(this, 400, 480, '', () => scene.or(), true);
      scene.bb = arcadeLink(this, 689, 556, patioLabel, () => scene.home(), true);
      scene.zs = games.map((_, i) => activate(scene.add.zone(
        220 + i % 2 * 360, 226.5 + mathFloor(i / 2) * 158, 340, 139
      ), () => {
          if (scene.J || scene.st !== patioState) return;
          scene.i = i;
          scene.play();
        }).on('pointerover', () => {
          if (!scene.J && scene.st === patioState && scene.i !== i) {
            scene.i = i;
            scene.pv = scene.time.now;
            controlSound(left);
          }
        }));
      scene.msg = label(400, 300, 24).z(1).bg('#192531').setPadding(18);
      scene.win = label(400, 256, 33).z(2).v(false);
      scene.uf = graphics(this).z(2);
      scene.tp = label(600, 259, 20, '#ffdf85').z(4).v(false);
      scene.gh = label(400, 194, 28).t(head).z(3);
      scene.q4 = label(400, 412, 20).ls(2).z(3);
      scene.q6 = graphics(this).z(3);
      scene.hds = [200, 400, 600].map(x => label(x, 229, 18).z(4));
      scene.q7 = [200, 400, 600].map(x => label(x, 354, 18).z(4));
      scene.gb = arcadeLink(this, 255, 490, startLabel(), () => scene.run());
      scene.q18 = arcadeLink(this, 551, 490, startLabel(true), () => scene.run(2));
      const toggle = () => {
        scene.fr = !scene.fr;
        scene.db.t(pauseLabel(scene.fr));
      };
      scene.db = arcadeLink(this, 540, 556, '', toggle);
      scene.cds = games.map(([, description], i) => {
        const x = 263 + i % 2 * 360, y = 199 + mathFloor(i / 2) * 158;
        return [
          label(x, y, 22),
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
        if (scene.st === patioState) {
          button = button.replace('P2_', 'P1_');
          const previous = scene.i;
          if (button === left || button === right) scene.i ^= 1;
          if (button === up || button === downButton) scene.i ^= 2;
          if (button === thirdButton) scene.or();
          if (button === sixthButton) scene.cfg();
          if (previous !== scene.i) { scene.pv = scene.time.now; blip(510 + scene.i * 90, 390, 0.075, 0.046); }
          if (confirmButton(button)) scene.play();
        } else if (button[3] === '2') {
          scene.home();
        } else if (scene.st === 'prefs') {
          const option = scene.q5[Number(button.slice(-1)) - 3];
          option?.emit('pointerdown');
          option?.emit('pointerup');
        } else if (scene.st === guideState) {
          if (button[3] === '4') toggle();
          if (button[3] === '3') scene.z7 = 0.32;
          if (button[3] === '5') scene.q12 = 5;
          if (button === startDuel) scene.run(2);
          if (confirmButton(button)) scene.run();
        } else if (scene.st === 'done' && (confirmButton(button) || scene.md === 2 && button === 'P2_1')) {
          const mode = scene.md;
          scene.play();
          scene.run(mode);
        } else if (scene.st === playState) {
          if (scene.i === 3 && !scene.z5) {
            if (!scene.tug && button === (scene.B ? 'P2_3' : thirdButton)) {
              scene.vy = 520;
              scene.R = mathMax(0, scene.R - 0.2);
              scene.tug = 1;
              blip(235, 520, 0.13, 0.038, triangleWave);
            }
            if (!scene.z5 && !scene.tk && button === (scene.B ? 'P2_5' : 'P1_5')) {
              scene.tk = 5;
              blip(410, 125, 0.19, 0.047, triangleWave);
            }
          }
          const pl = button === action ? 0 : button === 'P2_1' ? 1 : -1;
          if (pl < 0 || pl >= scene.md) return;
          if (scene.i === 1 && pl === scene.B && !scene.fly && !scene.C) {
            scene.z2 = 0;
            scene.T = true;
          }
          if (scene.i === 2) {
            const top = scene.V[pl];
            if (top.A > 0 && top.cd <= 0 && top.E <= 0) {
              top.A = mathMax(0, top.A - 0.8);
              top.bst = 0.26;
              top.cd = 1;
              blip(130, 330, 0.18, 0.035, triangleWave);
            }
          }

        }
      }, button => {
        scene.D.delete(button);
        if (button === 'P' + (scene.B + 1) + '_1' && scene.T && scene.st === playState) scene.tj();
      }, () => {
        scene.D.clear();
        scene.T = false;
      });
      scene.r5();
    }

    op() {
      // Center the artwork and credit as a group. The prompt stands alone.
      const artOffsetX = -38.5, artOffsetY = -7;
      const g = graphics(this).z(5).setPosition(artOffsetX, artOffsetY);
      this.J = true;
      g.c(0).b(-artOffsetX, -artOffsetY, width, height);
      const credit = arcadeText(this, width / 2, height / 2, 'JUGAR', 32).z(5);
      this.time.delayedCall(120, () => {
        credit.yAt(353).t('Creado por @esteflan-vybe');
        g.c(0xffce77).e(400, 312, 106, 27)
          .tri(365, 251, 453, 312, 347, 312).tri(365, 251, 435, 251, 453, 312);
        g.c(0xa45029).e(400, 251, 70, 25);
        // The far lens narrows as the flan turns toward the monitor.
        g.p(3, 0x131c20).l(368, 269, 390, 276);
        g.c(0x131c20).b(411, 275, 14, 4)
          .tri(385, 273, 415, 275, 405, 286)
          .tri(440, 272, 422, 275, 430, 283);
        g.p(2, 0x437268).l(394, 275, 410, 277).l(425, 276, 435, 274);
        g.p(3, 0x542f25).beginPath().arc(415, 284, 14, 0.18, 1.48).strokePath();
        g.c(0x254257).b(452, 266, 72, 52).b(434, 318, 96, 8).c(0x88edaa);
        for (let i = 0; i < 12; i++) {
          this.time.delayedCall(150 + i * 135, () => {
            g.b(462 + i % 3 * 14, 278 + mathFloor(i / 3) * 10, 10, 3);
            if (!audio) return;
            pandereta(0, 0.18, audio.destination, 1.8 + mathRandom());
            blip(1180, 940, 0.026, 0.064, triangleWave);
          });
        }
        // Compressed C–F–G–C flourish, based on the supplied success reference.
        this.time.delayedCall(2200, () => [523, 698, 784, 1047].forEach((hz, i) =>
          blip(hz, hz, 0.42 - i * 0.062, 0.068, triangleWave, i * 0.062)));
        this.tweens.add({ targets: [g, credit], alpha: 0, y: '-=12', delay: 2400, duration: 500,
          onComplete: () => { this.J = false; g.destroy(); credit.destroy(); } });
      });
    }

    home() {
      backSound();
      this.r5();
    }

    or() {
      if (this.J) return;
      confirmSound();
      this.scene.start(scoresScene, { game: this.i });
    }

    cfg() {
      this.st = 'prefs';
      this.patio(false);
      this.q14.t(this.pg ? 'PAUSA · AJUSTES' : 'AJUSTES');
      this.bb.t(this.pg ? '↩ ' + (prefs[0] ? 'I/T' : 'B2') + ' · Seguir' : patioLabel);
      this.q11.t('');
      this.q10.t('');
      this.uf.cl();
      this.q5.forEach((button, i) => {
        this.uf.c(0x203a60).rb(185, 192 + i * 90, 430, 76, 38);
        const choices = i ? ['ON', 'OFF'] : ['TECLADO', 'GABINETE'];
        button.v(true).f(18).setPadding(10, 12).fs(430, 76).t(
          ['CONTROLES', 'MÚSICA', 'EFECTOS DE SONIDO'][i] + '\n' +
          choices.map((name, option) => (prefs[i] === !option ? '☑ ' : '☐ ') + name).join('   ') +
          separator + (prefs[0] ? ['O', 'J', 'K'][i] : 'B' + (i + 3)));
      });
    }

    patio(visible) {
      this.pb.v(visible).xy(768, 550);
      this.q14.xy(visible ? 400 : 38, visible ? 34 : 20).a(visible ? 0.5 : 0, 0).f(visible ? 40 : 28);
      this.rbn.v(visible).t('RÉCORDS · ' + (prefs[0] ? 'O' : 'B3'));
      this.bb.v(!visible);
      this.cds.flat().forEach(label => label.v(visible));
      for (const label of [this.gl, this.msg, this.win]) label.v(false);
      for (const zone of this.zs) {
        if (visible) zone.setInteractive({ useHandCursor: true });
        else zone.disableInteractive();
      }
    }

    r5() {
      const scene = this;
      scene.G = undefined;
      scene.fx.cl();
      duelNames[0] = 'J1 ROJO';
      stopMotor();
      scene.gd(false);
      scene.patio(true);
      scene.q5.forEach(button => button.v(false));
      scene.st = patioState;
      scene.T = false;
      scene.pv = scene.time.now;
      scene.q14.t('LA FONDA ARCADE');
      scene.q11.t('');
      scene.q10.t((prefs[0] ? 'WASD · U' : 'JOYSTICK · B1') + ' Jugar');
    }

    play(turn = 0) {
      const scene = this;
      scene.G = undefined;
      scene.fx.cl();
      if (scene.J) return;
      confirmSound();
      if (scene.i === 0) {
        scene.scene.start('bolitas');
        return;
      }
      scene.st = guideState;
      scene.patio(false);
      scene.q14.t(games[scene.i][0]);
      scene.j = 0;
      scene.md = 1;
      scene.B = turn;
      scene.U = scene.z6 = scene.z2 = scene.sh = 0;
      scene.kn = scene.Q = scene.cp = scene.ca = scene.rh = scene.tug = scene.tk = 0;
      if (!turn) scene.k = [0, 0];
      scene.vx = scene.vy = 0;
      scene.z12 = [];
      scene.ds = [];
      scene.z8 = [];
      scene.x = 400;
      scene.ay = boxY;
      scene.T = false;
      scene.fly = null;
      scene.C = null;
      scene.z14 = [0, 0];
      scene.V = [scene.nt(400)];
      scene.rg = scene.rk = [];
      scene.ks = [];
      scene.ls = [];
      scene.red = 2;
      scene.q17 = false;
      scene.O = 0.65;
      scene.bd = [];
      scene.N = null;
      scene.P = 8 + mathRandom() * 3;
      scene.q16 = 16;
      scene.o = '';
      scene.q8 = null;
      scene.R = 0.18;
      scene.z5 = scene.i === 3;
      scene.y = scene.z5 ? 475 : 345;
      scene.q11.t('¡A JUGAR!');
      const isKite = scene.i === 3;
      scene.q4.t(roundGuides[scene.i]);
      scene.fr = reducedMotion();
      scene.q9 = 0;
      scene.z7 = scene.q12 = scene.tc = scene.ps = 0;
      scene.dx = 586;
      scene.dy = 301;
      scene.rd = false;
      scene.K = '';
      scene.gd(true);
    }

    gd(visible) {
      const scene = this;
      guideKeys(this, visible ? scene.i : undefined);
      scene.tp.v(false);
      scene.q10.t('').v(!visible);
      for (const label of [scene.gh, scene.q4, scene.gb, scene.q18]) label.v(visible);
      scene.uf.cl();
      scene.q6.cl();
      const showDemo = visible && scene.i === 3;
      scene.db.v(visible).t(pauseLabel(scene.fr));
      if (showDemo) { scene.q7[0].t((prefs[0] ? 'O/Y' : 'B3') + ' · 1 s'); scene.kg(0); }
      scene.hds.concat(scene.q7).forEach(label => label.v(visible));
      if (!showDemo) {
        const ray = scene.i === 1;
        scene.hds.forEach((label, i) => label.t((ray ? ['1 APUNTA', '2 CARGA', '3 SUELTA'] : ['1 MUEVE', '2 RECOGE', '3 ESQUIVA'])[i]));
        scene.q7.forEach((label, i) => label.yAt(!ray && i === 1 ? 344 : 354).t((ray ? ['', 'Mantén y suelta', 'Línea = 100'] : ['TURBO', 'Oro 100\nCeleste 200', ''])[i]));
      } else scene.hds.forEach((label, i) => label.t(['PICADA', 'PIRUETA', 'CORTA / ESQUIVA'][i]));
      if (visible) {
        const [, accent] = headerThemes[scene.i];
        scene.uf.c(0x172638, 0.98).rb(76, 160, 648, 366, 4);
        scene.uf.p(2, accent).edge(76, 160, 648, 366, 4);
        if (!showDemo) lesson(scene.q6, scene.i);
      }
    }

    kg(dt) {
      const scene = this;
      scene.z7 = scene.z7 < -1.5 ? 0.32 : scene.z7 - dt;
      scene.q12 = mathMax(0, scene.q12 - dt) || 5;
      scene.q7[1].yAt(354).t((prefs[0] ? 'K/G' : 'B5') + ' · ' + mathCeil(scene.q12) + ' s');
      const angle = scene.q12 > 4.2 ? (5 - scene.q12) * pi / 0.4 : 0;
      scene.dx = clamp(scene.dx + scene.W(left, right) * 76 * dt, 518, 678);
      scene.dy = clamp(scene.dy + (56 * scene.W(up, downButton) - (scene.rd && scene.q9 > 2.25 ? 85 : 0)) * dt, 253, 325);
      if (scene.ps > 0) {
        scene.ps = mathMax(0, scene.ps - dt);
        if (!scene.ps) {
          scene.q9 = scene.tc = 0;
          scene.rd = !scene.rd;
          scene.dx = 586;
          scene.dy = 301;
        }
      } else {
        scene.q9 += dt;
      }
      const g = scene.q6.cl();
      lessonCards(g);

      for (const [x, y] of [[210, 257 + 55 * (scene.z7 > 0 ? 1 - scene.z7 / 0.32 : mathMax(0, 1 + scene.z7))], [410 + mathSin(angle) * 22, 290 - mathCos(angle) * 22]]) {
        g.p(1, 0xd3e8f4).l(x, y + 12, x - 12, 339);
        g.c(0xffcc79).dot(x - 12, 339, 3);
        kiteArt(g, x, y, 0x79caff, 1, 0.55);
      }
      g.p(2, skyInk).l(156, 262, 156, 312);
      g.c(skyInk).tri(150, 307, 156, 316, 162, 307);
      g.p(2, skyInk, angle ? 1 : 0.5).r(410, 290, 22);

      const rivalX = 677 - scene.q9 * 43;
      const rivalY = scene.rd ? 296 : 254;
      const start = { x: rivalX, y: rivalY + 12 };
      const end = { x: rivalX - 16, y: 339 };
      const bodyDistance = mathHypot(scene.dx - rivalX, scene.dy - rivalY);
      const near = scene.rd ? bodyDistance < 34 : onThread(scene.dx, scene.dy, start, end).I < 23;
      const contact = scene.rd ? bodyDistance < 13 : near;
      const limit = scene.rd ? redCutTime : autoCutTime;
      if (!scene.ps) {
        const escaped = scene.rd && !near && scene.tc > 0;
        scene.tc = contact ? mathMin(limit, scene.tc + dt * (scene.rd ? 3 : 1)) : 0;
        if ((contact && scene.tc >= limit) || escaped || scene.q9 > 3.65) {
          scene.K = contact && scene.tc >= limit ? (scene.rd ? '¡TE CORTÓ!' : '¡CORTE!') :
            scene.rd ? '¡ESQUIVADO!' : 'Acércate';
          scene.ps = 0.95;
        }
      }
      const sliced = scene.K === '¡CORTE!' && scene.ps > 0;
      if (near && !scene.ps) {
        const tint = scene.rd ? roseInk : 0xffdc8d;
        if (scene.rd) dangerRing(g, scene.dx, scene.dy, 15, scene.tc / limit);
        else g.p(2, tint).r(scene.dx, scene.dy, 15);
      }
      if (scene.rd) {
        g.p(1.5, 0xffa1a1).r(rivalX, rivalY, 13);
      }
      const drift = 0.95 - scene.ps;
      for (const [x, y, color, cut] of [
        [scene.dx, scene.dy, 0x79caff, scene.ps && scene.K === '¡TE CORTÓ!'],
        [rivalX, rivalY, scene.rd ? chileRed : 0xe6f4dc, sliced]
      ]) {
        if (!cut) g.p(1, color, 0.7).l(x, y + 12, x - 16, 339);
        else g.p(2, goldInk, scene.ps).r(x, y, 3 + drift * 30);
        kiteArt(g, x + (cut ? drift * 60 : 0), y - (cut ? drift * 55 : 0), color, cut ? scene.ps : 1, 0.55);
      }
      const prompt = scene.ps ? sliced ? "+100 · ¡CORTE!" : scene.K : scene.rd
        ? (near ? '¡ALÉJATE!' : 'Evita al rojo')
        : (near ? 'Corte automático' : 'Busca hilo');
      scene.q7[2].t(prompt).fg(scene.rd ? '#ffaaaa' : '#ffdc8d');
    }

    run(mode = 1) {
      const scene = this;
      if (scene.st !== guideState) return;
      confirmSound();
      scene.md = mode;
      if (scene.i === 3) duelNames[0] = 'J1 CHILE';
      if (scene.i === 2) {
        if (mode === 2) {
          scene.V = [scene.nt(280), scene.nt(520)];
        }
        const shift = scene.shift = ((scene.shift || 0) + randomBetween(1, 4)) % 5;
        scene.rk = stoneZones.map(([x, y], i) =>
          [x + randomBetween(-22, 22), y + randomBetween(-22, 22), (i + shift) % 5 < 2]);
        scene.br(scene.V);
        for (let i = 0; i < 3; i++) scene.ar();
        scene.ri = 6;
        scene.q3 = false;
      }
      scene.gd(false);
      scene.gl.v(scene.i === 3);
      if (scene.z5) {
        scene.gl.t((mode === 2 ? duelNames[scene.B] + separator : '') + '↑ DESPEGA');
      }
      scene.st = playState;
      scene.pb.v(true).xy(768, 137);
      guideKeys(this, scene.i, true);
    }

    end() {
      const scene = this;
      if (scene.i === 3 && scene.md === 2) {
        scene.k[scene.B] = scene.j;
        if (!scene.B) {
          scene.D.clear();
          scene.play(1);
          scene.run(2);
          return;
        }
      }
      scene.st = 'done';
      guideKeys(this);
      scene.q10.t('');
      scene.gl.v(false);
      stopMotor();
      blip(330, 165, 0.23, 0.045, triangleWave);
      if (scene.md === 1 && scoreQualifies(scene.i, scene.j)) {
        scene.scene.start(scoresScene, { game: scene.i, points: scene.j, kiteLoss: scene.o });
        return;
      }
      const duel = scene.md === 2;
      if (duel) {
        duelTitle(scene.win, scene.k).v(true);
        if (scene.k[0] !== scene.k[1]) celebrate.call(this);
      }
      const result = (scene.o || gameOver) + '\n' + scene.j + recordUnit + scene.rec[scene.i];
      scene.msg.yAt(duel ? 431 : 300).t(duel ? replayLabel() : result + '\n\n' + replayLabel()).v(true);
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
      const ly = rayLanding(this.ay, this.z2);
      this.fly = {
        x: 400, y: 478, z: 0, vx: (this.x - 400) / time,
        vy: (ly - 478) / time, ly,
        vz: 450, air: true, M: this.B
      };
    }

    Y(dt, dx, dy = 0) {
      const scene = this;
      if (scene.C) {
        scene.C.time -= dt;
        if (scene.C.time <= 0) {
          if (scene.md === 2 && scene.C.points) scene.ds.push(scene.C);
          scene.C = null;
          if (scene.sh === 5 * scene.md) scene.end();
          else if (scene.md === 2) {
            scene.B = 1 - scene.B;
            scene.x = 400;
            scene.ay = boxY;
          }
        }
      } else if (scene.fly) {
        const shot = scene.fly;
        shot.x += shot.vx * dt;
        shot.y += shot.vy * dt;
        if (shot.air) {
          const previousHeight = shot.z;
          shot.z += (shot.vz - 490 * dt) * dt;
          shot.vz -= 980 * dt;
          if (shot.z <= 0) {
            // Resolve contact inside the step before applying restitution.
            const remainder = dt * shot.z / (shot.z - previousHeight || 1);
            shot.x -= shot.vx * remainder;
            shot.y -= shot.vy * remainder;
            shot.vz += 980 * remainder;
            shot.z = 0;
            shot.ly = 0;
            scene.impact(shot);
            if (scene.bt(shot)) return;
            const offsetX = shot.x - 400, offsetY = shot.y - 272;
            const clay = mathAbs(offsetX) <= 120 && mathAbs(offsetY) <= 72;
            const side = mathAbs(offsetX) >= 113, end = mathAbs(offsetY) >= 65;
            if (clay && (side || end)) {
              // The wooden lip kicks the disc back onto the clay.
              shot.vx = side ? -mathSign(offsetX) * 60 : shot.vx * 0.12;
              shot.vy = end ? -mathSign(offsetY) * 60 : shot.vy * 0.12;
              shot.vz = 115;
              blip(540, 200, 0.07, 0.045, triangleWave);
              return;
            }
            shot.vx *= clay ? 0.035 : 0.25;
            shot.vy *= clay ? 0.035 : 0.25;
            shot.vz *= clay ? -0.025 : -0.14;
            shot.air = shot.vz > 18;
          }
        } else {
          if (scene.bt(shot)) return;
          const drag = mathMax(0, 1 - 460 * dt / (mathHypot(shot.vx, shot.vy) || 1));
          shot.vx *= drag;
          shot.vy *= drag;
          if (!drag) scene.stj(shot);
        }
      } else {
        scene.x = clamp(scene.x + dx * 235 * dt, 175, 625);
        scene.ay = clamp(scene.ay + dy * 100 * dt, 205, 345);
        if (scene.T) scene.z2 += dt;
      }
      const sh = scene.sh + (scene.C ? 0 : 1);
      const tejo = 'TEJO ' + mathCeil(sh / scene.md) + '/5';
      const seq = scene.z14[scene.B];
      const result = scene.C ? separator + (seq === 5 ? '¡PURO FUEGO!' : seq ? 'QUEMADA' : '+' + scene.C.points) : '';
      const next = seq && (!scene.C || sh <= 4 * scene.md + scene.B) ?
        ' · SIG. ×' + (seq + 1) : '';
      if (scene.st === playState) scene.q11.t(tejo + (scene.md === 1 ? separator + scene.j + pointUnit : '') + result + next);
    }

    bt(shot) {
      const blocked = (x, y) => this.ds.find(disc => mathHypot(disc.x - x, disc.y - y) < 30);
      const disc = blocked(shot.x, shot.y);
      if (!disc) return false;
      const dx = shot.x - disc.x, dy = shot.y - disc.y;
      const normal = mathHypot(dx, dy) > 3 ? Math.atan2(dy, dx) : -0.6;

      // Prefer the impact normal. In a cluster, look for the closest free landing.
      for (let radius = 32; ; radius += 32) {
        for (let i = 0; i < 12; i++) {
          const angle = normal + (i % 2 ? 1 : -1) * mathFloor((i + 1) / 2) * pi / 6;
          const x = disc.x + mathCos(angle) * radius, y = disc.y + mathSin(angle) * radius;
          if (blocked(x, y)) continue;
          shot.air = true;
          shot.vz = 155;
          const flightTime = 2 * shot.vz / 980;
          shot.vx = (x - shot.x) / flightTime;
          shot.vy = (y - shot.y) / flightTime;
          blip(1100, 430, 0.08, 0.055);
          return true;
        }
      }
    }

    impact(shot) {
      const str = clamp(-shot.vz / 450, 0.12, 1);
      blip(155 + str * 110, 48, 0.07 + str * 0.1, str * 0.084, triangleWave);
      blip(720, 135, 0.045, str * 0.026);
      this.z12.push({ x: shot.x, y: shot.y, str });
      for (let i = 0; i < 14 * str; i++) {
        const angle = i * 2.4;
        const speed = (26 + (i % 4) * 18) * str;
        this.z8.push({
          x: shot.x, y: shot.y, vx: mathCos(angle) * speed,
          vy: mathSin(angle) * speed * 0.45 - 24, F: 0.62 + i % 3 * 0.08
        });
      }
    }

    stj(shot) {
      const scene = this;
      const distance = mathAbs(shot.y - boxY);
      const inside = mathAbs(shot.x - boxX) <= 120 && mathAbs(shot.y - 272) <= 72;
      const points = inside ? distance <= 9 ? 100 : mathMax(10, 90 - mathRound(distance)) : 0;
      const earned = points * (1 + scene.z14[scene.B]);
      scene.j += earned;
      scene.k[scene.B] += earned;
      if (points === 100) {
        scene.z14[scene.B]++;
        confirmSound();
      } else {
        scene.z14[scene.B] = 0;
        if (points) blip(620, 740, 0.1, 0.04);
      }
      scene.sh++;
      scene.C = { ...shot, time: 1.15, points: earned };
      scene.pop(rayX(shot.x, shot.y) + 60, rayY(shot.y), earned, points === 100 ? '#ffdc78' : ink, 21);
      scene.fly = null;
      scene.z2 = 0;
    }

    move(dt, targetX, targetY, response, left, right, top, bottom, bounce = 0, body = this) {
      const blend = 1 - Math.exp(-response * dt);
      body.vx += (targetX - body.vx) * blend;
      body.vy += (targetY - body.vy) * blend;
      const x = body.x + body.vx * dt, y = body.y + body.vy * dt;
      body.x = clamp(x, left, right);
      body.y = clamp(y, top, bottom);
      if (x !== body.x) body.vx *= -bounce;
      if (y !== body.y) body.vy *= -bounce;
    }

    nt(x) {
      return { x, y: 345, vx: 0, vy: 0, A: 14, bst: 0, cd: 0, E: 0, H: 0 };
    }

    ar() {
      const occupied = [...this.V, ...this.rg];
      const clear = (x, y) => occupied.every(point => mathHypot(x - point.x, y - point.y) >= 48) &&
        this.rk.every(([sx, sy]) => mathHypot(x - sx, y - sy) >= 42);
      for (let attempt = 0; attempt < 12; attempt++) {
        const x = randomBetween(184, 616), y = randomBetween(208, 455);
        if (!clear(x, y)) continue;
        this.rg.push({ x, y });
        return;
      }
      for (const [x, y] of [[192, 215], [330, 215], [470, 215], [608, 215], [192, 448], [608, 448]]) {
        if (!clear(x, y)) continue;
        this.rg.push({ x, y });
        return;
      }
    }

    br(spinning) {
      let best, bestDistance = 0;
      for (const x of [192, 400, 608]) {
        for (const y of [215, 330, 448]) {
          if (this.rg.some(ring => mathHypot(ring.x - x, ring.y - y) < 56)) continue;
          const distance = mathMin(...spinning.map(top => mathHypot(top.x - x, top.y - y)));
          if (distance > bestDistance) {
            best = { x, y, F: 2.8 };
            bestDistance = distance;
          }
        }
      }
      if (!best) return;
      this.rg.push(best);
      blip(570, 950, 0.12, 0.032, triangleWave);
    }

    Z(dt) {
      const scene = this;
      const { V: tops, rg: rings, md: mode, k: sum } = this;
      tops.forEach((top, i) => {
        if (mode === 2) top.A = mathMax(1, top.A);
        if (top.A <= 0 && !top.E) return;
        const p = 'P' + (i + 1) + '_';
        const dx = scene.W(p + 'L', p + 'R'), dy = scene.W(p + 'U', p + 'D');
        top.bst = mathMax(0, top.bst - dt);
        top.cd -= dt;
        if (top.E > 0) {
          const step = mathMin(dt, top.E);
          top.E -= step;
          // Reflect at the walls without losing speed or travel distance.
          for (const [axis, velocity, min, max] of [['x', 'vx', 160, 640], ['y', 'vy', 180, 475]]) {
            const next = top[axis] + top[velocity] * step;
            const edge = clamp(next, min, max);
            top[axis] = 2 * edge - next;
            if (edge !== next) top[velocity] *= -1;
          }
          if (top.E === 0) top.vx = top.vy = 0;
        } else {
          // Recoil locks steering, so only spend spin while the pl has control.
          top.A = mathMax(0, top.A - dt);
          top.bed = scene.rk.some(([x, y, mud]) => mud && mathHypot(top.x - x, top.y - y) < 37);
          if (top.bed) top.A = mathMax(0, top.A - 2.5 * dt);
          const speed = top.bed ? 90 : top.bst > 0 ? 365 : 190;
          const direction = mathMax(1, mathHypot(dx, dy));
          scene.move(dt, dx * speed / direction, dy * speed / direction,
            top.bst > 0 ? 13 : 7, 160, 640, 180, 475, 0.55, top);
          for (const [x, y, mud] of scene.rk) {
            const dx = top.x - x, dy = top.y - y;
            const distance = mathHypot(dx, dy);
            if (mud || distance >= 22) continue;
            const recoil = 150 / (distance || 1);
            top.vx = (dx || !distance) * recoil;
            top.vy = dy * recoil;
            top.E = 0.16;
            blip(320, 160, 0.05, 0.027, triangleWave);
            break;
          }
        }
        top.H += dt * (7 + top.A * 2.2 + top.bst * 35) * (top.bed ? 0.65 : 1);
      });
      const [p1, p2] = tops;
      if (p2 && p1.A > 0 && p2.A > 0 && !p1.E && !p2.E) {
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const distance = mathHypot(dx, dy);
        if (distance >= 38) scene.q3 = false;
        else if (!scene.q3) {
          scene.q3 = true;
          const vx = distance ? 420 * dx / distance : 420;
          const vy = distance ? 420 * dy / distance : 0;
          p1.vx = -vx;
          p1.vy = -vy;
          p2.vx = vx;
          p2.vy = vy;
          p1.E = p2.E = 0.32;
          const boosted = Number(p1.bst > 0) - Number(p2.bst > 0);
          if (boosted) {
            const top = boosted > 0 ? p1 : p2;
            top.A = mathMin(18, top.A + 0.6);
            blip(660, 990, 0.09, 0.03, triangleWave, 0.06);
          }
          if (p1.bst && p2.bst) scene.pop((p1.x + p2.x) / 2, p1.y, '¡CHISPA!', '#fff9ec', 19);
          p1.bst = p2.bst = 0;
          blip(280, 85, 0.12, 0.055, triangleWave);
          blip(720, 420, 0.055, 0.023);
        }
      }
      const spinning = tops.filter(top => top.A > 0);
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        const bon = ring.F !== undefined;
        if (bon) {
          ring.F -= dt;
          if (ring.F <= 0) {
            rings.splice(i, 1);
            continue;
          }
        }
        const distances = tops.map(top => top.A > 0 ? mathHypot(ring.x - top.x, ring.y - top.y) : Infinity);
        const pl = distances[1] < distances[0] ? 1 : 0;
        if (distances[pl] > 29) continue;
        rings.splice(i, 1);
        if (!bon) scene.ar();
        const points = bon ? 200 : 100;
        scene.j += points;
        sum[pl] += points;
        const popupX = ring.x + (ring.x < 400 ? 42 : -42);
        scene.pop(popupX, ring.y - 10, points, bon ? '#baffff' : '#fff9ec', bon ? 23 : 19);
        blip(590 + pl * 85, 880, 0.11, 0.045);
        if (bon) blip(880, 1320, 0.14, 0.035, triangleWave, 0.07);
        const top = tops[pl];
        top.A = mathMin(18, top.A + 1.7);
      }
      scene.ri -= dt;
      if (spinning.length && scene.ri <= 0) {
        scene.br(spinning);
        scene.ri = 6;
      }
      if (spinning.length) spinSound(mathMax(...spinning.map(top => top.A)),
        mathMax(...spinning.map(top => top.bst)));
      const remaining = mathMax(0, 30 - scene.U);
      scene.q11.t(remaining.toFixed(1) + ' s' + (p2 ? '' : ' · ' + scene.j + pointUnit));
      if (!remaining || !p2 && !p1.A && !p1.E) scene.end();
    }

    r4(dt, dx, dy) {
      const scene = this;
      const { U: age } = this;
      for (const kite of scene.ls) {
        kite.time -= dt;
        kite.x += kite.vx * dt;
        kite.y += kite.vy * dt;
        kite.vy -= 33 * dt;
      }
      scene.ls = scene.ls.filter(kite => kite.time > 0);
      const gust = mathSin(age * 2.2 + scene.y * 0.019) * 71;
      const updraft = mathCos(age * 2.7 + scene.x * 0.013) * 48;
      const rise = mathMax(0, -dy);
      scene.R = clamp(scene.R + rise * 0.5 * dt, 0, 1);
      const altitude = 465 - scene.R * 270;
      scene.tug = mathMax(0, scene.tug - dt);
      const tension = clamp((altitude - scene.y) * 1.15, -145, 145);
      scene.tk = mathMax(0, scene.tk - dt);
      const spin = scene.tk > 4.2 ? (5 - scene.tk) * pi / 0.4 : 0;
      scene.move(dt, spin ? mathCos(spin) * 314 : dx * 226 + gust * (0.65 + scene.R),
        spin ? -mathSin(spin) * 314 : scene.tug > 0.68 ? 520 : dy * 235 + tension + updraft,
        spin || scene.tug > 0.68 ? 1000 : 3.2, 28, 772, 179, 500);
      scene.q16 -= dt * (scene.y > 455 ? 1.55 : 0.30);
      scene.O -= dt;
      if (scene.O <= 0) scene.ss();
      const previousTarget = scene.q8?.kite;
      scene.q8 = null;
      let danger = false;
      scene.rh = 0;
      const thread = scene.X();
      for (const kite of scene.ks) {
        if (kite.red) {
          const dx = scene.x - kite.cx, dy = scene.y - kite.cy;
          const near = mathHypot(dx, dy) < 240;
          if (near) {
            kite.vx += clamp(clamp(dx * 1.1, -150, 150) - kite.vx, -150 * dt, 150 * dt);
            kite.vy += clamp(clamp(dy * 0.8, -90, 90) - kite.vy, -120 * dt, 120 * dt);
          } else kite.vy = -10;
        }
        kite.cx += kite.vx * dt;
        kite.cy += kite.vy * dt;
        // Vertices on a 3×3 grid, traversed as Z, N and M.
        const gold = kite.color === goldInk;
        const path = gold ? '604286' : kite.red ? '60826' : '02680';
        const ph = (age * (gold ? 7 : kite.red ? 5 : 3) + kite.ph) % (path.length - 1);
        const segment = ph | 0, t = ph - segment;
        const a = +path[segment], b = +path[segment + 1];
        const blend = (from, to) => from + (to - from) * t - 1;
        kite.x = kite.cx + blend(a % 3, b % 3) * 32;
        kite.y = clamp(kite.cy + blend(a / 3 | 0, b / 3 | 0) * 24, 178, 500);
        if (kite.x < 29 || kite.x > 771) {
          kite.hit = 0;
          continue;
        }
        if (kite.red) {
          const bodyDistance = mathHypot(kite.x - scene.x, kite.y - scene.y);
          const touching = bodyDistance < redRadius || thread.some((p, i, a) =>
            i && onThread(kite.x, kite.y, a[i - 1], p).I < redRadius);
          danger ||= bodyDistance < 145 || touching;
          kite.hit = touching ? mathMin(redCutTime, (kite.hit ?? 0) + dt * (bodyDistance < redRadius ? 3 : 1)) : mathMax(0, (kite.hit ?? 0) - dt);
          scene.rh = mathMax(scene.rh, kite.hit);
        } else {
          const point = scene.tpn(kite);
          if (point.I <= 54 && (!scene.q8 || point.I < scene.q8.I)) {
            scene.q8 = { ...point, kite };
          }
        }
      }
      if (scene.q8) {
        scene.ca = (previousTarget === scene.q8.kite ? scene.ca : 0) + dt;
        if (scene.ca >= autoCutTime) {
          scene.ck(scene.q8);
          scene.q8 = null;
          scene.ca = 0;
        }
      } else {
        scene.ca = 0;
      }
      if (danger && !scene.q17) blip(520, 310, 0.14, 0.044);
      scene.q17 = danger;
      const birdHit = scene.bs(dt, thread);
      scene.ks = scene.ks.filter(kite => !kite.gone && mathAbs(kite.cx - 400) < 485 && kite.cy > 119);
      scene.j = mathFloor(age * 10) + scene.cp;
      scene.q11.t((age >= 26 ? 'INSANO · ' : '') + (scene.md === 1 ? scene.j + pointUnit + separator : '') + 'AIRE ' + mathMax(0, scene.q16).toFixed(1));
      if (birdHit) scene.o = '¡CÓNDOR AL HILO!';
      else if (scene.rh >= redCutTime) scene.o = '¡CORTARON TU HILO!';
      else if (scene.q16 <= 0) scene.o = 'SIN AIRE';
      scene.gl.t(danger && scene.N ? '¡ROJO Y CÓNDOR!' :
        danger ? '¡ESQUIVA AL ROJO!' :
        scene.N ? '¡CÓNDOR!' :
        scene.q8 ? 'CORTE AUTO' :
        scene.Q === 5 ? '¡REY DEL CIELO!' : age >= 26 ? '¡MODO INSANO!' : 'CORTA HILOS');
      scene.gl.t(scene.gl.text + separator + (prefs[0] ? scene.B ? 'Y ' : 'O ' : 'B3 ') +
        (scene.tug ? scene.tug.toFixed(1) + ' s' : 'LISTO') + separator + (prefs[0] ? scene.B ? 'G ' : 'K ' : 'B5 ') +
        (scene.tk ? scene.tk.toFixed(1) + ' s' : 'LISTO'));
      if (scene.o) {
        if (birdHit || scene.rh >= redCutTime) blip(1800, 85, 0.32, 0.075);
        scene.end();
      }
    }

    ss() {
      const { U: age, kn: kiteNo } = this;
      const red = kiteNo >= this.red &&
        this.ks.filter(kite => kite.red).length < mathMin(7, 1 + mathFloor(age / 7));
      const lane = kiteNo < 2 ? kiteNo : randomBetween(0, red ? 1 : 2);
      if (red) this.red = kiteNo + (age < 12 ? randomBetween(2, 3) : age < 26 || kiteNo % 4 === 0 ? 2 : 1);
      const speed = red ? mathMin(180, 90 + age * 2) : mathMin(230, 105 + age * 3);
      const x = lane === 0 ? -52 : lane === 1 ? width + 52 :
        clamp(this.x + randomBetween(-185, 185), 100, 700);
      const y = lane === 2 ? 500 : clamp(this.y + randomBetween(-92, 85), 188, 460);
      this.ks.push({
        x, y, cx: x, cy: y, ph: mathRandom() * 6, red,
        vx: lane === 0 ? speed : lane === 1 ? -speed : randomBetween(-36, 36),
        vy: lane === 2 ? -speed * 0.83 : -10,
        color: red ? chileRed : mathRandom() < 0.12 ? goldInk : 0xe6f4dc
      });
      this.kn++;
      this.O = mathMax(0.35, 1.25 - age * 0.035);
    }

    z10(kite) {
      const length = mathMax(0, 522 - kite.y - 20);
      return { x: clamp(kite.x - kite.vx * length * 0.0035, 12, 788), y: 522 };
    }

    tpn(kite) {
      return onThread(this.x, this.y, { x: kite.x, y: kite.y + 20 }, this.z10(kite));
    }

    X() {
      const length = 502 - this.y;
      return Array.from({ length: 9 }, (_, i) => {
        const t = i / 8;
        return {
          x: this.x - this.vx * t * 0.2 + mathSin(this.U * 6 - t * 8) * t * (8 + this.R * 17) * (1 - mathAbs(this.tug)),
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
          baseY: randomBetween(208, 285), vx: side * randomBetween(105, 148) });
        scene.P = 8.5 + mathRandom() * 5;
      }
      scene.N = null;
      let snagged = false;
      const segments = thread.slice(1);
      const touches = (x, y, age) => {
        if (mathAbs(x - scene.x) > mathAbs(scene.vx) * 0.2 + 90) return false;
        const flap = scene.flap(x, age) - 7;
        // Sample across the body and both wings, matching the drawn wingspan.
        for (let offset = -34; offset <= 34; offset += 8.5) {
          const px = x + offset, py = y + flap * mathAbs(offset) / 34;
          if (mathAbs(px - scene.x) / 18 + mathAbs(py - scene.y) / 22 < 1.34 ||
              segments.some((point, i) => onThread(px, py, thread[i], point).I < 7)) return true;
        }
      };
      for (const bird of scene.bd) {
        bird.x += bird.vx * dt;
        bird.y = scene.by(bird, bird.x, scene.U);
        const contact = touches(bird.x, bird.y, scene.U);
        let approach = contact ? 0 : null;
        for (let step = 1; approach === null && step <= 22; step++) {
          const ahead = step * 0.08;
          const x = bird.x + bird.vx * ahead;
          if (touches(x, scene.by(bird, x, scene.U + ahead), scene.U + ahead)) approach = ahead;
        }
        // Warn as soon as a condor is headed across the pl's lane.
        approach ??= (scene.x - bird.x) / bird.vx;
        if (approach < 0) continue;
        if (!bird.warning) blip(770, 540, 0.15, 0.043, triangleWave);
        bird.warning = true;
        if (!scene.N || approach < scene.N.approach) {
          const x = bird.x + bird.vx * approach;
          scene.N = { bird, approach, x, y: scene.by(bird, x, scene.U + approach) };
        }
        if (contact) snagged = true;
      }
      scene.bd = scene.bd.filter(bird => bird.x > -55 && bird.x < width + 55);
      return snagged;
    }

    flap(x, age) {
      return mathSin(age * 8 + x * 0.01) * 10;
    }

    by(bird, x, age) {
      return bird.baseY + mathSin(age * 2 + x * 0.012) * 17;
    }

    pop(x, y, points, color, size) {
      const popup = arcadeText(this, x, y, typeof points === 'number' ? '+' + points + pointUnit : points, size, color,
        { stroke: '#163149', strokeThickness: 4 }).z(1);
      this.tweens.add({ targets: popup, y: y - 38, alpha: 0, scale: 1.25, duration: 950,
        onComplete: () => popup.destroy() });
    }

    ck({ kite, x, y }) {
      kite.gone = true;
      const end = this.z10(kite);
      this.ls.push({
        ...kite, time: 1.65, vx: kite.vx * 0.72, vy: -48,
        cutX: x, cutY: y, tailX: x - kite.x, tailY: y - kite.y - 20, end
      });
      this.Q++;
      const gold = kite.color === goldInk;
      const points = gold ? 250 : 100;
      this.cp += points;
      this.pop(clamp(x, 70, 730), mathMax(183, y - 14), points,
        gold ? '#ffdc78' : '#fff9ec', gold ? 25 : 20);
      blip(2300, 260, 0.047, 0.074);
      blip(275, 1100, 0.34, 0.047, triangleWave, 0.035);
      this.q16 = mathMin(16, this.q16 + (gold ? 3.4 : 1.9));
    }

    update(_, delta) {
      const scene = this;
      if (!scene.J) updateMusic();
      const dt = mathMin(delta, 50) / 1000;
      if (scene.st === guideState) {
        if (scene.i === 3) { if (!scene.fr) scene.kg(dt); }
        else {
          if (!scene.fr) scene.q9 += dt;
          lesson(scene.q6.cl(), scene.i, scene.q9);
          teachPoints(this, scene.i);
        }
      }
      if (scene.z5 && scene.st === playState && scene.W(up, downButton) < 0) scene.z5 = false;
      if (scene.st === playState && !scene.z5) {
        scene.U += dt;
        const dx = scene.W(left, right), dy = scene.W(up, downButton);
        if (scene.i === 1) {
          scene.z6 += dt;
          while (scene.z6 >= 1 / 120 && scene.st === playState) {
            const aim = scene.B === 0 ? dx : scene.W('P2_L', 'P2_R');
            scene.Y(1 / 120, aim, scene.B === 0 ? dy : scene.W('P2_U', 'P2_D'));
            scene.z6 -= 1 / 120;
          }
          for (const puff of scene.z8) {
            puff.x += puff.vx * dt;
            puff.y += puff.vy * dt;
            puff.F -= dt;
          }
          scene.z8 = scene.z8.filter(puff => puff.F > 0);
        }
        if (scene.i === 2) scene.Z(dt);
        if (scene.i === 3) scene.r4(dt, dx, dy);
      }
      scene.draw();
      drawParty.call(this);
    }

    draw() {
      const scene = this;
      scene.bon.v(false);
      const g = scene.art.cl();
      paintNavy(g);
      g.c(chileRed).b(0, 582, width, 18);
      if (scene.st === 'prefs') return gameHeader(g, -1);
      if (scene.st === patioState) {
        bunting(g, 50, 122, 14, 50);
        g.c(0x986841).b(56, 506, 5, 63).b(156, 506, 5, 63);
        vaso(g, 93, 523, chileRed);
        vaso(g, 125, 523, chileBlue);
        g.c(0x744d35).b(56, 548, 105, 19);
        g.c(0xdda35f).b(52, 544, 113, 6);
        g.c(0x796743).tri(48, 511, 108, 477, 168, 511);
        for (let i = 1; i < 6; i++)
          g.p(1, 0xc6a066).l(108, 481, 48 + i * 20, 511);
        g.c(0xc99a6c).b(206, 491, 3, 77);
        flag(g, 209, 492, 32);
        // Huaso: wide straw chupalla and a striped manta.
        g.c(0x554039).b(568, 541, 22, 25);
        g.c(chileRed).rb(559, 519, 40, 29, 6);
        g.c(0xffcb85).b(559, 529, 40, 4).b(559, 537, 40, 3)
          .dot(579, 511, 11);
        g.c(0xc6a066).rb(568, 487, 22, 16, 4).e(579, 502, 48, 9);
        g.c(0x606572).b(631, 533, 6, 34).b(728, 533, 6, 34);
        g.c(0x39353a).rb(622, 508, 121, 34, 6);
        g.c(0x241f24).b(629, 515, 107, 17);
        for (let i = 0; i < 8; i++)
          g.c(i % 2 ? 0xf05a30 : goldInk).dot(635 + i * 13, 526, 2.5)
            .p(1, 0x92949b).l(632 + i * 14, 513, 632 + i * 14, 534);
        for (let i = 0; i < 3; i++) {
          const skewer = 641 + i * 35;
          const rise = reducedMotion() ? 0.5 : (scene.time.now / 1800 + i / 3) % 1;
          g.c(creamInk, 0.14 * (1 - rise)).e(skewer + 8 + mathSin(rise * 8 + i) * 3, 501 - rise * 19, 7 + rise * 8, 3 + rise * 5);
          g.p(2, 0xffd496).l(skewer, 537, skewer + 10, 504);
          for (let j = 0; j < 3; j++) {
            g.c(j === 1 ? 0xd9b18b : 0x8f3d28)
              .rb(skewer + 7 - j * 3, 508 + j * 7, 12, 6, 2);
          }
        }
        games.forEach(([name, , color], i) => {
          const x = 50 + i % 2 * 360, y = 157 + mathFloor(i / 2) * 158;
          const selected = i === scene.i;
          g.p(selected ? 3 : 1, selected ? goldInk : 0x647b9c).edge(x, y, 340, 139, 18);
          g.c(i % 2 ? 0x397fa0 : 0x986646).rb(x + 10, y + 20, 104, 100, 14)
            .c(i === 3 ? 0x526d89 : i === 1 ? 0xb77a52 : 0xb07851).e(x + 62, y + 109, 104, 22);
          icon(g, i, x + 62, y + 70, color, selected && !reducedMotion() ? (scene.time.now - scene.pv) / 1000 : 1);
          scene.cds[i][2].t('RÉCORD ' + scene.rec[i]);
          scene.cds[i][0].t(name).fg(selected ? '#ffdf85' : ink);
        });
      } else if (scene.i === 1) scene.dr(g);
      else if (scene.i === 2) scene.dt(g);
      else if (scene.i === 3) scene.dk(g);
      if (scene.st === patioState) {
        g.c(0x461b25).rb(24, 10, 752, 102, 18).c(0x941f32).rb(30, 16, 740, 90, 14);
        g.p(3, goldInk).edge(24, 10, 752, 102, 18);
        for (let x = 48; x < 760; x += 50) for (const y of [20, 104])
          g.c(goldInk, 0.3).dot(x, y, 6).c(creamInk).dot(x, y, 2.5);
        flag(g, 64, 38, 72);
        g.c(chileRed).dot(709, 62, 20).c(creamInk).dot(709, 62, 14).c(chileBlue).dot(709, 62, 8);
      } else gameHeader(g, scene.i);
    }

    dr(g) {
      const scene = this;
      const { fly, C: rest, B: turn, md: mode } = this;
      g.c(0x8bb5ce).b(0, 122, width, 95);
      mountains(g, 217, 0x597992);
      g.c(0xb77a52).b(0, 217, width, 309);
      for (let row = 0; row < 8; row++) for (let i = 0; i < 5 + row * 2; i++) {
        const scale = 0.35 + row * 0.1, x = 400 + (i - 2 - row) * (48 + row * 8) + (i * 7 + row * 3) % 9 - 4,
          y = 217 + row * 8 + mathAbs(x - 400) * 0.07,
          top = y - (43 + i * 7 % 17) * scale, lean = ((i + row) % 3 - 1) * 7 * scale;
        if (x < -40 || x > 840) continue;
        g.c(0x896343, 0.6).e(x, y, 30 * scale, 6);
        g.p(2 * scale, 0x644b31).l(x, y, x + lean, top + 8).l(x + lean, top + 8, x - 16 * scale, top);
        g.c((i + row) % 2 ? 0x48633a : 0x597646)
          .e(x - 12 * scale, top, (30 + i % 3 * 5) * scale, 17 * scale)
          .e(x + 14 * scale, top + 3, 29 * scale, 15 * scale);
        for (let berry = 0; berry < 6 + i % 3; berry++)
          g.c(i % 4 ? 0x624565 : 0x9d9d4b).dot(x + (9 + berry % 2 * 6) * scale, top + (12 + mathFloor(berry / 2) * 6) * scale, 4 * scale);
      }
      vaso(g, 72, 469, chileRed);
      vaso(g, 723, 469, chileBlue);
      const ground = (x, y) => ({ x: rayX(x, y), y: rayY(y) });
      g.c(0x633729).poly([ground(266, 185), ground(534, 185), ground(534, 357), ground(266, 357)], true);
      g.c(0x42291e).poly([ground(266, 357), ground(534, 357), ground(534, 370), ground(266, 370)], true);
      g.c(0x98765b).poly([ground(280, 200), ground(520, 200), ground(520, 344), ground(280, 344)], true);
      for (let i = 0; i < 35; i++) {
        const y = 207 + i * 3.8, x = 285 + (i * 47 % 228);
        g.c(i % 2 ? 0xb29879 : 0x73563f, 0.6).e(rayX(x, y), rayY(y), 6, 2);
      }
      g.p(2, 0xffe9bb).l(rayX(280, boxY), rayY(boxY), rayX(520, boxY), rayY(boxY));
      const shot = fly || rest;
      if (!shot && scene.st === playState) {
        const aim = scene.T ? rayLanding(scene.ay, scene.z2) : scene.ay;
        const tgt = rayX(scene.x, aim);
        g.p(2, 0xffe7ab, 0.65).l(400, 478, tgt, rayY(aim));
        g.r(tgt, rayY(aim), 9).l(tgt - 14, rayY(aim), tgt + 14, rayY(aim));
        g.c(0x513629).rb(310, 501, 180, 10, 5);
        g.c(0xffca72).b(310, 501, 180 * powerAt(scene.z2), 10);
      }
      for (const mark of scene.z12) {
        g.c(0x5e392d, mark.str * 0.46).e(rayX(mark.x, mark.y), rayY(mark.y), 24, 9);
        g.p(1, 0xf7b882, mark.str * 0.52).rim(rayX(mark.x, mark.y), rayY(mark.y) + 2, 24, 9);
      }
      for (const puff of scene.z8) {
        const size = 11 + (0.8 - puff.F) * 25;
        g.c(0xf2bf89, puff.F * 0.55).e(rayX(puff.x, puff.y), rayY(puff.y), size, size * 0.65);
      }
      for (const disc of [...scene.ds, shot || { x: 400, y: 478, M: turn }]) {
        // Project the endpoints once conceptually, then advance linearly between them.
        const end = disc.ly;
        const x = rayX(disc.x, end || disc.y);
        const groundY = end ? 478 + (rayY(end) - 478) * (disc.y - 478) / (end - 478) : rayY(disc.y);
        const y = groundY - (disc.z ?? 0) * (end ? 0.9 : 0.58);
        const scale = 0.45 + (groundY - 185) / 500;
        tejoArt(g, x, y, scale, playerColors[disc.M], groundY);
      }
    }

    dt(g) {
      const { rk: rocks, rg: rings, V: tops } = this;
      g.c(0x986646).b(0, 122, width, 404);
      for (let i = 0; i < 90; i++)
        g.c(i % 2 ? 0xb07851 : 0x875839, 0.5)
          .e(i * 83 % 800, 160 + i * 47 % 350, 4 + i % 7, 2 + i % 3);
      for (const x of [51, 749]) for (let y = 185; y < 450; y += 75)
        g.p(3, 0x617747).l(x, y, x - 7, y - 12).l(x, y, x + 6, y - 16);
      g.p(3, 0xc69a6a).l(55, 190, 55, 300);
      flag(g, 55, 192, 48);
      g.c(0x69472f).b(698, 282, 7, 36).b(764, 282, 7, 36).rb(690, 275, 88, 8, 3);
      g.c(0xdcb568).e(734, 268, 62, 13).rb(718, 247, 32, 22, 7);
      g.c(chileRed).b(719, 261, 30, 5);
      vaso(g, 64, 434, chileRed);
      vaso(g, 737, 434, chileBlue);
      g.p(2, creamInk, 0.3).edge(137, 152, 526, 345, 30);
      for (const [x, y, mud] of rocks) {
        if (mud) mudPatch(g, x, y, 74);
        else stone(g, x, y);
      }
      for (const ring of rings) {
        if (ring.F === undefined) {
          g.p(4, 0xffd76c).rim(ring.x, ring.y, 30, 20);
        } else {
          const alpha = ring.F < 1 ? 0.65 + 0.35 * mathCos(ring.F * 4 * pi) : 1;
          g.c(0x173247).e(ring.x, ring.y, 53, 37);
          g.p(4, cyanInk, alpha).rim(ring.x, ring.y, 49, 33)
            .rim(ring.x, ring.y, 33, 20);
          if (this.st === playState) this.bon.xy(ring.x, ring.y - 30).v(true);
        }
      }
      tops.forEach((top, i) => topArt(g, top, i));
    }

    dk(g) {
      const scene = this;
      const { U: age, R: line } = this;
      g.c(0x397fa0).b(0, 122, width, 404);
      for (let i = 0; i < 7; i++) {
        const x = ((i * 135 + age * (13 + i)) % 890) - 45;
        g.c(0xd8eff2, 0.23).e(x, 160 + i * 52, 100, 18);
      }
      mountains(g, 525, 0x486b83);
      g.p(2, 0xb7d9e8, 0.7).strokeRect(12, 158, 776, 364);
      for (let i = 0; i < 24; i++) {
        const x = 20 + i * 32;
        g.p(2, 0xb7d9e8, 0.5).l(x, 158, x + 7, 165);
        g.l(x, 515, x + 7, 522);
      }
      for (const kite of scene.ks) {
        const end = scene.z10(kite);
        g.p(kite.red ? 2.5 : 1.5, kite.red ? 0xff9298 : creamInk, 0.9)
          .l(kite.x, kite.y + 20, end.x, end.y);
        if (kite.red) {
          g.p(1.5, 0xffafb4, 0.8).r(kite.x, kite.y, redRadius);
        }
        kiteArt(g, kite.x, kite.y, kite.color);
      }
      for (const kite of scene.ls) {
        const elapsed = 1.65 - kite.time;
        const alpha = mathMin(1, kite.time * 2.5);
        const kick = mathMax(0, 1 - elapsed * 3.4);
        if (kick > 0) {
          g.p(1.5, creamInk, kick).l(kite.end.x, kite.end.y,
            kite.end.x + (kite.cutX - kite.end.x) * kick, kite.end.y + (kite.cutY - kite.end.y) * kick);
          g.p(2, 0xffde84, kick).r(kite.cutX, kite.cutY, 3 + elapsed * 57);
        }
        g.p(1.5, creamInk, alpha).l(kite.x, kite.y + 20,
          kite.x + kite.tailX * 0.45 + mathSin(elapsed * 18) * 8,
          kite.y + 20 + kite.tailY * 0.45);
        kiteArt(g, kite.x, kite.y, kite.color, alpha);
      }
      if (scene.q8) {
        g.p(2, 0xffdf89).r(scene.q8.x, scene.q8.y, 9);
        g.l(scene.x, scene.y, scene.q8.x, scene.q8.y);
        g.c(0xffdf89).b(scene.x - 18, scene.y + 26, 36 * scene.ca / autoCutTime, 3);
      }
      if (scene.q17) dangerRing(g, scene.x, scene.y, 29, scene.rh / redCutTime);
      const thread = scene.X();
      g.p(1.7, 0xb7eeff, 0.92);
      for (let i = 1; i < thread.length; i++) {
        g.l(thread[i - 1].x, thread[i - 1].y, thread[i].x, thread[i].y);
      }
      if (scene.N) {
        const { bird, x, y } = scene.N;
        g.p(2, 0xffd481, 0.8).l(bird.x, bird.y, x, y);
        g.r(x, y, 12);
        g.r(bird.x, bird.y, 28);
      }
      for (const bird of scene.bd) {
        const { x, y } = bird;
        const flap = scene.flap(x, age);
        g.c(0x17283b).tri(x - 34, y - 7 + flap, x - 6, y - 5, x, y + 8);
        g.tri(x + 34, y - 7 + flap, x + 6, y - 5, x, y + 8);
        g.e(x, y + 1, 19, 11);
        g.c(chileWhite).e(x + mathSign(bird.vx) * 7, y, 6, 5);
      }
      kiteArt(g, scene.x, scene.y, scene.md === 2 && scene.B ? playerColors[1] : chileBlue);
      if (scene.gl.visible) {
        g.c(chileNavy).rb(173, 129, 454, 28, 6);
        g.c(chileWhite).b(183, 153, 80 * line, 3);
      }
    }


  }

  function kiteArt(g, x, y, color, alpha = 1, scale = 1) {
    const half = 18 * scale, high = 21 * scale, low = 22 * scale;
      g.c(color, alpha).tri(x, y - high, x - half, y, x, y + low);
      g.c(color === chileBlue ? chileWhite : color, 0.87 * alpha)
        .tri(x, y - high, x + half, y, x, y + low);
      if (color === chileBlue) {
        g.c(chileRed, alpha).tri(x - half, y, x + half, y, x, y + low);
        star(g, x - 6 * scale, y - 8 * scale, 3 * scale);
      }
      g.p(1, 0x233e54, alpha).l(x - half, y, x + half, y);
      g.l(x, y - high, x, y + low);
    }

  class Scores extends Phaser.Scene {
    constructor() { super(scoresScene); }

    create({ game, points, kiteLoss }) {
      const scene = this;
      scene.i = game;
      scene.j = points;
      scene.z15 = [0, 0, 0];
      scene.z3 = 0;
      scene.sv = true;
      scene.o = kiteLoss;
      scene.uf = graphics(this);
      const label = (x, y, size, origin = 0.5) =>
        arcadeText(this, x, y, '', size, ink, { lineSpacing: 13 }).a(origin, 0.5);
      scene.z0 = label(38, 20, 28).a(0, 0);
      scene.name = label(38, 78, 17, 0).a(0, 0);
      scene.bdy = label(400, 312, 27);
      scene.q10 = label(223, 541, 16);
      scene.rw = Array.from({ length: 6 }, (_, i) => [
        label(200, 182 + i * 54, i ? 23 : 15, 0),
        label(395, 182 + i * 54, i ? 23 : 15),
        label(595, 182 + i * 54, i ? 23 : 15, 1)
      ]);
      scene.sb = arcadeLink(this, 475, 541, 'GUARDAR · ' + (prefs[0] ? 'U/R' : 'B1'), () => scene.submit());
      arcadeLink(this, 689, 556, patioLabel, () => scene.back(), true);
      scene.G = undefined;
      scene.v();
      bindControls(this, button => {
        if (scene.sv) return;
        button = button.replace('P2_', 'P1_');
        if (button === backButton) {
          scene.back();
        } else if (scene.j !== undefined) {
          if (button === left) scene.z3 = (scene.z3 + 2) % 3;
          if (button === right) scene.z3 = (scene.z3 + 1) % 3;
          if (button === up) scene.z15[scene.z3] = (scene.z15[scene.z3] + 1) % 26;
          if (button === downButton) scene.z15[scene.z3] = (scene.z15[scene.z3] + 25) % 26;
          if (confirmButton(button)) scene.submit();
          else scene.v();
        } else {
          if (button === left) scene.i = (scene.i + 3) % 4;
          if (button === right) scene.i = (scene.i + 1) % 4;
          scene.v();
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
      const g = scene.uf.cl();
      const [, accent] = headerThemes[scene.i];
      paintNavy(g);
      gameHeader(g, scene.i);
      g.p(2, accent, 0.6).l(169, 207, 631, 207);
      g.c(chileRed).b(0, 582, width, 18);
      scene.name.t(games[scene.i][0]);
      scene.rw.flat().forEach(label => label.v(!entering));
      scene.bdy.v(entering);
      scene.sb.v(entering);
      if (entering) {
        const record = scene.j > arcadeRecords[scene.i];
        scene.z0.t(record ? '¡NUEVO RÉCORD! · ¡UYUUUUUI!' : '¡TOP 5!');
        scene.bdy.t((scene.o ? scene.o + '\n' : '') + scene.j + ' PTS\n\n' + scene.z15.map((letter, i) => {
          const character = String.fromCharCode(65 + letter);
          return i === scene.z3 ? '[' + character + ']' : ' ' + character + ' ';
        }).join(' ') + '\n\nINICIALES');
        scene.q10.t('←→ Casilla · ↑↓ Letra');
      } else {
        scene.z0.t('TABLA DE RÉCORDS');
        const rows = tables[scene.i];
        scene.rw[0].forEach((label, i) => label.t(['PUESTO', 'INICIALES', 'PUNTOS'][i]));
        for (let i = 0; i < 5; i++) {
          const row = rows[i];
          g.p(1, accent, 0.2).l(169, 258 + i * 54, 631, 258 + i * 54);
          if (row && i === 0) g.c(accent).b(169, 220, 3, 31);
          const values = [String(i + 1).padStart(2, '0'), row?.name ?? '—', row ? String(row.points) : '—'];
          scene.rw[i + 1].forEach((label, j) => {
            label.t(values[j]);
            if (j === 2) label.f(values[j].length > 10 ? 17 : 23);
          });
        }
        scene.q10.t('←→ Juego');
      }
    }

    async submit() {
      const scene = this;
      if (scene.sv || scene.j === undefined) return;
      scene.sv = true;
      confirmSound();
      const name = String.fromCharCode(...scene.z15.map(letter => 65 + letter));
      const saved = await saveScore(scene.i, name, scene.j);
      scene.j = undefined;
      scene.fx.cl();
      scene.G = undefined;
      scene.sv = false;
      scene.v();
      if (!saved) scene.q10.t('SOLO ESTA SESIÓN');
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
      this.cfg();
      this.bb.xy(650, 556);
    }
    home() {
      const parent = this.pg;
      if(parent.st===patioState) parent.r5();
      guideKeys(parent, parent.ph === 'end' ? undefined : parent.i ?? 0, parent.st === playState || parent.ph && parent.ph !== 'menu');
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
