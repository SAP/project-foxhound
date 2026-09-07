/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.browser.awesomebar.internal.utils

import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionCategory
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionDate
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionState
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionStatus
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionStatusType
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionTeam

internal class SportSuggestionDataProvider : PreviewParameterProvider<SportSuggestionPreviewModel> {

    override val values = sequenceOf(
        SportSuggestionPreviewModel(
            SportSuggestionState(
                sport = "NBA",
                sportCategory = SportSuggestionCategory.BASKETBALL,
                status = SportSuggestionStatus.Final,
                statusType = SportSuggestionStatusType.PAST,
                date = SportSuggestionDate.General("28 Oct 2025"),
                awayTeam = SportSuggestionTeam(name = "Lakers", score = 107, icon = null),
                homeTeam = SportSuggestionTeam(name = "Clippers", score = 103, icon = null),
            ),
        ),
        SportSuggestionPreviewModel(
            SportSuggestionState(
                sport = "NFL",
                sportCategory = SportSuggestionCategory.FOOTBALL,
                status = SportSuggestionStatus.InProgress,
                statusType = SportSuggestionStatusType.LIVE,
                date = SportSuggestionDate.Today,
                awayTeam = SportSuggestionTeam(name = "Columbus Blue Jackets", score = 14, icon = null),
                homeTeam = SportSuggestionTeam(name = "Minnesota Vikings", score = 12, icon = null),
            ),
        ),
        SportSuggestionPreviewModel(
            SportSuggestionState(
                sport = "MLB",
                sportCategory = SportSuggestionCategory.BASEBALL,
                status = SportSuggestionStatus.Scheduled,
                statusType = SportSuggestionStatusType.SCHEDULED,
                date = SportSuggestionDate.Tomorrow("5PM"),
                awayTeam = SportSuggestionTeam(name = "Yankees", score = null, icon = null),
                homeTeam = SportSuggestionTeam(name = "Diamondbacks", score = null, icon = null),
            ),
        ),
        SportSuggestionPreviewModel(
            SportSuggestionState(
                sport = "NHL",
                sportCategory = SportSuggestionCategory.HOCKEY,
                status = SportSuggestionStatus.NotNecessary,
                statusType = SportSuggestionStatusType.PAST,
                date = SportSuggestionDate.General("28 Nov 24"),
                awayTeam = SportSuggestionTeam(name = "Lightning", score = 1, icon = null),
                homeTeam = SportSuggestionTeam(name = "Canucks", score = 0, icon = null),
            ),
        ),
    )
}

internal data class SportSuggestionPreviewModel(
    val state: SportSuggestionState,
)
