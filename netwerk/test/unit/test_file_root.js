/* Tests for file:/// producing a directory/drive listing on all platforms. */

"use strict";

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);

function openChannelRead(chan) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    chan.asyncOpen({
      onStartRequest() {},
      onDataAvailable(request, stream, offset, count) {
        buffer += read_stream(stream, count);
      },
      onStopRequest(request, status) {
        if (!Components.isSuccessCode(status)) {
          reject(new Error("Channel failed: 0x" + status.toString(16)));
          return;
        }
        resolve(buffer);
      },
      QueryInterface: ChromeUtils.generateQI([
        "nsIStreamListener",
        "nsIRequestObserver",
      ]),
    });
  });
}

add_task(async function test_listing_content_type() {
  const chan = NetUtil.newChannel({
    uri: "file:///",
    loadUsingSystemPrincipal: true,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_DOCUMENT,
  });

  await openChannelRead(chan);

  Assert.equal(
    chan.contentType,
    "application/http-index-format",
    "file:/// must return application/http-index-format"
  );
});

add_task(async function test_windows_drive_listing_format() {
  if (AppConstants.platform != "win") {
    return;
  }

  const chan = NetUtil.newChannel({
    uri: "file:///",
    loadUsingSystemPrincipal: true,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_DOCUMENT,
  });

  const data = await openChannelRead(chan);
  const lines = data.split("\n");

  Assert.equal(
    lines[0],
    "200: filename content-length last-modified file-type",
    "First line must be the http-index-format header"
  );

  const driveLines = lines.filter(l => l.startsWith("201: "));
  Assert.greater(driveLines.length, 0, "At least one drive must be listed");

  const driveRe =
    /^201: [A-Z]:\/\s+0\s+Thu,%2001%20Jan%201970%2000:00:00%20GMT DIRECTORY$/;
  for (const line of driveLines) {
    Assert.ok(driveRe.test(line), `Drive line has expected format: "${line}"`);
  }

  Assert.ok(
    driveLines.some(l => l.startsWith("201: C:/")),
    "C: drive must appear in the listing"
  );
});

add_task(async function test_posix_root_listing_format() {
  if (AppConstants.platform == "win") {
    return;
  }

  const chan = NetUtil.newChannel({
    uri: "file:///",
    loadUsingSystemPrincipal: true,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_DOCUMENT,
  });

  const data = await openChannelRead(chan);
  const lines = data.split("\n");

  Assert.equal(
    lines[0],
    "200: filename content-length last-modified file-type",
    "First line must be the http-index-format header"
  );

  const driveLines = lines.filter(l => l.startsWith("201: "));
  Assert.greater(driveLines.length, 0, "Root directory must have entries");

  const entryRe = /^201: \S+ \d+ \S+ (FILE|DIRECTORY|SYMBOLIC-LINK) $/;
  for (const line of driveLines) {
    Assert.ok(entryRe.test(line), `Entry has expected format: "${line}"`);
  }

  const names = new Set(driveLines.map(l => l.split(" ")[1]));
  Assert.ok(names.has("etc"), "'etc' must appear in the root listing");
  Assert.ok(names.has("tmp"), "'tmp' must appear in the root listing");
});
