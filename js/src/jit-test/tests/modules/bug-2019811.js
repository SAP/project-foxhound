// |jit-test| error:SyntaxError
var jsonModule = parseModule('{"a": 1}', "foo.json", "json");
registerModule("foo.json", jsonModule);

var middleModule = parseModule(
    'export * from "foo.json" with { type: "json" };',
    "middle.js",
    "js"
);
registerModule("middle.js", middleModule);

var topModule = parseModule(
    'import { nonexistent } from "middle.js";',
    "top.js",
    "js"
);
registerModule("top.js", topModule);
moduleLink(topModule);
