var g = newGlobal({newCompartment: true});

var sab = new SharedArrayBuffer(64);
g.sab = sab;

var ta = new Int32Array(sab);
g.evaluate("var ta = new Int32Array(sab);");

let result = undefined;
Atomics.waitAsync(ta, 0, 0, 5000).value
  .then((v) => { result = v; })
g.evaluate("Atomics.notify(ta, 0);");
drainJobQueue();
assertEq(result, "ok");

g.evaluate(`
let result = undefined;
Atomics.waitAsync(ta, 0, 0, 5000).value
  .then((v) => { result = v; })
`);
Atomics.notify(ta, 0);
g.evaluate(`
drainJobQueue();
assertEq(result, "ok");
`);
