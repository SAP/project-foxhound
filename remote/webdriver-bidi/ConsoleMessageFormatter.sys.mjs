/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  formatMessageParametersAndText:
    "resource://devtools/shared/webconsole/formatMessageParametersAndText.sys.mjs",
});

/**
 * Format console message to be close to webconsole output.
 *
 * @param {object=} options
 * @param {object=} options.counter
 *     An object which holds information about console.count* calls.
 * @param {Array<*>} options.messageArguments
 *     An array of arguments passed to console command.
 * @param {string} options.method
 *     A name of the console method being called.
 * @param {Array<*>} options.serializedArgs
 *     An array of serialized remote values for the console arguments.
 * @param {object=} options.timer
 *     An object which holds information about console.time* calls.
 *
 * @returns {string}
 *     A formatted console message.
 */
export const formatConsoleMessage = options => {
  const { counter, messageArguments, method, serializedArgs, timer } = options;

  const { messageText, parameters } = lazy.formatMessageParametersAndText({
    parameters: messageArguments,
    counter,
    timer,
    type: method,
  });

  if (messageText) {
    return messageText;
  }

  const stringifiedArgs = serializedArgs.map((arg, idx) => {
    if (arg.type === "error") {
      arg.value = messageArguments[idx];
    }
    return stringifyArguments(arg);
  });

  if (method === "timeLog") {
    const rest = stringifiedArgs.slice(1).join(" ");
    return rest ? `${parameters[0]} ${rest}` : String(parameters[0]);
  }

  // Concatenate all formatted arguments in text.
  return stringifiedArgs.join(" ");
};

export const stringifyArguments = arg => {
  if (!Object.hasOwn(arg, "value")) {
    return arg.type;
  }
  const { type, value } = arg;

  switch (type) {
    // Per spec, primitive types have to be stringified.
    case "bigint":
    case "boolean":
    case "number":
    case "string":
      return String(value);

    // Per spec, non-primitive types should return
    // an implementation-defined string.
    case "error":
      return String(value);
    // Perform the following transformations to better align
    // with Google Chrome representation.
    case "array":
      return `Array(${value?.length ?? ""})`;
    case "date":
      return new Date(value).toString();
    case "map":
    case "object":
    case "set":
      return `${capitalize(type)}(${value?.length ?? ""})`;
    case "regexp":
      return `/${value.pattern}/${value.flags ?? ""}`;
    default:
      return arg.type;
  }
};

const capitalize = str => str[0].toUpperCase() + str.slice(1);
