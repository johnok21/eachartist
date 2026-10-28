/* paint.js — the homepage collage window becomes a working paint program on desktop.
   Loads deferred; on phones or without a fine pointer the window stays a picture.
   Drawings are kept in this browser only (localStorage). */
(function () {
  'use strict';
  var win = document.getElementById('paint-win');
  if (!win) return;
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches && window.innerWidth > 760;
  if (!fine) return;

  var $ = function (id) { return document.getElementById(id); };
  var band = win.parentNode, wrap = $('paint-canvas-wrap'), staticArt = $('collage-static');
  var hint = $('paint-hint'), xy = $('paint-xy'), current = $('paint-current');
  var W = 1100, H = 560, MIN_W = 560;
  var COLORS = ['#0a0a0a','#f4f1e8','#6dde5a','#c4a8d8','#f5c542','#ff8c2e','#00d4aa','#ff3b30','#1a5fb4','#8a5fb0','#c58a00','#00a884','#e0601e','#ff5fa2'];
  var HINTS = { pencil: 'Pencil', brush: 'Wacky brush', fill: 'Fill with color', eraser: 'Eraser', stamp: 'Rubber stamp' };
  var KEY = 'each-paint-v1';
  var tool = 'pencil', color = COLORS[0], stampIdx = 0, drawing = false, last = null, snapshot = null, undo = [], resetArmed = 0;

  // canvas replaces the static picture
  var canvas = document.createElement('canvas');
  canvas.id = 'paint'; canvas.width = W; canvas.height = H;
  canvas.setAttribute('aria-label', 'Drawing canvas: the Bay Area artists collage. Draw on it with the tools.');
  var ctx = canvas.getContext('2d', { willReadFrequently: true });
  var base = document.createElement('canvas'); base.width = W; base.height = H; var bctx = base.getContext('2d');

  function img(src) { var i = new Image(); i.src = src; return i; }
  function svgURI(inner) { return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">' + inner + '</svg>'); }
  var collage = img('img/collage.webp');
  var stampSrc = ['img/star.png', 'img/sparkle.png', 'img/arch.png',
    svgURI('<circle cx="50" cy="50" r="42" fill="#00d4aa" stroke="#0a0a0a" stroke-width="8"/>'),
    svgURI('<rect x="14" y="14" width="72" height="72" fill="#c4a8d8" stroke="#0a0a0a" stroke-width="8" transform="rotate(-12 50 50)"/>'),
    svgURI('<path d="M6 60 L28 34 L50 60 L72 34 L94 60" fill="none" stroke="#0a0a0a" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>')];
  var stamps = stampSrc.map(img);

  function drawBase() {
    bctx.save();
    bctx.fillStyle = '#c4a8d8'; bctx.fillRect(0, 0, W, H);
    bctx.fillStyle = 'rgba(10,10,10,0.22)';
    for (var y = 5; y < H; y += 11) for (var x = 5; x < W; x += 11) { bctx.beginPath(); bctx.arc(x, y, 1.6, 0, Math.PI * 2); bctx.fill(); }
    var cw = Math.round(W * 0.62), ch = Math.round(cw * collage.naturalHeight / collage.naturalWidth), cx = W / 2, cy = H / 2 + 10;
    var tint = function (col, dx, dy) {
      var t = document.createElement('canvas'); t.width = cw; t.height = ch; var tc = t.getContext('2d');
      tc.drawImage(collage, 0, 0, cw, ch); tc.globalCompositeOperation = 'source-in'; tc.fillStyle = col; tc.fillRect(0, 0, cw, ch);
      bctx.save(); bctx.translate(cx + dx, cy + dy); bctx.rotate(-1.5 * Math.PI / 180); bctx.drawImage(t, -cw / 2, -ch / 2); bctx.restore();
    };
    tint('#ff3b30', 10, 10); tint('#00d4aa', -7, -7);
    bctx.save(); bctx.translate(cx, cy); bctx.rotate(-1.5 * Math.PI / 180); bctx.drawImage(collage, -cw / 2, -ch / 2, cw, ch);
    bctx.strokeStyle = 'rgba(10,10,10,0.25)'; bctx.lineWidth = 2;
    bctx.fillStyle = 'rgba(245,197,66,0.9)';
    bctx.save(); bctx.translate(-cw / 2 + cw * 0.16, -ch / 2); bctx.rotate(-42 * Math.PI / 180); bctx.fillRect(-55, -13, 110, 26); bctx.strokeRect(-55, -13, 110, 26); bctx.restore();
    bctx.fillStyle = 'rgba(244,241,232,0.92)';
    bctx.save(); bctx.translate(cw / 2 - cw * 0.12, ch / 2); bctx.rotate(20 * Math.PI / 180); bctx.fillRect(-45, -13, 90, 26); bctx.strokeRect(-45, -13, 90, 26); bctx.restore();
    bctx.restore();
    var label = 'EST. 2026 · SAN FRANCISCO';
    bctx.font = '12px "Space Mono", monospace'; if ('letterSpacing' in bctx) bctx.letterSpacing = '1.7px';
    var tw = bctx.measureText(label).width + 26, th = 34;
    bctx.save(); bctx.translate(W - tw / 2 - 26, 40); bctx.rotate(6 * Math.PI / 180);
    bctx.fillStyle = '#f4f1e8'; bctx.beginPath(); if (bctx.roundRect) bctx.roundRect(-tw / 2, -th / 2, tw, th, 999); else bctx.rect(-tw / 2, -th / 2, tw, th); bctx.fill();
    bctx.setLineDash([6, 4]); bctx.lineWidth = 3; bctx.strokeStyle = '#0a0a0a'; bctx.stroke();
    bctx.fillStyle = '#0a0a0a'; bctx.textAlign = 'center'; bctx.textBaseline = 'middle'; bctx.fillText(label, 0, 1);
    bctx.restore(); bctx.restore();
  }

  function save() { try { localStorage.setItem(KEY, canvas.toDataURL('image/png')); } catch (e) {} }
  function restore(cb) {
    var data = null, w = '';
    try { data = localStorage.getItem(KEY); w = localStorage.getItem(KEY + '-w') || ''; } catch (e) {}
    if (w) setWidth(parseInt(w, 10) || 0); else setWidth(Math.round(maxWidth() * 0.9));
    if (!data) return cb(false);
    var i = new Image(); i.onload = function () { ctx.drawImage(i, 0, 0); cb(true); }; i.onerror = function () { cb(false); }; i.src = data;
  }

  function pos(e) { var r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
  function pushUndo() { undo.push(ctx.getImageData(0, 0, W, H)); if (undo.length > 12) undo.shift(); }
  function doUndo() { var s = undo.pop(); if (s) { ctx.putImageData(s, 0, 0); save(); setHint('Undo'); } else setHint('Nothing to undo'); }
  function setHint(t) { hint.textContent = t; }

  function strokeTo(p) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.lineWidth = tool === 'pencil' ? 3 : 16;
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    if (tool === 'brush' && Math.random() < 0.18) {
      var len = 10 + Math.random() * 34; ctx.lineWidth = 4 + Math.random() * 4;
      ctx.beginPath(); ctx.moveTo(p.x, p.y + 6); ctx.lineTo(p.x + (Math.random() - 0.5) * 4, p.y + len); ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y + len, ctx.lineWidth * 0.8, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    }
  }
  function eraseTo(p) {
    var d = Math.hypot(p.x - last.x, p.y - last.y), steps = Math.max(1, Math.ceil(d / 6));
    for (var i = 0; i <= steps; i++) {
      var x = last.x + (p.x - last.x) * i / steps, y = last.y + (p.y - last.y) * i / steps;
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(base, 0, 0); ctx.restore();
    }
  }
  function drawStamp(p) { var im = stamps[stampIdx], s = 96, h = s * (im.naturalHeight / im.naturalWidth || 1); ctx.drawImage(im, p.x - s / 2, p.y - h / 2, s, h); }
  function floodFill(p) {
    var sx = Math.floor(p.x), sy = Math.floor(p.y); if (sx < 0 || sy < 0 || sx >= W || sy >= H) return;
    var id = ctx.getImageData(0, 0, W, H), d = id.data, px = new Uint32Array(d.buffer);
    var i0 = sy * W + sx, t = px[i0], tr = d[i0 * 4], tg = d[i0 * 4 + 1], tb = d[i0 * 4 + 2];
    var m = /^#([0-9a-f]{6})$/i.exec(color), r = parseInt(m[1].slice(0, 2), 16), g = parseInt(m[1].slice(2, 4), 16), b = parseInt(m[1].slice(4, 6), 16);
    var fill = (255 << 24 | b << 16 | g << 8 | r) >>> 0; if (fill === t) return;
    var TOL = 48, seen = new Uint8Array(W * H);
    var match = function (i) { if (seen[i]) return false; var j = i * 4; return Math.abs(d[j] - tr) + Math.abs(d[j + 1] - tg) + Math.abs(d[j + 2] - tb) <= TOL; };
    var stack = [i0];
    while (stack.length) {
      var i = stack.pop(); if (!match(i)) continue;
      var y = (i / W) | 0, row = y * W, xl = i - row, xr = xl;
      while (xl > 0 && match(row + xl - 1)) xl--;
      while (xr < W - 1 && match(row + xr + 1)) xr++;
      for (var k = row + xl; k <= row + xr; k++) {
        seen[k] = 1; px[k] = fill;
        if (y > 0 && match(k - W)) stack.push(k - W);
        if (y < H - 1 && match(k + W)) stack.push(k + W);
      }
    }
    ctx.putImageData(id, 0, 0);
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return; e.preventDefault(); canvas.setPointerCapture(e.pointerId);
    var p = pos(e); pushUndo();
    if (tool === 'fill') { floodFill(p); save(); return; }
    if (tool === 'stamp') { snapshot = ctx.getImageData(0, 0, W, H); drawStamp(p); drawing = true; return; }
    drawing = true; last = p;
    if (tool === 'eraser') eraseTo(p); else { last = { x: p.x - 0.01, y: p.y }; strokeTo(p); last = p; }
  });
  canvas.addEventListener('pointermove', function (e) {
    var p = pos(e); xy.textContent = Math.round(p.x) + ', ' + Math.round(p.y);
    if (!drawing) return;
    if (tool === 'stamp') { ctx.putImageData(snapshot, 0, 0); drawStamp(p); return; }
    if (tool === 'eraser') eraseTo(p); else strokeTo(p);
    last = p;
  });
  var end = function () { if (!drawing) return; drawing = false; snapshot = null; save(); };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', function () { xy.textContent = W + ', ' + H; });

  // tools / colors / stamps
  var toolBtns = win.querySelectorAll('.tool[data-tool]');
  function setTool(t) { tool = t; for (var i = 0; i < toolBtns.length; i++) toolBtns[i].setAttribute('aria-pressed', String(toolBtns[i].getAttribute('data-tool') === t)); canvas.className = 'tool-' + t; setHint(HINTS[t]); }
  for (var ti = 0; ti < toolBtns.length; ti++) (function (b) { b.addEventListener('click', function () { setTool(b.getAttribute('data-tool')); }); })(toolBtns[ti]);
  var sw = $('paint-swatches');
  COLORS.forEach(function (c, i) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'swatch'; b.style.background = c; b.title = c; b.setAttribute('role', 'radio'); b.setAttribute('aria-pressed', String(i === 0)); b.setAttribute('aria-label', 'Color ' + c);
    b.addEventListener('click', function () { color = c; current.style.background = c; var all = sw.querySelectorAll('.swatch'); for (var k = 0; k < all.length; k++) all[k].setAttribute('aria-pressed', 'false'); b.setAttribute('aria-pressed', 'true'); });
    sw.appendChild(b);
  });
  current.style.background = color;
  var tray = $('paint-tray');
  stampSrc.forEach(function (s, i) {
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-pressed', String(i === 0)); b.setAttribute('aria-label', 'Stamp ' + (i + 1));
    var im = document.createElement('img'); im.src = s; im.alt = ''; b.appendChild(im);
    b.addEventListener('click', function () { stampIdx = i; var all = tray.querySelectorAll('button'); for (var k = 0; k < all.length; k++) all[k].setAttribute('aria-pressed', 'false'); b.setAttribute('aria-pressed', 'true'); setTool('stamp'); });
    tray.appendChild(b);
  });

  // menus
  var menus = Array.prototype.slice.call(win.querySelectorAll('.menu'));
  var closeMenus = function () { menus.forEach(function (x) { x.classList.remove('open'); }); };
  menus.forEach(function (m) { m.querySelector('button').addEventListener('click', function (e) { e.stopPropagation(); var open = m.classList.contains('open'); closeMenus(); if (!open) m.classList.add('open'); }); });
  document.addEventListener('click', closeMenus);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenus(); });
  var acts = win.querySelectorAll('.menu li button[data-act]');
  for (var ai = 0; ai < acts.length; ai++) (function (b) { b.addEventListener('click', function () { act(b.getAttribute('data-act')); }); })(acts[ai]);
  function act(a) {
    closeMenus();
    if (a === 'undo') doUndo();
    else if (a === 'reset') doReset();
    else if (a === 'max') setWidth(maxWidth());
    else if (a === 'restore') setWidth(Math.round(maxWidth() * 0.9));
    else if (a === 'stamp') { setTool('stamp'); tray.querySelector('button').focus(); }
    else if (a === 'help') setHint('Draw on the picture. ⌘Z undo. File → Reset. Post it and tag @eachartistbayarea.');
    else if (a === 'copy') copyImage();
    else if (a === 'save') savePNG();
  }
  function doReset() {
    var now = Date.now();
    if (now - resetArmed > 4000) { resetArmed = now; setHint('Reset? Choose it again to confirm.'); return; }
    resetArmed = 0; pushUndo(); ctx.drawImage(base, 0, 0); save(); setHint('Reset');
  }
  function copyImage() {
    if (!(navigator.clipboard && window.ClipboardItem)) { setHint('Copy not available'); return; }
    canvas.toBlob(function (blob) {
      if (!blob) { setHint('Copy failed'); return; }
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(function () { setHint('Copied'); }, function () { setHint('Copy refused'); });
    }, 'image/png');
  }
  function savePNG() {
    canvas.toBlob(function (blob) {
      if (!blob) { setHint('Save failed'); return; }
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'bay_area_artists.png'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000); setHint('Saved bay_area_artists.png');
    }, 'image/png');
  }
  document.addEventListener('keydown', function (e) {
    if (!(e.metaKey || e.ctrlKey)) return;
    var k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey && document.activeElement && win.contains(document.activeElement)) { e.preventDefault(); doUndo(); }
    if (k === 's' && document.activeElement && win.contains(document.activeElement)) { e.preventDefault(); savePNG(); }
  });

  // window buttons
  $('paint-min').addEventListener('click', function () { win.classList.toggle('min'); });
  $('paint-max').addEventListener('click', function () { var w = Math.round(win.getBoundingClientRect().width); setWidth(w >= maxWidth() - 2 ? Math.round(maxWidth() * 0.9) : maxWidth()); });
  $('paint-close').addEventListener('click', function () { band.parentNode.parentNode.classList.add('closed'); $('paint-reopen').focus(); });
  $('paint-reopen').addEventListener('click', function () { band.parentNode.parentNode.classList.remove('closed'); win.classList.remove('min'); });

  // resize within the band
  function maxWidth() { return Math.floor(band.getBoundingClientRect().width); }
  function setWidth(px) { if (!px) { win.style.width = ''; } else { win.style.width = Math.max(MIN_W, Math.min(maxWidth(), px)) + 'px'; } try { localStorage.setItem(KEY + '-w', win.style.width); } catch (e) {} }
  function dragResize(handle, dir) {
    var sx = 0, sw0 = 0, on = false;
    var move = function (e) { if (!on) return; e.preventDefault(); setWidth(sw0 + (e.clientX - sx) * dir * 2); setHint(Math.round(win.getBoundingClientRect().width) + ' × ' + Math.round(canvas.getBoundingClientRect().height) + ' px'); };
    var stop = function () { if (!on) return; on = false; document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', stop); document.removeEventListener('pointercancel', stop); setHint(HINTS[tool]); };
    handle.addEventListener('pointerdown', function (e) { if (e.button !== 0) return; e.preventDefault(); on = true; sx = e.clientX; sw0 = win.getBoundingClientRect().width;
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', stop); document.addEventListener('pointercancel', stop); });
  }
  dragResize($('paint-grip'), 1); dragResize($('paint-edge-r'), 1); dragResize($('paint-edge-l'), -1);
  window.addEventListener('resize', function () { if (win.style.width) setWidth(parseInt(win.style.width, 10)); });

  // boot: swap the picture for the canvas once the collage and fonts are in
  function start() {
    drawBase(); ctx.drawImage(base, 0, 0);
    wrap.replaceChild(canvas, staticArt);
    $('paint-menus').hidden = false; $('paint-tools').hidden = false; $('paint-palette').hidden = false;
    $('paint-body').classList.remove('no-rail'); win.classList.remove('win-static');
    setHint(HINTS.pencil);
    restore(function () {});
  }
  var ready = 0;
  var go = function () { if (++ready === 2) start(); };
  if (collage.complete && collage.naturalWidth) go(); else collage.addEventListener('load', go, { once: true });
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go, go);
})();
