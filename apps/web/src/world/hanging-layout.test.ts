import { layoutHangingCards } from './hanging-layout';

describe('layoutHangingCards', () => {
  it('returns one slot per work and keeps every card inside the room', () => {
    const slots = layoutHangingCards(8);
    expect(slots).toHaveLength(8);
    for (const slot of slots) {
      expect(slot.x).toBeGreaterThanOrEqual(-8);
      expect(slot.x).toBeLessThanOrEqual(8);
      expect(slot.y).toBeGreaterThan(2);
      expect(slot.y).toBeLessThan(8);
      expect(slot.z).toBeLessThan(-3);
      expect(slot.z).toBeGreaterThan(-16);
    }
  });

  it('returns nothing for an empty hall', () => {
    expect(layoutHangingCards(0)).toEqual([]);
  });
});
