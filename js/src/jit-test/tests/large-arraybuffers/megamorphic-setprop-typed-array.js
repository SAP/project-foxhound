// Test that the megamorphic SetProp/SetElem fastpath correctly handles typed
// arrays and objects with typed array prototypes.
function test() {
  var objs = [];
  for (var i = 0; i < 20; i++) {
    objs.push({["x" + i]: i});
  }
  var ta = new Int8Array(5 * 1024 * 1024 * 1024); // 5 GB
  objs.push(ta);
  objs.push(Object.create(ta));
  for (var i = 0; i < 1000; i++) {
    var obj = objs[i % objs.length];
    obj["4294967296"] = i % 27;
    assertEq(obj["4294967296"], i % 27);
  }
}
test();
