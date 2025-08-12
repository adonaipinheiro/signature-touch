import { pointsToPath } from '../Signature';

type Point = { x: number; y: number };

describe('pointsToPath', () => {
  it('retorna vazio sem pontos', () => {
    expect(pointsToPath([])).toBe('');
  });

  it('gera “pixel” com 1 ponto', () => {
    const p: Point = { x: 10, y: 20 };
    const d = pointsToPath([p]);
    expect(d).toMatch(/^M 10 20 L 10\.01 20\.01$/);
  });

  it('gera curvas e segmento final', () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
      { x: 30, y: 10 },
    ];
    const d = pointsToPath(pts);
    expect(d.startsWith('M 0 0')).toBe(true);
    expect(d).toContain('Q 10 0');
    expect(d).toMatch(/ L 30 10$/);
  });
});
