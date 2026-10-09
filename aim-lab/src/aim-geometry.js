// Angles are radians at the boundary; output is signed degrees.
export function aimOffset(target, yaw, pitch, cameraPosition = [0, 1.6, 0]) {
 if (![target, cameraPosition].every(v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite)) || ![yaw,pitch].every(Number.isFinite)) return null;
 const [x,y,z] = target.map((v,i) => v-cameraPosition[i]);
 if (Math.hypot(x,y,z) < 1e-9) return null;
 const a = Math.atan2(x,-z)+yaw;
 return {x:-Math.atan2(Math.sin(a),Math.cos(a))*180/Math.PI,y:(pitch-Math.atan2(y,Math.hypot(x,z)))*180/Math.PI};
}
