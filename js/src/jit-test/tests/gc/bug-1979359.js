// |jit-test| --enable-symbols-as-weakmap-keys
gcslice(0);
newGlobal({newCompartment: true});
var key = Symbol('foo');
var map = new WeakMap();
map.set(key, 2);
gcslice(0);
var key = Symbol('bar');
map.set(key, 2);
