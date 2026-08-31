"use strict";

// This server script has the following request handlers:
// - file_204_no_content.sjs - responds with HTTP 204
// - file_204_no_content.sjs?200ok - responds with HTTP 200 instead of 204.
// - file_204_no_content.sjs?reset - clear any pending delayed/finish state.
// - file_204_no_content.sjs?delayed - responds with HTTP 204 until "finish"
//                                     (finish signal can be received before).
// - file_204_no_content.sjs?finish - releases delayed request

// .sjs scripts can share state between executions. We want to share callbacks,
// for which we can use setObjectState/getObjectState. This state is shared
// with all request handlers registered to httpd.sys.mjs, so we use a
// file-specific key to avoid namespace conflicts.
function makeFileSpecificKey(key) {
  return getState("__LOCATION__") + key;
}

function setGlobalState(key, data) {
  key = makeFileSpecificKey(key);
  const v = {
    data,
    QueryInterface: ChromeUtils.generateQI([]),
  };
  v.wrappedJSObject = v;
  setObjectState(key, v);
}

function getGlobalState(key) {
  key = makeFileSpecificKey(key);
  let data;
  getObjectState(key, v => {
    data = v?.wrappedJSObject.data;
  });
  return data;
}

async function handleRequest(request, response) {
  let query = new URLSearchParams(request.queryString);
  if (query.has("reset")) {
    response.setHeader("Access-Control-Allow-Origin", "*");
    // Just in case there was anything pending, release the promise.
    getGlobalState("finishr")?.();
    setGlobalState("finishr", null);
    getGlobalState("delayedr")?.();
    setGlobalState("delayedr", null);
    return;
  }
  if (query.has("finish")) {
    response.setHeader("Access-Control-Allow-Origin", "*");
    let delayedResolve = getGlobalState("delayedr");
    if (delayedResolve) {
      delayedResolve();
    } else {
      dump("/finish received before /delayed, waiting for /delayed...\n");
      await new Promise(r => setGlobalState("finishr", r));
      dump("/finish received before /delayed, /delayed was received\n");
      delayedResolve = getGlobalState("delayedr");
      delayedResolve();
    }
    return;
  }
  response.processAsync();
  if (query.has("delayed")) {
    // If finish was waiting for delay, resolve now.
    getGlobalState("finishr")?.();
    await new Promise(r => setGlobalState("delayedr", r));
    setGlobalState("delayedr", null);
  }
  if (query.has("200ok")) {
    response.setStatusLine(request.httpVersion, 200, "OK");
  } else {
    response.setStatusLine(request.httpVersion, 204, "No Content");
  }
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.finish();
}
