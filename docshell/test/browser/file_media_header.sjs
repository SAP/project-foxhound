/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

function handleRequest(request, response) {
  let accept = request.getHeader("Accept");

  // Make sure that the Accept header is for images.
  if (accept.startsWith("image/")) {
    switch (request.queryString) {
      case "imagePNG":
        response.setStatusLine(request.httpVersion, 200, "Ok");
        // Also test that the image is rendered inline.
        response.setHeader("Content-Disposition", "attachment");
        response.write(
          atob(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P4v5ThPwAG7wKklwQ/bwAAAABJRU5ErkJggg=="
          )
        );
        return;
      case "imageSVG": {
        response.setStatusLine(request.httpVersion, 200, "OK");
        response.setHeader("Content-Type", "image/svg+xml");
        response.write(
          `<svg height="100" width="100" xmlns="http://www.w3.org/2000/svg"><circle r="45" cx="50" cy="50" fill="blue" /></svg>`
        );
        return;
      }
    }
  } else if (accept === "*/*") {
    switch (request.queryString) {
      case "videoWebM":
        response.setStatusLine(request.httpVersion, 200, "Ok");
        response.setHeader("Content-Disposition", "attachment");
        response.setHeader("Content-Type", "video/webm");
        response.write(
          atob(
            "GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AAA="
          )
        );
        return;
    }
  }

  response.setStatusLine(request.httpVersion, 400, "Bad Request");
}
