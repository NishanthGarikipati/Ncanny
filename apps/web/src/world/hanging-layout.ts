export interface HangSlot {
  x: number;
  y: number;
  z: number;
}

/**
 * Cards hang in the air in front of the avatar. Rows step back into the hall
 * so a full school board stays inside the room.
 */
export function layoutHangingCards(count: number): HangSlot[] {
  const columns = count > 6 ? 4 : Math.min(3, Math.max(count, 1));
  const gap = 3.8;
  const slots: HangSlot[] = [];
  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const inRow = Math.min(columns, count - row * columns);
    const span = (inRow - 1) * gap;
    slots.push({
      x: -span / 2 + column * gap,
      y: 2.15 + row * 1.6,
      z: -4.4 - row * 2.8,
    });
  }
  return slots;
}
