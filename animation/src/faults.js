// ===== Modes dégradés : catalogue de défauts, injection, scénarios aléatoires, évaluation =====
// Un défaut : {type, art (indice d'articulation, 0 = J2), side (0 = vérin g, 1 = vérin d), val, t0 (s)}
const FCAT = {
  sens_perdu: {
    grp: 'Capteur d\'angle d\'articulation',
    nom: 'perte du signal (vitesse relative mesurée = 0)',
    art: true,
    sev: 2
  },
  sens_fige: {
    grp: 'Capteur d\'angle d\'articulation',
    nom: 'signal figé à la dernière valeur',
    art: true,
    sev: 3
  },
  sens_biais: {
    grp: 'Capteur d\'angle d\'articulation',
    nom: 'biais de mesure (rad/s)',
    art: true,
    val: {
      def: 0.15,
      min: 0.05,
      max: 0.4,
      dec: 2
    },
    sev: 2
  },
  sens_gain: {
    grp: 'Capteur d\'angle d\'articulation',
    nom: 'erreur de gain (facteur)',
    art: true,
    val: {
      def: 0.5,
      min: 0.2,
      max: 3,
      dec: 1
    },
    sev: 1
  },
  sens_retard: {
    grp: 'Capteur d\'angle d\'articulation',
    nom: 'retard de mesure (s)',
    art: true,
    val: {
      def: 0.2,
      min: 0.05,
      max: 0.5,
      dec: 2
    },
    sev: 2
  },
  act_ouvert: {
    grp: 'Vérins d\'articulation',
    nom: 'un vérin sur deux hors service (vanne ouverte)',
    art: true,
    side: true,
    sev: 2
  },
  act_ferme: {
    grp: 'Vérins d\'articulation',
    nom: 'un vérin bloqué vanne fermée (sur-amortissement)',
    art: true,
    side: true,
    sev: 3
  },
  act_deux: {
    grp: 'Vérins d\'articulation',
    nom: 'les deux vérins hors service (articulation libre)',
    art: true,
    sev: 3
  },
  act_grippage: {
    grp: 'Vérins d\'articulation',
    nom: 'articulation grippée (bloquée)',
    art: true,
    sev: 4
  },
  act_pression: {
    grp: 'Vérins d\'articulation',
    nom: 'perte de pression hydraulique d\'un vérin (effort restant)',
    art: true,
    side: true,
    val: {
      def: 0.4,
      min: 0.1,
      max: 0.8,
      dec: 2
    },
    sev: 2
  },
  cap_perdu: {
    grp: 'Capteur de pression d\'un vérin',
    nom: 'perte du signal du capteur de pression (P1 lue = 0)',
    art: true,
    side: true,
    sev: 3,
    verin: true
  },
  mot_un: {
    grp: 'Moteurs-roues',
    nom: 'perte d\'un moteur-roue',
    art: true,
    side: true,
    sev: 2,
    mot: true
  },
  mot_deux: {
    grp: 'Moteurs-roues',
    nom: 'perte des deux moteurs-roues',
    art: true,
    sev: 3,
    mot: true
  },
  mot_bloque: {
    grp: 'Moteurs-roues',
    nom: 'couple moteur-roue bloqué (N·m)',
    art: true,
    side: true,
    val: {
      def: 80,
      min: -150,
      max: 150,
      dec: 0
    },
    sev: 4,
    mot: true
  },
  frein_traine: {
    grp: 'Moteurs-roues',
    nom: 'frein traînant sur une roue (N)',
    art: true,
    side: true,
    val: {
      def: 600,
      min: 200,
      max: 1500,
      dec: 0
    },
    sev: 3,
    mot: true
  },
  reg_indispo: {
    grp: 'Moteurs-roues',
    nom: 'régénération indisponible : batterie pleine',
    art: true,
    all: true,
    sev: 2,
    mot: true
  },
  batt_vide: {
    grp: 'Moteurs-roues',
    nom: 'batterie vide : pas de traction',
    art: true,
    all: true,
    sev: 2,
    mot: true
  },
  couple_limite: {
    grp: 'Moteurs-roues',
    nom: 'couple moteur limité (facteur)',
    val: {
      def: 0.5,
      min: 0.2,
      max: 0.8,
      dec: 2
    },
    sev: 2,
    vec: true
  },
  gyro_perdu: {
    grp: 'Capteurs du vectoring',
    nom: 'perte du signal du gyroscope',
    art: true,
    sev: 3,
    mot: true,
    vec: true
  },
  gyro_biais: {
    grp: 'Capteurs du vectoring',
    nom: 'biais du gyroscope (rad/s)',
    art: true,
    val: {
      def: 0.1,
      min: 0.03,
      max: 0.3,
      dec: 2
    },
    sev: 2,
    mot: true,
    vec: true
  },
  codeur_vit: {
    grp: 'Capteurs du vectoring',
    nom: 'perte de la mesure de vitesse (codeurs)',
    art: true,
    sev: 2,
    mot: true,
    vec: true
  },
  pneu_creve: {
    grp: 'Pneus',
    nom: 'crevaison d\'un pneu',
    art: true,
    sev: 3,
    por: true
  },
  env_adh_tot: {
    grp: 'Environnement',
    nom: 'perte d\'adhérence jusqu\'à la fin de la manœuvre (μ)',
    val: {
      def: 0.4,
      min: 0.2,
      max: 0.6,
      dec: 2
    },
    sev: 3
  },
  env_adh_cote: {
    grp: 'Environnement',
    nom: 'perte d\'adhérence d\'un seul côté du convoi, jusqu\'à la fin de la manœuvre (μ)',
    side: true,
    cote: true,
    val: {
      def: 0.3,
      min: 0.15,
      max: 0.6,
      dec: 2
    },
    sev: 3
  },
  env_adherence: {
    grp: 'Environnement',
    nom: 'flaque sur la route, adhérence locale (μ)',
    val: {
      def: 0.3,
      min: 0.2,
      max: 0.5,
      dec: 2
    },
    sev: 2
  }
};
const FLEVELS = {
  peu: {
    nom: 'peu critique',
    smin: 1,
    smax: 2,
    nf: [1, 1]
  },
  moyen: {
    nom: 'moyennement critique',
    smin: 3,
    smax: 5,
    nf: [1, 2]
  },
  tres: {
    nom: 'très critique',
    smin: 6,
    smax: 99,
    nf: [2, 4]
  }
};
// gravité a priori d'un défaut ; pour l'environnement elle dépend de la valeur (plus l'adhérence est basse, plus c'est grave)
function faultSev(f) {
  const c = FCAT[f.type];
  if (f.type == 'env_adherence') return f.val < 0.3 ? 4 : f.val < 0.4 ? 3 : 2;
  if (f.type == 'env_adh_tot') return f.val < 0.3 ? 6 : f.val < 0.4 ? 5 : f.val < 0.5 ? 4 : 3;
  if (f.type == 'env_adh_cote') return f.val < 0.3 ? 5 : f.val < 0.4 ? 4 : 3;
  return c.sev;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function faultText(f, n) {
  const c = FCAT[f.type];
  let s = c.nom;
  if (c.val) {
    const m = c.nom.match(/^(.*?) ?\((.*)\)$/);
    let u = m ? m[2] : '';
    if (u == 'facteur' || u == 'masse ×') u = '×';
    if (u == 'μ' || u == 'couple restant') u = '';
    s = (m ? m[1] : c.nom) + ' : ' + (+f.val).toFixed(c.val.dec) + (u ? ' ' + u : '');
  }
  if (c.art) s += (c.mot || c.por) ? (f.art < 0 ? ' — toutes les portions motorisées' : ' — portion ' + (f.art + 1)) : ' — articulation J' + (f.art + 2);
  if (c.side) s += c.cote ? ' (côté ' + (f.side == 0 ? 'gauche' : 'droit') + ')' : c.mot ? ' (roue ' + (f.side == 0 ? 'gauche' : 'droite') + ')' : ' (vérin ' + (f.side == 0 ? 'gauche' : 'droit') + ')';
  return s + ', à t = ' + (+f.t0).toFixed(1) + ' s';
}
// scénario aléatoire d'un niveau de criticité a priori (somme des gravités des défauts)
function randomScenario(level, seed, n, lockFirst, verin, vecteur) {
  const R = mulberry32(seed * 7919 + level.length * 31 + 13),
    L = FLEVELS[level],
    keys = Object.keys(FCAT).filter(k => (verin !== false || !FCAT[k].verin) && (vecteur !== false || !FCAT[k].vec));
  const pickArt = () => {
      const lo = lockFirst ? 1 : 0;
      return n > lo ? lo + Math.floor(R() * (n - lo)) : 0;
    },
    pickMot = () => 1 + Math.floor(R() * n),
    pickAll = () => Math.floor(R() * (n + 1)); // moteurs : portions 2 à N (indices 1 à n)
  for (let tries = 0; tries < 400; tries++) {
    const nf = L.nf[0] + Math.floor(R() * (L.nf[1] - L.nf[0] + 1)),
      F = [];
    let sev = 0;
    for (let i = 0; i < nf; i++) {
      const type = keys[Math.floor(R() * keys.length)],
        c = FCAT[type];
      if (c.art && lockFirst && n < 2) continue;
      const t0 = 2 + R() * 5,
        val = c.val ? +(c.val.min + R() * (c.val.max - c.val.min)).toFixed(c.val.dec) : null;
      let multi = 1;
      if (c.art && type.startsWith('sens') && R() < (level == 'tres' ? 0.7 : level == 'moyen' ? 0.4 : 0.15)) multi = 1 + Math.floor(R() * Math.min(3, n - (lockFirst ? 1 : 0)));
      const used = new Set();
      for (let m = 0; m < multi; m++) {
        const pk = c.mot ? pickMot : (c.por ? pickAll : pickArt);
        let a = pk(),
          g = 0;
        while (used.has(a) && g++ < 10) a = pk();
        used.add(a);
        F.push({
          type,
          art: c.art ? a : null,
          side: c.side ? (R() < 0.5 ? 0 : 1) : null,
          val,
          t0: +t0.toFixed(1)
        });
      }
      sev += faultSev({
        type,
        val
      }) * (1 + 0.5 * (multi - 1));
    }
    if (F.length && sev >= L.smin && sev <= L.smax) return {
      level,
      seed,
      sev: +sev.toFixed(1),
      faults: F
    };
  }
  return {
    level,
    seed,
    sev: 0,
    faults: []
  };
}
// conséquence a posteriori, par rapport au cas nominal
const FGRADES = [{
  k: 'A',
  nom: 'sans conséquence',
  col: '#2e9e5b'
}, {
  k: 'B',
  nom: 'dégradation',
  col: '#d4a800'
}, {
  k: 'C',
  nom: 'sortie de trajectoire',
  col: '#e8742a'
}, {
  k: 'D',
  nom: 'perte de contrôle',
  col: '#d0342c'
}];

function gradeResult(R, Rn) {
  if (R.status == 'diverge' || !isFinite(R.et) || R.et > 2) return 'D';
  if (R.et > 1 || (R.hits && R.hits.hit > (Rn && Rn.hits ? Rn.hits.hit : 0))) return 'C';
  if (R.et > 0.5 || R.et - Rn.et > 0.25) return 'B';
  return 'A';
}
// environnement d'exécution des défauts, appelé par simulateClosed
function faultRuntime(F, n, N, lockFirst) {
  const S = {
    F: F,
    t: 0,
    pflt: {
      eb: 0,
      hb: 0,
      lost: false,
      eHold: null,
      hHold: null,
      dmax: null
    },
    lastRaw: {
      e: 0,
      he: 0
    },
    dlHold: null,
    dlBuf: [],
    jam: Array(n).fill(false),
    sens: Array.from({
      length: n
    }, () => ({
      hold: null,
      lp: null
    })),
    muBase: null
  };
  const act = (f) => S.t >= f.t0;
  S.step = function (t) {
    S.t = t;
    const p = S.pflt;
    p.eb = 0;
    p.hb = 0;
    p.lost = false;
    p.dmax = null;
    for (const f of F) {
      if (!act(f)) continue;
      if (f.type == 'pil_lat_biais') p.eb = +f.val;
      if (f.type == 'pil_cap_biais') p.hb = +f.val * Math.PI / 180;
      if (f.type == 'pil_perdu') p.lost = true;
      if (f.type == 'pil_limite') p.dmax = +f.val * Math.PI / 180;
      if (f.type == 'pil_bloque' && S.dlHold === null) S.dlHold = S.lastDl || 0;
    }
  };
  S.locks = function () {
    const L = Array(n).fill(false);
    if (lockFirst && n > 0) L[0] = true;
    for (const f of F)
      if (f.type == 'act_grippage' && act(f)) L[f.art] = true;
    return L;
  };
  S.steer = function (dl, dt) {
    let o = dl;
    for (const f of F) {
      if (!act(f)) continue;
      if (f.type == 'pil_retard' && S.dlBuf.length) {
        const k = Math.max(0, S.dlBuf.length - 1 - Math.round(+f.val / (dt || 0.002)));
        o = S.dlBuf[k];
      }
    }
    if (S.dlHold !== null) o = S.dlHold;
    if (S.pflt.dmax !== null) o = Math.max(-S.pflt.dmax, Math.min(S.pflt.dmax, o));
    S.lastDl = o;
    return o;
  };
  S.push = function (dl) {
    S.dlBuf.push(dl);
    if (S.dlBuf.length > 2000) S.dlBuf.shift();
  };
  S.measW = function (k, w, dt) {
    let wm = w;
    const st = S.sens[k];
    for (const f of F) {
      if (f.art !== k || !act(f)) continue;
      if (f.type == 'sens_perdu') wm = 0;
      else if (f.type == 'sens_fige') {
        if (st.hold === null) st.hold = w;
        wm = st.hold;
      } else if (f.type == 'sens_biais') wm = wm + (+f.val);
      else if (f.type == 'sens_gain') wm = wm * (+f.val);
      else if (f.type == 'sens_retard') {
        if (st.lp === null) st.lp = w;
        st.lp += (w - st.lp) * dt / Math.max(+f.val, dt);
        wm = st.lp;
      }
    }
    return wm;
  };
  // couple de l'amortisseur idéal avec défauts d'actionneur
  S.act = function (k, w, Md, Mlim) {
    let M = Md;
    for (const f of F) {
      if (f.art !== k || !act(f)) continue;
      const compSide = w > 0 ? 1 : 0; // vérin qui se comprime : droit pour ψ̇ > 0, gauche pour ψ̇ < 0
      if (f.type == 'act_deux') M = 0;
      else if (f.type == 'act_ouvert' && f.side == compSide) M = 0;
      else if (f.type == 'act_ferme' && f.side == compSide) M = Math.max(-Mlim, Math.min(Mlim, 3e4 * w));
      else if (f.type == 'act_pression' && (f.side === null || f.side == compSide)) M = M * (+f.val);
    }
    return M;
  };
  S.torque = function (X, d, ck, Msat, dt, gate) {
    const M = [];
    for (let k = 0; k < n; k++) {
      const w = X[d + 3 + k] - X[d + 2 + k],
        wm = S.measW(k, w, dt);
      let Md = ck[k] * wm * (gate === undefined ? 1 : gate);
      if (Msat) Md = Math.max(-Msat, Math.min(Msat, Md));
      M.push(S.act(k, w, Md, Msat || 2500));
    }
    return M;
  };
  S.cyl = function (k, side) {
    for (const f of F)
      if (f.art === k && act(f)) {
        if (f.type == 'act_deux') return 'open';
        if (f.type == 'act_ouvert' && f.side == side) return 'open';
        if (f.type == 'act_ferme' && f.side == side) return 'closed';
      } return null;
  };
  S.measP = function (k, s, P) {
    for (const f of F)
      if (f.art === k && act(f) && f.type == 'cap_perdu' && f.side == s) return 0;
    return P;
  };
  S.pfac = function (k, s) {
    let a = 1;
    for (const x of F)
      if (x.art === k && act(x) && x.type == 'act_pression' && (x.side === null || x.side == s)) a = Math.min(a, +x.val);
    return a;
  };
  // moteurs-roues perdus par portion (indice 1 à n) : {L,R} = roue gauche / droite hors service
  S.motors = function () {
    const M = Array.from({
      length: N
    }, () => ({
      L: false,
      R: false
    }));
    for (const f of F) {
      if (!act(f)) continue;
      const lst = f.art < 0 ? Array.from({
        length: N - 1
      }, (_, i) => i + 1) : [f.art];
      for (const a of lst) {
        if (!M[a]) continue;
        const m = M[a],
          t = f.type,
          sd = f.side == 0 ? 'L' : 'R';
        if (t == 'mot_deux') {
          m.L = m.R = true;
        } else if (t == 'mot_un') {
          m[sd] = true;
        } else if (t == 'mot_bloque') {
          m[sd] = true;
          m[sd == 'L' ? 'fl' : 'fr'] = +f.val / 0.23;
        } // couple bloqué : force constante de la roue, qui ne répond plus à la commande
        else if (t == 'frein_traine') {
          m[sd == 'L' ? 'dl' : 'dr'] = (m[sd == 'L' ? 'dl' : 'dr'] || 0) + (+f.val);
        } else if (t == 'reg_indispo') m.regOff = true; // batterie pleine : pas de régénération sur cette portion
        else if (t == 'batt_vide') m.noTrac = true; // batterie vide : pas de traction sur cette portion
        else if (t == 'gyro_perdu') m.gl = true;
        else if (t == 'gyro_biais') m.gb = (m.gb || 0) + (+f.val);
        else if (t == 'codeur_vit') m.enc = true;
        else if (t == 'pneu_creve') m.ktf = (f.art == 0 || f.art == N - 1) ? 0.5 : 0.75;
      }
    } // un pneu sur 4 (ou sur 2) en moins
    return M;
  };
  S.drive = function () {
    let tqf = 1;
    for (const f of F) {
      if (!act(f)) continue;
      if (f.type == 'couple_limite') tqf = Math.min(tqf, +f.val);
    }
    const M = S.motors(),
      nm = Math.max(1, N - 1);
    return {
      regOff: false,
      regFrac: M.slice(1).filter(m => !m.regOff).length / nm,
      tqf
    };
  }; // regFrac : part des portions motorisées dont la batterie accepte encore la régénération
  S.envStart = function (mod) {};
  // flaque : posée devant la tête à l'instant d'apparition, l'adhérence ne baisse que pour les essieux qui la traversent
  // adhérence : flaque locale (env_adherence) ou perte jusqu'à la fin de la manœuvre (env_adh_tot) ; μ par essieu = minimum des défauts actifs
  S.envStep = function (mod, g) {
    if (!g) return;
    let arr = g.A.map(() => undefined),
      any = false;
    const sd = g.A.map(() => null);
    for (const f of F) {
      if (!act(f)) continue;
      if (f.type == 'env_adherence') {
        if (!S.puddle) {
          const h = g.J[0],
            th = g.th[0];
          S.puddle = {
            x: h[0] + 3 * Math.cos(th),
            y: h[1] + 3 * Math.sin(th),
            R: 3,
            th
          };
        }
        const pd = S.puddle;
        arr = arr.map((u, i) => Math.hypot(g.A[i][0] - pd.x, g.A[i][1] - pd.y) < pd.R ? (u === undefined ? +f.val : Math.min(u, +f.val)) : u);
        any = true;
      } else if (f.type == 'env_adh_tot') {
        arr = arr.map(u => u === undefined ? +f.val : Math.min(u, +f.val));
        any = true;
      } else if (f.type == 'env_adh_cote') {
        const key = f.side == 0 ? 'L' : 'R';
        for (let i = 0; i < arr.length; i++) {
          sd[i] = sd[i] || {};
          sd[i][key] = sd[i][key] === undefined ? +f.val : Math.min(sd[i][key], +f.val);
        }
        any = true;
      }
    } // un seul côté : μ des pneus gauches ou droits
    if (any) {
      mod.sat = true;
      mod.muAx = arr;
      mod.muSide = sd.some(x => x) ? sd : null;
    }
  };
  S.hasFaultAfter = function (t) {
    return F.some(f => f.t0 >= t);
  };
  return S;
}
