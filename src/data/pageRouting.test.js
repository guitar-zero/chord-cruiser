import test from 'node:test';
import assert from 'node:assert/strict';
import { currentPage, pageHref } from './pageRouting.js';
import { pointAlongRoute, routeSampler } from './motion.js';

test('Navigation works at the site root and beneath a GitHub Pages repository', () => {
  assert.equal(pageHref('tabs'), '/#/tabs');
  assert.equal(pageHref('chords', '/shell-chord-app/'), '/shell-chord-app/#/');
  assert.equal(pageHref('tabs', '/shell-chord-app'), '/shell-chord-app/#/tabs');
  assert.equal(currentPage({ pathname: '/shell-chord-app/', hash: '#/tabs' }, '/shell-chord-app/'), 'tabs');
  assert.equal(currentPage({ pathname: '/shell-chord-app/', hash: '#/' }, '/shell-chord-app/'), 'chords');
  assert.equal(currentPage({ pathname: '/tabs', hash: '' }), 'tabs');
  assert.equal(currentPage({ pathname: '/shell-chord-app/tabs/', hash: '' }, '/shell-chord-app/'), 'tabs');
});

test('Cached motion sampler preserves bends, distances, and interrupted route positions', () => {
  const route = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }];
  const sample = routeSampler(route);
  for (const progress of [-.5, 0, .25, .5, .75, 1, 1.5]) assert.deepEqual(sample(progress), pointAlongRoute(route, progress));
  assert.deepEqual(sample(.25), { x: 0, y: 50 });
  assert.deepEqual(sample(.75), { x: 50, y: 100 });
  assert.deepEqual(routeSampler([{ x: 20, y: 30 }])(.5), { x: 20, y: 30 });
});
