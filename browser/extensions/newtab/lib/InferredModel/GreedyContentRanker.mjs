/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const RANKED_SECTION = "top_stories_section";
const FEATURE_PREFIX = "s_";

export async function scoreItemInferred(item, interests, weights) {
  item.score = item.item_score;
  if (item.section === RANKED_SECTION) {
    const inferred_score = Object.keys(item.features)
      .filter(key => key.startsWith(FEATURE_PREFIX))
      .reduce((acc, key) => {
        const actualKey = key.slice(2);
        return acc + (interests[actualKey] || 0);
      }, 0);
    const score =
      (weights.local * inferred_score) / (weights.inferred_norm + 1e-6) +
      weights.server * (item.server_score ?? 0);
    item.score = score;
    item.item_score = score;
  }

  return item;
}
