"""Mathematical/operator tests; no evolved heights enter any accuracy criterion."""
import unittest
import numpy as np
from numpy.polynomial.legendre import leggauss
from plummer_mean import PlummerMean

class AnalyticPlummer:
    def __init__(self,b=.3):self.b=b
    def potential(self,p):return -1/np.sqrt(np.sum(p*p,axis=1)+self.b**2)
    def force(self,p):return -p/(np.sum(p*p,axis=1)+self.b**2)[:,None]**1.5

def spherical_oracle(radius,b,epsilon,n=1024):
    u,w=leggauss(n);t=(u+1)*np.pi/4;s=b*np.tan(t)
    weights=w*np.pi/4*3*np.sin(t)**2*np.cos(t)
    kernel=2/(np.hypot(radius+s,epsilon)+np.hypot(radius-s,epsilon))
    return -float(weights@kernel)

class TestPlummerMean(unittest.TestCase):
    def test_kernel_normalization_and_axisymmetry(self):
        q=PlummerMean(AnalyticPlummer(),.1,32,12,24)
        self.assertAlmostEqual(float(q.weights.sum()),1,places=14)
        p=np.array([[.3,0,.2],[0,.3,.2],[.3,0,-.2]])
        self.assertLess(np.ptp(q.potential(p)),1e-13)
        f=q.force(p);self.assertAlmostEqual(f[0,0],f[1,1],places=13)
        self.assertAlmostEqual(f[0,2],-f[2,2],places=13)

    def test_gradient_matches_same_scalar(self):
        q=PlummerMean(AnalyticPlummer(),.1,24,8,16)
        p=np.array([[.2,.3,.1],[1.,0,.4],[0.,0.,.1]])
        force=q.force(p)
        for k in range(3):
            step=np.zeros_like(p);step[:,k]=1e-5
            grad=(q.potential(p+step)-q.potential(p-step))/(2e-5)
            self.assertLess(float(np.max(np.abs(grad+force[:,k]))),2e-8)

    def test_independent_density_convolution_oracle(self):
        # Oracle integrates physical Plummer *density* against the softened
        # Green's function; implementation smooths the Newtonian *potential*.
        q=PlummerMean(AnalyticPlummer(),.1,64,24,32)
        radii=np.array([0.,.05,.2,1.,8.])
        truth=np.array([spherical_oracle(r,.3,.1) for r in radii])
        result=q.potential(np.c_[radii,0*radii,0*radii])
        self.assertLess(float(np.max(np.abs(result/truth-1))),2e-5)

    def test_zero_epsilon_and_invalid_inputs(self):
        p=np.array([[1.,0,.2]])
        source=AnalyticPlummer();q=PlummerMean(source,0)
        np.testing.assert_array_equal(q.potential(p),source.potential(p))
        np.testing.assert_allclose(q.force(p),source.force(p),rtol=1e-15)
        for eps in [-1,np.nan,np.inf]:
            with self.assertRaises(ValueError):PlummerMean(source,eps)

if __name__=='__main__':unittest.main(verbosity=2)
