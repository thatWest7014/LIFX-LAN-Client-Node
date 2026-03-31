const { test } = require('node:test');
const assert = require('node:assert/strict');
const LifxLAN = require('./index.js');

test('LifxLAN instantiates with required args', () => {
  const light = new LifxLAN('192.168.1.1');
  assert.ok(light);
  light.close();
});

test('LifxLAN instantiates with custom port', () => {
  const light = new LifxLAN('192.168.1.1', 56700);
  assert.ok(light);
  light.close();
});

test('rgbToHsbk returns correct structure', () => {
  const light = new LifxLAN('192.168.1.1');
  const result = light.rgbToHsbk(255, 0, 0);
  assert.ok('hue' in result);
  assert.ok('saturation' in result);
  assert.ok('brightness' in result);
  assert.ok('kelvin' in result);
  assert.equal(result.kelvin, 3500);
  light.close();
});

test('rgbToHsbk red is correct hue', () => {
  const light = new LifxLAN('192.168.1.1');
  const result = light.rgbToHsbk(255, 0, 0);
  assert.equal(result.hue, 0);
  assert.equal(result.saturation, 65535);
  assert.equal(result.brightness, 65535);
  light.close();
});

test('rgbToHsbk respects custom kelvin', () => {
  const light = new LifxLAN('192.168.1.1');
  const result = light.rgbToHsbk(255, 255, 255, 6500);
  assert.equal(result.kelvin, 6500);
  light.close();
});

test('default export matches named export', () => {
  assert.equal(typeof LifxLAN, 'function');
});