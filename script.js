/* Capri website — sprites, lightning, chat demo, party mode */
(() => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- SPRITES ---------------- */
  const ANIMS = {
    idle:   { frames: [[0, 0], [96, 0]], fps: 2 },
    walk:   { frames: [[192, 0], [288, 0], [384, 0], [480, 0]], fps: 8 },
    charge: { frames: [[576, 0], [0, 0]], fps: 3 },
    held:   { frames: [[672, 0]], fps: 1 },
    cast:   { frames: [[0, 100], [96, 0]], fps: 2 },
    lounge: { frames: [0, 1, 2, 3, 4, 5, 6, 7].map(i => [i * 104, 0]), fps: 5 },
    d:      { frames: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [64, 0]], fps: 4 },
  };
  const setFrame = (el, [x, y]) => {
    el.style.backgroundPosition = `calc(${-x}px * var(--s)) calc(${-y}px * var(--s))`;
  };
  const sprites = [...document.querySelectorAll(".sprite[data-anim]")].map(el => ({ el, t: Math.random() * 4, override: null }));
  sprites.forEach(s => setFrame(s.el, ANIMS[s.el.dataset.anim].frames[0]));

  // D: click to poke (spiked hair)
  document.querySelectorAll(".sprite.d").forEach(el => {
    el.parentElement.style.cursor = "pointer";
    el.parentElement.addEventListener("click", () => {
      const s = sprites.find(s => s.el === el);
      s.override = { frame: [128, 0], until: performance.now() + 900 };
      zapAt(el);
    });
  });

  /* ---------------- LIGHTNING CANVAS ---------------- */
  const cv = document.getElementById("sky");
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, DPR = Math.min(devicePixelRatio || 1, 2);
  const resize = () => {
    W = innerWidth; H = innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  };
  resize(); addEventListener("resize", resize);

  const bolts = [];
  const sparks = [];
  const COLORS = ["#ff2a6d", "#ff2a6d", "#ff2e9a", "#ff2a6d", "#9b5cff", "#ff2a6d", "#5ee0ff"];

  function boltPath(x1, y1, x2, y2, rough) {
    let pts = [[x1, y1], [x2, y2]];
    let d = rough;
    for (let i = 0; i < 6; i++) {
      const next = [pts[0]];
      for (let j = 0; j < pts.length - 1; j++) {
        const [ax, ay] = pts[j], [bx, by] = pts[j + 1];
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        const nx = -(by - ay), ny = bx - ax, len = Math.hypot(nx, ny) || 1;
        const off = (Math.random() - 0.5) * d;
        next.push([mx + (nx / len) * off, my + (ny / len) * off], pts[j + 1]);
      }
      pts = next; d *= 0.55;
    }
    return pts;
  }

  function strike(x1, y1, x2, y2, opts = {}) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const main = boltPath(x1, y1, x2, y2, len * 0.35);
    const branches = [];
    const nb = opts.branches ?? 3;
    for (let i = 0; i < nb; i++) {
      const p = main[Math.floor(main.length * (0.2 + Math.random() * 0.6))];
      const ang = Math.atan2(y2 - y1, x2 - x1) + (Math.random() - 0.5) * 1.8;
      const bl = len * (0.15 + Math.random() * 0.3);
      branches.push(boltPath(p[0], p[1], p[0] + Math.cos(ang) * bl, p[1] + Math.sin(ang) * bl, bl * 0.4));
    }
    bolts.push({
      paths: [main, ...branches], born: performance.now(), life: opts.life ?? 380,
      color: opts.color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
      width: opts.width ?? 2.4,
    });
    if (opts.sparks !== false) burst(x2, y2, opts.sparkCount ?? 18);
  }

  function burst(x, y, n, colors) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 6;
      sparks.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 1,
        size: 2 + Math.random() * 3,
        color: colors ? colors[i % colors.length] : (Math.random() < 0.7 ? "#ff2a6d" : "#ffb3d1"),
      });
    }
  }

  function drawPath(p) {
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.stroke();
  }

  function render(now) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      const k = 1 - (now - b.born) / b.life;
      if (k <= 0) { bolts.splice(i, 1); continue; }
      const flick = k * (0.6 + Math.random() * 0.4);
      ctx.globalAlpha = flick;
      ctx.shadowColor = b.color; ctx.shadowBlur = 28;
      ctx.strokeStyle = b.color; ctx.lineWidth = b.width * 3.5;
      b.paths.forEach((p, j) => { ctx.lineWidth = (j ? 0.5 : 1) * b.width * 3.5; drawPath(p); });
      ctx.shadowBlur = 8; ctx.strokeStyle = "#fff";
      b.paths.forEach((p, j) => { ctx.lineWidth = (j ? 0.5 : 1) * b.width * 0.8; drawPath(p); });
    }
    ctx.shadowBlur = 0;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx; s.y += s.vy; s.vy += 0.18; s.vx *= 0.97; s.life -= 0.022;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.globalAlpha = s.life; ctx.fillStyle = s.color;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
    }
    ctx.globalAlpha = 1;
  }

  const flashEl = document.querySelector(".flash");
  const flash = () => { flashEl.classList.remove("on"); void flashEl.offsetWidth; flashEl.classList.add("on"); };

  function zapAt(el, big) {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height * 0.4;
    strike(x + (Math.random() - 0.5) * 200, -10, x, y, { width: big ? 3.4 : 2.4, branches: 4, sparkCount: 28 });
    if (big) flash();
  }

  // click anywhere (outside buttons/links) = lightning strike
  addEventListener("click", e => {
    if (e.target.closest("a, button, .move-stage")) return;
    strike(e.clientX + (Math.random() - 0.5) * 160, -10, e.clientX, e.clientY, { branches: 3 });
  });

  // cursor sparks
  let lastSpark = 0;
  addEventListener("pointermove", e => {
    const now = performance.now();
    if (now - lastSpark > 45 && !reduceMotion) {
      lastSpark = now;
      sparks.push({ x: e.clientX, y: e.clientY, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 1.5, life: 0.8, size: 2, color: Math.random() < .5 ? "#ff2a6d" : "#ffb3d1" });
    }
  });

  // power cards: glow follows mouse
  document.querySelectorAll(".card").forEach(c => c.addEventListener("pointermove", e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", `${e.clientX - r.left}px`);
    c.style.setProperty("--my", `${e.clientY - r.top}px`);
  }));

  // move cards: zap on hover
  document.querySelectorAll(".move").forEach(m => m.addEventListener("pointerenter", () => zapAt(m.querySelector(".sprite"))));

  /* ---------------- HERO CAPRI ---------------- */
  const hero = document.getElementById("capriHero");
  const heroSprite = hero.querySelector(".sprite");
  const speech = document.getElementById("heroSpeech");
  const pokeLines = [
    "hi! ⚡", "that tickles", "bzzt!", "need something?", "I can open apps, y'know",
    "pink lightning, baby", "careful, I'm charged", "say \"High Forever\"!", "boop received",
  ];
  const annoyedLines = ["HEY. stop poking.", "I WILL zap your mouse", "...rude ⚡"];
  let pokes = [], lineI = 0;
  const say = txt => { speech.textContent = txt; speech.classList.remove("pop"); void speech.offsetWidth; speech.classList.add("pop"); };

  hero.addEventListener("click", () => {
    const now = performance.now();
    pokes = pokes.filter(t => now - t < 4000); pokes.push(now);
    const annoyed = pokes.length >= 5;
    const s = sprites.find(s => s.el === heroSprite);
    s.override = { frame: annoyed ? [672, 0] : [576, 0], until: now + 700 };
    if (annoyed) heroSprite.style.filter = "sepia(1) saturate(9) hue-rotate(-50deg)";
    setTimeout(() => (heroSprite.style.filter = ""), 700);
    hero.classList.remove("zapped"); void hero.offsetWidth; hero.classList.add("zapped");
    zapAt(heroSprite, annoyed);
    say(annoyed ? annoyedLines[Math.floor(Math.random() * annoyedLines.length)] : pokeLines[lineI++ % pokeLines.length]);
  });

  // intro: pixels gather, then a lightning strike
  setTimeout(() => { zapAt(heroSprite, true); }, 500);

  /* ---------------- CHAT DEMO ---------------- */
  const term = document.getElementById("term");
  const convo = [
    ["you", "Open YouTube and search for lofi music"],
    ["capri", "On it! Opening YouTube… lofi incoming ♪"],
    ["you", "Remind me at 8 pm to call mom"],
    ["capri", "Added to your to-do list. I'll ring the bell at 20:00 ⚡"],
    ["you", "Move the PDFs on my Desktop into a folder called Papers"],
    ["capri", "Found 6 PDFs. Want me to move them?"],
    ["ask", ""],
    ["you", "High Forever!"],
    ["capri", "PARTY TIME!! ⚡⚡⚡"],
  ];
  let termRunning = false;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function runTerm() {
    if (termRunning) return; termRunning = true;
    while (true) {
      term.innerHTML = "";
      for (const [who, text] of convo) {
        const m = document.createElement("div");
        m.className = `msg ${who}`;
        if (who === "ask") {
          m.innerHTML = "<span>Yes, do it</span><span>No</span><span>Always allow</span>";
          term.appendChild(m); await wait(1400); continue;
        }
        term.appendChild(m);
        if (who === "you") {
          m.classList.add("caret");
          for (const ch of text) { m.textContent += ch; await wait(28 + Math.random() * 40); }
          m.classList.remove("caret"); await wait(500);
        } else {
          m.textContent = "…"; await wait(650);
          m.textContent = text; await wait(1300);
        }
        while (term.children.length > 6) term.firstChild.remove();
      }
      await wait(2500);
    }
  }

  /* ---------------- REVEAL ON SCROLL ---------------- */
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add("in");
    if (en.target.classList.contains("terminal")) runTerm();
    io.unobserve(en.target);
  }), { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    io.observe(el);
  });

  /* ---------------- ROAD TRIP ---------------- */
  const car = document.getElementById("car"), rider = document.getElementById("rider");
  const carFrames = [[0, 0], [244, 0], [488, 0], [732, 0], [0, 56], [244, 56], [488, 56], [732, 56]];
  const riderFrames = [[0, 112], [150, 112], [300, 112], [450, 112], [0, 222], [150, 222]];
  const pos = (el, [x, y]) => (el.style.backgroundPosition = `calc(${-x}px * 2.4) calc(${-y}px * 2.4)`);
  let roadVisible = false;
  new IntersectionObserver(([e]) => (roadVisible = e.isIntersecting)).observe(document.getElementById("road"));

  /* ---------------- PARTY MODE ---------------- */
  const partyBtn = document.getElementById("partyBtn");
  const stopBtn = document.getElementById("stopParty");
  let audio = null, partyOn = false, beatTimer = null, beatN = 0;

  function makeAudio() {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    const noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return { ac, master, noiseBuf };
  }
  function kick(t) {
    const { ac, master } = audio;
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.4);
  }
  function hat(t, open) {
    const { ac, master, noiseBuf } = audio;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = "highpass"; f.frequency.value = 8000;
    g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.2 : 0.05));
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + 0.25);
  }
  function clap(t) {
    const { ac, master, noiseBuf } = audio;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = "bandpass"; f.frequency.value = 1500;
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + 0.2);
  }
  const BASS = [55, 55, 65.4, 55, 73.4, 55, 82.4, 65.4];
  function bass(t, f) {
    const { ac, master } = audio;
    const o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
    o.type = "sawtooth"; o.frequency.value = f;
    fl.type = "lowpass"; fl.frequency.setValueAtTime(1600, t); fl.frequency.exponentialRampToValueAtTime(200, t + 0.2);
    g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(fl).connect(g).connect(master); o.start(t); o.stop(t + 0.25);
  }

  const BPM = 128, STEP = 60 / BPM / 2; // eighth notes
  function scheduleStep() {
    const t = audio.ac.currentTime + 0.05;
    const n = beatN++;
    if (n % 2 === 0) { kick(t); onBeat(n); }
    hat(t, n % 4 === 3);
    if (n % 4 === 2) clap(t);
    bass(t + STEP / 2, BASS[(n >> 1) % BASS.length] * (n % 16 >= 12 ? 2 : 1));
  }

  const SHARD_COLORS = ["#ff2a6d", "#ffb3d1", "#9b5cff", "#5ee0ff", "#2eff8c", "#fff"];
  function onBeat(n) {
    flash();
    const x = Math.random() * W, y = H * (0.3 + Math.random() * 0.6);
    strike(x + (Math.random() - 0.5) * 200, -10, x, y, { width: 3, branches: 4, sparkCount: 30, life: 300 });
    if (n % 8 === 0) {
      for (let i = 0; i < 26; i++) shard();
      strike(0, Math.random() * H, W, Math.random() * H, { width: 3.4, branches: 6, sparks: false });
    }
  }
  function shard() {
    const el = document.createElement("div");
    el.className = "shard";
    el.style.background = SHARD_COLORS[Math.floor(Math.random() * SHARD_COLORS.length)];
    el.style.left = `${Math.random() * 100}vw`; el.style.top = "-20px";
    document.body.appendChild(el);
    const dx = (Math.random() - 0.5) * 300, rot = (Math.random() - 0.5) * 1080;
    el.animate([{ transform: "translate(0,0) rotate(0)" }, { transform: `translate(${dx}px, ${H + 60}px) rotate(${rot}deg)` }],
      { duration: 1800 + Math.random() * 1600, easing: "cubic-bezier(.2,.6,.4,1)" }).onfinish = () => el.remove();
  }

  function startParty() {
    if (partyOn) return;
    partyOn = true;
    audio = audio || makeAudio();
    audio.ac.resume();
    beatN = 0; scheduleStep();
    beatTimer = setInterval(scheduleStep, STEP * 1000);
    document.body.classList.add("party-on");
    stopBtn.hidden = false;
    partyBtn.textContent = "Stop the party ■";
    say("HIGH FOREVER!! ⚡");
  }
  function stopParty() {
    if (!partyOn) return;
    partyOn = false;
    clearInterval(beatTimer);
    document.body.classList.remove("party-on");
    stopBtn.hidden = true;
    partyBtn.textContent = "Start the party ♪";
    say("phew… that was fun");
  }
  partyBtn.addEventListener("click", () => (partyOn ? stopParty() : startParty()));
  stopBtn.addEventListener("click", stopParty);
  addEventListener("keydown", e => { if (e.key === "Escape") stopParty(); });

  /* ---------------- MAIN LOOP ---------------- */
  let last = performance.now(), nextAmbient = last + 1800, carT = 0, riderT = 0, riderBlink = 0;
  function loop(now) {
    const dt = Math.max(0, Math.min(now - last, 100)) / 1000; last = now;

    for (const s of sprites) {
      if (s.override) {
        if (now < s.override.until) { setFrame(s.el, s.override.frame); continue; }
        s.override = null;
      }
      const a = ANIMS[s.el.dataset.anim];
      s.t += dt * a.fps * (partyOn ? 2 : 1);
      setFrame(s.el, a.frames[Math.floor(s.t) % a.frames.length]);
    }

    if (roadVisible) {
      carT += dt * 16; riderT += dt * 7;
      pos(car, carFrames[Math.floor(carT) % carFrames.length]);
      if (now > riderBlink && Math.random() < 0.004) riderBlink = now + 160;
      pos(rider, now < riderBlink ? [300, 222] : riderFrames[Math.floor(riderT) % riderFrames.length]);
    }

    // ambient lightning from the sky
    if (!reduceMotion && now > nextAmbient && !partyOn) {
      const x = Math.random() * W;
      strike(x, -10, x + (Math.random() - 0.5) * 300, H * (0.15 + Math.random() * 0.35), { width: 1.6, branches: 2, sparks: false, life: 300 });
      nextAmbient = now + 2200 + Math.random() * 4000;
    }

    render(now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
