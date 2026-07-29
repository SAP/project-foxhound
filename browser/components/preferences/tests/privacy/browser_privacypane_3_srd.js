requestLongerTimeout(4);

let rootDir = getRootDirectory(gTestPath);
let jar = getJar(rootDir);
if (jar) {
  let tmpdir = extractJarToTmp(jar);
  rootDir = "file://" + tmpdir.path + "/";
}
Services.scriptloader.loadSubScript(
  /* import-globals-from privacypane_tests_perwindow.js */
  rootDir + "privacypane_tests_perwindow.js",
  this
);

run_test_subset([
  test_custom_retention_redesign("rememberHistory", "remember"),
  test_custom_retention_redesign("rememberHistory", "custom"),
  test_custom_retention_redesign("rememberForms", "custom"),
  test_custom_retention_redesign("rememberForms", "custom"),
  test_historymode_retention_redesign("remember", "custom"),
  test_custom_retention_redesign("alwaysClear", "remember"),
  test_custom_retention_redesign("alwaysClear", "custom"),
]);
