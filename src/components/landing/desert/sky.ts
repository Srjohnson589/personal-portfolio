import * as THREE from "three";
import { ATMOSPHERE_GLSL, NOISE_GLSL, type SharedUniforms } from "./shaders";

export function createSky(shared: SharedUniforms) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uSunDir: shared.uSunDir,
      uSunColor: shared.uSunColor,
      uFogDensity: shared.uFogDensity,
      uFogFalloff: shared.uFogFalloff,
      uFogFade: shared.uFogFade,
      uTime: shared.uTime,
    },
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = position;
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = clip.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vDirection;
      ${NOISE_GLSL}
      ${ATMOSPHERE_GLSL}

      vec3 cirrus(vec3 rd, vec3 color) {
        if (rd.y <= 0.0) return color;
        vec2 cp = rd.xz / (rd.y + 0.18) * vec2(0.9, 2.6) + vec2(uTime * 0.004, 0.0);
        float streaks = fbm(cp * 1.4 + fbm(cp * 0.6) * 1.2);
        float cover = smoothstep(0.56, 0.86, streaks) * smoothstep(0.02, 0.2, rd.y) * smoothstep(0.75, 0.25, rd.y);
        float lit = pow(max(dot(rd, uSunDir), 0.0), 3.0);
        vec3 cloud = mix(vec3(0.62, 0.4, 0.42), vec3(2.6, 1.3, 0.6), lit);
        return mix(color, cloud, cover * 0.45);
      }

      void main() {
        vec3 rd = normalize(vDirection);
        float y = max(rd.y, 0.0);
        float t = pow(y, 0.5);
        float az = sunAzimuth(rd);
        float m = max(dot(rd, uSunDir), 0.0);

        vec3 color = horizonColor(rd);
        color = mix(color, mix(SKY_LOW_ANTI, SKY_LOW_SUN, pow(az, 2.2)), smoothstep(0.0, 0.32, t));
        color = mix(color, SKY_MID, smoothstep(0.24, 0.62, t));
        color = mix(color, SKY_ZENITH, smoothstep(0.5, 1.0, t));
        color += sunGlow(m);
        color = mix(color, hazeColor(rd), exp(-y * 16.0) * 0.7);
        color = cirrus(rd, color);
        color += vec3(40.0, 24.0, 11.0) * smoothstep(0.99975, 0.99988, m);
        color += vec3(3.0, 1.4, 0.5) * pow(m, 900.0);

        if (rd.y < 0.0) color = hazeColor(rd);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

  const dome = new THREE.Mesh(new THREE.SphereGeometry(1500, 64, 32), material);
  dome.frustumCulled = false;
  dome.renderOrder = -1;
  return { dome, material };
}
