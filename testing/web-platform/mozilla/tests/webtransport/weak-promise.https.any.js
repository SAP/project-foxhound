// META: global=window,worker
// META: script=/common/get-host-info.sub.js
// META: script=/webtransport/resources/webtransport-test-helpers.sub.js
// META: script=/common/utils.js
// META: script=/common/gc.js

'use strict';

async function timeout(cmd) {
  const timer = new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id)
      reject(new Error("Promise timed out!"))
    }, 750)
  })
  return Promise.race([cmd, timer])
}

// This is a test for bug 1958291
// A weakref should deref to null if the object has been GCd
// but a bug in the implementation of NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN
// made it so that only its members were GCd, leading to target.ready dereferencing
// a null pointer.
promise_test(async t => {
  // Create first WebTransport connection and a WeakRef to it
  let wt1 = new WebTransport(
    webtransport_url(`query.py?token=${token()}`)
  );
  const weakref = new WeakRef(wt1);

  // Create second WebTransport connection
  const wt2 = new WebTransport(
    webtransport_url(`query.py?token=${token()}`)
  );
  t.add_cleanup(() => wt2.close());

  // Remove strong reference to wt1
  wt1 = undefined;

  await wt2.ready;

  // Trigger garbage collection
  await garbageCollect();

  // Create bidirectional streams on wt2
  for (let i = 0; i < 8; i++) {
    await timeout(wt2.createBidirectionalStream({}));
  }

  // Try to dereference the weakref
  const target = weakref.deref();

  // The object may have been garbage collected (target === undefined)
  // or it may still be alive (target !== undefined). Both are valid outcomes.
  if (target !== undefined) {
    // Object survived GC, verify it's still accessible
    try {
      await timeout(target.ready);
    } catch (e) {
      // Timeout or connection error is acceptable
    }
  }
  // If target is undefined, the object was successfully garbage collected
}, 'WebTransport garbage collection behavior with WeakRef');
