import test from 'node:test';
import assert from 'node:assert/strict';
import { curvePoint, sampleCurve, pointAtDistance, wakeOpacity, restingSpot, routesOverlap } from './cruiserMotion.js';

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


test('resting boats separate without moving an already clear boat', () => {
  const ship = { x: 240, y: 160, rx: 100, ry: 65 };
  const first = { x: 40, y: 60 };
  assert.equal(restingSpot(first, [], ship), first);
  const second = restingSpot({ x: 45, y: 65 }, [first], ship);
  assert.ok(((second.x - first.x) / 62) ** 2 + ((second.y - first.y) / 52) ** 2 >= 1);
  assert.ok(((second.x - ship.x) / 122) ** 2 + ((second.y - ship.y) / 87) ** 2 >= 1);
  const third = restingSpot({ x: 240, y: 160 }, [first, second], ship);
  assert.ok(((third.x - ship.x) / 122) ** 2 + ((third.y - ship.y) / 87) ** 2 >= 1);
  for (const other of [first, second]) {
    assert.ok(((third.x - other.x) / 62) ** 2 + ((third.y - other.y) / 52) ** 2 >= 1);
  }
});


test('boat routes reserve clearance while allowing distant curves', () => {
  const route = sampleCurve(curve);
  assert.equal(routesOverlap(route, route), true);
  assert.equal(routesOverlap(route, route.map(point => ({ ...point, y: point.y + 20 }))), true);
  assert.equal(routesOverlap(route, route.map(point => ({ ...point, y: point.y + 300 }))), false);
});
