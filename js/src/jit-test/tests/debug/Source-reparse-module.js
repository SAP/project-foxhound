// reparsing modules should work.

const g = newGlobal({newCompartment: true});
const dbg = new Debugger;
const gw = dbg.addDebuggee(g);

const scripts = [];
dbg.onNewScript = script => scripts.push(script);

f = g.eval(`
  let m1 = registerModule('m1', parseModule(\`
          export var a = 1;
          export let b = 2;
          export default 3;
      \`));
  let m2 = registerModule('m2', parseModule(\`
          export * from "m1";
          export { a, b as c } from "m1";
          export { default } from "m1";
      \`));
  let m3 = registerModule('m3', parseModule(\`\`));
  let m4 = registerModule('m4', parseModule(\`
          import defaultExport, { a, b as c } from "m1";
          import * as name from "m2";
          import "m3";
      \`));
  moduleLink(m4);
`);

for (const script of scripts) {
  // Try to compile scripts either normally or as modules.
  try {
    script.source.reparse();
  } catch (e) {
    script.source.reparse(/* asModule */ true);
  }
}

// reparse module throws when line number == 0
g.libdir = libdir;
g.gw = gw;
g.eval(`
  load(libdir + "asserts.js");

  assertThrowsInstanceOf(() => gw.createSource({}).reparse(true), Error);
  assertThrowsInstanceOf(() => gw.createSource({ startLine: 0 }).reparse(true), Error);
`);
let script1 = gw.createSource({ startLine: 1 }).reparse(/* asModule */ true);
assertEq(script1.startLine, 1);
let script2 = gw.createSource({ startLine: 2 }).reparse(/* asModule */ true);
assertEq(script2.startLine, 2);

// reparse module throws when filename is null
g.scripts = scripts;
g.eval(`
  evaluate("var x = 1;", {fileName: null});
  assertThrowsInstanceOf(() => scripts.at(-1).source.reparse(/* asModule */ true), Error);
`);