/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

class ResponsiveCommand {
  constructor({ commands }) {
    this.#commands = commands;
  }
  #commands = null;

  async getAllResponsiveFronts() {
    return this.#commands.targetCommand.getAllFronts(
      [this.#commands.targetCommand.TYPES.FRAME],
      "responsive"
    );
  }

  async setElementPickerState(state, pickerType) {
    const fronts = await this.getAllResponsiveFronts();
    await Promise.all(
      fronts.map(async front => {
        try {
          await front.setElementPickerState(state, pickerType);
        } catch (e) {
          if (front.isDestroyed()) {
            return;
          }
          throw e;
        }
      })
    );
  }
}

module.exports = ResponsiveCommand;
