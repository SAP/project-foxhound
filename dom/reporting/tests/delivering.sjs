const CC = Components.Constructor;
const BinaryInputStream = CC(
  "@mozilla.org/binaryinputstream;1",
  "nsIBinaryInputStream",
  "setInputStream"
);

const { NetUtil } = ChromeUtils.importESModule(
  "resource://gre/modules/NetUtil.sys.mjs"
);

function loadHTMLFromFile(path) {
  // Load the HTML to return in the response from file.
  // Since it's relative to the cwd of the test runner, we start there and
  // append to get to the actual path of the file.

  var testHTMLFile = Services.dirsvc.get("CurWorkD", Ci.nsIFile);
  var dirs = path.split("/");
  for (var i = 0; i < dirs.length; i++) {
    testHTMLFile.append(dirs[i]);
  }
  var testHTMLFileStream = Cc[
    "@mozilla.org/network/file-input-stream;1"
  ].createInstance(Ci.nsIFileInputStream);
  testHTMLFileStream.init(testHTMLFile, -1, 0, 0);
  var testHTML = NetUtil.readInputStreamToString(
    testHTMLFileStream,
    testHTMLFileStream.available()
  );
  return testHTML;
}

function handleRequest(aRequest, aResponse) {
  var params = new URLSearchParams(aRequest.queryString);

  // Serve iframe with Reporting-Endpoints header
  if (aRequest.method == "GET" && params.get("task") == "iframe") {
    let extraParams = [];
    let iframePath = "tests/dom/reporting/tests/iframe_delivering.html";

    if (params.has("chips") && params.has("worker")) {
      extraParams.push("chips=true");
      iframePath =
        "tests/dom/reporting/tests/iframe_delivering_chips_worker.html";
    } else if (params.has("chips")) {
      extraParams.push("chips=true");
      iframePath = "tests/dom/reporting/tests/iframe_delivering_chips.html";
    }

    let url =
      "https://example.org/tests/dom/reporting/tests/delivering.sjs" +
      (extraParams.length ? "?" + extraParams.join("&") : "");

    aResponse.setStatusLine(aRequest.httpVersion, 200, "OK");
    aResponse.setHeader("Content-Type", "text/html", false);
    aResponse.setHeader("Reporting-Endpoints", `default="${url}"`, false);
    aResponse.write(loadHTMLFromFile(iframePath));
    return;
  }

  // Serve worker script with Reporting-Endpoints header
  if (aRequest.method == "GET" && params.get("task") == "worker") {
    let extraParams = [];

    if (params.has("chips")) {
      extraParams.push("chips=true");
    }

    let url =
      "https://example.org/tests/dom/reporting/tests/delivering.sjs" +
      (extraParams.length ? "?" + extraParams.join("&") : "");

    aResponse.setStatusLine(aRequest.httpVersion, 200, "OK");
    aResponse.setHeader("Content-Type", "application/javascript", false);
    aResponse.setHeader("Reporting-Endpoints", `default="${url}"`, false);
    aResponse.write(
      loadHTMLFromFile("tests/dom/reporting/tests/worker_delivering_chips.js")
    );
    return;
  }

  // Report-Endpoints setter
  if (aRequest.method == "GET" && params.get("task") == "header") {
    let extraParams = [];

    if (params.has("410")) {
      extraParams.push("410=true");
    }

    if (params.has("worker")) {
      extraParams.push("worker=true");
    }

    let url =
      "https://example.org/tests/dom/reporting/tests/delivering.sjs" +
      (extraParams.length ? "?" + extraParams.join("&") : "");

    aResponse.setStatusLine(aRequest.httpVersion, 200, "OK");
    aResponse.setHeader("Reporting-Endpoints", `default="${url}"`, false);
    aResponse.write("OK");
    return;
  }

  // Report check
  if (aRequest.method == "GET" && params.get("task") == "check") {
    aResponse.setStatusLine(aRequest.httpVersion, 200, "OK");

    let reports = getState("report");
    if (!reports) {
      aResponse.write("");
      return;
    }

    if (params.has("min")) {
      let json = JSON.parse(reports);
      if (json.length < params.get("min")) {
        aResponse.write("");
        return;
      }
    }

    aResponse.setStatusLine(aRequest.httpVersion, 200, "OK");
    aResponse.write(getState("report"));

    setState("report", "");
    return;
  }

  if (aRequest.method == "POST") {
    var body = new BinaryInputStream(aRequest.bodyInputStream);

    var avail;
    var bytes = [];
    while ((avail = body.available()) > 0) {
      Array.prototype.push.apply(bytes, body.readByteArray(avail));
    }

    let reports = getState("report");
    if (!reports) {
      reports = [];
    } else {
      reports = JSON.parse(reports);
    }

    const incoming_reports = JSON.parse(String.fromCharCode.apply(null, bytes));
    for (let report of incoming_reports) {
      let data = {
        contentType: aRequest.getHeader("content-type"),
        origin: aRequest.getHeader("origin"),
        body: report,
        url:
          aRequest.scheme +
          "://" +
          aRequest.host +
          aRequest.path +
          (aRequest.queryString ? "&" + aRequest.queryString : ""),
      };
      reports.push(data);
    }

    setState("report", JSON.stringify(reports));

    if (params.has("410")) {
      aResponse.setStatusLine(aRequest.httpVersion, 410, "Gone");
    } else {
      aResponse.setStatusLine(aRequest.httpVersion, 200, "OK");
    }

    if (params.has("chips")) {
      aResponse.setHeader(
        "Set-Cookie",
        "foo=bar; Secure; SameSite=None; Partitioned",
        false
      );
    }
    return;
  }

  aResponse.setStatusLine(aRequest.httpVersion, 500, "Internal error");
  aResponse.write("Invalid request");
}
