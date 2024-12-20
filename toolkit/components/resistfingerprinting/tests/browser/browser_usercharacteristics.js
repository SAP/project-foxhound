/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

const emptyPage =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  ) + "empty.html";

function promiseObserverNotification() {
  return TestUtils.topicObserved(
    "user-characteristics-populating-data-done",
    _ => {
      var submitted = false;
      GleanPings.userCharacteristics.testBeforeNextSubmit(_ => {
        submitted = true;

        // Did we assign a value we got out of about:fingerprinting?
        // For now, we are sticking the test value in a random telemetry
        // metric, but once we have a real metric, we'll update this
        Assert.equal(
          "Hello World",
          Glean.characteristics.timezone.testGetValue()
        );
      });
      GleanPings.userCharacteristics.submit();

      return submitted;
    }
  );
}

add_task(async function run_test() {
  info("Starting test...");

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: emptyPage },
    async function tabTask(_) {
      let promise = promiseObserverNotification();

      Services.obs.notifyObservers(
        null,
        "user-characteristics-testing-please-populate-data"
      );

      let submitted = await promise;
      Assert.ok(submitted);
    }
  );
});
