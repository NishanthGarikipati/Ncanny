export type WebGlSupport = 'webgl2' | 'webgl' | 'none';

/** One check, no scene. The hall is not downloaded when this returns `none`. */
export function detectWebGl(): WebGlSupport {
  if (typeof document === 'undefined') {
    return 'none';
  }
  const canvas = document.createElement('canvas');
  if (canvas.getContext('webgl2')) {
    return 'webgl2';
  }
  if (canvas.getContext('webgl')) {
    return 'webgl';
  }
  return 'none';
}
