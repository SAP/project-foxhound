// Create and register a JSON module.
const jsonMod = parseModule('{"key": "value"}', "data.json", "json");
registerModule('jsonmod', jsonMod);

// Create a module that namespace-imports the JSON module and re-exports it.
const reexporter = parseModule(`
  import * as ns from "jsonmod" with { type: "json" };
  export { ns };
`);
registerModule("reexporter", reexporter);

// Create a consumer module that imports the re-exported namespace.
const entry = parseModule(`
  import { ns } from "reexporter";
  assertEq(ns.default.key, "value");
`);
registerModule("entry", entry);

// Trigger linking and evaluation via dynamic import.
import("entry");
drainJobQueue();
