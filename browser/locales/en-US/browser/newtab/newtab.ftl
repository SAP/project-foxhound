# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = New Tab
newtab-settings-button =
    .title = Customize your New Tab page
newtab-personalize-icon-label =
    .title = Personalize new tab
    .aria-label = Personalize new tab
newtab-personalize-dialog-label =
    .aria-label = Personalize

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Search
    .aria-label = Search

# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Search with { $engine } or enter address
newtab-search-box-handoff-text-no-engine = Search or enter address
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Search with { $engine } or enter address
    .title = Search with { $engine } or enter address
    .aria-label = Search with { $engine } or enter address
newtab-search-box-handoff-input-no-engine =
    .placeholder = Search or enter address
    .title = Search or enter address
    .aria-label = Search or enter address

newtab-search-box-text = Search the web
newtab-search-box-input =
    .placeholder = Search the web
    .aria-label = Search the web

## Top Sites - General form dialog.

newtab-topsites-add-search-engine-header = Add Search Engine
newtab-topsites-add-shortcut-header = New Shortcut
newtab-topsites-edit-topsites-header = Edit Top Site
newtab-topsites-edit-shortcut-header = Edit Shortcut
newtab-topsites-add-shortcut-label = Add Shortcut
newtab-topsites-title-label = Title
newtab-topsites-title-input =
    .placeholder = Enter a title

newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Type or paste a URL
newtab-topsites-url-validation = Valid URL required

newtab-topsites-image-url-label = Custom Image URL
newtab-topsites-use-image-link = Use a custom image…
newtab-topsites-image-validation = Image failed to load. Try a different URL.

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Cancel
newtab-topsites-delete-history-button = Delete from History
newtab-topsites-save-button = Save
newtab-topsites-preview-button = Preview
newtab-topsites-add-button = Add

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Are you sure you want to delete every instance of this page from your history?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = This action cannot be undone.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Sponsored

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Open menu
    .aria-label = Open menu

# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Remove
    .aria-label = Remove

# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Open menu
    .aria-label = Open context menu for { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Edit this site
    .aria-label = Edit this site

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Edit
newtab-menu-open-new-window = Open in a New Window
newtab-menu-open-new-private-window = Open in a New Private Window
newtab-menu-dismiss = Dismiss
newtab-menu-pin = Pin
newtab-menu-unpin = Unpin
newtab-menu-delete-history = Delete from History
newtab-menu-save-to-pocket = Save to { -pocket-brand-name }
newtab-menu-delete-pocket = Delete from { -pocket-brand-name }
newtab-menu-archive-pocket = Archive in { -pocket-brand-name }
newtab-menu-show-privacy-info = Our sponsors & your privacy

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Done
newtab-privacy-modal-button-manage = Manage sponsored content settings
newtab-privacy-modal-header = Your privacy matters.
newtab-privacy-modal-paragraph-2 =
    In addition to dishing up captivating stories, we also show you relevant,
    highly-vetted content from select sponsors. Rest assured, <strong>your browsing
    data never leaves your personal copy of { -brand-product-name }</strong> — we don’t see it, and our
    sponsors don’t either.
newtab-privacy-modal-link = Learn how privacy works on the new tab

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Remove Bookmark
# Bookmark is a verb here.
newtab-menu-bookmark = Bookmark

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Copy Download Link
newtab-menu-go-to-download-page = Go to Download Page
newtab-menu-remove-download = Remove from History

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Show in Finder
       *[other] Open Containing Folder
    }
newtab-menu-open-file = Open File

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Visited
newtab-label-bookmarked = Bookmarked
newtab-label-removed-bookmark = Bookmark removed
newtab-label-recommended = Trending
newtab-label-saved = Saved to { -pocket-brand-name }
newtab-label-download = Downloaded

# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Sponsored

# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Sponsored by { $sponsor }

# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Remove Section
newtab-section-menu-collapse-section = Collapse Section
newtab-section-menu-expand-section = Expand Section
newtab-section-menu-manage-section = Manage Section
newtab-section-menu-manage-webext = Manage Extension
newtab-section-menu-add-topsite = Add Top Site
newtab-section-menu-add-search-engine = Add Search Engine
newtab-section-menu-move-up = Move Up
newtab-section-menu-move-down = Move Down
newtab-section-menu-privacy-notice = Privacy Notice

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Collapse Section
newtab-section-expand-section-label =
    .aria-label = Expand Section

## Section Headers.

newtab-section-header-topsites = Top Sites
newtab-section-header-recent-activity = Recent activity
newtab-section-header-stories = Thought-provoking stories

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Start browsing, and we’ll show some of the great articles, videos, and other pages you’ve recently visited or bookmarked here.

# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = You’ve caught up. Check back later for more stories. Can’t wait? Select a popular topic to find more great stories from around the web.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = You are caught up!
newtab-discovery-empty-section-topstories-content = Check back later for more stories.
newtab-discovery-empty-section-topstories-try-again-button = Try Again
newtab-discovery-empty-section-topstories-loading = Loading…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Oops! We almost loaded this section, but not quite.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Popular Topics:
newtab-pocket-new-topics-title = Want even more stories? See these popular topics from { -pocket-brand-name }
newtab-pocket-more-recommendations = More Recommendations
newtab-pocket-learn-more = Learn more
newtab-pocket-cta-button = Get { -pocket-brand-name }
newtab-pocket-cta-text = Save the stories you love in { -pocket-brand-name }, and fuel your mind with fascinating reads.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } is part of the { -brand-product-name } family

# A save to Pocket button that shows over the card thumbnail on hover.
newtab-pocket-save = Save
newtab-pocket-saved = Saved

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Discover the best of the web
newtab-pocket-onboarding-cta = { -pocket-brand-name } explores a diverse range of publications to bring the most informative, inspirational, and trustworthy content right to your { -brand-product-name } browser.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Oops, something went wrong loading this content.
newtab-error-fallback-refresh-link = Refresh page to try again.

## Customization Menu

newtab-custom-shortcuts-toggle =
  .label = Shortcuts
  .description = Sites you save or visit

# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
        { $num ->
            [one] { $num } row
           *[other] { $num } rows
        }
newtab-custom-sponsored-sites = Sponsored shortcuts
newtab-custom-stories-toggle =
  .label = Recommended stories
  .description = Exceptional content curated by the { -brand-product-name } family
newtab-custom-pocket-sponsored = Sponsored stories
newtab-custom-pocket-show-recent-saves = Show recent saves
newtab-custom-recent-toggle =
  .label = Recent activity
  .description = A selection of recent sites and content
newtab-custom-weather-toggle =
  .label = Weather
  .description = Today’s forecast at a glance
newtab-custom-close-button = Close
newtab-custom-settings = Manage more settings

## New Tab Wallpapers

newtab-wallpaper-title = Wallpapers
newtab-wallpaper-reset = Reset to default
newtab-wallpaper-light-red-panda = Red panda
newtab-wallpaper-light-mountain = White mountain
newtab-wallpaper-light-sky = Sky with purple and pink clouds
newtab-wallpaper-light-color = Blue, pink and yellow shapes
newtab-wallpaper-light-landscape = Blue mist mountain landscape
newtab-wallpaper-light-beach = Beach with palm tree
newtab-wallpaper-dark-aurora = Aurora Borealis
newtab-wallpaper-dark-color = Red and blue shapes
newtab-wallpaper-dark-panda = Red panda hidden in forest
newtab-wallpaper-dark-sky = City landscape with a night sky
newtab-wallpaper-dark-mountain = Landscape mountain
newtab-wallpaper-dark-city = Purple city landscape

## Solid Colors

newtab-wallpaper-category-title-colors = Solid colors
newtab-wallpaper-blue = Blue
newtab-wallpaper-light-blue = Light blue
newtab-wallpaper-light-purple = Light purple
newtab-wallpaper-light-green = Light green
newtab-wallpaper-green = Green
newtab-wallpaper-beige = Beige
newtab-wallpaper-yellow = Yellow
newtab-wallpaper-orange = Orange
newtab-wallpaper-pink = Pink
newtab-wallpaper-light-pink = Light pink
newtab-wallpaper-red = Red
newtab-wallpaper-dark-blue = Dark blue
newtab-wallpaper-dark-purple = Dark purple
newtab-wallpaper-dark-green = Dark green
newtab-wallpaper-brown = Brown

## Abstract

newtab-wallpaper-category-title-abstract = Abstract
newtab-wallpaper-abstract-green = Green shapes
newtab-wallpaper-abstract-blue = Blue shapes
newtab-wallpaper-abstract-purple = Purple shapes
newtab-wallpaper-abstract-orange = Orange shapes
newtab-wallpaper-gradient-orange = Gradient orange and pink
newtab-wallpaper-abstract-blue-purple = Blue and purple shapes

## Photographs

newtab-wallpaper-category-title-photographs = Photographs
newtab-wallpaper-beach-at-sunrise = Beach at sunrise
newtab-wallpaper-beach-at-sunset = Beach at sunset
newtab-wallpaper-storm-sky = Storm sky
newtab-wallpaper-sky-with-pink-clouds = Sky with pink clouds
newtab-wallpaper-red-panda-yawns-in-a-tree = Red panda yawns in a tree
newtab-wallpaper-white-mountains = White mountains

# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Photo by <a data-l10n-name="name-link">{ $author_string }</a> on <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Try a splash of color
newtab-wallpaper-feature-highlight-content = Give your New Tab a fresh look with wallpapers.
newtab-wallpaper-feature-highlight-button = Got it
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Dismiss
    .aria-label = Close popup
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = See forecast in { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Sponsored
newtab-weather-menu-change-location = Change location
newtab-weather-change-location-search-input = Search location
newtab-weather-menu-weather-display = Weather display
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Simple
newtab-weather-menu-change-weather-display-simple = Switch to simple view
newtab-weather-menu-weather-display-option-detailed = Detailed
newtab-weather-menu-change-weather-display-detailed = Switch to detailed view
newtab-weather-menu-temperature-units = Temperature units
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Switch to Fahrenheit
newtab-weather-menu-change-temperature-units-celsius = Switch to Celsius
newtab-weather-menu-hide-weather = Hide weather on New Tab
newtab-weather-menu-learn-more = Learn more
# This message is shown if user is working offline
newtab-weather-error-not-available = Weather data is not available right now.
