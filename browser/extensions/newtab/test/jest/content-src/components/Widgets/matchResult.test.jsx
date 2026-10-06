/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { getMatchWinnerKey } from "content-src/components/Widgets/SportsWidget/matchResult.mjs";

function match(overrides = {}) {
  return {
    home_team: { key: "MEX" },
    away_team: { key: "RSA" },
    home_score: 0,
    away_score: 0,
    home_extra: null,
    away_extra: null,
    home_penalty: null,
    away_penalty: null,
    ...overrides,
  };
}

describe("getMatchWinnerKey", () => {
  it("returns null for a null match", () => {
    expect(getMatchWinnerKey(null)).toBeNull();
  });

  it("returns the home key when home scores more", () => {
    expect(getMatchWinnerKey(match({ home_score: 2, away_score: 1 }))).toBe(
      "MEX"
    );
  });

  it("returns the away key when away scores more", () => {
    expect(getMatchWinnerKey(match({ home_score: 0, away_score: 3 }))).toBe(
      "RSA"
    );
  });

  it("counts extra-time goals toward the aggregate", () => {
    // 1+1 vs 1+0 -> home wins on extra time.
    expect(
      getMatchWinnerKey(
        match({
          home_score: 1,
          away_score: 1,
          home_extra: 1,
          away_extra: 0,
        })
      )
    ).toBe("MEX");
  });

  it("returns null for a draw with no shootout", () => {
    expect(
      getMatchWinnerKey(match({ home_score: 1, away_score: 1 }))
    ).toBeNull();
  });

  it("resolves a level match by the penalty shootout", () => {
    expect(
      getMatchWinnerKey(
        match({
          home_score: 1,
          away_score: 1,
          home_penalty: 4,
          away_penalty: 5,
        })
      )
    ).toBe("RSA");
  });

  it("treats equal penalties as a draw (no winner)", () => {
    expect(
      getMatchWinnerKey(
        match({
          home_score: 0,
          away_score: 0,
          home_penalty: 3,
          away_penalty: 3,
        })
      )
    ).toBeNull();
  });
});
