/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { OnboardingMessageProvider } = ChromeUtils.importESModule(
  "resource:///modules/asrouter/OnboardingMessageProvider.sys.mjs"
);

async function getFeedbackMessage(type) {
  const messages = await OnboardingMessageProvider.getUntranslatedMessages();
  const id =
    type === "thumbs-up"
      ? "SMARTWINDOW_FEEDBACK_MODAL_POSITIVE"
      : "SMARTWINDOW_FEEDBACK_MODAL_NEGATIVE";
  return messages.find(m => m.id === id);
}

add_task(async function test_thumbs_up_has_no_multiselect() {
  const message = await getFeedbackMessage("thumbs-up");
  const tiles = message.content.screens[0].content.tiles;
  const hasMultiselect = tiles.some(t => t.type === "multiselect");
  Assert.ok(!hasMultiselect, "thumbs-up modal should not include multiselect");
});

add_task(async function test_thumbs_down_has_multiselect() {
  const message = await getFeedbackMessage("thumbs-down");
  const tiles = message.content.screens[0].content.tiles;
  const multiselect = tiles.find(t => t.type === "multiselect");
  Assert.ok(multiselect, "thumbs-down modal should include multiselect");
});

add_task(async function test_thumbs_down_reasons_use_string_ids() {
  const message = await getFeedbackMessage("thumbs-down");
  const tiles = message.content.screens[0].content.tiles;
  const multiselect = tiles.find(t => t.type === "multiselect");
  Assert.ok(
    multiselect.data.every(r => r.label?.string_id),
    "all reason labels should use string_id for localization"
  );
});

add_task(async function test_both_variants_have_textarea() {
  for (const type of ["thumbs-up", "thumbs-down"]) {
    const message = await getFeedbackMessage(type);
    const tiles = message.content.screens[0].content.tiles;
    Assert.ok(
      tiles.some(t => t.type === "textarea"),
      `${type} modal should include a textarea`
    );
  }
});

add_task(async function test_learn_more_action_defined() {
  for (const type of ["thumbs-up", "thumbs-down"]) {
    const message = await getFeedbackMessage(type);
    Assert.ok(
      message.content.screens[0].content["learn-more"]?.action,
      `${type} modal should define a learn_more action`
    );
  }
});

add_task(async function test_write_in_microsurvey_enabled() {
  for (const type of ["thumbs-up", "thumbs-down"]) {
    const message = await getFeedbackMessage(type);
    Assert.ok(
      message.content.write_in_microsurvey,
      `${type} modal should have write_in_microsurvey set`
    );
  }
});

add_task(async function test_positive_negative_have_distinct_message_ids() {
  const positiveMessage = await getFeedbackMessage("thumbs-up");
  const negativeMessage = await getFeedbackMessage("thumbs-down");
  Assert.equal(
    positiveMessage.id,
    "SMARTWINDOW_FEEDBACK_MODAL_POSITIVE",
    "thumbs-up should use SMARTWINDOW_FEEDBACK_MODAL_POSITIVE"
  );
  Assert.equal(
    negativeMessage.id,
    "SMARTWINDOW_FEEDBACK_MODAL_NEGATIVE",
    "thumbs-down should use SMARTWINDOW_FEEDBACK_MODAL_NEGATIVE"
  );
});

add_task(async function test_both_variants_collect_text_input() {
  for (const type of ["thumbs-up", "thumbs-down"]) {
    const message = await getFeedbackMessage(type);
    const action = message.content.screens[0].content.primary_button.action;
    Assert.ok(
      action.collectTextInput,
      `${type} primary button action should have collectTextInput`
    );
  }
});

add_task(async function test_thumbs_up_submit_not_disabled() {
  const message = await getFeedbackMessage("thumbs-up");
  Assert.ok(
    !message.content.screens[0].content.primary_button.disabled,
    "thumbs-up submit button should not be disabled"
  );
});

add_task(async function test_thumbs_down_submit_not_disabled() {
  const message = await getFeedbackMessage("thumbs-down");
  Assert.ok(
    !message.content.screens[0].content.primary_button.disabled,
    "thumbs-down submit button should not have disabled set (textarea is optional)"
  );
});

add_task(async function test_both_variants_use_feedbackThumbClick_trigger() {
  for (const type of ["thumbs-up", "thumbs-down"]) {
    const message = await getFeedbackMessage(type);
    Assert.equal(
      message.trigger.id,
      "feedbackThumbClick",
      `${type} message should use feedbackThumbClick trigger`
    );
  }
});

add_task(async function test_trigger_params_match_type() {
  const positiveMessage = await getFeedbackMessage("thumbs-up");
  Assert.ok(
    positiveMessage.trigger.params.includes("thumbs-up"),
    "thumbs-up message trigger params should include thumbs-up"
  );
  const negativeMessage = await getFeedbackMessage("thumbs-down");
  Assert.ok(
    negativeMessage.trigger.params.includes("thumbs-down"),
    "thumbs-down message trigger params should include thumbs-down"
  );
});

add_task(async function test_both_variants_have_textbox_tile() {
  for (const type of ["thumbs-up", "thumbs-down"]) {
    const message = await getFeedbackMessage(type);
    const tiles = message.content.screens[0].content.tiles;
    Assert.ok(
      tiles.some(t => t.type === "textbox"),
      `${type} modal should include a textbox tile`
    );
  }
});

add_task(async function test_textbox_tile_has_accordion_header() {
  for (const type of ["thumbs-up", "thumbs-down"]) {
    const message = await getFeedbackMessage(type);
    const tiles = message.content.screens[0].content.tiles;
    const textbox = tiles.find(t => t.type === "textbox");
    Assert.strictEqual(
      textbox.header?.title?.string_id,
      "aiwindow-feedback-preview-report",
      `${type} textbox tile should have preview-report accordion header`
    );
  }
});

add_task(async function test_content_toggle_tile_config_for_page_content() {
  for (const type of ["thumbs-up", "thumbs-down"]) {
    const message = await getFeedbackMessage(type);
    const tiles = message.content.screens[0].content.tiles;
    const toggle = tiles.find(t => t.type === "content-toggle");
    Assert.ok(toggle, `${type} modal should include a content-toggle tile`);
    Assert.equal(
      toggle.data?.label?.string_id,
      "aiwindow-feedback-include-page-content",
      `${type} content-toggle tile should use include-page-content string`
    );
  }
});

add_task(
  async function test_feedbackmodal_populates_textbox_and_feedbackdata() {
    const chatLog = {
      log: [{ role: 0, content: { type: "text", body: "hi" } }],
    };
    const metadataBase = {
      model: "test-model",
      turn_count: 1,
      prompt_version: 5,
    };

    function applyMutations(message, metadata) {
      message.content.feedbackData = {
        metadata: metadata.metadata,
        chat: metadata.chatLog,
        chatWithoutPageContent: metadata.chatLogWithoutPageContent,
      };
      for (const screen of message.content.screens ?? []) {
        const { tiles } = screen.content ?? {};
        const textboxTile = tiles?.find(t => t.type === "textbox");
        const contentToggleTile = tiles?.find(t => t.type === "content-toggle");
        if (textboxTile && metadata.chatLog) {
          textboxTile.data.content = JSON.stringify(
            { metadata: metadata.metadata, ...metadata.chatLog },
            null,
            2
          );
          if (contentToggleTile) {
            contentToggleTile.data.visible =
              !!metadata.chatLogWithoutPageContent;
          }
          if (metadata.chatLogWithoutPageContent) {
            textboxTile.data.alternateContent = JSON.stringify(
              {
                metadata: metadata.metadata,
                ...metadata.chatLogWithoutPageContent,
              },
              null,
              2
            );
          }
        }
      }
    }

    const messages = await OnboardingMessageProvider.getUntranslatedMessages();

    // Case 1: no page content — alternateContent should not be set
    const messageNoPage = JSON.parse(
      JSON.stringify(
        messages.find(m => m.id === "SMARTWINDOW_FEEDBACK_MODAL_POSITIVE")
      )
    );
    applyMutations(messageNoPage, {
      metadata: metadataBase,
      chatLog,
      chatLogWithoutPageContent: null,
    });
    const textboxNoPage = messageNoPage.content.screens[0].content.tiles.find(
      t => t.type === "textbox"
    );
    Assert.equal(
      textboxNoPage.data.content,
      JSON.stringify({ metadata: metadataBase, ...chatLog }, null, 2),
      "textbox content should be populated when no page content"
    );
    Assert.ok(
      !textboxNoPage.data.alternateContent,
      "alternateContent should not be set when chatLogWithoutPageContent is null"
    );
    Assert.deepEqual(
      messageNoPage.content.feedbackData.chat,
      chatLog,
      "feedbackData.chat should be initialized to chatLog"
    );

    // Case 2: page content present — alternateContent should be set
    const chatLogWithoutPageContent = { log: [] };
    const messageWithPage = JSON.parse(
      JSON.stringify(
        messages.find(m => m.id === "SMARTWINDOW_FEEDBACK_MODAL_POSITIVE")
      )
    );
    applyMutations(messageWithPage, {
      metadata: metadataBase,
      chatLog,
      chatLogWithoutPageContent,
    });
    const textboxWithPage =
      messageWithPage.content.screens[0].content.tiles.find(
        t => t.type === "textbox"
      );
    Assert.equal(
      textboxWithPage.data.content,
      JSON.stringify({ metadata: metadataBase, ...chatLog }, null, 2),
      "textbox content should be populated with metadata and chatLog"
    );
    Assert.equal(
      textboxWithPage.data.alternateContent,
      JSON.stringify(
        { metadata: metadataBase, ...chatLogWithoutPageContent },
        null,
        2
      ),
      "alternateContent should be populated when chatLogWithoutPageContent is provided"
    );
    Assert.deepEqual(
      messageWithPage.content.feedbackData.chat,
      chatLog,
      "feedbackData.chat should be initialized to chatLog"
    );
    Assert.deepEqual(
      messageWithPage.content.feedbackData.chatWithoutPageContent,
      chatLogWithoutPageContent,
      "feedbackData.chatWithoutPageContent should be set"
    );
    const toggleWithPage =
      messageWithPage.content.screens[0].content.tiles.find(
        t => t.type === "content-toggle"
      );
    Assert.ok(
      toggleWithPage.data.visible,
      "content-toggle tile should be visible when page content exists"
    );
  }
);
