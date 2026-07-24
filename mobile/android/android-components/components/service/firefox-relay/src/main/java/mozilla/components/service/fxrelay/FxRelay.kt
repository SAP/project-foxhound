/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxrelay

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import mozilla.appservices.relay.RelayAddress
import mozilla.appservices.relay.RelayApiException
import mozilla.appservices.relay.RelayClient
import mozilla.appservices.relay.RelayClientInterface
import mozilla.appservices.relay.RelayProfile
import mozilla.components.concept.sync.OAuthAccount
import mozilla.components.service.fxrelay.eligibility.RelayPlanTier
import mozilla.components.service.fxrelay.ext.asEmailMask
import mozilla.components.service.fxrelay.ext.freeLimitReached
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.support.ktx.kotlin.extractHostUrl

private const val RELAY_SCOPE_URL = "https://identity.mozilla.com/apps/relay"
private const val RELAY_BASE_URL = "https://relay.firefox.com"

/**
 * Public API for Firefox Relay.
 */
interface FxRelay {
    /**
     * Fetches a list of email masks.
     *
     * @return a list of email masks or `null` if the operation fails.
     */
    suspend fun fetchEmailMasks(): List<EmailMask>?

    /**
     * Retrieves the Relay account details or `null` if the operation failed.
     *
     * @return The user's [RelayAccountDetails].
     */
    suspend fun fetchAccountDetails(): RelayAccountDetails?

    /**
     * Creates a new email mask with the specified data, otherwise, falls back to using an existing one.
     *
     * @param generatedFor The website for which the address is generated.
     * @param description Optional description of the email address.
     *
     * @return the newly created email mask or `null` if the operation fails.
     */
    suspend fun createEmailMask(
        generatedFor: String = "",
        description: String = "",
    ): EmailMask?
}

/**
 * Service wrapper for Firefox Relay APIs.
 *
 * @param account An [OAuthAccount] used to obtain and manage FxA access tokens scoped for Firefox Relay.
 * @param relayClientProvider Produces a [RelayClientInterface] with the token provided.
 */
internal class FxRelayImpl(
    private val account: OAuthAccount,
    private val relayClientProvider: (String) -> RelayClientInterface = { token ->
        RelayClient(RELAY_BASE_URL, token)
    },
) : FxRelay {
    private val logger = Logger("FxRelay")

    /**
     * Cache for RelayClient so we don't recreate the Rust client on every call.
     * We tie it to the access token it was built with.
     */
    private var cachedClient: RelayClientInterface? = null
    private var cachedToken: String? = null

    /**
     * Defines supported Relay operations for logging and error handling.
     */
    enum class RelayOperation {
        FETCH_ADDRESSES,
        FETCH_PROFILE,
        CREATE_ADDRESS,
    }

    /**
     * Build or reuse a [RelayClient] with a fresh token.
     * If no token is available, fail fast with an error.
     *
     * @throws RelayApiException.Other if no FxA access token is available.
     */
    private suspend fun getOrCreateClient(): RelayClientInterface {
        val token = account.getAccessToken(RELAY_SCOPE_URL)?.token
            ?: throw RelayApiException.Other("No FxA access token available for Relay")

        return cachedClient.takeIf { cachedToken == token }
            ?: relayClientProvider(token).also {
                cachedClient = it
                cachedToken = token
            }
    }

    /**
     * Runs a provided [block], handling known [RelayApiException] variants gracefully.
     *
     * @param operation The [RelayOperation] being performed, included in log output.
     * @param fallback A lambda to execute if [block] fails with a [RelayApiException].
     *                 Typically returns a safe fallback value so callers don't crash.
     * @param block A suspendable lambda to execute which may fail with a [RelayApiException].
     * @return The result of [block] if successful, or the result of [fallback] if a [RelayApiException] occurs.
     *
     * @throws Exception if any unexpected exception (not a [RelayApiException]) is thrown by [block].
     */
    private suspend fun <T> handleRelayExceptions(
        operation: RelayOperation,
        fallback: () -> T,
        block: suspend () -> T,
    ): T {
        return try {
            block()
        } catch (e: RelayApiException) {
            when (e) {
                is RelayApiException.Api -> {
                    logger.error(
                        "Relay API error during $operation: (status=${e.status}, code=${e.code}): ${e.detail}",
                        e,
                    )
                }

                is RelayApiException.Network -> {
                    logger.error("Relay network error during $operation: ${e.reason}", e)
                }

                is RelayApiException.Other -> {
                    logger.error("Unexpected Relay error during $operation: ${e.reason}", e)
                }
            }
            fallback()
        }
    }

    override suspend fun fetchEmailMasks(): List<EmailMask>? = withContext(Dispatchers.IO) {
        handleRelayExceptions(
            RelayOperation.FETCH_ADDRESSES,
            { null },
        ) {
            getOrCreateClient().fetchAddresses().map { it.asEmailMask() }
        }
    }

    override suspend fun createEmailMask(
        generatedFor: String,
        description: String,
    ): EmailMask? = withContext(Dispatchers.IO) {
        handleRelayExceptions(
            RelayOperation.CREATE_ADDRESS,
            { null },
        ) {
            try {
                val extractedGeneratedFor = generatedFor.extractHostUrl()
                val extractedDescription = description.extractHostUrl()
                val address = getOrCreateClient().createAddress(
                    description = extractedDescription,
                    generatedFor = extractedGeneratedFor,
                    usedOn = "", // always empty string for now until we can surface this property correctly.
                )

                address.asEmailMask(MaskSource.GENERATED)
            } catch (e: RelayApiException) {
                if (e.freeLimitReached()) {
                    val randomMask = fetchEmailMasks()
                        ?.randomOrNull()
                        ?.copy(source = MaskSource.FREE_TIER_LIMIT)
                    return@handleRelayExceptions randomMask
                } else {
                    // re-throw for handling all other exceptions.
                    throw e
                }
            }
        }
    }

    override suspend fun fetchAccountDetails(): RelayAccountDetails? = withContext(Dispatchers.IO) {
        val profile = fetchProfile() ?: return@withContext null
        mapProfileToDetails(profile)
    }

    private suspend fun fetchProfile(): RelayProfile? = withContext(Dispatchers.IO) {
        handleRelayExceptions(
            RelayOperation.FETCH_PROFILE,
            { null },
        ) {
            val client = getOrCreateClient()
            client.fetchProfile()
        }
    }

    private fun mapProfileToDetails(profile: RelayProfile): RelayAccountDetails {
        val relayPlanTier = when {
            profile.hasPremium || profile.hasMegabundle -> RelayPlanTier.PREMIUM
            else -> RelayPlanTier.FREE
        }

        return RelayAccountDetails(
            relayPlanTier = relayPlanTier,
            totalMasksUsed = profile.totalMasks.toInt(),
        )
    }
}

/**
 * Represents the Relay account details for the currently signed-in user.
 *
 * @param relayPlanTier The user’s current Relay plan (e.g., FREE or PREMIUM).
 * @param totalMasksUsed The number of mask aliases used.
 */
data class RelayAccountDetails(
    val relayPlanTier: RelayPlanTier,
    val totalMasksUsed: Int?,
)

/**
 * A reduced [RelayAddress] intended for client use.
 */
data class EmailMask(
    val fullAddress: String,
    val source: MaskSource?,
)

/**
 * Indicates the source of the email mask.
 */
enum class MaskSource {
    /**
     * The mask was newly generated.
     */
    GENERATED,

    /**
     * The mask was reused because the free tier limit was reached.
     */
    FREE_TIER_LIMIT,
}
