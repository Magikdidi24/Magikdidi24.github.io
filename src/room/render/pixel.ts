/*
  The pixel-art pipeline. The scene is drawn into a low-resolution buffer (one
  buffer pixel per virtual pixel) and the canvas is enlarged in CSS without
  smoothing, so outlines and bloom stay on the pixel grid.

    RenderPixelatedPass   colour, outlines from depth, highlights from normals
    UnrealBloomPass       only what is brighter than 1 (emissive materials)
    OutputPass            linear to sRGB
*/
import { Vector2, type Camera, type Scene, type WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { autoPixelSize, gridSize, type Grid } from '../view.ts';

/** 'auto' picks the size from the viewport, 'smooth' is one device pixel, a number is CSS pixels. */
export type PixelMode = 'auto' | 'smooth' | number;

/** In smooth mode the buffer never exceeds 2 device pixels per CSS pixel. */
const MAX_SMOOTH_DPR = 2;

/* Weight of the five blur levels of the bloom, finest first. The buffer is
   small, so the two widest levels would veil the whole picture: they are off. */
const BLOOM_LEVELS = [1, 0.6, 0.15, 0, 0];

export interface Pipeline {
  readonly pixelPass: RenderPixelatedPass;
  readonly bloomPass: UnrealBloomPass;
  /** The current grid. Set by resize(). */
  readonly grid: Grid;
  mode: PixelMode;
  /** Size the buffer and the canvas for the container and the devicePixelRatio. */
  resize(): void;
  render(): void;
  dispose(): void;
}

export function createPipeline(renderer: WebGLRenderer, scene: Scene, camera: Camera, container: HTMLElement): Pipeline {
  const canvas = renderer.domElement;
  renderer.setPixelRatio(1);

  const composer = new EffectComposer(renderer);
  /* Outlines a little darker than the default 0.4: wood on wood needs it. */
  const pixelPass = new RenderPixelatedPass(1, scene, camera, { depthEdgeStrength: 0.6 });
  /* Threshold above 1: lit surfaces stay below it, even on a highlighted edge. */
  const bloomPass = new UnrealBloomPass(new Vector2(1, 1), 0.25, 0, 1.4);
  bloomPass.compositeMaterial.uniforms.bloomFactors.value = BLOOM_LEVELS;
  const outputPass = new OutputPass();
  composer.addPass(pixelPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);

  let grid: Grid = gridSize(1, 1, 1, 1);

  const pipeline: Pipeline = {
    pixelPass,
    bloomPass,
    mode: 'auto',
    get grid() {
      return grid;
    },
    resize() {
      const width = container.clientWidth;
      const height = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      const { mode } = pipeline;
      grid =
        mode === 'smooth'
          ? gridSize(width, height, Math.min(dpr, MAX_SMOOTH_DPR), 0)
          : gridSize(width, height, dpr, mode === 'auto' ? autoPixelSize(width, height) : mode);
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
      pixelPass.dispose();
      bloomPass.dispose();
      outputPass.dispose();
      composer.dispose();
    },
  };
  return pipeline;
}
