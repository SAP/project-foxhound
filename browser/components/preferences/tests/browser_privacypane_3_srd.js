let rootDir = getRootDirectory(gTestPath);
let jar = getJar(rootDir);
if (jar) {
  let tmpdir = extractJarToTmp(jar);
  rootDir = "file://" + tmpdir.path + "/";
}
/* import-globals-from privacypane_tests_perwindow.js */
Services.scriptloader.loadSubScript(
  rootDir + "privacypane_tests_perwindow.js",
  this
);

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.history2.enabled", true]],
  });
});

run_test_subset([
  test_custom_retention_redesign("rememberHistory", "remember"),
  test_custom_retention_redesign("rememberHistory", "custom"),
  test_custom_retention_redesign("rememberForms", "custom"),
  test_custom_retention_redesign("rememberForms", "custom"),
  test_historymode_retention_redesign("remember", "custom"),
  test_custom_retention_redesign("alwaysClear", "remember"),
  test_custom_retention_redesign("alwaysClear", "custom"),
]);
