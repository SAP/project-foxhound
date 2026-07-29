/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.downloads.filewriter

import mozilla.components.browser.state.state.content.DownloadState
import java.io.OutputStream

/**
 * Interface for handling the creation of [OutputStream]s for downloads,
 * abstracting the differences between Scoped Storage and Legacy storage.
 */
interface DownloadFileWriter {

    /**
     * Creates an output stream on the local filesystem, then informs the system that a download
     * is complete after [block] is run.
     *
     * Encapsulates different behaviour depending on the SDK version.
     *
     * @param download The current state of the download.
     * @param append Whether to append to an existing file or create a new one.
     * @param shouldUseScopedStorage Whether to force the use of Scoped Storage APIs.
     * @param onUpdateState Callback to notify the caller if the download state changes.
     * @param block The logic to execute with the provided [OutputStream].
     */
    fun useFileStream(
        download: DownloadState,
        append: Boolean,
        shouldUseScopedStorage: Boolean,
        onUpdateState: (DownloadState) -> Unit,
        block: (OutputStream) -> Unit,
    )
}
