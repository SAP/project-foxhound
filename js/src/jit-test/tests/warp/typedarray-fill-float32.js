// Test float32 specialization for TypedArray.prototype.fill.

// Call fill() with a constant value.
function fillConstantFloat32() {
  var f32 = new Float32Array(1);
  for (var i = 0; i < 100; ++i) {
    f32.fill(0);
    assertEq(f32[0], 0);

    f32.fill(1);
    assertEq(f32[0], 1);

    f32.fill(1.0000079870224);
    assertEq(f32[0], 1.0000079870224);

    f32.fill(1.2);
    assertEq(f32[0], 1.2000000476837158);
  }
}
fillConstantFloat32();

// Call fill() with an input explicitly cast to float32.
function fillExplicitFloat32() {
  var f32 = new Float32Array(1);
  for (var i = 0; i < 100; ++i) {
    // Float32 specialization currently doesn't support phi-nodes, so we can't
    // directly use |i| below. Store |i| in a temporary array, but watch out for
    // array scalar replacement.
    var v = [i, i][i & 1];

    // This Math.sqrt call can be specialized to float32.
    var f = Math.sqrt(Math.fround(v));

    // Store |f| with an explicit cast to float32.
    f32.fill(Math.fround(f));

    assertEq(f32[0], Math.fround(f));
  }
}
fillExplicitFloat32();

// Call fill() with an input implicitly cast to float32.
function fillImplicitFloat32() {
  var f32 = new Float32Array(1);
  for (var i = 0; i < 100; ++i) {
    // Float32 specialization currently doesn't support phi-nodes, so we can't
    // directly use |i| below. Store |i| in a temporary array, but watch out for
    // array scalar replacement.
    var v = [i, i][i & 1];

    // This Math.sqrt call can be specialized to float32.
    var f = Math.sqrt(Math.fround(v));

    // Store |f| with an implicit cast to float32.
    f32.fill(f);

    assertEq(f32[0], Math.fround(f));
  }
}
fillImplicitFloat32();
