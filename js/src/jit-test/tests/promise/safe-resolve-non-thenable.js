// |jit-test| skip-if: getBuildConfiguration("release_or_beta")
//
// JS::SafeResolve fast path: non-objects and inert objects should fulfill
// synchronously, exactly like JS::ResolvePromise.

function observe(p) {
  let fulfilled = null, rejected = null;
  p.then(v => { fulfilled = {value: v}; },
         e => { rejected  = {reason: e}; });
  drainJobQueue();
  return {fulfilled, rejected};
}

// Primitives.
for (const value of [undefined, null, 0, 42, "hello", true, Symbol("s"), 1n]) {
  const {promise} = Promise.withResolvers();
  safeResolvePromise(promise, value);
  const o = observe(promise);
  assertEq(o.rejected, null);
  assertEq(o.fulfilled !== null, true);
  assertEq(o.fulfilled.value, value);
}

// Plain object without "then" anywhere on the chain.
{
  const {promise} = Promise.withResolvers();
  const obj = Object.create(null);
  safeResolvePromise(promise, obj);
  const o = observe(promise);
  assertEq(o.rejected, null);
  assertEq(o.fulfilled.value, obj);
}

// Plain object with a non-callable "then" data property: spec fulfills with
// the object as-is.
{
  const {promise} = Promise.withResolvers();
  const obj = {then: 42};
  safeResolvePromise(promise, obj);
  const o = observe(promise);
  assertEq(o.rejected, null);
  assertEq(o.fulfilled.value, obj);
}

// Array (no own "then"; Array.prototype has no "then" either).
{
  const {promise} = Promise.withResolvers();
  const arr = [1, 2, 3];
  safeResolvePromise(promise, arr);
  const o = observe(promise);
  assertEq(o.rejected, null);
  assertEq(o.fulfilled.value, arr);
}
