"use strict";

const { ValueSummaryReader } = ChromeUtils.importESModule(
  "resource://devtools/client/shared/components/reps/reps/value-summary-reader.mjs"
);

add_task(async function test_profile_feature_jstracing_filter_values() {
  await ProfilerTestUtils.assertProfilerInactive();

  await BrowserTestUtils.withNewTab(
    "https://example.com/",
    async contentBrowser => {
      await ProfilerTestUtils.startProfiler({ features: ["tracing"] });

      const contentPid = await SpecialPowers.spawn(
        contentBrowser,
        [],
        async () => {
          this.content.eval(`
            function targetFuncA(x) { return x + 1; }
            function targetFuncB(x, y) { return x * y; }
            function targetFuncC(str) { return str.toUpperCase(); }
            function otherFunc(n) { return n; }

            // Call functions multiple times to generate trace entries
            targetFuncA(42);
            targetFuncB(3, 7);
            targetFuncC("hello");
            otherFunc(100);
            targetFuncA(99);
            targetFuncB(5, 5);
          `);

          return Services.appinfo.processID;
        }
      );

      const { contentThread } = await stopProfilerNowAndGetThreads(contentPid);

      const tracedValuesBuffer = Uint8Array.fromBase64(
        contentThread.tracedValues
      ).buffer;
      const shapes = contentThread.tracedObjectShapes;

      const targetFuncAStringIndex = contentThread.stringTable.findIndex(s =>
        s.startsWith("targetFuncA")
      );
      const targetFuncBStringIndex = contentThread.stringTable.findIndex(s =>
        s.startsWith("targetFuncB")
      );

      Assert.greater(
        targetFuncAStringIndex,
        0,
        "Found string for 'targetFuncA'"
      );
      Assert.greater(
        targetFuncBStringIndex,
        0,
        "Found string for 'targetFuncB'"
      );

      // Find frames for target functions
      const { frameTable, stackTable, samples } = contentThread;
      const FRAME_LOCATION_SLOT = frameTable.schema.location;

      const targetFuncAFrameIndices = [];
      const targetFuncBFrameIndices = [];
      frameTable.data.forEach((frame, idx) => {
        if (frame[FRAME_LOCATION_SLOT] === targetFuncAStringIndex) {
          targetFuncAFrameIndices.push(idx);
        }
        if (frame[FRAME_LOCATION_SLOT] === targetFuncBStringIndex) {
          targetFuncBFrameIndices.push(idx);
        }
      });

      // Find stacks containing these frames
      const STACK_FRAME_SLOT = stackTable.schema.frame;
      const targetFuncAStackIndices = [];
      const targetFuncBStackIndices = [];
      stackTable.data.forEach((stack, idx) => {
        if (targetFuncAFrameIndices.includes(stack[STACK_FRAME_SLOT])) {
          targetFuncAStackIndices.push(idx);
        }
        if (targetFuncBFrameIndices.includes(stack[STACK_FRAME_SLOT])) {
          targetFuncBStackIndices.push(idx);
        }
      });

      // Get samples for targetFuncA and targetFuncB only
      const SAMPLE_STACK_SLOT = samples.schema.stack;
      const SAMPLE_ARGUMENT_VALUES_SLOT = samples.schema.argumentValues;

      const targetSamples = samples.data.filter(
        sample =>
          targetFuncAStackIndices.includes(sample[SAMPLE_STACK_SLOT]) ||
          targetFuncBStackIndices.includes(sample[SAMPLE_STACK_SLOT])
      );

      Assert.greater(
        targetSamples.length,
        0,
        "Found samples for target functions"
      );

      // Collect the argumentValues indices from the filtered samples
      const entryIndices = targetSamples.map(
        sample => sample[SAMPLE_ARGUMENT_VALUES_SLOT]
      );

      // Filter the values buffer to only include entries for our target samples
      const filtered = ValueSummaryReader.filterValuesBufferToEntries(
        tracedValuesBuffer,
        entryIndices
      );

      Assert.greater(
        filtered.valuesBuffer.byteLength,
        0,
        "Filtered buffer has content"
      );
      Assert.lessOrEqual(
        filtered.valuesBuffer.byteLength,
        tracedValuesBuffer.byteLength,
        "Filtered buffer is not larger than source"
      );
      Assert.equal(
        filtered.entryIndices.length,
        entryIndices.length,
        "Entry indices array length is preserved"
      );

      // Validate that we can read argument summaries from the filtered buffer
      let validEntriesCount = 0;
      for (let i = 0; i < filtered.entryIndices.length; i++) {
        const newIndex = filtered.entryIndices[i];
        if (newIndex === null || newIndex < 0) {
          continue;
        }

        const summaries = ValueSummaryReader.getArgumentSummaries(
          filtered.valuesBuffer,
          shapes,
          newIndex
        );

        Assert.ok(
          Array.isArray(summaries),
          `Entry ${i} returns valid summaries array`
        );
        Assert.greater(
          summaries.length,
          0,
          `Entry ${i} has at least one argument`
        );

        // Verify the argument values are numbers (our test functions take numbers)
        const firstArg = summaries[0];
        Assert.ok(
          typeof firstArg === "number" || typeof firstArg === "string",
          `Entry ${i} first argument is a primitive value`
        );

        validEntriesCount++;
      }

      Assert.greater(
        validEntriesCount,
        0,
        "Successfully validated filtered entries"
      );

      // Test deduplication: filter with duplicate indices
      const duplicatedIndices = [...entryIndices, ...entryIndices];
      const filteredWithDupes = ValueSummaryReader.filterValuesBufferToEntries(
        tracedValuesBuffer,
        duplicatedIndices
      );

      Assert.equal(
        filteredWithDupes.entryIndices.length,
        duplicatedIndices.length,
        "Duplicated indices array length is preserved"
      );

      // Check that duplicate entries point to the same offset
      for (let i = 0; i < entryIndices.length; i++) {
        const originalIdx = entryIndices[i];
        if (originalIdx === null || originalIdx < 0) {
          continue;
        }
        Assert.equal(
          filteredWithDupes.entryIndices[i],
          filteredWithDupes.entryIndices[i + entryIndices.length],
          `Duplicate entry ${i} maps to same destination offset`
        );
      }

      // Test with null/negative indices
      const mixedIndices = [null, -1, ...entryIndices.slice(0, 2), null];
      const filteredMixed = ValueSummaryReader.filterValuesBufferToEntries(
        tracedValuesBuffer,
        mixedIndices
      );

      Assert.equal(
        filteredMixed.entryIndices[0],
        null,
        "Null index remains null"
      );
      Assert.equal(
        filteredMixed.entryIndices[1],
        -1,
        "Negative index remains unchanged"
      );
      Assert.equal(
        filteredMixed.entryIndices[4],
        null,
        "Trailing null index remains null"
      );
    }
  );
});
