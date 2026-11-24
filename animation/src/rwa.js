// ===== Rearward amplification (amplification vers l'arrière) =====
// RWA = max|a_y| de la dernière portion / max|a_y| de la première (accélération latérale au centre de gravité, ISO 14791).
function rwaCompute(frames) {
  const n = frames.length;
  if (n < 5) return null;
  const N = frames[0].th.length,
    dt = frames[1].t - frames[0].t;
  const pk = Array(N).fill(0),
    py = Array(N).fill(0);
  for (let i = 1; i < n - 1; i++)
    for (let k = 0; k < N; k++) {
      const a = frames[i - 1].G[k],
        b = frames[i].G[k],
        c = frames[i + 1].G[k],
        th = frames[i].th[k];
      const ax = (a[0] - 2 * b[0] + c[0]) / (dt * dt),
        ay = (a[1] - 2 * b[1] + c[1]) / (dt * dt);
      const lat = -Math.sin(th) * ax + Math.cos(th) * ay; // composante transversale à la portion
      pk[k] = Math.max(pk[k], Math.abs(lat));
      const yr = (frames[i + 1].th[k] - frames[i - 1].th[k]) / (2 * dt);
      py[k] = Math.max(py[k], Math.abs(yr));
    }
  return {
    peaks: pk,
    yaw: py,
    ra: pk[N - 1] / Math.max(pk[0], 1e-9),
    raYaw: py[N - 1] / Math.max(py[0], 1e-9),
    rmax: Math.max(...pk) / Math.max(pk[0], 1e-9),
    N
  };
}

function rwaDraw(sets) {
  const cvr = document.getElementById('rw'),
    g = cvr.getContext('2d'),
    W = cvr.width,
    H = cvr.height,
    ml = 60,
    mb = 34,
    mt = 28;
  g.clearRect(0, 0, W, H);
  const sty = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const valid = sets.filter(s => s && s.r);
  if (!valid.length) return;
  const N = valid[0].r.N;
  let ym = 0.5;
  for (const s of valid)
    for (const v of s.r.peaks) ym = Math.max(ym, v);
  if (!isFinite(ym)) ym = 1;
  const gw = (W - ml - 20) / N,
    bw = gw / (valid.length + 1.2);
  g.font = '12px system-ui';
  g.strokeStyle = sty('--line');
  g.fillStyle = sty('--mut');
  g.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const v = ym * i / 4,
      y = H - mb - (H - mb - mt) * i / 4;
    g.beginPath();
    g.moveTo(ml, y);
    g.lineTo(W - 20, y);
    g.stroke();
    g.fillText(v.toFixed(v < 10 ? 2 : 1).replace('.', ','), 8, y + 4);
  }
  g.fillText('a_y max (m/s²)', 8, 12);
  for (let k = 0; k < N; k++) {
    const x0 = ml + k * gw + bw * 0.6;
    valid.forEach((s, j) => {
      const h = (H - mb - mt) * s.r.peaks[k] / ym;
      g.fillStyle = s.col;
      g.globalAlpha = s.alpha || 1;
      g.fillRect(x0 + j * bw, H - mb - h, bw * 0.9, h);
      g.globalAlpha = 1;
      g.fillStyle = sty('--ink');
      g.textAlign = 'center';
      g.fillText(s.r.peaks[k].toFixed(2).replace('.', ','), x0 + j * bw + bw * 0.45, H - mb - h - 4);
      g.textAlign = 'left';
    });
    g.fillStyle = sty('--mut');
    g.textAlign = 'center';
    g.fillText(k == 0 ? '1 (tête)' : (k == N - 1 ? N + ' (queue)' : String(k + 1)), ml + k * gw + gw / 2, H - 14);
    g.textAlign = 'left';
  }
}

function rwaShow(sets) {
  const el = document.getElementById("rwk");
  rwaDraw(sets.filter(s => s && !s.bad));
  const f = x => x.toFixed(2).replace('.', ',');
  let h = '<div class="h"></div><div class="h">RWA (accélération latérale)</div><div class="h">amplification max le long du convoi</div><div class="h">rapport des vitesses de lacet</div>';
  for (const s of sets) {
    if (!s) continue;
    h += '<div><b style="color:' + s.col + '">' + s.label + '</b></div>';
    if (!s.r || s.bad) {
      h += '<div colspan=3 style="grid-column:span 3;color:var(--mut)">' + (s.bad ? 'non significatif (divergence du convoi)' : 'non calculable') + '</div>';
      continue;
    }
    h += '<div><b>' + f(s.r.ra) + '</b></div><div><b>' + f(s.r.rmax) + '</b></div><div><b>' + f(s.r.raYaw) + '</b></div>';
  }
  el.innerHTML = h;
}

// ===== Déport (offtracking) : écart latéral signé entre le centre d'essieu A_N de la dernière portion et la trajectoire suivie par la tête =====
function deportCompute(frames) {
  const n = frames.length;
  if (n < 3) return [];
  const N = frames[0].th.length;
  const dir = [Math.cos(frames[0].th[0]), Math.sin(frames[0].th[0])],
    h0 = frames[0].J[0],
    pts = [];
  for (let s = 40; s >= 0; s -= 0.25) pts.push([h0[0] - s * dir[0], h0[1] - s * dir[1]]); // prolongement rectiligne de la trajectoire de la tête avant t = 0
  const base = pts.length,
    out = [];
  for (let i = 0; i < n; i++) {
    pts.push(frames[i].J[0].slice());
    const P = frames[i].A[N - 1];
    let best = 1e9,
      sg = 0;
    for (let j = Math.max(0, base + i - 900); j < base + i; j++) {
      const a = pts[j],
        b = pts[j + 1],
        dx = b[0] - a[0],
        dy = b[1] - a[1],
        L2 = dx * dx + dy * dy;
      if (L2 < 1e-12) continue;
      let u = ((P[0] - a[0]) * dx + (P[1] - a[1]) * dy) / L2;
      u = Math.max(0, Math.min(1, u));
      const qx = a[0] + u * dx,
        qy = a[1] + u * dy,
        dd = Math.hypot(P[0] - qx, P[1] - qy);
      if (dd < best) {
        best = dd;
        sg = Math.sign(dx * (P[1] - a[1]) - dy * (P[0] - a[0])) || 1;
      }
    }
    out.push({
      t: frames[i].t,
      d: sg * best
    });
  }
  return out;
}

function deportDraw(cid, sets, TT, tcur) {
  const cvr = document.getElementById(cid),
    g = cvr.getContext('2d'),
    W = cvr.width,
    H = cvr.height,
    ml = 64,
    mr = 14,
    mt = 34,
    mb = 30;
  g.clearRect(0, 0, W, H);
  const sty = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const valid = sets.filter(s => s && s.d && s.d.length).map(s => ({
    ...s,
    d: s.d.map(p => ({
      t: p.t,
      d: p.d * 100
    }))
  }));
  if (!valid.length) return; // affichage en cm
  let ym = 20;
  const mx = valid.map(s => Math.max(...s.d.map(p => Math.abs(p.d))));
  for (const v of mx) ym = Math.max(ym, v);
  const nice = v => {
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const m = v / p;
    return ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(x => m <= x)) * p;
  };
  ym = nice(ym * 1.05);
  const X = t => ml + t / TT * (W - ml - mr),
    Y = v => mt + (H - mt - mb) / 2 * (1 - v / ym);
  g.font = '12px system-ui';
  g.lineWidth = 1;
  g.strokeStyle = sty('--line');
  g.fillStyle = sty('--mut');
  for (const v of [-ym, -ym / 2, 0, ym / 2, ym]) {
    g.beginPath();
    g.moveTo(ml, Y(v));
    g.lineTo(W - mr, Y(v));
    g.stroke();
    g.fillText(v.toFixed(Math.abs(v) < 10 ? 1 : 0).replace('.', ','), 6, Y(v) + 4);
  }
  for (let s = 0; s <= TT; s += Math.max(1, Math.round(TT / 6))) g.fillText(s + ' s', X(s) - 8, H - 10);
  g.fillStyle = sty('--ink');
  g.fillText('déport : écart latéral entre la queue et la trajectoire de la tête (cm)', 6, 14);
  let lx = ml;
  valid.forEach((s, i) => {
    g.fillStyle = s.col;
    g.fillRect(lx, 22, 14, 3);
    g.fillStyle = sty('--mut');
    const lab = s.label + ' (max ' + mx[i].toFixed(1).replace('.', ',') + ' cm)';
    g.fillText(lab, lx + 18, 27);
    lx += g.measureText(lab).width + 40;
  });
  for (const s of valid) {
    g.strokeStyle = s.col;
    g.lineWidth = 2;
    g.setLineDash(s.dash || []);
    g.beginPath();
    let first = true;
    for (const p of s.d) {
      if (p.t > tcur) break;
      first ? g.moveTo(X(p.t), Y(p.d)) : g.lineTo(X(p.t), Y(p.d));
      first = false;
    }
    g.stroke();
    g.setLineDash([]);
  }
}

// ===== tracés multi-courbes (une courbe par portion) : accélérations latérales et efforts latéraux des pneus =====
const SCOL = ['#3b8043', '#d4a800', '#79b28a', '#1b8a8f', '#8a9a1b', '#5b6b73', '#a6c84c', '#1d4d2b', '#c99700', '#9db8a6'];

function accSeries(frames) {
  const n = frames.length,
    N = frames[0].th.length,
    dt = frames[1].t - frames[0].t,
    y = [],
    t = frames.map(f => f.t);
  for (let k = 0; k < N; k++) {
    const a = Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) {
      const p = frames[i - 1].G[k],
        q = frames[i].G[k],
        r = frames[i + 1].G[k],
        th = frames[i].th[k];
      a[i] = -Math.sin(th) * (p[0] - 2 * q[0] + r[0]) / (dt * dt) + Math.cos(th) * (p[1] - 2 * q[1] + r[1]) / (dt * dt);
    }
    a[0] = a[1];
    a[n - 1] = a[n - 2];
    y.push(a);
  }
  return {
    t,
    y
  };
}

function forceSeries(frames) {
  const N = frames[0].th.length,
    y = [];
  for (let k = 0; k < N; k++) y.push(frames.map(f => f.F[k]));
  return {
    t: frames.map(f => f.t),
    y
  };
}

function seriesDraw(cid, title, S, TT, tcur) {
  const cvr = document.getElementById(cid),
    g = cvr.getContext('2d'),
    W = cvr.width,
    H = cvr.height,
    ml = 64,
    mr = 14,
    mt = 36,
    mb = 30;
  g.clearRect(0, 0, W, H);
  const sty = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  let ym = 1e-9;
  const mx = S.y.map(a => Math.max(...a.map(Math.abs)));
  for (const v of mx) ym = Math.max(ym, v);
  const nice = v => {
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const m = v / p;
    return ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(x => m <= x)) * p;
  };
  ym = nice(ym * 1.05);
  const pos = !!S.pos,
    X = t => ml + t / TT * (W - ml - mr),
    Y = v => pos ? mt + (H - mt - mb) * (1 - v / ym) : mt + (H - mt - mb) / 2 * (1 - v / ym),
    N = S.y.length;
  g.font = '12px system-ui';
  g.lineWidth = 1;
  g.strokeStyle = sty('--line');
  g.fillStyle = sty('--mut');
  for (const v of (pos ? [0, ym / 4, ym / 2, 3 * ym / 4, ym] : [-ym, -ym / 2, 0, ym / 2, ym])) {
    g.beginPath();
    g.moveTo(ml, Y(v));
    g.lineTo(W - mr, Y(v));
    g.stroke();
    g.fillText(Math.abs(ym) < 2 ? v.toFixed(2).replace('.', ',') : Math.abs(ym) < 10 ? v.toFixed(1).replace('.', ',') : Math.round(v).toLocaleString('fr-FR'), 6, Y(v) + 4);
  }
  for (let s = 0; s <= TT; s += Math.max(1, Math.round(TT / 6))) g.fillText(s + ' s', X(s) - 8, H - 10);
  g.fillStyle = sty('--ink');
  g.fillText(title, 6, 14);
  let lx = ml;
  for (let k = 0; k < N; k++) {
    g.fillStyle = SCOL[k % SCOL.length];
    g.fillRect(lx, 22, 14, 3);
    g.fillStyle = sty('--mut');
    const lab = (S.names ? S.names[k] : (k == 0 ? 'tête' : (k == N - 1 ? 'queue' : 'portion ' + (k + 1)))) + ' (max ' + (mx[k] < 2 ? mx[k].toFixed(2).replace('.', ',') : mx[k] < 10 ? mx[k].toFixed(1).replace('.', ',') : Math.round(mx[k]).toLocaleString('fr-FR')) + ')';
    g.fillText(lab, lx + 18, 27);
    lx += g.measureText(lab).width + 34;
    if (lx > W - 150 && k < N - 1) {
      lx = ml;
    }
  }
  for (let k = 0; k < N; k++) {
    g.strokeStyle = SCOL[k % SCOL.length];
    g.lineWidth = 1.6;
    g.beginPath();
    let first = true;
    for (let i = 0; i < S.t.length; i++) {
      if (S.t[i] > tcur || S.y[k][i] == null) break;
      first ? g.moveTo(X(S.t[i]), Y(S.y[k][i])) : g.lineTo(X(S.t[i]), Y(S.y[k][i]));
      first = false;
    }
    g.stroke();
  }
}
