/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
/* eslint max-len: ["error", 80] */

"use strict";

// Register mock custom fluent strings provided from an embedder app.
const l10nReg = L10nRegistry.getInstance();
const mockFluentSourceText = `
test-addon-card-embedder-message =
  .message = Custom embedder message.
test-addon-card-embedder-message-with-args =
  .message = Custom embedder message with custom args "{ $customArgName }".
`;
const mockFluentSource = L10nFileSource.createMock(
  "mock-embedder-locales",
  "app",
  ["en-US"],
  "/localization/{locale}/",
  [
    {
      path: "/localization/en-US/mock-embedder-locales.ftl",
      source: mockFluentSourceText,
    },
  ]
);
l10nReg.registerSources([mockFluentSource]);
registerCleanupFunction(() => {
  l10nReg.removeSources([mockFluentSource.name]);
});

let gProvider;

add_setup(async function () {
  gProvider = new MockProvider();
});

function getAddonCardCtor(win) {
  return win.customElements.get("addon-card");
}

async function loadInitialViewAndAddMockFluentRes(viewId) {
  const win = await loadInitialView(viewId);
  win.MozXULElement.insertFTLIfNeeded("mock-embedder-locales.ftl");
  return win;
}

async function waitForMessage(card, predicate) {
  info(`Waiting for addon-card message for "${card.addon.id}" to be updated`);
  const messageBar = card.querySelector(".addon-card-message");
  await BrowserTestUtils.waitForMutationCondition(
    messageBar,
    { attributes: true, attributeFilter: ["type", "hidden"] },
    () => predicate(messageBar)
  );
  return messageBar;
}

add_task(async function test_setEmbedderHooks_overrides_message_info() {
  const id = "embedder-hook@mochi.test";
  gProvider.createAddons([
    {
      id,
      name: "Embedder Hook Test",
      type: "extension",
      userDisabled: true,
    },
  ]);

  const win = await loadInitialViewAndAddMockFluentRes("extension");
  const AddonCard = getAddonCardCtor(win);

  let receivedAddon;
  let receivedOptions;
  AddonCard.setEmbedderHooks({
    async getAddonMessageInfo(addon, options) {
      info("getAddonMessageInfo hook call received");
      if (addon.id === id) {
        receivedAddon = addon;
        receivedOptions = options;
      }
      return {
        messageId: "test-addon-card-embedder-message-with-args",
        messageArgs: { customArgName: "customArgValue" },
        type: "warning",
      };
    },
  });

  const card = win.document.querySelector(`addon-card[addon-id="${id}"]`);
  await card.updateMessage();
  const messageBar = await waitForMessage(
    card,
    bar => !bar.hidden && bar.getAttribute("type") === "warning"
  );

  is(receivedAddon?.id, id, "hook received the addon");
  Assert.deepEqual(
    Object.keys(receivedOptions ?? {}).sort(),
    ["isCardExpanded", "isInDisabledSection"],
    "hook received the documented options"
  );
  is(receivedOptions.isCardExpanded, false, "isCardExpanded is false in list");
  is(
    receivedOptions.isInDisabledSection,
    true,
    "isInDisabledSection is true in list for a disabled addon"
  );
  is(
    messageBar.getAttribute("type"),
    "warning",
    "custom message type is rendered"
  );
  Assert.deepEqual(
    win.document.l10n.getAttributes(messageBar),
    {
      id: "test-addon-card-embedder-message-with-args",
      args: { customArgName: "customArgValue" },
    },
    "custom message has the expected l10n attributes"
  );

  AddonCard.setEmbedderHooks();
  await closeView(win);
});

add_task(async function test_clearing_hook_restores_default() {
  const id = "embedder-hook-clear@mochi.test";
  gProvider.createAddons([
    {
      id,
      name: "Embedder Hook Clear Test",
      type: "extension",
    },
  ]);

  const win = await loadInitialViewAndAddMockFluentRes("extension");
  const AddonCard = getAddonCardCtor(win);

  async function testClearingHooksValue(testedClearHooksValue) {
    info(
      `Test getAddonMessageInfo hooks cleared on value set as ${JSON.stringify(
        testedClearHooksValue
      )}`
    );
    // Override the hook first.
    AddonCard.setEmbedderHooks({
      async getAddonMessageInfo() {
        return {
          messageId: "test-addon-card-embedder-message",
          type: "error",
        };
      },
    });

    const card = win.document.querySelector(`addon-card[addon-id="${id}"]`);
    await card.updateMessage();
    const messageBar = await waitForMessage(
      card,
      bar => !bar.hidden && bar.getAttribute("type") === "error"
    );
    Assert.deepEqual(
      win.document.l10n.getAttributes(messageBar),
      {
        id: "test-addon-card-embedder-message",
        args: null,
      },
      "custom message has the expected l10n attributes"
    );

    // Then set it again with one of the values that are expected to reset
    // it and expect the refreshed card to have the message hidden.
    AddonCard.setEmbedderHooks(testedClearHooksValue);
    await card.updateMessage();
    await waitForMessage(card, bar => bar.hidden);
    ok(
      card.querySelector(".addon-card-message").hidden,
      "default behavior restored: no message for a plain extension"
    );
  }

  await testClearingHooksValue({ getAddonMessageInfo: null });
  await testClearingHooksValue({});
  await testClearingHooksValue(null);
  await testClearingHooksValue();

  await closeView(win);
});

add_task(
  async function test_setEmbedderHooks_overrides_message_info_expanded() {
    const id = "embedder-hook-expanded@mochi.test";
    gProvider.createAddons([
      {
        id,
        name: "Embedder Hook Expanded Test",
        type: "extension",
        userDisabled: true,
      },
    ]);

    const win = await loadInitialViewAndAddMockFluentRes(
      `addons://detail/${encodeURIComponent(id)}`
    );
    const AddonCard = getAddonCardCtor(win);

    let receivedAddon;
    let receivedOptions;
    AddonCard.setEmbedderHooks({
      async getAddonMessageInfo(addon, options) {
        if (addon.id === id) {
          receivedAddon = addon;
          receivedOptions = options;
          return {
            messageId: "test-addon-card-embedder-message",
            type: "warning",
          };
        }
        return {};
      },
    });

    const detailCard = win.document.querySelector(
      `addon-card[addon-id="${id}"]`
    );
    ok(detailCard.expanded, "card is in expanded mode");
    await detailCard.updateMessage();

    const messageBar = await waitForMessage(
      detailCard,
      bar => !bar.hidden && bar.getAttribute("type") === "warning"
    );
    is(
      receivedOptions?.isCardExpanded,
      true,
      "hook received isCardExpanded=true in detail view"
    );
    is(
      receivedOptions?.isInDisabledSection,
      false,
      "hook received isInDisabledSection=false in detail view"
    );
    is(
      receivedAddon?.isActive,
      false,
      "hook received addon with isActive=false"
    );

    Assert.deepEqual(
      win.document.l10n.getAttributes(messageBar),
      {
        id: "test-addon-card-embedder-message",
        args: null,
      },
      "custom message has the expected l10n attributes"
    );

    AddonCard.setEmbedderHooks();
    await closeView(win);
  }
);
