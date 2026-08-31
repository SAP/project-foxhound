# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Tendayke Pyahu
newtab-settings-button =
    .title = Eñemomba’e ne Tendayke Pyahu roguére
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Emboava ko kuatiarogue
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Ñemomba’ete
newtab-customize-panel-label =
    .label = Ñemomba’ete
newtab-personalize-settings-icon-label =
    .title = Eñemomba’e tendayke pyahúre
    .aria-label = Ñemboheko
newtab-settings-dialog-label =
    .aria-label = Ñemboheko
newtab-personalize-icon-label =
    .title = Eñemomba’e tendayke pyahúre
    .aria-label = Eñemomba’e tendayke pyahúre
newtab-personalize-dialog-label =
    .aria-label = Ñemomba’e
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Mboyke
    .aria-label = Mboyke

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Kuatiarogue ñepyrũha
home-homepage-new-windows =
    .label = Ovetã pyahu
home-homepage-new-tabs =
    .label = tendayke pyahu
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Eiporavo peteĩ tendaite

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Ñanduti kundaharape(ita)
home-custom-homepage-address =
    .placeholder = Ehai kundaharape
home-custom-homepage-address-button =
    .label = Embojuaju kundaharape
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Ndaipóri ñanduti rogue mbojuajupyre.
home-custom-homepage-delete-address-button =
    .aria-label = Embogue kundaharape
    .title = Embogue kundaharape
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Emyengovia kóvandi
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Kuatiarogue ijurujavahína
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Techaukahaita…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Heka
home-prefs-stories-header2 =
    .label = Tembiasakue
    .description = Tetepy oiporavóva { -brand-product-name } reheguáva
home-prefs-widgets-header =
    .label = Widgets
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Tysyieta
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Aravojere
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Jehugarã
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Aravopapaha
home-prefs-mission-message2 =
    .message = Ore ykekohára oipytyvõ romombareteve hag̃ua ñanduti rogue.
home-prefs-manage-topics-link2 =
    .label = Eñangareko témare
home-prefs-choose-wallpaper-link2 =
    .label = Eiporavo mba’erechaha rugua
home-prefs-firefox-logo-header =
    .label = { -brand-short-name } ra’ãnga’i
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Eiporu hag̃ua ko’ã tembiapoite, emboheko tendayke térã ovetã pyahu { -firefox-home-brand-name } ndive.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } rysýi
           *[other] { $num } rysýi
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Jepysokue ({ $extension })
home-restore-defaults-srd =
    .label = mbopyahujey techa mboyvegua
    .accesskey = m
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (Ijypykue)
home-mode-choice-custom-srd =
    .label = URLs ñemomba’e…
home-mode-choice-blank-srd =
    .label = Kuatiarogue morotĩva
home-prefs-shortcuts-header-srd =
    .label = Jeike pya’eha
home-prefs-shortcuts-select =
    .aria-label = Jeike pya’eha
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Jeike pya’eha jehepyme’ẽpyre
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Tembiasakue jehepyme’ẽguáva
home-prefs-highlights-option-visited-pages-srd =
    .label = Tenda jeikepyre
home-prefs-highlights-options-bookmarks-srd =
    .label = Techaukaha
home-prefs-highlights-option-most-recent-download-srd =
    .label = Oñemboguejy ramovéva
home-prefs-recent-activity-header-srd =
    .label = Tembiapo ramovegua
home-prefs-recent-activity-select =
    .aria-label = Tembiapo ramovegua
home-prefs-weather-header-srd =
    .label = Arapytu
home-prefs-support-firefox-header-srd =
    .label = Eipytyvõ { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = Eikuaa mba’éichapa

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Eheka
    .aria-label = Eheka
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Eheka { $engine } ndive térã emoinge kundaharape
newtab-search-box-handoff-text-no-engine = Eheka térã ehai kundaharape
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Eheka { $engine } ndive térã emoinge kundaharape
    .title = Eheka { $engine } ndive térã emoinge kundaharape
    .aria-label = Eheka { $engine } ndive térã emoinge kundaharape
newtab-search-box-handoff-input-no-engine =
    .placeholder = Eheka térã ehai kundaharape
    .title = Eheka térã ehai kundaharape
    .aria-label = Eheka térã ehai kundaharape
newtab-search-box-text = Eheka ñandutípe
newtab-search-box-input =
    .placeholder = Eheka ñandutípe
    .aria-label = Eheka ñandutípe

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Embojuaju hekaha
newtab-topsites-add-shortcut-header = Mbopya’eha pyahu
newtab-topsites-edit-topsites-header = Tenda Ojeikevéva Mbosako’i
newtab-topsites-edit-shortcut-header = Mbopya’eha mbosako’i
newtab-topsites-add-shortcut-label = Embojuaju jeike pya’eha
newtab-topsites-add-shortcut-title =
    .title = Embojuaju jeike pya’eha
    .aria-label = Embojuaju jeike pya’eha
newtab-topsites-title-label = Teratee
newtab-topsites-title-input =
    .placeholder = Ehai herarã
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Ehai térã emboja peteĩ URL
newtab-topsites-url-validation = Oñeikotevẽ URL oiko porãva
newtab-topsites-image-url-label = URL ra’ãnga ñemomba’etepyre
newtab-topsites-use-image-link = Ta’ãnga ñemomba’etepyre…
newtab-topsites-image-validation = Ta’ãnga nehenyhẽkuái. Eiporu peteĩ URL iñambuéva.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Emopotĩ moñe’ẽrã

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Heja
newtab-topsites-delete-history-button = Tembiasakue Rysýigui Ñeguenohẽ
newtab-topsites-save-button = Ñongatu
newtab-topsites-preview-button = Jehecha ypy
newtab-topsites-add-button = Embojoapy

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Añetehápepa renohẽse oimeraẽva mba’e ko toguepegua tembiasakue rysýigui?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Ko ojejapóva ndaikatuvéima oñemboguevi.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Pytyvõpyréva

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (mbojapyre)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Eike poravorãme
    .aria-label = Eike poravorãme
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Mboguete
    .aria-label = Mboguete
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Eike poravorãme
    .aria-label = Embojuruja poravorã { $title } peg̃uarã
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Embosako’i ko tenda
    .aria-label = Embosako’i ko tenda

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Mbosako’i
newtab-menu-open-new-window = Jeike Ovetã Pyahúpe
newtab-menu-open-new-private-window = Jeike Ovetã Ñemi Pyahúpe
newtab-menu-dismiss = Emboyke
newtab-menu-pin = Mboja
newtab-menu-unpin = Mboja’ỹ
newtab-menu-delete-history = Tembiasakue Rysýigui Ñeguenohẽ
newtab-menu-save-to-pocket = Eñongatu { -pocket-brand-name }-pe
newtab-menu-delete-pocket = Embogue { -pocket-brand-name }-pe
newtab-menu-archive-pocket = Eñongatu { -pocket-brand-name }-pe
newtab-menu-show-privacy-info = Ore pytyvõhára ha iñemigua
newtab-menu-about-fakespot = { -fakespot-brand-name } rehegua
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Momarandu
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Joko
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Ndahapykuehovéima
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Eikuaave
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Anive ehapykueho téma

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Emboguata tetepy ykekopyre
newtab-menu-our-sponsors-and-your-privacy = Ore pytyvõhára ha nemigua
newtab-menu-report-this-ad = Emomarandu ko ñemurã rehegua

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Oĩma
newtab-privacy-modal-button-manage = Ema’ẽ tetepy mboheko tepyme’ẽpyre
newtab-privacy-modal-header = Ne ñemigua tuichamba’e.
newtab-privacy-modal-paragraph-2 =
    Ome’ẽse avei tembiasakue oporombovy’áva, avei rohechauka marandu iporãva,
    tetepy pytyvõhára poravopyre ohechajeypyre. Ani ejepy’apy, <strong>nde kundaha mba’ekuaarã tekorosã
     araka’eve ndohejái mbohasarã mba’eteéva { -brand-product-name } rehegua</strong>: ore ndorohechái ha ore pytyvõhára avei.
newtab-privacy-modal-link = Eikuaa mba’éicha omba’apo ñemigua tendayke pyahúpe

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Techaukaha Mboguete
# Bookmark is a verb here.
newtab-menu-bookmark = Techaukaha

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Emonguatia juajuha kundaharape
newtab-menu-go-to-download-page = Eho ñemboguejyha kuatiaroguépe
newtab-menu-remove-download = Emboguepa tembiasakuégui

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Ehechauka Finder-pe
       *[other] Embojuruja ñongatuha guerekopy
    }
newtab-menu-open-file = Embojuruja marandurenda

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Jeikepyre
newtab-label-bookmarked = Oñeñongatuva’ekue techaukaháramo
newtab-label-removed-bookmark = Techaukaha mboguepyre
newtab-label-recommended = Ojehechajepíva
newtab-label-saved = { -pocket-brand-name }-pe ñongatupyre
newtab-label-download = Mboguejypyre
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Tepyme’ẽmbyre
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Ohepyme’ẽva { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Pytyvõpyréva

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Emboguete vore
newtab-section-menu-collapse-section = Embopytupa vore
newtab-section-menu-expand-section = Emoasãi vore
newtab-section-menu-manage-section = Eñangareko vorére
newtab-section-menu-manage-webext = Emongu’e jepysokue
newtab-section-menu-add-topsite = Embojuaju Tenda ojeikeveha
newtab-section-menu-add-search-engine = Embojuaju hekaha
newtab-section-menu-move-up = Jupi
newtab-section-menu-move-down = Guejy
newtab-section-menu-privacy-notice = Marandu’i ñemiguáva

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Emonichĩ vore
newtab-section-expand-section-label =
    .aria-label = Emoasãi vore

## Section Headers.

newtab-section-header-topsites = Tenda Ojehechavéva
newtab-section-header-recent-activity = Tembiapo ramovegua
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = { $provider } he’i ndéve reike hag̃ua
newtab-section-header-stories = Tembiasakue nemoakãngetáva
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Poravopyre ko arapegua ndéve g̃uarã

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Eñepyrũ eikundaha ha rohechaukáta ndéve mba’ehai, mba’erecharã oĩva ha ambue ñandutirenda reikeva’ekue ýrõ rembotechaukava’ekue.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Ko’ág̃a reikuaapáma ipyahúva. Eikejey ag̃ave ápe eikuaávo mombe’upy pyahu { $provider } oikuave’ẽva ndéve. Ndaikatuvéima reha’ãrõ? Eiporavo peteĩ ñe’ẽmbyrã ha emoñe’ẽve oĩvéva ñande yvy ape ári.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Ko’ág̃a reikuaapáma. Eikejey ag̃ave ápe eikuaave hag̃ua. ¿Nereha’ãrõkuaavéima? Eiporavo ñe’ẽrã ejuhu hag̃ua tembiasakue yvy ape arigua.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = ¡Rejejokóma!
newtab-discovery-empty-section-topstories-content = Ejujey ag̃ave tembiasaverã.
newtab-discovery-empty-section-topstories-try-again-button = Eha’ã jey
newtab-discovery-empty-section-topstories-loading = Henyhẽhína…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = ¡Háke! Haimete ñamyanyhẽ ko pehẽ’i, hákatu nahenyhẽmbamo’ãi.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Ñe’ẽmbyrã Ojehayhuvéva:
newtab-pocket-new-topics-title = ¿Eipotavépa tembiasakue? Ehecha téma ojehechavéva { -pocket-brand-name } rehegua
newtab-pocket-more-recommendations = Hetave je’eporã
newtab-pocket-learn-more = Kuaave
newtab-pocket-cta-button = Eguereko { -pocket-brand-name }
newtab-pocket-cta-text = Eñongatu umi eipotáva tembiasakue { -pocket-brand-name }-pe ha emombarete ne akã ñemoñe’ẽ ha’evévape.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } ha’e { -brand-product-name } pehẽngue
newtab-pocket-save = Ñongatu
newtab-pocket-saved = Ñongatupyre

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Koichaguave
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Ndacheveg̃uarãi
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Aguyje. Nde jehai ore pytyvõta iporãve hag̃ua ne marandurã.
newtab-toast-dismiss-button =
    .title = Emboyke
    .aria-label = Emboyke

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Ehecha ñandutigua iporãvéva
newtab-pocket-onboarding-cta = { -pocket-brand-name } ohecha hetaichagua ñemomarandu oguerukuaa hag̃ua tetepy maranduverã, py’aho ha jerovia añete ne kundahára rehe { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Ema’ẽ, mba’épa osẽvai henyhẽnguévo ko tetepy.
newtab-error-fallback-refresh-link = Kuatiarogue mbopiro’y eñepyrũjey hag̃ua

## Customization Menu

newtab-custom-shortcuts-title = Jeike pya’eha
newtab-custom-shortcuts-subtitle = Tenda eñongatúva térã eikeha
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Jeike pya’eha
    .description = Tenda eñongatúva térã eikeha
newtab-custom-shortcuts-nova =
    .label = Jeike pya’eha
newtab-custom-row-description =
    .description = Tysýi papapy
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } Mba’erysýi
           *[other] { $num } Mba’erysyikuéra
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } Mba’erysýi
       *[other] { $num } Mba’erysyikuéra
    }
newtab-custom-sponsored-sites = Jeike pya’eha jehepyme’ẽpyre
newtab-custom-pocket-title = { -pocket-brand-name } oñe’ẽporãha
newtab-custom-pocket-subtitle = Tetepy iporãva { -pocket-brand-name } oiporavopyre, { -brand-product-name } mba’éva pegua
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Tembiasakue momba’epyre
    .description = Tetepy iporãva oiporavóva { -brand-product-name } reheguáva
newtab-recommended-stories-toggle =
    .label = Tembiasakue momba’epyre
newtab-custom-stories-personalized-toggle =
    .label = Tembiasakue
newtab-custom-stories-personalized-checkbox-label = Tembiasakueita teéva ipyendáva ne rembiapóre
newtab-custom-pocket-sponsored = Tembiasakue jehepyme’ẽguáva
newtab-custom-pocket-show-recent-saves = Ehechauka eñongaturamóva
newtab-custom-recent-title = Tembiapo ramovegua
newtab-custom-recent-subtitle = Tenda jeporavo ha tetepy ramovegua
newtab-custom-weather-toggle =
    .label = Arapytu
    .description = Ko árape g̃uara ára
newtab-custom-widget-weather-toggle =
    .label = Arapytu
newtab-custom-widget-lists-toggle =
    .label = Tysýi
newtab-custom-widget-timer-toggle =
    .label = Aravojere
newtab-custom-widget-sports-toggle =
    .label = Copa del Mundo
newtab-custom-widget-clock-toggle =
    .label = Aravopapaha
newtab-custom-widget-sports-toggle2 =
    .label = Tetemongu’e
newtab-custom-widget-section-title = Widgets
newtab-custom-widget-section-toggle =
    .label = Widgets
newtab-widget-manage-title = Widgets
newtab-widget-manage-widget-button =
    .label = Eñangareko widgets
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Mboty
    .aria-label = Poravorã mboty
newtab-custom-close-button = Mboty
newtab-custom-settings = Eñangareko hetave ñembohekóre

## New Tab Wallpapers

newtab-wallpaper-title = Mba’erechaha rugua
newtab-wallpaper-reset = Emoñerũjey ypyguáramo
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Ehupi peteĩ ta’ãnga
newtab-wallpaper-add-an-image = Embojuaju ta’ãnga
newtab-wallpaper-custom-color = Eiporavo peteĩ sa’y
newtab-wallpaper-toggle-title =
    .label = Mba’erechaha rugua
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Ta’ãnga ohasáma tuichakuépe { $file_size } MB rehegua. Eñeha’ã ehupi marandurenda michĩvéva.
newtab-wallpaper-error-upload-file-type = Ndaikatúi rohupi marandurenda. Eha’ã jey marandurenda ambuéva reheve.
newtab-wallpaper-error-file-type = Ndaikatúi rohupi marandurenda. Eha’ã jey marandurenda ambuéva reheve.
newtab-wallpaper-light-red-panda = Panda pytã
newtab-wallpaper-light-mountain = Yvyty morotĩ
newtab-wallpaper-light-sky = Ára taijarai pytãũ ha pytãngy
newtab-wallpaper-light-color = Ysaja hovy, pytãngy ja sa’yju
newtab-wallpaper-light-landscape = Yvyty jehecha tatatina hovýva ndive
newtab-wallpaper-light-beach = Yrembe’y jata’i ndive
newtab-wallpaper-dark-aurora = Kuarahyresẽ yvategua
newtab-wallpaper-dark-color = Ysaja pytã ha hovy
newtab-wallpaper-dark-panda = Pánda pytã okañýva ñañandýpe
newtab-wallpaper-dark-sky = Táva jehecha ára pytũmby ndive
newtab-wallpaper-dark-mountain = Yvyty jehecha
newtab-wallpaper-dark-city = Táva jehecha pytãũva
newtab-wallpaper-dark-fox-anniversary = Peteĩ aguara ka’aguy mboypýri
newtab-wallpaper-light-fox-anniversary = Aguara ñu mbyte ikapi’ipéva ojehechahápe yvyty hatatĩnáva

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Sa’y ipeteĩva
newtab-wallpaper-colors = Sa’yita
newtab-wallpaper-blue = Hovy
newtab-wallpaper-light-blue = Hovy kamgy
newtab-wallpaper-light-purple = Pytãũ kangy
newtab-wallpaper-light-green = Hovyũ kangy
newtab-wallpaper-green = Hovyũ
newtab-wallpaper-beige = Morotĩngy
newtab-wallpaper-yellow = Sa’yju
newtab-wallpaper-orange = Naraha
newtab-wallpaper-pink = Pytãngy
newtab-wallpaper-light-pink = Pytãngy kangy
newtab-wallpaper-red = Ñanduti
newtab-wallpaper-dark-blue = Hovy pytũva
newtab-wallpaper-dark-purple = Pytãũ pytũva
newtab-wallpaper-dark-green = Hovyũ pytũva
newtab-wallpaper-brown = Marrõ

## Abstract

newtab-wallpaper-category-title-abstract = Hecha’ỹva
newtab-wallpaper-abstract-green = Hovyũva rehegua
newtab-wallpaper-abstract-blue = Hovýva rehegua
newtab-wallpaper-abstract-purple = Pytãũva rehegua
newtab-wallpaper-abstract-orange = Ñarã rehegua
newtab-wallpaper-gradient-orange = Oguejýva narãgui pytãngýpe
newtab-wallpaper-abstract-blue-purple = Hovy ha pytãũva rehegua
newtab-wallpaper-abstract-white-curves = Morotĩ mba’ekarẽ hi’ãva ndive
newtab-wallpaper-abstract-purple-green = Sa’ykuéra pytãũ ha hovyũ rehegua
newtab-wallpaper-abstract-blue-purple-waves = Hovy ha pytãũva rehegua
newtab-wallpaper-abstract-black-waves = Hũ ikarẽkarẽva

## Firefox

newtab-wallpaper-category-title-photographs = Ta’ãnga
newtab-wallpaper-beach-at-sunrise = Jejahuha ko’ẽmbotávo
newtab-wallpaper-beach-at-sunset = Jejahuha ka’arupytũvo
newtab-wallpaper-storm-sky = Ára vai
newtab-wallpaper-sky-with-pink-clouds = Ára arai pytãngy ndive
newtab-wallpaper-red-panda-yawns-in-a-tree = Pánda pytã hopehýi yvyráre
newtab-wallpaper-white-mountains = Yvytysyry morotĩ
newtab-wallpaper-hot-air-balloons = Globo aerostático sa’ykuéra arakuépe.
newtab-wallpaper-starry-canyon = Pyhare mbyjaita hovývareve
newtab-wallpaper-suspension-bridge = Jehasaha osãingóva ra’ãnga isa’y tanimbúva arakuépe
newtab-wallpaper-sand-dunes = Yvyku’i morotĩ atýra
newtab-wallpaper-palm-trees = Jata’i ra’ãnga aravo itajúva aja
newtab-wallpaper-blue-flowers = Yvoty hovy ra’ãnga ag̃uietégui ipotyjeráva
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Ta’ãnga <a data-l10n-name="name-link">{ $author_string }</a> <a data-l10n-name="webpage-link">{ $webpage_string }</a>-pe
newtab-wallpaper-feature-highlight-header = Eiporukuaa sa’y sa’imi
newtab-wallpaper-feature-highlight-content = Eme’ẽ ne rendayke pyahúpe jehecharã ipyahúva.
newtab-wallpaper-feature-highlight-button = Aikũmby
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Mboyke
    .aria-label = Emboty mba’e iñapysẽva
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Araregua
newtab-wallpaper-celestial-lunar-eclipse = Jasy ñemo’ã
newtab-wallpaper-celestial-earth-night = Ta’ãnga pyharegua yvyguasu ikarapeveha guive
newtab-wallpaper-celestial-starry-sky = Ára imbyjapáva
newtab-wallpaper-celestial-eclipse-time-lapse = Aravo jasy ñemo’ã aja
newtab-wallpaper-celestial-black-hole = Galaxia peteĩ kuára hũva reheve
newtab-wallpaper-celestial-river = Ysyryguasu ra’ãnga satélite guive

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Ehecha ára rehegua { $provider }-pe
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Oykekóva
newtab-weather-menu-change-location = Emoambue tendatee
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Eheka tendatee
    .aria-label = Eheka tendatee
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Eiporu ne rendaite ag̃agua
newtab-weather-menu-weather-display = Ára jehechaha
newtab-weather-todays-forecast = Arareko ko árape g̃uarã
newtab-weather-see-full-forecast = Ehechapaite arareko
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Simple
newtab-weather-menu-change-weather-display-simple = Eva simple jehechápe
newtab-weather-menu-weather-display-option-detailed = Mba’emimi
newtab-weather-menu-change-weather-display-detailed = Eva mba’emimi jehechápe
newtab-weather-menu-temperature-units = Arareko ñeha’ãha
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Eva Fahrenheit ndive
newtab-weather-menu-change-temperature-units-celsius = Eva Celsius ndive
newtab-weather-menu-hide-weather = Eñomi arareko Tendayke Pyahúpe
newtab-weather-menu-learn-more = Eikuaave
newtab-weather-menu-detect-my-location = Ehecha che rendaite
# This message is shown if user is working offline
newtab-weather-error-not-available = Marandu ára rehegua ndaipóri ko’ag̃aite.
newtab-weather-opt-in-see-weather = ¿Ehechasépa ne rendaitepegua arareko?
newtab-weather-opt-in-not-now =
    .label = Ani ko’ág̃a
newtab-weather-opt-in-yes =
    .label = Héẽ
newtab-weather-opt-in-headline = Eporandu ára reko oútava rehegua
newtab-weather-opt-in-use-location =
    .label = Eiporu tendaite
newtab-weather-opt-in-choose-location = Eiporavo tendaite
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Táva Nueva York
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Yvate
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Karape
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Ehecha ára rehegua { $provider }-pe
    .aria-description = { $provider } ∙ Oykekóva

## Topic Labels

newtab-topic-label-business = Ñemuha
newtab-topic-label-career = Mba’apoha
newtab-topic-label-education = Tekombo’e
newtab-topic-label-arts = Mbovy’aha
newtab-topic-label-food = Tembi’u
newtab-topic-label-health = Tesãi
newtab-topic-label-hobbies = Ñembosarái
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Viru
newtab-topic-label-society-parenting = Tuvakuéra
newtab-topic-label-government = Porureko
newtab-topic-label-education-science = Tembikuaaty
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Kuaarã tekovépe g̃uarã
newtab-topic-label-sports = Tetemongu’e
newtab-topic-label-tech = Tembiporupyahu
newtab-topic-label-travel = jehomombyry
newtab-topic-label-home = Óga ha yvotyty

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Eiporavo téma emoporãve hag̃ua ne canal
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Eiporavo mokõi térã hetave téma. Ore irũ katupyry omotenonde tembiasakue ojokupytyýva eipotavéva rehe. Embohekopyahu ejapose vove.
newtab-topic-selection-save-button = Ñongatu
newtab-topic-selection-cancel-button = Heja
newtab-topic-selection-button-maybe-later = Ikatu ag̃amieve
newtab-topic-selection-privacy-link = Ehecha mba’éichapa romo’ã ha romboguata ne mba’ekuaarã
newtab-topic-selection-button-update-interests = Embohekopyahu eipotáva
newtab-topic-selection-button-pick-interests = Eiporavo eipotáva

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Tapykueho
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Ehapykueho { $topic }
newtab-section-following-button = Ahapykueho
newtab-section-unfollow-button = Ndahapykuehovéima
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Esegi: Anivete esegi { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Eiporuporã nde feed
newtab-section-follow-highlight-subtitle = Ehapykueho ndegustáva ehecha hag̃ua hetave mbaʼe.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Joko
newtab-section-blocked-button = Jokopyre
newtab-section-unblock-button = Mbojera
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Esegi { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Anive esegi { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Ejoko { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Ejoko’o { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = Ani ko’ág̃a
newtab-section-confirm-block-topic-p1 = ¿Ejokose añetehápe ko téma?
newtab-section-confirm-block-topic-p2 = Umi téma jokopyre nosẽmo’ãvéima canal-kuérape.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Ejoko { $topic }
newtab-section-block-cancel-button = Eheja

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Téma
newtab-section-manage-topics-button-v2 =
    .label = Eñangareko témare
newtab-section-mangage-topics-followed-topics = Tapykueho
newtab-section-mangage-topics-followed-topics-empty-state = Ndohapykuehói gueteri téma.
newtab-section-mangage-topics-blocked-topics = Bloqueado
newtab-section-mangage-topics-blocked-topics-empty-state = Ndojokói gueteri mba’evéichagua téma.
newtab-custom-wallpaper-title = Ko’ápe oĩ mba’erechaha rugua
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Ehupi ne mba’erechaha teéva térã eiporavo sa’yete embohéra hag̃ua ne { -brand-product-name }.
newtab-custom-wallpaper-cta = Eha’ã jey

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Eiporavo mba’erechaha rugua ejapo hag̃ua { -brand-product-name } nemba’erã.
newtab-new-user-custom-wallpaper-subtitle = Pe tendayke pyahu toñeñandu porã mba’erechaha rugua ha sa’y eipotáva ndive.
newtab-new-user-custom-wallpaper-cta = Eiporu ko’ág̃a

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Mba’erechaha rugua pyahu og̃uahẽramóva
newtab-wallpaper-feature-highlight-subtitle = Eiporavo ehayhuvéva ha ajapo peteĩteĩva tendayke pyahu nemoñandúta nde rogapeguáicha.
newtab-wallpaper-feature-highlight-cta = Eiporavo mba’erechaha rugua

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Emboguejy { -brand-product-name } ne pumbyrýpe
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Emoha’ãnga pe ayvu eikundaha hag̃ua tekorosãme ehokuévo.
newtab-download-mobile-highlight-body-variant-b = Eku’ejey eheja haguégui embojuehe rire tendayke, ñe’ẽñemi ha hetave.
newtab-download-mobile-highlight-body-variant-c = ¿Eikuaápa ikatuha eraha { -brand-product-name } nendive? Pe kundaharaite. Ne kasõ vokópe.
newtab-download-mobile-highlight-image =
    .aria-label = QR ayvu emboguejy hag̃ua { -brand-product-name } pumbyrýpe

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Eguerohoryvéva ne kuã ykerete
newtab-shortcuts-highlight-subtitle = Embojuaju jeike pya’eha ereko hag̃ua erohoryvéva nde ykére.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = ¿Mba’ére emombe’u kóva rehegua?
newtab-report-ads-reason-not-interested =
    .label = Ndaipotái mba’eve
newtab-report-ads-reason-inappropriate =
    .label = Péva nahendái
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Ahecha hetaitereirasa jey
newtab-report-content-wrong-category =
    .label = Mboja’opy oĩvaíva
newtab-report-content-outdated =
    .label = Hekopyahu’ỹva
newtab-report-content-inappropriate-offensive =
    .label = Nahendái térã oporoja’óva
newtab-report-content-spam-misleading =
    .label = Spam térã japúva
newtab-report-content-requires-payment-subscription =
    .label = Oikotevẽ jehepyme’ẽ térã ñemboheraguapy
newtab-report-content-requires-payment-subscription-learn-more = Eikuaave
newtab-report-cancel = Heja
newtab-report-submit = Mondo
newtab-toast-thanks-for-reporting =
    .message = Aguyje emomarandu haguére.
newtab-toast-widgets-hidden =
    .message = Eiporavo ta’ãnga’i haiháva embojuaju jey hag̃ua widgets eipota vove.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Ko’ág̃a ehapykueho: { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Nderehapykuehovéima: { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Nderehechamo’ãvéima { $topic } rembiasakue.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Eha’ãkuaa heta jey. Embojuaju peteĩ.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Pyahu
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Opapyre ({ $number })
newtab-widget-lists-celebration-headline = Mba’apo porã
newtab-widget-lists-celebration-subhead = Ára potĩ
newtab-widget-task-list-menu-copy = Monguatia
newtab-widget-lists-menu-edit = Embosako’i tysýi réra
newtab-widget-lists-menu-edit2 =
    .aria-label = Embosako’i tysýi réra
newtab-widget-lists-menu-create = Emoheñói tysýi pyahu
newtab-widget-lists-menu-delete = Embogue ko tysýi
newtab-widget-lists-menu-copy = Embohasa tysýi kuatiajokohápe
newtab-widget-lists-menu-learn-more = Eikuaave
newtab-widget-lists-button-add-item = Embojuaju jehaipy
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Embojuaju jehaipy
    .aria-label = Embojuaju jehaipy
newtab-widget-lists-input-error = Emoinge moñe’ẽrã embojuaju hag̃ua mba’eporurã.
newtab-widget-lists-input-menu-open-link = Joajuha ijurujáva
newtab-widget-lists-input-menu-move-up = Jehupi
newtab-widget-lists-input-menu-move-down = Emongu’e yvy gotyo
newtab-widget-lists-input-menu-delete = Mboguete
newtab-widget-lists-input-menu-edit = Mbosako’i
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Embosako’i mba’epuru
newtab-widget-lists-edit-clear =
    .aria-label = Eheja
    .title = Eheja
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Emoheñói tysýi pyahu
newtab-widget-lists-name-label-default =
    .label = Tembiaporã rysýi
newtab-widget-lists-name-label-checklist =
    .label = Tysýi hechajeyha
newtab-widget-lists-name-placeholder-default =
    .placeholder = Tembiaporã rysýi
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Tysýi hechajeyha
    .aria-label = Embosako’i tysýi réra
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Tysýi pyahu
    .aria-label = Embosako’i tysýi réra
newtab-widget-section-title = Widgets
newtab-widget-menu-hide = Eñomi widget
newtab-widget-menu-change-size = Emoambue tuichakue
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Mongu’e
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Asugua
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Akatúa
newtab-widget-size-small = Michĩva
newtab-widget-size-medium = Mbyteguáva
newtab-widget-size-large = Tuicháva
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Eñomi widgets
    .aria-label = Eñomimbaite widgets
newtab-widget-section-maximize =
    .title = Emyasãi widgets
    .aria-label = Emyasãimbaite widgets tuichaháicha
newtab-widget-section-minimize =
    .title = Emomichĩ widgets
    .aria-label = Emomichĩmbaite widgets tuichaháicha
newtab-widget-section-menu-button =
    .title = Widgets poravoha
    .aria-label = Embojuruja widgets poravoha
newtab-widget-add-widgets-button =
    .aria-label = Embojuaju widget
    .title = Embojuaju widget
newtab-widget-section-menu-manage = Eñangareko widgets
newtab-widget-section-menu-hide-all = Eñomi widgets
newtab-widget-section-menu-learn-more = Eikuaave
newtab-widget-section-feedback = Ja’e mba’épa opensa
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Ehechaukave widgets
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Ehechauka’ive widgets
newtab-widget-lists-name-default = Tysýi hechajeyha

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Aravojere
newtab-widget-timer-notification-focus = Opáma nde aravo. Ejapo porã. ¿Epytu’usépa?
newtab-widget-timer-notification-break = Opáma nde jepytu’u. ¿Eñepyrũ jeýkatu?
newtab-widget-timer-notification-warning = Umi ñemomarandu ojeíma
newtab-widget-timer-mode-focus =
    .label = Focus
newtab-widget-timer-mode-break =
    .label = Pytu’u
newtab-widget-timer-label-play =
    .label = Mbopu
newtab-widget-timer-label-pause =
    .label = Mombyta
newtab-widget-timer-reset =
    .title = Mbojevyjey
newtab-widget-timer-menu-notifications = Eipe’a ñemomarandu
newtab-widget-timer-menu-notifications-on = Emyandy marandu’i
newtab-widget-timer-menu-learn-more = Kuaave
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Marandu mba’eguasuvéva
newtab-daily-briefing-card-menu-dismiss = Mokañy
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Hekopyahu ojapo { $minutes }m
newtab-widget-message-title = Epyta umi tysýi ndive ha aravopapaha reheve
# to-dos stands for "things to do".
newtab-widget-message-copy = Mandu’arã guive tembiaporã peve, ñamindu’u ha jepytu’u jehetetirarã, ema’ẽ ne rembiapo ha aravo rehe.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Tenda ha’eñóva ñemomarandurã, kuaarã ha hetave
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Eñemomba’e { -brand-product-name } rehe
newtab-promo-card-body-addons = Eiporavo mba’erecha rugua ore mba’égui térã ejapo ndetevoi.
newtab-promo-card-cta-addons = Eiporu ko’ág̃a
newtab-promo-card-title = Eipytyvõ { -brand-product-name }
newtab-promo-card-body = Ore ykekohára oipytyvõ romombareteve hag̃ua ñanduti rogue
newtab-promo-card-cta = Eikuaave
newtab-promo-card-dismiss-button =
    .title = Mboyke
    .aria-label = Mboyke

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] Emoñepyrũ aravokuaaukaha { $minutes } aravo’i
           *[other] Emoñepyrũ aravokuaaukaha { $minutes } aravo’i
        }
newtab-widget-timer-pause-aria =
    .aria-label = Emombyta aravokuaaukaha
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } aravo’i
           *[other] { $minutes } aravo’ieta
        }
newtab-widget-timer-decrease-min =
    .title = Emomichĩ 1 aravo’i
newtab-widget-timer-increase-min =
    .title = Embotuicha 1 aravo’i
newtab-widget-timer-mode-group =
    .aria-label = Aravokuaaukaha reko
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Focus
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Pytu’u
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Eñomi aravokuaaukaha
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Emba’apo porã
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Opáma jepytu’u
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = ¿Epytu’usépa?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = ¿Oĩmbáma atyrã?

##

newtab-sports-widget-menu-follow-teams = Esegi atyetápe
newtab-sports-widget-menu-view-schedule = Ehecha arapapaha
newtab-sports-widget-menu-view-upcoming = Ehecha tenondegua
newtab-sports-widget-menu-view-results = Ehecha mba’éicha osẽ
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Arange oikóva
newtab-sports-widget-menu-learn-more = Eikuaave
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Eñemomarandu Copa del Mundo rehe
newtab-sports-widget-get-updates = Erekóta mbohekopyahu partído oiko jave ha hetave.
newtab-sports-widget-view-schedule =
    .label = Ehecha nde aravorã
newtab-sports-widget-follow-teams =
    .label = Esegi atyetápe
newtab-sports-widget-view-matches =
    .label = Ehecha partidoita
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Esegi { $number } equipo peve
       *[other] Esegi { $number } equipo peve
    }
newtab-sports-widget-choose-wallpaper =
    .label = Eiporavo mba’erechaha rugua
newtab-sports-widget-skip = Jepo
newtab-sports-widget-search-country =
    .placeholder = Eheka tetã
    .aria-label = Eheka tetã
newtab-sports-widget-cancel = Eheja
newtab-sports-widget-back-button =
    .aria-label = Tapykue
newtab-sports-widget-done-button =
    .label = Japopyre
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (mboguepyre)
newtab-sports-widget-view-all =
    .label = Ehechapa
newtab-sports-widget-show-less =
    .label = Ehechauka’ive
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Aty ojesegíva añoite
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Ehecha
    .title = Ehecha oikóvo
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Ehecha oikóvo
    .title = Ehecha oikóvo
newtab-sports-widget-watch-dialog-close =
    .aria-label = Emboty
    .title = Emboty
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Reigua
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Jeporu rei
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Rei ha hepyme’ẽva
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Hepyme’ẽva
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Partído poravopyre añoite
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Eiporukuaáva eikohápe
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Ambue tendápe
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Embojuruja ñe’ẽrã
    .title = Embojuruja ñe’ẽrã
newtab-sports-widget-group-stage = Atygua jehuga
newtab-sports-widget-group-a = Aty A
newtab-sports-widget-group-b = Aty B
newtab-sports-widget-group-c = Aty C
newtab-sports-widget-group-d = Aty D
newtab-sports-widget-group-e = Aty E
newtab-sports-widget-group-f = Aty F
newtab-sports-widget-group-g = Aty G
newtab-sports-widget-group-h = Aty H
newtab-sports-widget-group-i = Aty I
newtab-sports-widget-group-j = Aty J
newtab-sports-widget-group-k = Aty K
newtab-sports-widget-group-l = Aty L
newtab-sports-widget-round-32 = 32hápe oĩva
newtab-sports-widget-round-16 = 16hápe oĩva
newtab-sports-widget-quarter-finals = 8 atýpe oĩva
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = HECHAPY
newtab-custom-widget-live-refresh =
    .title = Embopyahu kytaita
    .aria-label = Embopyahu kytaita
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Arange oikóva
newtab-sports-widget-upcoming = Oupotáva
# Used for a match currently ongoing
newtab-sports-widget-now = Ko’ág̃a
newtab-sports-widget-results = Apopyre
newtab-sports-widget-semi-finals = Irundy opytáva
newtab-sports-widget-bronze-finals = Mbohapyhápe osẽva
# Final is the final match for 1st place.
newtab-sports-widget-final = Paha
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Jokopyre
newtab-sports-widget-postponed = Mbohasapyre
newtab-sports-widget-suspended = Jejokopyre
newtab-sports-widget-cancelled = Hejapyre
newtab-sports-widget-information = Marandu partído rehegua
newtab-sports-widget-no-live-data = Mba’ekuaarãita partído rehegua ndahekopyahúi ko’ag̃aite
newtab-sports-widget-view-results-link = Ehecha mba’éicha osẽ
newtab-sports-widget-third-place = Osẽva mbohapyhápe
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Osẽva mokõihápe
newtab-sports-widget-champions = Campeón
newtab-sports-widget-world-cup-champions = Copa Mundial 2026 oganáva
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Partído opámava
newtab-sports-widget-match-halftime = Jepytu’u
newtab-sports-widget-match-extra-time = Aravo’i juapyvegua
newtab-sports-widget-match-penalties = Penal jechuta

## Accessible labels for match rows in the sports widget. These are read by
## screen readers to announce the match details and status.
## Variables shared by all messages in this group:
##   $homeTeam (String) - The full name of the home team (e.g. "Mexico")
##   $awayTeam (String) - The full name of the away team (e.g. "Russia")

# A finished match row (regular full-time result).
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
newtab-sports-widget-match-aria-label-results =
    .aria-label = { $homeTeam }, { $homeScore } versus { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) versus { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Oikóvo: { $homeTeam }, { $homeScore } versus { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } vs. { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } vs. { $awayTeam }, tapykue
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } vs. { $awayTeam }, mbohasapyre
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } vs. { $awayTeam }, jokopyre
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } vs. { $awayTeam }, hejapyre

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosnia Herzegovina
newtab-sports-widget-team-name-label-civ =
    .label = Costa de Marfil
newtab-sports-widget-team-name-label-cod =
    .label = DR Congo
newtab-sports-widget-team-name-label-eng =
    .label = Inglaterra
newtab-sports-widget-team-name-label-sco =
    .label = Escocia

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Eg̃uahẽ Mundial ñepyrũme mba’erechaha rugua pyahu reheve
newtab-sports-widget-message-wallpapers-body = Emog̃uahẽ upe energía partído oikotaha ára ne mohendahápe.
newtab-sports-widget-message-wallpapers-cta = Eiporavo mba’erechaha rugua
newtab-sports-widget-message-add-widgets-cta =
    .label = Embojuaju widgets
newtab-sports-widget-message-day-in-play-title = Ereko nde ára pukukue jeku’épe umi widget { -brand-product-name } rupi.
newtab-sports-widget-message-day-in-play-body = Ehecha Mundial, pepyta py’aguapýpe, pehecha aravo arapy tuichakue ha hetave.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Emyasãi widgets

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Mosẽ
    .aria-label = Mosẽ
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Eñemomba’e ko pa’ũre
newtab-activation-window-message-customization-focus-message = Eiporavo mba’erechaha rugua pyahu, embojuaju jeike pya’eha tendaita ehayhuvévape ha eikuaameme tembiasakue erohorýva
newtab-activation-window-message-customization-focus-primary-button =
    .label = Eñepyrũ emboava
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Ko pa’ũ ohuga ambue tekoguatarãme
newtab-activation-window-message-values-focus-message = { -brand-product-name } omoneĩ eikundahávo nde eipotahaichaite, ndeháicha eñepyrũ hag̃ua ne rembiapo ñandutípe. Emboava { -brand-product-name }.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Eñomi aravopapaha
newtab-clock-widget-menu-learn-more = Eikuaave
newtab-clock-widget-menu-edit = Embosako’i aravopapaha
newtab-clock-widget-menu-switch-to-12h = Emoambue 12 aravohapegua
newtab-clock-widget-menu-switch-to-24h = Emoambue 24 aravohapegua
newtab-clock-widget-label-your-clocks = Ijaravopapaha
newtab-clock-widget-search-location-input =
    .label = Tendaite
    .placeholder = Eheka upe táva
    .aria-label = Eheka upe táva
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Teragua’u (eipotárõ)
    .placeholder = Embojuaju teragua’u
    .aria-label = Teragua’u (eipotárõ)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Embojuaju aravopapaha pyahu
    .aria-label = Embojuaju aravopapaha pyahu
newtab-clock-widget-button-add-clock = Mbojuaju
newtab-clock-widget-button-cancel = Eheja
newtab-clock-widget-button-back =
    .title = Tapykue
    .aria-label = Tapykue
newtab-clock-widget-button-edit-clock =
    .title = Embosako’i aravopapaha
    .aria-label = Embosako’i aravopapaha
newtab-clock-widget-button-save = Ñongatu
newtab-clock-widget-button-remove-clock =
    .title = Embogue aravopapaha
    .aria-label = Embogue aravopapaha
# Accessible name for a clock row in the "Your clocks" management panel
# when the row has no user-provided nickname. Read aloud by screen
# readers when focus lands on the row.
# Variables:
#   $city (string) - The city name displayed in the row.
newtab-clock-widget-edit-item =
    .aria-label = { $city }
# Accessible name for a clock row when a user nickname has been set.
# Variables:
#   $city (string) - The city name displayed in the row.
#   $nickname (string) - The user-provided nickname for the row.
newtab-clock-widget-edit-item-with-nickname =
    .aria-label = { $city }, teragua’u: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Embojuaju aravopapaha
newtab-clock-widget-edit-clock-form =
    .aria-label = Embosako’i aravopapaha
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Jehekaha rembiapokue
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Ojuehegua’ỹva
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Embojuruja aravopapaha poravorã
    .aria-label = Embojuruja aravopapaha poravorã
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Teragua’u: { $nickname }
