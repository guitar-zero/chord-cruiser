import test from 'node:test';
import assert from 'node:assert/strict';
import { curvePoint, sampleCurve, pointAtDistance, wakeOpacity } from './cruiserMotion.js';

const curve = { from: { x: 10, y: 20 }, first: { x: 220, y: 20 }, second: { x: 10, y: 180 }, to: { x: 250, y: 180 } };

test('curve sampling preserves endpoints and ordered travel distances', () => {
  const samples = sampleCurve(curve);
  assert.deepEqual(curvePoint(curve, 0), curve.from);
  assert.deepEqual(curvePoint(curve, 1), curve.to);
  for (let i = 1; i < samples.length; i++) assert.ok(samples[i].distance > samples[i - 1].distance);
  assert.equal(pointAtDistance(samples, -10).x, curve.from.x);
  assert.equal(pointAtDistance(samples, Infinity).x, curve.to.x);
});

test('elapsed distance produces the same position regardless of frame cadence', () => {
  const samples = sampleCurve(curve);
  const positionAfter = deltas => pointAtDistance(samples, deltas.reduce((sum, delta) => sum + delta, 0) * .085);
  assert.deepEqual(positionAfter(Array(60).fill(16)), positionAfter([400, 320, 240]));
  const start = pointAtDistance(samples, 70), end = pointAtDistance(samples, 78.5);
  assert.ok(Math.abs(Math.hypot(end.x - start.x, end.y - start.y) - 8.5) < .1);
});

test('wake stays vivid then clears smoothly at ten seconds', () => {
  assert.equal(wakeOpacity(9000), 1);
  assert.equal(wakeOpacity(9600), 1);
  assert.equal(wakeOpacity(9800), .5);
  assert.equal(wakeOpacity(10000), 0);
  assert.equal(wakeOpacity(11000), 0);
});
