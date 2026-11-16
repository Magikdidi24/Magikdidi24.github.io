/*
  Bootstrap of the 3D room: renderer, scene, camera, pixel pipeline and the
  render loop. A frame is drawn only when the camera moved, the viewport
  changed or something called invalidate().
*/
import { NoToneMapping, PCFShadowMap, WebGLRenderer } from 'three';
import { createRig, type Rig } from './camera.ts';
import { createPipeline, type Pipeline } from './render/pixel.ts';
import { createScene, ROOM, type RoomScene } from './scene.ts';

export interface RoomApp {
  readonly renderer: WebGLRenderer;
  readonly room: RoomScene;
  readonly rig: Rig;
  readonly pipeline: Pipeline;
  /** Draw a frame on the next tick. */
  invalidate(): void;
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
  /* The pipeline calls render() several times per frame: count draw calls over the whole frame. */
  renderer.info.autoReset = false;

  const room = createScene();
  const rig = createRig(ROOM, canvas);
  const pipeline = createPipeline(renderer, room.scene, rig.camera, container);

  let dirty = true;
  let frame = 0;

  const app: RoomApp = {
    renderer,
    room,
    rig,
    pipeline,
    invalidate() {
      dirty = true;
    },
    resize() {
      pipeline.resize();
      rig.fit(pipeline.grid);
      dirty = true;
    },
    setNight(night) {
      room.setNight(night);
      /* A glow shows less in daylight. */
      pipeline.bloomPass.strength = night ? 0.6 : 0.25;
      dirty = true;
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('webglcontextrestored', app.invalidate);
      rig.dispose();
      pipeline.dispose();
      room.dispose();
      renderer.dispose();
    },
  };

  const observer = new ResizeObserver(() => app.resize());
  observer.observe(container);
  canvas.addEventListener('webglcontextrestored', app.invalidate);
  const hour = new Date().getHours();
  app.setNight(hour < 7 || hour >= 19);
  app.resize();

  const tick = () => {
    frame = requestAnimationFrame(tick);
    const moved = rig.controls.update();
    if (!moved && !dirty) return;
    dirty = false;
    renderer.info.reset();
    rig.renderAligned(pipeline.grid, () => pipeline.render());
  };
  tick();

  if (import.meta.env.DEV) (await import('./debug.ts')).setupDebug(app);
  return app;
}
