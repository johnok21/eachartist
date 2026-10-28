/* sphere.js — "The Bay needs its artists": a 3D word globe of artistic mediums.
   Scrolling spins it (faster scroll, faster spin, more sparks); idle, it turns slowly.
   Respects prefers-reduced-motion: static globe, no sparks. Homepage only. */
(function () {
  'use strict';
  var host = document.getElementById('medium-sphere');
  if (!host) return;
  var WORDS = ['Dancers', 'Ceramicists', 'Musicians', 'Songwriters', 'Producers', 'Filmmakers', 'Actors', 'Poets', 'Writers',
    'Visual artists', 'Immersive artists', 'Muralists', 'Craft artists', 'Weavers', 'Fashion designers', 'Photographers',
    'Printmakers', 'Illustrators', 'Comedians', 'DJs', 'Sculptors', 'Painters'];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPARK_COLORS = ['#f5c542', '#f4f1e8', '#0a0a0a', '#00d4aa', '#ff3b30'];

  // --- build ---
  var size = host.clientWidth || 400, R = size * 0.42;
  var stage = document.createElement('div'); stage.className = 'sphere-stage';
  var canvas = document.createElement('canvas'); canvas.className = 'sphere-sparks'; canvas.width = size * 2; canvas.height = size * 2;
  var ctx = canvas.getContext('2d'); ctx.scale(2, 2);
  host.appendChild(canvas); host.appendChild(stage);
  var items = WORDS.map(function (w, i) {
    var el = document.createElement('span'); el.className = 'sphere-word'; el.textContent = w; stage.appendChild(el);
    // Fibonacci sphere: evenly spread points
    var y = 1 - (i / (WORDS.length - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963;
    return { el: el, x: Math.cos(th) * r, y: y, z: Math.sin(th) * r };
  });

  // --- state ---
  var rotY = 0.6, rotX = -0.35, vel = 0.004, lastScroll = window.pageYOffset, lastT = performance.now(), sparks = [], running = false, visible = false;

  function render() {
    var cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX);
    for (var i = 0; i < items.length; i++) {
      var p = items[i];
      var x1 = p.x * cy - p.z * sy, z1 = p.x * sy + p.z * cy;           // spin about Y
      var y2 = p.y * cx - z1 * sx, z2 = p.y * sx + z1 * cx;            // tilt about X
      var depth = (z2 + 1) / 2;                                         // 0 back … 1 front
      var scale = 0.55 + depth * 0.65;
      p.el.style.transform = 'translate(-50%,-50%) translate3d(' + (x1 * R).toFixed(1) + 'px,' + (y2 * R).toFixed(1) + 'px,0) scale(' + scale.toFixed(3) + ')';
      p.el.style.opacity = (0.18 + depth * 0.82).toFixed(2);
      p.el.style.zIndex = Math.round(depth * 100);
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
        ctx.beginPath(); var r = s.size * 1.6;
        for (var k = 0; k < 8; k++) { var rr = k % 2 ? r * 0.4 : r, ang = k * Math.PI / 4; ctx.lineTo(s.x + Math.cos(ang) * rr, s.y + Math.sin(ang) * rr); }
        ctx.closePath(); ctx.fill();
      } else { ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size); }
    }
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    var dt = Math.min(48, t - lastT) || 16; lastT = t;
    if (!reduce) {
      rotY += vel * dt / 16;
      vel += (0.004 - vel) * 0.03;   // ease back to the idle spin
    }
    render();
    if (!reduce) drawSparks();
    if (visible && (!reduce || sparks.length)) requestAnimationFrame(frame); else running = false;
  }
  function start() { if (!running) { running = true; lastT = performance.now(); requestAnimationFrame(frame); } }

  // scroll → velocity + sparks
  var lastEvt = performance.now();
  window.addEventListener('scroll', function () {
    if (reduce || !visible) return;
    var now = performance.now(), y = window.pageYOffset, dy = y - lastScroll, dtm = Math.max(16, now - lastEvt);
    lastScroll = y; lastEvt = now;
    var speed = Math.abs(dy) / dtm;                 // px per ms
    vel += (dy > 0 ? 1 : -1) * Math.min(0.08, speed * 0.02);
    spawnSparks(Math.min(14, Math.round(speed * 6)));
    start();
  }, { passive: true });

  // only animate while on screen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }, { threshold: 0.05 }).observe(host);
  } else { visible = true; start(); }

  // keep square on resize
  window.addEventListener('resize', function () {
    size = host.clientWidth || 400; R = size * 0.42; canvas.width = size * 2; canvas.height = size * 2; ctx.setTransform(2, 0, 0, 2, 0, 0); render();
  });
  render();
})();
