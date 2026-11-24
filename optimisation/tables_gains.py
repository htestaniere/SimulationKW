# -*- coding: utf-8 -*-
"""Table complète des gains d'amortissement optimisés.
Entrées : resultats_vec.json (amortisseur idéal) et resultats_verin.json (dynamique des vérins), clés « V_vectoring ».
Sorties : table_gains.csv, table_gains.md, gains_page.json (table lue par la page de simulation)."""
import json, io, statistics
cfgs = [('ideal', 0, 'amortisseur idéal, sans vectoring'), ('ideal', 1, 'amortisseur idéal, avec vectoring'),
        ('verin', 0, 'vérins dynamiques, sans vectoring'), ('verin', 1, 'vérins dynamiques, avec vectoring')]
src = {'ideal': json.load(open('resultats_vec.json')), 'verin': json.load(open('resultats_verin.json'))}
V = [10, 20, 30, 40]; N = list(range(3, 11))
def weights(n, s):
    g = [max(0.0, 1 + s * (1 - 2 * (k / (n - 1) if n > 1 else 0))) for k in range(n)]
    m = sum(g) / n or 1
    return [x / m for x in g]
def med3(a, i):
    w = a[max(0, i - 1):i + 2]
    return statistics.median(w)
rows, page = [], {}
for model, vec, nom in cfgs:
    key = model + str(vec); page[key] = {}
    for v in V:
        tab = src[model].get('%d_%d' % (v, vec), {})
        cs = [tab[str(n)]['c'] for n in N]; ss = [tab[str(n)]['s'] for n in N]
        page[key][v] = {}
        for i, n in enumerate(N):
            r = tab[str(n)]; bad = [d['m'] for d in r['det'] if d['bad']]
            rw = [d['rwa'] for d in r['det'] if not d['bad']]
            hit = sum(d['hit'] for d in r['det'])
            # valeurs utilisées par la page : brutes à 10 et 20 km/h, filtre médian sur N (fenêtre 3) à 30 et 40 km/h (c mal identifié, voir rapport)
            cu = cs[i] if v <= 20 else statistics.median(cs[max(0, i - 1):i + 2]); su = ss[i] if v <= 20 else statistics.median(ss[max(0, i - 1):i + 2])
            page[key][v][n] = {'c': round(cu), 's': round(su, 2), 'bad': bad}
            ck = [round(cu * w) for w in weights(n - 1, su)]
            rows.append((nom, key, v, n, r['c'], r['s'], round(r['J'], 2), round(sum(rw) / len(rw), 2) if rw else '', hit, ';'.join(bad), round(cu), round(su, 2), ck))
with io.open('table_gains.csv', 'w', encoding='utf-8') as f:
    f.write('configuration;V_kmh;N;c_opt;pente_s;J;RWA_moyen;plots_touches;manoeuvres_divergentes;c_page;pente_page;c_articulations_page_N_m_s_rad\n')
    for nom, key, v, n, c, s, J, rwa, hit, bad, cu, su, ck in rows:
        f.write(';'.join(str(x) for x in (nom, v, n, c, s, J, rwa, hit, bad, cu, su, ' '.join(map(str, ck)))) + '\n')
with io.open('table_gains.md', 'w', encoding='utf-8') as f:
    f.write('# Table complète des gains d\'amortissement optimisés\n\n')
    f.write('Critère J et manœuvres : voir `optimisation.tex` (test de l\'élan, slalom, virage 90°, freinage en virage). '
            '`c` : amortissement moyen (N·m·s/rad), `s` : pente de la répartition linéaire (+ : plus à l\'avant). '
            'Les colonnes « page » sont les valeurs utilisées par le simulateur : valeurs brutes à 10 et 20 km/h, '
            'filtre médian sur N (fenêtre 3) à 30 et 40 km/h où c est mal identifié (manœuvre divergente dominante).\n\n')
    for model, vec, nom in cfgs:
        f.write('## %s\n\n| V (km/h) | N | c opt. | s opt. | J | RWA | plots | divergences | c page | s page | c par articulation J2…JN (page) |\n|---|---|---|---|---|---|---|---|---|---|---|\n' % nom)
        for r in rows:
            if r[1] == model + str(vec):
                _, _, v, n, c, s, J, rwa, hit, bad, cu, su, ck = r
                f.write('| %d | %d | %d | %+.2f | %.2f | %s | %d | %s | %d | %+.2f | %s |\n' % (v, n, c, s, J, rwa, hit, bad or '–', cu, su, ', '.join(map(str, ck))))
        f.write('\n')
json.dump(page, open('gains_page.json', 'w'), ensure_ascii=False)
print(len(rows), 'lignes')
