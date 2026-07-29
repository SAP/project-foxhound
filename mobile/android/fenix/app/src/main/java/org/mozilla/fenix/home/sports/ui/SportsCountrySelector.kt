/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.traversalIndex
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.BottomSheetHandle
import mozilla.components.compose.base.annotation.FlexibleWindowLightDarkPreview
import mozilla.components.compose.base.badge.CheckmarkBadge
import mozilla.components.compose.base.badge.CheckmarkBadgeColors
import mozilla.components.compose.base.theme.information
import mozilla.components.compose.base.theme.surfaceDimVariant
import org.mozilla.fenix.R
import org.mozilla.fenix.home.sports.Region
import org.mozilla.fenix.home.sports.Team
import org.mozilla.fenix.home.sports.regionGrouping
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * A bottom sheet that displays a country selector for the sports tournament.
 *
 * @param selectedCountryCode The ISO code of the currently selected country, or null if none.
 * @param eliminatedCountryCodes ISO codes of teams that have been eliminated from the tournament.
 * Eliminated flags are dimmed and not selectable, but the currently selected country can always
 * be tapped to deselect.
 * @param onCountrySelected Callback when a country is selected, with the country's ISO code.
 * @param onDismiss Callback when the bottom sheet is dismissed.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SportsCountrySelectorBottomSheet(
    selectedCountryCode: String?,
    eliminatedCountryCodes: Set<String>,
    onCountrySelected: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val topPadding = 72.dp

    LaunchedEffect(Unit) {
        sheetState.show()
    }

    val dragHandleContentDescription =
        stringResource(R.string.sports_widget_close_team_selection_sheet_content_description)
    ModalBottomSheet(
        modifier = Modifier.padding(top = topPadding),
        contentWindowInsets = { WindowInsets.safeDrawing.only(WindowInsetsSides.Bottom) },
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surface,
        dragHandle = {
            BottomSheetHandle(
                onRequestDismiss = onDismiss,
                contentDescription = stringResource(R.string.a11y_action_label_collapse),
                modifier = Modifier
                    .padding(vertical = FirefoxTheme.layout.space.static200)
                    .semantics {
                        traversalIndex = -1f
                        contentDescription = dragHandleContentDescription
                    },
            )
        },
    ) {
        CountrySelectorContent(
            selectedCountryCode = selectedCountryCode,
            eliminatedCountryCodes = eliminatedCountryCodes,
            onCountrySelected = onCountrySelected,
        )
    }
}

@Composable
private fun CountrySelectorContent(
    selectedCountryCode: String?,
    eliminatedCountryCodes: Set<String>,
    onCountrySelected: (String) -> Unit,
) {
    Column(
        modifier = Modifier.Companion
            .verticalScroll(rememberScrollState())
            .padding(
                start = FirefoxTheme.layout.space.static200,
                end = FirefoxTheme.layout.space.static200,
                bottom = FirefoxTheme.layout.space.static400,
            ),
    ) {
        Text(
            text = stringResource(R.string.sports_widget_country_selector_title),
            style = FirefoxTheme.typography.headline7,
            modifier = Modifier
                .fillMaxWidth()
                .padding(
                    top = FirefoxTheme.layout.space.static150,
                    bottom = FirefoxTheme.layout.space.static200,
                ),
        )

        regionGrouping.forEach { region ->
            RegionSection(
                region = region,
                selectedCountryCode = selectedCountryCode,
                eliminatedCountryCodes = eliminatedCountryCodes,
                onCountrySelected = onCountrySelected,
            )

            Spacer(modifier = Modifier.height(12.dp))
        }
    }
}

@Composable
private fun RegionSection(
    region: Region,
    selectedCountryCode: String?,
    eliminatedCountryCodes: Set<String>,
    onCountrySelected: (String) -> Unit,
) {
    Text(
        text = stringResource(region.nameResId),
        style = FirefoxTheme.typography.headline8,
        color = MaterialTheme.colorScheme.onSurface,
        modifier = Modifier.padding(bottom = 8.dp),
    )

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        color = MaterialTheme.colorScheme.surfaceDimVariant,
    ) {
        FlowRow(
            modifier = Modifier.padding(
                start = FirefoxTheme.layout.space.static200,
                top = FirefoxTheme.layout.space.static200,
                end = FirefoxTheme.layout.space.static200,
                bottom = FirefoxTheme.layout.space.static150,
            ),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            region.teams.forEach { team ->
                CountryFlagItem(
                    team = team,
                    isSelected = team.key == selectedCountryCode,
                    isEliminated = team.key in eliminatedCountryCodes,
                    onClick = { onCountrySelected(team.key) },
                )
            }
        }
    }
}

@Composable
private fun CountryFlagItem(
    team: Team,
    isSelected: Boolean,
    isEliminated: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val isClickable = !isEliminated || isSelected
    val grayscaleFilter = remember {
        ColorFilter.colorMatrix(ColorMatrix().apply { setToSaturation(0f) })
    }
    val localizedName = localizedTeamName(team)

    Column(
        modifier = modifier
            .toggleable(
                value = isSelected,
                enabled = isClickable,
                role = Role.Checkbox,
                onValueChange = { onClick() },
            )
            .semantics(mergeDescendants = true) {
                contentDescription = localizedName
            },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier.size(width = 60.dp, height = 40.dp),
        ) {
            Image(
                painter = painterResource(team.flagResId),
                contentDescription = null,
                colorFilter = if (isEliminated) grayscaleFilter else null,
                modifier = Modifier
                    .matchParentSize()
                    .clip(MaterialTheme.shapes.extraSmall),
            )

            if (isSelected) {
                CheckmarkBadge(
                    contentDescription = null,
                    colors = CheckmarkBadgeColors(
                        containerColor = MaterialTheme.colorScheme.information,
                        checkmarkColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = 8.dp, y = (-8).dp),
                )
            }
        }

        Spacer(modifier = Modifier.height(FirefoxTheme.layout.space.static50))

        Text(
            text = team.key,
            style = FirefoxTheme.typography.caption.copy(
                fontWeight = FontWeight.W700,
            ),
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier
                .width(72.dp)
                .clearAndSetSemantics {},
        )
    }
}

@FlexibleWindowLightDarkPreview
@Composable
private fun CountrySelectorContentPreview() {
    FirefoxTheme {
        Surface {
            CountrySelectorContent(
                selectedCountryCode = "USA",
                eliminatedCountryCodes = setOf("MEX", "GHA"),
                onCountrySelected = {},
            )
        }
    }
}
