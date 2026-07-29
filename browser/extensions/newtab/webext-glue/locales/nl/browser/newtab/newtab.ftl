# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Nieuw tabblad
newtab-settings-button =
    .title = Uw Nieuw-tabbladpagina aanpassen
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Deze pagina aanpassen
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Aanpassen
newtab-customize-panel-label =
    .label = Aanpassen
newtab-personalize-settings-icon-label =
    .title = Nieuw tabblad personaliseren
    .aria-label = Instellingen
newtab-settings-dialog-label =
    .aria-label = Instellingen
newtab-personalize-icon-label =
    .title = Nieuw tabblad personaliseren
    .aria-label = Nieuw tabblad personaliseren
newtab-personalize-dialog-label =
    .aria-label = Personaliseren
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Sluiten
    .aria-label = Sluiten

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Startpagina
home-homepage-new-windows =
    .label = Nieuwe vensters
home-homepage-new-tabs =
    .label = Nieuwe tabbladen
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Kies een specifieke website

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Websiteadres(sen)
home-custom-homepage-address =
    .placeholder = Voer adres in
home-custom-homepage-address-button =
    .label = Adres toevoegen
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Nog geen websites toegevoegd.
home-custom-homepage-delete-address-button =
    .aria-label = Adres verwijderen
    .title = Adres verwijderen
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Vervangen door
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Huidige geopende pagina’s
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Bladwijzers…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Zoeken
home-prefs-stories-header2 =
    .label = Verhalen
    .description = Uitzonderlijke inhoud, verzameld door de { -brand-product-name }-familie
home-prefs-widgets-header =
    .label = Widgets
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Lijsten
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Timer
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Sport
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Klok
home-prefs-mission-message2 =
    .message = Onze sponsors steunen onze missie om een beter web te bouwen.
home-prefs-manage-topics-link2 =
    .label = Onderwerpen beheren
home-prefs-choose-wallpaper-link2 =
    .label = Kies een achtergrond
home-prefs-firefox-logo-header =
    .label = { -brand-short-name }-logo
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Stel nieuwe tabbladen of nieuwe vensters in op { -firefox-home-brand-name } om deze functies te gebruiken.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } rij
           *[other] { $num } rijen
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Extensie ({ $extension })
home-restore-defaults-srd =
    .label = Standaardwaarden herstellen
    .accesskey = S
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (standaard)
home-mode-choice-custom-srd =
    .label = Aangepaste URL’s…
home-mode-choice-blank-srd =
    .label = Lege pagina
home-prefs-shortcuts-header-srd =
    .label = Snelkoppelingen
home-prefs-shortcuts-select =
    .aria-label = Snelkoppelingen
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Gesponsorde snelkoppelingen
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Gesponsorde verhalen
home-prefs-highlights-option-visited-pages-srd =
    .label = Bezochte pagina’s
home-prefs-highlights-options-bookmarks-srd =
    .label = Bladwijzers
home-prefs-highlights-option-most-recent-download-srd =
    .label = Meest recent gedownload
home-prefs-recent-activity-header-srd =
    .label = Recente activiteit
home-prefs-recent-activity-select =
    .aria-label = Recente activiteit
home-prefs-weather-header-srd =
    .label = Weer
home-prefs-support-firefox-header-srd =
    .label = { -brand-product-name } ondersteunen
home-prefs-mission-message-learn-more-link-srd = Lees hier hoe

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Zoeken
    .aria-label = Zoeken
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Met { $engine } zoeken of voer adres in
newtab-search-box-handoff-text-no-engine = Voer zoekterm of adres in
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Met { $engine } zoeken of voer adres in
    .title = Met { $engine } zoeken of voer adres in
    .aria-label = Met { $engine } zoeken of voer adres in
newtab-search-box-handoff-input-no-engine =
    .placeholder = Voer zoekterm of adres in
    .title = Voer zoekterm of adres in
    .aria-label = Voer zoekterm of adres in
newtab-search-box-text = Zoeken op het web
newtab-search-box-input =
    .placeholder = Zoeken op het web
    .aria-label = Zoeken op het web

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Zoekmachine toevoegen
newtab-topsites-add-shortcut-header = Nieuwe snelkoppeling
newtab-topsites-edit-topsites-header = Topwebsite bewerken
newtab-topsites-edit-shortcut-header = Snelkoppeling bewerken
newtab-topsites-add-shortcut-label = Snelkoppeling toevoegen
newtab-topsites-add-shortcut-title =
    .title = Snelkoppeling toevoegen
    .aria-label = Snelkoppeling toevoegen
newtab-topsites-title-label = Titel
newtab-topsites-title-input =
    .placeholder = Voer een titel in
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Typ of plak een URL
newtab-topsites-url-validation = Geldige URL vereist
newtab-topsites-image-url-label = URL van aangepaste afbeelding
newtab-topsites-use-image-link = Een aangepaste afbeelding gebruiken…
newtab-topsites-image-validation = Afbeelding kon niet worden geladen. Probeer een andere URL.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Tekst wissen

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Annuleren
newtab-topsites-delete-history-button = Verwijderen uit geschiedenis
newtab-topsites-save-button = Opslaan
newtab-topsites-preview-button = Voorbeeld
newtab-topsites-add-button = Toevoegen

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Weet u zeker dat u alle exemplaren van deze pagina uit uw geschiedenis wilt verwijderen?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Deze actie kan niet ongedaan worden gemaakt.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Gesponsord

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (vastgemaakt)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Menu openen
    .aria-label = Menu openen
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Verwijderen
    .aria-label = Verwijderen
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Menu openen
    .aria-label = Contextmenu openen voor { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Deze website bewerken
    .aria-label = Deze website bewerken

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Bewerken
newtab-menu-open-new-window = Openen in een nieuw venster
newtab-menu-open-new-private-window = Openen in een nieuw privévenster
newtab-menu-dismiss = Sluiten
newtab-menu-pin = Vastmaken
newtab-menu-unpin = Losmaken
newtab-menu-delete-history = Verwijderen uit geschiedenis
newtab-menu-save-to-pocket = Opslaan naar { -pocket-brand-name }
newtab-menu-delete-pocket = Verwijderen uit { -pocket-brand-name }
newtab-menu-archive-pocket = Archiveren in { -pocket-brand-name }
newtab-menu-show-privacy-info = Onze sponsors en uw privacy
newtab-menu-about-fakespot = Over { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Rapporteren
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Blokkeren
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Ontvolgen
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Meer info
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Onderwerp niet meer volgen

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Gesponsorde inhoud beheren
newtab-menu-our-sponsors-and-your-privacy = Onze sponsors en uw privacy
newtab-menu-report-this-ad = Deze advertentie rapporteren

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Gereed
newtab-privacy-modal-button-manage = Instellingen voor gesponsorde inhoud beheren
newtab-privacy-modal-header = Uw privacy is belangrijk.
newtab-privacy-modal-paragraph-2 =
    Naast het vertellen van boeiende verhalen, tonen we u ook relevante,
    goed doorgelichte inhoud van geselecteerde sponsors. Wees gerust, <strong>uw navigatiegegevens
    verlaten nooit uw persoonlijke exemplaar van { -brand-product-name }</strong> – wij krijgen ze niet te zien,
    en onze sponsors ook niet.
newtab-privacy-modal-link = Ontdek hoe privacy werkt op het nieuwe tabblad

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Bladwijzer verwijderen
# Bookmark is a verb here.
newtab-menu-bookmark = Bladwijzer maken

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Downloadkoppeling kopiëren
newtab-menu-go-to-download-page = Naar downloadpagina gaan
newtab-menu-remove-download = Verwijderen uit geschiedenis

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Tonen in Finder
       *[other] Bijbehorende map openen
    }
newtab-menu-open-file = Bestand openen

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Bezocht
newtab-label-bookmarked = Bladwijzer gemaakt
newtab-label-removed-bookmark = Bladwijzer verwijderd
newtab-label-recommended = Trending
newtab-label-saved = Opgeslagen naar { -pocket-brand-name }
newtab-label-download = Gedownload
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Gesponsord
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Gesponsord door { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min.
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Gesponsord

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Sectie verwijderen
newtab-section-menu-collapse-section = Sectie samenvouwen
newtab-section-menu-expand-section = Sectie uitvouwen
newtab-section-menu-manage-section = Sectie beheren
newtab-section-menu-manage-webext = Extensie beheren
newtab-section-menu-add-topsite = Topwebsite toevoegen
newtab-section-menu-add-search-engine = Zoekmachine toevoegen
newtab-section-menu-move-up = Omhoog verplaatsen
newtab-section-menu-move-down = Omlaag verplaatsen
newtab-section-menu-privacy-notice = Privacyverklaring

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Sectie samenvouwen
newtab-section-expand-section-label =
    .aria-label = Sectie uitvouwen

## Section Headers.

newtab-section-header-topsites = Topwebsites
newtab-section-header-recent-activity = Recente activiteit
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Aanbevolen door { $provider }
newtab-section-header-stories = Verhalen die tot nadenken stemmen
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Keuzes van vandaag voor u

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Begin met surfen, en we tonen hier een aantal geweldige artikelen, video’s en andere pagina’s die u onlangs hebt bezocht of waarvoor u een bladwijzer hebt gemaakt.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = U bent weer bij. Kijk later nog eens voor meer topverhalen van { $provider }. Kunt u niet wachten? Selecteer een populair onderwerp voor meer geweldige verhalen van het hele web.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = U bent weer bij. Kijk later nog eens voor meer verhalen. Kunt u niet wachten? Selecteer een populair onderwerp voor meer geweldige verhalen van het hele web.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = U bent helemaal bij!
newtab-discovery-empty-section-topstories-content = Kom later terug voor meer verhalen.
newtab-discovery-empty-section-topstories-try-again-button = Opnieuw proberen
newtab-discovery-empty-section-topstories-loading = Laden…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Oeps! We hadden deze sectie bijna geladen, maar toch niet helemaal.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Populaire onderwerpen:
newtab-pocket-new-topics-title = Wilt u nog meer verhalen? Bekijk deze populaire onderwerpen van { -pocket-brand-name }
newtab-pocket-more-recommendations = Meer aanbevelingen
newtab-pocket-learn-more = Meer info
newtab-pocket-cta-button = { -pocket-brand-name } gebruiken
newtab-pocket-cta-text = Bewaar de verhalen die u interessant vindt in { -pocket-brand-name }, en stimuleer uw gedachten met boeiende leesstof.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } maakt deel uit van de { -brand-product-name }-familie
newtab-pocket-save = Opslaan
newtab-pocket-saved = Opgeslagen

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Meer zoals dit
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Niets voor mij
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Bedankt. Uw feedback helpt ons uw feed te verbeteren.
newtab-toast-dismiss-button =
    .title = Sluiten
    .aria-label = Sluiten

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Ontdek het beste van internet
newtab-pocket-onboarding-cta = { -pocket-brand-name } verkent een breed scala aan publicaties om de meest informatieve, inspirerende en betrouwbare inhoud rechtstreeks naar uw { -brand-product-name }-browser te brengen.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Oeps, er is iets misgegaan bij het laden van deze inhoud.
newtab-error-fallback-refresh-link = Vernieuw de pagina om het opnieuw te proberen.

## Customization Menu

newtab-custom-shortcuts-title = Snelkoppelingen
newtab-custom-shortcuts-subtitle = Opgeslagen of bezochte websites
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Snelkoppelingen
    .description = Opgeslagen of bezochte websites
newtab-custom-shortcuts-nova =
    .label = Snelkoppelingen
newtab-custom-row-description =
    .description = Aantal rijen
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } rij
           *[other] { $num } rijen
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } rij
       *[other] { $num } rijen
    }
newtab-custom-sponsored-sites = Gesponsorde snelkoppelingen
newtab-custom-pocket-title = Aanbevolen door { -pocket-brand-name }
newtab-custom-pocket-subtitle = Uitzonderlijke inhoud, samengesteld door { -pocket-brand-name }, onderdeel van de { -brand-product-name }-familie
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Aanbevolen verhalen
    .description = Uitzonderlijke inhoud, verzameld door de { -brand-product-name }-familie
newtab-recommended-stories-toggle =
    .label = Aanbevolen verhalen
newtab-custom-stories-personalized-toggle =
    .label = Verhalen
newtab-custom-stories-personalized-checkbox-label = Gepersonaliseerde verhalen op basis van uw activiteit
newtab-custom-pocket-sponsored = Gesponsorde verhalen
newtab-custom-pocket-show-recent-saves = Onlangs opgeslagen items tonen
newtab-custom-recent-title = Recente activiteit
newtab-custom-recent-subtitle = Een selectie van recente websites en inhoud
newtab-custom-weather-toggle =
    .label = Weer
    .description = De weersverwachting van vandaag in een oogopslag
newtab-custom-widget-weather-toggle =
    .label = Weer
newtab-custom-widget-lists-toggle =
    .label = Lijsten
newtab-custom-widget-timer-toggle =
    .label = Timer
newtab-custom-widget-sports-toggle =
    .label = Wereldkampioenschap
newtab-custom-widget-clock-toggle =
    .label = Klok
newtab-custom-widget-sports-toggle2 =
    .label = Sport
newtab-custom-widget-section-title = Widgets
newtab-custom-widget-section-toggle =
    .label = Widgets
newtab-widget-manage-title = Widgets
newtab-widget-manage-widget-button =
    .label = Widgets beheren
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Sluiten
    .aria-label = Menu sluiten
newtab-custom-close-button = Sluiten
newtab-custom-settings = Meer instellingen beheren

## New Tab Wallpapers

newtab-wallpaper-title = Achtergronden
newtab-wallpaper-reset = Standaardwaarden
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Een afbeelding uploaden
newtab-wallpaper-add-an-image = Afbeelding toevoegen
newtab-wallpaper-custom-color = Kies een kleur
newtab-wallpaper-toggle-title =
    .label = Achtergronden
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = De afbeelding heeft de bestandsgroottelimiet van { $file_size } MB overschreden. Probeer een kleiner bestand te uploaden.
newtab-wallpaper-error-upload-file-type = We konden uw bestand niet uploaden. Probeer het opnieuw met een afbeeldingsbestand.
newtab-wallpaper-error-file-type = We konden uw bestand niet uploaden. Probeer het opnieuw met een ander bestandstype.
newtab-wallpaper-light-red-panda = Rode panda
newtab-wallpaper-light-mountain = Witte berg
newtab-wallpaper-light-sky = Lucht met paarse en roze wolken
newtab-wallpaper-light-color = Blauwe, roze en gele vormen
newtab-wallpaper-light-landscape = Berglandschap met blauwe mist
newtab-wallpaper-light-beach = Strand met palmboom
newtab-wallpaper-dark-aurora = Aurora Borealis
newtab-wallpaper-dark-color = Rode en blauwe vormen
newtab-wallpaper-dark-panda = Rode panda verborgen in bos
newtab-wallpaper-dark-sky = Stadslandschap met een nachtelijke hemel
newtab-wallpaper-dark-mountain = Landschap met berg
newtab-wallpaper-dark-city = Paars stadslandschap
newtab-wallpaper-dark-fox-anniversary = Een vos op de stoep bij een bos
newtab-wallpaper-light-fox-anniversary = Een vos in een grasveld met een mistig berglandschap

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Effen kleuren
newtab-wallpaper-colors = Kleuren
newtab-wallpaper-blue = Blauw
newtab-wallpaper-light-blue = Lichtblauw
newtab-wallpaper-light-purple = Lichtpaars
newtab-wallpaper-light-green = Lichtgroen
newtab-wallpaper-green = Groen
newtab-wallpaper-beige = Beige
newtab-wallpaper-yellow = Geel
newtab-wallpaper-orange = Oranje
newtab-wallpaper-pink = Roze
newtab-wallpaper-light-pink = Lichtroze
newtab-wallpaper-red = Rood
newtab-wallpaper-dark-blue = Donkerblauw
newtab-wallpaper-dark-purple = Donkerpaars
newtab-wallpaper-dark-green = Donkergroen
newtab-wallpaper-brown = Bruin

## Abstract

newtab-wallpaper-category-title-abstract = Abstract
newtab-wallpaper-abstract-green = Groene vormen
newtab-wallpaper-abstract-blue = Blauwe vormen
newtab-wallpaper-abstract-purple = Paarse vormen
newtab-wallpaper-abstract-orange = Oranje vormen
newtab-wallpaper-gradient-orange = Verloop oranje en roze
newtab-wallpaper-abstract-blue-purple = Blauwe en paarse vormen
newtab-wallpaper-abstract-white-curves = Wit met gearceerde rondingen
newtab-wallpaper-abstract-purple-green = Paars en groene lichtgradiënt
newtab-wallpaper-abstract-blue-purple-waves = Blauwe en paarse golvende vormen
newtab-wallpaper-abstract-black-waves = Zwarte golvende vormen

## Firefox

newtab-wallpaper-category-title-photographs = Foto’s
newtab-wallpaper-beach-at-sunrise = Strand bij zonsopgang
newtab-wallpaper-beach-at-sunset = Strand bij zonsondergang
newtab-wallpaper-storm-sky = Onweerslucht
newtab-wallpaper-sky-with-pink-clouds = Lucht met roze wolken
newtab-wallpaper-red-panda-yawns-in-a-tree = Rode panda gaapt in een boom
newtab-wallpaper-white-mountains = Witte bergen
newtab-wallpaper-hot-air-balloons = Heteluchtballonnen in diverse kleuren overdag
newtab-wallpaper-starry-canyon = Blauwe sterrennacht
newtab-wallpaper-suspension-bridge = Foto’s van een volledige hangbrug overdag
newtab-wallpaper-sand-dunes = Witte zandduinen
newtab-wallpaper-palm-trees = Silhouet van kokospalmen tijdens het gouden uur
newtab-wallpaper-blue-flowers = Close-upfotografie van blauwe bloemen in bloei
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Foto door <a data-l10n-name="name-link">{ $author_string }</a> op <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Probeer een vleugje kleur
newtab-wallpaper-feature-highlight-content = Geef uw Nieuw-tabbladpagina een frisse uitstraling met achtergronden.
newtab-wallpaper-feature-highlight-button = Begrepen
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Sluiten
    .aria-label = Pop-up sluiten
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Kosmisch
newtab-wallpaper-celestial-lunar-eclipse = Maansverduistering
newtab-wallpaper-celestial-earth-night = Nachtfoto vanuit een lage baan om de aarde
newtab-wallpaper-celestial-starry-sky = Sterrenhemel
newtab-wallpaper-celestial-eclipse-time-lapse = Time-lapse van maansverduistering
newtab-wallpaper-celestial-black-hole = Illustratie van een zwart-gatsterrenstelsel
newtab-wallpaper-celestial-river = Satellietfoto van rivier

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Weersverwachting bekijken voor { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Gesponsord
newtab-weather-menu-change-location = Locatie wijzigen
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Locatie zoeken
    .aria-label = Locatie zoeken
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Huidige locatie gebruiken
newtab-weather-menu-weather-display = Weerweergave
newtab-weather-todays-forecast = Weersverwachting voor vandaag
newtab-weather-see-full-forecast = Volledige weersverwachting bekijken
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Eenvoudig
newtab-weather-menu-change-weather-display-simple = Wisselen naar eenvoudige weergave
newtab-weather-menu-weather-display-option-detailed = Gedetailleerd
newtab-weather-menu-change-weather-display-detailed = Wisselen naar gedetailleerde weergave
newtab-weather-menu-temperature-units = Temperatuureenheden
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Wisselen naar Fahrenheit
newtab-weather-menu-change-temperature-units-celsius = Wisselen naar Celsius
newtab-weather-menu-hide-weather = Weer op nieuw tabblad verbergen
newtab-weather-menu-learn-more = Meer info
newtab-weather-menu-detect-my-location = Mijn locatie detecteren
# This message is shown if user is working offline
newtab-weather-error-not-available = Weergegevens zijn momenteel niet beschikbaar.
newtab-weather-opt-in-see-weather = Wilt u het weer voor uw locatie zien?
newtab-weather-opt-in-not-now =
    .label = Niet nu
newtab-weather-opt-in-yes =
    .label = Ja
newtab-weather-opt-in-headline = Uw lokale weersvoorspelling opvragen
newtab-weather-opt-in-use-location =
    .label = Locatie gebruiken
newtab-weather-opt-in-choose-location = Locatie kiezen
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Hoog
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Laag
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Weersverwachting bekijken voor { $provider }
    .aria-description = { $provider } ∙ Gesponsord

## Topic Labels

newtab-topic-label-business = Zakelijk
newtab-topic-label-career = Loopbaan
newtab-topic-label-education = Onderwijs
newtab-topic-label-arts = Amusement
newtab-topic-label-food = Voeding
newtab-topic-label-health = Gezondheid
newtab-topic-label-hobbies = Gaming
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Geld
newtab-topic-label-society-parenting = Ouderschap en opvoeding
newtab-topic-label-government = Politiek
newtab-topic-label-education-science = Wetenschap
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Lifehacks
newtab-topic-label-sports = Sport
newtab-topic-label-tech = Technologie
newtab-topic-label-travel = Reizen
newtab-topic-label-home = Huis en tuin

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Selecteer onderwerpen om uw feed te verfijnen
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Kies twee of meer onderwerpen. Onze deskundige curatoren geven prioriteit aan verhalen die zijn afgestemd op uw interesses. Werk op elk gewenst moment bij.
newtab-topic-selection-save-button = Opslaan
newtab-topic-selection-cancel-button = Annuleren
newtab-topic-selection-button-maybe-later = Misschien later
newtab-topic-selection-privacy-link = Lees hoe we gegevens beschermen en beheren
newtab-topic-selection-button-update-interests = Werk uw interesses bij
newtab-topic-selection-button-pick-interests = Kies uw interesses

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Volgen
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = { $topic } volgen
newtab-section-following-button = Volgend
newtab-section-unfollow-button = Ontvolgen
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Volgend: { $topic } niet meer volgen
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Uw feed verfijnen
newtab-section-follow-highlight-subtitle = Volg uw interesses om meer te zien van wat u leuk vindt.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Blokkeren
newtab-section-blocked-button = Geblokkeerd
newtab-section-unblock-button = Blokkering opheffen
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = { $topic } volgen
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = { $topic } niet meer volgen
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = { $topic } blokkeren
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Blokkering { $topic } opheffen

## Confirmation modal for blocking a section

newtab-section-cancel-button = Niet nu
newtab-section-confirm-block-topic-p1 = Weet u zeker dat u dit onderwerp wilt blokkeren?
newtab-section-confirm-block-topic-p2 = Geblokkeerde onderwerpen verschijnen niet meer in uw feed.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = { $topic } blokkeren
newtab-section-block-cancel-button = Annuleren

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Onderwerpen
newtab-section-manage-topics-button-v2 =
    .label = Onderwerpen beheren
newtab-section-mangage-topics-followed-topics = Gevolgd
newtab-section-mangage-topics-followed-topics-empty-state = U hebt nog geen onderwerpen gevolgd.
newtab-section-mangage-topics-blocked-topics = Geblokkeerd
newtab-section-mangage-topics-blocked-topics-empty-state = U hebt nog geen onderwerpen geblokkeerd.
newtab-custom-wallpaper-title = Hier vindt u aangepaste achtergronden
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Upload uw eigen achtergrond of kies een aangepaste kleur om { -brand-product-name } van uzelf te maken.
newtab-custom-wallpaper-cta = Uitproberen

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Kies een achtergrond om { -brand-product-name } van u te maken
newtab-new-user-custom-wallpaper-subtitle = Laat elk nieuw tabblad als thuis voelen met aangepaste achtergronden en kleuren.
newtab-new-user-custom-wallpaper-cta = Nu proberen

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Er zijn frisse nieuwe achtergronden binnen
newtab-wallpaper-feature-highlight-subtitle = Kies uw favoriet en laat elk nieuw tabblad als thuis voelen.
newtab-wallpaper-feature-highlight-cta = Achtergrond kiezen

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = { -brand-product-name } voor mobiel downloaden
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Scan de code om veilig onderweg te navigeren.
newtab-download-mobile-highlight-body-variant-b = Ga verder waar u was gebleven wanneer u uw tabbladen, wachtwoorden en meer synchroniseert.
newtab-download-mobile-highlight-body-variant-c = Wist u dat u { -brand-product-name } ook onderweg kunt meenemen? Dezelfde browser. In uw zak.
newtab-download-mobile-highlight-image =
    .aria-label = QR-code om { -brand-product-name } voor mobiel te downloaden

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Uw favorieten binnen handbereik
newtab-shortcuts-highlight-subtitle = Voeg een snelkoppeling toe om uw favoriete websites op één klik afstand te houden.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Waarom meldt u dit?
newtab-report-ads-reason-not-interested =
    .label = Ik ben niet geïnteresseerd
newtab-report-ads-reason-inappropriate =
    .label = Het is ongepast
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Ik heb het te vaak gezien
newtab-report-content-wrong-category =
    .label = Verkeerde categorie
newtab-report-content-outdated =
    .label = Verouderd
newtab-report-content-inappropriate-offensive =
    .label = Ongepast of beledigend
newtab-report-content-spam-misleading =
    .label = Spam of misleidend
newtab-report-content-requires-payment-subscription =
    .label = Vereist betaling of abonnement
newtab-report-content-requires-payment-subscription-learn-more = Meer info
newtab-report-cancel = Annuleren
newtab-report-submit = Indienen
newtab-toast-thanks-for-reporting =
    .message = Bedankt voor het melden.
newtab-toast-widgets-hidden =
    .message = Selecteer het potloodpictogram om op elk gewenst moment widgets terug te plaatsen.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = U volgt nu { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = U volgt { $topic } niet meer.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = U ziet geen verhalen over { $topic } meer.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = De mogelijkheden zijn eindeloos. Voeg er een toe.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Nieuw
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Voltooid ({ $number })
newtab-widget-lists-celebration-headline = Goed werk
newtab-widget-lists-celebration-subhead = Alles gereed
newtab-widget-task-list-menu-copy = Kopiëren
newtab-widget-lists-menu-edit = Lijstnaam bewerken
newtab-widget-lists-menu-edit2 =
    .aria-label = Lijstnaam bewerken
newtab-widget-lists-menu-create = Een nieuwe lijst aanmaken
newtab-widget-lists-menu-delete = Deze lijst verwijderen
newtab-widget-lists-menu-copy = Lijst naar klembord kopiëren
newtab-widget-lists-menu-learn-more = Meer info
newtab-widget-lists-button-add-item = Een item toevoegen
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Een item toevoegen
    .aria-label = Een item toevoegen
newtab-widget-lists-input-error = Voeg tekst toe om een item toe te voegen.
newtab-widget-lists-input-menu-open-link = Koppeling openen
newtab-widget-lists-input-menu-move-up = Omhoog verplaatsen
newtab-widget-lists-input-menu-move-down = Omlaag verplaatsen
newtab-widget-lists-input-menu-delete = Verwijderen
newtab-widget-lists-input-menu-edit = Bewerken
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Item bewerken
newtab-widget-lists-edit-clear =
    .aria-label = Annuleren
    .title = Annuleren
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Een nieuwe lijst aanmaken
newtab-widget-lists-name-label-default =
    .label = Takenlijst
newtab-widget-lists-name-label-checklist =
    .label = Checklist
newtab-widget-lists-name-placeholder-default =
    .placeholder = Takenlijst
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Checklist
    .aria-label = Lijstnaam bewerken
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Nieuwe lijst
    .aria-label = Lijstnaam bewerken
newtab-widget-section-title = Widgets
newtab-widget-menu-hide = Widget verbergen
newtab-widget-menu-change-size = Grootte wijzigen
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Verplaatsen
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Links
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Rechts
newtab-widget-size-small = Klein
newtab-widget-size-medium = Normaal
newtab-widget-size-large = Groot
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Widgets verbergen
    .aria-label = Alle widgets verbergen
newtab-widget-section-maximize =
    .title = Widgets uitvouwen
    .aria-label = Alle widgets tot volledige afmeting uitvouwen
newtab-widget-section-minimize =
    .title = Widgets minimaliseren
    .aria-label = Alle widgets samenvouwen tot compacte afmeting
newtab-widget-section-menu-button =
    .title = Menu Widgets
    .aria-label = Menu Widgets openen
newtab-widget-add-widgets-button =
    .aria-label = Widget toevoegen
    .title = Widget toevoegen
newtab-widget-section-menu-manage = Widgets beheren
newtab-widget-section-menu-hide-all = Widgets verbergen
newtab-widget-section-menu-learn-more = Meer info
newtab-widget-section-feedback = Vertel ons wat u ervan vindt
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Meer widgets tonen
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Minder widgets tonen
newtab-widget-lists-name-default = Checklist

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Timer
newtab-widget-timer-notification-focus = De focustijd is om. Goed gedaan. Pauze?
newtab-widget-timer-notification-break = Uw pauze is voorbij. Klaar om te focussen?
newtab-widget-timer-notification-warning = Notificaties staan uit
newtab-widget-timer-mode-focus =
    .label = Focus
newtab-widget-timer-mode-break =
    .label = Pauze
newtab-widget-timer-label-play =
    .label = Afspelen
newtab-widget-timer-label-pause =
    .label = Pauzeren
newtab-widget-timer-reset =
    .title = Herinitialiseren
newtab-widget-timer-menu-notifications = Notificaties uitschakelen
newtab-widget-timer-menu-notifications-on = Notificaties inschakelen
newtab-widget-timer-menu-learn-more = Meer info
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Topberichten
newtab-daily-briefing-card-menu-dismiss = Sluiten
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = { $minutes } min. geleden bijgewerkt
newtab-widget-message-title = Blijf gefocust met lijsten en een ingebouwde timer
# to-dos stands for "things to do".
newtab-widget-message-copy = Van snelle herinneringen tot dagelijkse to-do’s, en van focussessies tot lange pauzes – blijf bij de taak en op tijd.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Eén plek voor focus, weersvoorspellingen en meer
newtab-widget-message-focus-forecasts-body = Houd uw dag soepel met { -brand-product-name }-widgets. Bekijk de weersvoorspelling, blijf bij de les of houd wereldwijd de tijd bij.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Maak { -brand-product-name } van uzelf
newtab-promo-card-body-addons = Kies een achtergrond uit onze collectie of maak er zelf een.
newtab-promo-card-cta-addons = Nu proberen
newtab-promo-card-title = { -brand-product-name } ondersteunen
newtab-promo-card-body = Onze sponsors steunen onze missie om een beter web te bouwen
newtab-promo-card-cta = Meer info
newtab-promo-card-dismiss-button =
    .title = Sluiten
    .aria-label = Sluiten

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] { $minutes }-minuut-timer starten
           *[other] { $minutes }-minuten-timer starten
        }
newtab-widget-timer-pause-aria =
    .aria-label = Timer pauzeren
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } minuut
           *[other] { $minutes } minuten
        }
newtab-widget-timer-decrease-min =
    .title = Met 1 minuut verminderen
newtab-widget-timer-increase-min =
    .title = Met 1 minuut verlengen
newtab-widget-timer-mode-group =
    .aria-label = Timermodus
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Focus
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Pauze
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Timer verbergen
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Goed werk
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Uw pauze is voorbij
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Pauze nodig?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Klaar om te focussen?

##

newtab-sports-widget-menu-follow-teams = Teams volgen
newtab-sports-widget-menu-view-schedule = Tijdschema bekijken
newtab-sports-widget-menu-view-upcoming = Volgende tonen
newtab-sports-widget-menu-view-results = Resultaten bekijken
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Belangrijke data
newtab-sports-widget-menu-learn-more = Meer info
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Houd het WK in de gaten
newtab-sports-widget-get-updates = Ontvang live wedstrijdupdates en meer.
newtab-sports-widget-view-schedule =
    .label = Tijdschema bekijken
newtab-sports-widget-follow-teams =
    .label = Teams volgen
newtab-sports-widget-view-matches =
    .label = Wedstrijden bekijken
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Volg maximaal { $number } team
       *[other] Volg maximaal { $number } teams
    }
newtab-sports-widget-choose-wallpaper =
    .label = Kies een achtergrond
newtab-sports-widget-skip = Overslaan
newtab-sports-widget-search-country =
    .placeholder = Land zoeken
    .aria-label = Land zoeken
newtab-sports-widget-cancel = Annuleren
newtab-sports-widget-back-button =
    .aria-label = Terug
newtab-sports-widget-done-button =
    .label = Gereed
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (uitgeschakeld)
newtab-sports-widget-view-all =
    .label = Alles bekijken
newtab-sports-widget-show-less =
    .label = Minder tonen
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Alleen gevolgde teams
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Kijken
    .title = Live bekijken
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Live bekijken
    .title = Live bekijken
newtab-sports-widget-watch-dialog-close =
    .aria-label = Sluiten
    .title = Sluiten
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Gratis
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Gratis proefperiode
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Gratis en betaald
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Betaald
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Alleen bepaalde wedstrijden
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Beschikbaar in uw regio
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Overige regio’s
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Stream openen
    .title = Stream openen
newtab-sports-widget-group-stage = Groepsfase
newtab-sports-widget-group-a = Groep A
newtab-sports-widget-group-b = Groep B
newtab-sports-widget-group-c = Groep C
newtab-sports-widget-group-d = Groep D
newtab-sports-widget-group-e = Groep E
newtab-sports-widget-group-f = Groep F
newtab-sports-widget-group-g = Groep G
newtab-sports-widget-group-h = Groep H
newtab-sports-widget-group-i = Groep I
newtab-sports-widget-group-j = Groep J
newtab-sports-widget-group-k = Groep K
newtab-sports-widget-group-l = Groep L
newtab-sports-widget-round-32 = Ronde van 32
newtab-sports-widget-round-16 = Ronde van 16
newtab-sports-widget-quarter-finals = Kwartfinales
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = LIVE
newtab-custom-widget-live-refresh =
    .title = Scores vernieuwen
    .aria-label = Scores vernieuwen
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Belangrijke data
newtab-sports-widget-upcoming = Binnenkort
# Used for a match currently ongoing
newtab-sports-widget-now = Nu
newtab-sports-widget-results = Resultaten
newtab-sports-widget-semi-finals = Halve finales
newtab-sports-widget-bronze-finals = Troostfinale
# Final is the final match for 1st place.
newtab-sports-widget-final = Finale
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, day: "numeric", month: "short") } – { DATETIME($end, day: "numeric", month: "short") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, day: "numeric", month: "short") }
newtab-sports-widget-delayed = Vertraagd
newtab-sports-widget-postponed = Uitgesteld
newtab-sports-widget-suspended = Onderbroken
newtab-sports-widget-cancelled = Geannuleerd
newtab-sports-widget-information = Informatie over de wedstrijd
newtab-sports-widget-no-live-data = Livewedstrijdgegevens worden momenteel niet bijgewerkt
newtab-sports-widget-view-results-link = Resultaten bekijken
newtab-sports-widget-third-place = Derde plaats
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Tweede plaats
newtab-sports-widget-champions = Kampioen
newtab-sports-widget-world-cup-champions = Wereldkampioen 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Wedstrijd afgelopen
newtab-sports-widget-match-halftime = Rust
newtab-sports-widget-match-extra-time = Verlenging
newtab-sports-widget-match-penalties = Strafschoppen
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = vs
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Kijk regelmatig voor details van aankomende wedstrijden

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Vorige
    .title = Vorige
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Volgende
    .title = Volgende
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Livewedstrijd { $index } van { $total }
    .title = Livewedstrijd { $index } van { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } tegen { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) tegen { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Live: { $homeTeam }, { $homeScore } tegen { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } – { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } – { $awayTeam }, vertraagd
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } – { $awayTeam }, uitgesteld
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } – { $awayTeam }, opgeschort
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } – { $awayTeam }, geannuleerd

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosnië en Herzegovina
newtab-sports-widget-team-name-label-civ =
    .label = Ivoorkust
newtab-sports-widget-team-name-label-cod =
    .label = DR Congo
newtab-sports-widget-team-name-label-eng =
    .label = Engeland
newtab-sports-widget-team-name-label-sco =
    .label = Schotland
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Nog te bepalen

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Start het WK met nieuwe achtergronden
newtab-sports-widget-message-wallpapers-body = Breng wat wedstrijdenergie naar uw browser voor het toernooi.
newtab-sports-widget-message-wallpapers-cta = Achtergrond kiezen
newtab-sports-widget-message-add-widgets-cta =
    .label = Widgets toevoegen
newtab-sports-widget-message-day-in-play-title = Houd uw dag speels met { -brand-product-name }-widgets
newtab-sports-widget-message-day-in-play-body = Volg het WK, blijf bij de les, houd wereldwijd de tijd bij, en meer.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Widgets verkennen

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Sluiten
    .aria-label = Sluiten
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Deze ruimte aanpassen aan uw wensen
newtab-activation-window-message-customization-focus-message = Kies een nieuwe achtergrond, voeg snelkoppelingen naar uw favoriete websites toe en blijf op de hoogte van verhalen die u interesseren.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Beginnen met aanpassen
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Deze ruimte volgt uw regels
newtab-activation-window-message-values-focus-message = Met { -brand-product-name } kunt u surfen zoals u dat wilt, met een meer persoonlijke manier om uw dag online te beginnen. Maak { -brand-product-name } van uzelf.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Klok verbergen
newtab-clock-widget-menu-learn-more = Meer info
newtab-clock-widget-menu-edit = Klokken bewerken
newtab-clock-widget-menu-switch-to-12h = Omschakelen naar 12-uursnotatie
newtab-clock-widget-menu-switch-to-24h = Omschakelen naar 24-uursnotatie
newtab-clock-widget-label-your-clocks = Uw klokken
newtab-clock-widget-search-location-input =
    .label = Locatie
    .placeholder = Stad zoeken
    .aria-label = Stad zoeken
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Bijnaam (optioneel)
    .placeholder = Voeg een bijnaam toe
    .aria-label = Bijnaam (optioneel)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Nieuwe klok toevoegen
    .aria-label = Nieuwe klok toevoegen
newtab-clock-widget-button-add-clock = Toevoegen
newtab-clock-widget-button-cancel = Annuleren
newtab-clock-widget-button-back =
    .title = Terug
    .aria-label = Terug
newtab-clock-widget-button-edit-clock =
    .title = Klok bewerken
    .aria-label = Klok bewerken
newtab-clock-widget-button-save = Opslaan
newtab-clock-widget-button-remove-clock =
    .title = Klok verwijderen
    .aria-label = Klok verwijderen
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
    .aria-label = { $city }, bijnaam: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Klok toevoegen
newtab-clock-widget-edit-clock-form =
    .aria-label = Klok bewerken
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Zoekresultaten
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Geen overeenkomsten
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Menu voor klok openen
    .aria-label = Menu voor klok openen
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Bijnaam: { $nickname }
