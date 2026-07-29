# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Nov zavihek
newtab-settings-button =
    .title = Prilagodite stran novega zavihka
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Prilagodi to stran
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Prilagodi
newtab-customize-panel-label =
    .label = Prilagodi
newtab-personalize-settings-icon-label =
    .title = Prilagodite stran novega zavihka
    .aria-label = Nastavitve
newtab-settings-dialog-label =
    .aria-label = Nastavitve
newtab-personalize-icon-label =
    .title = Prilagodite nov zavihek
    .aria-label = Prilagodite nov zavihek
newtab-personalize-dialog-label =
    .aria-label = Prilagodi
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Zapri
    .aria-label = Zapri

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Domača stran
home-homepage-new-windows =
    .label = Nova okna
home-homepage-new-tabs =
    .label = Novi zavihki
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Izberite določeno stran

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Naslov spletnega mesta oz. spletnih mest
home-custom-homepage-address =
    .placeholder = Vnesite naslov
home-custom-homepage-address-button =
    .label = Dodaj naslov
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Dodano ni še nobeno spletno mesto.
home-custom-homepage-delete-address-button =
    .aria-label = Izbriši naslov
    .title = Izbriši naslov
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Zamenjaj s/z
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = trenutno odprtimi stranmi
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = zaznamki …

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name(zacetnica: "velika") }
home-prefs-search-header2 =
    .label = Iskanje
home-prefs-stories-header2 =
    .label = Zgodbe
    .description = Izjemna vsebina, ki jo pripravlja družina { -brand-product-name }
home-prefs-widgets-header =
    .label = Pripomočki
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Seznami
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Časovnik
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Šport
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Ura
home-prefs-mission-message2 =
    .message = Naši sponzorji podpirajo naše poslanstvo ustvarjanja boljšega spleta.
home-prefs-manage-topics-link2 =
    .label = Upravljanje tem
home-prefs-choose-wallpaper-link2 =
    .label = Izberite si ozadje
home-prefs-firefox-logo-header =
    .label = Logotip { -brand-short-name(sklon: "rodilnik") }
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } vrstica
            [two] { $num } vrstici
            [few] { $num } vrstice
           *[other] { $num } vrstic
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Razširitev ({ $extension })
home-restore-defaults-srd =
    .label = Obnovi privzeto
    .accesskey = O
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name(zacetnica: "velika") } (privzeta)
home-mode-choice-custom-srd =
    .label = Spletne strani po meri ...
home-mode-choice-blank-srd =
    .label = Prazna stran
home-prefs-shortcuts-header-srd =
    .label = Bližnjice
home-prefs-shortcuts-select =
    .aria-label = Bližnjice
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Bližnjice oglaševalcev
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Zgodbe oglaševalcev
home-prefs-highlights-option-visited-pages-srd =
    .label = Obiskane strani
home-prefs-highlights-options-bookmarks-srd =
    .label = Zaznamki
home-prefs-highlights-option-most-recent-download-srd =
    .label = Najnovejši prenos
home-prefs-recent-activity-header-srd =
    .label = Nedavna dejavnost
home-prefs-recent-activity-select =
    .aria-label = Nedavna dejavnost
home-prefs-weather-header-srd =
    .label = Vreme
home-prefs-support-firefox-header-srd =
    .label = Podprite { -brand-product-name(sklon: "tozilnik") }
home-prefs-mission-message-learn-more-link-srd = Spoznajte, kako

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Iskanje
    .aria-label = Iskanje
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Iščite z iskalnikom { $engine } ali vnesite naslov
newtab-search-box-handoff-text-no-engine = Iskanje ali naslov strani
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Iščite z iskalnikom { $engine } ali vnesite naslov
    .title = Iščite z iskalnikom { $engine } ali vnesite naslov
    .aria-label = Iščite z iskalnikom { $engine } ali vnesite naslov
newtab-search-box-handoff-input-no-engine =
    .placeholder = Iskanje ali naslov strani
    .title = Iskanje ali naslov strani
    .aria-label = Iskanje ali naslov strani
newtab-search-box-text = Išči po spletu
newtab-search-box-input =
    .placeholder = Iskanje po spletu
    .aria-label = Iskanje po spletu

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Dodaj iskalnik
newtab-topsites-add-shortcut-header = Nova bližnjica
newtab-topsites-edit-topsites-header = Uredi glavno stran
newtab-topsites-edit-shortcut-header = Uredi bližnjico
newtab-topsites-add-shortcut-label = Dodaj bližnjico
newtab-topsites-add-shortcut-title =
    .title = Dodaj bližnjico
    .aria-label = Dodaj bližnjico
newtab-topsites-title-label = Naslov
newtab-topsites-title-input =
    .placeholder = Vnesite ime
newtab-topsites-url-label = Spletni naslov
newtab-topsites-url-input =
    .placeholder = Vnesite ali prilepite spletni naslov
newtab-topsites-url-validation = Vnesite veljaven spletni naslov
newtab-topsites-image-url-label = Spletni naslov slike po meri
newtab-topsites-use-image-link = Uporabi sliko po meri …
newtab-topsites-image-validation = Slike ni bilo mogoče naložiti. Poskusite drug spletni naslov.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Počisti besedilo

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Prekliči
newtab-topsites-delete-history-button = Izbriši iz zgodovine
newtab-topsites-save-button = Shrani
newtab-topsites-preview-button = Predogled
newtab-topsites-add-button = Dodaj

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Ali ste prepričani, da želite izbrisati vse primerke te strani iz zgodovine?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Tega dejanja ni mogoče razveljaviti.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Sponzorirano

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (pripeto)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Odpri meni
    .aria-label = Odpri meni
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Odstrani
    .aria-label = Odstrani
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Odpri meni
    .aria-label = Odpri priročni meni za { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Uredi to stran
    .aria-label = Uredi to stran

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Uredi
newtab-menu-open-new-window = Odpri v novem oknu
newtab-menu-open-new-private-window = Odpri v novem zasebnem oknu
newtab-menu-dismiss = Skrij
newtab-menu-pin = Pripni
newtab-menu-unpin = Odpni
newtab-menu-delete-history = Izbriši iz zgodovine
newtab-menu-save-to-pocket = Shrani v { -pocket-brand-name }
newtab-menu-delete-pocket = Izbriši iz { -pocket-brand-name }a
newtab-menu-archive-pocket = Arhiviraj v { -pocket-brand-name }
newtab-menu-show-privacy-info = Naši pokrovitelji in vaša zasebnost
newtab-menu-about-fakespot = O { -fakespot-brand-name(sklon: "mestnik") }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Prijavi
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Prepovej
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Nehaj slediti
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Več o tem
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Nehaj slediti temi

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Upravljanje sponzorirane vsebine
newtab-menu-our-sponsors-and-your-privacy = Naši pokrovitelji in vaša zasebnost
newtab-menu-report-this-ad = Prijavi ta oglas

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Končaj
newtab-privacy-modal-button-manage = Upravljaj nastavitve sponzorirane vsebine
newtab-privacy-modal-header = Vaša zasebnost je pomembna.
newtab-privacy-modal-paragraph-2 =
    Poleg zanimivih zgodb vam pokažemo tudi ustrezne, skrbno izbrane vsebine
    izbranih pokroviteljev. Zagotavljamo vam, da <strong>vaši podatki o brskanju nikoli
    ne zapustijo vašega { -brand-product-name }a</strong>. Ne vidimo jih niti mi niti naši pokrovitelji.
newtab-privacy-modal-link = Spoznajte, kako deluje zasebnost v novem zavihku

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Odstrani zaznamek
# Bookmark is a verb here.
newtab-menu-bookmark = Dodaj med zaznamke

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Kopiraj povezavo za prenos
newtab-menu-go-to-download-page = Pojdi na stran za prenos
newtab-menu-remove-download = Odstrani iz zgodovine

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Prikaži v Finderju
       *[other] Odpri vsebujočo mapo
    }
newtab-menu-open-file = Odpri datoteko

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Obiskano
newtab-label-bookmarked = Med zaznamki
newtab-label-removed-bookmark = Zaznamek odstranjen
newtab-label-recommended = Najbolj priljubljeno
newtab-label-saved = Shranjeno v { -pocket-brand-name }
newtab-label-download = Preneseno
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Oglas
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Pokrovitelj: { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Sponzorirano

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Odstrani odsek
newtab-section-menu-collapse-section = Strni odsek
newtab-section-menu-expand-section = Razširi odsek
newtab-section-menu-manage-section = Upravljanje odseka
newtab-section-menu-manage-webext = Upravljaj razširitev
newtab-section-menu-add-topsite = Dodaj glavno stran
newtab-section-menu-add-search-engine = Dodaj iskalnik
newtab-section-menu-move-up = Premakni gor
newtab-section-menu-move-down = Premakni dol
newtab-section-menu-privacy-notice = Obvestilo o zasebnosti

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Strni odsek
newtab-section-expand-section-label =
    .aria-label = Razširi odsek

## Section Headers.

newtab-section-header-topsites = Glavne strani
newtab-section-header-recent-activity = Nedavna dejavnost
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Priporoča { $provider }
newtab-section-header-stories = Zgodbe, ki spodbujajo k razmisleku
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Današnji izbor za vas

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Začnite z brskanjem, mi pa vam bomo tu prikazovali odlične članke, videoposnetke ter druge strani, ki ste jih nedavno obiskali ali shranili med zaznamke.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Zdaj ste seznanjeni z novicami. Vrnite se pozneje in si oglejte nove prispevke iz { $provider }. Komaj čakate? Izberite priljubljeno temo in odkrijte več velikih zgodb na spletu.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Zdaj ste seznanjeni z novicami. Vrnite se pozneje in si oglejte nove prispevke. Komaj čakate? Izberite priljubljeno temo in odkrijte več velikih zgodb na spletu.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Ste na tekočem!
newtab-discovery-empty-section-topstories-content = Preverite pozneje za več zgodb.
newtab-discovery-empty-section-topstories-try-again-button = Poskusi znova
newtab-discovery-empty-section-topstories-loading = Nalaganje …
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Ojoj! Nekaj se je zalomilo.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Priljubljene teme:
newtab-pocket-new-topics-title = Želite še več zgodb? Oglejte si najbolj priljubljene teme iz storitve { -pocket-brand-name }
newtab-pocket-more-recommendations = Več priporočil
newtab-pocket-learn-more = Več o tem
newtab-pocket-cta-button = Prenesi { -pocket-brand-name }
newtab-pocket-cta-text = Shranite zgodbe, ki jih imate radi, v { -pocket-brand-name }, in napolnite svoje misli z navdušujočim branjem.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } je del družine { -brand-product-name }
newtab-pocket-save = Shrani
newtab-pocket-saved = Shranjeno

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Več takšnih
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Ni zame
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Hvala. Povratne informacije nam bodo pomagale izboljšati vaš vir.
newtab-toast-dismiss-button =
    .title = Skrij
    .aria-label = Skrij

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Odkrijte najboljše, kar ponuja splet
newtab-pocket-onboarding-cta = { -pocket-brand-name } vam iz raznolike palete publikacij prinaša informativno, navdihujočo in zanesljivo vsebino naravnost v brskalnik { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Ojoj, pri nalaganju te vsebine je šlo nekaj narobe.
newtab-error-fallback-refresh-link = Osvežite stran za ponoven poskus.

## Customization Menu

newtab-custom-shortcuts-title = Bližnjice
newtab-custom-shortcuts-subtitle = Strani, ki jih shranite ali obiščete
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Bližnjice
    .description = Strani, ki jih shranite ali obiščete
newtab-custom-shortcuts-nova =
    .label = Bližnjice
newtab-custom-row-description =
    .description = Število vrstic
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } vrstica
            [two] { $num } vrstici
            [few] { $num } vrstice
           *[other] { $num } vrstic
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } vrstica
        [two] { $num } vrstici
        [few] { $num } vrstice
       *[other] { $num } vrstic
    }
newtab-custom-sponsored-sites = Bližnjice oglaševalcev
newtab-custom-pocket-title = Priporoča { -pocket-brand-name }
newtab-custom-pocket-subtitle = Izjemna vsebina, ki jo pripravlja { -pocket-brand-name }, del družine { -brand-product-name }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Priporočene zgodbe
    .description = Izjemna vsebina, ki jo pripravlja družina { -brand-product-name }
newtab-recommended-stories-toggle =
    .label = Priporočene zgodbe
newtab-custom-stories-personalized-toggle =
    .label = Zgodbe
newtab-custom-stories-personalized-checkbox-label = Zgodbe, izbrane na podlagi vaše dejavnosti
newtab-custom-pocket-sponsored = Zgodbe oglaševalcev
newtab-custom-pocket-show-recent-saves = Prikaži nedavno shranjene strani
newtab-custom-recent-title = Nedavna dejavnost
newtab-custom-recent-subtitle = Izbor nedavnih spletnih mest in vsebin
newtab-custom-weather-toggle =
    .label = Vreme
    .description = Današnja napoved vedno na očeh
newtab-custom-widget-weather-toggle =
    .label = Vreme
newtab-custom-widget-lists-toggle =
    .label = Seznami
newtab-custom-widget-timer-toggle =
    .label = Časovnik
newtab-custom-widget-sports-toggle =
    .label = Svetovno prvenstvo
newtab-custom-widget-clock-toggle =
    .label = Ura
newtab-custom-widget-sports-toggle2 =
    .label = Šport
newtab-custom-widget-section-title = Pripomočki
newtab-custom-widget-section-toggle =
    .label = Pripomočki
newtab-widget-manage-title = Pripomočki
newtab-widget-manage-widget-button =
    .label = Upravljanje pripomočkov
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Zapri
    .aria-label = Zapri meni
newtab-custom-close-button = Zapri
newtab-custom-settings = Več nastavitev

## New Tab Wallpapers

newtab-wallpaper-title = Ozadja
newtab-wallpaper-reset = Ponastavi privzeto
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Naloži sliko
newtab-wallpaper-add-an-image = Dodaj sliko
newtab-wallpaper-custom-color = Izberite barvo
newtab-wallpaper-toggle-title =
    .label = Ozadja
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Največja dovoljena velikost slike je { $file_size } MB. Poskusite naložiti manjšo datoteko.
newtab-wallpaper-error-upload-file-type = Datoteke ni bilo mogoče naložiti. Poskusite znova s slikovno datoteko.
newtab-wallpaper-error-file-type = Datoteke ni bilo mogoče naložiti. Poskusite znova z drugo vrsto datoteke.
newtab-wallpaper-light-red-panda = Mačji panda
newtab-wallpaper-light-mountain = Bela gora
newtab-wallpaper-light-sky = Nebo z vijoličastimi in rožnatimi oblaki
newtab-wallpaper-light-color = Modri, rožnati in rumeni liki
newtab-wallpaper-light-landscape = Gorska pokrajina z modrimi meglicami
newtab-wallpaper-light-beach = Plaža s palmo
newtab-wallpaper-dark-aurora = Severni sij
newtab-wallpaper-dark-color = Rdeči in modri liki
newtab-wallpaper-dark-panda = Mačji panda, skrit v gozdu
newtab-wallpaper-dark-sky = Mestna pokrajina z nočnim nebom
newtab-wallpaper-dark-mountain = Gorska pokrajina
newtab-wallpaper-dark-city = Vijolična mestna pokrajina
newtab-wallpaper-dark-fox-anniversary = Lisica na pločniku blizu gozda
newtab-wallpaper-light-fox-anniversary = Lisica na travnatem polju v megleni gorski pokrajini

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Enobarvna
newtab-wallpaper-colors = Barve
newtab-wallpaper-blue = Modro
newtab-wallpaper-light-blue = Svetlo modro
newtab-wallpaper-light-purple = Svetlo vijolično
newtab-wallpaper-light-green = Svetlo zeleno
newtab-wallpaper-green = Zeleno
newtab-wallpaper-beige = Bež
newtab-wallpaper-yellow = Rumeno
newtab-wallpaper-orange = Oranžno
newtab-wallpaper-pink = Roza
newtab-wallpaper-light-pink = Svetlo roza
newtab-wallpaper-red = Rdeče
newtab-wallpaper-dark-blue = Temno modro
newtab-wallpaper-dark-purple = Temno vijolično
newtab-wallpaper-dark-green = Temno zeleno
newtab-wallpaper-brown = Rjavo

## Abstract

newtab-wallpaper-category-title-abstract = Abstraktna
newtab-wallpaper-abstract-green = Zelene oblike
newtab-wallpaper-abstract-blue = Modre oblike
newtab-wallpaper-abstract-purple = Vijoličaste oblike
newtab-wallpaper-abstract-orange = Oranžne oblike
newtab-wallpaper-gradient-orange = Preliv oranžne in roza
newtab-wallpaper-abstract-blue-purple = Modre in vijolične oblike
newtab-wallpaper-abstract-white-curves = Bela z zasenčenimi krivuljami
newtab-wallpaper-abstract-purple-green = Preliv vijolične in zelene svetlobe
newtab-wallpaper-abstract-blue-purple-waves = Modre in vijolične valovite oblike
newtab-wallpaper-abstract-black-waves = Črne valovite oblike

## Firefox

newtab-wallpaper-category-title-photographs = Fotografije
newtab-wallpaper-beach-at-sunrise = Plaža ob sončnem vzhodu
newtab-wallpaper-beach-at-sunset = Plaža ob sončnem zahodu
newtab-wallpaper-storm-sky = Nevihtno nebo
newtab-wallpaper-sky-with-pink-clouds = Nebo z rožnatimi oblaki
newtab-wallpaper-red-panda-yawns-in-a-tree = Zehajoč mačji panda na drevesu
newtab-wallpaper-white-mountains = Bele gore
newtab-wallpaper-hot-air-balloons = Različne barve toplozračnih balonov podnevi
newtab-wallpaper-starry-canyon = Modra zvezdna noč
newtab-wallpaper-suspension-bridge = Siva fotografija visečega mostu podnevi
newtab-wallpaper-sand-dunes = Bele peščene sipine
newtab-wallpaper-palm-trees = Silhueta kokosovih palm med zlato uro
newtab-wallpaper-blue-flowers = Posnetek cvetočih rož z modrimi listi od blizu
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Avtor fotografije: <a data-l10n-name="name-link">{ $author_string }</a>, <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Poskusite s kančkom barve
newtab-wallpaper-feature-highlight-content = Vdahnite strani novega zavihka svež videz in ji nastavite ozadje.
newtab-wallpaper-feature-highlight-button = Razumem
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Skrij
    .aria-label = Zapri okence
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Nebesna
newtab-wallpaper-celestial-lunar-eclipse = Lunin mrk
newtab-wallpaper-celestial-earth-night = Nočna fotografija iz nizke orbite Zemlje
newtab-wallpaper-celestial-starry-sky = Zvezdnato nebo
newtab-wallpaper-celestial-eclipse-time-lapse = Upočasnjen posnetek luninega mrka
newtab-wallpaper-celestial-black-hole = Ilustracija galaksije
newtab-wallpaper-celestial-river = Satelitski posnetek reke

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Prikaži napoved v storitvi { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Sponzorirano
newtab-weather-menu-change-location = Spremeni lokacijo
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Išči lokacijo
    .aria-label = Išči lokacijo
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Uporabi trenutno lokacijo
newtab-weather-menu-weather-display = Prikazovalnik vremena
newtab-weather-todays-forecast = Napoved za današnji dan
newtab-weather-see-full-forecast = Prikaži celotno napoved
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Preprosto
newtab-weather-menu-change-weather-display-simple = Preklopi na preprost pogled
newtab-weather-menu-weather-display-option-detailed = Podrobno
newtab-weather-menu-change-weather-display-detailed = Preklopi na podroben pogled
newtab-weather-menu-temperature-units = Enote za temperaturo
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celzij
newtab-weather-menu-change-temperature-units-fahrenheit = Preklopi na stopinje Fahrenheita
newtab-weather-menu-change-temperature-units-celsius = Preklopi na stopinje Celzija
newtab-weather-menu-hide-weather = Skrij vreme na novem zavihku
newtab-weather-menu-learn-more = Več o tem
newtab-weather-menu-detect-my-location = Zaznaj mojo lokacijo
# This message is shown if user is working offline
newtab-weather-error-not-available = Podatki o vremenu trenutno niso na voljo.
newtab-weather-opt-in-not-now =
    .label = Ne zdaj
newtab-weather-opt-in-yes =
    .label = Da
newtab-weather-opt-in-use-location =
    .label = Uporabi lokacijo
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Najvišja
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Najnižja
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Prikaži napoved v storitvi { $provider }
    .aria-description = { $provider } ∙ Sponzorirano

## Topic Labels

newtab-topic-label-business = Posel
newtab-topic-label-career = Kariera
newtab-topic-label-education = Izobraževanje
newtab-topic-label-arts = Zabava
newtab-topic-label-food = Hrana
newtab-topic-label-health = Zdravje
newtab-topic-label-hobbies = Igre
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Denar
newtab-topic-label-society-parenting = Starševstvo
newtab-topic-label-government = Politika
newtab-topic-label-education-science = Znanost
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Življenjske zvijače
newtab-topic-label-sports = Šport
newtab-topic-label-tech = Tehnologija
newtab-topic-label-travel = Potovanje
newtab-topic-label-home = Dom in vrt

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Izberite teme za fino nastavitev vira
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Izberite dve ali več tem. Naši strokovnjaki dajejo prednost zgodbam, prilagojenim vašim zanimanjem. Nastavitve lahko spremenite kadarkoli.
newtab-topic-selection-save-button = Shrani
newtab-topic-selection-cancel-button = Prekliči
newtab-topic-selection-button-maybe-later = Morda pozneje
newtab-topic-selection-privacy-link = Kako ščitimo in upravljamo podatke
newtab-topic-selection-button-update-interests = Posodobite svoja zanimanja
newtab-topic-selection-button-pick-interests = Izberite svoja zanimanja

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Sledi
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Sledi temi { $topic }
newtab-section-following-button = Sledite
newtab-section-unfollow-button = Nehaj slediti
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Prilagodite si vir
newtab-section-follow-highlight-subtitle = Sledite svojim zanimanjem in dobivajte več vsebine, ki vam je všeč.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Prepovej
newtab-section-blocked-button = Prepovedano
newtab-section-unblock-button = Dovoli
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Odblokiraj temo { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = Ne zdaj
newtab-section-confirm-block-topic-p1 = Ali ste prepričani, da želite blokirati to temo?
newtab-section-confirm-block-topic-p2 = Blokirane teme se ne bodo več prikazovale v vašem viru.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Blokiraj { $topic }
newtab-section-block-cancel-button = Prekliči

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Teme
newtab-section-manage-topics-button-v2 =
    .label = Upravljanje tem
newtab-section-mangage-topics-followed-topics = Spremljate
newtab-section-mangage-topics-followed-topics-empty-state = Ne spremljate še nobene teme.
newtab-section-mangage-topics-blocked-topics = Blokirano
newtab-section-mangage-topics-blocked-topics-empty-state = Prepovedali niste še nobene teme.
newtab-custom-wallpaper-title = Ozadja po meri so tu
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Naložite lastno ozadje ali izberite poljubno barvo, ki bo { -brand-product-name(sklon: "dajalnik") } dodala vašo osebno noto.
newtab-custom-wallpaper-cta = Preizkusite

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Izberite ozadje, da bo { -brand-product-name } samo vaš
newtab-new-user-custom-wallpaper-subtitle = Počutite se kot doma na vsakem novem zavihku s poljubnim ozadjem in barvami.
newtab-new-user-custom-wallpaper-cta = Preizkusite zdaj

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Prenesite { -brand-product-name } za mobilne naprave
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Skenirajte kodo in si zagotovite varno prenosno brskanje.
newtab-download-mobile-highlight-body-variant-b = Nadaljujte, kjer ste končali, s sinhroniziranimi zavihki, gesli in drugimi podatki.
newtab-download-mobile-highlight-body-variant-c = Ali ste vedeli, da lahko { -brand-product-name } vzamete s seboj? Isti brskalnik. V vašem žepu.
newtab-download-mobile-highlight-image =
    .aria-label = Koda QR za prenos { -brand-product-name(sklon: "rodilnik") } za mobilne naprave

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Vaša priljubljena mesta na dosegu roke
newtab-shortcuts-highlight-subtitle = Dodajte bližnjico in obdržite priljubljena spletna mesta le klik stran.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Zakaj to prijavljate?
newtab-report-ads-reason-not-interested =
    .label = Ne zanima me
newtab-report-ads-reason-inappropriate =
    .label = Zdi se mi neprimerno
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Že prevečkrat videno
newtab-report-content-wrong-category =
    .label = Napačna kategorija
newtab-report-content-outdated =
    .label = Zastarelo
newtab-report-content-inappropriate-offensive =
    .label = Neprimerno ali žaljivo
newtab-report-content-spam-misleading =
    .label = Vsiljivo ali zavajajoče
newtab-report-content-requires-payment-subscription =
    .label = Zahteva plačilo ali naročnino
newtab-report-content-requires-payment-subscription-learn-more = Več o tem
newtab-report-cancel = Prekliči
newtab-report-submit = Pošlji
newtab-toast-thanks-for-reporting =
    .message = Hvala za prijavo.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Zdaj sledite temi { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Ne sledite več temi { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Zgodbe o temi { $topic } se vam ne bodo več prikazovale.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Možnosti so neskončne. Dopišite karkoli.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Novo
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Opravljeno ({ $number })
newtab-widget-lists-celebration-headline = Dobro opravljeno
newtab-widget-lists-celebration-subhead = Ni opravkov
newtab-widget-task-list-menu-copy = Kopiraj
newtab-widget-lists-menu-edit = Uredi ime seznama
newtab-widget-lists-menu-edit2 =
    .aria-label = Uredi ime seznama
newtab-widget-lists-menu-create = Ustvari nov seznam
newtab-widget-lists-menu-delete = Izbriši ta seznam
newtab-widget-lists-menu-copy = Kopiraj seznam v odložišče
newtab-widget-lists-menu-learn-more = Več o tem
newtab-widget-lists-button-add-item = Dodaj element
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Dodaj element
    .aria-label = Dodaj element
newtab-widget-lists-input-error = Za dodajanje predmeta vključite besedilo.
newtab-widget-lists-input-menu-open-link = Odpri povezavo
newtab-widget-lists-input-menu-move-up = Premakni gor
newtab-widget-lists-input-menu-move-down = Premakni dol
newtab-widget-lists-input-menu-delete = Izbriši
newtab-widget-lists-input-menu-edit = Uredi
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Uredi predmet
newtab-widget-lists-edit-clear =
    .aria-label = Prekliči
    .title = Prekliči
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Ustvari nov seznam
newtab-widget-lists-name-label-default =
    .label = Seznam opravil
newtab-widget-lists-name-placeholder-default =
    .placeholder = Seznam opravil
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Nov seznam
    .aria-label = Uredi ime seznama
newtab-widget-section-title = Pripomočki
newtab-widget-menu-hide = Skrij pripomoček
newtab-widget-menu-change-size = Spremeni velikost
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Premakni
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Levo
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Desno
newtab-widget-size-small = Majhna
newtab-widget-size-medium = Srednja
newtab-widget-size-large = Velika
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Skrij pripomočke
    .aria-label = Skrij vse pripomočke
newtab-widget-section-maximize =
    .title = Razširi pripomočke
    .aria-label = Povečaj vse pripomočke na polno velikost
newtab-widget-section-minimize =
    .title = Pomanjšaj pripomočke
    .aria-label = Skrči vse pripomočke
newtab-widget-section-menu-button =
    .title = Meni Pripomočki
    .aria-label = Odpri meni pripomočkov
newtab-widget-section-menu-manage = Upravljanje pripomočkov
newtab-widget-section-menu-hide-all = Skrij pripomočke
newtab-widget-section-menu-learn-more = Več o tem
newtab-widget-section-feedback = Povejte nam svoje mnenje

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Časovnik
newtab-widget-timer-notification-focus = Čas za osredotočeno delo je potekel. Odlično opravljeno. Potrebujete odmor?
newtab-widget-timer-notification-break = Vaš odmor je končan. Ste pripravljeni na osredotočeno delo?
newtab-widget-timer-notification-warning = Obvestila so izklopljena
newtab-widget-timer-mode-focus =
    .label = Osredotočite se
newtab-widget-timer-mode-break =
    .label = Premor
newtab-widget-timer-label-play =
    .label = Predvajaj
newtab-widget-timer-label-pause =
    .label = Ustavi
newtab-widget-timer-reset =
    .title = Ponastavi
newtab-widget-timer-menu-notifications = Izklopi obvestila
newtab-widget-timer-menu-notifications-on = Vklopi obvestila
newtab-widget-timer-menu-learn-more = Več o tem
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Glavne novice
newtab-daily-briefing-card-menu-dismiss = Skrij
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Posodobljeno pred { $minutes } min
newtab-widget-message-title = Ostanite osredotočeni s seznami in vgrajenim časovnikom
newtab-promo-card-cta-addons = Preizkusite zdaj
newtab-promo-card-title = Podprite { -brand-product-name(sklon: "tozilnik") }
newtab-promo-card-body = Naši sponzorji podpirajo naše poslanstvo ustvarjanja boljšega spleta
newtab-promo-card-cta = Več o tem
newtab-promo-card-dismiss-button =
    .title = Opusti
    .aria-label = Opusti

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] Začni odštevati { $minutes } minuto
            [two] Začni odštevati { $minutes } minuti
            [few] Začni odštevati { $minutes } minute
           *[other] Začni odštevati { $minutes } minut
        }
newtab-widget-timer-pause-aria =
    .aria-label = Ustavi časovnik
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } minuta
            [two] { $minutes } minuti
            [few] { $minutes } minute
           *[other] { $minutes } minut
        }
newtab-widget-timer-decrease-min =
    .title = Odštej 1 minuto
newtab-widget-timer-increase-min =
    .title = Dodaj 1 minuto
newtab-widget-timer-mode-group =
    .aria-label = Način časovnika
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Skrij časovnik

##

newtab-sports-widget-menu-view-results = Prikaži izide
newtab-sports-widget-menu-learn-more = Več o tem
newtab-sports-widget-get-updates = V živo prejemajte obvestila o dogajanju na tekmah in še več.
newtab-sports-widget-view-schedule =
    .label = Prikaži razpored
newtab-sports-widget-choose-wallpaper =
    .label = Izberite si ozadje
newtab-sports-widget-skip = Preskoči
newtab-sports-widget-cancel = Prekliči
newtab-sports-widget-back-button =
    .aria-label = Nazaj
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (izpadli)
newtab-sports-widget-watch-dialog-close =
    .aria-label = Zapri
    .title = Zapri
newtab-sports-widget-group-stage = Skupinski del
newtab-sports-widget-group-a = Skupina A
newtab-sports-widget-group-b = Skupina B
newtab-sports-widget-group-c = Skupina C
newtab-sports-widget-group-d = Skupina D
newtab-sports-widget-group-e = Skupina E
newtab-sports-widget-group-f = Skupina F
newtab-sports-widget-group-g = Skupina G
newtab-sports-widget-group-h = Skupina H
newtab-sports-widget-group-i = Skupina I
newtab-sports-widget-group-j = Skupina J
newtab-sports-widget-group-k = Skupina K
newtab-sports-widget-group-l = Skupina L
newtab-sports-widget-round-32 = Šestnajstina finala
newtab-sports-widget-round-16 = Osmina finala
newtab-sports-widget-quarter-finals = Četrtfinale
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = V ŽIVO
newtab-sports-widget-upcoming = Kmalu
newtab-sports-widget-semi-finals = Polfinala
newtab-sports-widget-bronze-finals = Tekma za tretje mesto
# Final is the final match for 1st place.
newtab-sports-widget-final = Finale
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") }–{ DATETIME($end, month: "short", day: "numeric") }
newtab-sports-widget-cancelled = Odpovedano
newtab-sports-widget-information = Podatki o tekmi
newtab-sports-widget-view-results-link = Prikaži izide
newtab-sports-widget-third-place = Tretje mesto
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Podprvaki
newtab-sports-widget-champions = Prvaki
newtab-sports-widget-world-cup-champions = Zmagovalci svetovnega prvenstva 2026

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosna in Hercegovina
newtab-sports-widget-team-name-label-civ =
    .label = Slonokoščena obala
newtab-sports-widget-team-name-label-cod =
    .label = DR Kongo
newtab-sports-widget-team-name-label-eng =
    .label = Anglija
newtab-sports-widget-team-name-label-sco =
    .label = Škotska

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Zapri
    .aria-label = Zapri
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Uredite ta prostor po svoje
newtab-activation-window-message-customization-focus-message = Izberite si prijetno ozadje, dodajte bližnjice do svojih priljubljenih spletnih mest in ostanite na tekočem z zgodbami, ki vas zanimajo.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Začni s prilagajanjem
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Ta prostor igra po vaših pravilih

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Skrij uro
newtab-clock-widget-menu-learn-more = Več o tem
newtab-clock-widget-menu-edit = Uredi ure
newtab-clock-widget-menu-switch-to-12h = Preklopi na 12-urni zapis
newtab-clock-widget-menu-switch-to-24h = Preklopi na 24-urni zapis
newtab-clock-widget-label-your-clocks = Vaše ure
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Dodaj novo uro
    .aria-label = Dodaj novo uro
newtab-clock-widget-button-add-clock = Dodaj
newtab-clock-widget-button-cancel = Prekliči
newtab-clock-widget-button-back =
    .title = Nazaj
    .aria-label = Nazaj
newtab-clock-widget-button-edit-clock =
    .title = Uredi uro
    .aria-label = Uredi uro
newtab-clock-widget-button-save = Shrani
newtab-clock-widget-button-remove-clock =
    .title = Odstrani uro
    .aria-label = Odstrani uro
# Accessible name for a clock row in the "Your clocks" management panel
# when the row has no user-provided nickname. Read aloud by screen
# readers when focus lands on the row.
# Variables:
#   $city (string) - The city name displayed in the row.
newtab-clock-widget-edit-item =
    .aria-label = { $city }
newtab-clock-widget-add-clock-form =
    .aria-label = Dodaj uro
newtab-clock-widget-edit-clock-form =
    .aria-label = Uredi uro
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Rezultati iskanja
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Ni zadetkov
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Odpri meni z uro
    .aria-label = Odpri meni z uro
