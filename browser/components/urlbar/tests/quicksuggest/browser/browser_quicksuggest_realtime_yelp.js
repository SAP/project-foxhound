/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const TEST_MERINO_SINGLE = [
  {
    provider: "yelp",
    is_sponsored: false,
    score: 0,
    title: "Yelp Suggestion",
    custom_details: {
      yelp: {
        values: [
          {
            name: "MochaZilla. - Toronto",
            url: "https://example.com/mochazilla-toronto",
            image_url: "https://example.com/mochazilla.jpg",
            address: "123 Firefox Avenue Toronto",
            pricing: "$$",
            rating: 4.8,
            review_count: 989,
            business_hours: [
              {
                open: [
                  { is_overnight: false, start: "0700", end: "1500", day: 0 },
                  { is_overnight: false, start: "0700", end: "1500", day: 1 },
                  { is_overnight: false, start: "0700", end: "1500", day: 2 },
                  { is_overnight: false, start: "0700", end: "1500", day: 3 },
                  { is_overnight: false, start: "0700", end: "1500", day: 4 },
                  { is_overnight: false, start: "0700", end: "1500", day: 5 },
                  { is_overnight: false, start: "0700", end: "1500", day: 6 },
                ],
                hours_type: "REGULAR",
                is_open_now: false,
              },
            ],
          },
        ],
      },
    },
  },
];

const TEST_MERINO_MULTI = [
  {
    provider: "yelp",
    is_sponsored: false,
    score: 0,
    title: "Yelp Suggestion",
    custom_details: {
      yelp: {
        values: [
          {
            name: "MochaZilla. - Toronto",
            url: "https://example.com/mochazilla-toronto",
            image_url: "https://example.com/mochazilla.jpg",
            address: "123 Firefox Avenue Toronto",
            pricing: "$$",
            rating: 4.8,
            review_count: 989,
            business_hours: [
              {
                open: [
                  { is_overnight: false, start: "0700", end: "1500", day: 0 },
                  { is_overnight: false, start: "0700", end: "1500", day: 1 },
                  { is_overnight: false, start: "0700", end: "1500", day: 2 },
                  { is_overnight: false, start: "0700", end: "1500", day: 3 },
                  { is_overnight: false, start: "0700", end: "1500", day: 4 },
                  { is_overnight: false, start: "0700", end: "1500", day: 5 },
                  { is_overnight: false, start: "0700", end: "1500", day: 6 },
                ],
                hours_type: "REGULAR",
                is_open_now: false,
              },
            ],
          },
          {
            name: "MochaZilla. - Tokyo",
            url: "https://example.com/mochazilla-tokyo",
            image_url: "https://example.com/mochazilla.jpg",
            address: "123 Firefox Avenue Tokyo",
            pricing: "$$",
            rating: 4.5,
            review_count: 789,
            business_hours: [
              {
                open: [
                  { is_overnight: false, start: "0700", end: "1500", day: 0 },
                  { is_overnight: false, start: "0700", end: "1500", day: 1 },
                  { is_overnight: false, start: "0700", end: "1500", day: 2 },
                  { is_overnight: false, start: "0700", end: "1500", day: 3 },
                  { is_overnight: false, start: "0700", end: "1500", day: 4 },
                  { is_overnight: false, start: "0700", end: "1500", day: 5 },
                  { is_overnight: false, start: "0700", end: "1500", day: 6 },
                ],
                hours_type: "REGULAR",
                is_open_now: true,
              },
            ],
          },
        ],
      },
    },
  },
];

add_setup(async function () {
  await SearchTestUtils.installSearchExtension({}, { setAsDefault: true });
  registerCleanupFunction(async () => {
    await PlacesUtils.history.clear();
  });

  await QuickSuggestTestUtils.ensureQuickSuggestInit({
    merinoSuggestions: TEST_MERINO_SINGLE,
    prefs: [
      ["yelpRealtime.featureGate", true],
      ["suggest.yelpRealtime", true],
      ["suggest.quicksuggest.all", true],
    ],
  });
});

add_task(async function ui_single() {
  MerinoTestUtils.server.response.body.suggestions = TEST_MERINO_SINGLE;

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "only match the Merino suggestion",
  });
  let { element, result } = await UrlbarTestUtils.getDetailsOfResultAt(
    window,
    1
  );
  let { row } = element;

  info("Check the result");
  Assert.ok(result.isBestMatch);

  info("Check the group label");
  Assert.equal(getComputedStyle(row, "::before").content, "none");
  Assert.ok(!row.hasAttribute("label"));

  Assert.deepEqual(
    document.l10n.getAttributes(row._content),
    {
      id: null,
      args: null,
    },
    "ARIA group label should not be set on the row inner"
  );

  info("Check the item");
  let items = row.querySelectorAll(".urlbarView-realtime-item");
  Assert.equal(items.length, 1);
  let target = TEST_MERINO_SINGLE[0].custom_details.yelp.values[0];
  assertItemUI(items[0], {
    image: target.image_url,
    title: target.name,
    address: target.address,
    pricing: target.pricing,
    isOpen: target.business_hours[0].is_open_now,
    popularity: `${target.rating} (${target.review_count})`,
  });

  await UrlbarTestUtils.promisePopupClose(window);
});

add_task(async function activate_single() {
  MerinoTestUtils.server.response.body.suggestions = TEST_MERINO_SINGLE;

  for (let mouse of [true, false]) {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: "only match the Merino suggestion",
    });
    let { element } = await UrlbarTestUtils.getDetailsOfResultAt(window, 1);
    let { row } = element;

    let target = TEST_MERINO_SINGLE[0].custom_details.yelp.values[0];
    let expectedURL = target.url;
    let newTabOpened = BrowserTestUtils.waitForNewTab(gBrowser, expectedURL);

    if (mouse) {
      info("Activate by mouse");
      let root = row.querySelector(".urlbarView-realtime-root");
      EventUtils.synthesizeMouseAtCenter(root, {});
    } else {
      info("Activate by key");
      EventUtils.synthesizeKey("KEY_Tab");
      Assert.equal(
        UrlbarTestUtils.getSelectedRow(window),
        row,
        "The row should be selected"
      );
      EventUtils.synthesizeKey("KEY_Enter");
    }

    let newTab = await newTabOpened;
    Assert.ok(true, `Expected URL is loaded [${expectedURL}]`);

    await UrlbarTestUtils.promisePopupClose(window);
    BrowserTestUtils.removeTab(newTab);
    await PlacesUtils.history.clear();
  }
});

add_task(async function ui_multi() {
  MerinoTestUtils.server.response.body.suggestions = TEST_MERINO_MULTI;

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "only match the Merino suggestion",
  });
  let { element } = await UrlbarTestUtils.getDetailsOfResultAt(window, 1);

  let items = element.row.querySelectorAll(".urlbarView-realtime-item");
  Assert.equal(items.length, 2);

  Assert.deepEqual(
    document.l10n.getAttributes(element.row._content),
    {
      id: "urlbar-result-aria-group-yelp-realtime",
      args: null,
    },
    "ARIA group label should be set on the row inner"
  );

  for (let i = 0; i < items.length; i++) {
    info(`Check the item[${i}]`);
    let target = TEST_MERINO_MULTI[0].custom_details.yelp.values[i];
    assertItemUI(items[i], {
      image: target.image_url,
      title: target.name,
      address: target.address,
      pricing: target.pricing,
      isOpen: target.business_hours[0].is_open_now,
      popularity: `${target.rating} (${target.review_count})`,
    });
  }

  await UrlbarTestUtils.promisePopupClose(window);
  gURLBar.handleRevert();
});

add_task(async function activate_multi() {
  MerinoTestUtils.server.response.body.suggestions = TEST_MERINO_MULTI;

  for (let [
    index,
    value,
  ] of TEST_MERINO_MULTI[0].custom_details.yelp.values.entries()) {
    info(`Activate item[${index}] by mouse`);
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: "only match the Merino suggestion",
    });
    let { element } = await UrlbarTestUtils.getDetailsOfResultAt(window, 1);

    let items = element.row.querySelectorAll(".urlbarView-realtime-item");
    let item = items[index];

    let newTabOpened = BrowserTestUtils.waitForNewTab(gBrowser, value.url);
    await EventUtils.synthesizeMouseAtCenter(item, {}, item.ownerGlobal);
    let newTab = await newTabOpened;
    Assert.ok(true, `Expected URL is loaded [${value.url}]`);
    BrowserTestUtils.removeTab(newTab);
    await PlacesUtils.history.clear();
  }

  for (let [
    index,
    value,
  ] of TEST_MERINO_MULTI[0].custom_details.yelp.values.entries()) {
    info(`Activate item[${index}] by key`);
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: "only match the Merino suggestion",
    });
    let { element } = await UrlbarTestUtils.getDetailsOfResultAt(window, 1);

    for (let i = 0; i < index + 1; i++) {
      EventUtils.synthesizeKey("KEY_Tab");
    }

    let items = element.row.querySelectorAll(".urlbarView-realtime-item");
    let item = items[index];

    let newTabOpened = BrowserTestUtils.waitForNewTab(gBrowser, value.url);
    await EventUtils.synthesizeMouseAtCenter(item, {}, item.ownerGlobal);
    let newTab = await newTabOpened;
    Assert.ok(true, `Expected URL is loaded [${value.url}]`);
    BrowserTestUtils.removeTab(newTab);
    await PlacesUtils.history.clear();
  }

  await UrlbarTestUtils.promisePopupClose(window);
  gURLBar.handleRevert();
});

function assertItemUI(item, expected) {
  Assert.equal(
    item.querySelector(".urlbarView-realtime-image").src,
    expected.image
  );
  Assert.equal(
    item.querySelector(".urlbarView-yelpRealtime-title").textContent,
    expected.title
  );
  Assert.equal(
    item.querySelector(".urlbarView-yelpRealtime-description-address")
      .textContent,
    expected.address
  );
  Assert.equal(
    item.querySelector(".urlbarView-yelpRealtime-description-pricing")
      .textContent,
    expected.pricing
  );
  let businessHours = item.querySelector(
    ".urlbarView-yelpRealtime-description-business-hours"
  );
  let openState = businessHours.querySelector("span");
  if (expected.isOpen) {
    Assert.equal(item.getAttribute("state"), "open");
    Assert.equal(openState.textContent.trim(), "Open");
  } else {
    Assert.equal(item.getAttribute("state"), "closed");
    Assert.equal(openState.textContent.trim(), "Closed");
  }
  // TODO: Test for time until after figing the timezone issue.
  // Assert.equal(
  //   openState.nextSibling.textContent.trim().replace(/\n/g, " "),
  //   "until 3pm"
  // );
  Assert.equal(
    item.querySelector(".urlbarView-yelpRealtime-description-popularity")
      .textContent,
    expected.popularity
  );
}
