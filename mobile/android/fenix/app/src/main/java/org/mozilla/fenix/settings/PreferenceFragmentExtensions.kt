/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.fenix.settings

import android.widget.EditText
import android.widget.FrameLayout
import androidx.preference.EditTextPreference
import androidx.preference.Preference
import androidx.preference.PreferenceFragmentCompat
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import org.mozilla.fenix.R

/**
 * Displays a custom [MaterialAlertDialogBuilder] for an [EditTextPreference].
 * This provides a consistent look and feel for text input dialogs across different settings screens.
 *
 * @param preference The [Preference] that was clicked.
 * @param onSuccess An optional lambda to execute custom actions after the value is successfully changed.
 * @return `true` if the dialog was handled for an [EditTextPreference], `false` otherwise.
 */
fun PreferenceFragmentCompat.showCustomEditTextPreferenceDialog(
    preference: Preference,
    onSuccess: () -> Unit = {},
): Boolean {
    if (preference !is EditTextPreference) {
        return false
    }

    val context = requireContext()
    val editText = EditText(context).apply {
        setText(preference.text)
    }

    val container = FrameLayout(context).apply {
        val horizontalPadding = context.resources.getDimensionPixelSize(R.dimen.dialog_edit_text_horizontal_padding)
        setPadding(horizontalPadding, 0, horizontalPadding, 0)
        addView(editText)
    }

    MaterialAlertDialogBuilder(context)
        .setTitle(preference.dialogTitle ?: preference.title)
        .setView(container)
        .setPositiveButton(android.R.string.ok) { _, _ ->
            val newValue = editText.text.toString()
            if (preference.callChangeListener(newValue)) {
                preference.text = newValue
                onSuccess()
            }
        }
        .setNegativeButton(android.R.string.cancel, null)
        .show()

    return true
}
