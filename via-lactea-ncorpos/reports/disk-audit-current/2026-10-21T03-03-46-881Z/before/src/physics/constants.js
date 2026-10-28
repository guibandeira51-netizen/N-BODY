// kpc, Myr, 10^10 solar masses. See PARAMETROS_E_FONTES.md.
export const AU_METERS = 149597870700;
export const KPC_METERS = 1000 * AU_METERS * 648000 / Math.PI;
export const MYR_SECONDS = 1e6 * 365.25 * 86400;
export const SOLAR_GM_SI = 1.3271244e20; // IAU 2015 B3 nominal solar mass parameter
export const G = SOLAR_GM_SI * 1e10 * MYR_SECONDS ** 2 / KPC_METERS ** 3;
export const KM_S_TO_KPC_MYR = 1000 * MYR_SECONDS / KPC_METERS;
export const H0 = 67.4 * KM_S_TO_KPC_MYR / 1000;
export const RHO_CRITICAL = 3 * H0 ** 2 / (8 * Math.PI * G);
export const MODEL = Object.freeze({bulgeMass:0.5, bulgeScale:1, diskMass:6.8, diskA:3, diskB:0.28, haloMassScale:54, haloScale:15.62});
export const DEFAULT_NUMERICS = Object.freeze({epsilon:0.1, dt:0.1, theta:0.5, seed:2026});
