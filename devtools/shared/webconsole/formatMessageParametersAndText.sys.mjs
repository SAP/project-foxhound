/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { require } from "resource://devtools/shared/loader/Loader.sys.mjs";

const l10n = require("resource://devtools/shared/webconsole/l10n.js");

/**
 * Format the webconsole messages and parameters based on provided data.
 *
 * @param {object} messageData
 * @param {object=} messageData.counter
 *     An object which holds information about console.count* calls.
 * @param {Array<*>} messageData.parameters
 *     An array of arguments passed to console command.
 * @param {object=} messageData.timer
 *     An object which holds information about console.time* calls.
 * @param {string} messageData.type
 *     A name of the console method being called.
 * @param {boolean} persistLogs
 *     A boolean to indicate if logs should be persisted.
 *
 * @returns {object}
 *    An object that holds a formatted text and parameters.
 */
export function formatMessageParametersAndText(messageData, persistLogs) {
  let { parameters } = messageData;
  const { timer, type } = messageData;
  let messageText = null;

  // Special per-type conversion.
  switch (type) {
    case "clear":
      // We show a message to users when calls console.clear() is called.
      parameters = [
        l10n.getStr(persistLogs ? "preventedConsoleClear" : "consoleCleared"),
      ];
      break;
    case "count":
    case "countReset": {
      const { counter } = messageData;

      if (counter) {
        if (counter.error) {
          messageText = l10n.getFormatStr(counter.error, [counter.label]);
          parameters = null;
        } else {
          const label = counter.label
            ? counter.label
            : l10n.getStr("noCounterLabel");
          messageText = `${label}: ${counter.count}`;
          parameters = null;
        }
      }
      break;
    }
    case "time":
      parameters = null;
      if (timer && timer.error) {
        messageText = l10n.getFormatStr(timer.error, [timer.name]);
      }
      break;
    case "timeLog":
    case "timeEnd":
      if (timer && timer.error) {
        parameters = null;
        messageText = l10n.getFormatStr(timer.error, [timer.name]);
      } else if (timer) {
        // We show the duration to users when calls console.timeLog/timeEnd is called,
        // if corresponding console.time() was called before.
        const duration = Math.round(timer.duration * 100) / 100;
        if (type === "timeEnd") {
          messageText = l10n.getFormatStr("console.timeEnd", [
            timer.name,
            duration,
          ]);
          parameters = null;
        } else if (type === "timeLog") {
          const [, ...rest] = parameters;
          parameters = [
            l10n.getFormatStr("timeLog", [timer.name, duration]),
            ...rest,
          ];
        }
      }
      break;
    case "group":
      if (parameters.length === 0) {
        parameters = [l10n.getStr("noGroupLabel")];
      }
      break;
    case "groupCollapsed":
      if (parameters.length === 0) {
        parameters = [l10n.getStr("noGroupLabel")];
      }
      break;
    case "groupEnd":
      parameters = null;
      break;
  }

  return { messageText, parameters };
}
