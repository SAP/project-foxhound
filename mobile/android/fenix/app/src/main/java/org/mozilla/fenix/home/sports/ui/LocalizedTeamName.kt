/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.res.stringResource
import org.mozilla.fenix.R
import org.mozilla.fenix.home.sports.Team
import org.mozilla.fenix.home.sports.util.localizedCountryName

// FIFA codes that have no ISO 3166 equivalent and so can't be resolved via
// java.util.Locale. Each one maps to a dedicated string resource.
private val fifaOnlyStringRes: Map<String, Int> = mapOf(
    "ENG" to R.string.sports_widget_country_england,
    "SCO" to R.string.sports_widget_country_scotland,
)

/**
 * Returns a locale-aware display name for [team]. FIFA codes with no ISO 3166
 * equivalent (e.g. "ENG", "SCO") are resolved from [fifaOnlyStringRes];
 * everything else flows through [localizedCountryName] and is memoized per-key.
 */
@Composable
fun localizedTeamName(team: Team): String {
    val resId = fifaOnlyStringRes[team.key]
    return if (resId != null) {
        stringResource(resId)
    } else {
        remember(team.key) { localizedCountryName(team.key) }
    }
}
