package mozilla.components.feature.fxsuggest.parser

import mozilla.components.feature.fxsuggest.dto.SportEventDto
import mozilla.components.feature.fxsuggest.dto.SportsPayloadDto
import mozilla.components.feature.fxsuggest.dto.TeamDto
import org.junit.Assert
import org.junit.Test

class SportsSuggestionParserTest {
    private val parser = SportsSuggestionParser()

    @Test
    fun `WHEN payload has values THEN maps each sport item`() {
        val payload = SportsPayloadDto(
            values = listOf(
                SportEventDto(
                    sport = "NBA",
                    sportCategory = "basketball",
                    query = "Lakers vs Celtics",
                    date = "2026-04-10T19:30:00Z",
                    homeTeam = TeamDto(
                        key = "LAL",
                        name = "Los Angeles Lakers",
                        colors = listOf("#552583", "#FDB927"),
                        score = 112,
                        icon = "http://example.com/lakers.png",
                    ),
                    awayTeam = TeamDto(
                        key = "BOS",
                        name = "Boston Celtics",
                        colors = listOf("#007A33", "#FFFFFF"),
                        score = 109,
                        icon = "http://example.com/celtics.png",
                    ),
                    status = "Final",
                    statusType = "past",
                    touched = "2026-04-10T22:15:00Z",
                ),
            ),
        )

        val result = parser.parse(payload)

        Assert.assertEquals(1, result.size)
        with(result[0]) {
            Assert.assertEquals("NBA", sport)
            Assert.assertEquals("basketball", sportCategory)
            Assert.assertEquals("Lakers vs Celtics", query)
            Assert.assertEquals("2026-04-10T19:30:00Z", date)
            Assert.assertEquals("Final", status)
            Assert.assertEquals("past", statusType)
            Assert.assertEquals("2026-04-10T22:15:00Z", touched)

            Assert.assertEquals("LAL", homeTeam.key)
            Assert.assertEquals("Los Angeles Lakers", homeTeam.name)
            Assert.assertEquals(listOf("#552583", "#FDB927"), homeTeam.colors)
            Assert.assertEquals(112, homeTeam.score)
            Assert.assertEquals("http://example.com/lakers.png", homeTeam.icon)

            Assert.assertEquals("BOS", awayTeam.key)
            Assert.assertEquals("Boston Celtics", awayTeam.name)
            Assert.assertEquals(listOf("#007A33", "#FFFFFF"), awayTeam.colors)
            Assert.assertEquals(109, awayTeam.score)
            Assert.assertEquals("http://example.com/celtics.png", awayTeam.icon)
        }
    }

    @Test
    fun `WHEN payload is empty THEN returns empty list`() {
        val result = parser.parse(SportsPayloadDto())

        Assert.assertEquals(0, result.size)
    }
}
