// |jit-test| skip-if: getBuildConfiguration("release_or_beta")
//
// JS::SafeResolve of a thenable settles the outer promise at the SAME
// microtask depth as an ordinary resolve(thenable). Under the updated
// thenable-curtailment spec, PerformPromiseResolution runs in ~deferred~
// mode: when it finds a callable "then" it invokes PerformPromiseResolveThenable
// synchronously rather than enqueuing a further job, so the deferred resolution
// does not add an extra tick relative to normal assimilation.

// Measure at which microtask "tick" the outer reaction fires, by racing it
// against a chain of native-promise reactions that bump `tick`.
function measure(installResolution) {
  const {promise} = Promise.withResolvers();

  let ticksAtFulfill = -1;
  let tick = 0;
  promise.then(() => { ticksAtFulfill = tick; });

  installResolution(promise);

  let pending = Promise.resolve();
  for (let i = 0; i < 6; i++) {
    pending = pending.then(() => { tick++; });
  }
  drainJobQueue();
  assertEq(ticksAtFulfill >= 0, true, "reaction fired at some tick");
  return ticksAtFulfill;
}

// Baseline: a normal resolve(thenable). The resolve function lives on the
// capability, so we need the resolvers; reproduce measure() inline to get it.
function measureNormal() {
  const {promise, resolve} = Promise.withResolvers();

  let ticksAtFulfill = -1;
  let tick = 0;
  promise.then(() => { ticksAtFulfill = tick; });

  resolve({ then(onFulfilled) { onFulfilled("normal"); } });

  let pending = Promise.resolve();
  for (let i = 0; i < 6; i++) {
    pending = pending.then(() => { tick++; });
  }
  drainJobQueue();
  assertEq(ticksAtFulfill >= 0, true, "reaction fired at some tick");
  return ticksAtFulfill;
}

// Plain callable-"then" thenable.
{
  const baseline = measureNormal();
  const safe = measure(p => {
    safeResolvePromise(p, { then(onFulfilled) { onFulfilled("safe"); } });
  });
  assertEq(safe, baseline,
           "SafeResolve(thenable) settles at the same tick as resolve(thenable)");
}

// A real Promise as the resolution value: same invariant.
{
  let baseTick;
  {
    const {promise, resolve} = Promise.withResolvers();
    let ticksAtFulfill = -1, tick = 0;
    promise.then(() => { ticksAtFulfill = tick; });
    resolve(Promise.resolve("inner"));
    let pending = Promise.resolve();
    for (let i = 0; i < 7; i++) pending = pending.then(() => { tick++; });
    drainJobQueue();
    baseTick = ticksAtFulfill;
  }

  let safeTick;
  {
    const {promise} = Promise.withResolvers();
    let ticksAtFulfill = -1, tick = 0;
    promise.then(() => { ticksAtFulfill = tick; });
    safeResolvePromise(promise, Promise.resolve("inner"));
    let pending = Promise.resolve();
    for (let i = 0; i < 7; i++) pending = pending.then(() => { tick++; });
    drainJobQueue();
    safeTick = ticksAtFulfill;
  }

  assertEq(safeTick, baseTick,
           "promise-with-promise via SafeResolve settles at the same tick");
}
