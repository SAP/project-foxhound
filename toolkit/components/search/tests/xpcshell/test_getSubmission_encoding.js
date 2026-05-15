/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const prefix = "https://www.example.com/search";

add_setup(async function () {
  SearchTestUtils.setRemoteSettingsConfig([
    {
      identifier: "utf8_param",
      base: {
        charset: "UTF-8",
        urls: {
          search: {
            base: "https://www.example.com/search",
            searchTermParamName: "q",
          },
        },
      },
    },
    {
      identifier: "utf8_url",
      base: {
        charset: "UTF-8",
        urls: {
          search: {
            base: "https://www.example.com/search/{searchTerms}",
          },
        },
      },
    },
    { identifier: "windows1252", base: { charset: "windows-1252" } },
  ]);
  await SearchService.init();
});

function testEncode(engine, charset, query, expected) {
  Assert.equal(
    engine.getSubmission(query).uri.spec,
    prefix + expected,
    `Should have correctly encoded for ${charset}`
  );
}

add_task(async function test_getSubmission_utf8_param() {
  let engine = SearchService.getEngineById("utf8_param");
  // Space should be encoded to + since the search terms are a parameter.
  testEncode(engine, "UTF-8", "caff\u00E8 shop +", "?q=caff%C3%A8+shop+%2B");
});

add_task(async function test_getSubmission_utf8_url() {
  let engine = SearchService.getEngineById("utf8_url");
  // Space should be encoded to %20 since the search terms are part of the URL.
  testEncode(engine, "UTF-8", "caff\u00E8 shop +", "/caff%C3%A8%20shop%20%2B");
});

add_task(async function test_getSubmission_windows1252() {
  let engine = SearchService.getEngineById("windows1252");
  testEncode(engine, "windows-1252", "caff\u00E8+", "?q=caff%E8%2B");
});

// Spaces are percent-encoded to either + or %20, depending on the url component.
add_task(async function test_encoding_of_spaces() {
  info("Testing spaces in query.");
  let engine = await SearchService.addUserEngine({
    name: "user",
    url: "https://example.com/user?q={searchTerms}#ref",
  });
  Assert.equal(
    engine.getSubmission("f o o").uri.spec,
    "https://example.com/user?q=f+o+o#ref",
    "Encodes spaces in query as +."
  );
  await SearchService.removeEngine(engine);

  info("Testing spaces in path.");
  engine = await SearchService.addUserEngine({
    name: "user",
    url: "https://example.com/user/{searchTerms}?que=ry#ref",
  });
  Assert.equal(
    engine.getSubmission("f o o").uri.spec,
    "https://example.com/user/f%20o%20o?que=ry#ref",
    "Encodes spaces in path as %20."
  );
  await SearchService.removeEngine(engine);

  info("Testing spaces in ref.");
  engine = await SearchService.addUserEngine({
    name: "user",
    url: "https://example.com/user?que=ry#{searchTerms}",
  });
  Assert.equal(
    engine.getSubmission("f o o").uri.spec,
    "https://example.com/user?que=ry#f%20o%20o",
    "Encodes spaces in ref as %20."
  );
  await SearchService.removeEngine(engine);

  info("Testing spaces in post data.");
  let params = new URLSearchParams();
  params.append("q", "{searchTerms}");
  engine = await SearchService.addUserEngine({
    name: "user",
    url: "https://example.com/user",
    params,
    method: "POST",
  });
  let submission = engine.getSubmission("f o o");
  Assert.equal(submission.uri.spec, "https://example.com/user");
  Assert.equal(
    SearchTestUtils.getPostDataString(submission),
    "q=f+o+o",
    "Encodes spaces in body as +."
  );
  await SearchService.removeEngine(engine);
});
