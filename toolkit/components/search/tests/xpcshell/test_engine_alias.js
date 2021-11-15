/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

SearchTestUtils.initXPCShellAddonManager(this);

const NAME = "Test Alias Engine";

add_task(async function setup() {
  await AddonTestUtils.promiseStartupManager();
  let settingsFileWritten = promiseAfterSettings();
  await Services.search.init();
  await settingsFileWritten;
});

add_task(async function upgrade_with_configuration_change_test() {
  let settingsFileWritten = promiseAfterSettings();
  let extension = await SearchTestUtils.installSearchExtension({
    name: NAME,
    keyword: "testalias",
  });
  await extension.awaitStartup();
  await settingsFileWritten;

  let engine = Services.search.getEngineByAlias("testalias");
  Assert.equal(engine?.name, NAME, "Engine can be fetched by alias");

  // Restart the search service but not the AddonManager, we will
  // load the engines from settings.
  Services.search.wrappedJSObject.reset();
  await Services.search.init();

  engine = Services.search.getEngineByAlias("testalias");
  Assert.equal(engine?.name, NAME, "Engine can be fetched by alias");

  await extension.unload();
});
