/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  EventEmitter: "resource://gre/modules/EventEmitter.sys.mjs",
});

const OBSERVER_TOPIC_FILE_INPUT_PICKER_OPENING = "file-input-picker-opening";

/**
 * The FilePickerListener can be used to listen for file picker dialog openings
 * triggered by input type=file elements.
 *
 * Note that the actual file picker might not open if it is automatically
 * dismissed as part of the defined user prompt behavior.
 *
 * Example:
 * ```
 * const listener = new FilePickerListener();
 * listener.on("file-picker-opening", onFilePickerOpened);
 * listener.startListening();
 *
 * const onFilePickerOpened = (eventName, data) => {
 *   const { element } = data;
 *   console.log("File picker opened:", element.multiple);
 * };
 * ```
 *
 * @fires FilePickerListener#"file-picker-opening"
 *    The FilePickerListener emits the following event:
 *    - "file-picker-opening" when a file picker is requested to be opened,
 *    with the following object as payload:
 *      - {Element} element
 *            The DOM element which triggered the file picker to open.
 */
export class FilePickerListener {
  #listening;

  constructor() {
    lazy.EventEmitter.decorate(this);

    this.#listening = false;
  }

  destroy() {
    this.stopListening();
  }

  observe(subject, topic) {
    switch (topic) {
      case OBSERVER_TOPIC_FILE_INPUT_PICKER_OPENING: {
        this.emit("file-picker-opening", {
          element: subject,
        });
        break;
      }
    }
  }

  startListening() {
    if (this.#listening) {
      return;
    }
    Services.obs.addObserver(this, OBSERVER_TOPIC_FILE_INPUT_PICKER_OPENING);
    this.#listening = true;
  }

  stopListening() {
    if (!this.#listening) {
      return;
    }
    Services.obs.removeObserver(this, OBSERVER_TOPIC_FILE_INPUT_PICKER_OPENING);
    this.#listening = false;
  }
}
