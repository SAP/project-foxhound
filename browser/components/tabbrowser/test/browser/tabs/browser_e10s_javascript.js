add_task(async function () {
  let url = "javascript:dosomething()";

  is(
    ChromeUtils.predictRemoteTypeForURI(url, {
      useRemoteSubframes: false,
      preferredRemoteType: E10SUtils.NOT_REMOTE,
    }),
    E10SUtils.NOT_REMOTE,
    "Check URL in chrome process."
  );
  is(
    ChromeUtils.predictRemoteTypeForURI(url, {
      useRemoteSubframes: false,
      preferredRemoteType: E10SUtils.WEB_REMOTE_TYPE,
    }),
    E10SUtils.WEB_REMOTE_TYPE,
    "Check URL in web content process."
  );
});
