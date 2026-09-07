/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.samples.acorn.components.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.graphics.ColorUtils
import mozilla.components.compose.base.annotation.FlexibleWindowLightDarkPreview
import mozilla.components.compose.base.button.IconButton
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.ui.colors.NovaColors
import mozilla.components.ui.icons.R as iconsR

private data class ColorSwatch(
    val name: String,
    val color: Color,
)

private data class ColorGroup(
    val name: String,
    val swatches: List<ColorSwatch>,
)

private val novaColorGroups = listOf(
    ColorGroup(
        name = "Gray",
        swatches = listOf(
            ColorSwatch("Gray 0", NovaColors.Gray0),
            ColorSwatch("Gray 5", NovaColors.Gray5),
            ColorSwatch("Gray 10", NovaColors.Gray10),
            ColorSwatch("Gray 15", NovaColors.Gray15),
            ColorSwatch("Gray 20", NovaColors.Gray20),
            ColorSwatch("Gray 25", NovaColors.Gray25),
            ColorSwatch("Gray 30", NovaColors.Gray30),
            ColorSwatch("Gray 35", NovaColors.Gray35),
            ColorSwatch("Gray 40", NovaColors.Gray40),
            ColorSwatch("Gray 45", NovaColors.Gray45),
            ColorSwatch("Gray 50", NovaColors.Gray50),
            ColorSwatch("Gray 55", NovaColors.Gray55),
            ColorSwatch("Gray 60", NovaColors.Gray60),
            ColorSwatch("Gray 65", NovaColors.Gray65),
            ColorSwatch("Gray 70", NovaColors.Gray70),
            ColorSwatch("Gray 75", NovaColors.Gray75),
            ColorSwatch("Gray 80", NovaColors.Gray80),
            ColorSwatch("Gray 85", NovaColors.Gray85),
            ColorSwatch("Gray 90", NovaColors.Gray90),
        ),
    ),
    ColorGroup(
        name = "Violet Desaturated",
        swatches = listOf(
            ColorSwatch("Violet Desaturated 0", NovaColors.VioletDesaturated0),
            ColorSwatch("Violet Desaturated 0A70", NovaColors.VioletDesaturated0A70),
            ColorSwatch("Violet Desaturated 10", NovaColors.VioletDesaturated10),
            ColorSwatch("Violet Desaturated 20", NovaColors.VioletDesaturated20),
            ColorSwatch("Violet Desaturated 30", NovaColors.VioletDesaturated30),
            ColorSwatch("Violet Desaturated 40", NovaColors.VioletDesaturated40),
            ColorSwatch("Violet Desaturated 50", NovaColors.VioletDesaturated50),
            ColorSwatch("Violet Desaturated 50A86", NovaColors.VioletDesaturated50A86),
            ColorSwatch("Violet Desaturated 60", NovaColors.VioletDesaturated60),
            ColorSwatch("Violet Desaturated 70", NovaColors.VioletDesaturated70),
            ColorSwatch("Violet Desaturated 80", NovaColors.VioletDesaturated80),
            ColorSwatch("Violet Desaturated 90", NovaColors.VioletDesaturated90),
            ColorSwatch("Violet Desaturated 90A50", NovaColors.VioletDesaturated90A50),
            ColorSwatch("Violet Desaturated 90A70", NovaColors.VioletDesaturated90A70),
        ),
    ),
    ColorGroup(
        name = "Violet",
        swatches = listOf(
            ColorSwatch("Violet 0", NovaColors.Violet0),
            ColorSwatch("Violet 10", NovaColors.Violet10),
            ColorSwatch("Violet 10A50", NovaColors.Violet10A50),
            ColorSwatch("Violet 20", NovaColors.Violet20),
            ColorSwatch("Violet 30", NovaColors.Violet30),
            ColorSwatch("Violet 40", NovaColors.Violet40),
            ColorSwatch("Violet 50", NovaColors.Violet50),
            ColorSwatch("Violet 60", NovaColors.Violet60),
            ColorSwatch("Violet 70", NovaColors.Violet70),
            ColorSwatch("Violet 80", NovaColors.Violet80),
            ColorSwatch("Violet 90", NovaColors.Violet90),
        ),
    ),
    ColorGroup(
        name = "Purple",
        swatches = listOf(
            ColorSwatch("Purple 0", NovaColors.Purple0),
            ColorSwatch("Purple 10", NovaColors.Purple10),
            ColorSwatch("Purple 20", NovaColors.Purple20),
            ColorSwatch("Purple 30", NovaColors.Purple30),
            ColorSwatch("Purple 40", NovaColors.Purple40),
            ColorSwatch("Purple 50", NovaColors.Purple50),
            ColorSwatch("Purple 60", NovaColors.Purple60),
            ColorSwatch("Purple 70", NovaColors.Purple70),
            ColorSwatch("Purple 80", NovaColors.Purple80),
            ColorSwatch("Purple 90", NovaColors.Purple90),
        ),
    ),
    ColorGroup(
        name = "Pink",
        swatches = listOf(
            ColorSwatch("Pink 0", NovaColors.Pink0),
            ColorSwatch("Pink 10", NovaColors.Pink10),
            ColorSwatch("Pink 20", NovaColors.Pink20),
            ColorSwatch("Pink 30", NovaColors.Pink30),
            ColorSwatch("Pink 40", NovaColors.Pink40),
            ColorSwatch("Pink 50", NovaColors.Pink50),
            ColorSwatch("Pink 60", NovaColors.Pink60),
            ColorSwatch("Pink 70", NovaColors.Pink70),
            ColorSwatch("Pink 80", NovaColors.Pink80),
            ColorSwatch("Pink 90", NovaColors.Pink90),
        ),
    ),
    ColorGroup(
        name = "Red",
        swatches = listOf(
            ColorSwatch("Red 0", NovaColors.Red0),
            ColorSwatch("Red 10", NovaColors.Red10),
            ColorSwatch("Red 20", NovaColors.Red20),
            ColorSwatch("Red 30", NovaColors.Red30),
            ColorSwatch("Red 40", NovaColors.Red40),
            ColorSwatch("Red 50", NovaColors.Red50),
            ColorSwatch("Red 60", NovaColors.Red60),
            ColorSwatch("Red 70", NovaColors.Red70),
            ColorSwatch("Red 80", NovaColors.Red80),
            ColorSwatch("Red 90", NovaColors.Red90),
        ),
    ),
    ColorGroup(
        name = "Orange",
        swatches = listOf(
            ColorSwatch("Orange 0", NovaColors.Orange0),
            ColorSwatch("Orange 10", NovaColors.Orange10),
            ColorSwatch("Orange 10A50", NovaColors.Orange10A50),
            ColorSwatch("Orange 20", NovaColors.Orange20),
            ColorSwatch("Orange 30", NovaColors.Orange30),
            ColorSwatch("Orange 40", NovaColors.Orange40),
            ColorSwatch("Orange 50", NovaColors.Orange50),
            ColorSwatch("Orange 60", NovaColors.Orange60),
            ColorSwatch("Orange 70", NovaColors.Orange70),
            ColorSwatch("Orange 70A50", NovaColors.Orange70A50),
            ColorSwatch("Orange 80", NovaColors.Orange80),
            ColorSwatch("Orange 90", NovaColors.Orange90),
        ),
    ),
    ColorGroup(
        name = "Yellow",
        swatches = listOf(
            ColorSwatch("Yellow 0", NovaColors.Yellow0),
            ColorSwatch("Yellow 10", NovaColors.Yellow10),
            ColorSwatch("Yellow 20", NovaColors.Yellow20),
            ColorSwatch("Yellow 30", NovaColors.Yellow30),
            ColorSwatch("Yellow 40", NovaColors.Yellow40),
            ColorSwatch("Yellow 50", NovaColors.Yellow50),
            ColorSwatch("Yellow 60", NovaColors.Yellow60),
            ColorSwatch("Yellow 70", NovaColors.Yellow70),
            ColorSwatch("Yellow 80", NovaColors.Yellow80),
            ColorSwatch("Yellow 90", NovaColors.Yellow90),
        ),
    ),
    ColorGroup(
        name = "Green",
        swatches = listOf(
            ColorSwatch("Green 0", NovaColors.Green0),
            ColorSwatch("Green 10", NovaColors.Green10),
            ColorSwatch("Green 20", NovaColors.Green20),
            ColorSwatch("Green 30", NovaColors.Green30),
            ColorSwatch("Green 40", NovaColors.Green40),
            ColorSwatch("Green 50", NovaColors.Green50),
            ColorSwatch("Green 60", NovaColors.Green60),
            ColorSwatch("Green 70", NovaColors.Green70),
            ColorSwatch("Green 80", NovaColors.Green80),
            ColorSwatch("Green 90", NovaColors.Green90),
        ),
    ),
    ColorGroup(
        name = "Cyan",
        swatches = listOf(
            ColorSwatch("Cyan 0", NovaColors.Cyan0),
            ColorSwatch("Cyan 10", NovaColors.Cyan10),
            ColorSwatch("Cyan 20", NovaColors.Cyan20),
            ColorSwatch("Cyan 30", NovaColors.Cyan30),
            ColorSwatch("Cyan 40", NovaColors.Cyan40),
            ColorSwatch("Cyan 50", NovaColors.Cyan50),
            ColorSwatch("Cyan 60", NovaColors.Cyan60),
            ColorSwatch("Cyan 70", NovaColors.Cyan70),
            ColorSwatch("Cyan 80", NovaColors.Cyan80),
            ColorSwatch("Cyan 90", NovaColors.Cyan90),
        ),
    ),
    ColorGroup(
        name = "Blue",
        swatches = listOf(
            ColorSwatch("Blue 0", NovaColors.Blue0),
            ColorSwatch("Blue 10", NovaColors.Blue10),
            ColorSwatch("Blue 20", NovaColors.Blue20),
            ColorSwatch("Blue 30", NovaColors.Blue30),
            ColorSwatch("Blue 40", NovaColors.Blue40),
            ColorSwatch("Blue 50", NovaColors.Blue50),
            ColorSwatch("Blue 60", NovaColors.Blue60),
            ColorSwatch("Blue 70", NovaColors.Blue70),
            ColorSwatch("Blue 80", NovaColors.Blue80),
            ColorSwatch("Blue 90", NovaColors.Blue90),
        ),
    ),
    ColorGroup(
        name = "White / Black",
        swatches = listOf(
            ColorSwatch("White", NovaColors.White),
            ColorSwatch("Black", NovaColors.Black),
            ColorSwatch("BlackA50", NovaColors.BlackA50),
        ),
    ),
)

private fun Color.toHexString(): String {
    return "#%08X".format(toArgb())
}

private const val LUMINANCE_THRESHOLD = 0.4f

private fun Color.getReadableTextColor(): Color {
    return if (ColorUtils.calculateLuminance(toArgb()) > LUMINANCE_THRESHOLD) {
        NovaColors.Black
    } else {
        NovaColors.White
    }
}

@Composable
private fun SwatchCell(swatch: ColorSwatch, modifier: Modifier = Modifier) {
    val textColor = swatch.color.getReadableTextColor()

    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .width(120.dp)
            .background(swatch.color)
            .padding(16.dp),
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = swatch.name,
                color = textColor,
                textAlign = TextAlign.Center,
                style = AcornTheme.typography.caption,
            )

            Text(
                text = swatch.color.toHexString(),
                color = textColor,
                textAlign = TextAlign.Center,
                style = AcornTheme.typography.caption,
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ColorGroupSection(group: ColorGroup) {
    Column(
        modifier = Modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(text = group.name, style = AcornTheme.typography.subtitle1)

        FlowRow(
            modifier = Modifier.clip(RoundedCornerShape(16.dp)),
        ) {
            group.swatches.forEach { swatch ->
                SwatchCell(swatch)
            }
        }
    }
}

/**
 * Displays the Nova color palette organized by color group.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ColorsScreen(onNavigateUp: () -> Unit = {}) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Colors",
                        style = AcornTheme.typography.headline5,
                    )
                },
                navigationIcon = {
                    IconButton(
                        onClick = onNavigateUp,
                        contentDescription = "Navigate back",
                    ) {
                        Icon(
                            painter = painterResource(iconsR.drawable.mozac_ic_back_24),
                            contentDescription = null,
                        )
                    }
                },
                actions = { ThemeToggleButton() },
            )
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            novaColorGroups.forEachIndexed { index, group ->
                ColorGroupSection(group)

                if (index < novaColorGroups.lastIndex) {
                    HorizontalDivider()
                }
            }
        }
    }
}

@FlexibleWindowLightDarkPreview
@Composable
private fun ColorsScreenPreview() {
    AcornTheme {
        Surface {
            ColorsScreen()
        }
    }
}
