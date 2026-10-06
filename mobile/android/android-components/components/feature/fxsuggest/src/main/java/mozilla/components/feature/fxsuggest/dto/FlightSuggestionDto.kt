/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.fxsuggest.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Top-level response payload from the Flight suggestion API.
 */
@Serializable
data class FlightAwarePayloadDto(
    val values: List<FlightDto> = emptyList(),
)

/**
 * A single flight entry returned by the Flight's API.
 *
 * @property flightNumber The number of the flight (e.g. "UA1").
 * @property destination The destination of the flight (e.g. "Denver")
 * @property origin The origin of the flight.
 * @property departure Flight departure time information (e.g. scheduled time).
 * @property arrival Flight arrival time information (e.g. estimated time).
 * @property status Current high-level status of the flight.
 * @property progressPercent Percentage (0-100) of flight completed.
 * @property timeLeftMinutes Minutes remaining until the flight's arrival.
 * @property delayed Whether the flight is delayed or not.
 * @property url Direct link to the FlightAware live page for this flight number.
 * @property airline Information about the airline operating this flight.
 */
@Serializable
data class FlightDto(
    @SerialName("flight_number") val flightNumber: String,
    val destination: AirportDto,
    val origin: AirportDto,
    val departure: FlightTimeDto,
    val arrival: FlightTimeDto,
    val status: String,
    @SerialName("progress_percent") val progressPercent: Int = 0,
    @SerialName("time_left_minutes") val timeLeftMinutes: Int? = null,
    val delayed: Boolean,
    val url: String,
    val airline: AirlineDto,
)

/**
 *  Information about the origin/destination airport.
 *
 * @property code The airport code of the place
 * @property city city name of the where the airport is located .
 */
@Serializable
data class AirportDto(
    val code: String,
    val city: String,
)

/**
 * Scheduled departure/arrival information at the origin/destination airport.
 * All values are derived in the origin/destination airport’s local timezone.
 *
 * @property scheduledTime The time the flight is/was scheduled for departure/arrival.
 * @property estimatedTime Estimated gate departure/arrival time in local airport time.
 * To be used when flight departure/arrival is delayed. Null when the flight is cancelled..
 */
@Serializable
data class FlightTimeDto(
    @SerialName("scheduled_time") val scheduledTime: String,
    @SerialName("estimated_time") val estimatedTime: String? = null,
)

/**
 *  Information about the airline operating this flight.
 *
 * @property code IATA or ICAO airline code. (e.g., "AC" or “ACA”).
 * This would be null if unavailable.
 * @property name Name of airline (e.g., "Air Canada"). This would be null if unavailable.
 * @property icon url for the airline logo. This would be null if unavailable.
 * Note: Currently Merino is not returning this value so, it would always be null.
 * @property color hex code for the airline main color. This would be null if unavailable
 * */
@Serializable
data class AirlineDto(
    val code: String? = null,
    val name: String? = null,
    val icon: String? = null,
    val color: String? = null,
)
