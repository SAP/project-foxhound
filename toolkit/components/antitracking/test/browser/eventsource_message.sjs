function handleRequest(request, response) {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache");
  response.write("data: msg 1\n");
  response.write("id: 1\n\n");
}
