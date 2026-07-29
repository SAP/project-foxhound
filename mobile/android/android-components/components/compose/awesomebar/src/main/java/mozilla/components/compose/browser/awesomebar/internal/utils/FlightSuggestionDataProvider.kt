/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.browser.awesomebar.internal.utils

import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import mozilla.components.concept.awesomebar.optimizedsuggestions.FlightData
import mozilla.components.concept.awesomebar.optimizedsuggestions.FlightSuggestionStatus

internal class FlightSuggestionDataProvider :
    PreviewParameterProvider<FlightSuggestionPreviewModel> {

    override val values = sequenceOf(
        FlightSuggestionPreviewModel(
            flightNumber = "AA123",
            airlineName = "American Airlines",
            flightStatus = FlightSuggestionStatus.IN_FLIGHT,
            progress = 0.74f,
            departureFlightData = FlightData(
                airportCity = "Los Angeles",
                airportCode = "LAX",
                time = "1:05 PM",
                date = "Jun 4",
            ),
            arrivalFlightData = FlightData(
                airportCity = "New York",
                airportCode = "JFK",
                time = "6:18 PM",
                date = "Jun 4",
            ),
        ),
        FlightSuggestionPreviewModel(
            flightNumber = "AA123",
            airlineName = "American Airlines",
            flightStatus = FlightSuggestionStatus.DELAYED,
            progress = 0.43f,
            departureFlightData = FlightData(
                airportCity = "Los Angeles",
                airportCode = "LAX",
                time = "1:05 PM",
                date = "Jun 4",
            ),
            arrivalFlightData = FlightData(
                airportCity = "New York",
                airportCode = "JFK",
                time = "6:18 PM",
                date = "Jun 4",
            ),
        ),
        FlightSuggestionPreviewModel(
            flightNumber = "AA123",
            airlineName = "American Airlines",
            flightStatus = FlightSuggestionStatus.DELAYED,
            progress = 0f,
            departureFlightData = FlightData(
                airportCity = "Los Angeles",
                airportCode = "LAX",
                time = "1:05 PM",
                date = "Jun 4",
            ),
            arrivalFlightData = FlightData(
                airportCity = "New York",
                airportCode = "JFK",
                time = "6:18 PM",
                date = "Jun 4",
            ),
        ),
        FlightSuggestionPreviewModel(
            flightNumber = "AA123",
            airlineName = "American Airlines",
            flightStatus = FlightSuggestionStatus.CANCELLED,
            progress = 1f,
            departureFlightData = FlightData(
                airportCity = "Los Angeles",
                airportCode = "LAX",
                time = "1:05 PM",
                date = "Jun 4",
            ),
            arrivalFlightData = FlightData(
                airportCity = "New York",
                airportCode = "JFK",
                time = "6:18 PM",
                date = "Jun 4",
            ),
        ),
        FlightSuggestionPreviewModel(
            flightNumber = "AA123",
            airlineName = "American Airlines",
            flightStatus = FlightSuggestionStatus.ON_TIME,
            progress = 0f,
            departureFlightData = FlightData(
                airportCity = "Los Angeles",
                airportCode = "LAX",
                time = "1:05 PM",
                date = "Jun 4",
            ),
            arrivalFlightData = FlightData(
                airportCity = "New York",
                airportCode = "JFK",
                time = "6:18 PM",
                date = "Jun 4",
            ),
        ),
        FlightSuggestionPreviewModel(
            flightNumber = "AA123",
            airlineName = "American Airlines",
            flightStatus = FlightSuggestionStatus.ARRIVED,
            progress = 1f,
            departureFlightData = FlightData(
                airportCity = "Los Angeles",
                airportCode = "LAX",
                time = "1:05 PM",
                date = "Jun 4",
            ),
            arrivalFlightData = FlightData(
                airportCity = "New York",
                airportCode = "JFK",
                time = "6:18 PM",
                date = "Jun 4",
            ),
        ),
    )
}

internal data class FlightSuggestionPreviewModel(
    val flightNumber: String,
    val airlineName: String?,
    val flightStatus: FlightSuggestionStatus,
    val progress: Float,
    val departureFlightData: FlightData,
    val arrivalFlightData: FlightData,
)
