gczeal(2);

function test() {
  var subarray;
  for (var i = 0; i < 100; i++) {
    // Create TypedArray with inline elements.
    var arr = new Int32Array(2);

    // Load typed array elements.
    arr[0] = 1;

    // Move from TypedArray inline elements to ArrayBuffer elements.
    subarray = arr.subarray(1);

    // Must reload typed array elements, because |subarray| moves elements to
    // ArrayBuffer.
    arr[1] = 1;
  }
  return subarray;
}
test();

function test2() {
  var r = 0;
  for (var i = 0; i < 100; i++) {
    // Create TypedArray with inline elements.
    var arr = new Int32Array(3);

    // Load typed array elements.
    arr[0] = 1;

    // |subarray| call which can be scalar replaced.
    var s = arr.subarray(1)

    // Can optionally reload typed array elements.
    arr[1] = 1;

    // Move from TypedArray inline elements to ArrayBuffer elements.
    var subarray = s.subarray(0);

    // Must reload typed array elements, because |subarray| moves elements to
    // ArrayBuffer.
    arr[2] = 1;
  }
  return subarray
}
test2();
