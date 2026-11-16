/*
  Bootstrap of the 3D room: renderer, scene, camera, pixel pipeline and the
  render loop. A frame is drawn only when the camera moved, the viewport
  changed or something called invalidate().
*/
import { NoToneMapping, PCFShadowMap, WebGLRenderer } from 'three';
import { createRig, type Rig } from './camera.ts';
import { createReactions } from './interaction/reactions.ts';
import { createPipeline, type Pipeline } from './render/pixel.ts';
import { createScene, ROOM, type RoomScene } from './scene.ts';
import { pixelAt } from './view.ts';

export interface RoomApp {
  readonly renderer: WebGLRenderer;
  readonly room: RoomScene;
  readonly rig: Rig;
  readonly pipeline: Pipeline;
  /** Draw a frame on the next tick. With `shadows`, redraw the shadow map too: something that casts one moved. */
  invalidate(shadows?: boolean): void;
  /** Call `step` before each frame, with the time in milliseconds, until it returns false. */
  animate(step: (now: number) => boolean): void;
  /** The name of the object drawn under a point of the viewport, if there is one. */
  pick(clientX: number, clientY: number): string | null;
  /** Recompute the pixel grid and the camera fit, after the viewport or the pixel size changed. */
  resize(): void;
  setNight(night: boolean): void;
  dispose(): void;
}

export async function start(canvas: HTMLCanvasElement, container: HTMLElement): Promise<RoomApp> {
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  /* The palette colours must reach the screen unchanged. */
  renderer.toneMapping = NoToneMapping;
  renderer.shadowMap.enabled = true;
  /* Filtered: unfiltered shadows saw-tooth on 5 cm steps. The low-resolution buffer makes the edge hard again. */
  renderer.shadowMap.type = PCFShadowMap;
  /* The shadow map is drawn again only when asked: when the lights change or something that casts a shadow moves. */
  renderer.shadowMap.autoUpdate = false;
  /* The pipeline calls render() several times per frame: count draw calls over the whole frame. */
  renderer.info.autoReset = false;

  const room = createScene();
  const rig = createRig(ROOM, canvas);
  const pipeline = createPipeline(renderer, room.scene, rig.camera, container);

  let dirty = true;
  let frame = 0;
  const animations = new Set<(now: number) => boolean>();
  /** Draw a frame with fresh shadows: the lights changed, or the graphics context came back. */
  const redraw = () => app.invalidate(true);

  const app: RoomApp = {
    renderer,
    room,
    rig,
    pipeline,
    invalidate(shadows = false) {
      if (shadows) renderer.shadowMap.needsUpdate = true;
      dirty = true;
    },
    animate(step) {
      animations.add(step);
    },
    pick(clientX, clientY) {
      const box = canvas.getBoundingClientRect();
      const pixel = pixelAt(pipeline.grid, clientX - box.left, clientY - box.top);
      if (!pixel) return null;
      return room.names[pipeline.outlinePass.idAt(renderer, pixel.x, pixel.y) - 1] ?? null;
    },
    resize() {
      pipeline.resize();
      room.fitBoard(rig.fit(pipeline.grid), pipeline.grid);
      dirty = true;
    },
    setNight(night) {
      room.setNight(night);
      /* A glow shows less in daylight. */
      pipeline.bloomPass.strength = night ? 0.6 : 0.25;
      redraw();
    },
    dispose() {
      cancelAnimationFrame(frame);
      stopReactions();
      rig.controls.removeEventListener('change', changed);
      observer.disconnect();
      canvas.removeEventListener('webglcontextrestored', redraw);
      rig.dispose();
      pipeline.dispose();
      room.dispose();
      renderer.dispose();
    },
  };

  const stopReactions = createReactions(app, canvas);
  /* The controls apply a turn of the wheel as soon as it happens, outside the loop below: the loop
     would see nothing left to do and never draw it. Their own signal is what asks for a frame. */
  const changed = () => app.invalidate();
  rig.controls.addEventListener('change', changed);
  const observer = new ResizeObserver(() => app.resize());
  observer.observe(container);
  canvas.addEventListener('webglcontextrestored', redraw);
  const hour = new Date().getHours();
  app.setNight(hour < 7 || hour >= 19);
  app.resize();

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    for (const step of animations) if (!step(now)) animations.delete(step);
    rig.update();
    if (!dirty) return;
    dirty = false;
    renderer.info.reset();
    rig.renderAligned(pipeline.grid, () => pipeline.render());
  };
  tick(performance.now());

  if (import.meta.env.DEV) (await import('./debug.ts')).setupDebug(app);
  return app;
}
