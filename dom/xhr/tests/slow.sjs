function handleRequest(request, response) {
  response.processAsync();

  let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  timer.init(
    function() {
      response.write("Here the content. But slowly.");
      response.finish();
    },
    5000,
    Ci.nsITimer.TYPE_ONE_SHOT
  );
}
