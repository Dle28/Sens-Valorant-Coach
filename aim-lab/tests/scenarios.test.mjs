import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SCENARIO_SELECTION,
  MAP_ORDER,
  RECOMMENDED_SCENARIOS,
  SCENARIO_MAPS,
  recommendedScenario,
  resolveScenarioSelection,
} from '../src/scenarios.js';

test('scenario catalog exposes only Lotus and Dark Range with complete micro-zones', () => {
  assert.deepEqual(MAP_ORDER, ['lotus', 'dark']);
  assert.equal(SCENARIO_MAPS.lotus.name, 'Lotus');
  assert.equal(SCENARIO_MAPS.dark.name, 'Dark Range');
  for (const mapId of MAP_ORDER) {
    const map = SCENARIO_MAPS[mapId];
    assert.ok(Object.isFrozen(map));
    assert.equal(map.zones.length, 3);
    for (const zone of map.zones) {
      assert.equal(zone.scenarios.length, 2);
      for (const scenario of zone.scenarios) {
        assert.ok(scenario.skills.length >= 3);
        assert.equal(scenario.angles.length, 2);
      }
    }
  }
});

test('scenario selection repairs dependent map, zone, scenario, and angle ids', () => {
  const fallback = resolveScenarioSelection({ mapId: 'removed-map', zoneId: 'missing', scenarioId: 'missing', angleId: 'missing' });
  assert.deepEqual(
    { mapId: fallback.mapId, zoneId: fallback.zoneId, scenarioId: fallback.scenarioId, angleId: fallback.angleId },
    DEFAULT_SCENARIO_SELECTION,
  );
  const dark = resolveScenarioSelection({ mapId: 'dark', zoneId: 'core-lane', scenarioId: 'core-track', angleId: 'exit-ramp' });
  assert.equal(dark.map.name, 'Dark Range');
  assert.equal(dark.scenario.title, 'Core track');
  assert.equal(dark.angle.title, 'Exit ramp');
  assert.ok(Object.isFrozen(dark));
});

test('recommendations are catalog-backed routes and unknown skills use the default', () => {
  for (const [skill, route] of Object.entries(RECOMMENDED_SCENARIOS)) {
    const selection = recommendedScenario(skill);
    assert.equal(selection.mapId, route.mapId);
    assert.equal(selection.zoneId, route.zoneId);
    assert.equal(selection.scenarioId, route.scenarioId);
    assert.equal(selection.angleId, route.angleId);
  }
  const unknown = recommendedScenario('missing-skill');
  assert.equal(unknown.skill, 'default');
  assert.equal(unknown.scenarioId, DEFAULT_SCENARIO_SELECTION.scenarioId);
});
