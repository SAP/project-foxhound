/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.awesomebar.provider

import androidx.annotation.VisibleForTesting
import mozilla.components.concept.awesomebar.AwesomeBar
import mozilla.components.concept.awesomebar.optimizedsuggestions.FlightData
import mozilla.components.concept.awesomebar.optimizedsuggestions.FlightSuggestionStatus
import mozilla.components.feature.awesomebar.facts.SuggestionCardType
import mozilla.components.feature.awesomebar.facts.emitOptimizedSuggestionCardClickedFact
import mozilla.components.feature.awesomebar.facts.emitOptimizedSuggestionCardDisplayedFact
import mozilla.components.feature.session.SessionUseCases
import java.time.DateTimeException
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID

const val DEFAULT_FLIGHT_SUGGESTION_LIMIT = 1

/**
 * [AwesomeBar.SuggestionProvider] implementation that provides suggestions based on online flights.
 *
 * @property dataSource the [AwesomeBar.CombinedSuggestionsDataSource] to be used.
 * @property suggestionsHeader optional parameter to specify if the suggestion should have a header.
 * @property maxNumberOfSuggestions the maximum number of suggestions to be provided.
 */
class FlightsOnlineSuggestionProvider(
    private val loadUrlUseCase: SessionUseCases.LoadUrlUseCase,
    private val dataSource: AwesomeBar.CombinedSuggestionsDataSource,
    private val suggestionsHeader: String? = null,
    @get:VisibleForTesting internal val maxNumberOfSuggestions: Int = DEFAULT_FLIGHT_SUGGESTION_LIMIT,
) : AwesomeBar.SuggestionProvider {
    override val id: String = UUID.randomUUID().toString()

    override fun groupTitle(): String? {
        return suggestionsHeader
    }

    override fun displayGroupTitle(): Boolean {
        return false
    }

    override suspend fun onInputChanged(text: String): List<AwesomeBar.FlightSuggestion> {
        if (text.isBlank()) return emptyList()

        val items = dataSource.fetchFlights(text)

        return items
            .asSequence()
            .mapNotNull { it.toSuggestionOrNull() }
            .take(maxNumberOfSuggestions)
            .toList()
            .also {
                if (it.isNotEmpty()) {
                    emitOptimizedSuggestionCardDisplayedFact(SuggestionCardType.FLIGHTS)
                }
            }
    }

    private fun AwesomeBar.FlightItem.toSuggestionOrNull(): AwesomeBar.FlightSuggestion? {
        val hasRequiredFields =
            url.isNotBlank() && flightNumber.isNotBlank()

        val flightStatus = parseFlightStatus(delayed, status)
        val departureFlightData = parseFlightData(origin, departure)
        val arrivalFlightData = parseFlightData(destination, arrival)

        val hasAllFields = hasRequiredFields && flightStatus != null &&
            departureFlightData != null && arrivalFlightData != null

        return if (hasAllFields) {
            AwesomeBar.FlightSuggestion(
                onSuggestionClicked = {
                    emitOptimizedSuggestionCardClickedFact(SuggestionCardType.FLIGHTS)
                    loadUrlUseCase.invoke(url)
                },
                provider = this@FlightsOnlineSuggestionProvider,
                score = Int.MAX_VALUE,
                flightNumber = flightNumber,
                airlineName = airline.name,
                flightStatus = flightStatus,
                progress = (progressPercent / 100f).coerceIn(0f, 1f),
                departureFlightData = departureFlightData,
                arrivalFlightData = arrivalFlightData,
            )
        } else {
            null
        }
    }

    @VisibleForTesting
    internal fun parseFlightStatus(
        delayed: Boolean,
        status: String,
    ): FlightSuggestionStatus? =
        when (status) {
            "Scheduled" -> FlightSuggestionStatus.ON_TIME
            "En Route" -> if (delayed) FlightSuggestionStatus.DELAYED else FlightSuggestionStatus.IN_FLIGHT
            "Arrived" -> FlightSuggestionStatus.ARRIVED
            "Cancelled" -> FlightSuggestionStatus.CANCELLED
            "Delayed" -> FlightSuggestionStatus.DELAYED
            else -> null
        }

    @VisibleForTesting
    internal fun parseFlightData(
        airport: AwesomeBar.FlightItem.Airport,
        time: AwesomeBar.FlightItem.Timing,
        locale: Locale = Locale.getDefault(),
    ): FlightData? {
        val timing = time.estimatedTime ?: time.scheduledTime
        val parsedDate = parseIsoDatePreservingOffset(timing) ?: return null

        return try {
            val time = formatShortTime(parsedDate, locale)
            val date = parsedDate.format(
                DateTimeFormatter
                    .ofPattern("MMM d")
                    .withLocale(locale),
            )

            FlightData(
                airportCity = airport.city,
                airportCode = airport.code,
                time = time,
                date = date,
            )
        } catch (_: DateTimeException) {
            null
        }
    }
}
