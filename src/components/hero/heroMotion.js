// Shared, render-free motion state for the landing hero, so the product window, the floating
// cards, the grid floor and the lazy 3D objects all move together.
// ProductWindow writes to it and calls notifyHeroMotion(); the 3D canvas subscribes and re-renders.

export const heroMotion = {
  /** Eased mouse position, -1 … 1 (0 when parallax is off). */
  mouse: { x: 0, y: 0 },
  /** Story time (s), a continuous clock that only advances while the story plays, and its derived values. */
  story: { t: 0, clock: 0, resting: false, state: null },
  /** Product window's on-screen box relative to the hero section (includes the tilt), in CSS px. */
  windowRect: null,
  /** Hero section size in CSS px. */
  heroSize: null,
};

const listeners = new Set();

export function subscribeHeroMotion(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyHeroMotion() {
  listeners.forEach((fn) => fn());
}
