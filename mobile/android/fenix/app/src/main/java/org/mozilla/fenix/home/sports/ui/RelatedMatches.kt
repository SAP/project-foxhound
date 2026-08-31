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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.CollectionInfo
import androidx.compose.ui.semantics.CollectionItemInfo
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.collectionInfo
import androidx.compose.ui.semantics.collectionItemInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.annotation.FlexibleWindowLightDarkPreview
import org.mozilla.fenix.R
import org.mozilla.fenix.home.sports.Match
import org.mozilla.fenix.home.sports.MatchStatus
import org.mozilla.fenix.home.sports.TournamentRound
import org.mozilla.fenix.home.sports.fake.FakeSportsPreview
import org.mozilla.fenix.theme.FirefoxTheme

@Composable
internal fun RelatedMatchesSection(
    matches: List<Match>,
    round: TournamentRound,
    isTeamSelected: Boolean,
    onMatchClicked: (String?, String?, String?) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = FirefoxTheme.layout.space.static100)
            .semantics {
                collectionInfo = CollectionInfo(rowCount = matches.size, columnCount = 1)
            },
        verticalArrangement = Arrangement.spacedBy(FirefoxTheme.layout.space.static100),
    ) {
        matches.forEachIndexed { index, match ->
            RelatedMatchRow(
                match = match,
                round = round,
                isTeamSelected = isTeamSelected,
                onMatchClicked = onMatchClicked,
                positionInList = index,
            )
        }
    }
}

@Composable
internal fun RelatedMatchRow(
    match: Match,
    round: TournamentRound,
    isTeamSelected: Boolean,
    onMatchClicked: (String?, String?, String?) -> Unit,
    positionInList: Int,
) {
    val homeName = match.home?.let { localizedTeamName(it) }
        ?: stringResource(R.string.sports_widget_team_to_be_determined)
    val awayName = match.away?.let { localizedTeamName(it) }
        ?: stringResource(R.string.sports_widget_team_to_be_determined)
    val scoreText = if (match.homeScore != null && match.awayScore != null) {
        formatScoreWithSuffix(match)
    } else {
        null
    }
    // Group label only makes sense on group-stage cards. In knockout rounds the teams
    // come from different groups so home.group would be misleading — fall back to the
    // match date instead.
    val group = if (round == TournamentRound.GROUP_STAGE) {
        groupDisplayName(group = match.home?.group ?: match.away?.group)
    } else {
        null
    }
    val upcomingPrefix = if (isTeamSelected) match.date else group ?: match.date
    val rowContentDescription = penaltyRowContentDescription(match, homeName, awayName)
        ?: buildRowContentDescription(
            homeName = homeName,
            awayName = awayName,
            scoreText = scoreText,
            upcomingPrefix = upcomingPrefix,
            time = match.time,
        )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 24.dp)
            .clickable(
                onClick = {
                    if (match.home != null || match.away != null) {
                        onMatchClicked(match.home?.key, match.away?.key, "${match.date} ${match.time}")
                    }
                },
            )
            .clearAndSetSemantics {
                contentDescription = rowContentDescription
                collectionItemInfo = CollectionItemInfo(
                    rowIndex = positionInList,
                    rowSpan = 1,
                    columnIndex = 0,
                    columnSpan = 1,
                )
            },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        FlagContainer(
            flagResId = match.home?.flagResId,
            modifier = Modifier.size(width = 30.dp, height = 20.dp),
        )

        Spacer(Modifier.width(FirefoxTheme.layout.space.static100))

        Text(text = match.home?.key ?: "--", style = FirefoxTheme.typography.subtitle2)

        RelatedMatchMiddleText(
            scoreText = scoreText,
            hasPrefix = isTeamSelected || group != null,
            upcomingPrefix = upcomingPrefix,
            time = match.time,
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = FirefoxTheme.layout.space.static100),
        )

        Text(
            text = match.away?.key ?: "--",
            style = FirefoxTheme.typography.subtitle2,
        )

        Spacer(Modifier.width(FirefoxTheme.layout.space.static100))

        FlagContainer(
            flagResId = match.away?.flagResId,
            modifier = Modifier.size(width = 30.dp, height = 20.dp),
        )
    }
}

// Middle text of a related-match row: score when the match has one, otherwise the
// kickoff time — optionally with a date/group prefix when there's useful framing.
// No-team knockouts have neither a useful prefix (group is irrelevant) nor a
// selected-team date framing, so the row falls through to just the kickoff time.
@Composable
private fun RelatedMatchMiddleText(
    scoreText: String?,
    hasPrefix: Boolean,
    upcomingPrefix: String,
    time: String,
    modifier: Modifier = Modifier,
) {
    if (scoreText != null) {
        Text(
            text = scoreText,
            modifier = modifier,
            style = FirefoxTheme.typography.subtitle2,
            textAlign = TextAlign.Center,
        )
        return
    }
    val displayText = if (hasPrefix) "$upcomingPrefix · $time" else time
    Text(
        text = displayText,
        modifier = modifier,
        style = FirefoxTheme.typography.body2,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
    )
}

@Composable
private fun buildRowContentDescription(
    homeName: String,
    awayName: String,
    scoreText: String?,
    upcomingPrefix: String,
    time: String,
): String = if (scoreText != null) {
    stringResource(
        R.string.sports_widget_match_content_description,
        homeName,
        awayName,
        scoreText,
    )
} else {
    stringResource(
        R.string.sports_widget_upcoming_match_content_description,
        homeName,
        awayName,
        upcomingPrefix,
        time,
    )
}

/**
 * Formats a match's score. A penalty shootout is shown as `2 - 2 · Penalties (3-5)`, the
 * regulation score followed by the shootout score. A plain final appends " (Full time)".
 */
@Composable
private fun formatScoreWithSuffix(match: Match): String {
    val (homePenalty, awayPenalty) = match.matchStatus.penaltyScores() ?: (null to null)
    if (homePenalty != null && awayPenalty != null) {
        val penalties = stringResource(R.string.sports_widget_penalties)
        return "${match.homeScore} - ${match.awayScore} · $penalties ($homePenalty-$awayPenalty)"
    }
    val suffix = if (match.matchStatus == MatchStatus.Final) {
        stringResource(R.string.sports_widget_match_full_time_suffix)
    } else {
        ""
    }
    return "${match.homeScore} - ${match.awayScore} $suffix".trim()
}

// Shootout scores for a match decided (or being decided) on penalties, or null otherwise.
private fun MatchStatus.penaltyScores(): Pair<Int?, Int?>? = when (this) {
    is MatchStatus.Penalties -> homePenalty to awayPenalty
    is MatchStatus.FinalAfterPenalties -> homePenalty to awayPenalty
    else -> null
}

// Content description for a penalty match, or null when this isn't a fully-scored penalty match.
// Mirrors the featured match card: announces each score next to its team ("France 2 South
// Africa 2") rather than the visual "2 - 2" dash form, then the shootout result.
@Composable
private fun penaltyRowContentDescription(match: Match, homeName: String, awayName: String): String? {
    val (homePenalty, awayPenalty) = match.matchStatus.penaltyScores() ?: return null
    if (homePenalty == null || awayPenalty == null) return null
    val homeScore = match.homeScore ?: return null
    val awayScore = match.awayScore ?: return null
    val penalties = stringResource(R.string.sports_widget_penalties)
    return "$homeName $homeScore $awayName $awayScore $penalties ($homePenalty-$awayPenalty)"
}

private data class RelatedMatchesPreviewState(
    val labelResId: Int?,
    val matches: List<Match>,
)

private class RelatedMatchesPreviewProvider : PreviewParameterProvider<RelatedMatchesPreviewState> {
    override val values = sequenceOf(
        RelatedMatchesPreviewState(
            labelResId = R.string.sports_widget_related_matches,
            matches = FakeSportsPreview.relatedMatches(),
        ),
        RelatedMatchesPreviewState(
            labelResId = null,
            matches = listOf(
                FakeSportsPreview.match(
                    homeScore = 1,
                    awayScore = 2,
                    matchStatus = MatchStatus.Live(period = "2", clock = "67"),
                ),
                FakeSportsPreview.match(
                    homeScore = 1,
                    awayScore = 2,
                    matchStatus = MatchStatus.Final,
                ),
                FakeSportsPreview.match(
                    homeScore = 2,
                    awayScore = 2,
                    matchStatus = MatchStatus.FinalAfterPenalties(homePenalty = 3, awayPenalty = 5),
                ),
            ),
        ),
    )
}

@FlexibleWindowLightDarkPreview
@Composable
private fun RelatedMatchesSectionPreview(
    @PreviewParameter(RelatedMatchesPreviewProvider::class) state: RelatedMatchesPreviewState,
) {
    FirefoxTheme {
        Surface {
            RelatedMatchesSection(
                matches = state.matches,
                round = TournamentRound.GROUP_STAGE,
                isTeamSelected = true,
                onMatchClicked = { _, _, _ -> },
            )
        }
    }
}
