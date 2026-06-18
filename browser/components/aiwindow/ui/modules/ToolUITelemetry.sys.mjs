/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * ToolUI telemetry calls
 */
export const ToolUITelemetry = {
  /**
   * Records telemetry when a browser action prompt is displayed
   *
   * @param {object} data - Telemetry data
   * @param {string} data.location - The location/mode of the AI Window
   * @param {string} data.chat_id - The conversation ID
   * @param {number} data.message_seq - The conversation message count
   * @param {string} data.action_type - The type of action being prompted for
   * @param {string} data.prompt_type - The type of prompt being shown
   * @param {string} data.reason - The reason for the prompt
   * @param {number} data.candidates - Number of candidates being acted upon
   * @param {number} data.preselected - Number of preselected items
   */
  recordBrowserActionPrompt(data) {
    Glean.smartWindow.browserActionPrompt.record(data);
  },

  /**
   * Records telemetry when a user responds to a browser action prompt
   *
   * @param {object} data - Telemetry data
   * @param {string} data.location - The location/mode of the AI Window
   * @param {string} data.chat_id - The conversation ID
   * @param {number} data.message_seq - The conversation message count
   * @param {string} data.action_type - The type of action being performed
   * @param {string} data.prompt_type - The type of prompt that was responded to
   * @param {string} data.response - The user's response (confirm/cancel)
   * @param {number} data.selected - Number of items selected
   * @param {string} data.reason - The reason for the action
   */
  recordBrowserActionPromptResponse(data) {
    Glean.smartWindow.browserActionPromptResponse.record(data);
  },

  /**
   * Records telemetry when a user undoes a browser action
   *
   * @param {object} data - Telemetry data
   * @param {string} data.location - The location/mode of the AI Window
   * @param {string} data.chat_id - The conversation ID
   * @param {number} data.message_seq - The conversation message count
   * @param {string} data.action_type - The type of action being undone
   * @param {number} data.tabs_restored - Number of tabs that were restored
   * @param {number} data.time_delta - Time elapsed since the original action
   * @param {string} data.result - The result of the undo operation
   * @param {string} data.error - Error code if the operation failed
   */
  recordBrowserActionUndo(data) {
    Glean.smartWindow.browserActionUndo.record(data);
  },
};
