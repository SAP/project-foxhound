/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.debugsettings.tabprocesstools

import android.content.Context
import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import mozilla.components.compose.base.annotation.FlexibleWindowPreview
import org.mozilla.fenix.R
import org.mozilla.fenix.perf.ApplicationExitInfoMetrics
import org.mozilla.fenix.perf.ProcessExitRecord
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

private const val DATE_PREFIX_LENGTH = 10
private const val TIME_SUFFIX_LENGTH = 8

private const val COLOR_CRASH = 0x33FF5252
private const val COLOR_CRASH_NATIVE = 0x33D50000
private const val COLOR_ANR = 0x33FF6D00
private const val COLOR_LOW_MEMORY = 0x33FFD600
private const val COLOR_EXCESSIVE_RESOURCE = 0x33FFAB00
private const val COLOR_SIGNALED = 0x33AA00FF
private const val COLOR_OTHER = 0x22888888

@Suppress("NewApi") // getProcessExitsForDisplay is only invoked when SDK >= R (checked in LaunchedEffect)
private val defaultProcessExitsProvider: suspend (Context) -> List<ProcessExitRecord> = { ctx ->
    ApplicationExitInfoMetrics.getProcessExitsForDisplay(ctx)
}

@Composable
internal fun TabProcessTools(
    processExitsProvider: suspend (Context) -> List<ProcessExitRecord> = defaultProcessExitsProvider,
) {
    val context = LocalContext.current
    var exits by remember { mutableStateOf<List<ProcessExitRecord>?>(null) }

    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            exits = withContext(Dispatchers.IO) { processExitsProvider(context) }
        }
    }

    val availableTypes = remember(exits) {
        exits?.map { it.processType }?.distinct()?.sorted() ?: emptyList()
    }
    var selectedTypes by remember { mutableStateOf<Set<String>>(emptySet()) }
    LaunchedEffect(availableTypes) {
        if (availableTypes.isNotEmpty()) selectedTypes = availableTypes.toSet()
    }

    val filteredExits = remember(exits, selectedTypes) {
        exits?.filter { it.processType in selectedTypes } ?: emptyList()
    }

    Surface {
        Column(
            modifier = Modifier
                .padding(all = 16.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            when {
                Build.VERSION.SDK_INT < Build.VERSION_CODES.R -> Text(
                    text = stringResource(R.string.debug_drawer_tab_process_tools_unsupported),
                    style = FirefoxTheme.typography.body2,
                )
                exits == null -> Text(
                    text = stringResource(R.string.debug_drawer_tab_process_tools_empty),
                    style = FirefoxTheme.typography.body2,
                )
                else -> ProcessExitsContent(
                    availableTypes = availableTypes,
                    selectedTypes = selectedTypes,
                    filteredExits = filteredExits,
                    onTypeToggled = { type ->
                        selectedTypes = if (type in selectedTypes) {
                            selectedTypes - type
                        } else {
                            selectedTypes + type
                        }
                    },
                )
            }
        }
    }
}

@Composable
private fun ProcessExitsContent(
    availableTypes: List<String>,
    selectedTypes: Set<String>,
    filteredExits: List<ProcessExitRecord>,
    onTypeToggled: (String) -> Unit,
) {
    if (availableTypes.isNotEmpty()) {
        ProcessTypeFilter(
            availableTypes = availableTypes,
            selectedTypes = selectedTypes,
            onTypeToggled = onTypeToggled,
        )
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
    }
    if (filteredExits.isEmpty()) {
        Text(
            text = stringResource(R.string.debug_drawer_tab_process_tools_empty),
            style = FirefoxTheme.typography.body2,
        )
    } else {
        groupExitsByDate(filteredExits).forEach { (sectionTitle, records) ->
            ProcessExitSectionHeader(sectionTitle)
            records.forEach { exit ->
                ProcessExitItem(exit)
                HorizontalDivider()
            }
        }
    }
}

@Composable
private fun ProcessTypeFilter(
    availableTypes: List<String>,
    selectedTypes: Set<String>,
    onTypeToggled: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }

    val label = when {
        selectedTypes.size == availableTypes.size -> "All types"
        selectedTypes.isEmpty() -> "No types"
        else -> selectedTypes.sorted().joinToString(", ")
    }

    Box {
        OutlinedButton(onClick = { expanded = !expanded }) {
            Text(text = label, style = FirefoxTheme.typography.body2)
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            availableTypes.forEach { type ->
                DropdownMenuItem(
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(
                                checked = type in selectedTypes,
                                onCheckedChange = null,
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(text = type, style = FirefoxTheme.typography.body2)
                        }
                    },
                    onClick = { onTypeToggled(type) },
                )
            }
        }
    }
}

private fun groupExitsByDate(exits: List<ProcessExitRecord>): List<Pair<String, List<ProcessExitRecord>>> {
    val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val today = dateFormat.format(Date())
    val yesterday = Calendar.getInstance().apply {
        add(Calendar.DAY_OF_YEAR, -1)
    }.let { dateFormat.format(it.time) }

    return exits
        .groupBy { it.date.take(DATE_PREFIX_LENGTH) }
        .map { (dateKey, records) ->
            val sectionTitle = when (dateKey) {
                today -> "Today"
                yesterday -> "Yesterday"
                else -> dateKey
            }
            sectionTitle to records
        }
}

private fun exitReasonBackgroundColor(reason: String): Color = when (reason) {
    "crash" -> Color(COLOR_CRASH)
    "crash_native" -> Color(COLOR_CRASH_NATIVE)
    "anr" -> Color(COLOR_ANR)
    "low_memory" -> Color(COLOR_LOW_MEMORY)
    "excessive_resource" -> Color(COLOR_EXCESSIVE_RESOURCE)
    "signaled" -> Color(COLOR_SIGNALED)
    else -> Color(COLOR_OTHER)
}

@Composable
private fun ProcessExitSectionHeader(title: String) {
    Text(
        text = title,
        modifier = Modifier.padding(top = 12.dp, bottom = 4.dp),
        style = FirefoxTheme.typography.headline7,
    )
}

@Composable
private fun ProcessExitItem(exit: ProcessExitRecord) {
    // Using Column instead of LazyColumn to avoid the unbounded-height constraint issue that arises
    // when a LazyColumn sits inside an unsized Column.
    // Performance trade-off is irrelevant here due to the process exits' ring buffer cap.
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(exitReasonBackgroundColor(exit.reason))
            .padding(vertical = 8.dp, horizontal = 8.dp),
    ) {
        Text(
            text = exit.date.takeLast(TIME_SUFFIX_LENGTH),
            style = FirefoxTheme.typography.body2,
        )
        Text(
            text = "Reason: ${exit.reason}",
            style = FirefoxTheme.typography.body2,
        )
        Text(
            text = "Process: ${exit.processType}",
            style = FirefoxTheme.typography.body2,
        )
        Text(
            text = "Importance: ${exit.importance}",
            style = FirefoxTheme.typography.body2,
        )
        Text(
            text = "PSS: ${exit.pssInMb} MB / RSS: ${exit.rssInMb} MB",
            style = FirefoxTheme.typography.body2,
        )
    }
}

@FlexibleWindowPreview
@Composable
private fun TabProcessToolsPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val today = dateFormat.format(Date())
    val yesterday = Calendar.getInstance().apply {
        add(Calendar.DAY_OF_YEAR, -1)
    }.let { dateFormat.format(it.time) }

    val fakeExits = listOf(
        ProcessExitRecord(
            date = "$today 09:12:44",
            reason = "crash_native",
            processType = "content",
            importance = "cached",
            pssInMb = 312,
            rssInMb = 445,
        ),
        ProcessExitRecord(
            date = "$today 08:03:11",
            reason = "crash",
            processType = "content",
            importance = "cached",
            pssInMb = 198,
            rssInMb = 260,
        ),
        ProcessExitRecord(
            date = "$today 07:48:19",
            reason = "low_memory",
            processType = "content",
            importance = "cached",
            pssInMb = 275,
            rssInMb = 398,
        ),
        ProcessExitRecord(
            date = "$yesterday 22:47:01",
            reason = "excessive_resource",
            processType = "content",
            importance = "perceptible",
            pssInMb = 489,
            rssInMb = 601,
        ),
        ProcessExitRecord(
            date = "$yesterday 18:30:55",
            reason = "signaled",
            processType = "gpu",
            importance = "foreground_service",
            pssInMb = 120,
            rssInMb = 155,
        ),
        ProcessExitRecord(
            date = "2024-11-01 14:05:30",
            reason = "anr",
            processType = "parent",
            importance = "foreground",
            pssInMb = 540,
            rssInMb = 712,
        ),
    )
    FirefoxTheme(theme) {
        TabProcessTools(processExitsProvider = { fakeExits })
    }
}
