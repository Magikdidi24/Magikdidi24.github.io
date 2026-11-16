/*
  The camera of the room: orthographic, near-isometric, held inside limits by
  OrbitControls. The controls own the true pose. Each frame is drawn from a
  pose aligned to the pixel grid (angles and zoom in steps, frustum shifted by
  the fraction of a pixel), then the true pose is restored: static geometry
  does not shimmer while the camera pans or settles.
*/
import { MathUtils, OrthographicCamera, Quaternion, Spherical, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { fitHalfHeight, pixelFraction, snap, type Grid } from './view.ts';

export interface Box {
  w: number;
  h: number;
  d: number;
}

/** Azimuth from +z towards +x, elevation above the floor, in degrees. At 30° of elevation floor edges step 2:1. */
export const DEFAULT_VIEW = { azimuth: 45, elevation: 30 } as const;

const AZIMUTH_RANGE = 30;
const ELEVATION_MIN = 20;
const ELEVATION_MAX = 45;
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 4;
/** How far the view can be panned from the centre of the room, in metres. */
const PAN_RADIUS = 2.5;
/** Empty space kept around the room at zoom 1. */
const MARGIN = 1.08;
/** Distance from the target. It changes nothing on screen: it only places the depth range. */
const DISTANCE = 20;

export interface Rig {
  readonly camera: OrthographicCamera;
  readonly controls: OrbitControls;
  /** Rendering steps: degrees of rotation, zoom increment. 0 disables one. */
  rotationStep: number;
  zoomStep: number;
  /** Metres of depth kept in front of and behind the target. Sets the scale of the depth outlines. */
  setDepthRange(front: number, back: number): void;
  /** Fit the room in a viewport with the aspect ratio of the pixel grid. */
  fit(grid: Grid): void;
  /** Draw from the pose aligned to the grid, then restore the true pose. */
  renderAligned(grid: Grid, draw: () => void): void;
  /** The true view, in the units of DEFAULT_VIEW. */
  view(): { target: [number, number, number]; azimuth: number; elevation: number; zoom: number };
  dispose(): void;
}

export function createRig(room: Box, domElement: HTMLElement): Rig {
  const center = new Vector3(room.w / 2, room.h / 2, room.d / 2);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 1, 2);
  const spherical = new Spherical(
    DISTANCE,
    MathUtils.degToRad(90 - DEFAULT_VIEW.elevation),
    MathUtils.degToRad(DEFAULT_VIEW.azimuth),
  );
  camera.position.setFromSpherical(spherical).add(center);
  camera.lookAt(center);

  const controls = new OrbitControls(camera, domElement);
  controls.target.copy(center);
  controls.cursor.copy(center);
  controls.maxTargetRadius = PAN_RADIUS;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.6;
  controls.minAzimuthAngle = MathUtils.degToRad(DEFAULT_VIEW.azimuth - AZIMUTH_RANGE);
  controls.maxAzimuthAngle = MathUtils.degToRad(DEFAULT_VIEW.azimuth + AZIMUTH_RANGE);
  controls.minPolarAngle = MathUtils.degToRad(90 - ELEVATION_MAX);
  controls.maxPolarAngle = MathUtils.degToRad(90 - ELEVATION_MIN);
  controls.minZoom = MIN_ZOOM;
  controls.maxZoom = MAX_ZOOM;
  controls.update();

  /* Frustum bounds at zoom 1, before the per-frame shift. */
  let halfWidth = 1;
  let halfHeight = 1;

  const truePosition = new Vector3();
  const trueQuaternion = new Quaternion();
  const offset = new Vector3();
  const right = new Vector3();
  const up = new Vector3();

  const rig: Rig = {
    camera,
    controls,
    rotationStep: 1,
    zoomStep: 0.05,
    setDepthRange(front, back) {
      camera.near = DISTANCE - front;
      camera.far = DISTANCE + back;
      camera.updateProjectionMatrix();
    },
    fit(grid) {
      const aspect = grid.cols / grid.rows;
      halfHeight =
        fitHalfHeight(
          room,
          MathUtils.degToRad(DEFAULT_VIEW.azimuth),
          MathUtils.degToRad(DEFAULT_VIEW.elevation),
          aspect,
        ) * MARGIN;
      halfWidth = halfHeight * aspect;
      camera.left = -halfWidth;
      camera.right = halfWidth;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
    },
    renderAligned(grid, draw) {
      const trueZoom = camera.zoom;
      truePosition.copy(camera.position);
      trueQuaternion.copy(camera.quaternion);

      /* Angles and zoom in steps. */
      const step = MathUtils.degToRad(rig.rotationStep);
      spherical.setFromVector3(offset.copy(camera.position).sub(controls.target));
      spherical.theta = snap(spherical.theta, step);
      spherical.phi = snap(spherical.phi, step);
      camera.position.setFromSpherical(spherical).add(controls.target);
      camera.lookAt(controls.target);
      camera.zoom = Math.max(snap(trueZoom, rig.zoomStep), rig.zoomStep);

      /* Shift the frustum so the camera sits on a line of the pixel grid. */
      const pixelWidth = (2 * halfWidth) / camera.zoom / grid.cols;
      const pixelHeight = (2 * halfHeight) / camera.zoom / grid.rows;
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      const dx = pixelFraction(camera.position.dot(right), pixelWidth) * pixelWidth;
      const dy = pixelFraction(camera.position.dot(up), pixelHeight) * pixelHeight;
      camera.left = -halfWidth - dx;
      camera.right = halfWidth - dx;
      camera.top = halfHeight - dy;
      camera.bottom = -halfHeight - dy;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();

      draw();

      camera.position.copy(truePosition);
      camera.quaternion.copy(trueQuaternion);
      camera.zoom = trueZoom;
      camera.updateMatrixWorld();
    },
    view() {
      spherical.setFromVector3(offset.copy(camera.position).sub(controls.target));
      return {
        target: controls.target.toArray().map((v) => Math.round(v * 1000) / 1000) as [number, number, number],
        azimuth: Math.round(MathUtils.radToDeg(spherical.theta) * 10) / 10,
        elevation: Math.round((90 - MathUtils.radToDeg(spherical.phi)) * 10) / 10,
        zoom: Math.round(camera.zoom * 100) / 100,
      };
    },
    dispose() {
      controls.dispose();
    },
  };
  rig.setDepthRange(5, 7);
  return rig;
}
