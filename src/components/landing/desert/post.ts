import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { NOISE_GLSL } from "./shaders";

const QUAD_VERTEX = "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";

export function createPost(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples: 4,
  });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));

  const shimmer = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uHorizon: { value: 0.5 },
      uStrength: { value: 0.0014 },
    },
    vertexShader: QUAD_VERTEX,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float uTime;
      uniform float uHorizon;
      uniform float uStrength;
      varying vec2 vUv;
      ${NOISE_GLSL}
      void main() {
        float band = exp(-abs(vUv.y - uHorizon) * 26.0);
        vec2 q = vec2(vUv.x * 46.0, vUv.y * 180.0 - uTime * 2.6);
        vec2 offset = vec2(vnoise(q) - 0.5, vnoise(q + 9.1) - 0.5) * vec2(1.0, 0.6) * uStrength * band;
        gl_FragColor = texture2D(tDiffuse, vUv + offset);
      }
    `,
  });
  composer.addPass(shimmer);

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.3, 0.7, 1.6);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const finish = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
    },
    vertexShader: QUAD_VERTEX,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float uTime;
      varying vec2 vUv;
      ${NOISE_GLSL}
      void main() {
        vec3 color = texture2D(tDiffuse, vUv).rgb;
        vec2 centered = vUv - 0.5;
        color *= 1.0 - dot(centered, centered) * 0.55;
        float grain = hash21(gl_FragCoord.xy + fract(uTime * 13.7) * 431.0) - 0.5;
        color += grain * 0.022;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  composer.addPass(finish);

  const horizonProbe = new THREE.Vector3();
  const forward = new THREE.Vector3();

  return {
    render(time: number) {
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      horizonProbe.copy(camera.position).addScaledVector(forward, 1000).project(camera);
      shimmer.uniforms.uHorizon.value = horizonProbe.y * 0.5 + 0.5;
      shimmer.uniforms.uTime.value = time;
      finish.uniforms.uTime.value = time;
      composer.render();
    },
    setSize(width: number, height: number) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
    },
    dispose() {
      bloom.dispose();
      composer.dispose();
    },
  };
}
