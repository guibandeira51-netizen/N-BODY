/** Parameter-convention bounds, not a bound on GPU force roundoff.
 * Positive masses, isolated Plummer pair potential and positive softenings.
 * Each actual/nominal pair magnitude lies between the r=0 and r=infinity
 * ratios; a sum of positive pair magnitudes has the same ratio bounds.
 */
export function plummerRatioBounds(nominal,actual){for(const p of[nominal,actual])if(!(p.G>0)||!(p.epsilonSquared>0)||!Number.isFinite(p.G)||!Number.isFinite(p.epsilonSquared))throw new RangeError('Finite positive G and epsilonSquared required');const far=actual.G/nominal.G,close=far*Math.sqrt(nominal.epsilonSquared/actual.epsilonSquared);return{lower:Math.min(far,close),upper:Math.max(far,close)};}
export function hamiltonianInterval(K,U,ratio){if(!Number.isFinite(K)||!Number.isFinite(U)||K<0||U>0)throw new RangeError('K>=0 and U<=0 required');const padding=32*Number.EPSILON*(Math.abs(K)+Math.abs(U));return{lower:K+ratio.upper*U-padding,upper:K+ratio.lower*U+padding,padding};}
export function relativeDriftBound(initial,current){if(initial.lower<=0&&initial.upper>=0)throw new RangeError('Energy interval crosses zero');const minAbsoluteInitial=Math.min(Math.abs(initial.lower),Math.abs(initial.upper)),minimumDelta=current.lower-initial.upper,maximumDelta=current.upper-initial.lower;return Math.max(Math.abs(minimumDelta),Math.abs(maximumDelta))/minAbsoluteInitial;}
