/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings

import android.content.Context
import android.util.AttributeSet
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.ComposeView
import androidx.preference.Preference
import androidx.preference.PreferenceViewHolder
import org.mozilla.fenix.R
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * A custom Preference hosting a Compose slider for font size control.
 *
 * @param context The context used to initialize the preference .
 * @param attrs Optional attribute set applied from XML.
 */
class ComposeTextSizePreference(
    context: Context,
    attrs: AttributeSet? = null,
) : Preference(context, attrs) {

    private var isSliderEnabled: Boolean = true

    init {
        layoutResource = R.layout.preference_compose_font_size_slider
    }

    override fun onBindViewHolder(holder: PreferenceViewHolder) {
        super.onBindViewHolder(holder)
        val composeView =
            holder.itemView.findViewById<ComposeView>(R.id.compose_view_font_size_slider)

        composeView.setContent {
            // Converts the stored factor (1.0) into a UI-friendly percentage (100.0).
            val initialPercentage = getPersistedFloat(1.0f) * 100f

            var sliderValue by remember(initialPercentage) { mutableFloatStateOf(initialPercentage) }
            var isSliderEnabled by remember(isSliderEnabled) { mutableStateOf(isSliderEnabled) }

            FirefoxTheme {
                FontSizePreference(
                    isEnabled = isSliderEnabled,
                    value = sliderValue,
                    onValueChange = { newValue ->
                        sliderValue = newValue
                    },
                    onValueChangeFinished = {
                        // Converts back to the stored factor (1.0).
                        val newFactor = sliderValue / 100f
                        if (callChangeListener(newFactor)) {
                            persistFloat(newFactor)
                        }
                    },
                )
            }
        }
    }

    /**
     * Updates whether or not the slider is enabled.
     *
     * @param isEnabled New enabled state.
     */
    fun setIsSliderEnabled(isEnabled: Boolean) {
        this.isSliderEnabled = isEnabled
        notifyChanged()
    }
}
