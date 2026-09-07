/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports.ui

import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.LinearGradientShader
import androidx.compose.ui.graphics.Shader
import androidx.compose.ui.graphics.ShaderBrush
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.traversalIndex
import androidx.compose.ui.text.font.FontWeight.Companion.W700
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.PagerIndicator
import mozilla.components.compose.base.button.IconButton
import mozilla.components.compose.base.theme.AcornCorners
import org.mozilla.fenix.R
import org.mozilla.fenix.home.sports.FollowedTeamOutcome
import org.mozilla.fenix.home.sports.Match
import org.mozilla.fenix.home.sports.TournamentRound
import org.mozilla.fenix.home.sports.fake.FakeSportsPreview
import org.mozilla.fenix.theme.FirefoxTheme
import mozilla.components.ui.icons.R as iconsR
import org.mozilla.fenix.home.sports.MatchCard as MatchCardState

/**
 * Card that renders a sports celebration for third place, runner-up and champions.
 *
 * @param state The [MatchCardState] to display in this card.
 * @param onMatchClicked Used to handle match click actions.
 * @param onGetCustomWallpaper Invoked when the user clicks on the "Get custom wallpaper" menu item.
 * @param onShare Invoked when the user clicks on the "Share" menu item.
 * @param onRemove Invoked when the user dismisses the sports widget.
 * @param modifier [Modifier] to be applied to the card.
 * @param pageNumber 1-based page position when this card is rendered inside a pager; used by the
 * header to announce e.g. "Group D, page 1 of 2" for assistive technology.
 * @param pageCount Total number of pages when rendered inside a pager. Ignored if `pageNumber` is null.
 */
@Composable
fun ChampionsCard(
    state: MatchCardState,
    onMatchClicked: (String?, String?, String?) -> Unit,
    onGetCustomWallpaper: () -> Unit,
    onShare: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
    pageNumber: Int? = null,
    pageCount: Int? = null,
) {
    val flagContentDescription = pagerHeadingContentDescription(
        baseText = stringResource(R.string.sports_widget_final_results_content_description),
        pageNumber = pageNumber,
        pageCount = pageCount,
    )
    val championBodyTopPadding = 80.dp
    val tertiary = MaterialTheme.colorScheme.tertiary
    val midColor = if (isSystemInDarkTheme()) {
        MaterialTheme.colorScheme.secondaryContainer
    } else {
        MaterialTheme.colorScheme.errorContainer
    }
    val primary = MaterialTheme.colorScheme.primary
    val gradientBrush = remember(tertiary, midColor, primary) {
        object : ShaderBrush() {
            override fun createShader(size: Size): Shader = LinearGradientShader(
                from = Offset(0f, 0f),
                to = Offset(0f, size.height * 1.2f),
                colors = listOf(tertiary, midColor, primary),
                colorStops = listOf(0f, 0.5f, 1f),
            )
        }
    }
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.large)
            .background(brush = gradientBrush),
    ) {
        Image(
            painter = painterResource(R.drawable.sports_widget_celebration),
            contentDescription = null,
            modifier = Modifier.matchParentSize(),
            alignment = Alignment.TopCenter,
            contentScale = ContentScale.Crop,
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(FirefoxTheme.layout.space.static100),
        ) {
            Box(modifier = Modifier.matchParentSize()) {
                Image(
                    painter = painterResource(R.drawable.fox_sitting_looking_up),
                    modifier = Modifier.align(Alignment.TopEnd),
                    contentDescription = null,
                )
            }

            state.matches.firstOrNull()?.let { match ->
                ChampionBody(
                    match = match,
                    matchViewerOutcome = state.viewerOutcome,
                    flagContentDescription = flagContentDescription,
                    onMatchClicked = onMatchClicked,
                    onGetCustomWallpaper = onGetCustomWallpaper,
                    onShare = onShare,
                    onRemove = onRemove,
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = championBodyTopPadding),
                )
            }
        }
    }
}

@Composable
private fun ChampionBody(
    match: Match,
    matchViewerOutcome: FollowedTeamOutcome,
    flagContentDescription: String,
    onMatchClicked: (String?, String?, String?) -> Unit,
    onGetCustomWallpaper: () -> Unit,
    onShare: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val flagWidth = 90.dp
    val flagHeight = 60.dp
    val halfFlag = flagHeight / 2

    Box(
        modifier = modifier
            .semantics { isTraversalGroup = true }
            .background(
                color = MaterialTheme.colorScheme.surfaceContainerLowest,
                shape = RoundedCornerShape(AcornCorners.large),
            )
            .padding(
                start = FirefoxTheme.layout.space.static150,
                end = FirefoxTheme.layout.space.static150,
                bottom = FirefoxTheme.layout.space.static200,
            ),
    ) {
        ChampionDetails(
            match = match,
            championContentDescription = championContentDescription(outcome = matchViewerOutcome),
            championKey = championKey(outcome = matchViewerOutcome),
            championTitle = championTitle(outcome = matchViewerOutcome),
            onMatchClicked = onMatchClicked,
            modifier = Modifier.padding(top = halfFlag + FirefoxTheme.layout.space.static100),
        )

        FlagContainer(
            flagResId = championFlag(outcome = matchViewerOutcome),
            modifier = Modifier
                .align(Alignment.TopCenter)
                .offset(y = -halfFlag)
                .size(width = flagWidth, height = flagHeight)
                .semantics {
                    heading()
                    contentDescription = flagContentDescription
                },
        )

        ChampionOverflowMenu(
            onGetCustomWallpaper = onGetCustomWallpaper,
            onShare = onShare,
            onRemove = onRemove,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = FirefoxTheme.layout.space.static150),
        )
    }
}

@Composable
private fun ChampionDetails(
    match: Match,
    championContentDescription: String,
    championKey: String,
    championTitle: String,
    onMatchClicked: (String?, String?, String?) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = championKey,
            style = FirefoxTheme.typography.headline5,
            fontWeight = W700,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.clearAndSetSemantics {
                contentDescription = championContentDescription
            },
        )

        Spacer(modifier = Modifier.height(FirefoxTheme.layout.space.static50))

        Text(
            text = championTitle,
            style = FirefoxTheme.typography.body2,
            color = MaterialTheme.colorScheme.onSurface,
        )

        Spacer(modifier = Modifier.height(FirefoxTheme.layout.space.static200))

        MatchBody(
            match = match,
            errorState = null,
            showDivider = false,
            isTeamSelected = false,
            onMatchClicked = onMatchClicked,
            onRefresh = {},
        )

        Spacer(modifier = Modifier.height(FirefoxTheme.layout.space.static200))

        val pagerState = LocalSportsPagerState.current
        if (pagerState != null && pagerState.pageCount > 1) {
            PagerIndicator(
                pagerState = pagerState,
                modifier = Modifier.clearAndSetSemantics {},
                inactiveColor = MaterialTheme.colorScheme.surfaceTint,
            )
        }
    }
}

@Composable
private fun ChampionOverflowMenu(
    onGetCustomWallpaper: () -> Unit,
    onShare: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var showMenu by remember { mutableStateOf(false) }
    Box(modifier = modifier) {
        IconButton(
            onClick = { showMenu = true },
            contentDescription = stringResource(R.string.sports_widget_more_options_content_description),
            modifier = Modifier.semantics { traversalIndex = 1f },
        ) {
            Icon(
                painter = painterResource(iconsR.drawable.mozac_ic_ellipsis_vertical_24),
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurface,
            )
        }
        SportsWidgetMenu(
            expanded = showMenu,
            onDismissRequest = { showMenu = false },
            onChangeTeam = null,
            onGetCustomWallpaper = onGetCustomWallpaper,
            onShare = onShare,
            onRemove = onRemove,
        )
    }
}

@Composable
@DrawableRes
private fun championFlag(outcome: FollowedTeamOutcome): Int? = when (outcome) {
    is FollowedTeamOutcome.TournamentWinner -> outcome.winner.flagResId
    is FollowedTeamOutcome.ThirdPlace -> outcome.winner.flagResId
    else -> null
}

@Composable
private fun championKey(outcome: FollowedTeamOutcome): String = when (outcome) {
    is FollowedTeamOutcome.TournamentWinner -> outcome.winner.key
    is FollowedTeamOutcome.ThirdPlace -> outcome.winner.key
    else -> ""
}

@Composable
private fun championContentDescription(outcome: FollowedTeamOutcome): String = when (outcome) {
    is FollowedTeamOutcome.TournamentWinner -> localizedTeamName(outcome.winner)
    is FollowedTeamOutcome.ThirdPlace -> localizedTeamName(outcome.winner)
    else -> ""
}

@Composable
private fun championTitle(outcome: FollowedTeamOutcome): String = when (outcome) {
    is FollowedTeamOutcome.TournamentWinner -> stringResource(id = R.string.sports_widget_champions_title)
    is FollowedTeamOutcome.ThirdPlace -> stringResource(id = R.string.sports_widget_third_place_title)
    else -> ""
}

@PreviewLightDark
@Composable
private fun ChampionsCardPreview() {
    FirefoxTheme {
        Surface {
            Column {
                ChampionsCard(
                    state = MatchCardState(
                        matches = listOf(FakeSportsPreview.match()),
                        round = TournamentRound.THIRD_PLACE_PLAYOFF,
                        viewerOutcome = FollowedTeamOutcome.TournamentWinner(FakeSportsPreview.can),
                        relatedMatches = listOf(),
                    ),
                    onMatchClicked = { _, _, _ -> },
                    onGetCustomWallpaper = {},
                    onShare = {},
                    onRemove = {},
                )

                Spacer(modifier = Modifier.height(FirefoxTheme.layout.space.static100))

                ChampionsCard(
                    state = MatchCardState(
                        matches = listOf(FakeSportsPreview.match()),
                        round = TournamentRound.THIRD_PLACE_PLAYOFF,
                        viewerOutcome = FollowedTeamOutcome.ThirdPlace(FakeSportsPreview.par),
                        relatedMatches = listOf(),
                    ),
                    onMatchClicked = { _, _, _ -> },
                    onGetCustomWallpaper = {},
                    onShare = {},
                    onRemove = {},
                )
            }
        }
    }
}
