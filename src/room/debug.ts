/*
  Development tools, loaded by main.ts in dev only: a lil-gui panel, the
  stats.js meter (both ship with three) and window.__room for the browser
  console and for Playwright. Nothing here reaches the production build.
*/
import GUI from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';
import type { RoomApp } from './main.ts';
import type { PixelMode } from './render/pixel.ts';
import { LIGHTING } from './scene.ts';

export interface Measure {
  gpu: string;
  grid: string;
  /** Cost of one frame, GPU included, in milliseconds. */
  medianMs: number;
  p95Ms: number;
  drawCalls: number;
  triangles: number;
}

export function setupDebug(app: RoomApp): void {
  const { pipeline, rig, room, renderer } = app;
  const gl = renderer.getContext();

  const stats = new Stats();
  stats.dom.style.cssText = 'position:fixed;left:0;bottom:0;z-index:5';
  document.body.appendChild(stats.dom);
  const render = pipeline.render;
  pipeline.render = () => {
    stats.begin();
    render();
    stats.end();
    state.calls = renderer.info.render.calls;
    state.triangles = renderer.info.render.triangles;
    state.grid = `${pipeline.grid.cols} x ${pipeline.grid.rows}, k = ${pipeline.grid.k}`;
    const view = rig.view();
    state.view = `az ${view.azimuth}, el ${view.elevation}, zoom ${view.zoom}`;
  };

  const state = {
    pixels: 'auto',
    night: room.night,
    front: 5,
    back: 7,
    view: '',
    grid: '',
    calls: 0,
    triangles: 0,
    copyView: () => {
      const view = JSON.stringify(rig.view());
      void navigator.clipboard?.writeText(view);
      console.info(view);
    },
  };

  const gui = new GUI({ title: 'Room (dev)' });
  const redraw = () => app.invalidate();
  gui.close();

  const pixels = gui.addFolder('Pixels');
  pixels.add(state, 'pixels', ['auto', 'smooth', '2', '3', '4', '5']).onChange((value: string) => {
    pipeline.mode = (value === 'auto' || value === 'smooth' ? value : Number(value)) as PixelMode;
    app.resize();
  });
  pixels.add(pipeline.outlinePass, 'depthEdgeStrength', 0, 1, 0.05).name('outline strength').onChange(redraw);
  pixels.add(pipeline.outlinePass, 'normalEdgeStrength', 0, 1, 0.05).name('highlight strength').onChange(redraw);
  pixels.add(pipeline.outlinePass, 'depthThreshold', 0.02, 0.4, 0.01).name('inner step (m)').onChange(redraw);
  pixels.add(state, 'grid').listen().disable();

  const camera = gui.addFolder('Camera');
  const depth = () => {
    rig.setDepthRange(state.front, state.back);
    app.invalidate();
  };
  camera.add(state, 'front', 4, 12, 0.5).name('depth in front (m)').onChange(depth);
  camera.add(state, 'back', 4, 20, 0.5).name('depth behind (m)').onChange(depth);
  camera.add(rig, 'rotationStep', 0, 15, 0.5).name('rotation step (deg)').onChange(redraw);
  camera.add(rig, 'zoomStep', 0, 0.25, 0.01).name('zoom step').onChange(redraw);
  camera.add(state, 'view').listen().disable();
  camera.add(state, 'copyView').name('copy view');

  const light = gui.addFolder('Light');
  light.add(state, 'night').onChange((night: boolean) => app.setNight(night));
  const relight = () => app.setNight(room.night);
  for (const [name, preset] of Object.entries(LIGHTING)) {
    const folder = light.addFolder(name);
    folder.add(preset, 'ambient', 0, 1, 0.01).onChange(relight);
    folder.add(preset, 'key', 0, 1, 0.01).onChange(relight);
    folder.add(preset, 'moon', 0, 1, 0.01).onChange(relight);
    folder.add(preset, 'lamps', 0, 3, 0.05).onChange(relight);
  }

  const bloom = gui.addFolder('Bloom');
  bloom.add(pipeline.bloomPass, 'strength', 0, 2, 0.05).onChange(redraw);
  bloom.add(pipeline.bloomPass, 'radius', 0, 1, 0.05).onChange(redraw);
  bloom.add(pipeline.bloomPass, 'threshold', 0, 3, 0.05).onChange(redraw);

  const info = gui.addFolder('Frame');
  info.add(state, 'calls').name('draw calls').listen().disable();
  info.add(state, 'triangles').listen().disable();

  /** Draw `frames` frames back to back and time each one until the GPU is done. */
  const measure = (frames = 120): Measure => {
    const times: number[] = [];
    const pixel = new Uint8Array(4);
    for (let i = 0; i < frames; i++) {
      const before = performance.now();
      renderer.info.reset();
      rig.renderAligned(pipeline.grid, render);
      gl.finish();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      times.push(performance.now() - before);
    }
    times.sort((a, b) => a - b);
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      gpu: String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)),
      grid: `${pipeline.grid.cols} x ${pipeline.grid.rows}`,
      medianMs: Math.round(times[Math.floor(frames / 2)] * 100) / 100,
      p95Ms: Math.round(times[Math.floor(frames * 0.95)] * 100) / 100,
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
    };
  };

  Object.assign(window, { __room: { app, gui, stats, measure } });
}
