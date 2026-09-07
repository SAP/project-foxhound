/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Check that we're getting arg / variable named "__proto__" (See Bug 1980263)

add_task(
  threadFrontTest(async ({ threadFront, debuggee }) => {
    const packet = await executeOnNextTickAndWaitForPause(
      () =>
        debuggee.eval(`
          function foo(__proto__){
            debugger;
          }
          foo("bar")
        `),
      threadFront
    );

    const environment = await packet.frame.getEnvironment();
    Assert.equal(environment.type, "function");
    Assert.equal(
      // The original bug is only reproducible in the test when cloning the result, since
      // threadFrontTest uses a direct transport that gets us the object returned from
      // the actor.
      // eslint-disable-next-line no-proto
      structuredClone(environment).bindings.arguments[0].__proto__.value,
      "bar"
    );

    await threadFront.resume();
  })
);

add_task(
  threadFrontTest(async ({ threadFront, debuggee }) => {
    const packet = await executeOnNextTickAndWaitForPause(
      () =>
        debuggee.eval(`
          (function() {
            const __proto__ = "foo";
            debugger;
          })()
        `),
      threadFront
    );

    const environment = await packet.frame.getEnvironment();
    Assert.equal(
      // The original bug is only reproducible in the test when cloning the result, since
      // threadFrontTest uses a direct transport that gets us the object returned from
      // the actor.
      // eslint-disable-next-line no-proto
      structuredClone(environment).bindings.variables.__proto__.value,
      "foo"
    );
    await threadFront.resume();
  })
);
