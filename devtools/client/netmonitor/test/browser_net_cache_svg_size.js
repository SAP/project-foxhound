/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * This test ensures that the size of an (SVG-)icon is displayed correctly, even when it comes from the cache.
 */
add_task(async function () {
  const uniqueTimeStamp = new Date().getTime();
  const svgImgFilePath = `/img_${uniqueTimeStamp}.svg`;
  console.log("using the following path for the sample SVG: " + svgImgFilePath);
  const svgImgContent = `
	<svg width="16" height="16" viewBox="0 0 135 140" xmlns="http://www.w3.org/2000/svg" fill="#494949">
	    <!-- some comment -->
	    <rect y="10" width="15" height="120" rx="6"></rect>
	</svg>`;
  const svgImgSize = svgImgContent.length;

  const htmlContent = `
		<html>
			<body>
				<img src="${svgImgFilePath}">
			</body>
		<html>`;
  const htmlFilePath = "/index.html";

  const httpServer = createTestHTTPServer();
  httpServer.registerContentType("image/svg+xml");
  httpServer.registerPathHandler(svgImgFilePath, function (request, response) {
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Content-Type", "image/svg+xml");
    response.setHeader("Cache-Control", "max-age=1000000");
    response.write(svgImgContent);
  });
  httpServer.registerPathHandler(htmlFilePath, function (request, response) {
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Content-Type", "text/html");
    response.write(htmlContent);
  });
  const port = httpServer.identity.primaryPort;
  const serverEndpoint = `http://localhost:${port}`;

  const { monitor } = await initNetMonitor(serverEndpoint, {
    enableCache: true,
    requestCount: 1,
  });
  const { document, store, windowRequire } = monitor.panelWin;
  const Actions = windowRequire("devtools/client/netmonitor/src/actions/index");

  const requestPageWithImage = async function () {
    const onNetworkEvent = waitForNetworkEvents(monitor, 2);
    await navigateTo(serverEndpoint + htmlFilePath);
    await onNetworkEvent;
  };
  const assertImgRequest = async function (expectedStatusCode) {
    const requests = document.querySelectorAll(".request-list-item");
    is(
      requests.length,
      2,
      "Only the html page and the image should have been fetched."
    );
    const imgRequestIndex = 1;
    const imgRequest = requests[imgRequestIndex];
    const contentLengthText = imgRequest.querySelector(
      ".requests-list-size"
    ).textContent;
    is(
      contentLengthText,
      svgImgSize + " B",
      "Size must match the original defined one"
    );

    const statusCode = imgRequest
      .querySelector(".requests-list-status-code")
      .getAttribute("data-status-code");
    is(
      statusCode,
      expectedStatusCode,
      "Status should be " + expectedStatusCode
    );

    store.dispatch(Actions.selectRequestByIndex(imgRequestIndex));
    await waitFor(() => document.querySelector(".headers-overview"));
    const summaryValues = Array.from(
      document.querySelectorAll(".tabpanel-summary-container")
    );
    const transferredSizeContainer = summaryValues.find(container => {
      const label = container.querySelector(".tabpanel-summary-label ");
      return (
        label &&
        label.textContent === L10N.getStr("netmonitor.toolbar.transferred")
      );
    });
    const transferredSizeValueDiv =
      transferredSizeContainer &&
      transferredSizeContainer.querySelector(".tabpanel-summary-value");
    const transferredSizeText =
      transferredSizeValueDiv && transferredSizeValueDiv.textContent;
    is(
      transferredSizeText && transferredSizeText.includes("" + svgImgSize),
      true,
      "The correct immage size should be contained"
    );
  };

  // request first time without cache:
  await requestPageWithImage();
  await assertImgRequest("200");

  // request the second time (now image should be cached)
  await requestPageWithImage();
  await assertImgRequest("cached");
});
