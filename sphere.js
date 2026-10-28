/* sphere.js — "The Bay needs its artists": a kinetic word globe of artistic mediums.
   Words sit on latitude rings that turn at different speeds (equator fastest, like a
   gas planet) on an axis tilted like the Earth's; letters ripple like water; scrolling
   adds spin and throws sparks in proportion to scroll speed. Static under
   prefers-reduced-motion. Homepage only. */
(function () {
  'use strict';
  var host = document.getElementById('medium-sphere');
  if (!host) return;
  var WORDS = ['Dancers', 'Ceramicists', 'Musicians', 'Songwriters', 'Producers', 'Filmmakers', 'Actors', 'Poets', 'Writers',
    'Visual artists', 'Immersive artists', 'Muralists', 'Craft artists', 'Weavers', 'Fashion designers', 'Photographers',
    'Printmakers', 'Illustrators', 'Comedians', 'DJs', 'Sculptors', 'Painters', 'Animators', 'Performance artists',
    'Playwrights', 'Choreographers', 'Zinemakers', 'Puppeteers', 'Composers', 'Tattoo artists', 'Game designers', 'Drag artists',
    'Spoken word', 'Curators'];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPARK_COLORS = ['#f5c542', '#f4f1e8', '#0a0a0a', '#00d4aa', '#ff3b30'];
  var LATS = [-1.15, -0.78, -0.4, 0, 0.4, 0.78, 1.15];   // seven rings, radians from the equator
  var TILT_X = -0.32;                               // lean the top toward the viewer a little

  // --- build: words on rings, letters as spans ---
  var size = host.clientWidth || 400, R = size * 0.44;
  var stage = document.createElement('div'); stage.className = 'sphere-stage';
  var canvas = document.createElement('canvas'); canvas.className = 'sphere-sparks'; canvas.width = size * 2; canvas.height = size * 2;
  var ctx = canvas.getContext('2d'); ctx.scale(2, 2);
  host.appendChild(canvas); host.appendChild(stage);
  var rings = LATS.map(function (lat) { return { lat: lat, words: [], offset: Math.random() * 6.28, speed: 1 + 0.55 * Math.cos(lat) }; });
  WORDS.forEach(function (w, i) {
    var ring = rings[(i * 3 + (i % 4)) % rings.length];   // spread words over rings, mixing lengths
    var el = document.createElement('span'); el.className = 'sphere-word';
    var letters = [];
    for (var k = 0; k < w.length; k++) {
      var l = document.createElement('span'); l.className = 'sphere-letter'; l.textContent = w[k] === ' ' ? ' ' : w[k]; el.appendChild(l); letters.push(l);
    }
    stage.appendChild(el);
    ring.words.push({ el: el, letters: letters, phase: Math.random() * 6.28 });
  });
  rings.forEach(function (r) { r.words.forEach(function (w, i) { w.lon = (i / r.words.length) * Math.PI * 2; }); });

  // --- state ---
  var rotY = 0, vel = 0.0035, lastScroll = window.pageYOffset, lastT = performance.now(), t0 = lastT, sparks = [], running = false, visible = false;

  function render(now) {
    var tt = (now - t0) / 1000, cx = Math.cos(TILT_X), sx = Math.sin(TILT_X);
    for (var r = 0; r < rings.length; r++) {
      var ring = rings[r], cl = Math.cos(ring.lat), sl = Math.sin(ring.lat);
      for (var i = 0; i < ring.words.length; i++) {
        var w = ring.words[i];
        var lon = w.lon + rotY * ring.speed + ring.offset + (reduce ? 0 : Math.sin(tt * 0.7 + w.phase) * 0.06);
        var x = Math.cos(lon) * cl, z = Math.sin(lon) * cl, y = sl + (reduce ? 0 : Math.sin(tt * 1.3 + lon * 2) * 0.06);   // wave along the ring
        var y2 = y * cx - z * sx, z2 = y * sx + z * cx;                                  // tilt toward viewer
        var depth = (z2 + 1) / 2, scale = 0.5 + depth * 0.7;
        var fore = Math.max(0.28, Math.sqrt(Math.max(0, 1 - x * x)));                  // foreshorten toward the limb
        var rotZ = -x * y2 * 28;                                                        // follow the curve of the globe
        w.el.style.transform = 'translate(-50%,-50%) translate3d(' + (x * R).toFixed(1) + 'px,' + (y2 * R).toFixed(1) + 'px,0) rotate(' + rotZ.toFixed(1) + 'deg) scale(' + scale.toFixed(3) + ') scaleX(' + fore.toFixed(3) + ')';
        w.el.style.opacity = (0.14 + depth * 0.86).toFixed(2);
        w.el.style.zIndex = Math.round(depth * 100);
        if (!reduce && depth > 0.35) {                                                  // letters ripple like water on the visible side
          for (var k = 0; k < w.letters.length; k++) {
            var ph = tt * 4 + w.phase + k * 0.55;
            w.letters[k].style.transform = 'translateY(' + (Math.sin(ph) * 3).toFixed(1) + 'px) scaleY(' + (1 + Math.sin(ph + 1.2) * 0.14).toFixed(3) + ') skewX(' + (Math.sin(ph * 0.5) * 6).toFixed(1) + 'deg)';
          }
        }
      }
    }
  }

  function spawnSparks(n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3.5;
      sparks.push({ x: size / 2 + Math.cos(a) * R * 0.9, y: size / 2 + Math.sin(a) * R * 0.9, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
        life: 1, size: 2 + Math.random() * 3, color: SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0], star: Math.random() < 0.3 });
    }
    if (sparks.length > 160) sparks.splice(0, sparks.length - 160);
  }
  function drawSparks() {
    ctx.clearRect(0, 0, size, size);
    for (var i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i];
      s.x += s.vx; s.y += s.vy; s.vy += 0.06; s.life -= 0.022;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, s.life); ctx.fillStyle = s.color;
      if (s.star) {
        ctx.beginPath(); var rr = s.size * 1.6;
        for (var k = 0; k < 8; k++) { var q = k % 2 ? rr * 0.4 : rr, ang = k * Math.PI / 4; ctx.lineTo(s.x + Math.cos(ang) * q, s.y + Math.sin(ang) * q); }
        ctx.closePath(); ctx.fill();
      } else { ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size); }
    }
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    var dt = Math.min(48, t - lastT) || 16; lastT = t;
    if (!reduce) { rotY += vel * dt / 16; vel += (0.0035 - vel) * 0.03; }
    render(t);
    if (!reduce) drawSparks();
    if (visible && !reduce) requestAnimationFrame(frame); else running = false;
  }
  function start() { if (!running) { running = true; lastT = performance.now(); requestAnimationFrame(frame); } }

  var lastEvt = performance.now();
  window.addEventListener('scroll', function () {
    if (reduce || !visible) return;
    var now = performance.now(), y = window.pageYOffset, dy = y - lastScroll, dtm = Math.max(16, now - lastEvt);
    lastScroll = y; lastEvt = now;
    var speed = Math.abs(dy) / dtm;
    vel += (dy > 0 ? 1 : -1) * Math.min(0.08, speed * 0.02);
    spawnSparks(Math.min(14, Math.round(speed * 6)));
    start();
  }, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }, { threshold: 0.05 }).observe(host);
  } else { visible = true; start(); }
  window.addEventListener('resize', function () {
    size = host.clientWidth || 400; R = size * 0.44; canvas.width = size * 2; canvas.height = size * 2; ctx.setTransform(2, 0, 0, 2, 0, 0); render(performance.now());
  });
  render(performance.now());
})();
