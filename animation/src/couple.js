// généré par doc/moteurs/extraire_couple.py : couple max par moteur (N.m) en fonction de la vitesse (km/h), essais du 29/01/2026
const COUPLE={"v_kmh": [2.5, 7.5, 12.5, 17.5, 22.5, 27.5, 32.5, 37.5, 42.5, 47.5], "trac": [243.6, 234.4, 207.8, 177.1, 150.0, 129.7, 113.7, 103.1, 91.4, 91.4], "reg100": [184.2, 184.2, 184.2, 184.2, 184.2, 110.4, 79.9, 64.9, 57.6, 57.6], "reg50": [149.9, 149.9, 149.9, 127.5, 62.3, 45.4, 38.0, 31.9, 27.4, 27.4]};
function Tmot(vkmh,dir,reg){const t=COUPLE,y=dir>0?t.trac:(reg==50?t.reg50:t.reg100),x=t.v_kmh,v=Math.abs(vkmh);
 if(v<=x[0])return y[0];if(v>=x[x.length-1]){return Math.max(0,y[y.length-1]*Math.max(0,1-(v-x[x.length-1])/40));}   // au-delà des essais : décroissance linéaire jusqu'à 0 sur 40 km/h
 for(let i=1;i<x.length;i++)if(v<=x[i])return y[i-1]+(y[i]-y[i-1])*(v-x[i-1])/(x[i]-x[i-1]);return y[y.length-1];}
