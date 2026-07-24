// Should report file not found on non-existent files

const { NetUtil } = ChromeUtils.importESModule(
  "resource://gre/modules/NetUtil.sys.mjs"
);
const path = "data/uncompressed.zip";

function run_test() {
  var spec = "jar:" + Services.io.newFileURI(do_get_file(path)).spec + "!/";
  var channel = NetUtil.newChannel({
    uri: spec + "hello",
    loadUsingSystemPrincipal: true,
  });
  let stream = channel.open();
  ok(stream);
  stream.close();

  Assert.throws(
    () => {
      channel = NetUtil.newChannel({
        uri: spec + "hello%00.js",
        loadUsingSystemPrincipal: true,
      });
      channel.open();
    },
    /NS_ERROR_FILE_NOT_FOUND/,
    "An embedded null must not truncate the path being loaded"
  );
}
