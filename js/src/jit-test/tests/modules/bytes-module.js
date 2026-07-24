let buf = new ArrayBuffer(4);
let view = new Uint8Array(buf);
view[0] = 0x41;
view[1] = 0x42;
view[2] = 0x43;
view[3] = 0x44;

let m = parseModule(buf, "bytes-module.js", "bytes");
let a = registerModule("bytes-module", m);

let importer = parseModule(`
    import buf from 'bytes-module' with { type: 'bytes' };
    globalThis.importedBuf = buf;
`);

let b = registerModule("importer", importer);

moduleLink(b);
moduleEvaluate(b);

let importedView = new Uint8Array(globalThis.importedBuf);

for (let i = 0; i < view.length; i++) {
    assertEq(importedView[i], view[i]);
}
