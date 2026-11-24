// ===== moteur de simulation : modèle de Lagrange du convoi articulé (port JavaScript de modele.py) =====
// Pneus linéaires, braquage de la tête optionnel, régulation de vitesse, amortissement c aux articulations.
function solveLin(A, b) {
  const n = b.length;
  A = A.map(r => Array.from(r));
  b = Array.from(b);
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++)
      if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]];
    [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / A[i][i];
      if (f !== 0) {
        for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
        b[r] -= f * b[i];
      }
    }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = s / A[i][i];
  }
  return x;
}

function buildModel(N, pp) {
  const P = Object.assign({
      L: 1.8,
      M1: 300,
      Mj: 500,
      Mn: 300,
      I1: 170,
      Ij: 150,
      In: 100,
      l1: 0.6,
      ln: 0.3,
      Kt: 13600,
      sat: false,
      mu: 0.8,
      fymax: 0
    }, typeof pp == 'object' ? pp : {
      L: pp || 1.8
    }),
    L = P.L;
  const lJJ = Array(N).fill(L);
  lJJ[0] = L / 2;
  lJJ[N - 1] = L / 2;
  const lJG = Array(N).fill(L / 2);
  lJG[0] = P.l1;
  lJG[N - 1] = P.ln;
  const lJA = Array(N).fill(L / 2);
  lJA[0] = 0;
  const m = Array(N).fill(P.Mj);
  m[0] = P.M1;
  m[N - 1] = P.Mn;
  const I = Array(N).fill(P.Ij);
  I[0] = P.I1;
  I[N - 1] = P.In;
  const nbP = Array(N).fill(4);
  nbP[0] = 2;
  nbP[N - 1] = 2;
  const nbBr = Array(N).fill(2);
  nbBr[0] = 2;
  nbBr[N - 1] = 0; // pneus directeurs par essieu
  return {
    n: N - 1,
    N,
    lJJ,
    lJG,
    lJA,
    m,
    I,
    nbP,
    nbBr,
    Kt: P.Kt,
    L,
    sat: !!P.sat,
    mu: P.mu,
    fymax: P.fymax || 0
  };
}
// ctl (facultatif) : {delta0 : braquage de la tête (rad), Fd : effort longitudinal total (N)}
function dynamics(mod, X, c, lockFirst, ctl) {
  const {
    n,
    N,
    lJJ,
    lJG,
    lJA,
    m,
    I,
    nbP,
    nbBr
  } = mod, d = n + 3, Kt = mod.Kt;
  const delta0 = ctl ? ctl.delta0 : 0,
    Fl = ctl ? ctl.Fd / N : 0,
    ck = Array.isArray(c) ? c : Array(n).fill(c); // c : amortissement uniforme ou tableau (un coefficient par articulation)
  const qd = X.slice(d),
    th = X.slice(2, d),
    thd = qd.slice(2);
  const nx = th.map(Math.cos),
    ny = th.map(Math.sin);
  const P = [],
    R = [],
    PA = [];
  for (let r = 0; r < 2 * N; r++) {
    P.push(new Float64Array(d));
    R.push(new Float64Array(d));
    PA.push(new Float64Array(d));
  }
  for (let k = 0; k < N; k++) {
    for (let e = 0; e < 2; e++) {
      P[2 * k + e][e] = 1;
      PA[2 * k + e][e] = 1;
    }
    for (let i = 0; i <= k; i++) {
      const lg = i < k ? lJJ[i] : lJG[k],
        la = i < k ? lJJ[i] : lJA[k];
      P[2 * k][2 + i] = lg * ny[i];
      P[2 * k + 1][2 + i] = -lg * nx[i];
      PA[2 * k][2 + i] = la * ny[i];
      PA[2 * k + 1][2 + i] = -la * nx[i];
      R[2 * k][2 + i] = lg * nx[i];
      R[2 * k + 1][2 + i] = lg * ny[i];
    }
  }
  const w = r => m[r >> 1];
  const M = [];
  for (let a = 0; a < d; a++) {
    M.push(new Float64Array(d));
  }
  for (let r = 0; r < 2 * N; r++) {
    const wr = w(r),
      Pr = P[r];
    for (let a = 0; a < d; a++) {
      if (Pr[a] === 0) continue;
      const pa = Pr[a] * wr;
      for (let b = 0; b < d; b++) M[a][b] += pa * Pr[b];
    }
  }
  for (let k = 0; k < N; k++) M[2 + k][2 + k] += I[k];
  const vG = P.map(r => {
    let s = 0;
    for (let a = 0; a < d; a++) s += r[a] * qd[a];
    return s;
  });
  const Pd = R.map(r => {
    const o = new Float64Array(d);
    for (let i = 0; i < N; i++) o[2 + i] = r[2 + i] * thd[i];
    return o;
  });
  const PdQ = Pd.map(r => {
    let s = 0;
    for (let a = 0; a < d; a++) s += r[a] * qd[a];
    return s;
  });
  const C = new Float64Array(d);
  for (let r = 0; r < 2 * N; r++) {
    const wr = w(r);
    for (let a = 0; a < d; a++) {
      C[a] += Pd[r][a] * wr * vG[r] + P[r][a] * wr * PdQ[r] - qd[a] * R[r][a] * wr * vG[r];
    }
  }
  const vA = PA.map(r => {
    let s = 0;
    for (let a = 0; a < d; a++) s += r[a] * qd[a];
    return s;
  });
  const F = Array(N),
    tau = new Float64Array(d),
    Mzv = new Float64Array(N),
    Fnv = new Float64Array(N),
    Fnl = new Float64Array(N),
    Sgv = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    const vx = nx[k] * vA[2 * k] + ny[k] * vA[2 * k + 1],
      vy = -ny[k] * vA[2 * k] + nx[k] * vA[2 * k + 1];
    const dk = k == 0 ? delta0 : 0,
      beta = Math.atan2(vy, vx);
    if (mod.sat) {
      const Fzp = m[k] * 9.81 / nbP[k],
        Fty = mu => {
          const Fcap = mu * Fzp,
            Fb = Math.max(Fcap * nbBr[k], 1e-9),
            Fn = Math.max(Fcap * (nbP[k] - nbBr[k]), 1e-9);
          return Fb * Math.tanh(Kt * nbBr[k] * (dk - beta) / Fb) + Fn * Math.tanh(Kt * (nbP[k] - nbBr[k]) * (-beta) / Fn);
        }, // plafond d'adhérence μ·Fz
        mu0 = (mod.muAx && mod.muAx[k] !== undefined) ? mod.muAx[k] : mod.fymax > 0 ? mod.fymax / Fzp : mod.mu,
        ms = mod.muSide ? mod.muSide[k] : null;
      F[k] = ms ? 0.5 * (Fty(ms.L !== undefined ? Math.min(mu0, ms.L) : mu0) + Fty(ms.R !== undefined ? Math.min(mu0, ms.R) : mu0)) : Fty(mu0);
    } // adhérence d'un seul côté : la moitié des pneus de l'essieu de chaque côté
    else F[k] = Kt * nbBr[k] * (dk - beta) + Kt * (nbP[k] - nbBr[k]) * (-beta); // effort latéral dans le repère du pneu (loi linéaire)
    {
      const m0 = ctl && ctl.mot ? ctl.mot[k] : null;
      if (m0 && m0.ktf !== undefined) F[k] *= m0.ktf;
    } // crevaison : l'essieu perd une partie de ses pneus
    // vectoring décentralisé (roues intérieures) : la portion k n'utilise que sa vitesse, son lacet et l'articulation en amont
    const mk = ctl && ctl.mot ? ctl.mot[k] : null,
      alive = mk ? ((mk.L ? 0 : 1) + (mk.R ? 0 : 1)) / 2 : 1; // moteurs-roues encore en service sur cette portion
    let Flk = Fl * alive;
    if (mk && mk.noTrac && Flk > 0) Flk = 0; // batterie vide : la portion ne fournit plus de traction
    if (ctl && ctl.vec && k >= (lockFirst ? 2 : 1)) {
      const Vc = ctl.vec,
        ps = th[k - 1] - th[k],
        psd = thd[k - 1] - thd[k],
        wst = (Math.max((mk && mk.enc) ? 0 : vx, 0.5) / Math.max(lJA[k], 0.3)) * Math.sin(ps),
        thm = mk ? (mk.gl ? 0 : thd[k] + (mk.gb || 0)) : thd[k]; // thm : lacet mesuré (gyroscope éventuellement en défaut)   // lacet cinématique de référence
      const gv = Vc.vmin > 0 ? Math.max(0, Math.min(1, (Math.abs(vx) * 3.6 - Vc.vmin) / Math.max(1, 0.4 * Vc.vmin))) : 1, // activation progressive au-dessus d'une vitesse minimale (de vmin à 1,4·vmin)
        ek = k == N - 1 ? (Vc.et || Vc.e) : Vc.e,
        Mz = gv * I[k] * (Vc.kw * (wst - thm) + Vc.kd * psd),
        s = wst >= 0 ? 1 : -1,
        Fzp = m[k] * 9.81 / nbP[k],
        Fy = F[k] / nbP[k],
        Fcp = mod.fymax > 0 ? mod.fymax : mod.mu * Fzp,
        msd = mod.muSide ? mod.muSide[k] : null,
        FfrS = u => {
          const Fc2 = (msd && msd[u] !== undefined) ? Math.min(Fcp, msd[u] * Fzp) : Fcp;
          return Math.sqrt(Math.max(0, Fc2 * Fc2 - Fy * Fy));
        };
      const Ffr = FfrS('L'),
        FfrR = FfrS('R'),
        vk = Math.abs(vx) * 3.6, // cercle de frottement ; vitesse de la portion (km/h)
        Tq = dir => {
          let T = Vc.tab && typeof Tmot === 'function' ? Tmot(vk, dir, Vc.reg) : Vc.Tmot;
          if (ctl.drv) T *= ctl.drv.tqf;
          if (mk) {
            if (dir < 0 && mk.regOff) T = 0;
            if (dir > 0 && mk.noTrac) T = 0;
          }
          return T;
        }, // couple moteur max (courbes mesurées en traction et en régénération, ou constant)
        cwl = (ctl.Fc !== undefined ? ctl.Fc : ctl.Fd) / N / 2, // effort moteur commun (régulation de vitesse, décélération) par roue motrice : il consomme déjà une part de la capacité du moteur
        capT = (Vc.nw || 1) * Tq(1) / Vc.reff,
        capB = (Vc.nw || 1) * Tq(-1) / Vc.reff, // capacité des moteurs, limitée côté par côté par le cercle de frottement
        FtL = Math.max(0, Math.min(capT, (Vc.nw || 1) * Ffr) - Math.max(0, cwl)),
        FtR = Math.max(0, Math.min(capT, (Vc.nw || 1) * FfrR) - Math.max(0, cwl)),
        FbLw = Math.max(0, Math.min(capB, (Vc.nw || 1) * Ffr) - Math.max(0, -cwl)),
        FbRw = Math.max(0, Math.min(capB, (Vc.nw || 1) * FfrR) - Math.max(0, -cwl)); // le vectoring ne dispose que de la capacité restante (traction ou régénération, jamais de freinage mécanique)   // force max en traction / en freinage, par roue motrice (un pneu intérieur par côté)
      // allocation : freinage récupératif d'abord (roue du côté vers lequel tourne la portion) ; si la limite de régénération ne suffit pas,
      // la roue de l'autre côté passe en traction pour compléter le moment demandé
      const mm = Math.abs(Mz) / ek,
        sg = Mz >= 0 ? 1 : -1,
        FbL = (mk && mk.L) ? 0 : FbLw,
        FbR = (mk && mk.R) ? 0 : FbRw,
        FtLx = (mk && mk.L) ? 0 : FtL,
        FtRx = (mk && mk.R) ? 0 : FtR;
      const a = Math.min(mm, sg > 0 ? FbL : FbR),
        b = Math.min(mm - a, sg > 0 ? FtRx : FtLx),
        Mk = sg * ek * (a + b); // Mz>0 : roue gauche en freinage (-a), roue droite en traction (+b) ; une roue en panne ne donne plus rien
      Flk += (b - a);
      tau[2 + k] += Mk;
      Mzv[k] = Mk;
      Fnv[k] = sg > 0 ? b : -a;
      Fnl[k] = sg > 0 ? -a : b;
      Sgv[k] = 0;
    }
    if (mk && (mk.fl != null || mk.fr != null || mk.dl || mk.dr)) {
      const ekp = (ctl && ctl.vec ? (k == N - 1 ? (ctl.vec.et || ctl.vec.e) : ctl.vec.e) : 0.46),
        FLp = (mk.fl != null ? mk.fl : 0) - (mk.dl || 0),
        FRp = (mk.fr != null ? mk.fr : 0) - (mk.dr || 0);
      Flk += FLp + FRp;
      tau[2 + k] += ekp * (FRp - FLp);
    } // forces parasites : couple bloqué ou frein traînant d'une roue (moment de lacet = demi-voie x différence droite-gauche)
    const cd = Math.cos(dk),
      sd = Math.sin(dk),
      Fn = cd * Flk - sd * F[k],
      Fu = sd * Flk + cd * F[k];
    for (let a = 0; a < d; a++) tau[a] += Fn * (nx[k] * PA[2 * k][a] + ny[k] * PA[2 * k + 1][a]) + Fu * (-ny[k] * PA[2 * k][a] + nx[k] * PA[2 * k + 1][a]);
  }
  for (let k = 0; k < n; k++) {
    let Ma;
    if (ctl && ctl.Mart) Ma = ctl.Mart[k]; // couple fourni par la dynamique des vérins
    else {
      const wrd = Math.abs(thd[k + 1] - thd[k]) * 0.147,
        rm0 = ctl && ctl.rodMin > 0 ? ctl.rodMin : 0,
        gR = rm0 > 0 ? Math.max(0, Math.min(1, (wrd - rm0) / rm0)) : 1; // 0,147 m : bras de levier moyen de l'articulation
      Ma = ck[k] * (thd[k + 1] - thd[k]) * (ctl && ctl.vgate !== undefined ? ctl.vgate : 1) * gR;
      const ms = ctl && ctl.Mmax;
      if (ms) Ma = Math.max(-ms, Math.min(ms, Ma));
    } // couple amortisseur idéal, saturé à ± Mmax
    tau[2 + k] += Ma;
    tau[3 + k] -= Ma;
  }
  const f = new Float64Array(d);
  for (let a = 0; a < d; a++) f[a] = -C[a] + tau[a];
  if (ctl && ctl.gslope) {
    const gy = ctl.gslope;
    for (let k = 0; k < N; k++)
      for (let a = 0; a < d; a++) f[a] += m[k] * gy * P[2 * k + 1][a];
  } // dévers : force de pesanteur latérale appliquée au centre de gravité de chaque portion
  const lkA = ctl && ctl.locks ? ctl.locks : (lockFirst ? [true] : []);
  const map = [0, 1];
  let g = 0;
  for (let k = 0; k < N; k++) {
    if (k > 0 && !lkA[k - 1]) g++;
    map.push(2 + g);
  }
  const nr = 2 + g + 1,
    Mr = [],
    fr = new Float64Array(nr);
  for (let a = 0; a < nr; a++) Mr.push(new Float64Array(nr));
  for (let a = 0; a < d; a++) {
    fr[map[a]] += f[a];
    for (let b = 0; b < d; b++) Mr[map[a]][map[b]] += M[a][b];
  }
  const sol = solveLin(Mr, fr),
    qdd = new Float64Array(d);
  for (let a = 0; a < d; a++) qdd[a] = sol[map[a]];
  const dX = new Float64Array(2 * d);
  for (let a = 0; a < d; a++) {
    dX[a] = qd[a];
    dX[d + a] = qdd[a];
  }
  return {
    dX,
    F,
    Mz: Mzv,
    Fin: Fnv,
    Fl: Fnl,
    Sg: Sgv
  };
}

function geomPoints(mod, X) {
  const {
    n,
    N,
    lJJ,
    lJG,
    lJA
  } = mod, d = n + 3, th = Array.from(X.slice(2, d)), cur = [X[0], X[1]], J = [], G = [], A = [];
  for (let k = 0; k < N; k++) {
    const nk = [Math.cos(th[k]), Math.sin(th[k])];
    J.push(cur.slice());
    G.push([cur[0] - lJG[k] * nk[0], cur[1] - lJG[k] * nk[1]]);
    A.push([cur[0] - lJA[k] * nk[0], cur[1] - lJA[k] * nk[1]]);
    cur[0] -= lJJ[k] * nk[0];
    cur[1] -= lJJ[k] * nk[1];
  }
  J.push(cur.slice());
  return {
    th,
    J,
    G,
    A
  };
}

// ===== boucle ouverte : ligne droite, braquage nul =====
function simulate(o) {
  const mod = buildModel(o.N, o.params),
    {
      n,
      N
    } = mod,
    d = n + 3,
    V = o.V / 3.6;
  let X = new Float64Array(2 * d);
  X[d] = V;
  const a0 = o.amp * Math.PI / 180;
  const setth = k => {
    X[2 + k] = a0;
    if (o.lock && k == 0) X[3] = a0;
  };
  setth(o.pert == 'tail' ? N - 1 : 0);
  const dt = o.V < 10 ? 0.001 : 0.002,
    every = Math.round(0.02 / dt),
    steps = Math.round(o.T / dt);
  const add = (x, k, s) => {
    const y = new Float64Array(x.length);
    for (let i = 0; i < x.length; i++) y[i] = x[i] + k * s[i];
    return y;
  };
  const fr = [];
  let amax0 = 0,
    amax = 0,
    stop = '';
  const steer = o.steer || (() => 0);
  const snap = (X, t) => {
    const dl = steer(t),
      g = geomPoints(mod, X),
      F = dynamics(mod, Array.from(X), o.c, o.lock, {
        delta0: dl,
        Fd: 0
      }).F;
    return {
      t: +t.toFixed(4),
      J: g.J,
      G: g.G,
      A: g.A,
      th: g.th,
      F: F.map(x => +x.toFixed(1)),
      dl
    };
  };
  for (let i = 0; i <= steps; i++) {
    if (i % every === 0) {
      const s = snap(X, i * dt);
      fr.push(s);
      const m = Math.max(...s.th.map(Math.abs));
      if (i == 0) amax0 = m;
      amax = m;
      if (!isFinite(m)) {
        stop = 'nan';
        fr.pop();
        break;
      }
      if (m > 1.5) {
        stop = 'large';
        break;
      }
    }
    const tt = i * dt,
      f = (x, t2) => dynamics(mod, Array.from(x), o.c, o.lock, {
        delta0: steer(t2),
        Fd: 0
      }).dX;
    const k1 = f(X, tt),
      k2 = f(add(X, dt / 2, k1), tt + dt / 2),
      k3 = f(add(X, dt / 2, k2), tt + dt / 2),
      k4 = f(add(X, dt, k3), tt + dt);
    for (let j = 0; j < X.length; j++) X[j] += dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
  }
  return {
    frames: fr,
    amp0: amax0 * 180 / Math.PI,
    amp: amax * 180 / Math.PI,
    stop
  };
}

// ===== boucle fermée : trajectoires de référence =====
const DS = 0.05;

function pathFromPoly(pts) {
  const xs = pts.map(p => p[0]),
    ys = pts.map(p => p[1]),
    n = xs.length,
    psi = [];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1),
      b = Math.min(n - 1, i + 1);
    psi.push(Math.atan2(ys[b] - ys[a], xs[b] - xs[a]));
  }
  for (let i = 1; i < n; i++) {
    while (psi[i] - psi[i - 1] > Math.PI) psi[i] -= 2 * Math.PI;
    while (psi[i] - psi[i - 1] < -Math.PI) psi[i] += 2 * Math.PI;
  }
  const sArr = [0];
  for (let i = 1; i < n; i++) sArr.push(sArr[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
  return {
    xs,
    ys,
    psi,
    n,
    s: sArr
  };
}
const ramp = (x, a, b) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return 0.5 * (1 - Math.cos(Math.PI * u));
};

function y3Axis(y1, y3, W1, W3, mode, b) {
  return mode == 'bords' ? y3 + (W3 - b) / 2 : y3;
}

function y5Axis(y5, W5, W1, mode, b) {
  return mode == 'bords' ? y5 - (W5 - b) / 2 : y5;
}
// circuit urbain : liste de segments ['S',longueur] (droite) et ['T',angle en degrés (+ gauche),rayon] (virage)
const URBAN_STD = [
  ['S', 80],
  ['T', -90, 10],
  ['S', 45],
  ['T', 90, 10],
  ['S', 30],
  ['T', 40, 15],
  ['T', -80, 15],
  ['T', 40, 15],
  ['S', 100],
  ['T', -180, 13],
  ['S', 60],
  ['T', 90, 9],
  ['S', 35],
  ['T', 90, 10],
  ['S', 50],
  ['T', -90, 9],
  ['S', 35],
  ['T', 90, 9],
  ['S', 50]
];

function urbanPoints(segs, ds) {
  let x = 0,
    y = 0,
    h = 0;
  const pts = [
    [x, y]
  ];
  for (const sg of segs) {
    if (sg[0] == 'S') {
      const n = Math.max(1, Math.round(sg[1] / ds)),
        dl = sg[1] / n;
      for (let i = 0; i < n; i++) {
        x += dl * Math.cos(h);
        y += dl * Math.sin(h);
        pts.push([x, y]);
      }
    } else {
      const a = sg[1] * Math.PI / 180,
        R = sg[2],
        s = a > 0 ? 1 : -1,
        n = Math.max(2, Math.round(Math.abs(a) * R / ds)),
        da = a / n;
      for (let i = 0; i < n; i++) {
        const xc = x - s * R * Math.sin(h),
          yc = y + s * R * Math.cos(h);
        h += da;
        x = xc + s * R * Math.sin(h);
        y = yc - s * R * Math.cos(h);
        pts.push([x, y]);
      }
    }
  }
  return pts;
}

function urbanRandom(seed) { // tirage d'un circuit sans croisement : intersections, chicanes, ronds-points, lignes droites ; graine reproductible
  const rng = a => () => {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  for (let essai = 0; essai < 200; essai++) {
    const R = rng(seed * 7919 + essai * 104729 + 17),
      u = (a, b) => a + R() * (b - a),
      segs = [
        ['S', Math.round(u(70, 110))]
      ];
    const ne = 7 + Math.floor(R() * 4);
    for (let i = 0; i < ne; i++) {
      const q = R(),
        sg = R() < 0.5 ? 1 : -1;
      if (q < 0.50) segs.push(['T', sg * 90, Math.round(u(8, 12))]);
      else if (q < 0.68) {
        const a = Math.round(u(30, 45)),
          r = Math.round(u(13, 17));
        segs.push(['T', sg * a, r], ['T', -sg * 2 * a, r], ['T', sg * a, r]);
      } else if (q < 0.80) segs.push(['T', sg * 180, Math.round(u(11, 14))]);
      else segs.push(['T', sg * Math.round(u(40, 70)), Math.round(u(12, 18))]);
      segs.push(['S', Math.round(u(30, 90))]);
    }
    const pts = urbanPoints(segs, 1),
      cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    let ok = cum[cum.length - 1] > 350 && cum[cum.length - 1] < 900;
    for (let i = 0; ok && i < pts.length; i += 3)
      for (let j = i; j < pts.length; j += 3)
        if (cum[j] - cum[i] > 40 && Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) < 14) {
          ok = false;
          break;
        }
    if (ok) return segs;
  }
  return URBAN_STD;
}

function makePath(tr) {
  const pts = [];
  if (tr.type == 'line') {
    for (let x = 0; x <= tr.len; x += DS) pts.push([x, 0]);
    return {
      ...pathFromPoly(pts),
      cones: []
    };
  } // ligne droite
  if (tr.type == 'elk') { // double changement de voie (test de l'élan)
    const x1 = tr.lead,
      x2 = x1 + tr.Lr,
      x3 = x2 + tr.Lh,
      x4 = x3 + (tr.Lret || tr.Lr),
      xe = x4 + tr.tail;
    for (let x = 0; x <= xe; x += DS) pts.push([x, tr.A * (ramp(x, x1, x2) - ramp(x, x3, x4))]);
    return {
      ...pathFromPoly(pts),
      cones: [],
      info: {
        x1,
        x2,
        x3,
        x4
      }
    };
  }
  if (tr.type == 'elkiso') { // ISO 3888-2 : couloirs de plots (voir trajectoires/refELK.m)
    const b = tr.b || 1.5,
      x0 = tr.x0 || 25,
      W1 = 1.1 * b + 0.25,
      W3 = b + 1,
      W5 = Math.max(1.3 * b + 0.25, 3);
    let y1 = 0,
      y3 = W1 / 2 + 1 + W3 / 2,
      y5 = (W5 - W1) / 2;
    if (tr.mode == 'bords') {
      y1 += (W1 - b) / 2;
      y3 -= (W3 - b) / 2;
      y5 += (W5 - b) / 2;
    }
    const xa = x0 + 12,
      xb = xa + 13.5,
      xc = xb + 11,
      xd = xc + 12.5,
      xe = xd + 12 + (tr.tail || 25);
    const sm = u => {
      u = Math.min(1, Math.max(0, u));
      return 10 * u ** 3 - 15 * u ** 4 + 6 * u ** 5;
    };
    for (let x = 0; x <= xe; x += DS) pts.push([x, y1 * sm((x - (x0 - 20)) / 20) + (y3 - y1) * sm((x - xa) / (xb - xa)) + (y5 - y3) * sm((x - xc) / (xd - xc))]);
    // plots : début, milieu et fin de chaque couloir (1, 3 et 5), de part et d'autre
    const cones = [];
    for (const [xs, xf, yc, W] of [
        [x0, xa, 0, W1],
        [xb, xc, y3Axis(y1, y3, W1, W3, tr.mode, b), W3],
        [xd, xd + 12, y5Axis(y5, W5, W1, tr.mode, b), W5]
      ])
      for (const xx of [xs, (xs + xf) / 2, xf])
        for (const sg of [1, -1]) cones.push([xx, yc + sg * W / 2]);
    const P0 = pathFromPoly(pts); // gaz relâchés à l'entrée du premier couloir (ISO 3888-2) : la vitesse V est la vitesse d'approche, pas une consigne
    return {
      ...P0,
      cones,
      gate: true,
      bveh: b,
      sRelease: P0.s[Math.min(P0.n - 1, Math.round(x0 / DS))],
      info: {
        x0,
        xa,
        xb,
        xc,
        xd,
        W1,
        W3,
        W5
      }
    };
  }
  if (tr.type == 'urban') { // circuit urbain : intersections, chicane, demi-tour de rond-point, virages serrés ; plots de part et d'autre de la voie
    const segs0 = tr.mode == 'rand' ? urbanRandom(tr.seed || 1) : URBAN_STD,
      segs = segs0.map((s, i) => i == segs0.length - 1 && s[0] == 'S' ? ['S', s[1] + (tr.tail || 0)] : s);
    for (const q of urbanPoints(segs, DS)) pts.push(q);
    const P0 = pathFromPoly(pts),
      W = tr.W || 3.2,
      cones = [];
    for (let s = 6; s < P0.s[P0.n - 1] - 6; s += 4) {
      let j = 0;
      while (j < P0.n - 2 && P0.s[j] < s) j++;
      const tx = P0.xs[j + 1] - P0.xs[j],
        ty = P0.ys[j + 1] - P0.ys[j],
        tl = Math.hypot(tx, ty) || 1;
      for (const sg of [1, -1]) cones.push([P0.xs[j] - sg * W / 2 * ty / tl, P0.ys[j] + sg * W / 2 * tx / tl]);
    }
    const kap = new Float64Array(P0.n),
      w = 40;
    for (let i = 1; i < P0.n - 1; i++) kap[i] = (P0.psi[i + 1] - P0.psi[i - 1]) / Math.max(1e-6, P0.s[i + 1] - P0.s[i - 1]);
    const ks = new Float64Array(P0.n);
    for (let i = 0; i < P0.n; i++) {
      let a = 0,
        c = 0;
      for (let j = Math.max(0, i - w); j <= Math.min(P0.n - 1, i + w); j += 4) {
        a += Math.abs(kap[j]);
        c++;
      }
      ks[i] = a / c;
    }
    return {
      ...P0,
      cones,
      gate: true,
      gateN: cones.length,
      bveh: 1.5,
      laneW: W,
      kappa: ks
    };
  }
  if (tr.type == 'slalom') { // slalom entre plots alignés, espacés de lam
    // plots sur l'axe, à l'abscisse de chaque maximum d'amplitude de la trajectoire (lead + (i-1/2) lam) : le convoi les contourne alternativement par la gauche et par la droite
    const xe = tr.lead + tr.lam * (tr.ncones + 1),
      cones = [];
    for (let i = 1; i <= tr.ncones; i++) cones.push([tr.lead + (i - 0.5) * tr.lam, 0]);
    const sm = u => {
      u = Math.min(1, Math.max(0, u));
      return 10 * u ** 3 - 15 * u ** 4 + 6 * u ** 5;
    }; // l'amplitude atteint sa valeur A dès le premier maximum
    for (let x = 0; x <= xe; x += DS) {
      const env = sm((x - tr.lead) / (tr.lam / 2));
      pts.push([x, env * tr.A * Math.sin(Math.PI * (x - tr.lead) / tr.lam)]);
    }
    if (tr.tail > 0) {
      const sl = tr.A * Math.PI / tr.lam * ((tr.ncones + 1) % 2 ? -1 : 1),
        y0 = pts[pts.length - 1][1],
        x0 = pts[pts.length - 1][0],
        Ls = Math.min(10, tr.tail); // sortie : le cap revient progressivement à l'axe sur Ls, puis ligne droite
      for (let u = DS; u <= tr.tail; u += DS) {
        const w = Math.min(u, Ls);
        pts.push([x0 + u, y0 + sl * (w - w * w / (2 * Ls))]);
      }
    }
    return {
      ...pathFromPoly(pts),
      cones,
      gate: true,
      gateN: cones.length,
      bveh: 1.5
    };
  } // plots touchés comptés comme pour les autres trajectoires (portions de largeur 1,5 m)
  // virage : entrée droite, arc de rayon R sur un angle alpha, sortie droite
  const a = tr.alpha * Math.PI / 180,
    s = tr.dir;
  for (let x = 0; x < tr.lead; x += DS) pts.push([x, 0]);
  const na = Math.max(2, Math.round(tr.R * a / DS));
  for (let i = 0; i <= na; i++) {
    const t = a * i / na;
    pts.push([tr.lead + tr.R * Math.sin(t), s * tr.R * (1 - Math.cos(t))]);
  }
  const [x1, y1] = pts[pts.length - 1];
  for (let x = DS; x <= tr.tail; x += DS) pts.push([x1 + x * Math.cos(s * a), y1 + x * Math.sin(s * a)]);
  const P0 = pathFromPoly(pts),
    cones = [],
    W = tr.W || 0;
  if (W > 0) {
    const sa = Math.max(0, tr.lead - 8),
      sb = tr.lead + tr.R * a + 8,
      step = 4; // plots de part et d'autre de la voie (largeur W) autour du virage
    for (let s = sa; s <= sb; s += step) {
      let j = 0;
      while (j < P0.n - 2 && P0.s[j] < s) j++;
      const tx = P0.xs[j + 1] - P0.xs[j],
        ty = P0.ys[j + 1] - P0.ys[j],
        tl = Math.hypot(tx, ty) || 1;
      for (const sg of [1, -1]) cones.push([P0.xs[j] - sg * W / 2 * ty / tl, P0.ys[j] + sg * W / 2 * tx / tl]);
    }
  }
  return {
    ...P0,
    sArc0: tr.lead,
    sArc1: tr.lead + tr.R * a,
    cones,
    gate: W > 0,
    gateN: cones.length,
    bveh: 1.5,
    laneW: W,
    sRelease: tr.release ? tr.lead : undefined
  };
} // release : gaz relâchés à l'entrée du virage (ISO 9816)

// pilote : loi de Stanley appliquée à l'essieu de tête (J1 = A1), saturée à ±35°
function evOff(E, s) {
  const hs = x => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, x)));
  return E.side * E.A * (hs((s - (E.s - 4 - E.Lr)) / E.Lr) - hs((s - E.s - 4) / E.Lr));
} // décalage géométrique : en place 4 m avant l'obstacle, maintenu jusqu'à 4 m après, puis retour
function makePilot(path, gain, dmax, spd) {
  let idx = 0;
  const hs = x => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, x))),
    offAt = (s, sh) => {
      let o = 0;
      if (spd && spd.ev)
        for (const E of spd.ev)
          if (E.type == 'ev' && E.sT !== undefined && (sh === undefined ? s : sh) >= E.sT) o += evOff(E, s);
      return o;
    }; // évitement : décalage latéral de la trajectoire de référence, actif après l'apparition et le temps de réaction
  return {
    ctl(X, d, V, flt) {
      const px = X[0],
        py = X[1],
        th1 = X[2],
        v = X[d] * Math.cos(th1) + X[d + 1] * Math.sin(th1);
      let j = idx;
      const dist = k => Math.hypot(path.xs[k] - px, path.ys[k] - py);
      while (j + 1 < path.n && dist(j + 1) < dist(j)) j++;
      idx = j;
      let e = (px - path.xs[j]) * (-Math.sin(path.psi[j])) + (py - path.ys[j]) * Math.cos(path.psi[j]);
      let he = path.psi[j] - th1;
      while (he > Math.PI) he -= 2 * Math.PI;
      while (he < -Math.PI) he += 2 * Math.PI;
      if (spd && spd.ev) {
        const o0 = offAt(path.s[j]);
        e -= o0;
        he += Math.atan((offAt(path.s[j] + 0.5) - o0) / 0.5);
      }
      let em = e,
        hm = he,
        dm = dmax;
      if (flt) {
        if (flt.eHold !== null) em = flt.eHold;
        else em = e + (flt.eb || 0);
        if (flt.hHold !== null) hm = flt.hHold;
        else hm = he + (flt.hb || 0);
        if (flt.lost) {
          em = 0;
          hm = 0;
        }
      }
      const dl = Math.max(-dm, Math.min(dm, hm + Math.atan2(-gain * em, 1 + Math.max(v, 0))));
      let vref = V,
        aref = 0;
      const rp = spd && spd.ramp;
      if (rp) {
        const dsr = Math.max(0, path.s[j] - rp.s0),
          vr = Math.sqrt(V * V + 2 * rp.a * dsr);
        vref = Math.min(rp.V1, vr);
        aref = vr < rp.V1 ? rp.a : 0;
      } // vitesse croissante le long du cercle
      if (spd && spd.vprof) {
        const vp = spd.vprof,
          j2 = Math.min(path.n - 1, j + 1);
        vref = vp[j];
        aref = (vp[j2] * vp[j2] - vp[j] * vp[j]) / (2 * Math.max(1e-3, path.s[j2] - path.s[j]));
      }
      const br = spd && spd.brake;
      if (br) {
        const ds = path.s[j] - br.sb;
        if (ds > 0) {
          const v2 = V * V - 2 * br.a * ds;
          if (v2 > br.Vend * br.Vend) {
            vref = Math.sqrt(v2);
            aref = -br.a;
          } else vref = br.Vend;
        }
      }
      const coast = spd && spd.rel !== undefined && path.s[j] >= spd.rel,
        vmin = Math.min(15 / 3.6, V); // gaz relâchés : plus de régulation de vitesse, sauf reprise des gaz sous 15 km/h
      let Fd = coast ? (v < vmin ? 5000 * (vmin - v) : 0) : 5000 * (vref - v) + (spd ? spd.M * aref : 0),
        liftF = 0;
      if (spd && spd.lift && spd.lift.pct > 0 && typeof Tmot === 'function' && v >= vmin) {
        const cap = -spd.lift.pct / 100 * spd.lift.nMot * Tmot(v * 3.6, -1, spd.lift.reg) / spd.lift.reff; // décélération du lever de pédale (régénération)
        let anti = false; // le conducteur lève le pied environ 3 s avant la zone de freinage (virage à venir, début de freinage)
        if (spd.vprof) {
          let k = j;
          const sT = path.s[j] + 3 * v;
          while (k + 1 < path.n && path.s[k] < sT) k++;
          anti = spd.vprof[k] < v - 0.5;
        }
        if (br) anti = anti || (path.s[j] - br.sb > -3 * v && path.s[j] - br.sb <= 0);
        if (coast || (anti && Fd > cap)) {
          liftF = cap;
          Fd = cap;
        } else if (Fd < 0 && Fd >= cap) liftF = Fd;
      } // hors roue libre : une décélération demandée dans cette limite reste en récupération ; au-delà, la pédale de frein est enfoncée et tout le freinage est mécanique   // récupération au lever de pédale : fraction de la régénération maximale à la vitesse courante
      let emerg = 0,
        emergE = null;
      if (spd && spd.ev) {
        const sh = path.s[j]; // événements d'urgence : apparition à dApp devant l'obstacle ; après le temps de réaction (distance parcourue), freinage mécanique (piéton) ou écart latéral (évitement)
        for (const E of spd.ev) {
          if (E.sT === undefined && sh >= E.s - E.dApp) {
            E.sT = sh + Math.max(v, 0) * E.tr;
            E.vApp = v;
          }
          if (E.type == 'ped' && E.sT !== undefined && sh >= E.sT && !E.go) {
            emerg = 1;
            emergE = E;
          }
        }
        if (emerg) {
          liftF = 0;
          Fd = -spd.M * emergE.aE * Math.min(1, Math.max(v, 0) / 0.4);
        }
      }
      const Fc = Fd; // Fc : effort demandé aux moteurs (sans la résistance au roulement)
      if (spd && spd.Crr) Fd -= spd.Crr * spd.M * 9.81 * Math.tanh(v / 0.3); // résistance au roulement
      return {
        delta0: dl,
        Fd,
        Fc,
        e,
        he,
        j,
        v,
        vref,
        coast,
        liftF,
        emerg,
        emergE
      };
    },
    offAt,
    get idx() {
      return idx;
    },
    reset() {
      idx = 0;
    }
  };
}

function emergPlace(path, seed, nEv, types, V) {
  let s = (Math.floor(seed) * 2654435761 + 12345) >>> 0;
  const r = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  r();
  r(); // tirage reproductible
  const L = path.s[path.n - 1],
    evs = [],
    idxAt = x => {
      let j = 0;
      while (j < path.n - 2 && path.s[j] < x) j++;
      return j;
    },
    ok = x => {
      if (!path.kappa) return true;
      for (let d = -30; d <= 30; d += 6)
        if (path.kappa[idxAt(Math.max(0, Math.min(L, x + d)))] > 1 / 60) return false;
      return true;
    }; // de préférence en ligne droite
  for (let i = 0; i < nEv; i++)
    for (let tr = 0; tr < 60; tr++) {
      const sp = 70 + r() * Math.max(10, L - 140);
      if (evs.every(e => Math.abs(e.s - sp) > 90) && (ok(sp) || tr >= 40)) {
        const j = idxAt(sp),
          ty = types[Math.floor(r() * types.length)] || 'ped',
          off = ty == 'ped' ? (r() - 0.5) * 1.6 : 0,
          side = r() < 0.5 ? -1 : 1,
          ps = path.psi[j];
        evs.push({
          type: ty,
          s: path.s[j],
          off,
          side,
          psi: ps,
          x: path.xs[j] - off * Math.sin(ps),
          y: path.ys[j] + off * Math.cos(ps),
          r: ty == 'ped' ? 0.25 : 0.4,
          Lr: Math.max(14, 1.8 * Math.max(3, path.vprof ? path.vprof[j] : (V || 12)))
        });
        break;
      }
    }
  return evs.sort((p, q) => p.s - q.s);
} // piéton : décalé de ±0,8 m par rapport à l'axe ; obstacle d'évitement : sur l'axe, 2,4 m de long
function liftFix(c, drv) {
  if (c.liftF && drv && !c.coast && drv.regFrac < 1) c.liftF = 0;
  if (c.liftF && drv && c.coast) {
    const s = drv.tqf * drv.regFrac,
      d = c.liftF * (1 - s);
    c.Fd -= d;
    c.Fc -= d;
  }
} // régénération indisponible ou limitée par un défaut
function crossTrack(path, P, j0) {
  let best = 1e9,
    bj = j0,
    sg = 1;
  const a = Math.max(0, j0 - 600),
    b = Math.min(path.n - 1, j0 + 60);
  for (let k = a; k <= b; k++) {
    const dd = Math.hypot(path.xs[k] - P[0], path.ys[k] - P[1]);
    if (dd < best) {
      best = dd;
      bj = k;
    }
  }
  const s = (P[0] - path.xs[bj]) * (-Math.sin(path.psi[bj])) + (P[1] - path.ys[bj]) * Math.cos(path.psi[bj]);
  crossTrack.last = bj;
  return s;
}
// plots touchés : chaque portion est un rectangle (largeur b) de l'articulation avant vers l'arrière ; plot = disque de rayon r
function coneHits(frames, cones, b, L, r) {
  const N = frames.length ? frames[0].th.length : 0,
    t = cones.map(() => null);
  r = r || 0.15;
  for (const f of frames)
    for (let k = 0; k < N; k++) {
      const c = Math.cos(f.th[k]),
        s = Math.sin(f.th[k]),
        len = (k == 0 || k == N - 1) ? L / 2 : L;
      cones.forEach((p, i) => {
        if (t[i] !== null) return;
        const dx = p[0] - f.J[k][0],
          dy = p[1] - f.J[k][1],
          u = dx * c + dy * s,
          v = -dx * s + dy * c;
        if (u >= -len - r && u <= 0.09 + r && Math.abs(v) <= b / 2 + r) t[i] = f.t;
      });
    }
  return {
    t,
    n: cones.length,
    hit: t.filter(x => x !== null).length
  };
}
// braquage imposé (essais de volant) : échelon, impulsion, sinus, balayage (chirp), sinus avec palier (sine with dwell)
function steerSignal(st, t) {
  const sm = (x, w) => x <= 0 ? 0 : x >= w ? 1 : 0.5 * (1 - Math.cos(Math.PI * x / w)),
    A = st.amp,
    tau = t - st.t0,
    f = st.f,
    P = 2 * Math.PI;
  let d = 0;
  switch (st.kind) {
    case 'step':
      d = A * sm(tau, 0.1);
      break;
    case 'pulse':
      d = A * (sm(tau, 0.05) - sm(tau - st.dur, 0.05));
      break;
    case 'doublet':
      d = A * (sm(tau, 0.05) - 2 * sm(tau - st.dur, 0.05) + sm(tau - 2 * st.dur, 0.05));
      break; // impulsion à gauche puis impulsion à droite, de même durée
    case 'sine':
      d = tau < 0 ? 0 : A * Math.sin(P * f * tau);
      break;
    case 'chirp':
      d = (tau < 0 || tau > st.dur) ? 0 : A * Math.sin(P * (f * tau + (st.f1 - f) * tau * tau / (2 * st.dur)));
      break;
    case 'swd': {
      const t1 = 0.75 / f;
      if (tau < 0) d = 0;
      else if (tau <= t1) d = A * Math.sin(P * f * tau);
      else if (tau <= t1 + 0.5) d = -A;
      else {
        const t2 = tau - t1 - 0.5;
        d = t2 <= 0.25 / f ? -A * Math.cos(P * f * t2) : 0;
      }
      break;
    }
  }
  return Math.max(-35 * Math.PI / 180, Math.min(35 * Math.PI / 180, d));
}

function simulateClosed(o) {
  const mod = buildModel(o.N, o.params),
    {
      n,
      N
    } = mod,
    d = n + 3,
    V = o.V / 3.6,
    path = makePath(o.traj);
  const Mtot = mod.m.reduce((p, q) => p + q, 0),
    brk = o.brake ? {
      a: o.brake.a,
      Vend: o.brake.Vend / 3.6,
      sb: path.sArc0 + o.brake.frac * (path.sArc1 - path.sArc0)
    } : null;
  if (brk) {
    let j = 0;
    while (j < path.n - 2 && path.s[j] < brk.sb) j++;
    const tx = path.xs[j + 1] - path.xs[j],
      ty = path.ys[j + 1] - path.ys[j],
      tl = Math.hypot(tx, ty) || 1; // ligne au sol, en travers de la voie, au début du freinage
    const e = (path.laneW || 1.8) / 2 + 0.3;
    path.brakeLine = [
      [path.xs[j] + e * ty / tl, path.ys[j] - e * tx / tl],
      [path.xs[j] - e * ty / tl, path.ys[j] + e * tx / tl]
    ];
  }
  if (path.sRelease !== undefined) {
    let j = 0;
    while (j < path.n - 2 && path.s[j] < path.sRelease) j++;
    const tx = path.xs[j + 1] - path.xs[j],
      ty = path.ys[j + 1] - path.ys[j],
      tl = Math.hypot(tx, ty) || 1,
      e = (path.info ? path.info.W1 : 1.9) / 2 + 0.9; // marque au sol : le conducteur lâche les gaz ici
    path.releaseLine = [
      [path.xs[j] + e * ty / tl, path.ys[j] - e * tx / tl],
      [path.xs[j] - e * ty / tl, path.ys[j] + e * tx / tl]
    ];
  }
  if (o.urbanAy && path.kappa) {
    const n0 = path.n,
      vp = new Float64Array(n0),
      ay = o.urbanAy,
      vmin = 2.0; // profil de vitesse : vitesse max V, limitée en virage par ay = v²·courbure, décélération et accélération bornées
    for (let i = 0; i < n0; i++) vp[i] = Math.max(vmin, Math.min(V, Math.sqrt(ay / Math.max(path.kappa[i], 1e-4))));
    vp[0] = Math.min(vp[0], V);
    const adec = o.urbanDec || 2.5,
      aacc = o.urbanAcc || 1.2; // freinage anticipé avant chaque virage, accélération en sortie
    for (let i = n0 - 2; i >= 0; i--) vp[i] = Math.min(vp[i], Math.sqrt(vp[i + 1] * vp[i + 1] + 2 * adec * (path.s[i + 1] - path.s[i])));
    for (let i = 1; i < n0; i++) vp[i] = Math.min(vp[i], Math.sqrt(vp[i - 1] * vp[i - 1] + 2 * aacc * (path.s[i] - path.s[i - 1])));
    path.vprof = vp;
  }
  const EV = o.ev ? emergPlace(path, o.ev.seed, o.ev.n, o.ev.types, V).map(e => ({
    ...e,
    dApp: e.type == 'ped' ? o.ev.dApp : o.ev.dEv,
    tr: o.ev.tr,
    aE: o.ev.aE,
    A: o.ev.A,
    hit: false,
    tHit: null,
    vHit: null,
    dMin: 1e9
  })) : null;
  if (EV && EV.some(e => e.type == 'ev') && path.cones) {
    let jp = 0;
    path.cones = path.cones.map(cn => {
      let bj = jp,
        bd = 1e9;
      for (let k = Math.max(0, jp - 60); k < Math.min(path.n, jp + 400); k++) {
        const dd = Math.hypot(path.xs[k] - cn[0], path.ys[k] - cn[1]);
        if (dd < bd) {
          bd = dd;
          bj = k;
        }
      }
      jp = bj;
      let o = 0;
      for (const E of EV)
        if (E.type == 'ev') o += evOff(E, path.s[bj]);
      return [cn[0] - o * Math.sin(path.psi[bj]), cn[1] + o * Math.cos(path.psi[bj])];
    });
  } // les plots de la voie suivent le décalage d'évitement
  const pil = makePilot(path, o.gain, 35 * Math.PI / 180, {
    M: Mtot,
    brake: brk,
    vprof: path.vprof || null,
    rel: path.sRelease,
    ev: EV,
    lift: o.lift ? {
      pct: o.lift.pct,
      reg: o.lift.reg,
      reff: o.lift.reff,
      nMot: (N - 1) * 2
    } : null,
    Crr: o.Crr === undefined ? 0.01 : o.Crr,
    ramp: o.ramp ? {
      a: o.ramp.a,
      V1: o.ramp.V1 / 3.6,
      s0: path.sArc0 || 0
    } : null
  });
  const FR = o.faults && o.faults.length ? faultRuntime(o.faults, n, N, !!o.lock) : null;
  if (FR) {
    FR.envStart(mod);
    if (FR.F.some(f => f.type == 'env_adherence')) mod.muBase = mod.mu;
  }
  const gsl = o.slope ? -o.slope.dir * 9.81 * Math.sin(o.slope.deg * Math.PI / 180) : 0; // composante latérale de la pesanteur (dévers)
  let X = new Float64Array(2 * d);
  X[d] = V;
  if (o.init) {
    X[1] = o.init.y0 || 0;
    X[2] = (o.init.psi0 || 0) * Math.PI / 180;
  } // écart latéral et écart de cap initiaux de la tête
  const vin = o.verin ? verinInit(n, verinParams(o.vp)) : null;
  const dt = vin ? 0.0005 : (o.V < 10 ? 0.001 : 0.002),
    every = Math.round(0.03 / dt);
  let len = 0;
  for (let k = 1; k < path.n; k++) len += Math.hypot(path.xs[k] - path.xs[k - 1], path.ys[k] - path.ys[k - 1]);
  const Tmax = o.Tmax || (o.urbanAy ? Math.min(600, (len + 10) / Math.max(0.35 * V, 1.5) + 20 + (EV ? 25 * EV.filter(e => e.type == 'ped').length : 0)) : Math.min(150, (len + 10) / Math.max(brk ? brk.Vend : V, 0.5) + 4)),
    steps = Math.round(Tmax / dt);
  const add = (x, k, s) => {
    const y = new Float64Array(x.length);
    for (let i = 0; i < x.length; i++) y[i] = x[i] + k * s[i];
    return y;
  };
  let cCur = o.cFun ? o.cFun(V) : o.c,
    vF = V; // amortissement courant : constant, ou fonction de la vitesse (table d'optimisation, mise à jour pendant la simulation)
  let Mart = null,
    lkNow = null,
    motNow = null,
    drvNow = null;
  const vec = o.vec && o.vec.on ? o.vec : null;

  let tNow = 0;
  const rodM = o.vGate && o.vGate.rod > 0 ? o.vGate.rod / 1000 : 0,
    vg = o.vGate && o.vGate.vmin > 0 ? o.vGate.vmin : 0,
    gateOf = v => vg > 0 ? Math.max(0, Math.min(1, (v * 3.6 - vg) / Math.max(1, 0.4 * vg))) : 1; // pilotage des vérins seulement au-dessus d'une vitesse minimale (montée de vg à 1,4·vg)
  const f = x => {
    const xa = Array.from(x),
      c = pil.ctl(xa, d, V, FR ? FR.pflt : null);
    if (FR) c.delta0 = FR.steer(c.delta0, dt);
    if (o.steer) c.delta0 = steerSignal(o.steer, tNow);
    liftFix(c, drvNow);
    c.vgate = gateOf(c.v);
    c.rodMin = rodM;
    c.Mmax = o.Mmax || 0;
    if (Mart) c.Mart = Mart;
    if (lkNow) c.locks = lkNow;
    if (motNow) c.mot = motNow;
    if (drvNow) c.drv = drvNow;
    c.gslope = gsl;
    c.vec = vec;
    return dynamics(mod, xa, o.c, !!o.lock, c).dX;
  };
  const fr = [];
  let eh = 0,
    et = 0,
    dm = 0,
    thm = 0,
    status = 'ok';
  for (let i = 0; i <= steps; i++) {
    tNow = i * dt;
    if (o.cFun) {
      vF += (Math.max(0, X[d] * Math.cos(X[2]) + X[d + 1] * Math.sin(X[2])) - vF) * Math.min(1, dt / 0.5);
      if (i % 20 === 0) cCur = o.cFun(vF);
    }
    if (i % every === 0) {
      const xa = Array.from(X),
        c = pil.ctl(xa, d, V, FR ? FR.pflt : null),
        g = geomPoints(mod, X);
      if (FR) c.delta0 = FR.steer(c.delta0, dt);
      if (o.steer) c.delta0 = steerSignal(o.steer, tNow);
      liftFix(c, drvNow);
      c.vgate = gateOf(c.v);
      c.rodMin = rodM;
      c.Mmax = o.Mmax || 0;
      c.gslope = gsl;
      c.vec = vec;
      if (Mart) c.Mart = Mart;
      if (lkNow) c.locks = lkNow;
      if (motNow) c.mot = motNow;
      if (drvNow) c.drv = drvNow;
      const e1 = c.e,
        eN = crossTrack(path, g.A[N - 1], c.j) - (EV ? pil.offAt(path.s[crossTrack.last], path.s[c.j]) : 0);
      const dyn = dynamics(mod, xa, cCur, !!o.lock, c),
        F = dyn.F;
      eh = Math.max(eh, Math.abs(e1));
      et = Math.max(et, Math.abs(eN));
      dm = Math.max(dm, Math.abs(c.delta0));
      const rel = Math.max(...g.th.map(a => Math.abs(a - g.th[0])));
      thm = Math.max(thm, rel);
      const ckv = Array.isArray(cCur) ? cCur : Array(n).fill(cCur),
        Ma = [];
      for (let k = 0; k < n; k++) {
        const wd0 = X[d + 3 + k] - X[d + 2 + k],
          rm0 = c.rodMin > 0 ? c.rodMin : 0,
          gR = rm0 > 0 ? Math.max(0, Math.min(1, (Math.abs(wd0) * 0.147 - rm0) / rm0)) : 1;
        let m = ckv[k] * wd0 * (c.vgate !== undefined ? c.vgate : 1) * gR;
        if (o.Mmax) m = Math.max(-o.Mmax, Math.min(o.Mmax, m));
        Ma.push(+(Mart ? Mart[k] : m).toFixed(2));
      } // couple d'articulation c_k(θ̇_{k+1}-θ̇_k)
      fr.push({
        Cm: o.cFun ? Math.round(ckv.reduce((p, q) => p + q, 0) / Math.max(1, ckv.length)) : undefined,
        Fc: +c.Fc.toFixed(0),
        Em: c.emerg ? 1 : 0,
        Lr: c.liftF ? 1 : 0,
        Mzv: vec ? Array.from(dyn.Mz, x => +x.toFixed(1)) : null,
        Fnv: vec ? Array.from(dyn.Fin, x => +x.toFixed(0)) : null,
        Fnl: vec ? Array.from(dyn.Fl, x => +x.toFixed(0)) : null,
        Sgv: vec ? Array.from(dyn.Sg) : null,
        t: +(i * dt).toFixed(3),
        J: g.J,
        G: g.G,
        A: g.A,
        th: g.th,
        F: F.map(x => +x.toFixed(1)),
        dl: c.delta0,
        eh: e1,
        et: eN,
        Ma,
        v: c.v,
        vref: c.vref,
        Iv: vin ? vin.I.slice() : null,
        Fv: vin ? vin.Fp.slice() : null,
        Md: vin ? vin.Md.slice() : null,
        Pm: vin ? vin.Pm.slice() : null,
        P2e: vin ? vin.cy.map(c => c[0].P2e - c[0].P2) : null
      });
      if (EV) {
        const E0 = c.emergE;
        if (E0) {
          if (E0.tBrake === undefined) {
            E0.tBrake = tNow;
            E0.vBrake = c.v;
            E0.sBrake = path.s[c.j];
          }
          if (c.v < 0.05) {
            if (E0.tStop === undefined) E0.tStop = tNow;
            E0.sStop = path.s[c.j];
            if (tNow - E0.tStop > 1.5 && !E0.go) {
              E0.go = true;
              E0.tGo = tNow;
            }
          }
        } // piéton : arrêt, puis il s'écarte et le convoi repart
        for (const E of EV) {
          if (E.tGo !== undefined) continue;
          const pts = E.type == 'ped' ? [
            [E.x, E.y]
          ] : [-0.4, 0, 0.4].map(q => [E.x + q * Math.cos(E.psi), E.y + q * Math.sin(E.psi)]);
          let dm2 = 1e9;
          for (const P of pts)
            for (let k = 0; k < g.J.length - 1; k++) {
              const a = g.J[k],
                b = g.J[k + 1],
                ux = b[0] - a[0],
                uy = b[1] - a[1],
                L2 = ux * ux + uy * uy || 1e-9,
                tt = Math.max(0, Math.min(1, ((P[0] - a[0]) * ux + (P[1] - a[1]) * uy) / L2));
              dm2 = Math.min(dm2, Math.hypot(P[0] - a[0] - tt * ux, P[1] - a[1] - tt * uy));
            }
          dm2 -= 0.75 + E.r;
          E.dMin = Math.min(E.dMin, dm2); // distance carrosserie–obstacle (demi-largeur 0,75 m)
          if (!E.hit && dm2 < 0.02) {
            E.hit = true;
            E.tHit = tNow;
            E.vHit = c.v;
          }
        }
      }
      if (!isFinite(e1) || !isFinite(eN)) {
        status = 'nan';
        fr.pop();
        break;
      }
      if ((Math.abs(eN) > 12 && !o.steer) || Math.max(...g.th.map(a => Math.abs(a - g.th[0]))) > 2.6) {
        status = 'diverge';
        break;
      } // essais de volant : l'écart à la ligne droite n'est pas une divergence
      if (c.j >= path.n - 3 && !o.Tmax) {
        status = 'fin';
        break;
      }
    }
    if (FR) {
      const tt = i * dt;
      FR.step(tt);
      const Xa = Array.from(X);
      const c0 = pil.ctl(Xa, d, V, null);
      if (FR.pflt.eHold === null && FR.F.some(f => f.type == 'pil_lat_fige' && tt >= f.t0)) FR.pflt.eHold = c0.e;
      FR.push(c0.delta0);
      FR.envStep(mod, geomPoints(mod, X));
      const nl = FR.locks();
      if (lkNow) {
        for (let k = 0; k < n; k++)
          if (nl[k] && !lkNow[k]) {
            const a = X[d + 2 + k],
              b = X[d + 3 + k],
              th = X[2 + k];
            X[3 + k] = th;
            X[d + 2 + k] = X[d + 3 + k] = 0.5 * (a + b);
          }
      }
      lkNow = nl;
      motNow = FR.motors();
      drvNow = FR.drive();
    }
    if (vin || FR) {
      const ck = Array.isArray(cCur) ? cCur : Array(n).fill(cCur);
      const gt = gateOf(X[d] * Math.cos(X[2]) + X[d + 1] * Math.sin(X[2]));
      Mart = vin ? verinCommand(vin, Array.from(X), d, ck, o.Mmax || 0, dt, FR, gt) : FR.torque(Array.from(X), d, ck, o.Mmax || 0, dt, gt);
    }
    const Xold = vin ? Array.from(X) : null;
    const k1 = f(X),
      k2 = f(add(X, dt / 2, k1)),
      k3 = f(add(X, dt / 2, k2)),
      k4 = f(add(X, dt, k3));
    for (let j = 0; j < X.length; j++) X[j] += dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
    if (vin) verinAdvance(vin, Xold, Array.from(X), d, dt, 4);
  }
  const hits = path.gate ? coneHits(fr, path.cones.slice(0, path.gateN || path.cones.length), path.bveh, mod.L) : null;
  return {
    hits,
    ev: EV,
    frames: fr,
    path,
    status,
    faults: o.faults || [],
    puddle: FR && FR.puddle ? FR.puddle : null,
    eh,
    et,
    dm: dm * 180 / Math.PI,
    thm: thm * 180 / Math.PI,
    tEnd: fr.length ? fr[fr.length - 1].t : 0
  };
}
