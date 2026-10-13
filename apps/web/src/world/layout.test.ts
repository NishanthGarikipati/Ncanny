import { layoutPanels } from './layout';

describe('layoutPanels', () => {
  it('uses both walls once there is more than one work', () => {
    const slots = layoutPanels(3);
    expect(slots).toHaveLength(3);
    expect(slots.filter((slot) => slot.z < 0).length).toBe(2);
    expect(slots.filter((slot) => slot.z > 0).length).toBe(1);
    expect(slots[0]?.x).toBe(-2);
    expect(slots[1]?.x).toBe(2);
  });

  it('returns nothing for an empty hall', () => {
    expect(layoutPanels(0)).toEqual([]);
  });
});
