// |jit-test| --enable-arraybuffer-immutable; skip-if: !ArrayBuffer.prototype.transferToImmutable

var ab = new ArrayBuffer(100, {maxByteLength: 200});

var result = ab.sliceToImmutable(80, {
  valueOf: function() {
    ab.resize(60);
    return 50;
  }
});

assertEq(result.byteLength, 0);
