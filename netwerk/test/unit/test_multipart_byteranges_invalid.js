"use strict";

// Test that a multipart/byteranges response with start > end in
// Content-Range is rejected (e.g. "bytes 100-50/200").

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

const multipartBody =
  "--boundary\r\n" +
  "Content-type: text/plain\r\n" +
  "Content-range: bytes 100-50/200\r\n" +
  "\r\n" +
  "aaa\r\n" +
  "--boundary--";

add_task(async function test_invalid_content_range() {
  let httpserver = new HttpServer();
  httpserver.registerPathHandler("/multipart", (metadata, response) => {
    response.setHeader(
      "Content-Type",
      'multipart/byteranges; boundary="boundary"'
    );
    response.bodyOutputStream.write(multipartBody, multipartBody.length);
  });
  httpserver.start(-1);

  let uri =
    "http://localhost:" + httpserver.identity.primaryPort + "/multipart";

  let status = await new Promise(resolve => {
    let listener = {
      QueryInterface: ChromeUtils.generateQI([
        "nsIStreamListener",
        "nsIRequestObserver",
      ]),
      onStartRequest() {},
      onDataAvailable(request, stream, offset, count) {
        // Consume the stream even though we expect failure.
        read_stream(stream, count);
      },
      onStopRequest(request, aStatus) {
        resolve(aStatus);
      },
    };

    let streamConv = Cc["@mozilla.org/streamConverters;1"].getService(
      Ci.nsIStreamConverterService
    );
    let conv = streamConv.asyncConvertData(
      "multipart/byteranges",
      "*/*",
      listener,
      null
    );

    let chan = NetUtil.newChannel({
      uri,
      loadUsingSystemPrincipal: true,
    });
    chan.asyncOpen(conv);
  });

  Assert.equal(
    status,
    Cr.NS_ERROR_CORRUPTED_CONTENT,
    "Should reject Content-Range with start > end"
  );

  await new Promise(resolve => httpserver.stop(resolve));
});
