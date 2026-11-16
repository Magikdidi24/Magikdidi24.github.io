/*
  The pixel-art pipeline. The scene is drawn into a low-resolution buffer (one
  buffer pixel per virtual pixel) and the canvas is enlarged in CSS without
  smoothing, so outlines and bloom stay on the pixel grid.

    OutlinePass        colour, outlines between objects, highlights on creases
    UnrealBloomPass    a glow around the emissive pixels only
    OutputPass         linear to sRGB

  three's own RenderPixelatedPass is kept beside it for comparison, off by
  default; with it the bloom falls back to a brightness threshold.
*/
import { ShaderMaterial, Vector2, type OrthographicCamera, type Scene, type WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { autoGrid, gridSize, type Grid } from '../view.ts';
import { OutlinePass } from './outline.ts';

/** 'auto' picks the size from the viewport, 'smooth' is one device pixel, a number is CSS pixels. */
export type PixelMode = 'auto' | 'smooth' | number;

/** In smooth mode the buffer never exceeds 2 device pixels per CSS pixel. */
const MAX_SMOOTH_DPR = 2;

/* Weight of the five blur levels of the bloom, finest first. The buffer is
   small, so the two widest levels would veil the whole picture: they are off. */
const BLOOM_LEVELS = [1, 0.6, 0.15, 0, 0];

/** First step of the bloom: keep the emissive pixels, as flagged in the aux buffer of the outline pass. */
const emissiveOnly = () =>
  new ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, tAux: { value: null }, luminosityThreshold: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform sampler2D tAux;
      varying vec2 vUv;

      void main() {
        gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb * texture2D(tAux, vUv).a, 1.0);
      }
    `,
  });

export interface Pipeline {
  readonly outlinePass: OutlinePass;
  readonly bloomPass: UnrealBloomPass;
  /** The current grid. Set by resize(). */
  readonly grid: Grid;
  mode: PixelMode;
  /** Comparison only: draw with three's RenderPixelatedPass and a threshold bloom. */
  useOfficialPass(on: boolean): void;
  /** Size the buffer and the canvas for the container and the devicePixelRatio. */
  resize(): void;
  render(): void;
  dispose(): void;
}

export function createPipeline(renderer: WebGLRenderer, scene: Scene, camera: OrthographicCamera, container: HTMLElement): Pipeline {
  const canvas = renderer.domElement;
  renderer.setPixelRatio(1);

  const composer = new EffectComposer(renderer);
  const outlinePass = new OutlinePass(scene, camera);
  const officialPass = new RenderPixelatedPass(1, scene, camera, { depthEdgeStrength: 0.6 });
  officialPass.enabled = false;
  const bloomPass = new UnrealBloomPass(new Vector2(1, 1), 0.25, 0, 1.4);
  bloomPass.compositeMaterial.uniforms.bloomFactors.value = BLOOM_LEVELS;
  const byThreshold = { material: bloomPass.materialHighPassFilter, uniforms: bloomPass.highPassUniforms };
  const byFlag = emissiveOnly();
  byFlag.uniforms.tAux.value = outlinePass.auxTexture;
  const outputPass = new OutputPass();
  composer.addPass(outlinePass);
  composer.addPass(officialPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);

  let grid: Grid = gridSize(1, 1, 1, 1);

  const pipeline: Pipeline = {
    outlinePass,
    bloomPass,
    mode: 'auto',
    get grid() {
      return grid;
    },
    useOfficialPass(on) {
      outlinePass.enabled = !on;
      officialPass.enabled = on;
      bloomPass.materialHighPassFilter = on ? byThreshold.material : byFlag;
      bloomPass.highPassUniforms = on ? byThreshold.uniforms : byFlag.uniforms;
    },
    resize() {
      const width = container.clientWidth;
      const height = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      const { mode } = pipeline;
      if (mode === 'smooth') grid = gridSize(width, height, Math.min(dpr, MAX_SMOOTH_DPR), 0);
      else if (mode === 'auto') grid = autoGrid(width, height, dpr);
      else grid = gridSize(width, height, dpr, mode);
      renderer.setSize(grid.cols, grid.rows, false);
      composer.setSize(grid.cols, grid.rows);
      canvas.style.width = `${grid.cssWidth}px`;
      canvas.style.height = `${grid.cssHeight}px`;
      canvas.style.imageRendering = mode === 'smooth' ? 'auto' : 'pixelated';
    },
    render() {
      composer.render();
    },
    dispose() {
      outlinePass.dispose();
      officialPass.dispose();
      byThreshold.material.dispose();
      byFlag.dispose();
      bloomPass.dispose();
      outputPass.dispose();
      composer.dispose();
    },
  };
  pipeline.useOfficialPass(false);
  return pipeline;
}
