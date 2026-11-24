"""Transcription fidèle de modeleVerinArt.m + debitValve.m + comparaison_modele_mesures.m (Python/scipy)."""
import numpy as np, json
from scipy.signal import butter, filtfilt
from scipy.integrate import solve_ivp
from load_cd import load
BASE='/Users/hugotestaniere/Library/CloudStorage/OneDrive-MetacarMobilitySystems/Bureau/EssaisVerin/Caractérisation_Ver1/'
V22=json.load(open('vanne22.json'))
Icour=np.array(V22['Icourant']); Ktab=np.array(V22['Ktable']); Kcl=V22['Kclapet'][0]; Pcl=V22['Pclapet'][0]
p=dict(B=1.5e9,rho=860.,Dp=32e-3,P0=10e5,V0=0.16e-3,gamma=1.4)
p['Sp']=np.pi*p['Dp']**2/4; p['Sa']=p['Sp']-np.pi*(20e-3)**2/4
def debit(dP,K):
    dPeps=1e3
    masque=(1-np.tanh(dP/dPeps))/2
    Qv=-K*np.sqrt(2*abs(dP)/p['rho'])*np.tanh(abs(dP)/dPeps)*masque
    x=dP-Pcl; xs=(x+np.sqrt(x*x+dPeps**2))/2
    Qc=Kcl*np.sqrt(2*xs/p['rho'])
    return Qv+Qc
def modele(X,lam,lamdot,V01,V02,K):
    P1,P2=X; dP=P2-P1; Q1=debit(dP,K)
    V1=V01+lam*p['Sp']; V2=V02-lam*p['Sa']
    P1dot=p['B']/V1*(Q1-lamdot*p['Sp'])
    alpha=p['P0']*p['V0']/p['gamma']/P2**2*(P2/p['P0'])**((p['gamma']-1)/p['gamma'])
    beta=1+p['B']*alpha/V2
    P2dot=p['B']/V2/beta*(lamdot*p['Sa']-Q1)
    return [P1dot,P2dot]
def essai(nom):
    X=load(BASE+nom+'.mat'); t=X['t']; fs=1/np.median(np.diff(t))
    b,a=butter(4,5/(fs/2)); Lm=filtfilt(b,a,X['Lambda_scope'])*1e-3
    b,a=butter(4,10/(fs/2)); P1m=filtfilt(b,a,X['P1_mes_scope'])*1e5; P2m=filtfilt(b,a,X['P2_mes_scope'])*1e5
    Fcap=filtfilt(b,a,X['Ftige_scope']); I=X['I_mes_scope'].mean()
    Fm=P1m*p['Sp']-P2m*p['Sa']
    lam=-(Lm-Lm.mean()); lamdot=np.gradient(lam,t); Lmoy=Lm.mean()
    course=200e-3; mort=1e-3
    V01=(course-Lmoy+mort)*p['Sp']; V02=(Lmoy+mort)*p['Sa']
    K=np.interp(I,Icour,Ktab)
    X0=[P1m[:50].mean(),P2m[:50].mean()]
    f=lambda tt,x: modele(x,np.interp(tt,t,lam),np.interp(tt,t,lamdot),V01,V02,K)
    sol=solve_ivp(f,[t[0],t[-1]],X0,method='Radau',t_eval=t,rtol=1e-6,atol=1e-2,max_step=2e-3)
    P1s,P2s=sol.y; Fs=P1s*p['Sp']-P2s*p['Sa']
    ok=(t>1)&(t<t[-1]-1); rm=lambda x:np.sqrt(np.mean(x[ok]**2))
    res=dict(nom=nom,I=I,K=K,rmsP1=rm(P1s-P1m)/1e5,rmsP2=rm(P2s-P2m)/1e5,rmsdP=rm((P1s-P2s)-(P1m-P2m))/1e5,rmsF=rm(Fs-Fm),
             picMes=(P1m-P2m)[ok].max()/1e5,picMod=(P1s-P2s)[ok].max()/1e5)
    return res,dict(t=t,lam=lam,lamdot=lamdot,V01=V01,V02=V02,K=K,X0=X0,P1m=P1m,P2m=P2m,P1s=P1s,P2s=P2s,Fm=Fm,Fs=Fs,Fcap=Fcap,ok=ok)
if __name__=='__main__':
    for nom in ['data2/id_i094_f02','data3/id_i089_f05','data4/id_i089_f1']:
        r,_=essai(nom)
        print('%-20s I=%.3f K=%.2e | RMS P1 %.2f P2 %.2f dP %.2f bar F %.0f N | pic dP mes %.2f / mod %.2f'%(nom,r['I'],r['K'],r['rmsP1'],r['rmsP2'],r['rmsdP'],r['rmsF'],r['picMes'],r['picMod']))
