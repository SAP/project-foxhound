/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.browser.awesomebar.internal.optimizedsuggestions

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.compose.base.theme.acornPrivateColorScheme
import mozilla.components.compose.base.theme.privateColorPalette
import mozilla.components.compose.base.theme.success
import mozilla.components.compose.browser.awesomebar.R
import mozilla.components.compose.browser.awesomebar.internal.utils.SportSuggestionDataProvider
import mozilla.components.compose.browser.awesomebar.internal.utils.SportSuggestionPreviewModel
import mozilla.components.compose.browser.awesomebar.internal.utils.stringResId
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionCategory
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionDate
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionState
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionStatus
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionStatusType
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionTeam
import mozilla.components.ui.icons.R as iconsR

@Composable
internal fun SportSuggestion(
    state: SportSuggestionState,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val shouldDisplayScore by remember(state.homeTeam, state.awayTeam) {
        derivedStateOf {
            state.homeTeam.score != null && state.awayTeam.score != null
        }
    }
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(color = MaterialTheme.colorScheme.surface)
            .clickable(enabled = true, onClick = onClick),
    ) {
        Column(
            modifier = Modifier
                .padding(AcornTheme.layout.space.static200),
        ) {
            SuggestionHeader(
                sport = state.sport,
                sportCategory = state.sportCategory,
                status = state.status,
                statusType = state.statusType,
                date = state.date,
            )

            Spacer(modifier = Modifier.height(AcornTheme.layout.space.static100))

            SuggestionTeams(
                awayTeam = state.awayTeam,
                homeTeam = state.homeTeam,
                shouldDisplayScore = shouldDisplayScore,
            )
        }

        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
    }
}

@Composable
private fun SuggestionHeader(
    sport: String,
    sportCategory: SportSuggestionCategory,
    status: SportSuggestionStatus,
    statusType: SportSuggestionStatusType,
    date: SportSuggestionDate,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        sportCategory.toSportIcon()?.let {
            Icon(
                painter = it,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Spacer(modifier = Modifier.width(AcornTheme.layout.space.static50))
        Text(
            text = sport,
            overflow = TextOverflow.Ellipsis,
            maxLines = 1,
            style = AcornTheme.typography.subtitle2,
            color = MaterialTheme.colorScheme.onSurface,
        )

        Spacer(modifier = Modifier.weight(1f))

        Text(
            text = buildString {
                status.stringResId?.let {
                    append("${stringResource(it)} · ")
                }
                append(getSportsDate(date))
            },
            overflow = TextOverflow.Ellipsis,
            maxLines = 1,
            style = AcornTheme.typography.body2,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        if (statusType == SportSuggestionStatusType.LIVE) {
            Spacer(modifier = Modifier.weight(1f))

            LiveStatus()
        }
    }
}

@Composable
private fun SuggestionTeams(
    awayTeam: SportSuggestionTeam,
    homeTeam: SportSuggestionTeam,
    shouldDisplayScore: Boolean,
) {
    val teamContentDescription = getTeamContentDescription(shouldDisplayScore, awayTeam, homeTeam)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .border(
                width = 1.dp,
                color = MaterialTheme.colorScheme.outlineVariant,
                shape = MaterialTheme.shapes.small,
            )
            .padding(
                vertical = AcornTheme.layout.space.static150,
                horizontal = AcornTheme.layout.space.static100,
            )
            .clearAndSetSemantics {
                this.contentDescription = teamContentDescription
            },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Team(
            team = awayTeam,
            shouldDisplayScore = shouldDisplayScore,
            isAwayTeam = true,
            modifier = Modifier.weight(1f),
        )

        ScoreText(
            text = ":",
            modifier = Modifier.padding(horizontal = AcornTheme.layout.space.static100),
        )

        Team(
            team = homeTeam,
            shouldDisplayScore = shouldDisplayScore,
            isAwayTeam = false,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun SportSuggestionCategory.toSportIcon(): Painter? =
    when (this) {
        SportSuggestionCategory.BASEBALL -> painterResource(iconsR.drawable.mozac_ic_baseball_24)
        SportSuggestionCategory.BASKETBALL -> painterResource(iconsR.drawable.mozac_ic_basketball_24)
        SportSuggestionCategory.HOCKEY -> painterResource(iconsR.drawable.mozac_ic_hockey_24)
        SportSuggestionCategory.SOCCER -> painterResource(iconsR.drawable.mozac_ic_soccer_ball_24)
        SportSuggestionCategory.FOOTBALL -> painterResource(iconsR.drawable.mozac_ic_football_24)
        SportSuggestionCategory.GOLF -> painterResource(iconsR.drawable.mozac_ic_golf_24)
        SportSuggestionCategory.RACING -> painterResource(iconsR.drawable.mozac_ic_racing_24)
        SportSuggestionCategory.MISC -> null
    }

@Composable
private fun getSportsDate(sportSuggestionDate: SportSuggestionDate): String =
    when (sportSuggestionDate) {
        is SportSuggestionDate.General -> sportSuggestionDate.date
        is SportSuggestionDate.Today -> stringResource(R.string.mozac_browser_awesomebar_sport_suggestion_date_today)
        is SportSuggestionDate.Tomorrow -> stringResource(
            R.string.mozac_browser_awesomebar_sport_suggestion_date_tomorrow,
            sportSuggestionDate.time,
        )
    }

@Composable
private fun getTeamContentDescription(
    shouldDisplayScore: Boolean,
    awayTeam: SportSuggestionTeam,
    homeTeam: SportSuggestionTeam,
) = if (shouldDisplayScore) {
    "${awayTeam.name}. ${awayTeam.score}. ${homeTeam.name}. ${homeTeam.score}"
} else {
    stringResource(
        R.string.mozac_browser_awesomebar_sport_suggestion_talkback_team_description_no_score,
        awayTeam.name,
        homeTeam.name,
    )
}

@Composable
private fun LiveStatus(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .background(
                color = MaterialTheme.colorScheme.success,
                shape = MaterialTheme.shapes.small,
            )
            .clip(MaterialTheme.shapes.small)
            .padding(horizontal = 8.dp),
    ) {
        Text(
            text = stringResource(R.string.mozac_browser_awesomebar_sport_suggestion_live),
            style = AcornTheme.typography.subtitle2,
            overflow = TextOverflow.Ellipsis,
            maxLines = 1,
            color = MaterialTheme.colorScheme.onPrimary,
        )
    }
}

@Composable
private fun Team(
    team: SportSuggestionTeam,
    shouldDisplayScore: Boolean,
    isAwayTeam: Boolean,
    modifier: Modifier = Modifier,
) {
    val icon = team.icon
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        if (shouldDisplayScore && !isAwayTeam) {
            ScoreText(
                text = "${team.score}",
                modifier = Modifier.padding(end = AcornTheme.layout.space.static100),
            )
        }

        Column(
            modifier = modifier,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            if (icon != null) {
                Image(
                    bitmap = icon.asImageBitmap(),
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                )
            }
            Text(
                text = team.name,
                style = AcornTheme.typography.subtitle2,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
            )
        }

        if (shouldDisplayScore && isAwayTeam) {
            ScoreText(
                text = "${team.score}",
                modifier = Modifier.padding(start = AcornTheme.layout.space.static100),
            )
        }
    }
}

@Composable
private fun ScoreText(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        textAlign = TextAlign.Center,
        style = AcornTheme.typography.headline5,
        fontWeight = FontWeight.W700,
        color = MaterialTheme.colorScheme.primary,
        modifier = modifier,
    )
}

@PreviewLightDark
@Composable
private fun SportSuggestionPreview(
    @PreviewParameter(SportSuggestionDataProvider::class) config: SportSuggestionPreviewModel,
) {
    AcornTheme {
        Surface {
            SportSuggestion(
                state = config.state,
                onClick = {},
            )
        }
    }
}

@Preview
@Composable
private fun SportSuggestionPreviewPrivate(
    @PreviewParameter(SportSuggestionDataProvider::class) config: SportSuggestionPreviewModel,
) {
    AcornTheme(
        colors = privateColorPalette,
        colorScheme = acornPrivateColorScheme(),
    ) {
        Surface {
            SportSuggestion(
                state = config.state,
                onClick = {},
            )
        }
    }
}
