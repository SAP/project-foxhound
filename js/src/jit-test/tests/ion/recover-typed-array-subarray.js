// |jit-test| --ion-limit-script-size=off

setJitCompilerOption("baseline.warmup.trigger", 9);
setJitCompilerOption("ion.warmup.trigger", 20);

// Prevent GC from cancelling/discarding Ion compilations.
gczeal(0);

const max = 200;

// Check that we are able to remove the operation inside recover test functions
// (denoted by "rop..."), when we inline the first version of uceFault, and
// ensure that the bailout is correct when uceFault is replaced (which cause an
// invalidation bailout).

var uceFault = function (i) {
  if (i > 98) {
    uceFault = function (i) { return true; };
  }
  return false;
};

var uceFault_detaching = function (i) {
  if (i > 98) {
    detachArrayBuffer(tarray.buffer);
    uceFault_detaching = function (i) { return true; };
  }
  return false;
};

const i32 = new Int32Array(10);

for (let i = 0; i < i32.length; ++i) {
  i32[i] = (i + 1) * 100;
}

let uceFault_rtypedarray_subarray_no_args = eval(`(${uceFault})`.replace('uceFault', 'uceFault_rtypedarray_subarray_no_args'));
function rtypedarray_subarray_no_args(i) {
  var y = i32.subarray();
  if (uceFault_rtypedarray_subarray_no_args(i) || uceFault_rtypedarray_subarray_no_args(i)) {
    assertEq(y.length, i32.length);
    assertEq(y.byteOffset, 0);
    assertEq(y[0], 100);
  }
  assertRecoveredOnBailout(y, true);
  return i;
}

let uceFault_rtypedarray_subarray_with_start = eval(`(${uceFault})`.replace('uceFault', 'uceFault_rtypedarray_subarray_with_start'));
function rtypedarray_subarray_with_start(i) {
  var y = i32.subarray(1);
  if (uceFault_rtypedarray_subarray_with_start(i) || uceFault_rtypedarray_subarray_with_start(i)) {
    assertEq(y.length, i32.length - 1);
    assertEq(y.byteOffset, 1 * Int32Array.BYTES_PER_ELEMENT);
    assertEq(y[0], 200);
  }
  assertRecoveredOnBailout(y, true);
  return i;
}

let uceFault_rtypedarray_subarray_with_end = eval(`(${uceFault})`.replace('uceFault', 'uceFault_rtypedarray_subarray_with_end'));
function rtypedarray_subarray_with_end(i) {
  var y = i32.subarray(2, 5);
  if (uceFault_rtypedarray_subarray_with_end(i) || uceFault_rtypedarray_subarray_with_end(i)) {
    assertEq(y.length, i32.length - 7);
    assertEq(y.byteOffset, 2 * Int32Array.BYTES_PER_ELEMENT);
    assertEq(y[0], 300);
  }
  assertRecoveredOnBailout(y, true);
  return i;
}

const i32_no_args_detached = i32.slice(0);

let uceFault_rtypedarray_subarray_no_args_detached = eval(`(${uceFault_detaching})`.replace('uceFault_detaching', 'uceFault_rtypedarray_subarray_no_args_detached').replace('tarray', 'i32_no_args_detached'));
function rtypedarray_subarray_no_args_detached(i) {
  var y = i32_no_args_detached.subarray();
  if (uceFault_rtypedarray_subarray_no_args_detached(i) || uceFault_rtypedarray_subarray_no_args_detached(i)) {
    assertEq(y.length, 0);
    assertEq(y.byteOffset, 0);
  }
  assertRecoveredOnBailout(y, true);
  return i;
}

const i32_with_start_detached = i32.slice(0);

let uceFault_rtypedarray_subarray_with_start_detached = eval(`(${uceFault_detaching})`.replace('uceFault_detaching', 'uceFault_rtypedarray_subarray_with_start_detached').replace('tarray', 'i32_with_start_detached'));
function rtypedarray_subarray_with_start_detached(i) {
  var y = i32_with_start_detached.subarray(1);
  if (uceFault_rtypedarray_subarray_with_start_detached(i) || uceFault_rtypedarray_subarray_with_start_detached(i)) {
    assertEq(y.length, 0);
    assertEq(y.byteOffset, 0);
  }
  assertRecoveredOnBailout(y, true);
  return i;
}

const i32_with_end_detached = i32.slice(0);

let uceFault_rtypedarray_subarray_with_end_detached = eval(`(${uceFault_detaching})`.replace('uceFault_detaching', 'uceFault_rtypedarray_subarray_with_end_detached').replace('tarray', 'i32_with_end_detached'));
function rtypedarray_subarray_with_end_detached(i) {
  var y = i32_with_end_detached.subarray(2, 5);
  if (uceFault_rtypedarray_subarray_with_end_detached(i) || uceFault_rtypedarray_subarray_with_end_detached(i)) {
    assertEq(y.length, 0);
    assertEq(y.byteOffset, 0);
  }
  assertRecoveredOnBailout(y, true);
  return i;
}

for (let j = 100 - max; j < 100; j++) {
  with({}){} // Do not Ion-compile this loop.
  let i = j < 2 ? (Math.abs(j) % 50) + 2 : j;

  rtypedarray_subarray_no_args(i);
  rtypedarray_subarray_with_start(i);
  rtypedarray_subarray_with_end(i);

  rtypedarray_subarray_no_args_detached(i);
  rtypedarray_subarray_with_start_detached(i);
  rtypedarray_subarray_with_end_detached(i);
}
