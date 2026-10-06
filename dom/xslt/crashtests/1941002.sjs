let { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

function handleRequest(request, response) {
  response.processAsync();

  response.setHeader(
    "Cache-Control",
    "no-cache, no-store, must-revalidate",
    false
  );
  response.setHeader("Pragma", "no-cache", false);
  response.setHeader("Expires", "0", false);
  setTimeout(() => {
    response.write(`<?xml version="1.0" encoding="UTF-8"?>
                    <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" />`);
    response.finish();
  }, 1000);
}
