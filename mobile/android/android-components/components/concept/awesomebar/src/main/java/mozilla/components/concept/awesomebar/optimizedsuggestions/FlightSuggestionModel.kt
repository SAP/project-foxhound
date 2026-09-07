/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.concept.awesomebar.optimizedsuggestions

/**
 * Represents a flight in a flight suggestion card.
 *
 * @param airportCity The city where the airport is located.
 * @param airportCode The airport code.
 * @param time The time of the flight.
 * @param date The date of the flight.
 */
data class FlightData(
    val airportCity: String,
    val airportCode: String,
    val time: String,
    val date: String,
)

/**
 * Represents the flight status type used by the Flight Suggestion.
 */
enum class FlightSuggestionStatus { ON_TIME, IN_FLIGHT, DELAYED, CANCELLED, ARRIVED }
