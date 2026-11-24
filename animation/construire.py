"""Construit la page autonome simulation_convoi.html (moteur de simulation + vérins + gabarit).
Usage : python3 construire.py"""
moteur = '\n'.join(open('src/'+f, encoding='utf-8').read() for f in ('couple.js', 'moteur.js', 'verin.js', 'rwa.js', 'faults.js'))
import base64
logo = 'data:image/png;base64,' + base64.b64encode(open('src/logo_kiwee.png', 'rb').read()).decode()
import json
opt = json.load(open('../optimisation/gains_page.json'))   # table des gains par configuration (tables_gains.py)
page = open('src/gabarit_fermee.html', encoding='utf-8').read().replace('/*MOTEUR*/', moteur).replace('__LOGO__', logo).replace('__LOGO_AMPERE__', 'data:image/png;base64,' + base64.b64encode(open('src/logo_ampere.png', 'rb').read()).decode()).replace('__OPT__', json.dumps(opt, ensure_ascii=False))
nav = lambda d: '<div style="margin:2px 0 6px;font-size:15px"><a href="simulation_convoi.html" style="%s">Mode nominal</a> &nbsp;|&nbsp; <a href="simulation_degrade.html" style="%s">Modes dégradés (analyse safety)</a></div>' % (('font-weight:700;text-decoration:none;color:var(--acc)', 'color:var(--mut)') if not d else ('color:var(--mut)', 'font-weight:700;text-decoration:none;color:var(--acc)'))
nominal = page.replace('<!--NAV-->', nav(False)).replace('<!--DEGRADE_UI-->', '').replace('/*DEGRADE_JS*/', '')
open('simulation_convoi.html', 'w', encoding='utf-8').write(nominal)
dj = open('src/degrade.js', encoding='utf-8').read()
dui = open('src/degrade_ui.html', encoding='utf-8').read()
deg = page.replace('<!--NAV-->', nav(True)).replace('<!--DEGRADE_UI-->', dui).replace('/*DEGRADE_JS*/', dj)
deg = deg.replace('>Simulation du convoi articulé</h1>', '>Simulation du convoi articulé : modes dégradés</h1>').replace('<title>Simulation du convoi articulé</title>', '<title>Convoi articulé : modes dégradés</title>')
deg = deg.replace("label:'c = 0'", "label:'nominal'").replace("['c = 0',R0]", "['nominal',R0]").replace('queue sans amortissement (c = 0)', 'queue, cas nominal sans défaut')
deg = deg.replace('const later=()=>{drawDist();};', 'const later=()=>{drawDist();};')
deg = deg.replace('applyShow();\n', 'applyShow();initDegrade();\n') if False else deg
i = deg.rindex('applyShow();')
deg = deg[:i] + 'applyShow();initDegrade();' + deg[i + len('applyShow();'):]
open('simulation_degrade.html', 'w', encoding='utf-8').write(deg)
print('ok', len(nominal) // 1024, 'Ko /', len(deg) // 1024, 'Ko')
