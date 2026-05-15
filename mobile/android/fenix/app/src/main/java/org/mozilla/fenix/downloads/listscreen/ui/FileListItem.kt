/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.downloads.listscreen.ui

import androidx.annotation.FloatRange
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.progressSemantics
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.menu.DropdownMenu
import mozilla.components.compose.base.menu.MenuItem
import mozilla.components.compose.base.text.Text
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.list.SelectableListItem
import org.mozilla.fenix.downloads.listscreen.DownloadsListTestTag
import org.mozilla.fenix.downloads.listscreen.store.FileItem
import org.mozilla.fenix.downloads.listscreen.store.TimeCategory
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.ThemedValue
import org.mozilla.fenix.theme.ThemedValueProvider
import mozilla.components.feature.media.R as mediaR
import mozilla.components.ui.icons.R as iconsR

/**
 * [SelectableListItem] used for displaying download items on the downloads screen.
 *
 * @param fileItem [FileItem] representing a download item.
 * @param isSelected The selected state of the item.
 * @param areAfterListItemIconsVisible Whether the menu icon is visible on the download item.
 * @param modifier Modifier to be applied to the [SelectableListItem].
 * @param onPauseClick Invoked when pause is clicked.
 * @param onResumeClick Invoked when resume is clicked.
 * @param onRetryClick Invoked when retry is clicked.
 * @param onDeleteClick Invoked when delete is clicked.
 * @param onShareUrlClick Invoked when share URL is clicked.
 * @param onShareFileClick Invoked when share file is clicked.
 * @param onRenameFileClick Invoked when rename file is clicked.
 */
@Composable
@Suppress("LongParameterList")
internal fun FileListItem(
    fileItem: FileItem,
    isSelected: Boolean,
    areAfterListItemIconsVisible: Boolean,
    modifier: Modifier = Modifier,
    onPauseClick: (id: String) -> Unit,
    onResumeClick: (id: String) -> Unit,
    onRetryClick: (id: String) -> Unit,
    onDeleteClick: (FileItem) -> Unit,
    onShareUrlClick: (FileItem) -> Unit,
    onShareFileClick: (FileItem) -> Unit,
    onRenameFileClick: (FileItem) -> Unit,
) {
    SelectableListItem(
        label = fileItem.fileName ?: fileItem.url,
        description = fileItem.description,
        icon = if (fileItem.status == FileItem.Status.Failed) iconsR.drawable.mozac_ic_critical_24 else fileItem.icon,
        isSelected = isSelected,
        modifier = modifier.selectableListItemProgressSemantics(status = fileItem.status),
        descriptionTextColor = if (fileItem.status == FileItem.Status.Failed) {
            MaterialTheme.colorScheme.error
        } else {
            MaterialTheme.colorScheme.onSurfaceVariant
        },
        iconTint = if (fileItem.status == FileItem.Status.Failed) {
            MaterialTheme.colorScheme.error
        } else {
            MaterialTheme.colorScheme.onSurfaceVariant
        },
        labelOverflow = TextOverflow.MiddleEllipsis,
        afterListItemAction = {
            if (areAfterListItemIconsVisible) {
                AfterListItemAction(
                    fileItem = fileItem,
                    onPauseClick = onPauseClick,
                    onResumeClick = onResumeClick,
                    onRetryClick = onRetryClick,
                    onDeleteClick = onDeleteClick,
                    onShareUrlClick = onShareUrlClick,
                    onShareFileClick = onShareFileClick,
                    onRenameFileClick = onRenameFileClick,
                )
            }
        },
        belowListItemContent = {
            when (fileItem.status) {
                FileItem.Status.Initiated -> {
                    DownloadProgressIndicator(progress = null)
                }
                is FileItem.Status.Downloading -> {
                    DownloadProgressIndicator(progress = fileItem.status.progress)
                }
                is FileItem.Status.Paused -> {
                    if (fileItem.status.progress != null) {
                        DownloadProgressIndicator(progress = fileItem.status.progress)
                    }
                }
                else -> {}
            }
        },
    )
}

@Composable
@Suppress("LongParameterList")
private fun AfterListItemAction(
    fileItem: FileItem,
    onPauseClick: (id: String) -> Unit,
    onResumeClick: (id: String) -> Unit,
    onRetryClick: (id: String) -> Unit,
    onDeleteClick: (FileItem) -> Unit,
    onShareUrlClick: (FileItem) -> Unit,
    onShareFileClick: (FileItem) -> Unit,
    onRenameFileClick: (FileItem) -> Unit,
) {
    var menuExpanded by remember { mutableStateOf(false) }

    when (fileItem.status) {
        FileItem.Status.Completed -> {}
        FileItem.Status.Initiated -> {}
        is FileItem.Status.Downloading -> {
            IconButton(
                onClick = { onPauseClick(fileItem.id) },
            ) {
                Icon(
                    painter = painterResource(mediaR.drawable.mozac_feature_media_action_pause),
                    contentDescription = stringResource(R.string.download_pause_action),
                    tint = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
        is FileItem.Status.Paused -> {
            IconButton(
                onClick = { onResumeClick(fileItem.id) },
            ) {
                Icon(
                    painter = painterResource(mediaR.drawable.mozac_feature_media_action_play),
                    contentDescription = stringResource(R.string.download_resume_action),
                    tint = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
        FileItem.Status.Cancelled -> {}
        FileItem.Status.Failed -> {
            IconButton(
                onClick = { onRetryClick(fileItem.id) },
            ) {
                Icon(
                    painter = painterResource(iconsR.drawable.mozac_ic_arrow_counter_clockwise_24),
                    contentDescription = stringResource(R.string.download_retry_action),
                    tint = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }

    Spacer(modifier = Modifier.width(24.dp))

    IconButton(
        onClick = { menuExpanded = true },
        modifier = Modifier
            .size(24.dp)
            .testTag("${DownloadsListTestTag.DOWNLOADS_LIST_ITEM_MENU}.${fileItem.fileName}"),
    ) {
        Icon(
            painter = painterResource(id = iconsR.drawable.mozac_ic_ellipsis_vertical_24),
            contentDescription = stringResource(id = R.string.content_description_menu),
            tint = MaterialTheme.colorScheme.onSurface,
        )

        DropdownMenu(
            menuItems = getContextMenuItems(
                status = fileItem.status,
                onDeleteClick = { onDeleteClick(fileItem) },
                onShareUrlClick = { onShareUrlClick(fileItem) },
                onShareFileClick = { onShareFileClick(fileItem) },
                onRenameFileClick = { onRenameFileClick(fileItem) },
            ),
            expanded = menuExpanded,
            onDismissRequest = { menuExpanded = false },
        )
    }
}

@Composable
private fun DownloadProgressIndicator(
    @FloatRange(from = 0.0, to = 1.0) progress: Float?,
) {
    Column {
        Spacer(modifier = Modifier.height(6.dp))

        if (progress == null) {
            LinearProgressIndicator(
                modifier = Modifier.clearAndSetSemantics {},
            )
        } else {
            LinearProgressIndicator(
                modifier = Modifier.clearAndSetSemantics {},
                progress = { progress },
                drawStopIndicator = {},
            )
        }
    }
}

private fun Modifier.selectableListItemProgressSemantics(status: FileItem.Status): Modifier = when (status) {
    FileItem.Status.Cancelled,
    FileItem.Status.Initiated,
        -> semantics(mergeDescendants = true) {}

    FileItem.Status.Completed,
    FileItem.Status.Failed,
        -> semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Polite }

    is FileItem.Status.Downloading,
    is FileItem.Status.Paused,
        -> progressSemantics()
}

private fun getContextMenuItems(
    status: FileItem.Status,
    onDeleteClick: () -> Unit,
    onShareUrlClick: () -> Unit,
    onShareFileClick: () -> Unit,
    onRenameFileClick: () -> Unit,
) = when (status) {
    FileItem.Status.Completed -> listOf(
        MenuItem.TextItem(
            text = Text.Resource(R.string.download_share_url),
            onClick = onShareUrlClick,
            level = MenuItem.FixedItem.Level.Default,
        ),
        MenuItem.TextItem(
            text = Text.Resource(R.string.download_share_file),
            onClick = onShareFileClick,
            level = MenuItem.FixedItem.Level.Default,
        ),
        MenuItem.TextItem(
            text = Text.Resource(R.string.download_rename_file),
            onClick = onRenameFileClick,
            level = MenuItem.FixedItem.Level.Default,
        ),
        MenuItem.TextItem(
            text = Text.Resource(R.string.download_delete_item),
            onClick = onDeleteClick,
            level = MenuItem.FixedItem.Level.Critical,
        ),
    )
    else -> listOf(
        MenuItem.TextItem(
            text = Text.Resource(R.string.download_share_url),
            onClick = onShareUrlClick,
            level = MenuItem.FixedItem.Level.Default,
        ),
        MenuItem.TextItem(
            text = Text.Resource(R.string.download_delete_item),
            onClick = onDeleteClick,
            level = MenuItem.FixedItem.Level.Critical,
        ),
    )
}

private data class FileListItemPreviewState(
    val fileItem: FileItem,
    val isSelected: Boolean,
    val areAfterListItemIconsVisible: Boolean,
)

private class FileListItemParameterProvider : ThemedValueProvider<FileListItemPreviewState>(
    sequenceOf(
        FileListItemPreviewState(
            fileItem = FileItem(
                id = "1",
                url = "https://www.mozilla.org",
                fileName = "TestJPG.jpg",
                filePath = "",
                displayedShortUrl = "mozilla.org",
                contentType = "image/jpg",
                status = FileItem.Status.Completed,
                timeCategory = TimeCategory.IN_PROGRESS,
                description = "3.4 MB • mozilla.org ",
            ),
            isSelected = false,
            areAfterListItemIconsVisible = true,
        ),
        FileListItemPreviewState(
            fileItem = FileItem(
                id = "2",
                url = "https://www.google.com",
                fileName = "TestPDF.pdf",
                filePath = "",
                displayedShortUrl = "google.com",
                contentType = "application/pdf",
                status = FileItem.Status.Completed,
                timeCategory = TimeCategory.YESTERDAY,
                description = "1.2 GB • example.com",
            ),
            isSelected = false,
            areAfterListItemIconsVisible = true,
        ),
        FileListItemPreviewState(
            fileItem = FileItem(
                id = "3",
                url = "https://www.google.com",
                fileName = "TestVideo.mp4",
                filePath = "",
                displayedShortUrl = "google.com",
                contentType = "video/mp4",
                status = FileItem.Status.Completed,
                timeCategory = TimeCategory.LAST_30_DAYS,
                description = "63 MB • example.com",
            ),
            isSelected = false,
            areAfterListItemIconsVisible = true,
        ),
        FileListItemPreviewState(
            fileItem = FileItem(
                id = "4",
                url = "https://www.google.com",
                fileName = "TestZIP.zip",
                filePath = "",
                displayedShortUrl = "google.com",
                contentType = "application/zip",
                status = FileItem.Status.Completed,
                timeCategory = TimeCategory.YESTERDAY,
                description = "30 MB • example.com",
            ),
            isSelected = false,
            areAfterListItemIconsVisible = true,
        ),
        FileListItemPreviewState(
            fileItem = FileItem(
                id = "5",
                url = "https://www.google.com",
                fileName = "TestMSWordDoc.docx",
                filePath = "",
                displayedShortUrl = "google.com",
                contentType = "application/msword",
                status = FileItem.Status.Completed,
                timeCategory = TimeCategory.YESTERDAY,
                description = "13 kB • example.com",
            ),
            isSelected = false,
            areAfterListItemIconsVisible = true,
        ),
        FileListItemPreviewState(
            fileItem = FileItem(
                id = "6",
                url = "https://www.mozilla.org",
                fileName = "TestJPG.jpg",
                filePath = "",
                displayedShortUrl = "mozilla.org",
                contentType = "image/jpg",
                status = FileItem.Status.Completed,
                timeCategory = TimeCategory.OLDER,
                description = "10 MB • example.com",
            ),
            isSelected = true,
            areAfterListItemIconsVisible = false,
        ),
        FileListItemPreviewState(
            fileItem = FileItem(
                id = "7",
                url = "https://www.google.com",
                fileName = "TestPDF.pdf",
                filePath = "",
                displayedShortUrl = "google.com",
                contentType = "application/pdf",
                status = FileItem.Status.Completed,
                timeCategory = TimeCategory.YESTERDAY,
                description = "20 MB • example.com",
            ),
            isSelected = true,
            areAfterListItemIconsVisible = false,
        ),
        FileListItemPreviewState(
            fileItem = FileItem(
                id = "8",
                url = "https://www.google.com",
                fileName = "TestVideo.mp4",
                filePath = "",
                displayedShortUrl = "google.com",
                contentType = "video/mp4",
                status = FileItem.Status.Completed,
                timeCategory = TimeCategory.YESTERDAY,
                description = "6 GB • example.com",
            ),
            isSelected = true,
            areAfterListItemIconsVisible = false,
        ),
        FileListItemPreviewState(
            fileItem = FileItem(
                id = "9",
                url = "https://www.google.com",
                fileName = "TestZIP.zip",
                filePath = "",
                displayedShortUrl = "google.com",
                contentType = "application/zip",
                status = FileItem.Status.Completed,
                timeCategory = TimeCategory.TODAY,
                description = "31 kB • example.com",
            ),
            isSelected = true,
            areAfterListItemIconsVisible = false,
        ),
        FileListItemPreviewState(
            fileItem = FileItem(
                id = "10",
                url = "https://www.google.com",
                fileName = "TestMSWordDoc.docx",
                filePath = "",
                displayedShortUrl = "google.com",
                contentType = "application/msword",
                status = FileItem.Status.Completed,
                timeCategory = TimeCategory.OLDER,
                description = "66 MB • example.com",
            ),
            isSelected = true,
            areAfterListItemIconsVisible = false,
        ),
        FileListItemPreviewState(
            fileItem = FileItem(
                id = "11",
                fileName = "File 11",
                url = "https://example.com/file11",
                description = "5 MB / 10 MB • in 5s",
                displayedShortUrl = "example.com",
                contentType = "application/zip",
                status = FileItem.Status.Downloading(progress = 0.5f),
                filePath = "",
                timeCategory = TimeCategory.IN_PROGRESS,
            ),
            isSelected = false,
            areAfterListItemIconsVisible = true,
        ),
        FileListItemPreviewState(
            fileItem = FileItem(
                id = "12",
                fileName = "File 12",
                url = "https://example.com/file12",
                description = "5 MB / 10 MB • pending",
                displayedShortUrl = "example.com",
                contentType = "application/zip",
                status = FileItem.Status.Downloading(progress = 0.5f),
                filePath = "",
                timeCategory = TimeCategory.IN_PROGRESS,
            ),
            isSelected = false,
            areAfterListItemIconsVisible = true,
        ),
        FileListItemPreviewState(
            fileItem = FileItem(
                id = "13",
                fileName = "File 13",
                url = "https://example.com/file13",
                description = "5 MB / 10 MB • paused",
                displayedShortUrl = "example.com",
                contentType = "application/zip",
                status = FileItem.Status.Paused(progress = 0.5f),
                filePath = "",
                timeCategory = TimeCategory.IN_PROGRESS,
            ),
            isSelected = false,
            areAfterListItemIconsVisible = true,
        ),
        FileListItemPreviewState(
            fileItem = FileItem(
                id = "14",
                fileName = "File 14",
                url = "https://example.com/file14",
                description = "Preparing download…",
                displayedShortUrl = "example.com",
                contentType = "application/zip",
                status = FileItem.Status.Initiated,
                filePath = "",
                timeCategory = TimeCategory.IN_PROGRESS,
            ),
            isSelected = false,
            areAfterListItemIconsVisible = true,
        ),
        FileListItemPreviewState(
            fileItem = FileItem(
                id = "15",
                fileName = "File 15",
                url = "https://example.com/file15",
                description = "Download Failed",
                displayedShortUrl = "example.com",
                contentType = "application/zip",
                status = FileItem.Status.Failed,
                filePath = "",
                timeCategory = TimeCategory.IN_PROGRESS,
            ),
            isSelected = false,
            areAfterListItemIconsVisible = true,
        ),
        FileListItemPreviewState(
            fileItem = FileItem(
                id = "16",
                fileName = "Super Super Super Super Super Super Long File.pdf",
                url = "https://example.com/file16",
                description = "Download Failed",
                displayedShortUrl = "example.com",
                contentType = "application/zip",
                status = FileItem.Status.Failed,
                filePath = "",
                timeCategory = TimeCategory.IN_PROGRESS,
            ),
            isSelected = false,
            areAfterListItemIconsVisible = true,
        ),
    ),
)

@Preview
@Composable
private fun FileListItemPreview(
    @PreviewParameter(FileListItemParameterProvider::class) state: ThemedValue<FileListItemPreviewState>,
) {
    FirefoxTheme(state.theme) {
        FileListItem(
            isSelected = state.value.isSelected,
            fileItem = state.value.fileItem,
            areAfterListItemIconsVisible = state.value.areAfterListItemIconsVisible,
            modifier = Modifier.background(MaterialTheme.colorScheme.surface),
            onPauseClick = {},
            onResumeClick = {},
            onRetryClick = {},
            onShareFileClick = {},
            onDeleteClick = {},
            onShareUrlClick = {},
            onRenameFileClick = {},
        )
    }
}
