function handleRequest(request, response) {
  response.processAsync();
  // Allow cross-origin, so you can XHR to it!
  response.setHeader("Access-Control-Allow-Origin", "*", false);
  // Avoid confusing cache behaviors
  response.setHeader("Cache-Control", "no-cache", false);
  response.setHeader("Content-Type", "text/plain", false);
  switch(request.queryString) {
    case "eval":
     response.write(`console.log("remote loaded payload");`);
     break;
    default:
     response.write("hello!");

  }
  response.finish();
}
