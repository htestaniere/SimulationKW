import h5py, numpy as np
def sstr(f,ref):
    a=np.array(f[ref]).ravel(); return ''.join(chr(int(x)) for x in a)
def load(path):
    f=h5py.File(path,'r'); top=[k for k in f if k not in('#refs#','#subsystem#')][0]; R=f[top]
    t=np.array(R['X']['Data']).ravel().astype(float)
    out={'t':t}
    Y=R['Y']
    for k in range(Y['Data'].shape[0]):
        d=np.array(f[Y['Data'][k,0]]).ravel().astype(float)
        nm=sstr(f,Y['Path'][k,0])+'/'+sstr(f,Y['Name'][k,0])
        short=nm.split('/')[-2] if nm.endswith('/In1') else nm.split('/')[-1]
        out[short]=d
    return out
if __name__=='__main__':
    base='/Users/hugotestaniere/Library/CloudStorage/OneDrive-MetacarMobilitySystems/Bureau/EssaisVerin/Caractérisation_Ver1/'
    X=load(base+'data3/id_i089_f05.mat')
    for k,v in X.items(): print(k,v.shape,v[:3],np.nanmin(v),np.nanmax(v))
