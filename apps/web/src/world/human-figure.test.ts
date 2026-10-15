import { createHumanFigure } from './human-figure';

describe('createHumanFigure', () => {
  it('swings a leg while walking and holds still when motion is reduced', () => {
    const figure = createHumanFigure({ cloth: 0x3ec8e8, hair: 0x2a211c, phase: 0 });
    figure.setMoving(true);
    figure.update(Math.PI / 16, false);
    expect(Math.abs(thighAngle(figure.root))).toBeGreaterThan(0.2);

    figure.update(0.4, true);
    expect(Math.abs(thighAngle(figure.root))).toBeLessThan(0.05);
  });

  it('raises one arm while greeting', () => {
    const figure = createHumanFigure({ cloth: 0xf472b6, hair: 0x3b2418, phase: 1 });
    figure.setGreeting(true);
    figure.update(1, false);
    const arm = figure.root.getObjectByName('arm-r');
    expect(arm?.children[0]?.rotation.x).toBeLessThan(-1);
  });
});

function thighAngle(root: { getObjectByName: (name: string) => { children: { rotation: { x: number } }[] } | undefined }): number {
  return root.getObjectByName('leg-l')?.children[0]?.rotation.x ?? 0;
}
