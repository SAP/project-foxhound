function handleRequest(request, response) {
  // Allow cross-origin, so you can XHR to it!
  response.setHeader("Access-Control-Allow-Origin", "*", false);
  // Avoid confusing cache behaviors
  response.setHeader("Cache-Control", "no-cache", false);
  switch(request.queryString) {
    case "a":
     response.setHeader("X-TAINT", ´[{begin: 31, end: 54, source: "e2e"}]´, false);
     response.setHeader("Content-Type", "text/html; charset=utf-8");
     response.write(`<html lang="en"><body><div id="<img src= onerror=f()>">`);
     break;
    default:
     response.setHeader("Content-Type", "text/plain", false);
     response.write("hello!");

  }
}