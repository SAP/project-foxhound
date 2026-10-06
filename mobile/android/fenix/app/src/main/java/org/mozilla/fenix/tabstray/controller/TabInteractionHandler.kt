/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.controller

/**
 * Interface invoked to handle tab interaction behavior
 */
interface TabInteractionHandler {
    /**
     * Moves a source tab with key [sourceKey] next to a destination tab with key [targetKey].
     * @param sourceKey: Key of source item
     * @param targetKey: Key of target item that the source will be placed next to.
     * @param placeAfter: Whether the item should be placed before or after its target
     */
    fun onMove(sourceKey: String, targetKey: String?, placeAfter: Boolean)

    /**
     * Drops a source tab on a destination tab
     * @param sourceKey: Key of source item
     * @param targetKey: Key of target item
     */
    fun onDrop(sourceKey: String, targetKey: String)

    /**
     * Called when a tab drag ends without taking an action.
     */
    fun onDragCancel()

    /**
     * Called when a drag starts
     * @param sourceKey: Key of the item being dragged.
     * @param preserveSelectMode: Whether select mode should be preserved on a drag.
     */
    fun onDragStart(sourceKey: String, preserveSelectMode: Boolean)
}

/**
 * No op [TabInteractionHandler].  Intended for previews
 */
object NoOpTabInteractionHandler : TabInteractionHandler {
    override fun onMove(sourceKey: String, targetKey: String?, placeAfter: Boolean) {
        // no op
    }

    override fun onDrop(sourceKey: String, targetKey: String) {
        // no op
    }

    override fun onDragCancel() {
        // no op
    }

    override fun onDragStart(sourceKey: String, preserveSelectMode: Boolean) {
        // no op
    }
}
