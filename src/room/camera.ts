/*
  The camera of the room: orthographic, near-isometric, held inside limits by
  OrbitControls. The controls own the true pose. Each frame is drawn from a
  pose aligned to the pixel grid (angles and zoom in steps, frustum shifted by
  the fraction of a pixel), then the true pose is restored: static geometry
  does not shimmer while the camera pans or settles.
*/
import { MathUtils, OrthographicCamera, Quaternion, Spherical, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clearOf, fitHalfHeight, pixelFraction, snap, type Cover, type Framing, type Grid } from './view.ts';

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
/** Close enough to read the whiteboard and to see a figurine in detail. */
const MAX_ZOOM = 8;
/** How far the view can leave the centre of the room, in metres: little while the whole room shows, to any corner from zoom 4. */
const PAN_RADIUS = { wide: 2.5, close: 4 };
/** Empty space kept around the room at zoom 1. */
const MARGIN = 1.08;
/** Distance from the target. It changes nothing on screen: it only places the depth range. */
const DISTANCE = 20;

/** Where the camera is: the point it looks at, in metres, its angles in the units of DEFAULT_VIEW, and its zoom. */
export interface Pose {
  target: [number, number, number];
  azimuth: number;
  elevation: number;
  zoom: number;
}

export interface Rig {
  readonly camera: OrthographicCamera;
  readonly controls: OrbitControls;
  /** Rendering steps: degrees of rotation, zoom increment. 0 disables one. */
  rotationStep: number;
  zoomStep: number;
  /** Metres of depth kept in front of and behind the target. Sets the scale of the depth outlines. */
  setDepthRange(front: number, back: number): void;
  /** Whether the camera stands behind the room, looking at the two walls that the opening view leaves out. */
  readonly behind: boolean;
  /** Where the camera stands around the room, in radians from +z towards +x. */
  azimuth(): number;
  /** Carry the camera half a turn round the room: `t` goes from 0 to 1. At 1 it is held on its new side. */
  around(t: number): void;
  /** How far such a turn has come, in radians. 0 outside one. */
  readonly turned: number;
  /** The true pose of the camera. */
  pose(): Pose;
  /** Put the camera somewhere, whatever the limits of the view. */
  place(pose: Pose): void;
  /** Hold the camera where it was put: the visitor cannot move it until it is let go. */
  hold(held: boolean): void;
  /**
   * The pose that shows a point of the room as `view` says, in the middle of
   * what a panel leaves free: `cover` is what the panel takes of the right
   * side and of the foot of the viewport, and the bar of buttons of its top.
   */
  frame(view: Framing, cover: Cover, grid: Grid): Pose;
  /** Let the controls move the camera: what is left of a drag, the limits of the view. Nothing while it is held. */
  update(): void;
  /** Fit the room in a viewport with the aspect ratio of the pixel grid. Returns the size of a pixel in the room at zoom 1, in metres. */
  fit(grid: Grid): number;
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
  controls.zoomToCursor = true; // the wheel zooms on what is under the pointer
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.6;
  /* The camera is held on one side of the room: in front of it as the page opens, or behind it. */
  let behind = false;
  const hold = () => {
    const middle = DEFAULT_VIEW.azimuth + (behind ? 180 : 0);
    controls.minAzimuthAngle = MathUtils.degToRad(middle - AZIMUTH_RANGE);
    controls.maxAzimuthAngle = MathUtils.degToRad(middle + AZIMUTH_RANGE);
  };
  hold();
  /** The azimuth a turn round the room started from, while it lasts. */
  let turnedFrom: number | null = null;
  let turned = 0;
  let held = false;
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
    /* Fine steps: the picture holds still as a drag dies down, and the camera never looks as if it skipped frames. */
    rotationStep: 0.25,
    zoomStep: 0.01,
    get behind() {
      return behind;
    },
    get turned() {
      return turned;
    },
    azimuth() {
      return Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
    },
    around(t) {
      spherical.setFromVector3(offset.copy(camera.position).sub(controls.target));
      if (turnedFrom === null) {
        /* Nothing holds the camera during the turn, and a drag would fight it. */
        turnedFrom = spherical.theta;
        controls.minAzimuthAngle = -Infinity;
        controls.maxAzimuthAngle = Infinity;
        controls.enabled = false;
      }
      turned = Math.PI * t;
      spherical.theta = turnedFrom + turned;
      camera.position.setFromSpherical(spherical).add(controls.target);
      camera.lookAt(controls.target);
      if (t < 1) return;
      turnedFrom = null;
      turned = 0;
      behind = !behind;
      hold();
      controls.enabled = true;
    },
    pose() {
      spherical.setFromVector3(offset.copy(camera.position).sub(controls.target));
      return {
        target: controls.target.toArray(),
        azimuth: MathUtils.radToDeg(spherical.theta),
        elevation: 90 - MathUtils.radToDeg(spherical.phi),
        zoom: camera.zoom,
      };
    },
    place({ target, azimuth, elevation, zoom }) {
      controls.target.fromArray(target);
      spherical.set(DISTANCE, MathUtils.degToRad(90 - elevation), MathUtils.degToRad(azimuth));
      camera.position.setFromSpherical(spherical).add(controls.target);
      camera.lookAt(controls.target);
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    },
    hold(value) {
      held = value;
      controls.enabled = !value;
    },
    frame({ target, across, ...view }, cover, grid) {
      const { azimuth, elevation } = { ...DEFAULT_VIEW, ...view };
      const zoom = across ? (2 * halfWidth) / across : (view.zoom ?? 1);
      const unit = (2 * halfHeight) / zoom / grid.cssHeight; // a CSS pixel, in metres of the room
      const shift = clearOf(cover, unit, MathUtils.degToRad(azimuth), MathUtils.degToRad(elevation));
      return { target: [target[0] + shift[0], target[1] + shift[1], target[2] + shift[2]], azimuth, elevation, zoom };
    },
    update() {
      if (held) return; // the controls would pull the camera back inside their limits
      /* Zooming out brings the room back to the middle. */
      const close = MathUtils.clamp((camera.zoom - 1) / 3, 0, 1);
      controls.maxTargetRadius = MathUtils.lerp(PAN_RADIUS.wide, PAN_RADIUS.close, close);
      controls.update();
    },
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
      return (2 * halfHeight) / grid.rows;
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
