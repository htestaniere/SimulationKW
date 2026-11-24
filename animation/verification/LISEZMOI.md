# Vérification de la dynamique des vérins (src/verin.js)

Dépendances : `pip install h5py scipy numpy`. Les essais sont lus dans `Bureau/EssaisVerin/Caractérisation_Ver1` (fichiers MATLAB 7.3).

1. `ref_matlab.py` : transcription de `modeleVerinArt.m` + `debitValve.m` + `comparaison_modele_mesures.m` (Python, scipy Radau).
   Résultats reproduits par rapport à `analyse_essais/resultats/comparaison_modele_mesures.csv` :

   | essai | RMS F (CSV MATLAB) | RMS F (cette transcription) | pic ΔP modèle (MATLAB / ici) |
   |---|---|---|---|
   | data2/id_i094_f02 | 29 N | 31 N | 0,36 / 0,35 bar |
   | data3/id_i089_f05 | 93 N | 92 N | 3,50 / 3,50 bar |
   | data4/id_i089_f1 | 365 N | 367 N | 12,15 / 12,27 bar |

2. Écart entre `verin.js` (pas implicite Rosenbrock, 4 sous-pas par pas de 1 ms) et cette transcription, mêmes entrées :
   RMS P1 ≤ 0,02 bar, P2 ≤ 0,002 bar, force ≤ 1,5 N (efforts de 165 à 350 N crête-crête).

3. Ajustement d'un facteur sur la section K de la table constructeur (RMS de force) :
   data3 : K ×1,98, 92 N → 28 N ; data4 : K ×3,08, 367 N → 38 N (data2, trop lente, est peu sensible : ×8, 31 → 25 N).
   La structure du modèle est correcte ; la table constructeur sous-estime le débit réel de la vanne d'un facteur 2 à 3.
   Réglage correspondant dans la page : « Facteur sur la section K de la table constructeur » (menu vanne).
