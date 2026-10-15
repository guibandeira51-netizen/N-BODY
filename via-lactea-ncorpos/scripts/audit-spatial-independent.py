"""Independent SciPy density integration for the JavaScript spatial samplers.

Inputs contain empirical counts and model parameters, never the JS density values.
No force, mass, density parameter, position, or initial velocity is changed.
"""
from pathlib import Path
import hashlib
import json
import math
import platform
import warnings

import numpy as np
import scipy
from scipy.integrate import quad, IntegrationWarning
from scipy.stats import chi2, norm, t

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'reports/equilibrium/spatial-samples.json'
raw = json.loads(SOURCE.read_text(encoding='utf-8'))
p = raw['physicalParameters']
a, b, Md = p['diskA'], p['diskB'], p['diskMass']
rs, Ms = p['haloScale'], p['haloMassScale']
r200, rout = raw['R200'], raw['HALO_OUTER_RADIUS']


def mn_density(R, z):
    q = math.sqrt(z*z + b*b)
    A = a + q
    return b*b * Md / (4*math.pi) * (a*R*R + (a+3*q)*A*A) / ((R*R+A*A)**2.5 * q**3)


def halo_radial_mass(r):
    if r <= 0 or r >= rout:
        return 0.0
    x = r/rs
    taper = 1.0
    if r > r200:
        u = (r-r200)/(rout-r200)
        taper = 1 - 10*u**3 + 15*u**4 - 6*u**5
    return Ms/rs * x/(1+x)**2 * taper


def halo_integral(radius):
    radius = min(radius, rout)
    inside = quad(halo_radial_mass, 0, min(radius, r200), epsabs=1e-11, epsrel=1e-11)[0]
    return inside + (quad(halo_radial_mass, r200, radius, epsabs=1e-11, epsrel=1e-11)[0] if radius > r200 else 0)


def mapped_bound(value, scale):
    return 1.0 if value is None else value/(scale+value)


def joint_mass_fraction(R0, R1, z0, z1, epsrel=3e-8):
    # Finite integration coordinates for both infinite tails. This directly
    # integrates rho(R,z)*2*pi*R*dR*2*dz, including both signs of z.
    def outer(u):
        z = b*u/(1-u)
        dz = b/(1-u)**2

        def inner(v):
            R = a*v/(1-v)
            dR = a/(1-v)**2
            return 4*math.pi * R * mn_density(R, z) * dR * dz / Md

        return quad(inner, mapped_bound(R0, a), mapped_bound(R1, a), epsabs=2e-11, epsrel=epsrel, limit=200)[0]

    return quad(outer, mapped_bound(z0, b), mapped_bound(z1, b), epsabs=2e-10, epsrel=epsrel, limit=200)


def confidence(count, n):
    z = norm.ppf(0.975)
    q = count/n
    denominator = 1 + z*z/n
    mid = (q+z*z/(2*n))/denominator
    half = z*math.sqrt(q*(1-q)/n+z*z/(4*n*n))/denominator
    return [max(0, mid-half), min(1, mid+half)]


warnings.simplefilter('error', IntegrationWarning)
R_edges, z_edges = raw['radialEdges'], raw['heightEdges']
joint, errors = [], []
for i in range(len(R_edges)-1):
    row, error_row = [], []
    for j in range(len(z_edges)-1):
        value, error = joint_mass_fraction(R_edges[i], R_edges[i+1], z_edges[j], z_edges[j+1])
        row.append(value)
        error_row.append(error)
    joint.append(row)
    errors.append(error_row)
joint = np.asarray(joint)
halo_total = halo_integral(rout)
expected_cdfs = [
    [(radius/(radius+p['bulgeScale']))**2 for radius in raw['cdfRadii'][0]],
    [],
    [halo_integral(radius)/halo_total for radius in raw['cdfRadii'][2]],
]
seed_results = []
disk_empirical = []
for realization in raw['independentSamples']:
    c, n = realization['component'], realization['independentCount']
    item = {'seed': realization['seed'], 'component': c, 'nIndependent': n, 'maximumRadiusKpc': realization['maximumRadius']}
    if c != 1:
        item['cdfComparisons'] = [
            {'radiusKpc': radius, 'expected': expected, 'observed': count/n,
             'difference': count/n-expected, 'wilson95': confidence(count, n)}
            for radius, count, expected in zip(raw['cdfRadii'][c], realization['cdfCounts'], expected_cdfs[c])
        ]
        item['maxAbsoluteDifferenceAtGrid'] = max(abs(row['difference']) for row in item['cdfComparisons'])
        item['dkw95UniformBound'] = math.sqrt(math.log(2/0.05)/(2*n))
        item['note'] = 'CDF checked at reported radii; this is not a computed full-sample Kolmogorov-Smirnov statistic.'
    else:
        empirical = np.asarray(realization['jointCounts'])/n
        disk_empirical.append(empirical)
        expected_counts = joint*n
        observed_counts = np.asarray(realization['jointCounts'])
        keep = expected_counts >= 5
        # Pool sparse regions before Pearson test rather than assuming their
        # individual low-count residuals are Gaussian.
        expected = np.r_[expected_counts[keep], expected_counts[~keep].sum()] if (~keep).any() else expected_counts[keep]
        observed = np.r_[observed_counts[keep], observed_counts[~keep].sum()] if (~keep).any() else observed_counts[keep]
        positive = expected > 0
        expected, observed = expected[positive], observed[positive]
        statistic = float(np.sum((observed-expected)**2/expected))
        degrees = len(expected)-1
        item.update({'empiricalJointProbabilities': empirical.tolist(), 'maximumAbsoluteRegionDifference': float(np.max(np.abs(empirical-joint))),
                     'pearsonChiSquared': statistic, 'degreesOfFreedom': degrees, 'pValue': float(chi2.sf(statistic, degrees)),
                     'sparseCellsPooled': int((~keep).sum()), 'qualification': 'No model parameters fitted to samples. A p-value is a consistency check, not proof of the entire distribution.'})
    seed_results.append(item)

empirical = np.asarray(disk_empirical)
mean = empirical.mean(axis=0)
sd = empirical.std(axis=0, ddof=1)
half = t.ppf(0.975, len(empirical)-1)*sd/math.sqrt(len(empirical))
joint_regions = []
for i in range(joint.shape[0]):
    for j in range(joint.shape[1]):
        joint_regions.append({'RRangeKpc': R_edges[i:i+2], 'absoluteZRangeKpc': z_edges[j:j+2],
                              'theoreticalMassFraction': float(joint[i, j]), 'estimatedQuadratureAbsoluteError': errors[i][j],
                              'meanObservedFraction': float(mean[i, j]), 'seedStandardDeviation': float(sd[i, j]),
                              'seedMeanT95': [float(mean[i, j]-half[i, j]), float(mean[i, j]+half[i, j])],
                              'pooledWilson95': confidence(int(sum(sample['jointCounts'][i][j] for sample in raw['independentSamples'] if sample['component']==1)), len(empirical)*raw['countPerIndependentComponentSample'])})

# A second tighter quadrature at selected joint regions checks the numerical
# reference independently of the sample scatter (including infinite tails).
quadrature_checks = []
for i, j in [(0, 0), (3, 2), (6, 6), (7, 7)]:
    value, error = joint_mass_fraction(R_edges[i], R_edges[i+1], z_edges[j], z_edges[j+1], epsrel=3e-10)
    quadrature_checks.append({'indices': [i, j], 'reference': float(joint[i, j]), 'tighter': value, 'difference': value-float(joint[i, j]), 'errorEstimate': error})

tail_results = []
for realization in raw['galaxyRealizations']:
    tail_results.append({'seed': realization['seed'], 'n': realization['n'], 'independentDrawsByComponent': realization['independentDrawsByComponent'],
                         'unboundByHistoricalAnalyticCriterion': realization['meta']['unbound'],
                         'components': [{key: component[key] for key in ['id', 'name', 'count', 'mass', 'particleMass', 'r50', 'R50', 'medianAbsZ', 'massMedianAbsZ', 'percentiles', 'tails', 'kinetic', 'potential', 'angularMomentum', 'angularMomentumScale', 'virial', 'velocity']}
                                        for component in realization['structure']['components']]})
result = {'schema': 1, 'createdAt': raw['createdAt'], 'qualification': 'Independent spatial audit of historical sampler and initial-state tails; no dynamical stability inference is drawn from spatial agreement.',
          'runtime': {'python': platform.python_version(), 'numpy': np.__version__, 'scipy': scipy.__version__},
          'inputSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'sourceSha256': raw['sourceSha256'],
          'physicalParameters': p, 'units': raw['galaxyRealizations'][0]['structure']['units'],
          'derivation': raw['derivation'], 'scientificNotes': raw['scientificNotes'],
          'referenceSources': [{'title': 'Miyamoto & Nagai (1975), Three-Dimensional Models for the Distribution of Mass in Galaxies', 'url': 'https://doi.org/10.1093/pasj/27.4.533'},
                               {'title': 'Hernquist (1990), An Analytical Model for Spherical Galaxies and Bulges', 'url': 'https://doi.org/10.1086/168845'}],
          'diskJointIntegratedMassFraction': float(joint.sum()), 'diskJointRegions': joint_regions, 'quadratureChecks': quadrature_checks,
          'haloNormalization': {'R200Kpc': r200, 'outerRadiusKpc': rout, 'independentIntegratedMass': halo_total,
                                'productionTableMass': raw['HALO_TOTAL_MASS'], 'relativeTableError': (raw['HALO_TOTAL_MASS']-halo_total)/halo_total,
                                'R200DefinitionResidual': (Ms*(math.log1p(r200/rs)-r200/(rs+r200))-(4*math.pi/3)*200*raw['RHO_CRITICAL']*r200**3)},
          'seeds': seed_results, 'tailDiagnostics': tail_results,
          'scopeLimits': ['Three deterministic pseudorandom seeds quantify sampling scatter; no exhaustive statistical proof is claimed.',
                          'The independent sampler draws are not antipodally duplicated. Full-galaxy tails and moments separately use the historical paired initializer.',
                          'No halo/disk potential or density parameter is fitted or renormalized in this audit.',
                          'Potential and virial contributions of extreme particles use the fixed analytic reference field. Full discrete softened self-energy requires a separate force-engine evaluation.',
                          'Infinite-tail model spatial second moments need not exist; sample maxima and RMS radii vary strongly with N and seed.']}
target = ROOT/'reports/equilibrium/spatial-audit.json'
target.write_text(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False)+'\n', encoding='utf-8')
print(json.dumps({'report': str(target), 'diskIntegratedMassFraction': float(joint.sum()), 'haloRelativeTableError': result['haloNormalization']['relativeTableError'],
                  'diskSeeds': [{k: s[k] for k in ['seed', 'maximumAbsoluteRegionDifference', 'pValue']} for s in seed_results if s['component']==1]}, indent=2))
