function readStream(inputStream) {
  let available = 0;
  let result = [];
  while ((available = inputStream.available()) > 0) {
    result.push(inputStream.readBytes(available));
  }

  return result.join("");
}

function handleRequest(request, response) {
  response.setStatusLine(request.httpVersion, 200, "Ok");
  response.setHeader("Content-Type", "text/html");
  response.setHeader("Cache-Control", "no-cache");

  let bis = Cc["@mozilla.org/binaryinputstream;1"].createInstance(
    Ci.nsIBinaryInputStream
  );
  bis.setInputStream(request.bodyInputStream);
  if (readStream(bis).includes("testfile")) {
    response.write("SUCCESS");
  } else {
    response.write("FAIL");
  }
}
