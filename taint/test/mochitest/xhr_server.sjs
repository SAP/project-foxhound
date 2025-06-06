function handleRequest(request, response) {
  response.processAsync();
  // Allow cross-origin, so you can XHR to it!
  response.setHeader("Access-Control-Allow-Origin", "*", false);
  // Avoid confusing cache behaviors
  response.setHeader("Cache-Control", "no-cache", false);
  switch(request.queryString) {
    case "json":
        response.setHeader("Content-Type", "application/json", false);

     let obj = { a: 3, b: 4, txt: "<b>hi</b>" };
     response.write(`${JSON.stringify(obj)}`);
     break;
    case "xml":
     response.setHeader("Content-Type", "application/xml", false);

     response.write(`<div id="bar">hello</div>`);
     break;
    case "html":
        response.setHeader("Content-Type", "text/html", false);

     response.write(`<html><body><div id=bar>hello</div></body></html>`);
     break;
    default:
     response.setHeader("Content-Type", "text/plain", false);
     response.write("hello!");

  }
  response.finish();
}