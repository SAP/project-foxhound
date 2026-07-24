/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.library

import android.content.Context
import android.view.ViewGroup
import androidx.appcompat.widget.Toolbar
import mozilla.components.support.ktx.android.content.getColorFromAttr
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.asActivity
import org.mozilla.fenix.ext.setToolbarColors
import com.google.android.material.R as materialR
import mozilla.components.ui.icons.R as iconsR

open class LibraryPageView(
    val containerView: ViewGroup,
) {
    protected val context: Context inline get() = containerView.context
    protected val activity = context.asActivity()

    protected fun setUiForNormalMode(
        title: String?,
    ) {
        updateToolbar(
            title = title,
            foregroundColor = context.getColorFromAttr(materialR.attr.colorOnSurface),
            backgroundColor = context.getColorFromAttr(materialR.attr.colorSurface),
        )
    }

    protected fun setUiForSelectingMode(
        title: String?,
    ) {
        updateToolbar(
            title = title,
            foregroundColor = context.getColorFromAttr(materialR.attr.colorOnPrimary),
            backgroundColor = context.getColorFromAttr(materialR.attr.colorPrimarySurface),
        )
    }

    private fun updateToolbar(title: String?, foregroundColor: Int, backgroundColor: Int) {
        activity?.title = title
        val toolbar = activity?.findViewById<Toolbar>(R.id.navigationToolbar)
        toolbar?.setToolbarColors(foregroundColor, backgroundColor)
        toolbar?.setNavigationIcon(iconsR.drawable.mozac_ic_back_24)
        toolbar?.navigationIcon?.setTint(foregroundColor)
    }
}
