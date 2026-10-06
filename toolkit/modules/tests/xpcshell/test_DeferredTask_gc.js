/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

ChromeUtils.defineESModuleGetters(this, {
  DeferredTask: "resource://gre/modules/DeferredTask.sys.mjs",
});

/**
 * Checks that the "finalize" method allows the callback to be GC'd.
 */
add_task(async function test_finalize_after_arm() {
  let count = 0;
  let callback = () => {
    ++count;
  };
  let callbackWeakRef = Cu.getWeakReference(callback);
  let deferredTask = new DeferredTask(
    callback,
    /* delayMs */ 600_000, // long timeout, we are not going to wait for it.
    /* idleTimeoutMs */ undefined // no deadline.
  );
  // Clear callback reference, so that we are not the ones keeping it alive.
  callback = null;

  Cu.forceGC();
  ok(callbackWeakRef.get(), "Callback not GC'd yet");

  deferredTask.arm();
  equal(count, 0, "callback not called yet");
  await deferredTask.finalize();
  equal(count, 1, "callback force called by finalize");

  Cu.forceGC();
  ok(!callbackWeakRef.get(), "Callback GC'd after finalize");

  // Make sure to reference deferredTask so that there is still a strong
  // reference to deferredTask, which prevents deferredTask from trivially
  // being collected.
  Assert.throws(
    () => deferredTask.finalize(),
    /The object has been already finalized/,
    "finalize() cannot be called twice"
  );
});

add_task(async function test_gc_without_arm_or_finalize() {
  let count = 0;
  let callback = () => {
    ++count;
  };
  let callbackWeakRef = Cu.getWeakReference(callback);
  let deferredTask = new DeferredTask(
    callback,
    /* delayMs */ 600_000, // long timeout, we are not going to wait for it.
    /* idleTimeoutMs */ undefined // no deadline.
  );
  // Clear callback reference, so that we are not the ones keeping it alive.
  callback = null;
  let deferredTaskWeakRef = Cu.getWeakReference(deferredTask);
  deferredTask = null;

  Cu.forceGC();
  ok(!deferredTaskWeakRef.get(), "DeferredTask can be GC'd when not armed");
  ok(!callbackWeakRef.get(), "Callback GC'd when DeferredTask is GC'd");

  equal(count, 0, "callback was never called");
});
