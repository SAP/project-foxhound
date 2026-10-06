/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxa.manager

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import mozilla.components.service.fxa.AccountStorage
import mozilla.components.service.fxa.manager.ScopeStatus.Unavailable.Reason

/**
 * Result of querying whether a scope is granted to the stored account.
 *
 * [Unavailable] carries a [Unavailable.Reason] so telemetry can be attached to the cause in
 * a future iteration.
 */
sealed class ScopeStatus {
    /** The scope is present in the stored account's granted scopes. */
    object Granted : ScopeStatus()

    /** An account was read, but it does not have the requested scope. */
    object NotGranted : ScopeStatus()

    /**
     * The scope could not be determined. [reason] describes why, and [cause] carries the
     * originating exception when one is available. [cause] is intentionally excluded from
     * equality so instances compare by [reason] alone.
     */
    data class Unavailable(val reason: Reason, val cause: Throwable? = null) : ScopeStatus() {

        /**
         * The reasons an [Unavailable] status is returned.
         */
        enum class Reason {
            /**
             * No account available.
             */
            NO_ACCOUNT,

            /**
             * Failure to read the [mozilla.appservices.fxaclient.FirefoxAccount] - this could have been caused by an
             * [mozilla.components.service.fxa.FxaException].
             */
            READ_FAILURE,

            /**
             * Failure to parse the JSON object from which the [mozilla.appservices.fxaclient.FirefoxAccount] was
             * retrieved.
             */
            PARSE_FAILURE,

            /**
             * The refresh token key was not found in the JSON object.
             */
            NO_REFRESH_TOKEN,
        }
    }
}

/**
 * Reported to a crash reporter when a scope status is [ScopeStatus.Unavailable] but no originating
 * [Throwable] is available, so the [reason] is still forwarded.
 */
internal class ScopeUnavailableException(reason: Reason) :
    Exception("Scope status could not be determined: $reason")

/**
 * Reads the persisted account state and reports whether a given OAuth scope is granted.
 *
 * @param storage Storage layer the account state is read from.
 * @param dispatcher Dispatcher the (blocking) read and JSON parsing run on.
 */
internal class AccountScopeAccessor(
    private val storage: AccountStorage,
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO,
) {
    private val json = Json { ignoreUnknownKeys = true }

    /**
     * Returns whether [scope] is present in the stored account's `refresh_token.scopes`.
     */
    @Suppress("TooGenericExceptionCaught") // storage.read() throws a range of exception that are reported.
    suspend fun containsScope(scope: String): ScopeStatus = withContext(dispatcher) {
        val account = try {
            storage.read()
        } catch (e: Exception) {
            return@withContext ScopeStatus.Unavailable(Reason.READ_FAILURE, e)
        }

        if (account == null) {
            return@withContext ScopeStatus.Unavailable(Reason.NO_ACCOUNT)
        }

        val state = try {
            json.decodeFromString<PersistedAccountState>(account.toJSONString())
        } catch (e: SerializationException) {
            return@withContext ScopeStatus.Unavailable(Reason.PARSE_FAILURE, e)
        }

        val scopes = state.refreshToken?.scopes
            ?: return@withContext ScopeStatus.Unavailable(Reason.NO_REFRESH_TOKEN)

        if (scope in scopes) {
            ScopeStatus.Granted
        } else {
            ScopeStatus.NotGranted
        }
    }
}

@Serializable
private data class PersistedAccountState(
    @SerialName("refresh_token")
    val refreshToken: RefreshTokenState? = null,
)

@Serializable
private data class RefreshTokenState(
    val scopes: List<String> = emptyList(),
)
