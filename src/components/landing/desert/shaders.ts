import * as THREE from "three";
import { SUN_DIRECTION, WIND, WORLD } from "./terrain-data";

export const NOISE_GLSL = /* glsl */ `
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float sum = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amplitude * vnoise(p);
    p = p * 2.03 + 17.1;
    amplitude *= 0.5;
  }
  return sum / 0.97;
}
`;

// Sky and haze share one palette so distant dunes dissolve into the horizon with no seam.
export const ATMOSPHERE_GLSL = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uFogDensity;
uniform float uFogFalloff;
uniform vec2 uFogFade;

const vec3 SKY_ZENITH = vec3(0.045, 0.075, 0.2);
const vec3 SKY_MID = vec3(0.17, 0.19, 0.36);
const vec3 SKY_LOW_SUN = vec3(1.2, 0.6, 0.3);
const vec3 SKY_LOW_ANTI = vec3(0.42, 0.33, 0.42);
const vec3 SKY_HORIZON_SUN = vec3(1.55, 0.72, 0.3);
const vec3 SKY_HORIZON_ANTI = vec3(0.74, 0.47, 0.4);
const vec3 SKY_GLOW = vec3(1.9, 0.78, 0.26);
const vec3 AMBIENT_SKY = vec3(0.16, 0.19, 0.34);

float sunAzimuth(vec3 rd) {
  vec2 a = rd.xz;
  float l = length(a);
  a = l > 1e-5 ? a / l : vec2(0.0, 1.0);
  return clamp(dot(a, normalize(uSunDir.xz)) * 0.5 + 0.5, 0.0, 1.0);
}

vec3 sunGlow(float m) {
  return SKY_GLOW * (pow(m, 5.0) * 0.5 + pow(m, 32.0) * 1.0);
}

vec3 horizonColor(vec3 rd) {
  return mix(SKY_HORIZON_ANTI, SKY_HORIZON_SUN, pow(sunAzimuth(rd), 3.0));
}

vec3 hazeColor(vec3 rd) {
  vec3 level = normalize(vec3(rd.x, max(rd.y, 0.0) * 0.5, rd.z));
  return horizonColor(rd) + sunGlow(max(dot(level, uSunDir), 0.0));
}

float fogAmount(vec3 ro, vec3 rd, float rayLength) {
  float a = uFogDensity * exp(-uFogFalloff * ro.y);
  float b = uFogFalloff * rd.y;
  float integral = abs(b) > 1e-4 ? (1.0 - exp(-b * rayLength)) / b : rayLength;
  float fog = 1.0 - exp(-a * integral);
  return max(fog, smoothstep(uFogFade.x, uFogFade.y, rayLength));
}

vec3 applyAtmosphere(vec3 color, vec3 worldPosition) {
  vec3 ray = worldPosition - cameraPosition;
  float rayLength = length(ray);
  vec3 rd = ray / max(rayLength, 1e-4);
  return mix(color, hazeColor(rd), fogAmount(cameraPosition, rd, rayLength));
}

float phaseHG(float cosTheta, float g) {
  float g2 = g * g;
  return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5);
}
`;

// One travelling gust field drives the surface streaks, the saltation and the crest plumes.
export const WIND_GLSL = /* glsl */ `
uniform vec2 uWind;
uniform float uFlow;
uniform float uGust;
uniform float uTime;

float gustField(vec2 p) {
  float along = dot(p, uWind) - uFlow * 0.8;
  float across = dot(p, vec2(-uWind.y, uWind.x));
  float front = vnoise(vec2(along * 0.008, across * 0.006) + 1.3);
  return smoothstep(0.32, 0.78, front) * (0.3 + 0.7 * uGust);
}
`;

export const TERRAIN_LOOKUP_GLSL = /* glsl */ `
uniform sampler2D uHeight;
uniform sampler2D uLight;
uniform vec2 uWorldMin;
uniform float uWorldSize;

vec2 terrainUv(vec2 p) {
  return (p - uWorldMin) / uWorldSize;
}
`;

export type SharedUniforms = ReturnType<typeof createSharedUniforms>;

export function createSharedUniforms(heightTexture: THREE.Texture) {
  return {
    uSunDir: { value: SUN_DIRECTION.clone() },
    uSunColor: { value: new THREE.Vector3(5.4, 3.3, 1.85) },
    uFogDensity: { value: 0.00115 },
    uFogFalloff: { value: 0.03 },
    uFogFade: { value: new THREE.Vector2(470, 640) },
    uWind: { value: WIND.clone() },
    uFlow: { value: 0 },
    uGust: { value: 0.6 },
    uTime: { value: 0 },
    uHeight: { value: heightTexture },
    uLight: { value: null as THREE.Texture | null },
    uWorldMin: { value: new THREE.Vector2(WORLD.minX, WORLD.minZ) },
    uWorldSize: { value: WORLD.size },
  };
}
