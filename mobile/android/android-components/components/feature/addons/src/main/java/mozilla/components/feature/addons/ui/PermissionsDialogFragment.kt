/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.addons.ui

import android.annotation.SuppressLint
import android.app.Dialog
import android.content.DialogInterface
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.widget.Button
import android.widget.LinearLayout.LayoutParams
import android.widget.TextView
import androidx.annotation.VisibleForTesting
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import mozilla.components.feature.addons.Addon
import mozilla.components.feature.addons.R
import mozilla.components.support.utils.ext.getParcelableCompat

internal const val KEY_ADDON = "KEY_ADDON"
private const val KEY_DIALOG_GRAVITY = "KEY_DIALOG_GRAVITY"
private const val KEY_DIALOG_WIDTH_MATCH_PARENT = "KEY_DIALOG_WIDTH_MATCH_PARENT"
private const val KEY_POSITIVE_BUTTON_BACKGROUND_COLOR = "KEY_POSITIVE_BUTTON_BACKGROUND_COLOR"
private const val KEY_POSITIVE_BUTTON_TEXT_COLOR = "KEY_POSITIVE_BUTTON_TEXT_COLOR"
private const val KEY_POSITIVE_BUTTON_RADIUS = "KEY_POSITIVE_BUTTON_RADIUS"
private const val KEY_FOR_OPTIONAL_PERMISSIONS = "KEY_FOR_OPTIONAL_PERMISSIONS"
internal const val KEY_PERMISSIONS = "KEY_PERMISSIONS"
private const val DEFAULT_VALUE = Int.MAX_VALUE

/**
 * A dialog that shows a set of permission required by an [Addon].
 */
class PermissionsDialogFragment : AddonDialogFragment() {

    /**
     * A lambda called when the allow button is clicked.
     */
    var onPositiveButtonClicked: ((Addon) -> Unit)? = null

    /**
     * A lambda called when the deny button is clicked.
     */
    var onNegativeButtonClicked: (() -> Unit)? = null

    internal val addon get() = requireNotNull(safeArguments.getParcelableCompat(KEY_ADDON, Addon::class.java))

    internal val positiveButtonRadius
        get() =
            safeArguments.getFloat(KEY_POSITIVE_BUTTON_RADIUS, DEFAULT_VALUE.toFloat())

    internal val dialogGravity: Int
        get() =
            safeArguments.getInt(
                KEY_DIALOG_GRAVITY,
                DEFAULT_VALUE,
            )
    internal val dialogShouldWidthMatchParent: Boolean
        get() =
            safeArguments.getBoolean(KEY_DIALOG_WIDTH_MATCH_PARENT)

    internal val positiveButtonBackgroundColor
        get() =
            safeArguments.getInt(
                KEY_POSITIVE_BUTTON_BACKGROUND_COLOR,
                DEFAULT_VALUE,
            )

    internal val positiveButtonTextColor
        get() =
            safeArguments.getInt(
                KEY_POSITIVE_BUTTON_TEXT_COLOR,
                DEFAULT_VALUE,
            )

    /**
     * This flag is used to adjust the permissions prompt for optional permissions (instead of asking
     * users to grant the required permissions at install time, which is the default).
     */
    internal val forOptionalPermissions: Boolean
        get() =
            safeArguments.getBoolean(KEY_FOR_OPTIONAL_PERMISSIONS)

    internal val permissions get() = requireNotNull(safeArguments.getStringArray(KEY_PERMISSIONS))

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val sheetDialog = Dialog(requireContext())
        sheetDialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
        sheetDialog.setCanceledOnTouchOutside(true)

        val rootView = createContainer()

        sheetDialog.setContainerView(rootView)

        sheetDialog.window?.apply {
            if (dialogGravity != DEFAULT_VALUE) {
                setGravity(dialogGravity)
            }

            if (dialogShouldWidthMatchParent) {
                setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
                // This must be called after addContentView, or it won't fully fill to the edge.
                setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            }
        }

        return sheetDialog
    }

    override fun onCancel(dialog: DialogInterface) {
        super.onCancel(dialog)
        onNegativeButtonClicked?.invoke()
    }

    private fun Dialog.setContainerView(rootView: View) {
        if (dialogShouldWidthMatchParent) {
            setContentView(rootView)
        } else {
            addContentView(
                rootView,
                LayoutParams(
                    LayoutParams.MATCH_PARENT,
                    LayoutParams.MATCH_PARENT,
                ),
            )
        }
    }

    @SuppressLint("InflateParams")
    private fun createContainer(): View {
        val rootView = LayoutInflater.from(requireContext()).inflate(
            R.layout.mozac_feature_addons_fragment_dialog_addon_permissions,
            null,
            false,
        )

        loadIcon(addon = addon, iconView = rootView.findViewById(R.id.icon))

        rootView.findViewById<TextView>(R.id.title).text = requireContext().getString(
            if (forOptionalPermissions) {
                R.string.mozac_feature_addons_optional_permissions_dialog_title
            } else {
                R.string.mozac_feature_addons_permissions_dialog_title
            },
            addon.translateName(requireContext()),
        )
        val listPermissions = buildPermissionsList()
        rootView.findViewById<TextView>(R.id.optional_or_required_text).text =
            buildOptionalOrRequiredText(listPermissions.isNotEmpty())

        val permissionsRecyclerView = rootView.findViewById<RecyclerView>(R.id.permissions)
        val positiveButton = rootView.findViewById<Button>(R.id.allow_button)
        val negativeButton = rootView.findViewById<Button>(R.id.deny_button)

        permissionsRecyclerView.adapter = RequiredPermissionsAdapter(listPermissions)
        permissionsRecyclerView.layoutManager = LinearLayoutManager(context)

        if (forOptionalPermissions) {
            positiveButton.text = requireContext().getString(R.string.mozac_feature_addons_permissions_dialog_allow)
            negativeButton.text = requireContext().getString(R.string.mozac_feature_addons_permissions_dialog_deny)
        }

        positiveButton.setOnClickListener {
            onPositiveButtonClicked?.invoke(addon)
            dismiss()
        }

        if (positiveButtonBackgroundColor != DEFAULT_VALUE) {
            val backgroundTintList =
                ContextCompat.getColorStateList(requireContext(), positiveButtonBackgroundColor)
            positiveButton.backgroundTintList = backgroundTintList
        }

        if (positiveButtonTextColor != DEFAULT_VALUE) {
            val color = ContextCompat.getColor(requireContext(), positiveButtonTextColor)
            positiveButton.setTextColor(color)
        }

        if (positiveButtonRadius != DEFAULT_VALUE.toFloat()) {
            val shape = GradientDrawable()
            shape.shape = GradientDrawable.RECTANGLE
            shape.setColor(
                ContextCompat.getColor(
                    requireContext(),
                    positiveButtonBackgroundColor,
                ),
            )
            shape.cornerRadius = positiveButtonRadius
            positiveButton.background = shape
        }

        negativeButton.setOnClickListener {
            onNegativeButtonClicked?.invoke()
            dismiss()
        }

        return rootView
    }

    @VisibleForTesting
    internal fun buildPermissionsList(): List<String> {
        return Addon.localizePermissions(permissions.asList(), requireContext())
    }

    @VisibleForTesting
    internal fun buildOptionalOrRequiredText(hasPermissions: Boolean): String {
        if (!hasPermissions) {
            return ""
        }
        val optionalOrRequiredText = if (forOptionalPermissions) {
            getString(R.string.mozac_feature_addons_optional_permissions_dialog_subtitle)
        } else {
            getString(R.string.mozac_feature_addons_permissions_dialog_subtitle)
        }

        return optionalOrRequiredText
    }

    companion object {
        /**
         * Returns a new instance of [PermissionsDialogFragment].
         * @param addon The addon to show in the dialog.
         * @param forOptionalPermissions Whether to show a permission dialog for optional permissions
         * requested by the extension.
         * @param permissions The permissions requested by the extension.
         * @param promptsStyling Styling properties for the dialog.
         * @param onPositiveButtonClicked A lambda called when the allow button is clicked.
         * @param onNegativeButtonClicked A lambda called when the deny button is clicked.
         */
        fun newInstance(
            addon: Addon,
            permissions: List<String>,
            forOptionalPermissions: Boolean = false,
            promptsStyling: PromptsStyling? = PromptsStyling(
                gravity = Gravity.BOTTOM,
                shouldWidthMatchParent = true,
            ),
            onPositiveButtonClicked: ((Addon) -> Unit)? = null,
            onNegativeButtonClicked: (() -> Unit)? = null,
        ): PermissionsDialogFragment {
            val fragment = PermissionsDialogFragment()
            val arguments = fragment.arguments ?: Bundle()

            arguments.apply {
                putParcelable(KEY_ADDON, addon)
                putBoolean(KEY_FOR_OPTIONAL_PERMISSIONS, forOptionalPermissions)
                putStringArray(KEY_PERMISSIONS, permissions.toTypedArray())

                promptsStyling?.gravity?.apply {
                    putInt(KEY_DIALOG_GRAVITY, this)
                }
                promptsStyling?.shouldWidthMatchParent?.apply {
                    putBoolean(KEY_DIALOG_WIDTH_MATCH_PARENT, this)
                }
                promptsStyling?.confirmButtonBackgroundColor?.apply {
                    putInt(KEY_POSITIVE_BUTTON_BACKGROUND_COLOR, this)
                }

                promptsStyling?.confirmButtonTextColor?.apply {
                    putInt(KEY_POSITIVE_BUTTON_TEXT_COLOR, this)
                }
            }
            fragment.onPositiveButtonClicked = onPositiveButtonClicked
            fragment.onNegativeButtonClicked = onNegativeButtonClicked
            fragment.arguments = arguments
            return fragment
        }
    }
}
