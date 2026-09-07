/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

const emptyPage =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  ) + "empty.html";

add_task(async function test_linux_distro_metrics() {
  info("Testing Linux distribution metrics");

  await BrowserTestUtils.withNewTab({ gBrowser, url: emptyPage }, () =>
    GleanPings.userCharacteristics.testSubmission(
      () => {
        // Test os_distro metric
        const osDistro = Glean.characteristics.osDistro.testGetValue();
        Assert.ok(osDistro, "os_distro should have a value on Linux");
        Assert.notEqual(osDistro, "", "os_distro should not be empty on Linux");
        info(`os_distro: ${osDistro}`);

        // Test os_distro_version metric
        const osDistroVersion =
          Glean.characteristics.osDistroVersion.testGetValue();
        Assert.ok(
          osDistroVersion,
          "os_distro_version should have a value on Linux"
        );
        Assert.notEqual(
          osDistroVersion,
          "",
          "os_distro_version should not be empty on Linux"
        );
        info(`os_distro_version: ${osDistroVersion}`);

        // Test os_distro_id metric (may be empty if MOZ_DISTRIBUTION_ID not set)
        const osDistroId = Glean.characteristics.osDistroId.testGetValue();
        info(`os_distro_id: ${osDistroId || "(not set)"}`);
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
