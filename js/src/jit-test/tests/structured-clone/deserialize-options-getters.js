function testGetter1() {
  let s1 = serialize(new SharedArrayBuffer(8), undefined, {SharedArrayBuffer: "allow"});
  let s2 = serialize([]);
  let evilOpts = {
    get SharedArrayBuffer() {
      s2.clonebuffer = s1.arraybuffer;
      return "allow";
    }
  };
  let ex = null;
  try {
    deserialize(s2, evilOpts);
  } catch (e) {
    ex = e;
  }
  assertEq(ex.toString().includes("cannot allow shared memory"), true);
}
testGetter1();

function testGetter2() {
  let serialized = serialize([1, 2, 3]);
  let evilOpts = {
    get scope() {
      serialized.clonebuffer = new ArrayBuffer(serialized.clonebuffer.length);
      return "SameProcess";
    }
  };
  let ex = null;
  try {
    deserialize(serialized, evilOpts);
  } catch (e) {
    ex = e;
  }
  assertEq(ex.toString().includes("Cannot use less restrictive scope"), true);
}
testGetter2();
