function handleRequest(request, response) {
  // Allow cross-origin, so you can XHR to it!
  response.setHeader("Access-Control-Allow-Origin", "*", false);
  // Avoid confusing cache behaviors
  response.setHeader("Cache-Control", "no-cache", false);
  response.setHeader("Content-Type", "text/plain", false);
  switch(request.queryString) {
    case "json":
     let obj = { a: 3, b: 4, txt: "<b>hi</b>" };
     response.write(`${JSON.stringify(obj)}`);
     break;
    default:
     response.write("hello!");

  }
}