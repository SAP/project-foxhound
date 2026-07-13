/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings

import android.content.Context
import android.util.AttributeSet
import android.widget.TextView
import androidx.core.view.isGone
import androidx.preference.PreferenceViewHolder
import androidx.preference.SwitchPreferenceCompat
import org.mozilla.fenix.R
import kotlin.properties.Delegates

/**
 * A [SwitchPreferenceCompat] that renders an additional caption line below its summary. The
 * caption text is set programmatically via [caption]; the caption view is hidden while it is empty.
 */
class SwitchWithCaptionPreference @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    attributeSetId: Int = androidx.preference.R.attr.switchPreferenceCompatStyle,
) : SwitchPreferenceCompat(context, attrs, attributeSetId) {

    private var captionView: TextView? = null

    var caption: CharSequence? by Delegates.observable(null) { _, _, new -> updateCaption(new) }

    init {
        layoutResource = R.layout.preference_switch_with_caption
    }

    override fun onBindViewHolder(holder: PreferenceViewHolder) {
        super.onBindViewHolder(holder)
        captionView = holder.findViewById(R.id.preference_caption) as? TextView
        updateCaption(caption)
    }

    private fun updateCaption(text: CharSequence?) {
        captionView?.text = text
        captionView?.isGone = text.isNullOrEmpty()
    }
}
