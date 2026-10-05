import * as THREE from "three";
import {
  ATMOSPHERE_GLSL,
  NOISE_GLSL,
  TERRAIN_LOOKUP_GLSL,
  WIND_GLSL,
  type SharedUniforms,
} from "./shaders";

// Bakes sun visibility (R), ambient occlusion (G) and convexity (B) once; the sun never moves.
export function bakeTerrainLighting(
  renderer: THREE.WebGLRenderer,
  shared: SharedUniforms,
  size: number,
) {
  const target = new THREE.WebGLRenderTarget(size, size, {
    type: THREE.UnsignedByteType,
    depthBuffer: false,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  });
  target.texture.colorSpace = THREE.NoColorSpace;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uHeight: shared.uHeight,
      uLight: shared.uLight,
      uWorldMin: shared.uWorldMin,
      uWorldSize: shared.uWorldSize,
      uSunDir: shared.uSunDir,
    },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir;
      varying vec2 vUv;
      ${TERRAIN_LOOKUP_GLSL}

      float heightAt(vec2 p) {
        return texture2D(uHeight, terrainUv(p)).r;
      }

      void main() {
        vec2 p = uWorldMin + vUv * uWorldSize;
        float h = heightAt(p);
        vec2 dir = normalize(uSunDir.xz);
        float rise = uSunDir.y / length(uSunDir.xz);

        float visibility = 1.0;
        float d = 0.6;
        for (int i = 0; i < 120; i++) {
          float ray = h + 0.15 + d * rise;
          float ground = heightAt(p + dir * d);
          float penumbra = 0.014 * d + 0.35;
          visibility = min(visibility, clamp(0.5 + 0.5 * (ray - ground) / penumbra, 0.0, 1.0));
          if (visibility <= 0.0 || ray > 70.0) break;
          d = d * 1.035 + 0.7;
        }

        float nearAverage = 0.0;
        float farAverage = 0.0;
        for (int i = 0; i < 12; i++) {
          float a = float(i) * 0.5236;
          vec2 o = vec2(cos(a), sin(a));
          nearAverage += heightAt(p + o * 7.0);
          farAverage += heightAt(p + o * 28.0);
        }
        nearAverage /= 12.0;
        farAverage /= 12.0;
        float occlusion = max(nearAverage - h, 0.0) * 0.07 + max(farAverage - h, 0.0) * 0.025;
        float ao = clamp(1.0 - occlusion, 0.4, 1.0);
        float convexity = clamp(0.5 + (h - nearAverage) * 0.18, 0.0, 1.0);

        gl_FragColor = vec4(visibility, ao, convexity, 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const previous = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  renderer.render(scene, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
  renderer.setRenderTarget(previous);
  material.dispose();
  quad.geometry.dispose();
  return target;
}

export function createTerrainMaterial(shared: SharedUniforms) {
  const rippleTime = { value: 0 };
  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared, uRippleTime: rippleTime },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uRippleTime;
      varying vec3 vWorld;
      ${NOISE_GLSL}
      ${ATMOSPHERE_GLSL}
      ${WIND_GLSL}
      ${TERRAIN_LOOKUP_GLSL}

      // Aeolian ripple: long stoss side, sharp crest, short lee.
      float ripple(float t, float crest) {
        if (t < crest) {
          float s = t / crest;
          return s * s * (1.5 - 0.5 * s);
        }
        float v = (t - crest) / (1.0 - crest);
        return (1.0 - v) * (1.0 - v);
      }

      // Detail layers fade out before they get smaller than a pixel, so nothing shimmers.
      float detailHeight(vec2 p, float footprint, float lee) {
        float along = dot(p, uWind);
        float across = dot(p, vec2(-uWind.y, uWind.x));
        float h = 0.0;

        float ridgeFade = 1.0 - smoothstep(0.8, 2.4, footprint);
        if (ridgeFade > 0.0) {
          float warp = (vnoise(p * 0.045) - 0.5) * 14.0 + (vnoise(p * 0.16 + 4.0) - 0.5) * 3.2;
          float strength = 0.4 + vnoise(p * 0.03 + 9.0);
          h += 0.09 * strength * ripple(fract((along + warp) / 3.6), 0.78) * ridgeFade;
        }

        float rippleFade = 1.0 - smoothstep(0.1, 0.32, footprint);
        if (rippleFade > 0.0) {
          float warp = (vnoise(vec2(across * 0.28, along * 0.1)) - 0.5) * 4.4 + (vnoise(p * 0.9) - 0.5) * 0.7 + (vnoise(vec2(across * 1.3, along * 0.4) + 5.0) - 0.5) * 0.9;
          float strength = smoothstep(0.25, 0.85, vnoise(p * 0.35 + 2.0)) * 0.75 + 0.25;
          float soft = 0.5 - 0.5 * cos(6.2831 * fract((along + warp - uRippleTime) / 0.62));
          h += 0.007 * strength * soft * rippleFade;
        }

        float fineFade = 1.0 - smoothstep(0.025, 0.07, footprint);
        if (fineFade > 0.0) {
          float warp = (vnoise(vec2(across * 1.4, along * 0.6) + 7.0) - 0.5) * 1.0;
          h += 0.0025 * ripple(fract((along + warp - uRippleTime * 1.6) / 0.16), 0.7) * fineFade;
        }

        return h * (1.0 - 0.85 * lee);
      }

      float orenNayar(vec3 n, vec3 v, vec3 l, float roughness) {
        float nl = dot(n, l);
        float nv = dot(n, v);
        float s = dot(l, v) - nl * nv;
        float t = s > 0.0 ? max(max(nl, nv), 1e-3) : 1.0;
        float r2 = roughness * roughness;
        float a = 1.0 - 0.5 * r2 / (r2 + 0.33);
        float b = 0.45 * r2 / (r2 + 0.09);
        return max(nl, 0.0) * (a + b * s / t);
      }

      float glints(vec2 p, vec3 n, vec3 v, float footprint) {
        float fade = 1.0 - smoothstep(0.004, 0.02, footprint);
        if (fade <= 0.0) return 0.0;
        vec2 cell = floor(p / 0.006);
        if (hash21(cell + 7.3) < 0.975) return 0.0;
        vec2 tilt = hash22(cell) - 0.5;
        vec3 facet = normalize(n + vec3(tilt.x, 0.0, tilt.y) * 1.4);
        vec3 halfVector = normalize(v + uSunDir);
        return pow(max(dot(facet, halfVector), 0.0), 600.0) * fade;
      }

      void main() {
        vec2 p = vWorld.xz;
        vec2 uv = terrainUv(p);
        vec4 terrain = texture2D(uHeight, uv);
        vec4 baked = texture2D(uLight, uv);
        vec2 gradient = terrain.gb;

        vec3 toCamera = cameraPosition - vWorld;
        float viewDistance = length(toCamera);
        vec3 v = toCamera / viewDistance;
        float footprint = max(length(fwidth(p)), 1e-4);

        float slope = length(gradient);
        float downwind = dot(gradient, uWind);
        float lee = smoothstep(0.3, 0.6, -downwind);
        float windward = smoothstep(0.02, 0.25, downwind);
        float convexity = baked.b;

        float eps = clamp(footprint * 0.6, 0.004, 0.6);
        float h0 = detailHeight(p, footprint, lee);
        float hx = detailHeight(p + vec2(eps, 0.0), footprint, lee);
        float hz = detailHeight(p + vec2(0.0, eps), footprint, lee);
        vec2 detail = vec2(hx - h0, hz - h0) / eps;

        // Grain-flow streaks run straight down the slip faces.
        float grainFade = lee * (1.0 - smoothstep(0.4, 1.6, footprint));
        float grainStreak = 0.5;
        if (grainFade > 0.0) {
          vec2 down = -gradient / max(slope, 1e-4);
          vec2 side = vec2(-down.y, down.x);
          float s = dot(p, side);
          float d = dot(p, down);
          float stride = max(eps, 0.12);
          grainStreak = vnoise(vec2(s * 0.8, d * 0.05));
          float next = vnoise(vec2((s + stride) * 0.8, d * 0.05));
          detail += side * (next - grainStreak) / stride * 0.09 * grainFade;
        }

        vec2 g = gradient + detail;
        vec3 n = normalize(vec3(-g.x, 1.0, -g.y));

        float broad = fbm(p * 0.0035);
        float mottling = fbm(p * 0.025 + 3.0);
        vec3 albedo = mix(vec3(0.4, 0.19, 0.085), vec3(0.55, 0.3, 0.145), smoothstep(0.25, 0.75, broad));
        albedo = mix(albedo, vec3(0.62, 0.4, 0.22), smoothstep(0.55, 0.85, mottling) * 0.45);
        albedo = mix(albedo, albedo * vec3(1.12, 1.08, 1.02), smoothstep(0.55, 0.85, convexity));
        albedo = mix(albedo, albedo * vec3(0.86, 0.84, 0.86), smoothstep(0.45, 0.15, convexity) * 0.7);
        albedo *= mix(1.0, 0.92 + 0.16 * grainStreak, grainFade);
        albedo *= 0.94 + 0.12 * clamp(h0 * 22.0, 0.0, 1.0);

        float sunVisibility = baked.r;
        float ao = baked.g;
        // Ripple lee faces stay softly shaded instead of dropping to black under a grazing sun.
        float macroDiffuse = orenNayar(normalize(vec3(-gradient.x, 1.0, -gradient.y)), v, uSunDir, 0.85);
        float diffuse = max(mix(macroDiffuse, orenNayar(n, v, uSunDir, 0.85), 0.7), macroDiffuse * 0.55);
        float opposition = pow(max(dot(v, uSunDir), 0.0), 12.0) * 0.35;
        vec3 direct = uSunColor * diffuse * sunVisibility * (1.0 + opposition);
        vec3 sky = AMBIENT_SKY * (0.55 + 0.45 * n.y);
        vec3 bounce = vec3(0.3, 0.16, 0.08) * (0.35 + 0.65 * (1.0 - sunVisibility)) * 0.6;
        vec3 color = albedo * (direct + (sky + bounce) * ao);
        color += uSunColor * glints(p, n, v, footprint) * sunVisibility * 0.3;

        // Saltating sand: wispy streamers racing downwind, strongest on exposed windward slopes.
        float streamerFade = 1.0 - smoothstep(70.0, 260.0, viewDistance);
        if (streamerFade > 0.0) {
          float along = dot(p, uWind);
          float across = dot(p, vec2(-uWind.y, uWind.x));
          float body = fbm(vec2((along - uFlow) * 0.06, across * 0.55));
          float wisps = vnoise(vec2((along - uFlow * 1.25) * 0.22, across * 2.2 + 5.0));
          float streamer = smoothstep(0.52, 0.9, body * 0.75 + wisps * 0.4);
          float exposure = clamp(0.3 + windward * 0.8 + smoothstep(0.55, 0.8, convexity) * 0.6 - lee * 0.9, 0.0, 1.0);
          float amount = streamer * gustField(p) * exposure * streamerFade;
          float forward = phaseHG(dot(-v, uSunDir), 0.55);
          vec3 lifted = albedo * 1.25 * (uSunColor * (0.25 + 0.12 * forward) * sunVisibility + AMBIENT_SKY * 1.6);
          color = mix(color, lifted, clamp(amount * 0.5, 0.0, 0.6));
        }

        gl_FragColor = vec4(applyAtmosphere(color, vWorld), 1.0);
      }
    `,
  });
  return { material, rippleTime };
}
