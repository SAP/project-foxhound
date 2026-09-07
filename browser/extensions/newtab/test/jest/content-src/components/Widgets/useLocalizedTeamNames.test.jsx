/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { renderHook, waitFor } from "@testing-library/react";
import {
  useLocalizedTeamNames,
  useTbdTeamName,
} from "content-src/components/Widgets/SportsWidget/useLocalizedTeamNames.jsx";

const FLUENT_LABELS = {
  "newtab-sports-widget-team-name-label-bih": "Bosnia and Herzegovina",
  "newtab-sports-widget-team-name-label-civ": "Ivory Coast",
  "newtab-sports-widget-team-name-label-cod": "DR Congo",
  "newtab-sports-widget-team-name-label-eng": "England",
  "newtab-sports-widget-team-name-label-sco": "Scotland",
};

function mockDocumentL10n() {
  document.l10n = {
    formatMessages: jest.fn(async ids =>
      ids.map(({ id }) => ({
        value: null,
        attributes: [{ name: "label", value: FLUENT_LABELS[id] }],
      }))
    ),
  };
}

describe("useLocalizedTeamNames", () => {
  beforeEach(mockDocumentL10n);
  afterEach(() => {
    delete document.l10n;
  });

  it("returns null on the first render before names resolve", () => {
    // Include an override key (ENG) so the resolver suspends on the
    // formatMessages await — otherwise the no-override path resolves
    // synchronously inside renderHook's act() and the initial null is
    // overwritten before the test can observe it.
    const teams = [{ key: "ENG", name: "England" }];
    const { result, unmount } = renderHook(() => useLocalizedTeamNames(teams));
    expect(result.current).toBeNull();
    // Unmount before the pending formatMessages promise resolves so the
    // hook's cleanup sets `cancelled = true` and skips the setResolved
    // setState that would otherwise fire outside act().
    unmount();
  });

  it("resolves Intl.DisplayNames names for non-override FIFA keys", async () => {
    const teams = [
      { key: "CAN", name: "Canada" },
      { key: "AUS", name: "Australia" },
      { key: "ALG", name: "Algeria" },
    ];
    const { result } = renderHook(() => useLocalizedTeamNames(teams));
    await waitFor(() => expect(result.current).not.toBeNull());
    // en-US Intl.DisplayNames for the corresponding ISO codes.
    expect(result.current.CAN).toBe("Canada");
    expect(result.current.AUS).toBe("Australia");
    expect(result.current.ALG).toBe("Algeria");
  });

  it("resolves Fluent overrides only for FIFA codes in FLUENT_OVERRIDE_KEYS", async () => {
    const teams = [
      { key: "ENG", name: "England (source)" },
      { key: "CAN", name: "Canada" },
    ];
    const { result } = renderHook(() => useLocalizedTeamNames(teams));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.ENG).toBe("England");
    expect(document.l10n.formatMessages).toHaveBeenCalledWith([
      { id: "newtab-sports-widget-team-name-label-eng" },
    ]);
  });

  it("requests the correct Fluent ID for each of the 5 exceptions to Intl.DisplayNames (BIH, CIV, COD, ENG, SCO)", async () => {
    const teams = ["BIH", "CIV", "COD", "ENG", "SCO"].map(key => ({
      key,
      name: `${key} source`,
    }));
    const { result } = renderHook(() => useLocalizedTeamNames(teams));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(document.l10n.formatMessages).toHaveBeenCalledWith([
      { id: "newtab-sports-widget-team-name-label-bih" },
      { id: "newtab-sports-widget-team-name-label-civ" },
      { id: "newtab-sports-widget-team-name-label-cod" },
      { id: "newtab-sports-widget-team-name-label-eng" },
      { id: "newtab-sports-widget-team-name-label-sco" },
    ]);
    expect(result.current).toEqual({
      BIH: "Bosnia and Herzegovina",
      CIV: "Ivory Coast",
      COD: "DR Congo",
      ENG: "England",
      SCO: "Scotland",
    });
  });

  it("falls back to team.name when key is in neither map", async () => {
    const teams = [
      { key: "ZZZ", name: "Atlantis" },
      { key: "CAN", name: "Canada" },
    ];
    const { result } = renderHook(() => useLocalizedTeamNames(teams));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.ZZZ).toBe("Atlantis");
  });

  it("falls back to team.name when the Fluent message has no label attribute", async () => {
    document.l10n.formatMessages = jest.fn(async ids =>
      ids.map(() => ({ value: null, attributes: [] }))
    );
    const teams = [{ key: "ENG", name: "England (source)" }];
    const { result } = renderHook(() => useLocalizedTeamNames(teams));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.ENG).toBe("England (source)");
  });

  it("does not call document.l10n when no teams need Fluent overrides", async () => {
    const teams = [
      { key: "CAN", name: "Canada" },
      { key: "AUS", name: "Australia" },
    ];
    const { result } = renderHook(() => useLocalizedTeamNames(teams));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(document.l10n.formatMessages).not.toHaveBeenCalled();
  });

  it("returns null when teams reference changes, then re-resolves for the new list", async () => {
    const initialTeams = [
      { key: "CAN", name: "Canada" },
      { key: "ENG", name: "England" },
    ];
    const { result, rerender } = renderHook(
      ({ teams }) => useLocalizedTeamNames(teams),
      { initialProps: { teams: initialTeams } }
    );
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.CAN).toBe("Canada");

    const newTeams = [
      { key: "FRA", name: "France" },
      { key: "SCO", name: "Scotland" },
    ];
    rerender({ teams: newTeams });

    // Hook returns null until the new resolution lands, preventing stale
    // reads when callers index into localizedNames[team.key] during sort
    // or filter.
    expect(result.current).toBeNull();

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.FRA).toBe("France");
    expect(result.current.SCO).toBe("Scotland");
  });
});

describe("useTbdTeamName", () => {
  beforeEach(mockDocumentL10n);
  afterEach(() => {
    delete document.l10n;
  });

  it("resolves the localized TBD placeholder", async () => {
    document.l10n.formatValues = jest.fn(async () => ["To be determined"]);
    const { result } = renderHook(() => useTbdTeamName());
    await waitFor(() => expect(result.current).toBe("To be determined"));
    expect(document.l10n.formatValues).toHaveBeenCalledWith([
      { id: "newtab-sports-widget-team-tbd" },
    ]);
  });

  it("returns an empty string when formatValues is unavailable", () => {
    // mockDocumentL10n defines formatMessages but not formatValues; the hook
    // must not throw on the partial l10n object.
    const { result } = renderHook(() => useTbdTeamName());
    expect(result.current).toBe("");
  });
});
