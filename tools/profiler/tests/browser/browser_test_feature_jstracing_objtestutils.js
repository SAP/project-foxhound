"use strict";

const { JSObjectsTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/JSObjectsTestUtils.sys.mjs"
);
JSObjectsTestUtils.init(this);

const { XPCShellContentUtils } = ChromeUtils.importESModule(
  "resource://testing-common/XPCShellContentUtils.sys.mjs"
);
const { ValueSummaryReader } = ChromeUtils.importESModule(
  "resource://devtools/client/shared/components/reps/reps/value-summary-reader.mjs"
);

/**
 * Test the JS Tracing feature across all of the JS values covered by
 * JSObjectsTestUtils.
 */
add_task(async function test_profile_feature_jstracing_objtestutils() {
  Assert.ok(
    !Services.profiler.IsActive(),
    "The profiler is not currently active"
  );

  const { CONTEXTS, AllObjects } = ChromeUtils.importESModule(
    "resource://testing-common/AllJavascriptTypes.mjs"
  );
  const expressions = AllObjects.filter(
    o => !o.disabled && o.context != CONTEXTS.CHROME
  ).map(o => o.expression);

  await BrowserTestUtils.withNewTab(
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    "http://example.com/",
    async contentBrowser => {
      await ProfilerTestUtils.startProfiler({ features: ["tracing"] });
      let contentPid = await SpecialPowers.spawn(
        contentBrowser,
        [expressions],
        async expressions => {
          for (const expression of expressions) {
            const contentFn = `
            dump("\\n\\n\\n\\n\\n\\nTEST\\n\\n\\n\\n\\n\\n")
            dump(document.location.href + "\\n")
            function dummy() {}
            let ref;
            try {
              ref = eval(${JSON.stringify(expression)});
            } catch (e) {
              ref = e;
            }
            dummy(ref);

            // Silence any async rejection
            if (ref instanceof Promise) {
              ref.catch(function () {});
            }`;

            await this.content.eval(contentFn);
          }

          return Services.appinfo.processID;
        }
      );

      const { contentThread } = await stopProfilerNowAndGetThreads(contentPid);

      const tracedValuesBuffer = Uint8Array.fromBase64(
        contentThread.tracedValues
      ).buffer;
      const shapes = contentThread.tracedObjectShapes;

      // First lookup for all our expected symbols in the string table
      const functionDummyStringIndex = contentThread.stringTable.findIndex(s =>
        s.startsWith("dummy")
      );
      Assert.greater(
        functionDummyStringIndex,
        0,
        "Found string for 'dummy' function call"
      );

      // Then lookup for the matching frame, based on the string index
      const { frameTable } = contentThread;
      const FRAME_LOCATION_SLOT = frameTable.schema.location;
      const functionDummyFrameIndexes = [];
      frameTable.data.forEach((frame, idx) => {
        if (frame[FRAME_LOCATION_SLOT] === functionDummyStringIndex) {
          functionDummyFrameIndexes.push(idx);
        }
      });

      Assert.greater(
        functionDummyFrameIndexes.length,
        0,
        "Found frame for 'dummy' function call"
      );

      // Finally, assert that the stacks are correct.
      // Each symbol's frame is visible in a stack, and the stack tree is valid
      const { stackTable } = contentThread;
      const STACK_FRAME_SLOT = stackTable.schema.frame;
      const functionDummyStacks = [];
      stackTable.data.forEach((stack, idx) => {
        if (functionDummyFrameIndexes.includes(stack[STACK_FRAME_SLOT])) {
          functionDummyStacks.push(idx);
        }
      });

      const { samples } = contentThread;
      const SAMPLE_STACK_SLOT = contentThread.samples.schema.stack;
      const functionDummySamples = samples.data.filter(sample =>
        functionDummyStacks.includes(sample[SAMPLE_STACK_SLOT])
      );

      const actualValues = [];
      Assert.equal(
        functionDummySamples.length,
        expressions.length,
        "Every expression got a sample"
      );

      let i = 0;
      for (const objectDescription of AllObjects) {
        if (objectDescription.disabled) {
          continue;
        }
        if (objectDescription.context == CONTEXTS.CHROME) {
          actualValues.push(undefined);
          continue;
        }
        let sample = functionDummySamples[i++];
        Assert.notEqual(
          sample,
          undefined,
          "Found sample for 'dummy' function call"
        );

        const SAMPLE_ARGUMENT_VALUES_SLOT =
          contentThread.samples.schema.argumentValues;

        let summaries = ValueSummaryReader.getArgumentSummaries(
          tracedValuesBuffer,
          shapes,
          sample[SAMPLE_ARGUMENT_VALUES_SLOT]
        );

        Assert.equal(
          summaries.length,
          1,
          "Should be a single argument to 'dummy' function."
        );

        actualValues.push(summaries[0]);
      }

      const EXPECTED_VALUES_FILE =
        "browser_test_feature_jstracing_objtestutils.snapshot.mjs";
      JSObjectsTestUtils.testOrUpdateExpectedValues(
        EXPECTED_VALUES_FILE,
        actualValues
      );
    }
  );
});
