/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const CONDITIONS_MAP = {
  and: globalThis.ConditionAnd,
  test: globalThis.ConditionTest,
  or: globalThis.ConditionOr,
  cookie: globalThis.ConditionCookie,
  not: globalThis.ConditionNot,
  url: globalThis.ConditionUrl,
};

/**
 * The condition factory creates a set of conditions based on the breakages
 */
class ConditionFactory {
  #storage = {};
  #context = {};

  constructor(context = {}) {
    this.#context = context || {};
  }

  static async run(conditionDesc, context = {}) {
    if (conditionDesc === undefined) {
      return true;
    }

    const factory = new ConditionFactory(context);
    const condition = await factory.create(conditionDesc);
    await condition.init();
    return condition.check();
  }

  create(conditionDesc) {
    const conditionClass = CONDITIONS_MAP[conditionDesc.type];
    if (!conditionClass) {
      throw new Error("Unknown condition type: " + String(conditionDesc?.type));
    }
    return new conditionClass(this, conditionDesc);
  }

  storeData(key, value) {
    this.#storage[key] = value;
  }

  retrieveData(key) {
    return this.#storage[key];
  }

  get context() {
    return this.#context;
  }
}

globalThis.ConditionFactory = ConditionFactory;
