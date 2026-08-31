# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Nowy rejtarik
newtab-settings-button =
    .title = Bok wašogo nowego rejtarika pśiměriś
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Toś ten bok pśiměriś
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Pśiměriś
newtab-customize-panel-label =
    .label = Pśiměriś
newtab-personalize-settings-icon-label =
    .title = Nowy rejtarik personalizěrowaś
    .aria-label = Nastajenja
newtab-settings-dialog-label =
    .aria-label = Nastajenja
newtab-personalize-icon-label =
    .title = Nowy rejtarik personalizěrowaś
    .aria-label = Nowy rejtarik personalizěrowaś
newtab-personalize-dialog-label =
    .aria-label = Personalizěrowaś
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Zachyśiś
    .aria-label = Zachyśiś

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Startowy bok
home-homepage-new-windows =
    .label = Nowe wokna
home-homepage-new-tabs =
    .label = Nowe rejtariki
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Wubjeŕśo wěste sedło

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Adrese websedłow
home-custom-homepage-address =
    .placeholder = Adresu zapódaś
home-custom-homepage-address-button =
    .label = Adresu pśidaś
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Hyšći žedne websedła pśidane.
home-custom-homepage-delete-address-button =
    .aria-label = Adresu lašowaś
    .title = Adresu lašowaś
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Wuměniś z
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Aktualne wócynjone boki
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Cytańske znamjenja…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Pytaś
home-prefs-stories-header2 =
    .label = Tšojenja
    .description = Wuwześowe wopśimjeśe, kótarež se pśez swójźbu { -brand-product-name } wótwardujo
home-prefs-widgets-header =
    .label = Asistenty
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Lisćiny
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Měritko casa
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Sport
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Zeger
home-prefs-mission-message2 =
    .message = Naše sponsory našu misiju pódpěraju, aby lěpšy web twórili.
home-prefs-manage-topics-link2 =
    .label = Temy zastojaś
home-prefs-choose-wallpaper-link2 =
    .label = Wubjeŕśo slězynowy wobraz
home-prefs-firefox-logo-header =
    .label = Logo { -brand-short-name }
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Aby toś te funkcije wužywał, stajśo nowe rejtariki abo nowe wokna do { -firefox-home-brand-name }.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } smužka
            [two] { $num } smužce
            [few] { $num }smužki
           *[other] { $num } smužkow
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Rozšyrjenje ({ $extension })
home-restore-defaults-srd =
    .label = Standard wótnowiś
    .accesskey = S
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (standard)
home-mode-choice-custom-srd =
    .label = Swójske URL…
home-mode-choice-blank-srd =
    .label = Prozny bok
home-prefs-shortcuts-header-srd =
    .label = Zwězanja
home-prefs-shortcuts-select =
    .aria-label = Zwězanja
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Sponserowane zwězanja
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Sponserowane tšojenja pokazaś
home-prefs-highlights-option-visited-pages-srd =
    .label = Woglědane boki
home-prefs-highlights-options-bookmarks-srd =
    .label = Cytańske znamjenja
home-prefs-highlights-option-most-recent-download-srd =
    .label = Nejnowše ześěgnjenje
home-prefs-recent-activity-header-srd =
    .label = Nejnowša aktiwita
home-prefs-recent-activity-select =
    .aria-label = Nejnowša aktiwita
home-prefs-weather-header-srd =
    .label = Wjedro
home-prefs-support-firefox-header-srd =
    .label = { -brand-product-name } pódpěraś
home-prefs-mission-message-learn-more-link-srd = Zgóńśo kak

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Pytaś
    .aria-label = Pytaś
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Pytajśo z { $engine } abo zapódajśo adresu
newtab-search-box-handoff-text-no-engine = Pytaś abo adresu zapódaś
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Pytajśo z { $engine } abo zapódajśo adresu
    .title = Pytajśo z { $engine } abo zapódajśo adresu
    .aria-label = Pytajśo z { $engine } abo zapódajśo adresu
newtab-search-box-handoff-input-no-engine =
    .placeholder = Pytaś abo adresu zapódaś
    .title = Pytaś abo adresu zapódaś
    .aria-label = Pytaś abo adresu zapódaś
newtab-search-box-text = Web pśepytaś
newtab-search-box-input =
    .placeholder = Web pśepytaś
    .aria-label = Web pśepytaś

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Pytnicu pśidaś
newtab-topsites-add-shortcut-header = Nowe zwězanje
newtab-topsites-edit-topsites-header = Nejcesćej woglědane sedło wobźěłaś
newtab-topsites-edit-shortcut-header = Zwězanje wobźěłaś
newtab-topsites-add-shortcut-label = Zwězanje pśidaś
newtab-topsites-add-shortcut-title =
    .title = Zwězanje pśidaś
    .aria-label = Zwězanje pśidaś
newtab-topsites-title-label = Titel
newtab-topsites-title-input =
    .placeholder = Titel zapódaś
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = URL zapódaś abo zasajźiś
newtab-topsites-url-validation = Płaśiwy URL trjebny
newtab-topsites-image-url-label = URL swójskego wobraza
newtab-topsites-use-image-link = Swójski wobraz wužywaś…
newtab-topsites-image-validation = Wobraz njedajo se zacytaś. Wopytajśo drugi URL.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Tekst lašowaś

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Pśetergnuś
newtab-topsites-delete-history-button = Z historije lašowaś
newtab-topsites-save-button = Składowaś
newtab-topsites-preview-button = Pśeglěd
newtab-topsites-add-button = Pśidaś

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Cośo napšawdu kuždu instancu toś togo boka ze swójeje historije lašowaś?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Toś ta akcija njedajo se anulěrowaś.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Sponserowany

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (pśipěte)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Meni wócyniś
    .aria-label = Meni wócyniś
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Wótwónoźeś
    .aria-label = Wótwónoźeś
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Meni wócyniś
    .aria-label = Kontekstowy meni za { $title } wócyniś
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Toś to sedło wobźěłaś
    .aria-label = Toś to sedło wobźěłaś

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Wobźěłaś
newtab-menu-open-new-window = W nowem woknje wócyniś
newtab-menu-open-new-private-window = W nowem priwatnem woknje wócyniś
newtab-menu-dismiss = Zachyśiś
newtab-menu-pin = Pśipěś
newtab-menu-unpin = Wótpěś
newtab-menu-delete-history = Z historije lašowaś
newtab-menu-save-to-pocket = Pla { -pocket-brand-name } składowaś
newtab-menu-delete-pocket = Z { -pocket-brand-name } wulašowaś
newtab-menu-archive-pocket = W { -pocket-brand-name } archiwěrowaś
newtab-menu-show-privacy-info = Naše sponsory a waša priwatnosć
newtab-menu-about-fakespot = Wó { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = K wěsći daś
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Blokěrowaś
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Wěcej njeslědowaś
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Dalšne informacije
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Temje wěcej njeslědowaś

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Sponsorowane wopśimjeśe zastojaś
newtab-menu-our-sponsors-and-your-privacy = Naše sponsory a waša priwatnosć
newtab-menu-report-this-ad = Toś to wabjenje k wěsći daś

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Dokóńcone
newtab-privacy-modal-button-manage = Nastajenja sponserowanego wopśimjeśa zastojaś
newtab-privacy-modal-header = Waša priwatnosć jo wažna
newtab-privacy-modal-paragraph-2 =
    Pśidatnje k našwicanjeju pśejmajucych tšojenjow, pokazujomy wam teke relewantny, 
    wjelgin pśeglědane wopśimjeśe wót wubranych sponsorow. Buźćo wěsty, <strong>waše pśeglědowańske 
    daty wašu wósobinsku wersiju { -brand-product-name } nigda njespušća</strong> ­­- njewiźimy je, a naše 
    sponsory teke nic.
newtab-privacy-modal-link = Zgóńśo, kak priwatnosć w nowem rejtariku funkcioněrujo

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Cytańske znamje wótpóraś
# Bookmark is a verb here.
newtab-menu-bookmark = Ako cytańske znamje składowaś

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Ześěgnjeński wótkaz kopěrowaś
newtab-menu-go-to-download-page = K ześěgnjeńskemu bokoju pśejś
newtab-menu-remove-download = Z historije wótwónoźeś

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] W Finder pokazaś
       *[other] Wopśimujucy zarědnik wócyniś
    }
newtab-menu-open-file = Dataju wócyniś

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Woglědany
newtab-label-bookmarked = Ako cytańske znamje skłaźony
newtab-label-removed-bookmark = Cytańske znamje jo wótwónoźone
newtab-label-recommended = Popularny
newtab-label-saved = Do { -pocket-brand-name } skłaźony
newtab-label-download = Ześěgnjony
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } - sponserowane
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Sponserowany wót { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min.
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Sponserowany

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Wótrězk wótwónoźeś
newtab-section-menu-collapse-section = Wótrězk schowaś
newtab-section-menu-expand-section = Wótrězk pokazaś
newtab-section-menu-manage-section = Wótrězk zastojaś
newtab-section-menu-manage-webext = Rozšyrjenje zastojaś
newtab-section-menu-add-topsite = Woblubowane sedło pśidaś
newtab-section-menu-add-search-engine = Pytnicu pśidaś
newtab-section-menu-move-up = Górjej
newtab-section-menu-move-down = Dołoj
newtab-section-menu-privacy-notice = Powěźeńka priwatnosći

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Wótrězk schowaś
newtab-section-expand-section-label =
    .aria-label = Wótrězk pokazaś

## Section Headers.

newtab-section-header-topsites = Nejcesćej woglědane sedła
newtab-section-header-recent-activity = Nejnowša aktiwita
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Wót { $provider } dopórucony
newtab-section-header-stories = Tšojeńka, kótarež k rozmyslowanju pógnuwaju
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Źinsajšne pśirucenja za was

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Zachopśo pśeglědowaś, a pokažomy někotare wjelicne nastawki, wideo a druge boki, kótarež sćo se njedawno woglědał abo how ako cytańske znamjenja składował.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = To jo nachylu wšykno. Wrośćo se pózdźej wjelicnych tšojeńkow dla wót { $provider }. Njamóžośo cakaś? Wubjeŕśo woblubowanu temu, aby dalšne wjelicne tšojeńka we webje namakał.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = To jo nachylu wšykno. Wrośćo se pózdźej tšojeńkow dla. Njamóžośo cakaś? Wubjeŕśo woblubowanu temu, aby dalšne wjelicne tšojeńka we webje namakał.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Sćo dogónjony!
newtab-discovery-empty-section-topstories-content = Glědajśo póozdźej za wěcej tšojenjami.
newtab-discovery-empty-section-topstories-try-again-button = Hyšći raz wopytaś
newtab-discovery-empty-section-topstories-loading = Zacytujo se…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Hopla! Smy womało zacytali toś ten wótrězk, ale nic cele.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Woblubowane temy:
newtab-pocket-new-topics-title = Cośo dalšne tšojeńka? Woglědajśo se toś te woblubowane temy z { -pocket-brand-name }
newtab-pocket-more-recommendations = Dalšne pórucenja
newtab-pocket-learn-more = Dalšne informacije
newtab-pocket-cta-button = { -pocket-brand-name } wobstaraś
newtab-pocket-cta-text = Składujśo tšojeńka, kótarež se wam spódobuju, w { -pocket-brand-name } a žywśo swój duch z fasciněrujucymi cytańkami.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } jo źěl swójźby { -brand-product-name }
newtab-pocket-save = Składowaś
newtab-pocket-saved = Skłaźony

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Wěcej ako ta
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Nic za mnjo
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Źěkujomy se. Wašo měnjenje buźo nam pomagaś, waš kanal pólěpšyś.
newtab-toast-dismiss-button =
    .title = Zachyśiś
    .aria-label = Zachyśiś

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Wuslěźćo nejlěpše interneta
newtab-pocket-onboarding-cta = { -pocket-brand-name } šyroku paletu publikacijow pśeslěźujo, aby nejwěcej informatiwne, inspirěrujuace a dowěry gódne wopśimjeśe direktnje do wašogo wobglědowaka { -brand-product-name } donjasł.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Hopla, pśi cytanju toś togo wopśimjeśa njejo se něco raźiło.
newtab-error-fallback-refresh-link = Aktualizěrujśo bok, aby hyšći raz wopytał.

## Customization Menu

newtab-custom-shortcuts-title = Zwězanja
newtab-custom-shortcuts-subtitle = Sedła, kótarež składujośo abo ku kótarymž se woglědujośo
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Zwězanja
    .description = Sedła, kótarež składujośo abo ku kótarymž se woglědujośo
newtab-custom-shortcuts-nova =
    .label = Zwězanja
newtab-custom-row-description =
    .description = Licba smužkow
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } smužka
            [two] { $num } smužce
            [few] { $num } smužki
           *[other] { $num } smužkow
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } smužka
        [two] { $num } smužce
        [few] { $num } smužki
       *[other] { $num } smužkow
    }
newtab-custom-sponsored-sites = Sponserowane zwězanja
newtab-custom-pocket-title = Wót { -pocket-brand-name } dopórucone
newtab-custom-pocket-subtitle = Wósebne wopśimjeśe, wubrane pśez { -pocket-brand-name }, źěla swójźby { -brand-product-name }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Dopórucone tšojeńka
    .description = Wuwześowe wopśimjeśe, kótarež se pśez swójźbu { -brand-product-name } wótwardujo
newtab-recommended-stories-toggle =
    .label = Dopórucone tšojeńka
newtab-custom-stories-personalized-toggle =
    .label = Tšojenja
newtab-custom-stories-personalized-checkbox-label = Personalizěrowane tšojenja na zakłaźe wašeje aktiwity
newtab-custom-pocket-sponsored = Sponserowane tšojeńka
newtab-custom-pocket-show-recent-saves = Nejnowše składowanja pokazaś
newtab-custom-recent-title = Nejnowša aktiwita
newtab-custom-recent-subtitle = Wuběrk nejnowšych sedłow a nejnowšego wopśimjeśa
newtab-custom-weather-toggle =
    .label = Wjedro
    .description = Źinsajšna wjedrowa pśedpowěsć
newtab-custom-widget-weather-toggle =
    .label = Wjedro
newtab-custom-widget-lists-toggle =
    .label = Lisćiny
newtab-custom-widget-timer-toggle =
    .label = Měritko casa
newtab-custom-widget-sports-toggle =
    .label = Swětowe mejstaŕstwo
newtab-custom-widget-clock-toggle =
    .label = Zeger
newtab-custom-widget-sports-toggle2 =
    .label = Sport
newtab-custom-widget-section-title = Asistenty
newtab-custom-widget-section-toggle =
    .label = Asistenty
newtab-widget-manage-title = Asistenty
newtab-widget-manage-widget-button =
    .label = Asistenty zastojaś
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Zacyniś
    .aria-label = Meni zacyniś
newtab-custom-close-button = Zacyniś
newtab-custom-settings = Dalšne nastajenja zastojaś

## New Tab Wallpapers

newtab-wallpaper-title = Slězynowe wobraze
newtab-wallpaper-reset = Na standard slědk stajiś
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Wobraz nagraś
newtab-wallpaper-add-an-image = Wobraz pśidaś
newtab-wallpaper-custom-color = Barwu wubraś
newtab-wallpaper-toggle-title =
    .label = Slězynowe wobraze
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Wobraz jo pśekšocył limit datajoweje wjelikosći { $file_size }. Nagrajśo pšosym mjeńšu dataju.
newtab-wallpaper-error-upload-file-type = Njejsmy mógli wašu dataju nagraś. Wopytajśo pšosym z wobrazoweju dataju hyšći raz.
newtab-wallpaper-error-file-type = Njejsmy mógli wašu dataju nagraś. Wopytajśo pšosym z drugim datajowym typom hyšći raz.
newtab-wallpaper-light-red-panda = Cerwjeny panda
newtab-wallpaper-light-mountain = Běła góra
newtab-wallpaper-light-sky = Njebjo z wioletnymi a rožowymi mrokawami
newtab-wallpaper-light-color = Módre, rožowe a žołte formy
newtab-wallpaper-light-landscape = Módra kurjawkata górinowa krajina
newtab-wallpaper-light-beach = Pśibrjog z palmu
newtab-wallpaper-dark-aurora = Aurora Borealis
newtab-wallpaper-dark-color = Cerwjene a módre formy
newtab-wallpaper-dark-panda = Cerwjeny panda w lěsu schowany
newtab-wallpaper-dark-sky = Měsćańska krajina z nocnym njebjom
newtab-wallpaper-dark-mountain = Górinowa krajina
newtab-wallpaper-dark-city = Wioletna měsćańska krajina
newtab-wallpaper-dark-fox-anniversary = Liška na flastarju blisko lěsa
newtab-wallpaper-light-fox-anniversary = Liška w tšawowem pólu z kurjawkateju górinoweju krajinu

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Jadnotne barwy
newtab-wallpaper-colors = Barwy
newtab-wallpaper-blue = Módry
newtab-wallpaper-light-blue = Swětłomódry
newtab-wallpaper-light-purple = Swětłowioletny
newtab-wallpaper-light-green = Swětłozeleny
newtab-wallpaper-green = Zeleny
newtab-wallpaper-beige = Beige
newtab-wallpaper-yellow = Žołty
newtab-wallpaper-orange = Oranžowy
newtab-wallpaper-pink = Pink
newtab-wallpaper-light-pink = Swětłopink
newtab-wallpaper-red = Cerwjeny
newtab-wallpaper-dark-blue = Śamnomódry
newtab-wallpaper-dark-purple = Śamnowioletny
newtab-wallpaper-dark-green = Śamnozeleny
newtab-wallpaper-brown = Bruny

## Abstract

newtab-wallpaper-category-title-abstract = Abstraktne
newtab-wallpaper-abstract-green = Zelene formy
newtab-wallpaper-abstract-blue = Módre formy
newtab-wallpaper-abstract-purple = Wioletne formy
newtab-wallpaper-abstract-orange = Oranžowe formy
newtab-wallpaper-gradient-orange = Woběžk oranžowy a pink
newtab-wallpaper-abstract-blue-purple = Módre a wioletne formy
newtab-wallpaper-abstract-white-curves = Běły z wósenjonymi wukulowaśenjami
newtab-wallpaper-abstract-purple-green = Wioletny a zeleny swětłowy pśeběg
newtab-wallpaper-abstract-blue-purple-waves = Módre a wioletne žwałkate formy
newtab-wallpaper-abstract-black-waves = Carne žwałkate formy

## Firefox

newtab-wallpaper-category-title-photographs = Fota
newtab-wallpaper-beach-at-sunrise = Pśibrjog pśi zejźenju słyńca
newtab-wallpaper-beach-at-sunset = Pśibrjog pśi schowanju słyńca
newtab-wallpaper-storm-sky = Wichorowe njebjo
newtab-wallpaper-sky-with-pink-clouds = Njebjo z rožowymi mrokami
newtab-wallpaper-red-panda-yawns-in-a-tree = Cerwjeny panda w bomje zewa
newtab-wallpaper-white-mountains = Běłe góry
newtab-wallpaper-hot-air-balloons = Rozdźělna barwa górucopówětšowych balonow wódnjo
newtab-wallpaper-starry-canyon = Módra gwězdna noc
newtab-wallpaper-suspension-bridge = Šera fotografija wisatego mosta wódnjo
newtab-wallpaper-sand-dunes = Běłe změty pěska
newtab-wallpaper-palm-trees = Silueta bomow kokosowych palmow w złotej góźinje
newtab-wallpaper-blue-flowers = Fotografija kwětkow z módrymi łopjenkami w kwiśenju z bliskosći
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Foto wót <a data-l10n-name="name-link">{ $author_string }</a> na <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Wopytajśo chrapku barwy
newtab-wallpaper-feature-highlight-content = Dajśo swójomu rejtarikoju fryšne wuglědanje ze slězynowymi wobrazami.
newtab-wallpaper-feature-highlight-button = Som zrozměł
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Zachyśiś
    .aria-label = Wóskokujuce wokno zacyniś
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Njebjaske
newtab-wallpaper-celestial-lunar-eclipse = Zajśmiśe mjaseca
newtab-wallpaper-celestial-earth-night = Nocne foto z dolnego orbita zemje
newtab-wallpaper-celestial-starry-sky = Gwězdne njebjo
newtab-wallpaper-celestial-eclipse-time-lapse = Casowy wótběg zajśmiśa mjaseca
newtab-wallpaper-celestial-black-hole = Zwobraznjenje galaksije z carneju źěru
newtab-wallpaper-celestial-river = Satelitowy wobraz rěki

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Wjedrowu pśedpowěsć w { $provider } pokazaś
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ sponserowany
newtab-weather-menu-change-location = Městno změniś
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Městno pytaś
    .aria-label = Městno pytaś
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Aktualne stojnišćo wužywaś
newtab-weather-menu-weather-display = Wjedrowe pokazanje
newtab-weather-todays-forecast = Źinsajšna pśedpowěsć
newtab-weather-see-full-forecast = Dopołnu pśedpowěsć se woglědaś
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Jadnory
newtab-weather-menu-change-weather-display-simple = Jadnory naglěd wužywaś
newtab-weather-menu-weather-display-option-detailed = Detailěrowany
newtab-weather-menu-change-weather-display-detailed = Detailěrowany naglěd wužywaś
newtab-weather-menu-temperature-units = Temperaturowe jadnotki
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Fahrenheit wužywaś
newtab-weather-menu-change-temperature-units-celsius = Celsius wužywaś
newtab-weather-menu-hide-weather = Wjedro na nowem rejtariku schowaś
newtab-weather-menu-learn-more = Dalšne informacije
newtab-weather-menu-detect-my-location = Mójo stojnišćo namakaś
# This message is shown if user is working offline
newtab-weather-error-not-available = Wjedrowe daty njejsu tuchylu k dispoziciji
newtab-weather-opt-in-see-weather = Cośo wjedro za swóje stojnišćo wiźeś?
newtab-weather-opt-in-not-now =
    .label = Nic něnto
newtab-weather-opt-in-yes =
    .label = Jo
newtab-weather-opt-in-headline = Dostańśo swóju lokalnu wjedrowu pśedpowěsć
newtab-weather-opt-in-use-location =
    .label = Stojnišćo wužywaś
newtab-weather-opt-in-choose-location = Stojnišćo wubraś
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York City
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Wusoka
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Niska
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Wjedrowu pśedpowěsć w { $provider } pokazaś
    .aria-description = { $provider } ∙ sponserowany

## Topic Labels

newtab-topic-label-business = Pśekupniske
newtab-topic-label-career = Kariera
newtab-topic-label-education = Kubłanje
newtab-topic-label-arts = Rozdrosćenje
newtab-topic-label-food = Caroba
newtab-topic-label-health = Strowje
newtab-topic-label-hobbies = Graśe
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Pjenjeze
newtab-topic-label-society-parenting = Wótkubłanje
newtab-topic-label-government = Politika
newtab-topic-label-education-science = Wědomnosć
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Swójske pólěpšenja
newtab-topic-label-sports = Sport
newtab-topic-label-tech = Technologija
newtab-topic-label-travel = Drogowanje
newtab-topic-label-home = Dom a zagroda

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Wubjeŕśo temy, aby swój kanal optiměrował
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Wubjeŕśo dwě temje abo wěcej z nich. Naše nazgónjone kuratory prioritu na tšojeńka kładu, kótarež su na waše zajmy wusměrjone. Pśiměŕśo to kuždy cas.
newtab-topic-selection-save-button = Składowaś
newtab-topic-selection-cancel-button = Pśetergnuś
newtab-topic-selection-button-maybe-later = Snaź pózdźej
newtab-topic-selection-privacy-link = Zgóńśo, kak daty šćitamy a zastojmy
newtab-topic-selection-button-update-interests = Zaktualizěrujśo swóje zajmy
newtab-topic-selection-button-pick-interests = Wubjeŕśo swóje zajmy

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Slědowaś
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = { $topic } slědowaś
newtab-section-following-button = Slědujucy
newtab-section-unfollow-button = Wěcej njeslědowaś
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Slědowanje: { $topic } wěcej njeslědowaś
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Zgłosujśo swój kanal nadrobno
newtab-section-follow-highlight-subtitle = Slědujśo swójim zajmam, aby wěcej wó tom wiźeł, což se wam spódoba.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Blokěrowaś
newtab-section-blocked-button = Blokěrowany
newtab-section-unblock-button = Wěcej njeblokěrowaś
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = { $topic } slědowaś
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = { $topic } wěcej njeslědowaś
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = { $topic } blokěrowaś
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = { $topic } wěcej njeblokěrowaś

## Confirmation modal for blocking a section

newtab-section-cancel-button = Nic něnto
newtab-section-confirm-block-topic-p1 = Cośo napšawdu toś tu temu blokěrowaś?
newtab-section-confirm-block-topic-p2 = Blokěrowane temy se wěcej we wašom kanalu njezjawiju.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = { $topic } blokěrowaś
newtab-section-block-cancel-button = Pśetergnuś

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Temy
newtab-section-manage-topics-button-v2 =
    .label = Temy zastojaś
newtab-section-mangage-topics-followed-topics = Slědowany
newtab-section-mangage-topics-followed-topics-empty-state = Hyšći žednym temam njeslědujośo.
newtab-section-mangage-topics-blocked-topics = Blokěrowany
newtab-section-mangage-topics-blocked-topics-empty-state = Hyšći njejsćo blokěrował temy.
newtab-custom-wallpaper-title = How su swójske slězynowe wobraze
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Nagrajśo swójski slězynowy wobraz abo wubjeŕśo swójsku barwu, aby se { -brand-product-name } pśiswójł.
newtab-custom-wallpaper-cta = Wopytajśo jen

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Wubjeŕśo slězynowy wobraz, aby se { -brand-product-name } pśiswójł
newtab-new-user-custom-wallpaper-subtitle = Cujśo se na kuždem nowem rejtariku ako doma ze swójskimi slězynowymi wobrazami a barwami.
newtab-new-user-custom-wallpaper-cta = Wopytajśo něnto

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Nowe slězynowe wobraze su rowno dojšli
newtab-wallpaper-feature-highlight-subtitle = Wubjeŕśo swój faworit a dajśo kuždemu nowemu rejtarikoju zacuśe, se ako doma cuś.
newtab-wallpaper-feature-highlight-cta = Slězynowy wobraz wubraś

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = { -brand-product-name } za mobilny rěd ześěgnuś
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Scannujśo kod, aby pó droze wěsćej pśeglědował.
newtab-download-mobile-highlight-body-variant-b = Pókšacujśo, źož sćo pśestał, gaž swóje rejtariki, gronidła a wěcej synchronizěrujośo.
newtab-download-mobile-highlight-body-variant-c = Sćo wěźeł, až móžośo { -brand-product-name } pó droze sobu wześ? Samski wobglědowak. We wašej tašy.
newtab-download-mobile-highlight-image =
    .aria-label = QR-kod za ześěgnjenje { -brand-product-name } za mobilne rědy

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Waše fawority k ruce
newtab-shortcuts-highlight-subtitle = Pśidajśo zwězanje, aby swóje nejlubše sedła jadno kliknjenje pšec źaržał.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Cogodla dawaśo to k wěsći?
newtab-report-ads-reason-not-interested =
    .label = Njejsom zajmowany
newtab-report-ads-reason-inappropriate =
    .label = Jo njepśigódne
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Som to pśecesto wiźeł
newtab-report-content-wrong-category =
    .label = Wopacna kategorija
newtab-report-content-outdated =
    .label = Zestarjety
newtab-report-content-inappropriate-offensive =
    .label = Njepśistojny abo kśiwźecy
newtab-report-content-spam-misleading =
    .label = Spam abo torjecy
newtab-report-content-requires-payment-subscription =
    .label = Pomina se płaśenje abo abonement
newtab-report-content-requires-payment-subscription-learn-more = Dalšne informacije
newtab-report-cancel = Pśetergnuś
newtab-report-submit = Wótpósłaś
newtab-toast-thanks-for-reporting =
    .message = Wjeliki źěk, až sćo dał to k wěsći.
newtab-toast-widgets-hidden =
    .message = Wubjeŕśo symbol pisaka, aby kuždy cas zasej asistenty pśidał.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Slědujośo něnto { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Njeslědujośo wěcej { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Njewiźiśo wěcej tšojeńki wó { $topic }.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Móžnosći su njelicne. Pśidajśo jaden nadawk.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Nowy
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Dokóńcony ({ $number })
newtab-widget-lists-celebration-headline = Dobre źěło
newtab-widget-lists-celebration-subhead = Wšykno wótbyte
newtab-widget-task-list-menu-copy = Kopěrowaś
newtab-widget-lists-menu-edit = Mě lisćiny wobźěłaś
newtab-widget-lists-menu-edit2 =
    .aria-label = Mě lisćiny wobźěłaś
newtab-widget-lists-menu-create = Nowu lisćinu napóraś
newtab-widget-lists-menu-delete = Toś tu lisćinu lašowaś
newtab-widget-lists-menu-copy = Lisćinu do mjazywótkłada kopěrowaś
newtab-widget-lists-menu-learn-more = Dalšne informacije
newtab-widget-lists-button-add-item = Zapisk pśidaś
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Zapisk pśidaś
    .aria-label = Zapisk pśidaś
newtab-widget-lists-input-error = Pšosym zapśimujśo tekst, aby zapisk pśidał.
newtab-widget-lists-input-menu-open-link = Wótkaz wócyniś
newtab-widget-lists-input-menu-move-up = Górjej
newtab-widget-lists-input-menu-move-down = Dołoj
newtab-widget-lists-input-menu-delete = Lašowaś
newtab-widget-lists-input-menu-edit = Wobźěłaś
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Zapisk wobźěłaś
newtab-widget-lists-edit-clear =
    .aria-label = Pśetergnuś
    .title = Pśetergnuś
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Nowu lisćinu napóraś
newtab-widget-lists-name-label-default =
    .label = Lisćiny nadawkow
newtab-widget-lists-name-label-checklist =
    .label = Kontrolna lisćina
newtab-widget-lists-name-placeholder-default =
    .placeholder = Lisćiny nadawkow
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Kontrolna lisćina
    .aria-label = Mě lisćiny wobźěłaś
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Nowa lisćina
    .aria-label = Mě lisćiny wobźěłaś
newtab-widget-section-title = Asistenty
newtab-widget-menu-hide = Asistent schowaś
newtab-widget-menu-change-size = Wjelikosć změniś
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Pśesunuś
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Nalěwo
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Napšawo
newtab-widget-size-small = Mały
newtab-widget-size-medium = Srjejźny
newtab-widget-size-large = Wjeliki
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Asistenty schowaś
    .aria-label = Wšykne asistenty schowaś
newtab-widget-section-maximize =
    .title = Asistenty pokazać
    .aria-label = Wšykne asistenty w połnej wjelikosći pokazaś
newtab-widget-section-minimize =
    .title = Asistenty miniměrowaś
    .aria-label = Wšykne asistenty do kompaktneje wjelikosći złožyś
newtab-widget-section-menu-button =
    .title = Meni asistentow
    .aria-label = Meni asistentow wócyniś
newtab-widget-add-widgets-button =
    .aria-label = Asistent pśidaś
    .title = Asistent pśidaś
newtab-widget-section-menu-manage = Asistenty zastojaś
newtab-widget-section-menu-hide-all = Asistenty schowaś
newtab-widget-section-menu-learn-more = Dalšne informacije
newtab-widget-section-feedback = Grońśo nam swójo měnjenje
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Wěcej asistentow pokazaś
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Mjenjej asistentow pokazaś
newtab-widget-lists-name-default = Kontrolna lisćina

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Měritko casa
newtab-widget-timer-notification-focus = Fokusowy cas jo mimo. Wjelicne źěło. Trjebaśo pśestank?
newtab-widget-timer-notification-break = Waš pśestank jo mimo. Gótowy za fokus?
newtab-widget-timer-notification-warning = Zdźělenja su znjemóžnjone
newtab-widget-timer-mode-focus =
    .label = Fokus
newtab-widget-timer-mode-break =
    .label = Pawza
newtab-widget-timer-label-play =
    .label = Wótgraś
newtab-widget-timer-label-pause =
    .label = Pawza
newtab-widget-timer-reset =
    .title = Slědk stajiś
newtab-widget-timer-menu-notifications = Zdźělenja znjemóžniś
newtab-widget-timer-menu-notifications-on = Zdźělenja zmóžniś
newtab-widget-timer-menu-learn-more = Dalšne informacije
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Wažne głowne nadpisma
newtab-daily-briefing-card-menu-dismiss = Zachyśiś
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Pśed { $minutes } m zaktualizěrowany
newtab-widget-message-title = Wóstańśo koncentrěrowany z lisćinami a zatwarjonym casowym měritkom
# to-dos stands for "things to do".
newtab-widget-message-copy = Wót malsnych dopomnjeśow do wšednych nadawkowych lisćinow, koncentrěrujśo se na posejźenja, aby pśestawki pódlejšył – njepópušćajśo a buźćo zdypkom.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Fokus, wjedrowe pśedpowěsći a wěcej na jadnem městnje
newtab-widget-message-focus-forecasts-body = Źaržćo swój źeń z asistentami { -brand-product-name } w běgu. Cytajśo wjedrowu pśedpowěsć, koncentrěrujśo se na swóje nadawki abo slědujśo casoju wokoło globusa.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Pśiměŕśo { -brand-product-name } pó swójom dobrozdaśu
newtab-promo-card-body-addons = Wubjeŕśo slězynowy wobraz z našeje zběrki abo napórajśo swójski.
newtab-promo-card-cta-addons = Wopytajśo něnto
newtab-promo-card-title = { -brand-product-name } pódpěraś
newtab-promo-card-body = Naše sponsory našu misiju pódpěraju, aby lěpšy web twórili
newtab-promo-card-cta = Dalšne informacije
newtab-promo-card-dismiss-button =
    .title = Zachyśiś
    .aria-label = Zachyśiś

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] { $minutes }-minutowy casowe měritko startowaś
            [two] { $minutes }-minutowy casowe měritko startowaś
            [few] { $minutes }-minutowy casowe měritko startowaś
           *[other] { $minutes }-minutowy casowe měritko startowaś
        }
newtab-widget-timer-pause-aria =
    .aria-label = Casowe měritko zastajiś
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } minuta
            [two] { $minutes } minuśe
            [few] { $minutes } minuty
           *[other] { $minutes } minutow
        }
newtab-widget-timer-decrease-min =
    .title = Wó 1 minutu pómjeńšyś
newtab-widget-timer-increase-min =
    .title = Wó 1 minutu pówušyś
newtab-widget-timer-mode-group =
    .aria-label = Modus casowego měritka
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Fokus
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Pawza
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Měritko casa schowaś
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Dobre źěło
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Waša pawza jo mimo
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Trjebaśo pawzu?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Sćo gótowy se koncentrěrowaś?

##

newtab-sports-widget-menu-follow-teams = Mustwam slědowaś
newtab-sports-widget-menu-view-schedule = Grajny plan pokazaś
newtab-sports-widget-menu-view-upcoming = Pśichodny pokazaś
newtab-sports-widget-menu-view-results = Wuslědki pokazaś
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Klucowe datumy
newtab-sports-widget-menu-learn-more = Dalšne informacije
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Wobchowajśo swětowe mejstaŕstwo we wócyma
newtab-sports-widget-get-updates = Dostańśo aktualizacije live a wěcej.
newtab-sports-widget-view-schedule =
    .label = Grajny plan pokazaś
newtab-sports-widget-follow-teams =
    .label = Mustwam slědowaś
newtab-sports-widget-view-matches =
    .label = Graśa pokazaś
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] { $number } mustwoju slědowaś
        [two] { $number } mustwoma slědowaś
        [few] { $number } mustwam slědowaś
       *[other] { $number } mustwam slědowaś
    }
newtab-sports-widget-choose-wallpaper =
    .label = Wubjeŕśo slězynowy wobraz
newtab-sports-widget-skip = Pśeskócyś
newtab-sports-widget-search-country =
    .placeholder = Kraj pytaś
    .aria-label = Kraj pytaś
newtab-sports-widget-cancel = Pśetergnuś
newtab-sports-widget-back-button =
    .aria-label = Slědk
newtab-sports-widget-done-button =
    .label = Dokóńcony
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (wupadnjony)
newtab-sports-widget-view-all =
    .label = Wšykne pokazaś
newtab-sports-widget-show-less =
    .label = Mjenjej pokazaś
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Jano mustwa, kótarymž slědujośo
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Glědaś
    .title = Glědaś
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Live glědaś
    .title = Live glědaś
newtab-sports-widget-watch-dialog-close =
    .aria-label = Zacyniś
    .title = Zacyniś
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Dermo
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Dermotna testowa wersija
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Dermotny a z płaśenim
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Z płaśenim
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Jano wubrane graśa
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = We wašom regionje k dispoziciji
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Druge regiony
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Stream wócyniś
    .title = Stream wócyniś
newtab-sports-widget-group-stage = Kupkowa faza
newtab-sports-widget-group-a = Kupka A
newtab-sports-widget-group-b = Kupka B
newtab-sports-widget-group-c = Kupka C
newtab-sports-widget-group-d = Kupka D
newtab-sports-widget-group-e = Kupka E
newtab-sports-widget-group-f = Kupka F
newtab-sports-widget-group-g = Kupka G
newtab-sports-widget-group-h = Kupka H
newtab-sports-widget-group-i = Kupka I
newtab-sports-widget-group-j = Kupka J
newtab-sports-widget-group-k = Kupka K
newtab-sports-widget-group-l = Kupka L
newtab-sports-widget-round-32 = Koło z 32
newtab-sports-widget-round-16 = Koło z 16
newtab-sports-widget-quarter-finals = Běrtylfinale
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = LIVE
newtab-custom-widget-live-refresh =
    .title = Wuslědki aktualizěrowaś
    .aria-label = Wuslědki aktualizěrowaś
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Klucowe datumy
newtab-sports-widget-upcoming = Pśichodne
# Used for a match currently ongoing
newtab-sports-widget-now = Něnto
newtab-sports-widget-results = Wuslědki
newtab-sports-widget-semi-finals = Połfinale
newtab-sports-widget-bronze-finals = Graśe wó městno 3
# Final is the final match for 1st place.
newtab-sports-widget-final = Finale
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Wokomuźony
newtab-sports-widget-postponed = Wótstarcony
newtab-sports-widget-suspended = Wótgronjony
newtab-sports-widget-cancelled = Anulěrowany
newtab-sports-widget-information = Informacije wó graśu
newtab-sports-widget-no-live-data = Daty graśa live se ned njeaktualizěruju
newtab-sports-widget-view-results-link = Wuslědki pokazaś
newtab-sports-widget-third-place = Tśeśe městno
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Druge městno
newtab-sports-widget-champions = Mejstarje
newtab-sports-widget-world-cup-champions = Swětowe mejstarje 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Wšen cas
newtab-sports-widget-match-halftime = Połcas
newtab-sports-widget-match-extra-time = Pódlejšenje
newtab-sports-widget-match-penalties = Pokutne kopy
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = pśeśiwo
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Wóstajśo na běžnem za pśichodne grajne drobnostki

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Pjerwjejšny
    .title = Pjerwjejšny
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Pśiducy
    .title = Pśiducy
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Graśe live { $index } z { $total }
    .title = Graśe live { $index } z { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } pśeśiwo { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) pśeśiwo { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Live: { $homeTeam }, { $homeScore } pśeśiwo { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } pśeśiwo { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } pśeśiwo { $awayTeam }, wokomuźony
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } pśeśiwo { $awayTeam }, wótsunjony
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } pśeśiwo { $awayTeam }, wótgronjony
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } pśeśiwo { $awayTeam }, pśetergnjony

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosniska a Hercegowina
newtab-sports-widget-team-name-label-civ =
    .label = Słonokósćowy pśibrjog
newtab-sports-widget-team-name-label-cod =
    .label = DR Kongo
newtab-sports-widget-team-name-label-eng =
    .label = Engelska
newtab-sports-widget-team-name-label-sco =
    .label = Šotiska
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Musy se póstajiś

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Zachopśo swětowe mejstaŕstwo z nowym slězynowymi wobrazami
newtab-sports-widget-message-wallpapers-body = Pśinjasćo atmosferu grajnego dnja do swójogo wobglědowaka za turněr.
newtab-sports-widget-message-wallpapers-cta = Slězynowy wobraz wubraś
newtab-sports-widget-message-add-widgets-cta =
    .label = Asistenty pśidaś
newtab-sports-widget-message-day-in-play-title = Grajśo z asistentami { -brand-product-name } ceły źeń
newtab-sports-widget-message-day-in-play-body = Slědujśo swětowemu mejstaŕstwoju, wóstańśo na nadawku, slědujśo casoju wokoło globusa a wěcej.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Asistenty wuslěźiś

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Zachyśiś
    .aria-label = Zachyśiś
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Pśiswójśo se toś ten rum
newtab-activation-window-message-customization-focus-message = Wubjeŕśo nowy slězynowy wobraz, pśidajśo swójim nejlubšym sedłam zwězanja a wóstańśo na běžnem wó tšojeńkach, kótarež was zajmuju.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Zachopśo pśiměrowaś
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Toś to městno pó wašych pšawidłach grajo
newtab-activation-window-message-values-focus-message = { -brand-product-name } wam zmóžnja, na wašnju pśeglědowaś, kótarež wam se spódoba, z wěcej wósobinskej móžnosću, źeń online zachopiś. Pśiswójśo se { -brand-product-name }.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Zeger schowaś
newtab-clock-widget-menu-learn-more = Dalšne informacije
newtab-clock-widget-menu-edit = Zegery wobźěłaś
newtab-clock-widget-menu-switch-to-12h = Do 12-góźińskego formata změniś
newtab-clock-widget-menu-switch-to-24h = Do 24-góźińskego formata změniś
newtab-clock-widget-label-your-clocks = Waše zegery
newtab-clock-widget-search-location-input =
    .label = Stojnišćo
    .placeholder = Město pytaś
    .aria-label = Město pytaś
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Pśimě (na žycenje)
    .placeholder = Pśimě pśidaś
    .aria-label = Pśimě (na žycenje)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Nowy zeger pśidaś
    .aria-label = Nowy zeger pśidaś
newtab-clock-widget-button-add-clock = Pśidaś
newtab-clock-widget-button-cancel = Pśetergnuś
newtab-clock-widget-button-back =
    .title = Slědk
    .aria-label = Slědk
newtab-clock-widget-button-edit-clock =
    .title = Zeger wobźěłaś
    .aria-label = Zeger wobźěłaś
newtab-clock-widget-button-save = Składowaś
newtab-clock-widget-button-remove-clock =
    .title = Zeger wótwónoźeś
    .aria-label = Zeger wótwónoźeś
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
    .aria-label = { $city }, pśimě: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Zeger pśidaś
newtab-clock-widget-edit-clock-form =
    .aria-label = Zeger wobźěłaś
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Pytańske wuslědki
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Žedne wótpowědniki
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Meni za zeger wócyniś
    .aria-label = Meni za zeger wócyniś
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Pśimě: { $nickname }
