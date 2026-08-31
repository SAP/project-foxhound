/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// Streams progressive.jxl to the client in stages so the test can observe
// the partial-decode states the JXL decoder produces. The byte counts at
// each stop come from the same probe used by the gtest in
// image/test/gtest/TestDecoders.cpp (search "kBenchmarks" in
// JXLProgressiveDecodingMatches), set ~30-100 bytes past each change point
// so the rendered surface is in a stable post-flush state.
//
// Usage:
//   GET sendprogressivejxl.sjs           - opens the streamed response,
//                                          immediately writes bytes [0,
//                                          stops[0]) and then waits.
//   GET sendprogressivejxl.sjs?continue=N - tells the streamed response to
//                                           catch up to stops[N], or, when
//                                           N == stops.length, to write
//                                           the rest of the file and
//                                           finish.

var gTimer = null;

const kStops = [400, 4300, 17400, 46100];

function getFileStream(filename) {
  var self = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  self.initWithPath(getState("__LOCATION__"));
  var file = self.parent;
  file.append(filename);

  var fileStream = Cc[
    "@mozilla.org/network/file-input-stream;1"
  ].createInstance(Ci.nsIFileInputStream);
  fileStream.init(file, 1, 0, false);
  return fileStream;
}

function handleRequest(request, response) {
  if (request.queryString.startsWith("continue=")) {
    setState(
      "jxl_progressive_step",
      request.queryString.slice("continue=".length)
    );
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.write("ok");
    return;
  }

  setState("jxl_progressive_step", "0");

  response.processAsync();
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.setHeader("Content-Type", "image/jxl", false);
  response.setHeader("Cache-Control", "no-cache", false);

  var stream = getFileStream("progressive.jxl");
  // Send the bytes the first stop covers; the rest go out as ?continue
  // signals come in.
  response.bodyOutputStream.writeFrom(stream, kStops[0]);
  var sent = kStops[0];
  var currentStep = 0;

  function pollAndAdvance() {
    var requestedStep = parseInt(getState("jxl_progressive_step"), 10) || 0;

    while (requestedStep > currentStep) {
      currentStep++;
      if (currentStep < kStops.length) {
        var toSend = kStops[currentStep] - sent;
        response.bodyOutputStream.writeFrom(stream, toSend);
        sent += toSend;
      } else {
        // The client has signalled "everything else now" (continue=stops.length).
        var remaining = stream.available();
        if (remaining > 0) {
          response.bodyOutputStream.writeFrom(stream, remaining);
        }
        stream.close();
        response.finish();
        return;
      }
    }

    gTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    gTimer.initWithCallback(pollAndAdvance, 500, Ci.nsITimer.TYPE_ONE_SHOT);
  }

  gTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  gTimer.initWithCallback(pollAndAdvance, 500, Ci.nsITimer.TYPE_ONE_SHOT);
}
