/**
 * Tests that FormAutofillPreferences.makePaymentsListItems() renders the saved
 * payment methods list even when a stored credit card has no expiration date.
 *
 * Regression test for Bug 2048383: a card saved without an expiry has its empty
 * "cc-exp" stripped by getAll()'s _cloneAndCleanUp(), so the unguarded
 * record["cc-exp"].replace() threw and left the whole settings list empty.
 */

"use strict";

let formAutofillStorage;
let FormAutofillPreferences;

add_setup(async () => {
  ({ formAutofillStorage } = ChromeUtils.importESModule(
    "resource://autofill/FormAutofillStorage.sys.mjs"
  ));
  ({ FormAutofillPreferences } = ChromeUtils.importESModule(
    "resource://autofill/FormAutofillPreferences.sys.mjs"
  ));
  await formAutofillStorage.initialize();
});

const CARD_WITH_EXPIRY = {
  "cc-name": "John Doe",
  "cc-number": "4929001587121045",
  "cc-exp-month": 4,
  "cc-exp-year": 2027,
};

const CARD_WITHOUT_EXPIRY = {
  "cc-name": "Jane Doe No Expiry",
  "cc-number": "4111111111111111",
};

add_task(async function test_list_renders_card_without_expiry() {
  let guidWithExpiry =
    await formAutofillStorage.creditCards.add(CARD_WITH_EXPIRY);
  let guidWithoutExpiry =
    await formAutofillStorage.creditCards.add(CARD_WITHOUT_EXPIRY);

  // Sanity check the precondition: getAll() strips the empty cc-exp, so the
  // record that reaches the renderer has no cc-exp field at all.
  let records = await formAutofillStorage.creditCards.getAll();
  let stripped = records.find(r => r.guid == guidWithoutExpiry);
  Assert.ok(stripped, "Card without expiry is returned by getAll()");
  Assert.ok(
    !("cc-exp" in stripped),
    "Empty cc-exp is stripped from the returned record"
  );

  // This previously threw (TypeError on undefined.replace), rejecting the
  // promise and leaving the panel empty.
  let items = await FormAutofillPreferences.prototype.makePaymentsListItems();

  let paymentItems = items.filter(item => item.id == "payment-item");
  Assert.equal(paymentItems.length, 2, "Both saved cards are listed");

  let itemWithoutExpiry = paymentItems.find(item =>
    item.options.some(opt => opt.controlAttrs?.guid == guidWithoutExpiry)
  );
  Assert.ok(itemWithoutExpiry, "Card without expiry appears in the list");
  Assert.equal(
    itemWithoutExpiry.l10nArgs.expDate,
    "",
    "Card without expiry renders with an empty expiry string"
  );

  let itemWithExpiry = paymentItems.find(item =>
    item.options.some(opt => opt.controlAttrs?.guid == guidWithExpiry)
  );
  Assert.equal(
    itemWithExpiry.l10nArgs.expDate,
    `${String(CARD_WITH_EXPIRY["cc-exp-month"]).padStart(2, "0")}/${CARD_WITH_EXPIRY["cc-exp-year"]}`,
    "Card with expiry renders its formatted expiry"
  );

  await formAutofillStorage.creditCards.removeAll();
});
