// Create a JSON module.
var jsonMod = parseModule('{"key": "value"}', 'jsonmod', 'json');
registerModule('jsonmod', jsonMod);

// Create a module that re-exports the JSON module's namespace.
var reexporter = parseModule(`
  import * as ns from 'jsonmod' with { type: 'json' };
  export { ns };
`);
registerModule('reexporter', reexporter);

// Consumer that triggers namespace creation for the JSON module.
var consumer = parseModule(`
  import { ns } from 'reexporter';
  assertEq(ns.default.key, "value");
`);

moduleLink(consumer);
moduleEvaluate(consumer);
