# Simulation du convoi articulé

Outil de simulation d'un convoi de véhicules Kiwee à pivots libres (portions articulées, vérins d'articulation, répartition du couple).

## Utilisation

Ouvrir `simulation_convoi.html` dans Chrome, Edge ou Firefox. La page est autonome : ni installation ni connexion internet.
Choisir une manœuvre (test de l'élan ISO 3888-2, slalom, virage, cercle, circuit urbain, freinage en virage, dévers), régler les paramètres, puis cliquer sur « Simuler ».

- `simulation_convoi.html` : mode nominal.
- `simulation_degrade.html` : modes dégradés (analyse safety, injection de défauts). Les deux pages se renvoient l'une à l'autre : les garder dans le même dossier.

## Contenu

| Dossier | Contenu |
|---|---|
| `animation/src/` | Sources : moteur de simulation (`moteur.js`), vérins (`verin.js`), répartition du couple (`rwa.js`, `couple.js`), défauts (`faults.js`, `degrade.js`), gabarit de la page (`gabarit_fermee.html`), logos. |
| `animation/construire.py` | Assemble les deux pages HTML autonomes à partir de `src/` (`cd animation && python3 construire.py`). Lit `../optimisation/gains_page.json`. |
| `animation/mode_emploi/` | Mode d'emploi (LaTeX + PDF). |
| `animation/rapport_outil/` | Rapport sur l'outil de simulation (LaTeX + PDF). |
| `animation/verification/` | Scripts de comparaison avec le modèle Matlab. |
| `optimisation/` | Optimisation des gains d'amortissement : scripts (`generer.py`, `tables_gains.py`, `lancer_*.sh`), résultats (`resultats*.json`, `table_gains.*`), rapport (`optimisation.tex/.pdf`). Les journaux bruts ne sont pas versionnés. |

`simulation_convoi.html` et `simulation_degrade.html` à la racine sont des copies des pages construites dans `animation/`.

Hugo TESTANIERE, Laboratoire Ampère / Metacar–Kiwee
