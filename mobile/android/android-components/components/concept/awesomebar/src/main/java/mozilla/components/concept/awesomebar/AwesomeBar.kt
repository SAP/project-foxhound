/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.concept.awesomebar

import android.graphics.Bitmap
import android.graphics.drawable.Drawable
import android.view.View
import mozilla.components.concept.awesomebar.AwesomeBar.Suggestion.Flag
import mozilla.components.concept.awesomebar.optimizedsuggestions.FlightData
import mozilla.components.concept.awesomebar.optimizedsuggestions.FlightSuggestionStatus
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionCategory
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionDate
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionStatus
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionStatusType
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionTeam
import java.util.UUID

/**
 * Interface to be implemented by awesome bar implementations.
 *
 * An awesome bar has multiple duties:
 *  - Display [Suggestion] instances and invoking its callbacks once selected
 *  - React to outside events: [onInputStarted], [onInputChanged], [onInputCancelled].
 *  - Query [SuggestionProvider] instances for new suggestions when the text changes.
 */
interface AwesomeBar {

    /**
     * Adds the following [SuggestionProvider] instances to be queried for [Suggestion]s whenever the text changes.
     */
    fun addProviders(vararg providers: SuggestionProvider)

    /**
     * Removes the following [SuggestionProvider]
     */
    fun removeProviders(vararg providers: SuggestionProvider)

    /**
     * Removes all [SuggestionProvider]s
     */
    fun removeAllProviders()

    /**
     * Returns whether or not this awesome bar contains the following [SuggestionProvider]
     */
    fun containsProvider(provider: SuggestionProvider): Boolean

    /**
     * Fired when the user starts interacting with the awesome bar by entering text in the toolbar.
     */
    fun onInputStarted() = Unit

    /**
     * Fired whenever the user changes their input, after they have started interacting with the awesome bar.
     *
     * @param text The current user input in the toolbar.
     */
    fun onInputChanged(text: String)

    /**
     * Fired when the user has cancelled their interaction with the awesome bar.
     */
    fun onInputCancelled() = Unit

    /**
     * Casts this awesome bar to an Android View object.
     */
    fun asView(): View = this as View

    /**
     * Adds a lambda to be invoked when the user has finished interacting with the awesome bar (e.g. selected a
     * suggestion).
     */
    fun setOnStopListener(listener: () -> Unit)

    /**
     * Adds a lambda to be invoked when the user selected a suggestion to be edited further.
     */
    fun setOnEditSuggestionListener(listener: (String) -> Unit)

    /**
     * Update what search suggestions should be hidden.
     */
    fun updateHiddenSuggestions(hiddenSuggestions: Set<GroupedSuggestion>)

    /**
     * Add a callback for when the user clicked on the remove button for a history suggestion.
     */
    fun setOnRemoveSuggestionButtonClicked(listener: (GroupedSuggestion) -> Unit)

    /**
     * Information about the [Suggestion]s that are currently displayed by the [AwesomeBar].
     */
    data class VisibilityState(
        /**
         * An ordered map of the currently visible [SuggestionProviderGroup]s, and the visible [Suggestion]s in each
         * group. The groups and their suggestions are ordered top to bottom.
         */
        val visibleProviderGroups: Map<SuggestionProviderGroup, List<SuggestionItem>> = emptyMap(),
    )

    /**
     * Pair of a [Suggestion] and the [SuggestionProviderGroup] identified by its id in which the
     * [Suggestion] should be shown.
     */
    data class GroupedSuggestion(
        val suggestion: SuggestionItem,
        val groupId: String,
    )

    /**
     * Combined data source for stocks, sports, and flights online suggestions.
     *
     * All three providers share one instance so that concurrent requests for the same query
     * are coalesced into a single network call.
     */
    interface CombinedSuggestionsDataSource {
        /**
         * Fetch stock suggestions for [query].
         */
        suspend fun fetchStocks(query: String): List<StockItem>

        /**
         * Fetch sports suggestions for [query].
         */
        suspend fun fetchSports(query: String): List<SportItem>

        /**
         * Fetch flight suggestions for [query].
         */
        suspend fun fetchFlights(query: String): List<FlightItem>
    }

    /**
     * Domain model representing a single stock suggestion result.
     *
     * This model is independent of UI classes and is used as an intermediate
     * data representation before being mapped into an AwesomeBar-specific
     * suggestion type (e.g. [AwesomeBar.StockSuggestion]).
     *
     * @property query The full query string that triggered this suggestion.
     * @property name The full display name of the stock or fund.
     * @property ticker The stock ticker symbol.
     * @property todaysChangePerc The percentage change today.
     * @property lastPrice The last traded price, including currency.
     * @property exchange The index the stock belongs to.
     * @property imageUrl The URL of the stock's logo.
     */
    data class StockItem(
        val query: String,
        val name: String,
        val ticker: String,
        val todaysChangePerc: String,
        val lastPrice: String,
        val exchange: String,
        val imageUrl: String?,
    )

    /**
     * Domain model representing a single sport suggestion result.
     *
     * This model is independent of UI classes and is used as an intermediate
     * data representation before being mapped into an AwesomeBar-specific
     * suggestion type (e.g. [AwesomeBar.SportSuggestion]).
     *
     * @property query The full query string that triggered this suggestion.
     * @property sport The sport name.
     * @property sportCategory The category of the sport (e.g. "baseball", "basketball", "football", "hockey").
     * @property date The date of the event.
     * @property status The status of the event.
     * @property statusType The type of the status.
     * @property homeTeam The home team information.
     * @property awayTeam The away team information.
     * @property touched The last time this sport event was updated, in ISO 8601 format.
     */
    data class SportItem(
        val query: String,
        val sport: String,
        val sportCategory: String,
        val date: String,
        val status: String,
        val statusType: String,
        val homeTeam: Team,
        val awayTeam: Team,
        val touched: String,
    ) {
        /**
         * Represents a team in a sport suggestion.
         */
        data class Team(
            val key: String,
            val name: String,
            val colors: List<String>,
            val score: Int?,
            val icon: String?,
        )
    }

    /**
     * Domain model representing a single flight suggestion result.
     *
     * This model is independent of UI classes and is used as an intermediate
     * data representation before being mapped into an AwesomeBar-specific
     * suggestion type (e.g. [AwesomeBar.FlightSuggestion]).
     *
     * @property flightNumber The IATA flight designator (e.g., "AA123").
     * @property destination The arrival airport information.
     * @property origin The departure airport information.
     * @property departure The departure timing information.
     * @property arrival The arrival timing information.
     * @property status The status of the flight.
     * @property progressPercent The progress of the flight until it reaches its destination (0-100).
     * @property timeLeftMinutes The time left in minutes until the flight reaches its destination.
     * @property delayed Whether the flight is delayed by ≥15 minutes compared to the scheduled time.
     * @property url The direct link to the FlightAware live page for this flight.
     * @property airline The operating airline for this flight.
     */
    data class FlightItem(
        val flightNumber: String,
        val destination: Airport,
        val origin: Airport,
        val departure: Timing,
        val arrival: Timing,
        val status: String,
        val progressPercent: Int,
        val timeLeftMinutes: Int?,
        val delayed: Boolean,
        val url: String,
        val airline: Airline,
    ) {
        /**
         * Represents an airport in a flight suggestion.
         */
        data class Airport(
            val code: String,
            val city: String,
        )

        /**
         * Represents the departure and arrival times in a flight suggestion.
         *
         * Both scheduled and estimated times are in local airport time.
         * Estimated time is used when the flight is delayed. Otherwise, scheduled time is used.
         */
        data class Timing(
            val scheduledTime: String,
            val estimatedTime: String?,
        )

        /**
         * Represents an airline in a flight suggestion.
         */
        data class Airline(
            val code: String?,
            val name: String?,
            val color: String?,
            val icon: String?,
        )
    }

    /**
     * Represents the change percent used by the Stocks Suggestion.
     */
    sealed class ChangePercent(val value: String) {
        /**
         * Represents a positive percentage change.
         */
        class Positive(value: String) : ChangePercent(value)

        /**
         * Represents a negative percentage change.
         */
        class Negative(value: String) : ChangePercent(value)

        /**
         * Represents a neutral (zero) percentage change.
         */
        object Neutral : ChangePercent(value = "0")
    }

    /**
     * Interface to be implemented by suggestion implementations.
     */
    interface SuggestionItem {
        /**
         * The provider this suggestion came from.
         */
        val provider: SuggestionProvider

        /**
         * A unique ID identifying this suggestion.
         */
        val id: String

        /**
         * A score used to rank suggestions of this provider against each other.
         */
        val score: Int

        /**
         * A callback to be executed when the suggestion was clicked by the user.
         */
        val onSuggestionClicked: (() -> Unit)?

        /**
         * A set of [Flag] values for this [Suggestion].
         */
        val flags: Set<Flag>
    }

    /**
     * A [Suggestion] to be displayed by an [AwesomeBar] implementation.
     *
     * @property provider The provider this suggestion came from.
     * @property id A unique ID (provider scope) identifying this [Suggestion]. A stable ID but different data indicates
     * to the [AwesomeBar] that this is the same [Suggestion] with new data. This will affect how the [AwesomeBar]
     * animates showing the new suggestion.
     * @property title A user-readable title for the [Suggestion].
     * @property description A user-readable description for the [Suggestion].
     * @property editSuggestion The string that will be set to the url bar when using the edit suggestion arrow.
     * @property isRemovalAllowed Whether this suggestion can be removed by the user.
     * If so an appropriate icon will be shown to the end of the row.
     * @property icon A lambda that can be invoked by the [AwesomeBar] implementation to receive an icon [Bitmap] for
     * this [Suggestion]. The [AwesomeBar] will pass in its desired width and height for the Bitmap.
     * @property indicatorIcon A drawable for indicating different types of [Suggestion].
     * @property chips A list of [Chip] instances to be displayed.
     * @property flags A set of [Flag] values for this [Suggestion].
     * @property onSuggestionClicked A callback to be executed when the [Suggestion] was clicked by the user.
     * @property onChipClicked A callback to be executed when a [Chip] was clicked by the user.
     * @property score A score used to rank suggestions of this provider against each other. A suggestion with a higher
     * score will be shown on top of suggestions with a lower score.
     * @property metadata Opaque metadata associated with this [Suggestion]. A [SuggestionProvider] can use this field
     * to pass additional information about this suggestion.
     */
    data class Suggestion(
        override val provider: SuggestionProvider,
        override val id: String = UUID.randomUUID().toString(),
        val title: String? = null,
        val description: String? = null,
        val editSuggestion: String? = null,
        val isRemovalAllowed: Boolean = false,
        val icon: Bitmap? = null,
        val indicatorIcon: Drawable? = null,
        val chips: List<Chip> = emptyList(),
        override val flags: Set<Flag> = emptySet(),
        override val onSuggestionClicked: (() -> Unit)? = null,
        val onChipClicked: ((Chip) -> Unit)? = null,
        val onRemovalClicked: (() -> Unit)? = null,
        override val score: Int = 0,
        val metadata: Map<String, Any>? = null,
    ) : SuggestionItem {
        /**
         * Chips are compact actions that are shown as part of a suggestion. For example a [Suggestion] from a search
         * engine may offer multiple search suggestion chips for different search terms.
         */
        data class Chip(
            val title: String,
        )

        /**
         * Flags can be added by a [SuggestionProvider] to help the [AwesomeBar] implementation decide how to display
         * a specific [Suggestion]. For example an [AwesomeBar] could display a bookmark star icon next to [Suggestion]s
         * that contain the [BOOKMARK] flag.
         */
        enum class Flag {
            BOOKMARK,
            HISTORY,
            OPEN_TAB,
            CLIPBOARD,
            SYNC_TAB,
        }

        /**
         * Returns true if the content of the two suggestions is the same.
         *
         * This is used by [AwesomeBar] implementations to decide whether an updated suggestion (same id) needs its
         * view to be updated in order to display new data.
         */
        fun areContentsTheSame(other: Suggestion): Boolean {
            return title == other.title &&
                description == other.description &&
                chips == other.chips &&
                flags == other.flags
        }
    }

    /**
     * [StockSuggestion] to be displayed by an [AwesomeBar] implementation for stock information.
     *
     * @property provider The provider this suggestion came from.
     * @property id A unique ID (provider scope) identifying this [StockSuggestion].
     * @property score A score used to rank suggestions of this provider against each other.
     * @property onSuggestionClicked A callback to be executed when the [StockSuggestion] was clicked by the user.
     * @property query The user input in the toolbar.
     * @property ticker The stock ticker symbol (e.g., "AAPL", "GOOGL").
     * @property name The full name of the stock.
     * @property index The stock index or exchange where the stock is listed (e.g., "NASDAQ", "NYSE").
     * @property lastPrice The ask price from the most recent quote for this ticker.
     * @property changePercToday The percentage change since the previous day.
     * @property flags A set of [Flag] values for this [Suggestion].
     */
    data class StockSuggestion(
        override val provider: SuggestionProvider,
        override val id: String = UUID.randomUUID().toString(),
        override val score: Int = 0,
        override val onSuggestionClicked: (() -> Unit)? = null,
        val query: String,
        val ticker: String,
        val name: String,
        val index: String,
        val lastPrice: String,
        val changePercToday: ChangePercent,
        override val flags: Set<Flag> = emptySet(),
    ) : SuggestionItem

    /**
     * [SportSuggestion] to be displayed by an [AwesomeBar] implementation for sport information.
     *
     * @property provider The provider this suggestion came from.
     * @property id A unique ID (provider scope) identifying this [SportSuggestion].
     * @property score A score used to rank suggestions of this provider against each other.
     * @property onSuggestionClicked A callback to be executed when the [SportSuggestion] was clicked by the user.
     * @property query The user input in the toolbar.
     * @property sport The sport name.
     * @property sportCategory The category of the sport (e.g. "baseball", "basketball", "football", "hockey").
     * @property date The date of the event.
     * @property status The status of the event.
     * @property statusType The type of the status.
     * @property homeTeam The home team information.
     * @property awayTeam The away team information.
     * @property flags A set of [Flag] values for this [Suggestion].
     */
    data class SportSuggestion(
        override val provider: SuggestionProvider,
        override val id: String = UUID.randomUUID().toString(),
        override val score: Int = 0,
        override val onSuggestionClicked: (() -> Unit)? = null,
        val query: String,
        val sport: String,
        val sportCategory: SportSuggestionCategory,
        val date: SportSuggestionDate,
        val status: SportSuggestionStatus,
        val statusType: SportSuggestionStatusType,
        val homeTeam: SportSuggestionTeam,
        val awayTeam: SportSuggestionTeam,
        override val flags: Set<Flag> = emptySet(),
    ) : SuggestionItem

    /**
     * [FlightSuggestion] to be displayed by an [AwesomeBar] implementation for flight information.
     *
     * @property provider The provider this suggestion came from.
     * @property id A unique ID (provider scope) identifying this [FlightSuggestion].
     * @property score A score used to rank suggestions of this provider against each other.
     * @property onSuggestionClicked A callback to be executed when the [FlightSuggestion] was clicked by the user.
     * @property flightNumber The IATA flight designator (e.g., "AA123").
     * @property airlineName The name of the airline.
     * @property flightStatus The status of the flight.
     * @property progress The progress of the flight until it reaches its destination (0f - 1f).
     * @property departureFlightData The departure flight data.
     * @property arrivalFlightData The arrival flight data.
     * @property flags A set of [Flag] values for this [Suggestion].
     */
    data class FlightSuggestion(
        override val provider: SuggestionProvider,
        override val id: String = UUID.randomUUID().toString(),
        override val score: Int = 0,
        override val onSuggestionClicked: (() -> Unit)? = null,
        val flightNumber: String,
        val airlineName: String?,
        val flightStatus: FlightSuggestionStatus,
        val progress: Float,
        val departureFlightData: FlightData,
        val arrivalFlightData: FlightData,
        override val flags: Set<Flag> = emptySet(),
    ) : SuggestionItem

    /**
     * A [SuggestionProvider] is queried by an [AwesomeBar] whenever the text in the address bar is changed by the user.
     * It returns a list of [Suggestion]s to be displayed by the [AwesomeBar].
     */
    interface SuggestionProvider {
        /**
         * A unique ID used for identifying this provider.
         *
         * The recommended approach for a [SuggestionProvider] implementation is to generate a UUID.
         */
        val id: String

        /**
         * A header title for grouping the suggestions.
         **/
        fun groupTitle(): String? = null

        /**
         * Display the header title for grouping the suggestions.
         **/
        fun displayGroupTitle(): Boolean = true

        /**
         * Fired when the user starts interacting with the awesome bar by entering text in the toolbar.
         *
         * The provider has the option to return an initial list of suggestions that will be displayed before the
         * user has entered/modified any of the text.
         */
        fun onInputStarted(): List<Suggestion> = emptyList()

        /**
         * Fired whenever the user changes their input, after they have started interacting with the awesome bar.
         *
         * This is a suspending function. An [AwesomeBar] implementation is expected to invoke this method from a
         * [Coroutine](https://kotlinlang.org/docs/reference/coroutines-overview.html). This allows the [AwesomeBar]
         * implementation to group and cancel calls to multiple providers.
         *
         * Coroutine cancellation is cooperative. A coroutine code has to cooperate to be cancellable:
         * https://github.com/Kotlin/kotlinx.coroutines/blob/master/docs/cancellation-and-timeouts.md
         *
         * @param text The current user input in the toolbar.
         * @return A list of suggestions to be displayed by the [AwesomeBar].
         */
        suspend fun onInputChanged(text: String): List<SuggestionItem>

        /**
         * Fired when the user has cancelled their interaction with the awesome bar.
         */
        fun onInputCancelled() = Unit

        /**
         * A [Scorer] is responsible for scoring a list of [Suggestion]s. The score determines the order in which
         * suggestions are displayed.
         *
         * The interface is designed to allow the user of a [SuggestionProvider] to override the scoring logic. If the
         * provider is implemented with a [Scorer] as part of constructor, it enables users to supply their own custom
         * scoring implementations, providing control over how suggestions are displayed.
         */
        interface Scorer {
            /**
             * Scores the provided list of [Suggestion]s.
             *
             * The score assigned to each [Suggestion] can be used to determine its ranking and display order within the
             * [AwesomeBar].
             *
             * @param suggestions A list of [Suggestion]s to be scored.
             * @return A list of [Suggestion]s with updated scores.
             */
            fun score(suggestions: List<Suggestion>): List<Suggestion>
        }
    }

    /**
     * A group of [SuggestionProvider]s.
     *
     * @property providers The list of [SuggestionProvider]s in this group.
     * @property priority An optional priority for this group. Decides the order of this group
     * in the AwesomeBar suggestions. Group having the highest integer value will have the highest priority.
     * @property title An optional title for this group. The title may be rendered by an AwesomeBar
     * implementation.
     * @property displayTitle display the above title.
     * @property limit The maximum number of suggestions that will be shown in this group.
     * @property id A unique ID for this group (uses a generated UUID by default)
     */
    data class SuggestionProviderGroup(
        val providers: List<SuggestionProvider>,
        var priority: Int = 0,
        val title: String? = null,
        val displayTitle: Boolean = true,
        val limit: Int = Integer.MAX_VALUE,
        val id: String = UUID.randomUUID().toString(),
    )
}
