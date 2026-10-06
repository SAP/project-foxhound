/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { useEffect, useState } from "react";
import { TEAM_REGION_CODES } from "./teamRegions.mjs";

// FIFA team codes whose localized names must come from Fluent because
// Intl.DisplayNames cannot produce a usable result: England and Scotland
// have no ISO 3166-1 code, and Bosnia and Herzegovina / Ivory Coast /
// DR Congo differ in wording from what UX wants to show.
export const FLUENT_OVERRIDE_KEYS = new Set([
  "BIH",
  "CIV",
  "COD",
  "ENG",
  "SCO",
]);

/**
 * Resolves localized country names for `teams`. Returns `null` until
 * the current `teams` reference is resolved, then an object mapping
 * FIFA code to localized name. Resets to `null` on `teams` change so
 * callers can't read stale entries during sort or filter.
 */
export function useLocalizedTeamNames(teams) {
  const [resolved, setResolved] = useState({ teams: null, names: null });

  useEffect(() => {
    let cancelled = false;

    async function resolveNames() {
      const overrideKeys = teams
        .map(team => team.key)
        .filter(key => FLUENT_OVERRIDE_KEYS.has(key));

      // The override strings ship as attribute-only Fluent messages
      // (`.label = ...`), so we use formatMessages and read the label
      // attribute rather than formatValues (which would return null).
      const messages = overrideKeys.length
        ? await document.l10n.formatMessages(
            overrideKeys.map(key => ({
              id: `newtab-sports-widget-team-name-label-${key.toLowerCase()}`,
            }))
          )
        : [];

      if (cancelled) {
        return;
      }

      const overrideValues = new Map(
        overrideKeys.map((key, i) => [
          key,
          messages[i]?.attributes?.find(attr => attr.name === "label")?.value,
        ])
      );

      const displayNames = new Intl.DisplayNames(undefined, {
        type: "region",
      });

      const names = {};
      for (const team of teams) {
        if (FLUENT_OVERRIDE_KEYS.has(team.key)) {
          names[team.key] = overrideValues.get(team.key) || team.name;
        } else if (TEAM_REGION_CODES[team.key]) {
          names[team.key] =
            displayNames.of(TEAM_REGION_CODES[team.key]) || team.name;
        } else {
          names[team.key] = team.name;
        }
      }

      setResolved({ teams, names });
    }

    resolveNames();

    return () => {
      cancelled = true;
    };
  }, [teams]);

  // Only expose names that match the current `teams` reference.
  return resolved.teams === teams ? resolved.names : null;
}

/**
 * Resolves the localized "To be determined" placeholder name used in a match
 * row's aria-label for an undecided team. Returns "" until resolved.
 */
export function useTbdTeamName() {
  const [tbdName, setTbdName] = useState("");
  useEffect(() => {
    document.l10n
      ?.formatValues?.([{ id: "newtab-sports-widget-team-tbd" }])
      ?.then(([value]) => value && setTbdName(value));
  }, []);
  return tbdName;
}
