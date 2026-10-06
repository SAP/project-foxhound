/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

const { ASRouterTargeting } = ChromeUtils.importESModule(
  "resource:///modules/asrouter/ASRouterTargeting.sys.mjs"
);

add_task(async function should_ignore_rejections() {
  let target = {
    get foo() {
      return new Promise(resolve => resolve(1));
    },

    get bar() {
      return new Promise((resolve, reject) => reject(new Error("unspecified")));
    },
  };

  let snapshot = await ASRouterTargeting.getEnvironmentSnapshot({
    targets: [target],
  });
  Assert.deepEqual(snapshot, { environment: { foo: 1 }, version: 1 });
});

add_task(async function nested_objects() {
  const target = {
    get foo() {
      return Promise.resolve("foo");
    },
    get bar() {
      return Promise.reject(new Error("bar"));
    },
    baz: {
      get qux() {
        return Promise.resolve("qux");
      },
      get quux() {
        return Promise.reject(new Error("quux"));
      },
      get corge() {
        return {
          get grault() {
            return Promise.resolve("grault");
          },
          get garply() {
            return Promise.reject(new Error("garply"));
          },
        };
      },
    },
  };

  const snapshot = await ASRouterTargeting.getEnvironmentSnapshot({
    targets: [target],
  });
  Assert.deepEqual(
    snapshot,
    {
      environment: {
        foo: "foo",
        baz: {
          qux: "qux",
          corge: {
            grault: "grault",
          },
        },
      },
      version: 1,
    },
    "getEnvironmentSnapshot should resolve nested promises"
  );
});

add_task(async function arrays() {
  const target = {
    foo: [1, 2, 3],
    bar: [Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)],
    baz: Promise.resolve([1, 2, 3]),
    qux: Promise.resolve([
      Promise.resolve(1),
      Promise.resolve(2),
      Promise.resolve(3),
    ]),
    quux: Promise.resolve({
      corge: [Promise.resolve(1), 2, 3],
    }),
  };

  const snapshot = await ASRouterTargeting.getEnvironmentSnapshot({
    targets: [target],
  });
  Assert.deepEqual(
    snapshot,
    {
      environment: {
        foo: [1, 2, 3],
        bar: [1, 2, 3],
        baz: [1, 2, 3],
        qux: [1, 2, 3],
        quux: { corge: [1, 2, 3] },
      },
      version: 1,
    },
    "getEnvironmentSnapshot should resolve arrays correctly"
  );
});

add_task(async function target_order() {
  let target1 = {
    foo: 1,
    bar: 1,
    baz: 1,
  };

  let target2 = {
    foo: 2,
    bar: 2,
  };

  let target3 = {
    foo: 3,
  };

  // target3 supercedes target2; both supercede target1.
  let snapshot = await ASRouterTargeting.getEnvironmentSnapshot({
    targets: [target3, target2, target1],
  });
  Assert.deepEqual(snapshot, {
    environment: { foo: 3, bar: 2, baz: 1 },
    version: 1,
  });
});

/*
 * NB: This test is last because it advances the shutdown phase, which
 * cannot be undone within the same xpcshell process.
 *
 * Adding tests after this one will result in failures.
 */
add_task(async function quit_application_unsticks_hung_properties() {
  // Part 1: reproduces the failure mode from bug 1830551. A property
  // whose resolver never settles on its own (eg. waits on a
  // cross-instance update lock another Firefox is holding) must not
  // pin the snapshot open indefinitely. Firing `quit-application`
  // after the snapshot has started should drop the hung property and
  // let the snapshot return with what has resolved so far.
  let raceTarget = {
    fast: Promise.resolve(1),
    stuck: new Promise(() => {}),
  };

  let snapshotPromise = ASRouterTargeting.getEnvironmentSnapshot({
    targets: [raceTarget],
  });

  // Yield long enough for getEnvironmentSnapshot to install its
  // observer and arm the per-property races against
  // `quit-application`. A handful of microtask turns is enough.
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }

  // Advancing to AppShutdownConfirmed is the legal way to fire the
  // `quit-application` topic that the race listens for. Calling
  // Services.obs.notifyObservers directly on a shutdown-phase topic
  // is asserted against in debug builds (see
  // nsObserverService::NotifyObservers /
  // AppShutdown::IsNoOrLegalShutdownTopic).
  Services.startup.advanceShutdownPhase(
    Services.startup.SHUTDOWN_PHASE_APPSHUTDOWNCONFIRMED
  );

  Assert.deepEqual(
    await snapshotPromise,
    { environment: { fast: 1 }, version: 1 },
    "stuck property is dropped after quit-application fires; fast is kept"
  );

  // Part 2: with shutdown now started, properties are dropped at the
  // synchronous `Services.startup.shuttingDown` fast-path before
  // their getters are even invoked.
  let postQuitGetterRan = false;
  let postQuitTarget = {
    get prop() {
      postQuitGetterRan = true;
      return Promise.resolve(42);
    },
  };

  Assert.deepEqual(
    await ASRouterTargeting.getEnvironmentSnapshot({
      targets: [postQuitTarget],
    }),
    { environment: {}, version: 1 },
    "property is dropped synchronously once shuttingDown is true"
  );
  Assert.ok(
    !postQuitGetterRan,
    "property getter is not invoked once shuttingDown is true"
  );
});
