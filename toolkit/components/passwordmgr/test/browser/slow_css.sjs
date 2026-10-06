function handleRequest(request, response) {
  response.processAsync();
  response.setHeader("Content-Type", "text/css", false);
  response.setHeader("Cache-Control", "no-cache", false);

  let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  timer.initWithCallback(
    () => {
      response.write("body { background: #eee; }");
      response.finish();
    },
    1500,
    Ci.nsITimer.TYPE_ONE_SHOT
  );
}
