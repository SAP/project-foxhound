// |jit-test| skip-if: getBuildConfiguration("release_or_beta"); --enable-import-bytes; --enable-arraybuffer-immutable

let buf = new ArrayBuffer(4);
let view = new Uint8Array(buf);
view[0] = 0x41;
view[1] = 0x42;
view[2] = 0x43;
view[3] = 0x44;

let immutable = new Uint8Array(buf.sliceToImmutable());

let m = parseModule(immutable, "bytes-module.js", "bytes");
let a = registerModule("bytes-module", m);

let importer = parseModule(`
    import uint8 from 'bytes-module' with { type: 'bytes' };
    globalThis.importedUint8 = uint8;
`);

let b = registerModule("importer", importer);

moduleLink(b);
moduleEvaluate(b);

assertEq(importedUint8 === immutable, true);
assertEq(importedUint8 instanceof Uint8Array, true);
assertEq(importedUint8.length, view.length);
assertEq(importedUint8.buffer.immutable, true);

for (let i = 0; i < view.length; i++) {
    assertEq(importedUint8[i], view[i]);
}

// Test dynamic import
let result = null;
let error = null;
let promise = import('./bytes-module.txt', { with: { type: 'bytes' } });
promise.then((ns) => {
    result = ns.default;
}).catch((e) => {
    error = e;
});

drainJobQueue();

assertEq(error, null);
assertEq(result instanceof Uint8Array, true);
assertEq(result.length, view.length);
assertEq(result.buffer.immutable, true);

for (let i = 0; i < view.length; i++) {
    assertEq(result[i], view[i]);
}
