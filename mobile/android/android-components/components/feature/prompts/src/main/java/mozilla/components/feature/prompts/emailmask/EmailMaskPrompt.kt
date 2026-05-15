/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.prompts.emailmask

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.compose.base.theme.layout.AcornWindowSize.Companion.isLargeWindow
import mozilla.components.compose.cfr.CFRPopup
import mozilla.components.compose.cfr.CFRPopupContent
import mozilla.components.feature.prompts.R
import mozilla.components.support.utils.ext.isLandscape
import mozilla.components.ui.icons.R as iconsR

/**
 * Offset to align the CFR indicator and the email chip.
 */
private val indicatorArrowStartOffset = 35.dp

/**
 * A bar for displaying email mask related actions.
 *
 * @param shouldShowCfr whether the CFR should be displayed.
 * @param cfrText the text to display in the CFR.
 * @param onCfrDismiss callback for when the CFR is dismissed.
 * @param onMaskEmailClicked a mask email chip click listener.
 * @param modifier Optional modifier for the bar.
 */
@Composable
fun EmailMaskPromptBar(
    shouldShowCfr: Boolean,
    cfrText: String,
    onCfrDismiss: () -> Unit,
    onMaskEmailClicked: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var isDismissed by remember { mutableStateOf(false) }
    val canShowCfr = !isLandscapeNotTablet()

    Surface(color = Color.Transparent) {
        Column {
            if (shouldShowCfr && canShowCfr && !isDismissed) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Cfr(
                        onDismiss = {
                            isDismissed = true
                            onCfrDismiss()
                        },
                        cfrText = cfrText,
                    )
                }
            }

            Surface(
                color = MaterialTheme.colorScheme.surface,
            ) {
                Row(
                    modifier = modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                ) {
                    MaskEmailChip(
                        onClick = {
                            isDismissed = true
                            onCfrDismiss()
                            onMaskEmailClicked()
                        },
                    )
                }
            }
        }
    }
}

/**
 * Don't show the CFR on landscape unless it's at least the size of a tablet.
 */
@Composable
private fun isLandscapeNotTablet(): Boolean {
    val isLandscape = LocalContext.current.isLandscape()
    val isTablet = isLargeWindow()
    return isLandscape && !isTablet
}

@Composable
private fun Cfr(onDismiss: () -> Unit, cfrText: String) {
    CFRPopupContent(
        popupBodyColors = listOf(
            AcornTheme.colors.layerGradientEnd.toArgb(),
            AcornTheme.colors.layerGradientStart.toArgb(),
        ),
        showDismissButton = true,
        dismissButtonColor = AcornTheme.colors.iconOnColor.toArgb(),
        indicatorDirection = CFRPopup.IndicatorDirection.DOWN,
        indicatorArrowStartOffset = indicatorArrowStartOffset,
        onDismiss = { onDismiss() },
        title = {
            Text(
                text = cfrText,
                color = AcornTheme.colors.textOnColorPrimary,
                style = AcornTheme.typography.subtitle2,
            )
        },
        text = { },
        action = { },
    )
}

@Composable
private fun MaskEmailChip(
    onClick: () -> Unit,
) {
    Surface(
        modifier = Modifier
            .clickable(onClick = onClick)
            .minimumInteractiveComponentSize(),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.primaryContainer,
    ) {
        Row(
            modifier = Modifier
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                painter = painterResource(id = iconsR.drawable.mozac_ic_mask_email_24),
                contentDescription = null, // talkback should focus on the whole element
                modifier = Modifier.size(16.dp),
            )

            Spacer(modifier = Modifier.size(8.dp))

            Text(
                text = stringResource(id = R.string.mozac_feature_relay_chip_text),
                style = AcornTheme.typography.headline8,
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun EmailMaskPromptBarPreview() {
    AcornTheme {
        EmailMaskPromptBar(
            shouldShowCfr = true,
            cfrText = stringResource(
                R.string.mozac_feature_relay_email_masks_cfr,
                stringResource(R.string.firefox_relay),
            ),
            onCfrDismiss = {},
            onMaskEmailClicked = {},
        )
    }
}
