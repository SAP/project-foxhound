/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let URLs, dates, today, component, contentWindow;

add_setup(async () => {
  const historyInfo = await populateHistory();
  URLs = historyInfo.URLs;
  dates = historyInfo.dates;
  today = dates[0];

  const sidebarInfo = await showHistorySidebar();
  component = sidebarInfo.component;
  contentWindow = sidebarInfo.contentWindow;
});

registerCleanupFunction(() => {
  SidebarController.hide();
  cleanUpExtraTabs();
});

add_task(async function test_navigation_sort_by_date() {
  const { lists, cards } = component;
  await BrowserTestUtils.waitForMutationCondition(
    component.shadowRoot,
    { childList: true, subtree: true },
    () => !!lists.length
  );
  await BrowserTestUtils.waitForMutationCondition(
    lists[0].shadowRoot,
    { subtree: true, childList: true },
    () => lists[0].rowEls.length === URLs.length
  );
  ok(true, "History rows are shown.");
  const rows = lists[0].rowEls;

  cards[0].summaryEl.focus();

  info("Focus the next row.");
  await focusWithKeyboard(rows[0], "KEY_ArrowDown", contentWindow);

  info("Focus the previous card.");
  await focusWithKeyboard(cards[0].summaryEl, "KEY_ArrowUp", contentWindow);

  info("Focus the next row.");
  await focusWithKeyboard(rows[0], "KEY_ArrowDown", contentWindow);

  info("Focus the next row.");
  await focusWithKeyboard(rows[1], "KEY_ArrowDown", contentWindow);

  info("Focus the next row.");
  await focusWithKeyboard(rows[2], "KEY_ArrowDown", contentWindow);

  info("Focus the next row.");
  await focusWithKeyboard(rows[3], "KEY_ArrowDown", contentWindow);

  info("Focus the next card.");
  await focusWithKeyboard(cards[1].summaryEl, "KEY_ArrowDown", contentWindow);

  info("Focus the previous row.");
  await focusWithKeyboard(rows[3], "KEY_ArrowUp", contentWindow);

  info("Open the focused link.");
  let browser = gBrowser.selectedBrowser;
  EventUtils.synthesizeKey("KEY_Enter", {}, contentWindow);
  await BrowserTestUtils.browserLoaded(browser, false, URLs[1]);
});

add_task(async function test_navigation_left_and_right_home_and_end_keys() {
  const { lists, cards } = component;
  cards[0].summaryEl.focus();

  info("From the header, focus the first visit using right arrow key.");
  await focusWithKeyboard(lists[0].rowEls[0], "KEY_ArrowRight", contentWindow);

  info("From the first visit, focus the header using left arrow key.");
  await focusWithKeyboard(cards[0].summaryEl, "KEY_ArrowLeft", contentWindow);

  info("Focus the last card using End key.");
  await focusWithKeyboard(
    cards[cards.length - 1].summaryEl,
    "KEY_End",
    contentWindow
  );

  info("Focus the first card using Home key.");
  await focusWithKeyboard(cards[0].summaryEl, "KEY_Home", contentWindow);
});

add_task(async function test_navigation_sort_by_date_and_site() {
  const { cards } = component;
  info("Sort history by date and site.");
  const {
    menuButton,
    _menu: menu,
    _menuSortByDateSite: sortByDateSiteButton,
  } = component;
  let promiseMenuShown = BrowserTestUtils.waitForEvent(menu, "popupshown");
  EventUtils.synthesizeMouseAtCenter(menuButton, {}, contentWindow);
  await promiseMenuShown;
  menu.activateItem(sortByDateSiteButton);

  // Wait for nested cards to appear.
  await BrowserTestUtils.waitForMutationCondition(
    component.shadowRoot,
    { childList: true, subtree: true },
    () => component.shadowRoot.querySelector(".nested-card")
  );

  info("Focus the first date.");
  const firstDateCard = cards[0];
  firstDateCard.summaryEl.focus();

  info("Collapse and expand the card using arrow keys.");
  EventUtils.synthesizeKey("KEY_ArrowLeft", {}, contentWindow);
  await BrowserTestUtils.waitForMutationCondition(
    firstDateCard,
    { attributeFilter: ["expanded"] },
    () => !firstDateCard.expanded
  );
  EventUtils.synthesizeKey("KEY_ArrowRight", {}, contentWindow);
  await BrowserTestUtils.waitForMutationCondition(
    firstDateCard,
    { attributeFilter: ["expanded"] },
    () => firstDateCard.expanded
  );

  info("Move down to the first site.");
  const firstSiteCard = firstDateCard.querySelector(".nested-card");
  await focusWithKeyboard(
    firstSiteCard.summaryEl,
    "KEY_ArrowDown",
    contentWindow
  );

  info("Move back up to the date header.");
  await focusWithKeyboard(
    firstDateCard.summaryEl,
    "KEY_ArrowUp",
    contentWindow
  );

  info("Focus the last site, then move down to the second date.");
  const lastSiteCard = firstDateCard.querySelector(".last-card");
  lastSiteCard.summaryEl.focus();
  const secondDateCard = component.shadowRoot.querySelectorAll(".date-card")[1];
  await focusWithKeyboard(
    secondDateCard.summaryEl,
    "KEY_ArrowDown",
    contentWindow
  );

  info("Move back up to the site header.");
  await focusWithKeyboard(lastSiteCard.summaryEl, "KEY_ArrowUp", contentWindow);
});

add_task(async function test_navigation_sort_by_last_visited() {
  const {
    menuButton,
    _menu: menu,
    _menuSortByLastVisited: sortByLastVisitedButton,
  } = component;
  info("Sort history by last visited.");
  let promiseMenuShown = BrowserTestUtils.waitForEvent(menu, "popupshown");
  EventUtils.synthesizeMouseAtCenter(menuButton, {}, contentWindow);
  await promiseMenuShown;
  menu.activateItem(sortByLastVisitedButton);

  // No containers when sorting by last visited.
  // Wait until we have a single card and a single list.
  await BrowserTestUtils.waitForMutationCondition(
    component.shadowRoot,
    { childList: true, subtree: true },
    () => component.cards.length === 1 && component.lists.length === 1
  );

  info("Focus the first row and open the focused link.");
  const tabList = component.lists[0];
  await BrowserTestUtils.waitForMutationCondition(
    tabList.shadowRoot,
    { childList: true, subtree: true },
    () => tabList.rowEls.length === URLs.length
  );
  tabList.rowEls[0].focus();
  let browser = gBrowser.selectedBrowser;
  EventUtils.synthesizeKey("KEY_Enter", {}, contentWindow);
  await BrowserTestUtils.browserLoaded(browser, false, URLs[1]);
});
