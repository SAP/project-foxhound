function handleRequest(request, response) {
  var file = Services.dirsvc.get("CurWorkD", Ci.nsIFile);

  file.append("tests");
  file.append("image");
  file.append("test");
  file.append("mochitest");

  // The expected Accept header depends on the pref image.jxl.enabled, but we
  // can't read the up-to-date value of the pref here: on Android this .sjs
  // runs in a host-side xpcshell that is a separate process (and a much older
  // build that is only updated manually) than the device GeckoView under test,
  // so its Services.prefs doesn't reflect the device's runtime pref state. The
  // test passes the pref value via the query string instead.
  let expected = "image/avif,";
  if (request.queryString == "jxl=1") {
    expected += "image/jxl,";
  }
  expected += "image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5";

  if (request.getHeader("Accept") == expected) {
    file.append("blue.png");
  } else {
    file.append("red.png");
  }
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.setHeader("Content-Type", "image/png", false);
  response.setHeader("Cache-Control", "no-cache", false);

  var fileStream = Cc[
    "@mozilla.org/network/file-input-stream;1"
  ].createInstance(Ci.nsIFileInputStream);
  fileStream.init(file, 1, 0, false);
  var binaryStream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(
    Ci.nsIBinaryInputStream
  );
  binaryStream.setInputStream(fileStream);

  response.bodyOutputStream.writeFrom(binaryStream, binaryStream.available());

  binaryStream.close();
  fileStream.close();
}
