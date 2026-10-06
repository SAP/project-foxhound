/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser.applinks

import android.app.Dialog
import android.content.DialogInterface
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalWindowInfo
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat.Type.systemBars
import androidx.fragment.compose.content
import com.google.accompanist.drawablepainter.rememberDrawablePainter
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import mozilla.components.feature.app.links.RedirectDialogFragment
import org.mozilla.fenix.R
import org.mozilla.fenix.components.menu.compose.ExpandableMenuItemAnimation
import org.mozilla.fenix.ext.runIfFragmentIsAttached
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme
import com.google.android.material.R as materialR
import mozilla.components.feature.app.links.R as AppLinksR
import mozilla.components.ui.icons.R as iconsR

/**
 * Dialog fragment that prompts the user to confirm opening a link in an external app.
 */
class AppLinksPromptFragment : RedirectDialogFragment() {

    private val appName: String
        get() = requireArguments().getString(KEY_APP_NAME, "")

    private val dialogTitle: String
        get() = requireArguments().getString(KEY_TITLE, "")

    private val dialogMessage: String
        get() = requireArguments().getString(KEY_MESSAGE, "")

    private val showCheckbox: Boolean
        get() = requireArguments().getBoolean(KEY_SHOW_CHECKBOX, false)

    private val sourceUrl: String
        get() = requireArguments().getString(KEY_SOURCE_URL, "")

    private val destinationUrl: String
        get() = requireArguments().getString(KEY_DESTINATION_URL, "")

    private val firefoxUrl: String?
        get() = requireArguments().getString(KEY_FIREFOX_URL)

    private val packageName: String
        get() = requireArguments().getString(KEY_PACKAGE_NAME, "")

    private fun loadAppIcon(packageName: String): Drawable? {
        if (packageName.isEmpty()) {
            return null
        }

        return try {
            requireContext().packageManager.getApplicationIcon(packageName)
        } catch (e: PackageManager.NameNotFoundException) {
            null
        }
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog =
        (super.onCreateDialog(savedInstanceState) as BottomSheetDialog).apply {
            setOnShowListener {
                runIfFragmentIsAttached {
                    val bottomSheet = findViewById<FrameLayout>(materialR.id.design_bottom_sheet)
                    bottomSheet?.let {
                        ViewCompat.setOnApplyWindowInsetsListener(it) { view, insets ->
                            val systemBarInsets = insets.getInsets(systemBars())
                            view.setPadding(0, systemBarInsets.top, 0, systemBarInsets.bottom)
                            insets
                        }
                    }
                    bottomSheet?.setBackgroundResource(R.drawable.bottom_sheet_with_top_rounded_corners)

                    behavior.peekHeight = context.resources.displayMetrics.heightPixels
                    behavior.state = BottomSheetBehavior.STATE_EXPANDED
                }
            }
        }

    override fun onCancel(dialog: DialogInterface) {
        onDismissRedirect()
        super.onCancel(dialog)
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ) = content {
        val appIcon = loadAppIcon(packageName)
        FirefoxTheme {
            val config = AppLinkRedirectConfig(
                appName = appName,
                title = dialogTitle,
                message = dialogMessage,
                appIcon = appIcon,
                sourceUrl = sourceUrl,
                destinationUrl = destinationUrl,
                firefoxUrl = firefoxUrl,
                packageName = packageName,
                showCheckbox = showCheckbox,
            )
            AppLinkRedirectBottomSheetContent(
                config = config,
                onConfirm = { isChecked ->
                    onConfirmRedirect(isChecked)
                    dismiss()
                },
                onCancel = {
                    onCancelRedirect()
                    dismiss()
                },
            )
        }
    }

    companion object {
        private const val KEY_APP_NAME = "app_name"
        private const val KEY_TITLE = "title"
        private const val KEY_MESSAGE = "message"
        private const val KEY_SHOW_CHECKBOX = "show_checkbox"
        private const val KEY_SOURCE_URL = "source_url"
        private const val KEY_DESTINATION_URL = "destination_url"
        private const val KEY_FIREFOX_URL = "firefox_url"
        private const val KEY_UNIQUE_IDENTIFIER = "unique_identifier"
        private const val KEY_PACKAGE_NAME = "package_name"

        /**
         * Creates a new instance of [AppLinksPromptFragment] with the given parameters.
         */
        fun create(
            appName: String,
            title: String,
            message: String,
            showCheckbox: Boolean,
            sourceUrl: String = "",
            destinationUrl: String = "",
            firefoxUrl: String? = null,
            uniqueIdentifier: String = "",
            packageName: String = "",
        ): AppLinksPromptFragment {
            return AppLinksPromptFragment().apply {
                arguments = Bundle().apply {
                    putString(KEY_APP_NAME, appName)
                    putString(KEY_TITLE, title)
                    putString(KEY_MESSAGE, message)
                    putBoolean(KEY_SHOW_CHECKBOX, showCheckbox)
                    putString(KEY_SOURCE_URL, sourceUrl)
                    putString(KEY_DESTINATION_URL, destinationUrl)
                    putString(KEY_FIREFOX_URL, firefoxUrl)
                    putString(KEY_UNIQUE_IDENTIFIER, uniqueIdentifier)
                    putString(KEY_PACKAGE_NAME, packageName)
                }
            }
        }
    }
}

private const val WWW_PREFIX = "www."

private data class AppLinkRedirectConfig(
    val appName: String,
    val title: String,
    val message: String,
    val appIcon: Drawable?,
    val sourceUrl: String,
    val destinationUrl: String,
    val firefoxUrl: String?,
    val packageName: String,
    val showCheckbox: Boolean,
)

@Composable
private fun AppLinkRedirectBottomSheetContent(
    config: AppLinkRedirectConfig,
    onConfirm: (Boolean) -> Unit,
    onCancel: () -> Unit,
    initialDetailsExpanded: Boolean = false,
) {
    var isCheckboxChecked by remember { mutableStateOf(false) }

    val sourceDomain = if (config.sourceUrl.isNotEmpty()) {
        // Strip "www." per design. Other prefixes are kept as they carry meaningful context.
        config.sourceUrl.toUri().host?.removePrefix(WWW_PREFIX) ?: ""
    } else {
        ""
    }

    val maxScrollableHeight = with(LocalDensity.current) {
        (LocalWindowInfo.current.containerSize.height * 0.6f).toDp()
    }

    Column(
        modifier = Modifier
            .background(
                color = MaterialTheme.colorScheme.surface,
                shape = MaterialTheme.shapes.large,
            )
            .padding(top = 8.dp)
            .fillMaxWidth(),
    ) {
        AppHeader(
            title = config.title,
            url = sourceDomain,
            appIcon = config.appIcon,
        )

        Column(
            modifier = Modifier
                .heightIn(max = maxScrollableHeight)
                .verticalScroll(rememberScrollState())
                .padding(
                    start = 16.dp,
                    top = 8.dp,
                    end = 16.dp,
                    bottom = 16.dp,
                ),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            AppLinkDetailsSection(config, initialExpanded = initialDetailsExpanded)
        }

        if (config.showCheckbox) {
            AppLinkCheckboxSection(
                isChecked = isCheckboxChecked,
                onCheckedChange = { isCheckboxChecked = it },
            )
        }

        AppLinkActionButtons(
            appName = config.appName,
            onConfirm = { onConfirm(isCheckboxChecked) },
            onCancel = onCancel,
        )
    }
}

@Composable
private fun AppLinkItem(
    label: String,
    afterIconPainter: Painter,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(color = MaterialTheme.colorScheme.surfaceContainerHigh)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = FirefoxTheme.typography.body1,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Icon(
            painter = afterIconPainter,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun AppLinkDetailsSection(config: AppLinkRedirectConfig, initialExpanded: Boolean = false) {
    val hasDetails = config.sourceUrl.isNotEmpty() ||
        config.destinationUrl.isNotEmpty() ||
        config.packageName.isNotEmpty()

    if (!hasDetails) return

    var isExpanded by remember { mutableStateOf(initialExpanded) }

    Column(
        modifier = Modifier.clip(shape = RoundedCornerShape(28.dp)),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        AppLinkItem(
            label = stringResource(
                if (isExpanded) {
                    AppLinksR.string.mozac_feature_applinks_hide_details
                } else {
                    AppLinksR.string.mozac_feature_applinks_view_details
                },
            ),
            afterIconPainter = painterResource(
                if (isExpanded) {
                    iconsR.drawable.mozac_ic_chevron_up_24
                } else {
                    iconsR.drawable.mozac_ic_chevron_down_24
                },
            ),
            onClick = { isExpanded = !isExpanded },
        )

        ExpandableMenuItemAnimation(isExpanded = isExpanded) {
            AppLinkDetailItems(config)
        }
    }
}

@Composable
private fun AppLinkDetailItems(config: AppLinkRedirectConfig) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        if (config.sourceUrl.isNotEmpty()) {
            AppLinkDetailItem(
                label = stringResource(AppLinksR.string.mozac_feature_applinks_source_url),
                description = config.sourceUrl,
                maxDescriptionLines = 10,
            )
        }

        if (config.destinationUrl.isNotEmpty()) {
            AppLinkDetailItem(
                label = stringResource(AppLinksR.string.mozac_feature_applinks_destination_url),
                description = config.destinationUrl,
                maxDescriptionLines = 3,
            )
        }

        AppLinkDetailItem(
            label = stringResource(
                AppLinksR.string.mozac_feature_applinks_firefox_url,
                config.appName,
            ),
            description = config.firefoxUrl ?: stringResource(AppLinksR.string.mozac_feature_applinks_none),
            maxDescriptionLines = 3,
        )

        if (config.packageName.isNotEmpty()) {
            AppLinkDetailItem(
                label = stringResource(AppLinksR.string.mozac_feature_applinks_unique_identifier),
                description = config.packageName,
            )
        }
    }
}

@Composable
private fun AppLinkDetailItem(
    label: String,
    description: String,
    maxDescriptionLines: Int = 1,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape = MaterialTheme.shapes.extraSmall)
            .background(color = MaterialTheme.colorScheme.surfaceContainerHigh)
            .padding(
                horizontal = 16.dp,
                vertical = 8.dp,
            ),
    ) {
        Text(
            text = label,
            color = MaterialTheme.colorScheme.onSurface,
            style = FirefoxTheme.typography.subtitle2,
        )
        Text(
            text = description,
            color = MaterialTheme.colorScheme.secondary,
            overflow = TextOverflow.Ellipsis,
            maxLines = maxDescriptionLines,
            style = FirefoxTheme.typography.body2,
        )
    }
}

@Composable
private fun AppLinkCheckboxSection(
    isChecked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier.padding(
            horizontal = FirefoxTheme.layout.space.dynamic200,
        ),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Checkbox(
            checked = isChecked,
            onCheckedChange = onCheckedChange,
        )

        Text(
            text = stringResource(AppLinksR.string.mozac_feature_applinks_confirm_dialog_checkbox_label),
            style = FirefoxTheme.typography.body1,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun AppLinkActionButtons(
    appName: String,
    onConfirm: () -> Unit,
    onCancel: () -> Unit,
) {
    Row(
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp).fillMaxWidth(),
        horizontalArrangement = Arrangement.End,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TextButton(onClick = onCancel) {
            Text(
                text = stringResource(R.string.applinks_prompt_negative_button, appName),
                style = FirefoxTheme.typography.button,
                color = MaterialTheme.colorScheme.secondary,
            )
        }

        Spacer(modifier = Modifier.size(8.dp))

        Button(
            onClick = onConfirm,
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary,
            ),
        ) {
            Text(
                text = stringResource(AppLinksR.string.mozac_feature_applinks_confirm_dialog_confirm_2),
                style = FirefoxTheme.typography.button,
                color = MaterialTheme.colorScheme.onPrimary,
            )
        }
    }
}

@Composable
private fun AppHeader(
    title: String,
    url: String,
    appIcon: Drawable?,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp)
            .semantics(mergeDescendants = true) {},
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(MaterialTheme.colorScheme.surfaceContainerHigh),
            contentAlignment = Alignment.Center,
        ) {
            if (appIcon != null) {
                Icon(
                    painter = rememberDrawablePainter(appIcon),
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = null,
                )
            } else {
                Icon(
                    painter = painterResource(iconsR.drawable.mozac_ic_globe_24),
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = MaterialTheme.colorScheme.onSurface,
                )
            }
        }

        Spacer(modifier = Modifier.size(8.dp))

        Column {
            Text(
                text = title,
                style = FirefoxTheme.typography.headline7,
                color = MaterialTheme.colorScheme.onSurface,
            )
            if (url.isNotEmpty()) {
                Text(
                    text = stringResource(AppLinksR.string.mozac_feature_applinks_link_from, url),
                    style = FirefoxTheme.typography.caption,
                    color = MaterialTheme.colorScheme.secondary,
                )
            }
        }
    }
}

@Preview
@Composable
private fun AppLinkRedirectBottomSheetPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        AppLinkRedirectBottomSheetContent(
            config = AppLinkRedirectConfig(
                appName = "Firefox",
                title = "Open in YouTube",
                message = "Would you like to leave Firefox to view this content?",
                appIcon = null,
                sourceUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                destinationUrl = "youtube://watch?v=dQw4w9WgXcQ",
                firefoxUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                packageName = "com.google.android.youtube",
                showCheckbox = false,
            ),
            onConfirm = {},
            onCancel = {},
        )
    }
}

@Preview
@Composable
private fun AppLinkRedirectBottomSheetWithCheckboxPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        AppLinkRedirectBottomSheetContent(
            config = AppLinkRedirectConfig(
                appName = "Firefox",
                title = "Open in YouTube",
                message = "Would you like to leave Firefox to view this content?",
                appIcon = null,
                sourceUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                destinationUrl = "youtube://watch?v=dQw4w9WgXcQ",
                firefoxUrl = null,
                packageName = "com.google.android.youtube",
                showCheckbox = true,
            ),
            onConfirm = {},
            onCancel = {},
        )
    }
}

@Preview
@Composable
private fun AppLinkRedirectBottomSheetExpandedPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        AppLinkRedirectBottomSheetContent(
            config = AppLinkRedirectConfig(
                appName = "Firefox",
                title = "Open in YouTube",
                message = "Would you like to leave Firefox to view this content?",
                appIcon = null,
                sourceUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                destinationUrl = "youtube://watch?v=dQw4w9WgXcQ",
                firefoxUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                packageName = "com.google.android.youtube",
                showCheckbox = true,
            ),
            onConfirm = {},
            onCancel = {},
            initialDetailsExpanded = true,
        )
    }
}
