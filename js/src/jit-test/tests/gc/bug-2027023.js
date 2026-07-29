let g = newGlobal({newCompartment: true});
let key = Symbol();
g.eval("var map = new WeakMap;");
g.map.set(key, 1);
gc(g);
assertEq(g.map.has(key), true);
