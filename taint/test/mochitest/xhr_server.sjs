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
    case "e2e":
     response.setHeader("Content-Type", "text/plain", false);
     response.setHeader("X-Taint", '[{begin: 0, end: 25, source: "e2e"}]', false);
     response.write("<div>hello!</div>");
     break;
    case "e2e-partial":
     response.setHeader("Content-Type", "text/plain", false);
     response.setHeader("X-Taint", '[{begin: 5, end: 11, source: "e2e"}]', false);
     response.write("<div>hello!</div>");
     break;
    case "e2e-html":
     response.setHeader("Content-Type", "text/html", false);
     response.setHeader("X-Taint", '[{begin: 0, end: 25, source: "e2e"}]', false);
     response.write("<div>hello!</div>");
     break;
    case "e2e-partial-html":
     response.setHeader("Content-Type", "text/html", false);
     response.setHeader("X-Taint", '[{begin: 5, end: 11, source: "e2e"}]', false);
     response.write("<div>hello!</div>");
     break;
    default:
     response.setHeader("Content-Type", "text/plain", false);
     response.write("hello!");

  }
  response.finish();
}