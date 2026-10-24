// src/utils/zoomMath.js
// The math of pinch-to-zoom for the photo viewer. It does not use the screen, so it is easy to test.
// A "view" is { scale, tx, ty }: how much the photo is enlarged, and how far it is moved (in pixels) from the center of the screen.

export const MAX_SCALE = 5;        // the photo can be enlarged up to 5 times
export const PINCH_MIN = 0.7;      // while pinching in, it may go a little smaller than the screen, then it springs back
export const SNAP_BELOW = 1.05;    // when you let go below this, the photo goes back to its normal size
export const DOUBLE_TAP_SCALE = 2.5;

export const IDENTITY = { scale: 1, tx: 0, ty: 0 };
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const distance = (a, b) => Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
export const midpoint = (a, b) => ({ x: (a.pageX + b.pageX) / 2, y: (a.pageY + b.pageY) / 2 });

// Two fingers: the size follows the distance between them, and the spot of the photo that was between the fingers
// when they touched stays between them (so you zoom exactly where you pinch).
export function pinchView({ start, startMid, mid, startDist, dist, center }) {
  const scale = clamp(start.scale * (dist / startDist), PINCH_MIN, MAX_SCALE);
  const ratio = scale / start.scale;
  return {
    scale,
    tx: (mid.x - center.x) - (startMid.x - center.x - start.tx) * ratio,
    ty: (mid.y - center.y) - (startMid.y - center.y - start.ty) * ratio,
  };
}

// One finger on an enlarged photo: the photo moves with the finger.
export function panView({ start, startPoint, point }) {
  return { scale: start.scale, tx: start.tx + (point.x - startPoint.x), ty: start.ty + (point.y - startPoint.y) };
}

// The photo cannot be pulled away from the screen: its edges stop at the edges of the screen.
// (viewW and viewH are the screen, and boxH is the height that the photo has at its normal size.)
export function limitView(view, { viewW, viewH, boxH }) {
  if (view.scale <= 1) return { scale: view.scale, tx: 0, ty: 0 };
  const maxX = Math.max(0, (viewW * view.scale - viewW) / 2);
  const maxY = Math.max(0, (boxH * view.scale - viewH) / 2);
  return { scale: view.scale, tx: clamp(view.tx, -maxX, maxX), ty: clamp(view.ty, -maxY, maxY) };
}

// Double-tap: zoom in on the spot that was tapped, or go back to the normal size if it is already enlarged.
export function doubleTapView({ view, point, center }) {
  if (view.scale > SNAP_BELOW) return IDENTITY;
  return { scale: DOUBLE_TAP_SCALE, tx: (point.x - center.x) * (1 - DOUBLE_TAP_SCALE), ty: (point.y - center.y) * (1 - DOUBLE_TAP_SCALE) };
}

// When the fingers are lifted: too small goes back to normal, and the edges are kept inside the screen.
export function settleView(view, dims) {
  return view.scale < SNAP_BELOW ? IDENTITY : limitView(view, dims);
}