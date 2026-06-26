/*
 This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * AIWindow telemetry calls
 */
export const AIWindowTelemetry = {
  /**
   * Handles recording events from the History Thumbnail
   * grid.
   *
   * @param {AIWindow} aiWindow
   * @param {HistoryItem} data
   * @param {string} name
   */
  recordHistoryGridEvent(aiWindow, data, name) {
    const { itemCount, item } = data;

    switch (name) {
      case "AIChatContent:HistoryGridRender":
        Glean.smartWindow.historyDisplayed.record({
          location: aiWindow.mode,
          chat_id: aiWindow.conversationId,
          message_seq: aiWindow.conversationMessageCount,
          total: itemCount,
          reason: "ask",
        });
        break;

      case "AIChatContent:HistoryGridItemClick":
        Glean.smartWindow.historyClick.record({
          location: aiWindow.mode,
          chat_id: aiWindow.conversationId,
          message_seq: aiWindow.conversationMessageCount,
          total: item.resultCount,
          position: item.resultIndex,
        });
        break;
    }
  },
};
