// Test Float32 specialization for TypedArray.prototype.subarray.

// Don't allow Ion compilation of the outer script to ensure the functions
// aren't inlined.
//
// This is necessary because Float32 specialization doesn't currently support
// phi-nodes.
with ({});

function float32(i) {
  var ta = new Float32Array(10).subarray(1);

  // Explicitly call Math.fround to trigger Float32 specializations.
  ta[0] = Math.fround(i);

  assertEq(ta[0], i);
}

function float32_constant() {
  var ta = new Float32Array(10).subarray(1);

  // Explicitly call Math.fround to trigger Float32 specializations.
  ta[0] = Math.fround(1);

  assertEq(ta[0], 1);
}

function float16(i) {
  var ta = new Float16Array(10).subarray(1);

  // Explicitly call Math.f16round to trigger Float32 specializations.
  ta[0] = Math.f16round(i);

  assertEq(ta[0], i);
}

function float16_constant() {
  var ta = new Float16Array(10).subarray(1);

  // Explicitly call Math.f16round to trigger Float32 specializations.
  ta[0] = Math.f16round(1);

  assertEq(ta[0], 1);
}

for (var i = 0; i < 100; ++i) {
  float32(i);
  float32_constant(i);

  float16(i);
  float16_constant(i);
}
