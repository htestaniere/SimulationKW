// ===== Dynamique des vérins d'articulation (paire de vérins hydrauliques + vannes proportionnelles) =====
// Modèle hydraulique du dossier VerinArticulation : états (P1,P2) par vérin, accumulateur sur la chambre 2,
// compression par la vanne proportionnelle (section K), détente par le clapet anti-retour, vanne du 2ᵉ ordre.
// Commande : ΔP = α v² / (I − I0)²  inversé pour obtenir le courant I qui donne l'effort voulu.
const VK_I = [0.393955706399157, 0.428353203159123, 0.451761791220043, 0.478238423588884, 0.50607207555546, 0.527445134219778, 0.55056609312683, 0.580995782584724, 0.609920950314695, 0.646995610737582, 0.691983760445084, 0.729670554708253, 0.770005012208307, 0.79684302479611, 0.817404821744391, 0.837059480592013, 0.861050702067177, 0.883323523725645, 0.902867555975626, 0.921135694799475, 0.944337779878131, 0.962723920406131, 0.996457657580249, 1.02467481508531, 1.05188895810509, 1.08794585382968, 1.11422335832277, 1.14424004181613];
const VK_K = [8.732716504688903e-09, 1.5466644860696384e-08, 5.7323325852511594e-08, 1.1378199885840537e-07, 1.7024067186430055e-07, 2.183350970174702e-07, 2.6852058413382017e-07, 3.291613810660781e-07, 3.916097061360006e-07, 4.674904461897482e-07, 5.581858286267126e-07, 6.408713804928465e-07, 7.469130312358703e-07, 8.468587047302982e-07, 9.953241041161689e-07, 1.1564776421938808e-06, 1.397835811164464e-06, 1.5797582019612335e-06, 1.7368004995689747e-06, 1.8823596772433053e-06, 2.0276353210921186e-06, 2.1697212094038784e-06, 2.367734144798686e-06, 2.513151555560258e-06, 2.640741777042507e-06, 2.8082748261943392e-06, 2.9177543245717474e-06, 3.0139431748780807e-06];
const VK_CLAPET = 3.871035783562391e-06,
  VK_PCLAPET = 52334.68230524404;

function vInterpK(I) {
  const a = VK_I,
    b = VK_K;
  if (I <= a[0]) return b[0];
  if (I >= a[a.length - 1]) return b[b.length - 1];
  let i = 0;
  while (a[i + 1] < I) i++;
  return b[i] + (b[i + 1] - b[i]) * (I - a[i]) / (a[i + 1] - a[i]);
}
// ajustement de K = k (I - I0) sur la table constructeur (erreur quadratique sur log K, I >= 0,45 A), puis alpha = rho Sp^2 / (2 k^2)
function vFitAlpha(rho, Sp) {
  let best = null;
  for (let I0 = 0.30; I0 <= 0.56; I0 += 0.002) {
    const pts = [];
    for (let i = 0; i < VK_I.length; i++)
      if (VK_I[i] >= 0.45 && VK_I[i] > I0 + 0.01) pts.push([VK_I[i], VK_K[i]]);
    const lk = pts.reduce((p, q) => p + Math.log(q[1] / (q[0] - I0)), 0) / pts.length,
      err = pts.reduce((p, q) => p + Math.pow(Math.log(q[1]) - lk - Math.log(q[0] - I0), 2), 0) / pts.length;
    if (!best || err < best.err) best = {
      err,
      I0,
      k: Math.exp(lk)
    };
  }
  return {
    k: best.k,
    I0: best.I0,
    alpha: rho * Sp * Sp / (2 * best.k * best.k)
  };
}
const VDEF = {
  B: 1.5e9,
  rho: 860,
  Dp: 32e-3,
  Dt: 20e-3,
  P0: 10e5,
  V0: 0.16e-3,
  gam: 1.4,
  R1: 0.15,
  L2: 0.90,
  phi: 20,
  lam0: 0.465,
  Pc: 15e5,
  deltaL: 0.2,
  wn: 20,
  zeta: 0.9,
  Imin: VK_I[0],
  Imax: VK_I[VK_I.length - 1],
  alpha: null,
  I0: null,
  estP2: true,
  fb: true,
  Kp: 0.5,
  Ki: 5,
  Plim: 200e5,
  Krel: 2e-5,
  Ks: 1,
  vrodMin: 0.003
};

function verinParams(o) {
  const p = Object.assign({}, VDEF, o || {});
  p.Sp = Math.PI * p.Dp * p.Dp / 4;
  p.St = Math.PI * p.Dt * p.Dt / 4;
  p.Sa = p.Sp - p.St;
  const f = vFitAlpha(p.rho, p.Sp);
  if (!(p.alpha > 0)) p.alpha = f.alpha;
  if (!(p.I0 > 0)) p.I0 = f.I0;
  const ph = p.phi * Math.PI / 180;
  p.phir = ph;
  p.h1 = Math.sqrt(p.lam0 * p.lam0 - Math.pow(p.L2 / 2 - p.R1 * Math.sin(ph), 2)) - p.R1 * Math.cos(ph);
  p.V01 = (0.001 + p.deltaL / 2) * p.Sp;
  p.V02 = (0.001 + p.deltaL / 2) * p.Sa;
  // pression d'équilibre à ψ = 0 (tige à mi-course) déduite de la pression de gonflage Pc (tige complètement sortie) par conservation de l'huile
  const ext = p.deltaL / 2,
    V1e = p.V01 + ext * p.Sp,
    V2e = p.V02 - ext * p.Sa,
    Wref = (V1e + V2e) * (1 + p.Pc / p.B) + p.V0 - p.V0 * Math.pow(p.P0 / p.Pc, 1 / p.gam);
  let P = p.Pc;
  for (let it = 0; it < 40; it++) {
    const g = (p.V01 + p.V02) * (1 + P / p.B) + p.V0 - p.V0 * Math.pow(p.P0 / P, 1 / p.gam) - Wref,
      dg = (p.V01 + p.V02) / p.B + (p.V0 / p.gam) * Math.pow(p.P0, 1 / p.gam) * Math.pow(P, -1 / p.gam - 1);
    P -= g / dg;
  }
  p.Peq = P;
  p.Fmin = p.St * P;
  return p;
}
// géométrie d'un vérin : côté 'g' (a = phi - psi) ou 'd' (a = phi + psi)
function vGeo(p, psi, side) {
  const a = side == 0 ? p.phir - psi : p.phir + psi,
    ux = p.h1 + p.R1 * Math.cos(a),
    uy = p.L2 / 2 - p.R1 * Math.sin(a),
    lam = Math.hypot(ux, uy),
    th = Math.atan2(uy, ux);
  const S = Math.sin(a + th);
  return {
    lam,
    S,
    dldpsi: (side == 0 ? 1 : -1) * p.R1 * S
  };
}

function vLam0(p) {
  const ux = p.h1 + p.R1 * Math.cos(p.phir),
    uy = p.L2 / 2 - p.R1 * Math.sin(p.phir);
  return Math.hypot(ux, uy);
}

function vDebit(dP, K, p, P1) {
  const dE = 1e3,
    m = (1 - Math.tanh(dP / dE)) / 2,
    Qv = -K * Math.sqrt(2 * Math.abs(dP) / p.rho) * Math.tanh(Math.abs(dP) / dE) * m;
  const x = dP - VK_PCLAPET,
    xs = (x + Math.sqrt(x * x + dE * dE)) / 2,
    Qc = VK_CLAPET * Math.sqrt(2 * xs / p.rho); // limiteur de pression : décharge la chambre 1 vers la chambre 2 quand P1 dépasse Plim (seuil lissé)
  const xr = P1 - p.Plim,
    xsr = (xr + Math.sqrt(xr * xr + dE * dE)) / 2,
    Qr = -p.Krel * Math.sqrt(2 * xsr / p.rho);
  return Qv + Qc + Qr;
}

function vRhs(p, P1, P2, dlam, dlamdot, K) {
  const Q = vDebit(P2 - P1, K, p, P1),
    V1 = Math.max(1e-7, p.V01 + dlam * p.Sp),
    V2 = Math.max(1e-7, p.V02 - dlam * p.Sa);
  const al = p.P0 * p.V0 / p.gam / (P2 * P2) * Math.pow(P2 / p.P0, (p.gam - 1) / p.gam),
    be = 1 + p.B * al / V2;
  return [p.B / V1 * (Q - dlamdot * p.Sp), p.B / V2 / be * (dlamdot * p.Sa - Q)];
}
// pas linéairement implicite (Rosenbrock-Euler) pour l'hydraulique raide
function vStep(p, c, dlam, dlamdot, h) {
  const P1 = c.P1,
    P2 = c.P2,
    f0 = vRhs(p, P1, P2, dlam, dlamdot, c.K),
    e = Math.max(100, 1e-4 * Math.abs(P1)),
    fa = vRhs(p, P1 + e, P2, dlam, dlamdot, c.K),
    fb = vRhs(p, P1, P2 + e, dlam, dlamdot, c.K);
  const a = 1 - h * (fa[0] - f0[0]) / e,
    b = -h * (fb[0] - f0[0]) / e,
    cc = -h * (fa[1] - f0[1]) / e,
    d = 1 - h * (fb[1] - f0[1]) / e,
    det = a * d - b * cc;
  const r0 = h * f0[0],
    r1 = h * f0[1];
  c.P1 += (d * r0 - b * r1) / det;
  c.P2 += (-cc * r0 + a * r1) / det;
}
// reconstruction de P2 : conservation de l'huile, w1 + w2 - ∫ λ̇ F / B dt = cste, avec
//   w1 = V1 (1 + P1/B)   et   w2 = V2 (1 + P2/B) + V0 - V0 (P0/P2)^(1/γ)   (huile stockée dans la chambre 2 et l'accumulateur)
function vW2(p, V2, P2) {
  return V2 * (1 + P2 / p.B) + p.V0 - p.V0 * Math.pow(p.P0 / P2, 1 / p.gam);
}

function vEstP2(p, c, dlam, P1) {
  const V1 = Math.max(1e-7, p.V01 + dlam * p.Sp),
    V2 = Math.max(1e-7, p.V02 - dlam * p.Sa),
    target = c.Wtot + c.Wint - V1 * (1 + P1 / p.B);
  let P = Math.max(1e5, c.P2e);
  for (let it = 0; it < 4; it++) {
    const g = vW2(p, V2, P) - target,
      dg = V2 / p.B + (p.V0 / p.gam) * Math.pow(p.P0, 1 / p.gam) * Math.pow(P, -1 / p.gam - 1);
    P = Math.max(1e5, P - g / dg);
  }
  return P;
}

function verinInit(n, p) {
  const cy = [];
  for (let k = 0; k < n; k++) cy.push([0, 1].map(() => ({
    P1: p.Peq,
    P2: p.Peq,
    K: vInterpK(p.Imax),
    Kd: 0,
    Kc: vInterpK(p.Imax),
    P2e: p.Peq,
    Wint: 0,
    Wtot: p.V01 * (1 + p.Peq / p.B) + vW2(p, p.V02, p.Peq)
  })));
  return {
    p,
    cy,
    lam0: vLam0(p),
    n,
    I: Array(n).fill(p.Imax),
    Fp: Array(n).fill(0),
    Pm: Array(n).fill(0),
    Md: Array(n).fill(0),
    Ei: Array(n).fill(0)
  };
}
// commande + couple d'articulation Ma_k (sur θ_k, convention du modèle : Ma > 0 si ψ̇ > 0)
function verinCommand(v, X, d, ckArr, Msat, dt, FR, gate) {
  const p = v.p,
    n = v.n,
    Mart = Array(n).fill(0);
  for (let k = 0; k < n; k++) {
    const psi = X[3 + k] - X[2 + k],
      wTrue = X[d + 3 + k] - X[d + 2 + k],
      w = FR ? FR.measW(k, wTrue, dt) : wTrue,
      G = [vGeo(p, psi, 0), vGeo(p, psi, 1)],
      c = v.cy[k];
    // grandeurs "mesurées" : P1 ; P2 reconstruite (ou lue directement si l'option est décochée)
    for (let s = 0; s < 2; s++) c[s].P1m = FR ? FR.measP(k, s, c[s].P1) : c[s].P1; // P1 mesurée (défaut capteur possible)
    const P2 = [0, 1].map(s => p.estP2 ? c[s].P2e : c[s].P2);
    const F = [p.Sp * c[0].P1m - p.Sa * P2[0], p.Sp * c[1].P1m - p.Sa * P2[1]];
    let Md = ckArr[k] * w * (gate === undefined ? 1 : gate);
    if (Msat) Md = Math.max(-Msat, Math.min(Msat, Md));
    v.Md[k] = Md;
    let I = p.Imax,
      pil = -1,
      e = 0;
    if (Math.abs(w) > 1e-4 && Math.abs(Md) > 1e-6) {
      const pi = w > 0 ? 1 : 0,
        oth = 1 - pi;
      let Fd = (Math.abs(Md) + p.R1 * F[oth] * G[oth].S) / (p.R1 * G[pi].S);
      pil = pi;
      if (p.fb) {
        e = Fd - F[pi];
        v.Ei[k] = Math.max(-2e4, Math.min(2e4, v.Ei[k] + e * dt));
        Fd += p.Kp * e + p.Ki * v.Ei[k];
      } // boucle fermée sur l'effort mesuré
      Fd = Math.min(Fd, p.Sp * p.Plim - p.Sa * P2[pi]); // l'effort ne peut pas dépasser ce que permet le limiteur de pression
      let dPd = (Fd - P2[pi] * (p.Sp - p.Sa)) / p.Sp;
      dPd = Math.max(dPd, 1e4);
      if (FR) dPd *= FR.pfac(k, pi); // perte de pression : le vérin ne fournit que la fraction restante
      const vv = Math.abs(G[pi].dldpsi * w);
      I = p.I0 + vv * Math.sqrt(p.alpha / dPd);
      I = Math.max(p.Imin, Math.min(p.Imax, I));
      const gr = p.vrodMin > 0 ? Math.max(0, Math.min(1, (vv - p.vrodMin) / p.vrodMin)) : 1;
      I = p.Imax + (I - p.Imax) * gr;
    } // vitesse de tige trop faible : vanne ouverte (de vrodMin à 2·vrodMin, montée progressive)
    else v.Ei[k] *= 0.9;
    for (let s = 0; s < 2; s++) {
      const st = FR ? FR.cyl(k, s) : null;
      c[s].Kc = p.Ks * vInterpK(st == 'closed' ? p.Imin : st == 'open' ? p.Imax : (s == pil ? I : p.Imax));
    }
    v.I[k] = I;
    v.Pm[k] = Math.max(c[0].P1, c[1].P1);
    // couple réellement fourni : efforts réels des vérins
    const Fr = [p.Sp * c[0].P1 - p.Sa * c[0].P2, p.Sp * c[1].P1 - p.Sa * c[1].P2];
    v.Fp[k] = pil < 0 ? Math.max(Fr[0], Fr[1]) : Fr[pil];
    Mart[k] = p.R1 * (Fr[1] * G[1].S - Fr[0] * G[0].S);
  }
  return Mart;
}
// avance de l'hydraulique et des vannes sur un pas dt (ψ, ψ̇ interpolés linéairement entre début et fin de pas)
function verinAdvance(v, X0, X1, d, dt, m) {
  const p = v.p,
    n = v.n,
    h = dt / m;
  for (let k = 0; k < n; k++) {
    const psi0 = X0[3 + k] - X0[2 + k],
      psi1 = X1[3 + k] - X1[2 + k],
      w0 = X0[d + 3 + k] - X0[d + 2 + k],
      w1 = X1[d + 3 + k] - X1[d + 2 + k];
    for (let s = 1; s <= m; s++) {
      const u = s / m,
        psi = psi0 + (psi1 - psi0) * u,
        w = w0 + (w1 - w0) * u;
      for (let side = 0; side < 2; side++) {
        const g = vGeo(p, psi, side),
          c = v.cy[k][side];
        // vanne du 2e ordre
        c.Kd += h * (p.wn * p.wn * (c.Kc - c.K) - 2 * p.zeta * p.wn * c.Kd);
        c.K = Math.max(0, c.K + h * c.Kd);
        vStep(p, c, g.lam - v.lam0, g.dldpsi * w, h);
        // estimateur de P2 (à partir de P1 mesurée et du déplacement de tige)
        const dl = g.lam - v.lam0,
          P1m = c.P1m === undefined ? c.P1 : c.P1m,
          Fe = p.Sp * P1m - p.Sa * c.P2e;
        c.Wint += h * g.dldpsi * w * Fe / p.B;
        c.P2e = vEstP2(p, c, dl, P1m);
      }
    }
  }
}
