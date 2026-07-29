// |jit-test| test-also=--no-jit-backend;

let g = newGlobal({newCompartment: true});

g.eval(`
function* gen() {
  yield 1;
  for (var i = 0; i < 3; i++);
  return 2;
}
var it = gen();
`);

let dbg = new Debugger(g);

g.it.next();
dbg.collectCoverageInfo = true;
g.it.next();

let script = dbg.findScripts({global: g, displayName: "gen"})[0];
let coverage = script.getOffsetsCoverage();

assertEq(coverage !== null, true);
