export interface PanelSlot {
  x: number;
  y: number;
  z: number;
  rotationY: number;
}

/**
 * Places works on the two long walls. The first half faces the camera (negative
 * Z); the rest is on the wall behind the entrance. A short row is centred.
 */
export function layoutPanels(count: number): PanelSlot[] {
  const slots: PanelSlot[] = [];
  const onFront = Math.ceil(count / 2);

  for (let index = 0; index < count; index += 1) {
    const front = index < onFront;
    const along = front ? index : index - onFront;
    const column = along % 4;
    const row = Math.floor(along / 4);
    const onThisWall = front ? onFront : count - onFront;
    const used = Math.min(onThisWall - row * 4, 4);
    const origin = -((used - 1) * 4) / 2;
    slots.push({
      x: origin + column * 4,
      y: 1.8 + row * 2.3,
      z: front ? -8.7 : 8.7,
      rotationY: front ? 0 : Math.PI,
    });
  }

  return slots;
}
