/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  KNOCKOUT_STAGE_L10N_IDS,
  getMatchSectionL10nId,
  getMatchSectionKey,
  groupMatchesBySection,
} from "content-src/components/Widgets/SportsWidget/stageLabels.mjs";

function groupMatch(letter) {
  return {
    stage: "Group Stage",
    home_team: { group: `Group ${letter}` },
    away_team: { group: `Group ${letter}` },
  };
}

function knockoutMatch(stage) {
  return { stage, home_team: { group: null }, away_team: { group: null } };
}

describe("stageLabels.getMatchSectionL10nId", () => {
  const expectedGroupIds = {
    A: "newtab-sports-widget-group-a",
    B: "newtab-sports-widget-group-b",
    C: "newtab-sports-widget-group-c",
    D: "newtab-sports-widget-group-d",
    E: "newtab-sports-widget-group-e",
    F: "newtab-sports-widget-group-f",
    G: "newtab-sports-widget-group-g",
    H: "newtab-sports-widget-group-h",
    I: "newtab-sports-widget-group-i",
    J: "newtab-sports-widget-group-j",
    K: "newtab-sports-widget-group-k",
    L: "newtab-sports-widget-group-l",
  };

  it.each(Object.entries(expectedGroupIds))(
    "maps Group %s to the per-group Fluent ID",
    (letter, expected) => {
      expect(getMatchSectionL10nId(groupMatch(letter))).toBe(expected);
    }
  );

  it.each(Object.entries(KNOCKOUT_STAGE_L10N_IDS))(
    "maps knockout stage %s to its Fluent ID",
    (stage, expected) => {
      expect(getMatchSectionL10nId(knockoutMatch(stage))).toBe(expected);
    }
  );

  it("returns null and warns when the knockout stage is unmapped", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(getMatchSectionL10nId(knockoutMatch("Made-up Stage"))).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("Made-up Stage");
    warnSpy.mockRestore();
  });

  it("returns null and warns when the group string is malformed", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(
      getMatchSectionL10nId({
        stage: "Group Stage",
        home_team: { group: "Group ZZ" },
        away_team: { group: "Group ZZ" },
      })
    ).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("Group ZZ");
    warnSpy.mockRestore();
  });

  it("falls back to away_team.group when home_team.group is missing", () => {
    expect(
      getMatchSectionL10nId({
        stage: "Group Stage",
        home_team: { group: null },
        away_team: { group: "Group C" },
      })
    ).toBe("newtab-sports-widget-group-c");
  });

  it("returns null for an empty match", () => {
    expect(getMatchSectionL10nId({})).toBeNull();
    expect(getMatchSectionL10nId(null)).toBeNull();
  });
});

describe("stageLabels.getMatchSectionKey", () => {
  it("returns the full team group string during group stage", () => {
    expect(getMatchSectionKey(groupMatch("A"))).toBe("Group A");
    expect(getMatchSectionKey(groupMatch("L"))).toBe("Group L");
  });

  it("returns the raw stage during knockouts", () => {
    expect(getMatchSectionKey(knockoutMatch("Round of 16"))).toBe(
      "Round of 16"
    );
    expect(getMatchSectionKey(knockoutMatch("Final"))).toBe("Final");
  });
});

describe("stageLabels.groupMatchesBySection", () => {
  it("returns an empty list for empty input", () => {
    expect(groupMatchesBySection([])).toEqual([]);
  });

  it("preserves Merino's order and merges consecutive same-key matches", () => {
    const a1 = groupMatch("A");
    const a2 = groupMatch("A");
    const b1 = groupMatch("B");
    const b2 = groupMatch("B");
    const sections = groupMatchesBySection([a1, a2, b1, b2]);
    expect(sections.map(s => s.key)).toEqual(["Group A", "Group B"]);
    expect(sections[0].matches).toEqual([a1, a2]);
    expect(sections[1].matches).toEqual([b1, b2]);
  });

  it("creates a new section when the same key reappears later", () => {
    const a1 = groupMatch("A");
    const b1 = groupMatch("B");
    const a2 = groupMatch("A");
    const sections = groupMatchesBySection([a1, b1, a2]);
    expect(sections.map(s => s.key)).toEqual(["Group A", "Group B", "Group A"]);
    expect(sections[0].matches).toEqual([a1]);
    expect(sections[2].matches).toEqual([a2]);
  });

  it("groups knockout matches by their stage string", () => {
    const r16 = knockoutMatch("Round of 16");
    const r16b = knockoutMatch("Round of 16");
    const qf = knockoutMatch("Quarter-finals");
    const sections = groupMatchesBySection([r16, r16b, qf]);
    expect(sections.map(s => s.key)).toEqual(["Round of 16", "Quarter-finals"]);
    expect(sections[0].matches).toEqual([r16, r16b]);
    expect(sections[1].matches).toEqual([qf]);
  });
});
