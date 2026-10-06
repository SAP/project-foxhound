/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.fxsuggest.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
internal data class CombinedSuggestionResponseDto(
    val suggestions: List<SuggestionDto> = emptyList(),
)

@Serializable
internal data class SuggestionDto(
    val provider: String,
    val score: Double,
    @SerialName("custom_details")
    val customDetails: CustomDetailsDto? = null,
)

@Serializable
internal data class CustomDetailsDto(
    val polygon: PolygonPayloadDto? = null,
    val sports: SportsPayloadDto? = null,
    val flightaware: FlightAwarePayloadDto? = null,
)
