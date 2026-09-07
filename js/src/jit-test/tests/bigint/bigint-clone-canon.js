function str(u32a) {
    return [].map.call(u32a, n => n.toString(16).padStart(8, 0)).join(",");
}

function test() {
    const n = 0xfeeddeadbeef2dadfeeddeadbeef2dadfeeddeadbeef2dadfeeddeadbeef2dadn;
    const s = serialize(n, [], {scope: 'DifferentProcess'});
    assertEq(deserialize(s), n);
    print(deserialize(s));
    const synthetic = new Uint32Array(s.arraybuffer.byteLength / 4 + 2);
    synthetic.set(new Uint32Array(s.arraybuffer)); // Copy the clone buffer data into the beginning.
    print(synthetic[2]);
    // Add 2 32-bit words to the BigInt length. Unfortunately, the size stored in a BigInt header
    // counts native words.
    synthetic[2] += 2 * 4 / getBuildConfiguration('pointer-byte-size');
    // End elements will have been initialized to zero already.
    s.clonebuffer = synthetic.buffer;
    assertEq(deserialize(s), n);

    print("Example buffers:")
    print(str(new Uint32Array(s.arraybuffer)));
    print(str(new Uint32Array(serialize(0xfeeddeadbeef2dadfeeddeadbeef2dadn).arraybuffer)));
    print(str(new Uint32Array(serialize(0xfeeddeadbeef2dadn).arraybuffer)));
}

test();
