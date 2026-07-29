// |jit-test| skip-if: !wasmDebuggingEnabled() || !getBuildConfiguration("source-phase-imports") || !wasmIsSupported() || getBuildConfiguration("release_or_beta"); --enable-source-phase-imports; --enable-wasm-esm-integration

load(libdir + "asserts.js");

var g = newGlobal({newCompartment: true});
var dbg = new Debugger(g);

var wasmScripts = [];
dbg.onNewScript = (s) => {
  if (s.format === "wasm") {
    wasmScripts.push(s);
  }
};

var m = g.parseModule(`
  import source emptyMod from "empty.wasm";
  globalThis.emptyMod = emptyMod;
`);
moduleLink(m);
moduleEvaluate(m);
drainJobQueue();

// A source-phase import alone does not make the wasm module visible to the debugger.
assertEq(wasmScripts.length, 0);

var sources = dbg.findSources();
assertEq(sources.length, 1);
for (var source of sources) {
  source.text;
  source.url;
  source.startLine;
  source.startColumn;
  source.id;
  source.displayURL;
  source.introductionScript;
  source.introductionOffset;
  source.introductionType;
  source.elementAttributeName;
  source.sourceMapURL;
}

// Instantiating the module makes it visible.
g.eval("new WebAssembly.Instance(emptyMod);");

assertEq(wasmScripts.length, 1);
var emptyScript = wasmScripts[0];

var foundEmpty = dbg.findScripts({ source: emptyScript.source });
assertEq(foundEmpty.length, 1);
assertEq(foundEmpty[0], emptyScript);

assertThrowsInstanceOf(() => emptyScript.source.reparse(), TypeError);

var src = emptyScript.source;
assertEq(src.startLine, 0);
assertEq(src.startColumn, 1);
assertEq(src.id, 0);
assertEq(src.displayURL, null);
assertEq(src.introductionOffset, undefined);
assertEq(src.introductionType, "wasm");
assertEq(src.elementAttributeName, undefined);
assertEq(src.sourceMapURL, null);

var sources = dbg.findSources();
for (var source of sources) {
  source.text;
  source.url;
  source.startLine;
  source.startColumn;
  source.id;
  source.displayURL;
  source.introductionScript;
  source.introductionOffset;
  source.introductionType;
  source.elementAttributeName;
  source.sourceMapURL;
}

