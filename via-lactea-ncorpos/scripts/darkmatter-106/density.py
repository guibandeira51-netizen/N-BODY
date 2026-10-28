"""Explicit positive-density reconstruction of preserved interpolation grids.
Negative interpolation lobes are measured before projection; masses stay fixed.
"""
import numpy as np
from numpy.polynomial.legendre import leggauss
def spherical_integral(density,edges,radial=32,angular=160,disc=False):
 x,w=leggauss(radial);a,b=edges[:-1],edges[1:];s=((a[:,None]+b[:,None])/2+(b-a)[:,None]*x/2).ravel();ws=((b-a)[:,None]*w/2).ravel();u,wu=leggauss(angular)
 if disc:
  tmax=np.arcsinh(s/.03);t=(u[None,:]+1)*tmax[:,None]/2;mu=.03*np.sinh(t)/s[:,None];wm=.03*np.cosh(t)/s[:,None]*tmax[:,None]/2*wu
 else:mu=np.broadcast_to((u+1)/2,(len(s),angular));wm=np.broadcast_to(wu/2,mu.shape)
 xyz=np.c_[(s[:,None]*np.sqrt(1-mu**2)).ravel(),np.zeros(mu.size),(s[:,None]*mu).ravel()];rho=density.density(xyz).reshape(mu.shape)
 def cumulative(values):return np.r_[0,np.cumsum((4*np.pi*s**2*np.sum(values*wm,axis=1)*ws).reshape(-1,radial).sum(axis=1))]
 return cumulative(np.maximum(rho,0)),cumulative(np.minimum(rho,0)),float(np.min(rho))
