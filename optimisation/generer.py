"""Fusionne les journaux de calcul (logs/rwa_V*_N*.txt), écrit resultats_par_vitesse.json, resultats.json
(table lue par la page de simulation) et tableaux.tex (tableaux du rapport optimisation.tex)."""
import json, re, glob
res = {}
for f in sorted(glob.glob('logs/rwa_V*_N*.txt')):
    v = int(re.search(r'rwa_V(\d+)_', f).group(1))
    txt = open(f, errors='ignore').read()
    m = re.search(r'TERMINE (\{.*?\})", source', txt, re.S)
    if m: res.setdefault(v, {}).update(json.loads(m.group(1)))
json.dump(res, open('resultats_par_vitesse.json', 'w'), ensure_ascii=False)
json.dump({v: {N: {'c': r['c'], 's': r['s'], 'bad': [d['m'] for d in r['det'] if d['bad']]} for N, r in rr.items()} for v, rr in res.items()},
          open('resultats.json', 'w'), ensure_ascii=False)
def fmt(x, d=2): return ('%.*f' % (d, x)).replace('.', '{,}')
out = []
for v in sorted(res):
    out.append('\\begin{table}[ht]\\centering\\small\n\\begin{tabular}{@{}r r r r r l@{}}\\toprule\n$N$ & $c$ (N$\\cdot$m$\\cdot$s/rad) & pente $s$ & $J$ & RWA moyen & manoeuvres divergentes\\\\\\midrule')
    for N in sorted(res[v], key=int):
        r = res[v][N]; bad = [d['m'] for d in r['det'] if d['bad']]
        rwa = [d['rwa'] for d in r['det'] if 'rwa' in d and not d['bad']]
        out.append('%s & %d & $%s$ & %s & %s & %s\\\\' % (N, r['c'], ('+' if r['s'] >= 0 else '-') + fmt(abs(r['s'])), fmt(r['J']), fmt(sum(rwa) / len(rwa)) if rwa else '--', ', '.join(bad) if bad else '--'))
    out.append('\\bottomrule\\end{tabular}\n\\caption{Réglage optimal à \\SI{%d}{km/h}.}\\label{tab:opt%d}\\end{table}\n' % (v, v))
open('tableaux.tex', 'w', encoding='utf-8').write('\n'.join(out))
print({v: len(r) for v, r in res.items()})
