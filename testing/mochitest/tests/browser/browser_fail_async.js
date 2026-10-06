function test() {
  waitForExplicitFinish();
  executeSoon(() => {
    ok(false, "fail");
    finish();
  });
}
