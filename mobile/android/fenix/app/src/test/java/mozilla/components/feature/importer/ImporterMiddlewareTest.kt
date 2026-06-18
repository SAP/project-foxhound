/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.importer

import android.net.Uri
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import mozilla.components.concept.bookmarks.file.BookmarksFileImporter
import org.junit.runner.RunWith
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.time.Duration.Companion.seconds

@OptIn(ExperimentalCoroutinesApi::class) // advanceTimeBy
@RunWith(AndroidJUnit4::class)
class ImporterMiddlewareTest {

    private val scope = TestScope()
    private val importer = TestImporter()
    private lateinit var middleware: ImporterMiddleware

    @BeforeTest
    fun setUp() {
        middleware = ImporterMiddleware(importer = importer, lifecycleScope = scope)
    }

    @Test
    fun `when ImportCancelled action is received while import is in progress, the state is transitioned to Cancelled`() =
        runTest {
            // Given a store
            val store = middleware.makeStore()

            // Given that a file has been selected and the import is slow
            importer.simulateSlowImport = true
            store.dispatch(ImporterAction.FileSelected(uri = Uri.EMPTY))

            // Given that we have now imported halfway through
            scope.advanceTimeBy(TestImporter.ImportDelay / 2)

            // When we receive the canceled action
            store.dispatch(ImporterAction.ImportCancelled)

            // Then verify that the state is updated to canceled
            assertEquals(
                ImporterState.Finished(result = ImporterResult.Canceled),
                store.state,
            )
        }

    @Test
    fun `when ImportCancelled action is received after a failed import, the state finishes with the same failures`() =
        runTest {
            // Given a store
            val store = middleware.makeStore()

            // And that a file has been selected and the import failed
            importer.expectedImportResult = Result.failure(Throwable("Booo"))
            store.dispatch(ImporterAction.FileSelected(uri = Uri.EMPTY))

            // And that the import has finished
            scope.advanceUntilIdle()

            // When we receive the canceled action
            store.dispatch(ImporterAction.ImportCancelled)

            // Then verify that the state remains "failed"
            val finalState = store.state
            assertIs<ImporterState.Finished>(finalState)
            assertIs<ImporterResult.Failure>(finalState.result)
        }

    @Test
    fun `when ImportCancelled action is received after a successful import, the state finishes with the same success`() =
        runTest {
            // Given a store
            val store = middleware.makeStore()

            // And that a file has been selected and the import succeeded
            importer.expectedImportResult = Result.success(
                BookmarksFileImporter.ImportResult(guid = "123", count = 5),
            )
            store.dispatch(ImporterAction.FileSelected(uri = Uri.EMPTY))

            // And that the import has finished
            scope.advanceUntilIdle()

            // When we receive the canceled action
            store.dispatch(ImporterAction.ImportCancelled)

            // Then verify that the state remains "success"
            val finalState = store.state
            assertIs<ImporterState.Finished>(finalState)
            assertIs<ImporterResult.Success>(finalState.result)
        }

    private fun ImporterMiddleware.makeStore(
        initialState: ImporterState = ImporterState.Inert,
    ): ImporterStore {
        return ImporterStore(
            initialState = initialState,
            middleware = listOf(this),
            reducer = ::importerReducer,
        )
    }

    private class TestImporter : BookmarksFileImporter {

        var expectedImportResult: Result<BookmarksFileImporter.ImportResult> = Result.failure(Throwable("Uh uh"))
        var simulateSlowImport = false

        override suspend fun importBookmarksFromUri(uri: Uri): Result<BookmarksFileImporter.ImportResult> {
            if (simulateSlowImport) {
                delay(ImportDelay)
            }
            return expectedImportResult
        }

        companion object {
            val ImportDelay = 10.seconds
        }
    }
}
