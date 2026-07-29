/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports.ui

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.badge.StatusBadge
import mozilla.components.compose.base.button.IconButton
import org.mozilla.fenix.R
import org.mozilla.fenix.home.sports.Group
import org.mozilla.fenix.home.sports.LiveMatchRefreshSource
import org.mozilla.fenix.home.sports.Match
import org.mozilla.fenix.home.sports.MatchStatus
import org.mozilla.fenix.home.sports.SportCardErrorState
import org.mozilla.fenix.home.sports.Team
import org.mozilla.fenix.home.sports.TournamentRound
import org.mozilla.fenix.theme.FirefoxTheme
import mozilla.components.ui.icons.R as iconsR

@Composable
internal fun SportCardHeader(
    match: Match,
    round: TournamentRound,
    isTeamSelected: Boolean,
    errorState: SportCardErrorState?,
    onRefresh: (LiveMatchRefreshSource) -> Unit,
    modifier: Modifier = Modifier,
    pageNumber: Int? = null,
    pageCount: Int? = null,
) {
    // Group label only makes sense on the group-stage card (both teams share a group).
    // Knockout rounds pair teams from different groups, so showing the home team's group
    // would be misleading — use the round name there.
    // For the group-stage case, fall through home → away so the label still resolves
    // when the followed team is the away side or one side carries partial data.
    val title = if (isTeamSelected && round == TournamentRound.GROUP_STAGE) {
        val groupForDisplay = match.home?.group ?: match.away?.group
        groupDisplayName(group = groupForDisplay) ?: roundDisplayName(round)
    } else {
        roundDisplayName(round)
    }

    val isLive = match.matchStatus.isLive()
    val baseContentDescription = when {
        isLive -> stringResource(R.string.sports_widget_live_game_content_description, title)
        !isTeamSelected -> "$title, ${match.date}"
        else -> title
    }
    val headerContentDescription = pagerHeadingContentDescription(
        baseText = baseContentDescription,
        pageNumber = pageNumber,
        pageCount = pageCount,
    )

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = FirefoxTheme.layout.space.static100),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            modifier = Modifier
                .weight(1f)
                .clearAndSetSemantics {
                    heading()
                    contentDescription = headerContentDescription
                },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = title,
                style = FirefoxTheme.typography.headline8,
                color = MaterialTheme.colorScheme.onSurface,
            )

            if (isLive) {
                Spacer(modifier = Modifier.width(FirefoxTheme.layout.space.static100))

                LiveBadge()
            } else if (!isTeamSelected) {
                Spacer(modifier = Modifier.width(FirefoxTheme.layout.space.static100))

                Text(
                    text = "·",
                    style = FirefoxTheme.typography.body2,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.clearAndSetSemantics {},
                )

                Spacer(modifier = Modifier.width(FirefoxTheme.layout.space.static100))

                Text(
                    text = match.date,
                    style = FirefoxTheme.typography.body2,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        if (isLive && errorState == null) {
            IconButton(
                onClick = { onRefresh(LiveMatchRefreshSource.LIVE_MATCH_HEADER) },
                contentDescription = stringResource(R.string.sports_widget_error_refresh),
                modifier = Modifier.size(24.dp),
            ) {
                Icon(
                    painter = painterResource(iconsR.drawable.mozac_ic_arrow_clockwise_24),
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurface,
                )
            }
            Spacer(modifier = Modifier.width(FirefoxTheme.layout.space.static500))
        }
    }
}

@Composable
private fun LiveBadge() {
    StatusBadge(
        status = stringResource(R.string.sports_widget_match_live),
        containerColor = MaterialTheme.colorScheme.tertiary,
    )
}

internal fun MatchStatus.isLive(): Boolean = when (this) {
    is MatchStatus.Live,
    is MatchStatus.Penalties,
        -> true

    else -> false
}

@Composable
internal fun groupDisplayName(group: Group?): String? = when (group) {
    Group.A -> stringResource(R.string.sports_widget_group_a)
    Group.B -> stringResource(R.string.sports_widget_group_b)
    Group.C -> stringResource(R.string.sports_widget_group_c)
    Group.D -> stringResource(R.string.sports_widget_group_d)
    Group.E -> stringResource(R.string.sports_widget_group_e)
    Group.F -> stringResource(R.string.sports_widget_group_f)
    Group.G -> stringResource(R.string.sports_widget_group_g)
    Group.H -> stringResource(R.string.sports_widget_group_h)
    Group.I -> stringResource(R.string.sports_widget_group_i)
    Group.J -> stringResource(R.string.sports_widget_group_j)
    Group.K -> stringResource(R.string.sports_widget_group_k)
    Group.L -> stringResource(R.string.sports_widget_group_l)
    null -> null
}

@Composable
internal fun roundDisplayName(round: TournamentRound): String = when (round) {
    TournamentRound.ROUND_OF_32 -> stringResource(R.string.sports_widget_round_of_32)
    TournamentRound.ROUND_OF_16 -> stringResource(R.string.sports_widget_round_of_16)
    TournamentRound.QUARTER_FINAL -> stringResource(R.string.sports_widget_quarter_final)
    TournamentRound.SEMI_FINAL -> stringResource(R.string.sports_widget_semi_final)
    TournamentRound.FINAL -> stringResource(R.string.sports_widget_final)
    TournamentRound.THIRD_PLACE_PLAYOFF -> stringResource(R.string.sports_widget_bronze_final)
    TournamentRound.GROUP_STAGE -> stringResource(R.string.sports_widget_group_stage)
}

private data class SportCardHeaderPreviewState(
    val round: TournamentRound,
    val groupLabel: Group?,
    val status: MatchStatus,
)

private class SportCardHeaderPreviewProvider : PreviewParameterProvider<SportCardHeaderPreviewState> {
    override val values = sequenceOf(
        SportCardHeaderPreviewState(
            round = TournamentRound.GROUP_STAGE,
            groupLabel = Group.D,
            status = MatchStatus.Live(period = "1", clock = "29"),
        ),
        SportCardHeaderPreviewState(
            round = TournamentRound.GROUP_STAGE,
            groupLabel = Group.A,
            status = MatchStatus.Scheduled,
        ),
        SportCardHeaderPreviewState(
            round = TournamentRound.ROUND_OF_16,
            groupLabel = null,
            status = MatchStatus.Scheduled,
        ),
        SportCardHeaderPreviewState(
            round = TournamentRound.SEMI_FINAL,
            groupLabel = null,
            status = MatchStatus.Penalties(),
        ),
        SportCardHeaderPreviewState(
            round = TournamentRound.FINAL,
            groupLabel = null,
            status = MatchStatus.Final,
        ),
        SportCardHeaderPreviewState(
            round = TournamentRound.THIRD_PLACE_PLAYOFF,
            groupLabel = null,
            status = MatchStatus.Scheduled,
        ),
    )
}

@PreviewLightDark
@Composable
private fun SportCardHeaderPreview(
    @PreviewParameter(SportCardHeaderPreviewProvider::class) state: SportCardHeaderPreviewState,
) {
    FirefoxTheme {
        Surface {
            SportCardHeader(
                match = Match(
                    date = "Jun 19",
                    time = "6:00 PM",
                    home = Team(
                        key = "USA",
                        flagResId = R.drawable.flag_us,
                        group = state.groupLabel,
                    ),
                    away = Team(
                        key = "PAR",
                        flagResId = R.drawable.flag_py,
                        group = state.groupLabel,
                    ),
                    matchStatus = state.status,
                ),
                round = state.round,
                isTeamSelected = true,
                errorState = null,
                onRefresh = {},
            )
        }
    }
}
