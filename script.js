/* Lemba Studio: peeling poster teaser
   - Tears the poster edges (clip-path)
   - Curls the bottom-right corner; it breathes slowly, lifts as you
     move toward it, and lifts a lot when you click or tap (then falls back)
*/
(() => {
  "use strict";

  const sheet     = document.getElementById("sheet");
  const poster    = document.getElementById("poster");
  const flap      = document.getElementById("flap");
  const teaseText = document.getElementById("teaseText");
  const unders    = document.querySelectorAll(".torn");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Torn edges ---------- */

  // Small seeded random so the tear is the same on every load
  function rng(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // Jagged offset: big wobble + fine fibre
  function jag(rand, amp) {
    return (rand() * 0.7 + rand() * 0.3) * amp;
  }

  // Torn outline for the poster underneath (percent only)
  function tornPolygon(seed, amp = 1.6, steps = 70) {
    const rand = rng(seed);
    const pts = [];
    for (let i = 0; i <= steps; i++) pts.push(`${(i / steps) * 100}% ${jag(rand, amp)}%`);
    for (let i = 1; i <= steps; i++) pts.push(`${100 - jag(rand, amp)}% ${(i / steps) * 100}%`);
    for (let i = steps - 1; i >= 0; i--) pts.push(`${(i / steps) * 100}% ${100 - jag(rand, amp)}%`);
    for (let i = steps - 1; i > 0; i--) pts.push(`${jag(rand, amp)}% ${(i / steps) * 100}%`);
    return `polygon(${pts.join(",")})`;
  }

  unders.forEach((el) => {
    el.style.clipPath = tornPolygon(Number(el.dataset.seed) || 5);
  });

  // Poster edge offsets are generated once; only the peeled corner changes
  const N = 80;
  const edgeRand = rng(42);
  const top    = Array.from({ length: N + 1 }, () => jag(edgeRand, 1.1));
  const right  = Array.from({ length: N + 1 }, () => jag(edgeRand, 0.9));
  const bottom = Array.from({ length: N + 1 }, () => jag(edgeRand, 1.1));
  const left   = Array.from({ length: N + 1 }, () => jag(edgeRand, 0.9));

  function posterPolygon(peel) {
    const pts = [];
    const p = peel.toFixed(1);

    // top edge, left to right
    for (let i = 0; i <= N; i++) pts.push(`${(i / N) * 100}% ${top[i]}%`);

    // right edge, down to where the fold begins
    for (let i = 1; i < N; i++) {
      const t = i / N;
      pts.push(`${100 - right[i]}% calc((100% - ${p}px) * ${t.toFixed(4)})`);
    }
    pts.push(`100% calc(100% - ${p}px)`);

    // the fold (diagonal cut)
    pts.push(`calc(100% - ${p}px) 100%`);

    // bottom edge, right to left
    for (let i = N - 1; i >= 0; i--) {
      const t = i / N;
      pts.push(`calc((100% - ${p}px) * ${t.toFixed(4)}) ${100 - bottom[i]}%`);
    }

    // left edge, bottom to top
    for (let i = N - 1; i > 0; i--) pts.push(`${left[i]}% ${(i / N) * 100}%`);

    return `polygon(${pts.join(",")})`;
  }

  /* ---------- Peel ---------- */

  let width    = sheet.offsetWidth;
  let current  = 0;     // peel size in px right now
  let kick     = 0;     // extra lift from clicks, decays back to 0
  let pointer  = { x: -9999, y: -9999, active: false };
  let shiftX   = 0, shiftY = 0;

  function measure() { width = sheet.offsetWidth; }
  window.addEventListener("resize", measure, { passive: true });

  window.addEventListener("pointermove", (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
  }, { passive: true });

  document.addEventListener("pointerleave", () => { pointer.active = false; });

  // Click or tap: the corner lifts, but the answer is "not yet"
  let teaseTimer;
  sheet.addEventListener("click", () => {
    kick = width * 0.24;
    teaseText.textContent = "Not yet";
    clearTimeout(teaseTimer);
    teaseTimer = setTimeout(() => { teaseText.textContent = "Coming soon"; }, 1400);
    if (reduceMotion) requestAnimationFrame(frame);
  });

  function applyPeel(px) {
    poster.style.clipPath = posterPolygon(px);
    flap.style.width  = px + "px";
    flap.style.height = px + "px";
    flap.style.visibility = px < 2 ? "hidden" : "visible";
  }

  function frame(now) {
    const rect = sheet.getBoundingClientRect();

    // Resting size, with a slow breath
    const breath = reduceMotion ? 0.5 : (Math.sin(now / 1700) + 1) / 2;
    let target = width * (0.065 + 0.03 * breath);

    // Lift toward the pointer as it nears the bottom-right corner
    if (pointer.active) {
      const dx = rect.right - pointer.x;
      const dy = rect.bottom - pointer.y;
      const dist = Math.hypot(dx, dy);
      const prox = Math.max(0, 1 - dist / (width * 0.65));
      target += prox * prox * width * 0.2;

      // slide the posters underneath a touch
      const nx = (pointer.x / window.innerWidth) - 0.5;
      const ny = (pointer.y / window.innerHeight) - 0.5;
      shiftX += (nx * 2 - shiftX) * 0.06;
      shiftY += (ny * 2 - shiftY) * 0.06;
      sheet.style.setProperty("--shift-x", shiftX.toFixed(3));
      sheet.style.setProperty("--shift-y", shiftY.toFixed(3));
    }

    target += kick;
    kick *= 0.94;
    if (kick < 0.3) kick = 0;

    const next = current + (target - current) * 0.09;
    if (Math.abs(next - current) > 0.04 || current === 0) {
      current = next;
      applyPeel(current);
    }

    if (!reduceMotion || kick > 0) requestAnimationFrame(frame);
  }

  applyPeel(width * 0.07);
  requestAnimationFrame(frame);
})();
