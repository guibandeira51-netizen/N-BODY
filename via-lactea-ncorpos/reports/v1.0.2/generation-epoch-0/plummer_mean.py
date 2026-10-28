"""Plummer mean-field operator, applied to a *physical* Newtonian potential.

Phi_eps = W_eps * Phi_Newton, W_eps = 3 eps^2 / [4 pi (r^2+eps^2)^(5/2)].
By commutation of convolution this is precisely -G rho * 1/sqrt(r^2+eps^2).
The physical source density rho is NOT replaced by W*rho in DF diagnostics.
No particles/velocities are modified here. Deterministic quadrature represents
the ensemble mean, not the fluctuating field of one finite realization.
"""
import numpy as np
from numpy.polynomial.legendre import leggauss


class PlummerMean:
    def __init__(self, newtonian, epsilon, radial=24, polar=8, azimuthal=16,
                 batch_evaluations=262144):
        if not np.isfinite(epsilon) or epsilon < 0:
            raise ValueError('epsilon must be finite and nonnegative')
        if min(radial, polar, azimuthal) < 4:
            raise ValueError('at least four nodes per direction required')
        self.source = newtonian
        self.epsilon = float(epsilon)
        self.orders = [int(radial), int(polar), int(azimuthal)]
        self.batch_evaluations = int(batch_evaluations)
        if epsilon == 0:
            self.offsets = np.zeros((1, 3)); self.weights = np.ones(1)
        else:
            # r=eps*tan(theta); exact radial probability is
            # 3 sin(theta)^2 cos(theta) dtheta, theta in (0,pi/2).
            x, w = leggauss(radial); theta = (x+1)*np.pi/4
            radius = epsilon*np.tan(theta)
            wr = w*np.pi/4 * 3*np.sin(theta)**2*np.cos(theta)
            mu, wm = leggauss(polar)
            phi = np.arange(azimuthal)*2*np.pi/azimuthal
            rr, mm, pp = np.meshgrid(radius, mu, phi, indexing='ij')
            self.offsets = np.c_[(rr*np.sqrt(1-mm*mm)*np.cos(pp)).ravel(),
                                 (rr*np.sqrt(1-mm*mm)*np.sin(pp)).ravel(),
                                 (rr*mm).ravel()]
            self.weights = np.broadcast_to(wr[:,None,None]*wm[None,:,None]/(2*azimuthal), rr.shape).ravel().copy()
            self.raw_weight_sum = float(self.weights.sum())
            if abs(self.raw_weight_sum-1) > 1e-10:
                raise ValueError('quadrature failed unit-mass normalization')
            self.weights /= self.raw_weight_sum

    def evaluate(self, points, force=False):
        xyz = np.asarray(points, dtype=float).reshape(-1, 3)
        if not np.isfinite(xyz).all(): raise ValueError('nonfinite position')
        R = np.hypot(xyz[:,0], xyz[:,1])
        base = np.c_[R, np.zeros(len(xyz)), xyz[:,2]]
        result = np.empty((len(xyz),3) if force else len(xyz))
        size = max(1, self.batch_evaluations//len(self.weights))
        for lo in range(0,len(xyz),size):
            hi=min(lo+size,len(xyz))
            shifted = (base[lo:hi,None,:]+self.offsets[None,:,:]).reshape(-1,3)
            if force:
                f = np.asarray(self.source.force(shifted)).reshape(hi-lo,-1,3)
                avg = np.einsum('ijk,j->ik',f,self.weights)
                # Rotate meridional a_R into the caller's Cartesian frame.
                result[lo:hi,0]=np.divide(avg[:,0]*xyz[lo:hi,0],R[lo:hi],out=np.zeros(hi-lo),where=R[lo:hi]>0)
                result[lo:hi,1]=np.divide(avg[:,0]*xyz[lo:hi,1],R[lo:hi],out=np.zeros(hi-lo),where=R[lo:hi]>0)
                result[lo:hi,2]=avg[:,2]
            else:
                p = np.asarray(self.source.potential(shifted)).reshape(hi-lo,-1)
                result[lo:hi]=p@self.weights
        return result

    def potential(self, points): return self.evaluate(points,False)
    def force(self, points): return self.evaluate(points,True)


def soften_native(agama, newtonian, epsilon, orders=(24,8,16),
                  multipole_nodes=64, disk_nodes=(64,56)):
    """Return native AGAMA scalar-potential expansions and quadrature operators.

    A native SCM potential is a spheroidal Multipole plus disklike CylSpline.
    Each is convolved separately by linearity, then expanded from Phi_eps itself.
    Forces/action finding derive from these scalar native potentials, with their
    interpolation error explicitly checked against the unfitted convolution.
    """
    components = list(newtonian)
    if len(components) != 2:
        raise ValueError('expected SCM spheroidal and disklike potential components')
    operators=[PlummerMean(p,epsilon,*orders) for p in components]
    sph_callback=lambda x:operators[0].potential(x)
    disk_callback=lambda x:operators[1].potential(x)
    sph=agama.Potential(type='Multipole',potential=sph_callback,symmetry='a',
                        lmax=8,mmax=0,rmin=.003,rmax=3000,
                        gridSizeR=multipole_nodes,fixOrder=True)
    disk=agama.Potential(type='CylSpline',potential=disk_callback,symmetry='a',
                        mmax=0,Rmin=.005,Rmax=120,zmin=.005,zmax=80,
                        gridSizeR=disk_nodes[0],gridSizeZ=disk_nodes[1],fixOrder=True)
    return agama.Potential(sph,disk),operators
