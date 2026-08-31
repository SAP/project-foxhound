// |jit-test| skip-if: !wasmIsSupported() || !wasmThreadsEnabled()

/*
 * Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/licenses/publicdomain/
 */

// Serialize a shared WebAssembly.Memory object from a different compartment.

const opts = {SharedArrayBuffer: "allow", scope: "SameProcess"};

const g = newGlobal({newCompartment: true});
g.eval("var mem = new WebAssembly.Memory({initial: 1, maximum: 2, shared: true});");

// Don't crash.
const buf = serialize(g.mem, undefined, opts);

// Roundtrip preserves type and buffer properties.
const mem2 = deserialize(buf, opts);
assertEq(mem2 instanceof WebAssembly.Memory, true);
assertEq(mem2.buffer instanceof SharedArrayBuffer, true);
assertEq(mem2.buffer.byteLength, 65536);

// Backref: same object serialized twice must deserialize to the same identity.
const buf2 = serialize([g.mem, g.mem], undefined, opts);
const arr = deserialize(buf2, opts);
assertEq(arr[0] === arr[1], true);
