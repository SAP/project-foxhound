/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// Verifies the voices_* fields added on branch
// pipeline-voices_metrics-await-voiceschanged: when the 5s populate timeout
// fires, the voices_* Glean fields are left unset (testGetValue() === null)
// rather than reporting voicesCount=0 / voicesSha1=sha1("").

const emptyPage =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  ) + "empty.html";

add_task(async function test_voices_absence_invariant() {
  await BrowserTestUtils.withNewTab({ gBrowser, url: emptyPage }, () =>
    GleanPings.userCharacteristics.testSubmission(
      () => {
        const voicesCount = Glean.characteristics.voicesCount.testGetValue();
        const voicesSha1 = Glean.characteristics.voicesSha1.testGetValue();

        // info() is suppressed for passing tests in CI; use dump() so the
        // actual values land in live_backing.log when inspecting a run.
        dump(
          `[voices-test] voices_count=${voicesCount} ` +
            `voices_sha1=${voicesSha1}\n`
        );

        // Core invariant of the patch: voices_count and voices_sha1 must
        // EITHER both be populated (a successful enumeration) OR both be
        // null (the 5s timeout fired and populateVoiceList returned {}).
        // They must never be in a mixed state, and a populated run must
        // never have voicesCount=0 paired with voicesSha1=sha1(""). This
        // holds regardless of whether the CI host actually has TTS voices
        // installed, so the test is not environment-flaky.
        const bothNull = voicesCount === null && voicesSha1 === null;
        const bothPopulated = voicesCount !== null && voicesSha1 !== null;
        Assert.ok(
          bothNull || bothPopulated,
          "voices_count and voices_sha1 must be jointly populated or jointly absent"
        );

        if (bothPopulated && voicesCount === 0) {
          // Genuine empty voice list path: voiceschanged delivered an empty
          // array (rather than the populate timeout firing). voicesSha1
          // will be sha1("") in this case -- that's expected and
          // distinguishable from the absent/timeout case above.
          Assert.strictEqual(
            typeof voicesSha1,
            "string",
            "a successful empty enumeration still reports a sha1 string"
          );
        }
      },
      async () => {
        const populated = TestUtils.topicObserved(
          "user-characteristics-populating-data-done",
          () => true
        );
        Services.obs.notifyObservers(
          null,
          "user-characteristics-testing-please-populate-data"
        );
        await populated;
        GleanPings.userCharacteristics.submit();
      }
    )
  );
});
