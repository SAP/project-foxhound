/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import androidx.compose.ui.unit.dp
import org.mozilla.fenix.R
import org.mozilla.fenix.home.sports.LiveMatchRefreshSource
import org.mozilla.fenix.home.sports.Match
import org.mozilla.fenix.home.sports.MatchStatus
import org.mozilla.fenix.home.sports.SportCardErrorState
import org.mozilla.fenix.home.sports.Team
import org.mozilla.fenix.home.sports.fake.FakeMatchCardScenario
import org.mozilla.fenix.home.sports.isExtraTime
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.home.sports.MatchCard as MatchCardState

/**
 * Card that renders a sports match and their related matches.
 *
 * @param state The [MatchCardState] to display in this card.
 * @param errorState The [SportCardErrorState] to display in this card when there is an error during a live match.
 * @param isTeamSelected Whether the user has selected a team.
 * @param onRefresh Used to refresh the scores for live matches.
 * @param onMatchClicked Used to handle match click actions.
 * @param modifier [Modifier] to be applied to the card.
 * @param pageNumber 1-based page position when this card is rendered inside a pager; used by the
 * header to announce e.g. "Group D, page 1 of 2" for assistive technology.
 * @param pageCount Total number of pages when rendered inside a pager. Ignored if `pageNumber` is null.
 */
@Composable
fun MatchCard(
    state: MatchCardState,
    errorState: SportCardErrorState?,
    isTeamSelected: Boolean,
    onRefresh: (LiveMatchRefreshSource) -> Unit,
    onMatchClicked: (String?, String?, String?) -> Unit,
    modifier: Modifier = Modifier,
    pageNumber: Int? = null,
    pageCount: Int? = null,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        color = MaterialTheme.colorScheme.surfaceContainerLowest,
    ) {
        Column(
            modifier = Modifier.padding(
                start = FirefoxTheme.layout.space.static100,
                end = FirefoxTheme.layout.space.static100,
                top = FirefoxTheme.layout.space.static150,
                bottom = FirefoxTheme.layout.space.static200,
            ),
            verticalArrangement = Arrangement.spacedBy(FirefoxTheme.layout.space.static200),
        ) {
            val matches = state.matches
            val relatedMatches = state.relatedMatches
            val sportHeaderMatch = if (matches.isNotEmpty()) {
                matches.first()
            } else if (relatedMatches.isNotEmpty()) {
                relatedMatches.first()
            } else {
                null
            }

            if (sportHeaderMatch != null) {
                SportCardHeader(
                    match = sportHeaderMatch,
                    round = state.round,
                    isTeamSelected = isTeamSelected,
                    errorState = errorState,
                    onRefresh = onRefresh,
                    pageNumber = pageNumber,
                    pageCount = pageCount,
                )
            }

            matches.forEach { match ->
                MatchBody(
                    match = match,
                    errorState = errorState,
                    showDivider = relatedMatches.isNotEmpty(),
                    isTeamSelected = isTeamSelected,
                    onMatchClicked = onMatchClicked,
                    onRefresh = onRefresh,
                )
            }

            if (relatedMatches.isNotEmpty()) {
                RelatedMatchesSection(
                    matches = relatedMatches,
                    round = state.round,
                    isTeamSelected = isTeamSelected,
                    onMatchClicked = onMatchClicked,
                )
            }
        }
    }
}

/**
 * Renders the body content of the card. This will display a countdown pill for scheduled matches or
 * a score pill for current matches.
 */
@Composable
internal fun MatchBody(
    match: Match,
    errorState: SportCardErrorState?,
    showDivider: Boolean,
    isTeamSelected: Boolean,
    onMatchClicked: (String?, String?, String?) -> Unit,
    onRefresh: (LiveMatchRefreshSource) -> Unit,
) {
    if (errorState != null && match.matchStatus.isLive()) {
        SportsWidgetErrorCard(
            error = errorState,
            onRefresh = { onRefresh(LiveMatchRefreshSource.LIVE_MATCH_CARD_ERROR_BUTTON) },
        )
    } else {
        val rowContentDescription = matchBodyContentDescription(match = match, isTeamSelected = isTeamSelected)

        Column {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(
                        onClick = {
                            if (match.home != null || match.away != null) {
                                onMatchClicked(match.home?.key, match.away?.key, "${match.date} ${match.time}")
                            }
                        },
                    )
                    .clearAndSetSemantics {
                        contentDescription = rowContentDescription
                    },
                horizontalArrangement = Arrangement.spacedBy(FirefoxTheme.layout.space.static100),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TeamSlot(team = match.home, modifier = Modifier.weight(1f))

                Scoreboard(match = match, isTeamSelected = isTeamSelected, modifier = Modifier.weight(1f))

                TeamSlot(team = match.away, modifier = Modifier.weight(1f))
            }

            if (showDivider) {
                Spacer(modifier = Modifier.height(FirefoxTheme.layout.space.static100))

                HorizontalDivider()
            }
        }
    }
}

@Composable
private fun TeamSlot(
    team: Team?,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(FirefoxTheme.layout.space.static50),
    ) {
        FlagContainer(
            flagResId = team?.flagResId,
            modifier = Modifier.size(width = 60.dp, height = 40.dp),
        )

        Text(
            text = team?.key ?: "--",
            style = FirefoxTheme.typography.subtitle2,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun Scoreboard(match: Match, isTeamSelected: Boolean, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(FirefoxTheme.layout.space.static100),
    ) {
        if (match.homeScore != null && match.awayScore != null) {
            ScorePill(
                homeScore = match.homeScore,
                awayScore = match.awayScore,
            )
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            val subtitle = if (match.matchStatus.hasStatusSubtitle() || isTeamSelected) {
                statusSubtitle(
                    status = match.matchStatus,
                    date = match.date,
                    isTeamSelected = isTeamSelected,
                )
            } else {
                ""
            }

            if (subtitle.isNotEmpty()) {
                Text(
                    text = subtitle,
                    style = FirefoxTheme.typography.caption,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
            }

            if (match.matchStatus.hasSecondaryStatusSubtitle()) {
                Text(
                    text = secondStatusSubtitle(status = match.matchStatus, time = match.time),
                    style = FirefoxTheme.typography.caption,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

private fun MatchStatus.hasStatusSubtitle(): Boolean = when (this) {
    is MatchStatus.Penalties,
    is MatchStatus.FinalAfterPenalties,
    is MatchStatus.Live,
    is MatchStatus.Final,
        -> true

    else -> false
}

private fun MatchStatus.hasSecondaryStatusSubtitle(): Boolean = when (this) {
    is MatchStatus.Live,
    is MatchStatus.Final,
        -> false

    else -> true
}

@Composable
private fun statusSubtitle(status: MatchStatus, date: String, isTeamSelected: Boolean): String = when (status) {
    is MatchStatus.Live -> {
        val statusClock = status.clock?.let { "$it'" }
        when {
            status.period.isExtraTime -> {
                val extraTime = stringResource(R.string.sports_widget_extra_time)
                if (statusClock != null) "$extraTime: $statusClock" else extraTime
            }

            status.isHalftime -> {
                val halftime = stringResource(R.string.sports_widget_halftime)
                if (statusClock != null) "$halftime: $statusClock" else halftime
            }

            statusClock != null -> statusClock
            else -> ""
        }
    }

    is MatchStatus.Penalties -> stringResource(R.string.sports_widget_penalties)
    is MatchStatus.Final -> stringResource(R.string.sports_widget_match_full_time_2)
    is MatchStatus.FinalAfterPenalties -> "${stringResource(R.string.sports_widget_match_full_time_2)} · " +
        stringResource(R.string.sports_widget_penalties)

    else -> if (isTeamSelected) date else ""
}

@Composable
private fun secondStatusSubtitle(status: MatchStatus, time: String): String = when (status) {
    is MatchStatus.Penalties -> "(${status.homePenalty ?: "-"} - ${status.awayPenalty ?: "-"})"
    is MatchStatus.FinalAfterPenalties -> "(${status.homePenalty ?: "-"} - ${status.awayPenalty ?: "-"})"
    else -> time
}

@Composable
private fun matchBodyContentDescription(
    match: Match,
    isTeamSelected: Boolean,
): String {
    val homeName = match.home?.let { localizedTeamName(it) }
        ?: stringResource(R.string.sports_widget_team_to_be_determined)
    val awayName = match.away?.let { localizedTeamName(it) }
        ?: stringResource(R.string.sports_widget_team_to_be_determined)
    val middleText = matchBodyMiddleText(match = match, isTeamSelected = isTeamSelected)

    return when {
        match.homeScore == null || match.awayScore == null ->
            stringResource(
                R.string.sports_widget_match_content_description,
                homeName,
                awayName,
                middleText,
            )

        match.matchStatus.isLive() ->
            stringResource(
                R.string.sports_widget_live_score_content_description,
                homeName,
                match.homeScore,
                awayName,
                match.awayScore,
                middleText,
            )

        else -> listOf(
            homeName,
            match.homeScore.toString(),
            awayName,
            match.awayScore.toString(),
            middleText,
        ).filter { it.isNotEmpty() }.joinToString(separator = " ")
    }
}

@Composable
private fun matchBodyMiddleText(match: Match, isTeamSelected: Boolean): String {
    val status = match.matchStatus
    val primary = if (status is MatchStatus.Live) {
        val elapsed = status.clock?.let {
            stringResource(R.string.sports_widget_match_elapsed_minutes, it)
        }
        when {
            status.period.isExtraTime -> {
                val extraTime = stringResource(R.string.sports_widget_extra_time)
                if (elapsed != null) "$extraTime $elapsed" else extraTime
            }
            status.isHalftime -> {
                val halftime = stringResource(R.string.sports_widget_halftime)
                if (elapsed != null) "$halftime $elapsed" else halftime
            }
            elapsed != null -> elapsed
            else -> ""
        }
    } else {
        statusSubtitle(
            status = status,
            date = match.date,
            isTeamSelected = isTeamSelected,
        )
    }
    val secondary = if (status.hasSecondaryStatusSubtitle()) {
        secondStatusSubtitle(status = status, time = match.time)
    } else {
        ""
    }
    return listOf(primary, secondary).filter { it.isNotEmpty() }.joinToString(separator = " ")
}

private data class MatchCardPreviewState(
    val label: String,
    val state: MatchCardState,
)

private class MatchCardPreviewProvider : PreviewParameterProvider<MatchCardPreviewState> {
    override val values = FakeMatchCardScenario.entries.asSequence().map { scenario ->
        MatchCardPreviewState(label = scenario.label, state = scenario.build().first())
    }
}

@PreviewLightDark
@Composable
private fun MatchCardPreview(
    @PreviewParameter(MatchCardPreviewProvider::class) preview: MatchCardPreviewState,
) {
    FirefoxTheme {
        Surface {
            MatchCard(
                state = preview.state,
                errorState = null,
                isTeamSelected = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(FirefoxTheme.layout.space.static200),
                onRefresh = {},
                onMatchClicked = { _, _, _ -> },
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun MatchCardErrorPreview(
    @PreviewParameter(MatchCardPreviewProvider::class) preview: MatchCardPreviewState,
) {
    FirefoxTheme {
        Surface {
            MatchCard(
                state = preview.state,
                errorState = SportCardErrorState.LoadFailed,
                isTeamSelected = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(FirefoxTheme.layout.space.static200),
                onRefresh = {},
                onMatchClicked = { _, _, _ -> },
            )
        }
    }
}
