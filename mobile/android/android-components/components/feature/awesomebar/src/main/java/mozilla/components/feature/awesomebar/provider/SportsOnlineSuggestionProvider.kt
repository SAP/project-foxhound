/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.awesomebar.provider

import android.graphics.Bitmap
import androidx.annotation.VisibleForTesting
import kotlinx.coroutines.flow.asFlow
import kotlinx.coroutines.flow.mapNotNull
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.flow.toList
import mozilla.components.browser.icons.BrowserIcons
import mozilla.components.browser.icons.IconRequest
import mozilla.components.concept.awesomebar.AwesomeBar
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionCategory
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionDate
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionStatus
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionStatusType
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionTeam
import mozilla.components.feature.awesomebar.facts.SuggestionCardType
import mozilla.components.feature.awesomebar.facts.emitOptimizedSuggestionCardClickedFact
import mozilla.components.feature.awesomebar.facts.emitOptimizedSuggestionCardDisplayedFact
import mozilla.components.feature.search.SearchUseCases
import java.time.DateTimeException
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID

internal const val DEFAULT_SPORT_SUGGESTION_LIMIT = 1

/**
 * [AwesomeBar.SuggestionProvider] implementation that provides suggestions based on online sports.
 *
 * @property dataSource the [AwesomeBar.CombinedSuggestionsDataSource] to be used.
 * @property suggestionsHeader optional parameter to specify if the suggestion should have a header.
 * @property maxNumberOfSuggestions the maximum number of suggestions to be provided.
 */
class SportsOnlineSuggestionProvider(
    private val icons: BrowserIcons,
    private val searchUseCase: SearchUseCases.SearchUseCase,
    private val dataSource: AwesomeBar.CombinedSuggestionsDataSource,
    private val suggestionsHeader: String? = null,
    @get:VisibleForTesting internal val maxNumberOfSuggestions: Int = DEFAULT_SPORT_SUGGESTION_LIMIT,
) : AwesomeBar.SuggestionProvider {
    override val id: String = UUID.randomUUID().toString()

    override fun groupTitle(): String? {
        return suggestionsHeader
    }

    override fun displayGroupTitle(): Boolean {
        return false
    }

    override suspend fun onInputChanged(text: String): List<AwesomeBar.SportSuggestion> {
        if (text.isBlank()) return emptyList()

        val items = dataSource.fetchSports(text)
        val suggestions = items
            .asFlow()
            .mapNotNull { item ->
                item.toSuggestionOrNull()?.let { it to item.sportCategory }
            }
            .take(maxNumberOfSuggestions)
            .toList()

        suggestions.forEach {
            emitOptimizedSuggestionCardDisplayedFact(
                cardType = SuggestionCardType.SPORTS,
                extra = it.second.lowercase(),
            )
        }

        return suggestions.map { it.first }
    }

    private suspend fun AwesomeBar.SportItem.toSuggestionOrNull(): AwesomeBar.SportSuggestion? {
        val hasRequiredFields =
            query.isNotBlank() && sport.isNotBlank()
        val sportCategory = parseSportCategory(sportCategory)
        val date = parseDate(date)
        val status = parseStatus(status)
        val statusType = parseStatusType(statusType)
        val homeTeam = parseTeam(homeTeam)
        val awayTeam = parseTeam(awayTeam)
        val hasAllFields = date != null && homeTeam != null && awayTeam != null

        return if (hasRequiredFields && hasAllFields) {
            AwesomeBar.SportSuggestion(
                onSuggestionClicked = {
                    emitOptimizedSuggestionCardClickedFact(
                        cardType = SuggestionCardType.SPORTS,
                        extra = this.sportCategory.lowercase(),
                    )
                    searchUseCase.invoke(query)
                },
                provider = this@SportsOnlineSuggestionProvider,
                score = Int.MAX_VALUE,
                query = query,
                sport = sport,
                sportCategory = sportCategory,
                date = date,
                status = status,
                statusType = statusType,
                homeTeam = homeTeam,
                awayTeam = awayTeam,
            )
        } else {
            null
        }
    }

    @VisibleForTesting
    internal fun parseDate(
        date: String,
        locale: Locale = Locale.getDefault(),
        timeZone: ZoneId = ZoneId.systemDefault(),
    ): SportSuggestionDate? {
        val parsedDate = parseIsoDate(date, timeZone) ?: return null
        val today = LocalDateTime.now(timeZone).toLocalDate()
        val tomorrow = today.plusDays(1)

        return try {
            when (parsedDate.toLocalDate()) {
                today -> {
                    SportSuggestionDate.Today
                }
                tomorrow -> {
                    val time = formatShortTime(parsedDate, locale)
                    SportSuggestionDate.Tomorrow(time)
                }
                else -> {
                    val date = parsedDate.format(
                        DateTimeFormatter
                            .ofPattern("d MMM yyyy")
                            .withLocale(locale),
                    )
                    SportSuggestionDate.General(date)
                }
            }
        } catch (_: DateTimeException) {
            null
        }
    }

    @VisibleForTesting
    internal fun parseStatus(status: String): SportSuggestionStatus {
        return when (status) {
            "Scheduled" -> SportSuggestionStatus.Scheduled
            "Delayed" -> SportSuggestionStatus.Delayed
            "Postponed" -> SportSuggestionStatus.Postponed
            "In Progress" -> SportSuggestionStatus.InProgress
            "Suspended" -> SportSuggestionStatus.Suspended
            "Canceled" -> SportSuggestionStatus.Canceled
            "Final",
            "Final - Over Time",
            "Final - Shoot Out",
            -> SportSuggestionStatus.Final
            "Forfeit" -> SportSuggestionStatus.Forfeit
            "Not Necessary" -> SportSuggestionStatus.NotNecessary
            else -> SportSuggestionStatus.Unknown
        }
    }

    @VisibleForTesting
    internal fun parseStatusType(statusType: String): SportSuggestionStatusType {
        return when (statusType) {
            "past" -> SportSuggestionStatusType.PAST
            "live" -> SportSuggestionStatusType.LIVE
            "scheduled" -> SportSuggestionStatusType.SCHEDULED
            else -> SportSuggestionStatusType.NONE
        }
    }

    @VisibleForTesting
    internal suspend fun parseTeam(team: AwesomeBar.SportItem.Team): SportSuggestionTeam? {
        val icon = fetchTeamIcon(icons, team.icon)
        return team.name.takeIf { it.isNotBlank() }?.let {
            SportSuggestionTeam(it, team.score, icon)
        }
    }

    @VisibleForTesting
    internal fun parseSportCategory(sportCategory: String): SportSuggestionCategory {
        return when (sportCategory) {
            "baseball" -> SportSuggestionCategory.BASEBALL
            "basketball" -> SportSuggestionCategory.BASKETBALL
            "hockey" -> SportSuggestionCategory.HOCKEY
            "soccer" -> SportSuggestionCategory.SOCCER
            "football" -> SportSuggestionCategory.FOOTBALL
            "golf" -> SportSuggestionCategory.GOLF
            "racing" -> SportSuggestionCategory.RACING
            else -> SportSuggestionCategory.MISC
        }
    }

    private suspend fun fetchTeamIcon(
        icons: BrowserIcons,
        url: String?,
    ): Bitmap? {
        if (url.isNullOrBlank()) return null

        val resources = listOf(IconRequest.Resource(url, IconRequest.Resource.Type.IMAGE_SRC))
        val request = IconRequest(
            url = url,
            size = IconRequest.Size.LAUNCHER_ADAPTIVE,
            resources = resources,
            isPrivate = true,
        )

        val icon = icons.loadIcon(request).await()
        return icon.bitmap
    }
}
