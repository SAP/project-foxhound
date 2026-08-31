/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.addons

import android.app.Dialog
import android.content.DialogInterface
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.ViewGroup
import android.view.Window
import androidx.annotation.VisibleForTesting
import androidx.appcompat.app.AppCompatDialogFragment
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.core.graphics.drawable.toDrawable
import androidx.fragment.compose.content
import androidx.navigation.fragment.navArgs
import mozilla.components.compose.base.button.TextButton
import mozilla.components.support.base.android.NoObscuredTouchesDialogFragment
import org.mozilla.fenix.compose.Favicon
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme
import org.mozilla.fenix.theme.getThemeProvider
import mozilla.components.feature.addons.R as addonsR
import mozilla.components.ui.icons.R as iconsR

/**
 * [AppCompatDialogFragment] showing a modal message to users to inform about the progress of installing an addon.
 * This dialog will have a single negative button which will automatically dismiss it and inform on this through
 * the [onCancelled] callback.
 *
 * All data about the addon being installed is to be passed as navigation arguments.
 *
 * @see [DownloadAddonDialogFragmentArgs].
 */
class DownloadAddonDialogFragment : NoObscuredTouchesDialogFragment() {
    private val args by navArgs<DownloadAddonDialogFragmentArgs>()

    /**
     * Optional callback for when this dialog has been canceled by the user.
     */
    var onCancelled: (() -> Unit)? = null

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        isCancelable = false
        return Dialog(requireContext()).apply {
            requestWindowFeature(Window.FEATURE_NO_TITLE)
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ) = content {
        FirefoxTheme(overriddenTheme ?: getThemeProvider().provideTheme()) {
            DownloadAddonDialogContent(
                addonName = args.addonName,
                addonImageUrl = args.addonImageUrl,
                onCancel = { cancelDownloadingAddon() },
            )
        }
    }

    override fun onStart() {
        super.onStart()

        dialog?.window?.apply {
            setGravity(Gravity.BOTTOM)
            setBackgroundDrawable(Color.TRANSPARENT.toDrawable())
            setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        }
    }

    override fun onCancel(dialog: DialogInterface) {
        cancelDownloadingAddon()
    }

    private fun cancelDownloadingAddon() {
        dismissAllowingStateLoss()
        onCancelled?.invoke()
    }

    @VisibleForTesting
    internal var overriddenTheme: Theme? = null
}

@Composable
private fun DownloadAddonDialogContent(
    addonName: String?,
    addonImageUrl: String?,
    onCancel: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
    ) {
        Column(
            modifier = Modifier
                .padding(horizontal = FirefoxTheme.layout.space.static200)
                .padding(top = FirefoxTheme.layout.space.static150, bottom = FirefoxTheme.layout.space.static300),
        ) {
            Column(
                modifier = Modifier.semantics(mergeDescendants = true) {},
            ) {
                Header(
                    modifier = Modifier.padding(vertical = FirefoxTheme.layout.space.static100),
                )

                if (!addonName.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(FirefoxTheme.layout.space.static150))

                    AddonDetails(
                        addonName = addonName,
                        addonImageUrl = addonImageUrl,
                        modifier = Modifier.padding(horizontal = FirefoxTheme.layout.space.static300),
                    )

                    Spacer(modifier = Modifier.height(FirefoxTheme.layout.space.static300))
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                TextButton(
                    text = stringResource(id = addonsR.string.mozac_feature_addons_install_addon_dialog_cancel),
                    onClick = onCancel,
                )
            }
        }
    }
}

@Composable
private fun Header(
    modifier: Modifier = Modifier,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier,
    ) {
        Icon(
            painter = painterResource(id = iconsR.drawable.mozac_ic_extension_24),
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.size(FirefoxTheme.layout.size.static300),
        )

        Spacer(modifier = Modifier.width(FirefoxTheme.layout.space.static150))

        Text(
            text = stringResource(id = addonsR.string.mozac_extension_install_progress_caption),
            style = FirefoxTheme.typography.body2,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun AddonDetails(
    addonName: String,
    addonImageUrl: String?,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.surfaceContainerHighest)
            .padding(
                horizontal = FirefoxTheme.layout.space.static150,
                vertical = FirefoxTheme.layout.space.static200,
            ),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Favicon(
            url = "",
            imageUrl = addonImageUrl,
            size = FirefoxTheme.layout.size.static300,
        )

        Spacer(modifier = Modifier.width(FirefoxTheme.layout.space.static100))

        Text(
            text = addonName,
            style = FirefoxTheme.typography.subtitle2,
            color = MaterialTheme.colorScheme.onSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Preview
@Composable
private fun DownloadAddonDialogContentPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        DownloadAddonDialogContent(
            addonName = "Read Aloud: A Text to Speech Voice Reader",
            addonImageUrl = "",
            onCancel = {},
        )
    }
}

@Preview
@Composable
private fun DownloadAddonDialogWithNoAddonNameContentPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        DownloadAddonDialogContent(
            addonName = null,
            addonImageUrl = "",
            onCancel = {},
        )
    }
}
