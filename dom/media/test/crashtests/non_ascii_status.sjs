function handleRequest(request, response) {
  // Return 404 with non-ASCII bytes in the status text.
  response.setStatusLine(request.httpVersion, 404, "Not\x80\x81Found");
  response.setHeader("Content-Type", "video/mp4");
  response.write("", 0);
}
