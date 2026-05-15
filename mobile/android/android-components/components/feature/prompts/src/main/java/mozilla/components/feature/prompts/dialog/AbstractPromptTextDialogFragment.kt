/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.prompts.dialog

import android.annotation.SuppressLint
import android.text.method.ScrollingMovementMethod
import android.view.LayoutInflater
import android.view.View
import android.widget.CheckBox
import android.widget.TextView
import androidx.annotation.IdRes
import androidx.core.view.isVisible
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import mozilla.components.feature.prompts.R
import mozilla.components.feature.prompts.ext.Truncation

internal const val KEY_MANY_ALERTS = "KEY_MANY_ALERTS"
internal const val KEY_USER_CHECK_BOX = "KEY_USER_CHECK_BOX"

/**
 * An abstract alert for showing a text message plus a checkbox for handling [hasShownManyDialogs].
 */
internal abstract class AbstractPromptTextDialogFragment : PromptDialogFragment() {

    /**
     * Tells if a checkbox should be shown for preventing this [sessionId] from showing more dialogs.
     */
    internal val hasShownManyDialogs: Boolean by lazy { safeArguments.getBoolean(KEY_MANY_ALERTS) }

    /**
     * Stores the user's decision from the checkbox
     * for preventing this [sessionId] from showing more dialogs.
     */
    internal var userSelectionNoMoreDialogs: Boolean
        get() = safeArguments.getBoolean(KEY_USER_CHECK_BOX)
        set(value) {
            safeArguments.putBoolean(KEY_USER_CHECK_BOX, value)
        }

    /**
     * Creates custom view that adds a [TextView] + [CheckBox] and attach the corresponding
     * events for handling [hasShownManyDialogs].
     */
    @SuppressLint("InflateParams")
    internal fun setCustomMessageView(builder: MaterialAlertDialogBuilder): MaterialAlertDialogBuilder {
        val inflater = LayoutInflater.from(requireContext())
        val view = inflater.inflate(R.layout.mozac_feature_prompt_with_check_box, null)
        val textView = view.findViewById<TextView>(R.id.message)
        textView.text = truncateMessage(message)
        textView.movementMethod = ScrollingMovementMethod()

        addCheckBoxIfNeeded(view)

        builder.setView(view)

        return builder
    }

    /**
     * Truncates the message to prevent ANR during text measurement.
     * Long strings can cause Android's native text layout engine to timeout.
     */
    private fun truncateMessage(text: String): String {
        return if (text.length > Truncation.MAX_MESSAGE_LENGTH) {
            text.substring(0, Truncation.MAX_MESSAGE_LENGTH) + "…"
        } else {
            text
        }
    }

    internal fun addCheckBoxIfNeeded(
        view: View,
        @IdRes id: Int = R.id.mozac_feature_prompts_no_more_dialogs_check_box,
    ) {
        if ((hasShownManyDialogs)) {
            val checkBox = view.findViewById<CheckBox>(id)
            checkBox.isVisible = true
            checkBox.setOnCheckedChangeListener { _, isChecked ->
                userSelectionNoMoreDialogs = isChecked
            }
        }
    }
}
