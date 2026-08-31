/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Base class for conditions
 */
class ConditionBase {
  #listeners = new Set();

  constructor(factory, desc) {
    this.factory = factory;
    this.desc = desc;
  }

  async init() {
    /* nothing to do */
  }

  uninit() {
    this.#listeners.clear();
  }

  check() {
    throw new Error("Check is not implemented!");
  }

  onChange(cb) {
    this.#listeners.add(cb);
    return () => this.#listeners.delete(cb);
  }

  _notifyChange() {
    for (const cb of this.#listeners) {
      try {
        cb();
      } catch (_) {}
    }
  }
}

/**
 * A condition to handle 1 or more sub conditions
 */
class ConditionBaseWithSub extends ConditionBase {
  conditions;
  #unsubs = [];

  constructor(factory, desc, conditions) {
    super(factory, desc);

    this.conditions = conditions.map(c => factory.create(c));
  }

  async init() {
    await super.init();

    for (const c of this.conditions) {
      await c.init();
      this.#unsubs.push(c.onChange(() => this._notifyChange()));
    }
  }

  uninit() {
    this.#unsubs.forEach(u => u());
    this.#unsubs = [];

    this.conditions.forEach(c => c.uninit());
    super.uninit();
  }
}

globalThis.ConditionBase = ConditionBase;
globalThis.ConditionBaseWithSub = ConditionBaseWithSub;
