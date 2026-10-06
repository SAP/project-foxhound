/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

async function fetchJson(url) {
  const file = do_get_file(url);
  const data = await IOUtils.readUTF8(file.path);
  return JSON.parse(data);
}

add_task(async function test_validSchemas() {
  const VALID_SHARES = await fetchJson("validContentSharing.0.1.0.json");
  for (const share of VALID_SHARES) {
    const result = await ContentSharingUtils.validateSchema(
      makeShareResult({ share: share.test })
    );
    Assert.equal(
      result.error,
      null,
      "There should be no error in the share result"
    );
    Assert.equal(
      result.warning,
      null,
      "There should be no warning in the share result"
    );
  }
});

add_task(async function test_invalidSchemas() {
  const INVALID_SHARES = await fetchJson("invalidContentSharing.0.1.0.json");
  for (const share of INVALID_SHARES) {
    const result = await ContentSharingUtils.validateSchema(
      makeShareResult({ share: share.test })
    );
    Assert.equal(
      result.error,
      ERRORS.INVALID_SCHEMA,
      "ERRORS.INVALID_SCHEMA should be set on the share result"
    );
  }
});
