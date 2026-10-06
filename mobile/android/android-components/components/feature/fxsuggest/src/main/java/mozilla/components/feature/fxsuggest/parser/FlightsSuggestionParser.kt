/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.fxsuggest.parser

import mozilla.components.concept.awesomebar.AwesomeBar.FlightItem
import mozilla.components.feature.fxsuggest.dto.AirlineDto
import mozilla.components.feature.fxsuggest.dto.AirportDto
import mozilla.components.feature.fxsuggest.dto.FlightAwarePayloadDto
import mozilla.components.feature.fxsuggest.dto.FlightDto
import mozilla.components.feature.fxsuggest.dto.FlightTimeDto

internal class FlightsSuggestionParser {
    fun parse(payload: FlightAwarePayloadDto): List<FlightItem> {
        return payload.values.map { flight ->
            flight.toFlightItem()
        }
    }

    companion object {
        const val PROVIDER_NAME = "flightaware"
    }
}

private fun FlightDto.toFlightItem(): FlightItem {
    return FlightItem(
        flightNumber = flightNumber,
        destination = destination.toAirportFlightItem(),
        origin = origin.toAirportFlightItem(),
        departure = departure.toTimingFlightItem(),
        arrival = arrival.toTimingFlightItem(),
        status = status,
        progressPercent = progressPercent,
        timeLeftMinutes = timeLeftMinutes,
        delayed = delayed,
        url = url,
        airline = airline.toAirlineFlightItem(),
    )
}

private fun AirportDto.toAirportFlightItem(): FlightItem.Airport {
    return FlightItem.Airport(
        code = code,
        city = city,
    )
}

private fun FlightTimeDto.toTimingFlightItem(): FlightItem.Timing {
    return FlightItem.Timing(
        scheduledTime = scheduledTime,
        estimatedTime = estimatedTime,
    )
}

private fun AirlineDto.toAirlineFlightItem(): FlightItem.Airline {
    return FlightItem.Airline(
        code = code,
        name = name,
        icon = icon,
        color = color,
    )
}
