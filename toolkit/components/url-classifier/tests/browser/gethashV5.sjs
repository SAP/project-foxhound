"use strict";

let urlClassifierTestUtils = Cc[
  "@mozilla.org/url-classifier/test-utils;1"
].getService(Ci.nsIUrlClassifierTestUtils);

const MALWARE_HOST = "malware.example.com/";
const MALWARE_HASH_BASE64 = "o9t8rw==";

function handleRequest(request, response) {
  let params = new URLSearchParams(request.queryString);
  let hash = params.get("hashPrefixes");

  // Ensure the "hashPrefixes" is expected.
  if (hash == MALWARE_HASH_BASE64) {
    response.setStatusLine(request.httpVersion, 200);
  } else {
    response.setStatusLine(request.httpVersion, 404);
    return;
  }

  // Generate a V5 Find Full Hash response for the malware host.
  let fullHashBase64 = urlClassifierTestUtils.generateFullHash(MALWARE_HOST);
  let fullHashBin = atob(fullHashBase64.replace(/-/g, "+").replace(/_/g, "/"));
  let body = urlClassifierTestUtils.makeFindFullHashResponseV5(fullHashBin);

  response.write(body);
}
