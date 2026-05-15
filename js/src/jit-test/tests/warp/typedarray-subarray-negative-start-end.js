// Test TypedArray.prototype.subarray is called with negative |start| and |end| arguments.

function negativeStart() {
  var ta = new Int8Array(10);
  for (var i = 0; i < 100; ++i) {
    var start = -((i & 3) + 1);
    var r = ta.subarray(start);
    assertEq(r.length, ta.length - (ta.length + start));
  }
}
negativeStart();

function negativeEnd() {
  var ta = new Int8Array(10);
  for (var i = 0; i < 100; ++i) {
    var end = -((i & 3) + 1);
    var r = ta.subarray(0, end);
    assertEq(r.length, (ta.length + end));
  }
}
negativeEnd();
