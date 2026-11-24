// ===== page « modes dégradés » : liste de défauts, scénarios aléatoires, campagne =====
let FL = [],
  RNDSC = false;
const GRADEINFO = {
  A: 'sans conséquence',
  B: 'dégradation',
  C: 'sortie de trajectoire',
  D: 'perte de contrôle'
};

function getFaults() {
  return FL.map(f => ({
    ...f
  }));
}

function nArt() {
  return +$('iN').value - 1;
}

function renderFaults() {
  const n = nArt();
  let h = '';
  if (!FL.length) h = '<span style="color:var(--mut)">Aucun défaut injecté : simulation nominale.</span>';
  else h = '<b>Défauts injectés :</b><ul style="margin:4px 0 0;padding-left:20px">' + FL.map((f, i) => '<li>' + faultText(f, n) + (RNDSC ? '' : ' <a href="#" data-i="' + i + '" class="dfDel" style="color:var(--ghost)">supprimer</a>') + '</li>').join('') + '</ul>';
  $('dfList').innerHTML = h;
  for (const a of document.querySelectorAll('.dfDel')) a.onclick = e => {
    e.preventDefault();
    FL.splice(+a.dataset.i, 1);
    renderFaults();
  };
}

function fillTypes() {
  const sel = $('dfType');
  sel.innerHTML = '';
  const groups = {};
  for (const [k, c] of Object.entries(FCAT)) {
    (groups[c.grp] = groups[c.grp] || []).push([k, c]);
  }
  for (const [g, arr] of Object.entries(groups)) {
    const og = document.createElement('optgroup');
    og.label = g;
    for (const [k, c] of arr) {
      const o = document.createElement('option');
      o.value = k;
      o.textContent = c.nom.replace(/ \((rad\/s|s|°|m|facteur|μ|masse ×|couple restant)\)/, '');
      og.appendChild(o);
    }
    sel.appendChild(og);
  }
  updateFields();
}

function updateFields() {
  const k = $('dfType').value,
    c = FCAT[k],
    n = nArt(),
    lock = $('iL').checked;
  $('dfArtL').style.display = c.art ? '' : 'none';
  $('dfSideL').style.display = c.side ? '' : 'none';
  $('dfValL').style.display = c.val ? '' : 'none';
  const as = $('dfArt');
  as.innerHTML = '';
  $('dfArtL').querySelector('span').textContent = (c.mot || c.por) ? 'Portion' : 'Articulation';
  $('dfSideL').querySelector('span').textContent = c.cote ? 'Côté' : c.mot ? 'Roue' : 'Vérin';
  if (c.mot || c.por) {
    if (c.all) {
      const o = document.createElement('option');
      o.value = -1;
      o.textContent = 'toutes les portions motorisées';
      as.appendChild(o);
    }
    for (let a = (c.por ? 0 : 1); a <= (c.por ? n : n); a++) {
      const o = document.createElement('option');
      o.value = a;
      o.textContent = 'portion ' + (a + 1);
      as.appendChild(o);
    }
  } else
    for (let a = (lock ? 1 : 0); a < n; a++) {
      const o = document.createElement('option');
      o.value = a;
      o.textContent = 'J' + (a + 2);
      as.appendChild(o);
    }
  if (c.val) {
    $('dfValN').textContent = c.nom.match(/\((.*)\)/) ? c.nom.match(/\((.*)\)/)[1] : 'Valeur';
    $('dfVal').value = c.val.def;
    $('dfVal').min = c.val.min;
    $('dfVal').max = c.val.max;
  }
}

function addFault() {
  const k = $('dfType').value,
    c = FCAT[k],
    f = {
      type: k,
      art: c.art ? +$('dfArt').value : null,
      side: c.side ? +$('dfSide').value : null,
      val: c.val ? +$('dfVal').value : null,
      t0: +$('dfT0').value
    };
  if (c.art && isNaN(f.art)) return;
  if (RNDSC) {
    FL = [];
    RNDSC = false;
  }
  FL.push(f);
  renderFaults();
}

function simOpts() { // options de simulation courantes (copie de ce que fait runAll, sans défauts)
  const N = +$('iN').value;
  return {
    N,
    V: +$('iV').value,
    c: $('vFree').checked ? Array(N - 1).fill(0) : ckArr(N - 1),
    gain: +$('iG').value,
    traj: trajParams(),
    brake: traj == 'brake' ? {
      a: +$('bDec').value,
      frac: +$('bFrac').value / 100,
      Vend: +$('bVend').value
    } : null,
    slope: traj == 'dev' ? {
      deg: +$('dDeg').value,
      dir: $('dDir').value == 'right' ? 1 : -1
    } : null,
    init: null,
    params: {
      ...advParams()
    },
    Tmax: +$('iT').value || 0,
    lock: $('iL').checked && N >= 2,
    Mmax: ($('iSat').checked ? Math.max(1, +$('iMs').value || 2500) : 0),
    verin: $('vOn').checked,
    vp: $('vOn').checked ? vpRead() : null,
    vec: vecOpts(),
    vGate: {
      vmin: +$('vSeuil').value || 0,
      rod: +$('vSeuilT').value || 0
    },
    ...trajExtra()
  };
}

function makeGhost(o) {
  window.RN = simulateClosed({
    ...o,
    faults: null
  });
  return $('cmp').checked ? window.RN : null;
}

function afterRun(o) {
  const g = gradeResult(R1, window.RN || R1),
    n = nArt();
  const f = FL.length ? '<br>' + FL.map(x => faultText(x, n)).join('<br>') : '';
  const info = FGRADES.find(x => x.k == g);
  $('msg').innerHTML = (FL.length ? '<b style="color:' + voyant(g, o.V, 1).col + '">' + voyant(g, o.V, 1).nom + '</b> — ' : '') + '<b style="color:' + info.col + '">Conséquence ' + g + ' — ' + info.nom + '</b> : erreur max de la queue ' + fmt(R1.et * 100, 0) + ' cm' + (window.RN ? ' (nominal : ' + fmt(window.RN.et * 100, 0) + ' cm)' : '') + (R1.status == 'diverge' ? ', le convoi diverge' : '') + '.' + f;
  buildReport(o);
}
// ----- scénario aléatoire -----
function drawScenario() {
  let lvl = $('rdLevel').value;
  if (lvl == 'alea') {
    lvl = ['peu', 'moyen', 'tres'][Math.floor(Math.random() * 3)];
  }
  const seed = +$('rdSeed').value || 1,
    sc = randomScenario(lvl, seed, nArt(), $('iL').checked, $('vOn').checked, $('xOn').checked);
  FL = sc.faults;
  RNDSC = true;
  renderFaults();
  $('dfList').innerHTML += '<div style="color:var(--mut);margin-top:4px">Scénario tiré : ' + FLEVELS[lvl].nom + ' (gravité cumulée a priori : ' + sc.sev + '), graine ' + seed + '. Cliquer sur « Simuler » pour lancer le calcul. Scénario aléatoire non modifiable : « Tout effacer » (onglet manuel) pour repartir de zéro.</div>';
  $('rdSeed').value = seed + 1;
} // le tirage affiche le scénario ; la simulation se lance avec « Simuler »
// ----- campagne -----
let CAMP = null;

function runCampaign() {
  const nS = +$('cpNum').value || 15,
    seed0 = +$('cpSeed').value || 1,
    o = simOpts(),
    n = nArt(),
    lock = o.lock,
    Rn = simulateClosed({
      ...o,
      faults: null
    }),
    levels = ['peu', 'moyen', 'tres'],
    res = [];
  let li = 0,
    s = 0;
  const tot = 3 * nS;
  $('cpRun').disabled = $('cpRunRand').disabled = true;
  const step = () => {
    const lvl = levels[li],
      sc = randomScenario(lvl, seed0 + s, n, lock, o.verin, !!o.vec),
      R = simulateClosed({
        ...o,
        faults: sc.faults
      }),
      g = gradeResult(R, Rn);
    res.push({
      level: lvl,
      seed: seed0 + s,
      sev: sc.sev,
      faults: sc.faults,
      grade: g,
      et: R.et,
      dep: 0,
      status: R.status
    });
    s++;
    if (s >= nS) {
      s = 0;
      li++;
    }
    $('cpProg').textContent = res.length + ' / ' + tot;
    if (res.length < tot) setTimeout(step, 0);
    else {
      CAMP = {
        res,
        Rn,
        o,
        n
      };
      $('cpRun').disabled = $('cpRunRand').disabled = false;
      $('cpProg').textContent = 'terminé';
      showCampaign();
      $('campCard').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };
  setTimeout(step, 0);
}

function showCampaign() {
  const {
    res,
    Rn
  } = CAMP, card = $('campCard');
  card.classList.remove('hid');
  let h = '<div class="sect">Résultats de la campagne (' + res.length + ' scénarios, manœuvre et réglages courants, nominal : erreur de queue ' + fmt(Rn.et * 100, 0) + ' cm)</div>';
  h += '<table style="border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums"><tr style="color:var(--mut);text-align:left"><th>Criticité a priori</th>' + FGRADES.map(g => '<th style="color:' + g.col + '">' + g.k + ' ' + g.nom + '</th>').join('') + '<th>erreur de queue moyenne</th></tr>';
  for (const lvl of ['peu', 'moyen', 'tres']) {
    const rr = res.filter(r => r.level == lvl);
    h += '<tr><td><b>' + FLEVELS[lvl].nom + '</b> (' + rr.length + ')</td>';
    for (const g of FGRADES) {
      const c = rr.filter(r => r.grade == g.k).length;
      h += '<td>' + c + ' (' + Math.round(100 * c / rr.length) + ' %)</td>';
    }
    const m = rr.reduce((a, r) => a + Math.min(r.et, 10), 0) / rr.length;
    h += '<td>' + fmt(m * 100, 0) + ' cm</td></tr>';
  }
  h += '</table><canvas id="cpBars" width="1100" height="150" style="margin-top:8px"></canvas>';
  h += '<div class="sect" style="margin-top:10px">Scénarios les plus critiques (cliquer pour rejouer)</div><table style="border-collapse:collapse;width:100%;font-size:14px">';
  const worst = [...res].sort((a, b) => (b.status == 'diverge') - (a.status == 'diverge') || b.et - a.et).slice(0, 10);
  for (const r of worst) {
    const gi = FGRADES.find(x => x.k == r.grade);
    h += '<tr class="cpRow" data-seed="' + r.seed + '" data-level="' + r.level + '" style="cursor:pointer;border-top:1px solid var(--line)"><td style="color:' + gi.col + '"><b>' + r.grade + '</b></td><td>' + FLEVELS[r.level].nom + '</td><td>' + fmt(Math.min(r.et, 99) * 100, 0) + ' cm</td><td>' + r.faults.map(f => faultText(f, CAMP.n)).join(' ; ') + '</td></tr>';
  }
  h += '</table>';
  card.innerHTML = h;
  for (const tr of document.querySelectorAll('.cpRow')) tr.onclick = () => {
    const r = CAMP.res.find(x => x.seed == +tr.dataset.seed && x.level == tr.dataset.level);
    FL = r.faults.map(f => ({
      ...f
    }));
    RNDSC = true;
    renderFaults();
    runAll();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  // barres empilées par niveau
  const cv = $('cpBars'),
    g = cv.getContext('2d'),
    W = cv.width;
  g.clearRect(0, 0, W, cv.height);
  g.font = '13px system-ui';
  ['peu', 'moyen', 'tres'].forEach((lvl, i) => {
    const rr = res.filter(r => r.level == lvl);
    let x = 190;
    const y = 18 + i * 44;
    g.fillStyle = css('--ink');
    g.fillText(FLEVELS[lvl].nom, 6, y + 18);
    for (const gi of FGRADES) {
      const w = (W - 210) * rr.filter(r => r.grade == gi.k).length / rr.length;
      g.fillStyle = gi.col;
      g.fillRect(x, y, w, 28);
      x += w;
    }
  });
}
// ----- initialisation -----
function initDegrade() {
  fillTypes();
  renderFaults();
  $('dfType').onchange = updateFields;
  $('dfAdd').onclick = addFault;
  $('dfClear').onclick = () => {
    FL = [];
    RNDSC = false;
    renderFaults();
  };
  for (const [b, p] of [
      ['dmMan', 'dpMan'],
      ['dmRnd', 'dpRnd'],
      ['dmCmp', 'dpCmp']
    ]) $(b).onclick = () => {
    for (const [b2, p2] of [
        ['dmMan', 'dpMan'],
        ['dmRnd', 'dpRnd'],
        ['dmCmp', 'dpCmp']
      ]) {
      $(b2).classList.toggle('on', b2 == b);
      $(p2).classList.toggle('hid', p2 != p);
    }
  };
  $('rdDraw').onclick = drawScenario;
  $('rdRand').onclick = () => {
    $('rdSeed').value = 1 + Math.floor(Math.random() * 999999);
    drawScenario();
  };
  $('cpRun').onclick = runCampaign;
  $('cpRunRand').onclick = () => {
    $('cpSeed').value = 1 + Math.floor(Math.random() * 999999);
    runCampaign();
  };
  $('iN').addEventListener('input', () => {
    updateFields();
    renderFaults();
  });
  $('iL').addEventListener('change', updateFields);
  {
    const oc = $('ov').closest('.card'),
      rc = $('repCard');
    if (oc && rc) oc.after(rc);
  } {
    const lg = document.querySelector('.leg');
    if (lg) lg.insertAdjacentHTML('beforeend', '<span><i style="background:#78b9eb"></i>flaque (adhérence locale)</span><span><i style="background:#d4a800"></i>panne peu grave</span><span><i style="background:#e8742a"></i>panne moyenne</span><span><i style="background:#d0342c"></i>panne grave (articulation / vérin)</span>');
  } {
    const m = /fl=(\w+)\/(\d+)\/(\d)\/([0-9.]+)\/?([0-9.]*)/.exec(location.hash);
    if (m) {
      const c = FCAT[m[1]];
      FL.push({
        type: m[1],
        art: c.art ? +m[2] : null,
        side: c.side ? +m[3] : null,
        val: c.val ? +(m[5] || c.val.def) : null,
        t0: +m[4]
      });
      renderFaults();
      setTimeout(() => {
        const g = /go=([0-9.]+)/.exec(location.hash);
        runAll(() => {
          if (g) {
            t = +g[1];
            playing = false;
          }
        });
      }, 50);
    }
  } {
    const h = location.hash,
      r = /rnd=(peu|moyen|tres)\/(\d+)/.exec(h);
    if (r) {
      $('rdLevel').value = r[1];
      $('rdSeed').value = r[2];
      drawScenario();
      if (/run/.test(h)) setTimeout(() => {
        const g = /go=([0-9.]+)/.exec(h);
        runAll(() => {
          if (g) {
            t = +g[1];
            playing = false;
          }
        });
      }, 50);
    }
    const c = /camp=(\d+)/.exec(h);
    if (c) {
      $('cpNum').value = c[1];
      setTimeout(runCampaign, 50);
    }
  }
  $('vOn').checked = true;
  $('vOn').dispatchEvent(new Event('change'));
  const lab = $('cmp').parentElement;
  lab.lastChild.textContent = ' comparer au cas nominal (sans défaut)';
  $('cmp').checked = true;
  // séparation nette : le paramétrage des défauts est dans sa propre carte, le bouton « Simuler » est commun aux deux
  const setCard = $('iN').closest('.card'),
    deg = $('degBlock'),
    runBar = $('bSim').closest('.bar');
  setCard.insertAdjacentHTML('afterbegin', '<div style="font-size:18px;font-weight:700;margin:0 0 6px">1. Paramétrage de la simulation</div>');
  const dc = document.createElement('div');
  dc.className = 'card';
  dc.style.cssText = 'border-left:6px solid var(--ghost)';
  dc.innerHTML = '<div style="font-size:18px;font-weight:700;margin:0 0 6px">2. Paramétrage des modes dégradés (injection de défauts)</div>';
  dc.appendChild(deg);
  setCard.parentNode.insertBefore(dc, setCard.nextSibling);
  dc.parentNode.insertBefore(runBar, dc.nextSibling);
  // la case de comparaison est placée dans la sélection des défauts
  const box = document.createElement('div');
  box.style.cssText = 'margin:2px 0 10px';
  lab.style.cssText = 'display:inline-flex;align-items:center;gap:8px';
  box.appendChild(lab);
  $('dpMan').parentNode.insertBefore(box, $('dpMan'));
}
// ===== rapport de simulation =====
function voyant(g, V, hasF) {
  if (!hasF) return {
    col: '#2e9e5b',
    nom: 'Aucune panne',
    act: 'Fonctionnement normal.'
  };
  if (g == 'D') return {
    col: '#d0342c',
    nom: 'VOYANT ROUGE — arrêt d\'urgence',
    act: 'Arrêt d\'urgence du convoi et retour immédiat au garage (remorquage si nécessaire).'
  };
  if (g == 'C') return {
    col: '#e8742a',
    nom: 'VOYANT ORANGE — mode dégradé',
    act: 'Passage en mode dégradé : vitesse limitée à ' + Math.min(V, 10) + ' km/h, retour au garage dès que possible.'
  };
  if (g == 'B') return {
    col: '#e8742a',
    nom: 'VOYANT ORANGE — mode dégradé',
    act: 'Passage en mode dégradé : vitesse limitée à ' + Math.min(V, 20) + ' km/h pour terminer la mission.'
  };
  return {
    col: '#2e9e5b',
    nom: 'PANNE PEU CRITIQUE (voyant vert/jaune)',
    act: 'L\'opérateur peut terminer son trajet normalement et traiter la panne en fin de journée.'
  };
}

function levelOfSev(s) {
  return s <= 2 ? 'peu' : s <= 5 ? 'moyen' : 'tres';
}

function sevOf(F) {
  let sv = 0;
  const seen = {};
  for (const f of F) {
    const c = FCAT[f.type];
    const key = f.type;
    seen[key] = (seen[key] || 0) + 1;
    sv += faultSev(f) * (seen[key] > 1 ? 0.5 : 1);
  }
  return sv;
}

function metrics(R) {
  const f = R.frames;
  let amax = 0,
    Mmax = 0,
    tAt = [null, null, null];
  const thr = [0.5, 1, 2];
  for (const fr of f) {
    for (let k = 0; k < thr.length; k++)
      if (tAt[k] === null && Math.abs(fr.et) > thr[k]) tAt[k] = fr.t;
    for (const m of fr.Ma) Mmax = Math.max(Mmax, Math.abs(m));
  }
  const dep = R.dep || deportCompute(f),
    dmax = Math.max(0, ...dep.map(p => Math.abs(p.d))),
    q = rwaCompute(f);
  return {
    hits: R.hits,
    et: R.et,
    eh: R.eh,
    dep: dmax,
    rwa: q ? q.ra : null,
    ay: q ? Math.max(...q.peaks) : null,
    dm: R.dm,
    Mmax,
    thm: R.thm,
    status: R.status,
    tEnd: R.tEnd,
    tAt
  };
}

function buildReport(o) {
  const card = $('repCard');
  card.classList.remove('hid');
  const n = nArt(),
    mR = metrics(R1),
    mN = window.RN ? metrics(window.RN) : null;
  const F = getFaults(),
    sev = sevOf(F),
    lvl = levelOfSev(sev),
    g = gradeResult(R1, window.RN || R1),
    gi = FGRADES.find(x => x.k == g);
  const man = {
    line: 'ligne droite avec écart initial',
    elk: 'test de l\'élan',
    slalom: 'slalom',
    turn: 'virage',
    brake: 'freinage en virage',
    dev: 'ligne droite avec dévers',
    str: 'essai de volant',
    cir: 'cercle (virage stabilisé)',
    urb: 'circuit urbain'
  } [traj] || traj;
  const tr = (lab, a, b, u, d) => '<tr><td>' + lab + '</td><td>' + (b === null || b === undefined ? '—' : fmt(b, d) + ' ' + u) + '</td><td>' + (a === null ? '—' : fmt(a, d) + ' ' + u) + '</td></tr>';
  const t0min = F.length ? Math.min(...F.map(f => f.t0)) : null;
  let h = '<div style="font-size:20px;font-weight:700;margin-bottom:6px">Rapport de simulation — mode dégradé</div>';
  h += '<div style="color:var(--mut);font-size:13px;margin-bottom:10px">Généré le ' + new Date().toLocaleString('fr-FR') + '</div>';
  const vy = voyant(g, o.V, F.length > 0);
  h += '<div style="border-left:8px solid ' + vy.col + ';background:rgba(128,128,128,.12);padding:8px 12px;border-radius:6px;margin-bottom:8px"><div style="font-weight:700;color:' + vy.col + '">' + vy.nom + '</div>' + (F.length ? '<div>Panne survenant à t = ' + t0min.toFixed(1) + ' s.</div>' : '') + '<div>' + vy.act + '</div></div>';
  h += '<h3 style="margin:10px 0 4px">1. Configuration</h3><ul style="margin:0;padding-left:20px"><li>Manœuvre : <b>' + man + '</b>, vitesse ' + o.V + ' km/h</li><li>Convoi : <b>' + o.N + ' portions</b>' + (o.lock ? ', 1ʳᵉ articulation bloquée' : '') + ', amortissement moyen c = ' + Math.round(cOf()) + ' N·m·s/rad' + ($('rMode').value != 'unif' ? ' (réparti, loi ' + $('rMode').value + ')' : ' (uniforme)') + ', couples limités à ' + (o.Mmax ? '±' + o.Mmax + ' N·m' : 'aucune limite') + '</li><li>Pneus : ' + ($('iSatP').checked ? 'saturés' : 'linéaires') + (o.verin ? ' ; dynamique des vérins activée' + ($('vpFb').checked ? ' (boucle fermée sur l\'effort)' : ' (boucle ouverte)') : ' ; amortisseur idéal') + '</li></ul>';
  h += '<h3 style="margin:10px 0 4px">2. Défauts injectés</h3>';
  if (!F.length) h += '<p style="margin:0">Aucun défaut : simulation nominale.</p>';
  else h += '<table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="color:var(--mut);text-align:left"><th>Défaut</th><th>Apparition</th><th>Gravité (a priori)</th></tr>' + F.map(f => '<tr style="border-top:1px solid var(--line)"><td>' + faultText(f, n).replace(/, à t = .*$/, '') + '</td><td>' + (+f.t0).toFixed(1) + ' s</td><td>' + faultSev(f) + ' / 5</td></tr>').join('') + '</table><p style="margin:6px 0 0">Gravité cumulée : <b>' + sev.toFixed(1) + '</b> → scénario <b>' + FLEVELS[lvl].nom + '</b> a priori.</p>';
  h += '<h3 style="margin:10px 0 4px">3. Résultats</h3><table style="border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums;font-size:14px"><tr style="color:var(--mut);text-align:left"><th>Grandeur</th><th>Nominal</th><th>Mode dégradé</th></tr>' +
    tr('Erreur max de la queue', mR.et * 100, mN ? mN.et * 100 : null, 'cm', 0) + tr('Erreur max de la tête', mR.eh * 100, mN ? mN.eh * 100 : null, 'cm', 0) + tr('Déport max queue / tête', mR.dep * 100, mN ? mN.dep * 100 : null, 'cm', 0) +
    (mR.hits ? tr('Plots touchés (sur ' + mR.hits.n + ')', mR.hits.hit, mN && mN.hits ? mN.hits.hit : null, '', 0) : '') + tr('Rearward amplification (RWA)', mR.rwa, mN ? mN.rwa : null, '', 2) + tr('Accélération latérale max', mR.ay, mN ? mN.ay : null, 'm/s²', 1) + tr('Braquage max de la tête', mR.dm, mN ? mN.dm : null, '°', 0) + tr('Couple max d\'articulation', mR.Mmax, mN ? mN.Mmax : null, 'N·m', 0) + tr('Lacet relatif max entre portions', mR.thm, mN ? mN.thm : null, '°', 0) + '</table>';
  h += '<h3 style="margin:10px 0 4px">4. Conséquence et criticité</h3><p style="margin:0"><b style="color:' + gi.col + '">Conséquence ' + g + ' — ' + gi.nom + '</b>' + (F.length ? ' pour un scénario ' + FLEVELS[lvl].nom + ' a priori.' : '.') + '</p>';
  h += '<p style="margin:4px 0 0;color:var(--mut);font-size:13px">Échelle (critères de ce simulateur) : A sans conséquence (erreur de queue &lt; 50 cm et &lt; 25 cm de plus que le nominal) ; B dégradation (&gt; 50 cm) ; C sortie de trajectoire (&gt; 1 m) ; D perte de contrôle (divergence ou &gt; 2 m).</p>';
  h += '<h3 style="margin:10px 0 4px">5. Chronologie</h3><ul style="margin:0;padding-left:20px">';
  if (F.length) h += '<li>Premier défaut à t = ' + t0min.toFixed(1) + ' s.</li>';
  const lab = ['50 cm', '1 m', '2 m'];
  mR.tAt.forEach((t, k) => {
    if (t !== null) h += '<li>Erreur de queue &gt; ' + lab[k] + ' à t = ' + t.toFixed(1) + ' s' + (t0min !== null ? ' (' + (t - t0min >= 0 ? '+' : '') + (t - t0min).toFixed(1) + ' s après le premier défaut)' : '') + '.</li>';
  });
  if (R1.status == 'diverge') h += '<li>Divergence du convoi à t = ' + R1.tEnd.toFixed(1) + ' s.</li>';
  if (mR.tAt.every(t => t === null) && R1.status != 'diverge') h += '<li>L\'erreur de queue reste sous 50 cm sur toute la manœuvre.</li>';
  h += '</ul>';
  h += '<h3 style="margin:10px 0 4px">6. Observations</h3><ul style="margin:0;padding-left:20px">';
  const obs = [];
  if (mN && mR.et > mN.et + 0.25) obs.push('L\'erreur de queue augmente de ' + fmt((mR.et - mN.et) * 100, 0) + ' cm par rapport au nominal.');
  if (mN && mR.rwa !== null && mN.rwa !== null && mR.rwa > mN.rwa * 1.2) obs.push('Le rearward amplification augmente (de ' + fmt(mN.rwa, 2) + ' à ' + fmt(mR.rwa, 2) + ') : la manœuvre est davantage amplifiée vers l\'arrière.');
  if (mN && mR.Mmax < 0.5 * mN.Mmax && mN.Mmax > 200) obs.push('Le couple d\'articulation max chute fortement (' + fmt(mR.Mmax, 0) + ' N·m contre ' + fmt(mN.Mmax, 0) + ') : l\'amortissement est perdu sur au moins une articulation.');
  if (mN && mR.Mmax > 1.5 * mN.Mmax && mR.Mmax > 1000) obs.push('Le couple d\'articulation max augmente fortement (' + fmt(mR.Mmax, 0) + ' N·m) : sollicitation anormale des actionneurs.');
  if (F.some(f => f.type == 'act_grippage')) obs.push('Un grippage supprime un degré de liberté : l\'articulation se comporte comme une liaison rigide.');
  if (F.some(f => f.type.startsWith('env_'))) obs.push('Le défaut d\'environnement (adhérence, charge) modifie la dynamique du convoi indépendamment de la commande.');
  if (R1.status == 'diverge') obs.push('Le convoi diverge : le mode dégradé n\'est pas tenable à cette vitesse avec ces réglages. Réduire la vitesse, augmenter l\'amortissement ou prévoir un mode de repli.');
  if (!obs.length) obs.push('Pas d\'effet notable sur cette manœuvre.');
  h += obs.map(x => '<li>' + x + '</li>').join('') + '</ul>';
  h += '<p style="margin:10px 0 0;color:var(--mut);font-size:12px">Résultats de simulation (modèle de Lagrange non linéaire, pneus et actionneurs modélisés) : analyse exploratoire, à confronter à des essais ; la criticité a priori repose sur des gravités attribuées par l\'auteur, sans probabilité de panne.</p>';
  h += '<div class="noprint" style="margin-top:10px"><button id="repPrint" class="on">Imprimer / enregistrer en PDF</button> <button id="repDl">Télécharger le rapport (.html)</button></div>';
  card.innerHTML = h;
  $('repPrint').onclick = () => window.print();
  $('repDl').onclick = () => {
    const css = 'body{font-family:system-ui,Segoe UI,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:#222}table{border-collapse:collapse;width:100%}td,th{padding:3px 8px;border-top:1px solid #ddd;text-align:left}';
    const body = card.cloneNode(true);
    body.querySelectorAll('.noprint').forEach(e => e.remove());
    const blob = new Blob(['<!doctype html><meta charset="utf-8"><title>Rapport de simulation</title><style>' + css + '</style>' + body.innerHTML.replace(/var\\(--mut\\)/g, '#667').replace(/var\\(--line\\)/g, '#ddd')], {
      type: 'text/html'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rapport_simulation_degrade.html';
    a.click();
  };
}

// couleur selon la gravité (a priori) du défaut actif : jaune ≤ 2, orange 3, rouge ≥ 4
function sevColor(s) {
  return s >= 4 ? '#d0342c' : s == 3 ? '#e8742a' : '#d4a800';
}
window.artFault = function (a, tn) {
  const F = (R1 && R1.faults) || [];
  let sa = 0,
    sl = 0,
    sr = 0;
  for (const f of F) {
    if (f.art !== a || tn < f.t0 || FCAT[f.type].mot || FCAT[f.type].por) continue;
    const s = faultSev(f);
    sa = Math.max(sa, s);
    if (f.type.startsWith('act_') || f.type.startsWith('cap_')) {
      if (f.side === 0 || f.side === 1) {
        if (f.side === 0) sl = Math.max(sl, s);
        else sr = Math.max(sr, s);
      } else {
        sl = Math.max(sl, s);
        sr = Math.max(sr, s);
      }
    }
  }
  return sa ? {
    art: sevColor(sa),
    cyl: [sl ? sevColor(sl) : null, sr ? sevColor(sr) : null]
  } : null;
};

// flaque d'eau (perte d'adhérence locale), posée sur la route à l'endroit où la tête arrive à l'instant d'apparition
window.drawPatch = function (ctx, sc, S) {
  // perte d'adhérence jusqu'à la fin de la manœuvre : bande translucide le long de la trajectoire, à partir de la position de la tête à l'apparition
  const ft = (R1 && R1.faults || []).find(x => x.type == 'env_adh_tot');
  if (ft && t >= ft.t0) {
    const pa = R1.path;
    if (R1._adhT === undefined) {
      const h = at(R1, ft.t0).J[0];
      let b = 0,
        bd = 1e9;
      for (let k = 0; k < pa.n; k++) {
        const dd = Math.hypot(pa.xs[k] - h[0], pa.ys[k] - h[1]);
        if (dd < bd) {
          bd = dd;
          b = k;
        }
      }
      R1._adhT = b;
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(120,185,235,.13)';
    ctx.lineWidth = 3.2 * S;
    ctx.beginPath();
    let st = false;
    for (let k = R1._adhT; k < pa.n; k += 3) {
      const q = sc([pa.xs[k], pa.ys[k]]);
      if (q[0] < -80 || q[0] > cv.width + 80) {
        st = false;
        continue;
      }
      st ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
      st = true;
    }
    ctx.stroke();
    ctx.restore();
  }
  const fc = (R1 && R1.faults || []).find(x => x.type == 'env_adh_cote');
  if (fc && t >= fc.t0) {
    const pa = R1.path;
    if (R1._adhC === undefined) {
      const h = at(R1, fc.t0).J[0];
      let b = 0,
        bd = 1e9;
      for (let k = 0; k < pa.n; k++) {
        const dd = Math.hypot(pa.xs[k] - h[0], pa.ys[k] - h[1]);
        if (dd < bd) {
          bd = dd;
          b = k;
        }
      }
      R1._adhC = b;
    }
    const sg = fc.side == 0 ? 1 : -1,
      off = 1.1 * sg; // bande de chaussée glissante du côté choisi (gauche : +, droit : −)
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(120,185,235,.2)';
    ctx.lineWidth = 2.0 * S;
    ctx.beginPath();
    let st = false;
    for (let k = R1._adhC; k < pa.n; k += 3) {
      const q = sc([pa.xs[k] - off * Math.sin(pa.psi[k]), pa.ys[k] + off * Math.cos(pa.psi[k])]);
      if (q[0] < -80 || q[0] > cv.width + 80) {
        st = false;
        continue;
      }
      st ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
      st = true;
    }
    ctx.stroke();
    ctx.restore();
  }
  const p = R1 && R1.puddle;
  if (!p) return;
  const c = sc([p.x, p.y]);
  ctx.save();
  ctx.translate(c[0], c[1]);
  ctx.rotate(-p.th);
  const blobs = [
    [0, 0, 1.25, 0.8],
    [-0.9, 0.35, 0.75, 0.55],
    [0.8, -0.4, 0.8, 0.5],
    [0.2, 0.6, 0.7, 0.45],
    [-0.3, -0.55, 0.9, 0.4]
  ];
  ctx.fillStyle = 'rgba(90,160,220,.13)';
  ctx.strokeStyle = 'rgba(120,185,235,.28)';
  ctx.lineWidth = 1;
  for (const b of blobs) {
    ctx.beginPath();
    ctx.ellipse(b[0] * p.R * S * 0.8, b[1] * p.R * S * 0.5, b[2] * p.R * S * 0.62, b[3] * p.R * S * 0.62, 0, 0, 7);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, p.R * S * 0.95, p.R * S * 0.62, 0, 0, 7);
  ctx.stroke();
  ctx.restore();
};

// moteur-roue hors service à l'instant t (portion k, côté sd : +1 gauche, -1 droite) : roue dessinée en noir
window.motFail = function (k, sd, tn) {
  for (const f of (R1 && R1.faults) || []) {
    const t = f.type;
    if (!(t == 'mot_un' || t == 'mot_deux' || t == 'mot_bloque') || f.art !== k || tn < f.t0) continue;
    if (t == 'mot_deux' || (sd > 0 ? f.side == 0 : f.side == 1)) return true;
  }
  return false;
};

// pneu crevé (portion k) : roue extérieure gauche dessinée en brun ; état moteur global (régénération indisponible, couple limité)
window.tyreFail = function (k, tn) {
  for (const f of (R1 && R1.faults) || [])
    if (f.type == 'pneu_creve' && f.art === k && tn >= f.t0) return true;
  return false;
};
window.driveAt = function (tn) {
  let tqf = 1;
  for (const f of (R1 && R1.faults) || []) {
    if (tn < f.t0) continue;
    if (f.type == 'couple_limite') tqf = Math.min(tqf, +f.val);
  }
  return {
    regOff: false,
    tqf
  };
};
// état de la batterie d'une portion : pleine (pas de régénération) ou vide (pas de traction)
window.battAt = function (k, tn) {
  let full = false,
    empty = false;
  for (const f of (R1 && R1.faults) || []) {
    if (tn < f.t0 || !(f.art === k || f.art < 0)) continue;
    if (f.type == 'reg_indispo') full = true;
    if (f.type == 'batt_vide') empty = true;
  }
  return (full || empty) ? {
    full,
    empty
  } : null;
};
