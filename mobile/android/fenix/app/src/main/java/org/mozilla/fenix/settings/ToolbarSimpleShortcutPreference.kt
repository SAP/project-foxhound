/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings

import android.content.Context
import android.util.AttributeSet
import android.view.View.GONE
import android.view.View.VISIBLE
import android.widget.ImageView
import androidx.preference.PreferenceViewHolder
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.settings

const val SIMPLE_TOOLBAR_TYPE = "simple"

internal class ToolbarSimpleShortcutPreference @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : ToolbarShortcutPreference(context, attrs) {

    override val options: List<ShortcutOption> = simpleShortcutOptions

    override fun readSelectedKey(): String = context.settings().toolbarSimpleShortcutKey

    override fun writeSelectedKey(key: String) {
        context.settings().toolbarSimpleShortcutKey = key
    }

    override fun getToolbarType(): String = SIMPLE_TOOLBAR_TYPE

    override fun getSelectedIconImageView(holder: PreferenceViewHolder): ImageView {
        val simplePreview = holder.findViewById(R.id.toolbar_simple_shortcut_preview)
        val expandedPreview = holder.findViewById(R.id.toolbar_expanded_shortcut_preview)

        simplePreview.visibility = VISIBLE
        expandedPreview.visibility = GONE

        return simplePreview.findViewById(R.id.selected_simple_shortcut_icon)
    }
}
