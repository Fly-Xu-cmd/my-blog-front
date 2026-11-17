import { describe, expect, it } from 'vitest';
import { SkyMotion, ambientDrift } from '@/components/sky/sky-motion';

const magnitude = (point: [number, number]) => Math.hypot(...point);
const run = (field: SkyMotion, seconds: number, fps = 60) => {
  for (let i = 0; i < Math.round(seconds * fps); i++) field.advance(1 / fps);
};

describe('sky currents', () => {
  it('lets a second position respond immediately without clearing the first current', () => {
    const field = new SkyMotion(1280, 900);
    field.kick(250, 450);
    run(field, 0.4);
    const first = field.sample(0.32, 0.5);
    expect(magnitude(first)).toBeGreaterThan(25);
    field.kick(1000, 450);
    expect(field.sample(0.32, 0.5)).toEqual(first);
    run(field, 0.2);
    expect(magnitude(field.sample(0.32, 0.5))).toBeGreaterThan(20);
    expect(magnitude(field.sample(0.85, 0.5))).toBeGreaterThan(15);
  });

  it('covers distant gas and settles continuously without a timed reset', () => {
    const field = new SkyMotion(1280, 900);
    field.kick(640, 450);
    run(field, 0.6);
    expect(magnitude(field.sample(0.9, 0.5))).toBeGreaterThan(25);
    let previous = field.sample(0.9, 0.5);
    for (let i = 0; i < 600; i++) {
      field.advance(1 / 60);
      const current = field.sample(0.9, 0.5);
      expect(magnitude([current[0] - previous[0], current[1] - previous[1]])).toBeLessThan(3);
      previous = current;
    }
    expect(field.energy).toBeLessThan(0.12);
  });

  it('stays stable across frame rates, resize, repeated kicks and suspended frames', () => {
    const slow = new SkyMotion(1280, 900), fast = new SkyMotion(1280, 900);
    slow.kick(600, 450); fast.kick(600, 450);
    run(slow, 1, 30); run(fast, 1, 60);
    expect(magnitude(slow.sample(0.7, 0.6))).toBeCloseTo(magnitude(fast.sample(0.7, 0.6)), 3);
    const before = fast.sample(0.7, 0.6);
    fast.resize(390, 844);
    expect(magnitude([fast.sample(0.7, 0.6)[0] - before[0], fast.sample(0.7, 0.6)[1] - before[1]])).toBeLessThan(1);
    for (let i = 0; i < 100; i++) fast.kick(100 + i, 400);
    run(fast, 0.6);
    expect(fast.sample(0.8, 0.5).every(Number.isFinite)).toBe(true);
    expect(Math.abs(fast.sample(0.8, 0.5)[0])).toBeLessThan(360);
    fast.advance(30);
    expect(fast.energy).toBeLessThan(0.001);
  });

  it('carries different cloud layers along continuous curved paths', () => {
    expect(ambientDrift(0, 0)).toEqual([0, 0]);
    expect(magnitude(ambientDrift(12, 0))).toBeGreaterThan(35);
    expect(ambientDrift(12, 0)).not.toEqual(ambientDrift(12, 1.5));
    const first = ambientDrift(12, 1), second = ambientDrift(12.016, 1);
    expect(magnitude([first[0] - second[0], first[1] - second[1]])).toBeLessThan(0.1);
  });
});
