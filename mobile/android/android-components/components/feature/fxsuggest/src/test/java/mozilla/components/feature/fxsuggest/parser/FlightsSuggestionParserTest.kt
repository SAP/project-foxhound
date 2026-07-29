package mozilla.components.feature.fxsuggest.parser

import mozilla.components.feature.fxsuggest.dto.AirlineDto
import mozilla.components.feature.fxsuggest.dto.AirportDto
import mozilla.components.feature.fxsuggest.dto.FlightAwarePayloadDto
import mozilla.components.feature.fxsuggest.dto.FlightDto
import mozilla.components.feature.fxsuggest.dto.FlightTimeDto
import org.junit.Assert
import org.junit.Test

class FlightsSuggestionParserTest {
    private val parser = FlightsSuggestionParser()

    @Test
    fun `WHEN payload has values THEN maps each flight item`() {
        val payload = FlightAwarePayloadDto(
            values = listOf(
                FlightDto(
                    flightNumber = "UA1",
                    destination = AirportDto(code = "DEN", city = "Denver"),
                    origin = AirportDto(code = "SFO", city = "San Francisco"),
                    departure = FlightTimeDto(
                        scheduledTime = "2026-04-10T09:00:00-07:00",
                        estimatedTime = null,
                    ),
                    arrival = FlightTimeDto(
                        scheduledTime = "2026-04-10T12:30:00-06:00",
                        estimatedTime = "2026-04-10T12:45:00-06:00",
                    ),
                    status = "En Route",
                    progressPercent = 68,
                    timeLeftMinutes = 52,
                    delayed = true,
                    url = "https://flightaware.com/live/flight/UAL1",
                    airline = AirlineDto(
                        code = "UAL",
                        name = "United Airlines",
                        icon = "https://example.com/ua.png",
                        color = "#005DAA",
                    ),
                ),
            ),
        )

        val result = parser.parse(payload)

        Assert.assertEquals(1, result.size)
        with(result[0]) {
            Assert.assertEquals("UA1", flightNumber)
            Assert.assertEquals("DEN", destination.code)
            Assert.assertEquals("Denver", destination.city)
            Assert.assertEquals("SFO", origin.code)
            Assert.assertEquals("San Francisco", origin.city)
            Assert.assertEquals("2026-04-10T09:00:00-07:00", departure.scheduledTime)
            Assert.assertNull(departure.estimatedTime)
            Assert.assertEquals("2026-04-10T12:30:00-06:00", arrival.scheduledTime)
            Assert.assertEquals("2026-04-10T12:45:00-06:00", arrival.estimatedTime)
            Assert.assertEquals("En Route", status)
            Assert.assertEquals(68, progressPercent)
            Assert.assertEquals(52, timeLeftMinutes)
            Assert.assertTrue(delayed)
            Assert.assertEquals("https://flightaware.com/live/flight/UAL1", url)
            Assert.assertEquals("UAL", airline.code)
            Assert.assertEquals("United Airlines", airline.name)
            Assert.assertEquals("https://example.com/ua.png", airline.icon)
            Assert.assertEquals("#005DAA", airline.color)
        }
    }

    @Test
    fun `WHEN payload is empty THEN returns empty list`() {
        val result = parser.parse(FlightAwarePayloadDto())

        Assert.assertEquals(0, result.size)
    }
}
