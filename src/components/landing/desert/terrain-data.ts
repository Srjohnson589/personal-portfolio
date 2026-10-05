import * as THREE from "three";

export const WORLD = { minX: -700, minZ: -900, size: 1400, resolution: 1024 };
export const WIND = new THREE.Vector2(0.8, 0.6).normalize();
export const SUN_DIRECTION = new THREE.Vector3(-0.55, 0.2, -0.81).normalize();

const CELL = WORLD.size / WORLD.resolution;
const DUNE_CREST = 0.74;

export type Flat = { x: number; z: number; radius: number };

export type TerrainData = {
  heights: Float32Array;
  smoothHeights: Float32Array;
  heightTexture: THREE.DataTexture;
  crests: Float32Array;
};

function hash(ix: number, iz: number) {
  let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iz, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise(x: number, z: number) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  let fx = x - ix;
  let fz = z - iz;
  fx = fx * fx * (3 - 2 * fx);
  fz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz);
  const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1);
  const d = hash(ix + 1, iz + 1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

function fbm(x: number, z: number, octaves: number) {
  let sum = 0;
  let amplitude = 0.5;
  let norm = 0;
  for (let i = 0; i < octaves; i += 1) {
    sum += amplitude * noise(x, z);
    norm += amplitude;
    x = x * 2.03 + 17.1;
    z = z * 2.03 - 9.7;
    amplitude *= 0.5;
  }
  return sum / norm;
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// Gentle windward ramp, sharp brink, steep slip face with a concave toe.
function duneProfile(t: number) {
  if (t < DUNE_CREST) {
    const u = t / DUNE_CREST;
    return u * 0.35 + u * u * (3 - 2 * u) * 0.65;
  }
  return Math.pow(1 - (t - DUNE_CREST) / (1 - DUNE_CREST), 1.25);
}

function flatMask(x: number, z: number, flats: Flat[]) {
  let mask = 0;
  for (const flat of flats) {
    const distance = Math.hypot(x - flat.x, z - flat.z);
    mask = Math.max(mask, 1 - smoothstep(flat.radius * 0.55, flat.radius, distance));
  }
  return mask;
}

const SECONDARY_ANGLE = 0.52;
const secondaryX = Math.cos(SECONDARY_ANGLE) * WIND.x - Math.sin(SECONDARY_ANGLE) * WIND.y;
const secondaryZ = Math.sin(SECONDARY_ANGLE) * WIND.x + Math.cos(SECONDARY_ANGLE) * WIND.y;

function duneField(x: number, z: number, flats: Flat[]) {
  const along = x * WIND.x + z * WIND.y;
  const cross = -x * WIND.y + z * WIND.x;

  const sinuosity =
    (fbm(cross * 0.0045, along * 0.003, 4) - 0.5) * 150 +
    (fbm(cross * 0.016 + 3.7, along * 0.012 - 1.3, 3) - 0.5) * 30;
  const primary = (along + sinuosity) / 150;
  const primaryT = primary - Math.floor(primary);
  const amplitude = 3 + 19 * smoothstep(0.3, 0.72, fbm(x * 0.0032 + 11.3, z * 0.0032 - 4.1, 4));

  const secondaryAlong = x * secondaryX + z * secondaryZ;
  const secondary = (secondaryAlong + (fbm(x * 0.01 + 2.1, z * 0.01 + 8.4, 3) - 0.5) * 40) / 46;
  const secondaryT = secondary - Math.floor(secondary);
  const secondaryAmplitude = 3.2 * smoothstep(0.35, 0.7, fbm(x * 0.006 - 7, z * 0.006 + 2, 3));
  const onSlipFace = Math.sin(Math.PI * Math.max(0, Math.min(1, (primaryT - DUNE_CREST) / (1 - DUNE_CREST))));

  const dunes =
    amplitude * duneProfile(primaryT) +
    secondaryAmplitude * duneProfile(secondaryT) * (1 - 0.6 * onSlipFace);
  const swell = (fbm(x * 0.0016 + 5, z * 0.0016 + 9, 3) - 0.5) * 30;
  const grain = (fbm(x * 0.035, z * 0.035, 2) - 0.5) * 0.8;
  const flat = flatMask(x, z, flats);

  return {
    height: swell + grain * (1 - flat * 0.6) + dunes * (1 - flat),
    crest: flat < 0.05 && amplitude > 9 && primaryT > DUNE_CREST - 0.012 && primaryT < DUNE_CREST + 0.006,
  };
}

function boxBlur(source: Float32Array, size: number, radius: number) {
  const temp = new Float32Array(source.length);
  const out = new Float32Array(source.length);
  const span = radius * 2 + 1;
  for (let z = 0; z < size; z += 1) {
    for (let x = 0; x < size; x += 1) {
      let sum = 0;
      for (let k = -radius; k <= radius; k += 1) {
        sum += source[z * size + Math.max(0, Math.min(size - 1, x + k))];
      }
      temp[z * size + x] = sum / span;
    }
  }
  for (let z = 0; z < size; z += 1) {
    for (let x = 0; x < size; x += 1) {
      let sum = 0;
      for (let k = -radius; k <= radius; k += 1) {
        sum += temp[Math.max(0, Math.min(size - 1, z + k)) * size + x];
      }
      out[z * size + x] = sum / span;
    }
  }
  return out;
}

function buildHeightTexture(heights: Float32Array) {
  const size = WORLD.resolution;
  const levels: Array<{ data: Uint16Array; width: number; height: number }> = [];
  let level = new Float32Array(size * size * 4);

  for (let z = 0; z < size; z += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = z * size + x;
      const left = heights[z * size + Math.max(0, x - 1)];
      const right = heights[z * size + Math.min(size - 1, x + 1)];
      const back = heights[Math.max(0, z - 1) * size + x];
      const front = heights[Math.min(size - 1, z + 1) * size + x];
      level[i * 4] = heights[i];
      level[i * 4 + 1] = (right - left) / (2 * CELL);
      level[i * 4 + 2] = (front - back) / (2 * CELL);
      level[i * 4 + 3] = 1;
    }
  }

  let width = size;
  while (width >= 1) {
    const data = new Uint16Array(level.length);
    for (let i = 0; i < level.length; i += 1) data[i] = THREE.DataUtils.toHalfFloat(level[i]);
    levels.push({ data, width, height: width });
    if (width === 1) break;

    const next = width / 2;
    const reduced = new Float32Array(next * next * 4);
    for (let z = 0; z < next; z += 1) {
      for (let x = 0; x < next; x += 1) {
        for (let c = 0; c < 4; c += 1) {
          const a = ((z * 2) * width + x * 2) * 4 + c;
          const b = ((z * 2 + 1) * width + x * 2) * 4 + c;
          reduced[(z * next + x) * 4 + c] = (level[a] + level[a + 4] + level[b] + level[b + 4]) * 0.25;
        }
      }
    }
    level = reduced;
    width = next;
  }

  const texture = new THREE.DataTexture(levels[0].data, size, size, THREE.RGBAFormat, THREE.HalfFloatType);
  texture.mipmaps = levels;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function generateTerrain(flats: Flat[], maxCrests = 1600): TerrainData {
  const size = WORLD.resolution;
  const heights = new Float32Array(size * size);
  const crestCandidates: number[] = [];

  for (let z = 0; z < size; z += 1) {
    const worldZ = WORLD.minZ + (z + 0.5) * CELL;
    for (let x = 0; x < size; x += 1) {
      const worldX = WORLD.minX + (x + 0.5) * CELL;
      const sample = duneField(worldX, worldZ, flats);
      heights[z * size + x] = sample.height;
      if (sample.crest && hash(x, z + 9001) < 0.35) crestCandidates.push(worldX, worldZ, z * size + x);
    }
  }

  const candidateCount = crestCandidates.length / 3;
  const crestTotal = Math.min(maxCrests, candidateCount);
  const crests = new Float32Array(crestTotal * 3);
  for (let i = 0; i < crestTotal; i += 1) {
    const pick = Math.floor(hash(i, 4242) * candidateCount);
    crests[i * 3] = crestCandidates[pick * 3];
    crests[i * 3 + 1] = heights[crestCandidates[pick * 3 + 2]];
    crests[i * 3 + 2] = crestCandidates[pick * 3 + 1];
  }

  return {
    heights,
    smoothHeights: boxBlur(boxBlur(heights, size, 3), size, 3),
    heightTexture: buildHeightTexture(heights),
    crests,
  };
}

export function sampleHeight(field: Float32Array, x: number, z: number) {
  const size = WORLD.resolution;
  const gx = Math.max(0, Math.min(size - 1.001, (x - WORLD.minX) / CELL - 0.5));
  const gz = Math.max(0, Math.min(size - 1.001, (z - WORLD.minZ) / CELL - 0.5));
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const fx = gx - ix;
  const fz = gz - iz;
  const a = field[iz * size + ix];
  const b = field[iz * size + ix + 1];
  const c = field[(iz + 1) * size + ix];
  const d = field[(iz + 1) * size + ix + 1];
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

export function createTerrainGeometry(heights: Float32Array, segments: number) {
  const vertexCount = (segments + 1) * (segments + 1);
  const positions = new Float32Array(vertexCount * 3);
  let index = 0;
  for (let iz = 0; iz <= segments; iz += 1) {
    const z = WORLD.minZ + (iz / segments) * WORLD.size;
    for (let ix = 0; ix <= segments; ix += 1) {
      const x = WORLD.minX + (ix / segments) * WORLD.size;
      positions[index] = x;
      positions[index + 1] = sampleHeight(heights, x, z);
      positions[index + 2] = z;
      index += 3;
    }
  }

  const indices = new Uint32Array(segments * segments * 6);
  let cursor = 0;
  for (let z = 0; z < segments; z += 1) {
    for (let x = 0; x < segments; x += 1) {
      const a = z * (segments + 1) + x;
      const b = a + segments + 1;
      indices[cursor++] = a;
      indices[cursor++] = b;
      indices[cursor++] = a + 1;
      indices[cursor++] = a + 1;
      indices[cursor++] = b;
      indices[cursor++] = b + 1;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -200), 1200);
  return geometry;
}
