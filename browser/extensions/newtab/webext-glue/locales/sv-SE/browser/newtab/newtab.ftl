# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Ny flik
newtab-settings-button =
    .title = Anpassa sidan för Ny flik
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Anpassa sidan
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Anpassa
newtab-customize-panel-label =
    .label = Anpassa
newtab-personalize-settings-icon-label =
    .title = Anpassa ny flik
    .aria-label = Inställningar
newtab-settings-dialog-label =
    .aria-label = Inställningar
newtab-personalize-icon-label =
    .title = Anpassa ny flik
    .aria-label = Anpassa ny flik
newtab-personalize-dialog-label =
    .aria-label = Anpassa
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Ignorera
    .aria-label = Ignorera

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Startsida
home-homepage-new-windows =
    .label = Nya fönster
home-homepage-new-tabs =
    .label = Nya flikar
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Välj en specifik webbplats

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Webbadress(er)
home-custom-homepage-address =
    .placeholder = Ange adress
home-custom-homepage-address-button =
    .label = Lägg till adress
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Inga webbplatser tillagda ännu.
home-custom-homepage-delete-address-button =
    .aria-label = Ta bort adress
    .title = Ta bort adress
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Ersätt med
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = För närvarande öppna sidor
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Bokmärken…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Sök
home-prefs-stories-header2 =
    .label = Berättelser
    .description = Exceptionellt innehåll kurerat av { -brand-product-name }-familjen
home-prefs-widgets-header =
    .label = Widgetar
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Listor
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Timer
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Sport
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Klocka
home-prefs-mission-message2 =
    .message = Våra sponsorer stöder vårt uppdrag att bygga en bättre webb.
home-prefs-manage-topics-link2 =
    .label = Hantera ämnen
home-prefs-choose-wallpaper-link2 =
    .label = Välj en bakgrundsbild
home-prefs-firefox-logo-header =
    .label = { -brand-short-name } logotyp
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = För att använda dessa funktioner, ställ in nya flikar eller fönster till { -firefox-home-brand-name }.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } rad
           *[other] { $num } rader
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Tillägg ({ $extension })
home-restore-defaults-srd =
    .label = Återställ standard
    .accesskey = t
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (Standard)
home-mode-choice-custom-srd =
    .label = Anpassade webbadresser...
home-mode-choice-blank-srd =
    .label = Tom sida
home-prefs-shortcuts-header-srd =
    .label = Genvägar
home-prefs-shortcuts-select =
    .aria-label = Genvägar
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Sponsrade genvägar
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Sponsrade berättelser
home-prefs-highlights-option-visited-pages-srd =
    .label = Besökta sidor
home-prefs-highlights-options-bookmarks-srd =
    .label = Bokmärken
home-prefs-highlights-option-most-recent-download-srd =
    .label = Senaste nedladdning
home-prefs-recent-activity-header-srd =
    .label = Senaste aktivitet
home-prefs-recent-activity-select =
    .aria-label = Senaste aktivitet
home-prefs-weather-header-srd =
    .label = Väder
home-prefs-support-firefox-header-srd =
    .label = Stöd { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = Ta reda på hur

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Sök
    .aria-label = Sök
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Sök med { $engine } eller ange en adress
newtab-search-box-handoff-text-no-engine = Sök eller ange adress
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Sök med { $engine } eller ange en adress
    .title = Sök med { $engine } eller ange en adress
    .aria-label = Sök med { $engine } eller ange en adress
newtab-search-box-handoff-input-no-engine =
    .placeholder = Sök eller ange adress
    .title = Sök eller ange adress
    .aria-label = Sök eller ange adress
newtab-search-box-text = Sök på webben
newtab-search-box-input =
    .placeholder = Sök på webben
    .aria-label = Sök på webben

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Lägg till sökmotor
newtab-topsites-add-shortcut-header = Ny genväg
newtab-topsites-edit-topsites-header = Redigera mest besökta
newtab-topsites-edit-shortcut-header = Redigera genväg
newtab-topsites-add-shortcut-label = Lägg till genväg
newtab-topsites-add-shortcut-title =
    .title = Lägg till genväg
    .aria-label = Lägg till genväg
newtab-topsites-title-label = Titel
newtab-topsites-title-input =
    .placeholder = Ange en titel
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Skriv eller klistra in en URL
newtab-topsites-url-validation = Giltig URL krävs
newtab-topsites-image-url-label = Anpassa bild-URL
newtab-topsites-use-image-link = Använd en anpassad bild…
newtab-topsites-image-validation = Bilden misslyckades att ladda. Prova en annan URL.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Rensa text

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Avbryt
newtab-topsites-delete-history-button = Ta bort från historik
newtab-topsites-save-button = Spara
newtab-topsites-preview-button = Förhandsvisa
newtab-topsites-add-button = Lägg till

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Är du säker på att du vill radera varje förekomst av den här sidan från din historik?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Den här åtgärden kan inte ångras.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Sponsrad

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (fäst)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Öppna meny
    .aria-label = Öppna meny
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Ta bort
    .aria-label = Ta bort
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Öppna meny
    .aria-label = Öppna snabbmeny för { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Redigera denna webbplats
    .aria-label = Redigera denna webbplats

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Redigera
newtab-menu-open-new-window = Öppna i nytt fönster
newtab-menu-open-new-private-window = Öppna i nytt privat fönster
newtab-menu-dismiss = Ignorera
newtab-menu-pin = Fäst
newtab-menu-unpin = Lösgör
newtab-menu-delete-history = Ta bort från historik
newtab-menu-save-to-pocket = Spara till { -pocket-brand-name }
newtab-menu-delete-pocket = Ta bort från { -pocket-brand-name }
newtab-menu-archive-pocket = Arkivera i { -pocket-brand-name }
newtab-menu-show-privacy-info = Våra sponsorer & din integritet
newtab-menu-about-fakespot = Om { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Rapportera
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Blockera
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Sluta följa
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Läs mer
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Sluta följa ämne

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Hantera sponsrat innehåll
newtab-menu-our-sponsors-and-your-privacy = Våra sponsorer och din integritet
newtab-menu-report-this-ad = Rapportera denna annons

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Klar
newtab-privacy-modal-button-manage = Hantera sponsrade innehållsinställningar
newtab-privacy-modal-header = Din integritet är viktig.
newtab-privacy-modal-paragraph-2 =
    Förutom att servera fängslande berättelser, visar vi dig också relevant,
    högt kontrollerat innehåll från utvalda sponsorer. Du kan vara säker på att <strong>din surfinformation
    inte lämnar din personliga kopia av { -brand-product-name }</strong> — vi ser inte den och våra
    sponsorer gör det inte heller.
newtab-privacy-modal-link = Lär dig hur sekretess fungerar på den nya fliken

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Ta bort bokmärke
# Bookmark is a verb here.
newtab-menu-bookmark = Bokmärke

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Kopiera nedladdningslänk
newtab-menu-go-to-download-page = Gå till hämtningssida
newtab-menu-remove-download = Ta bort från historik

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Visa i Finder
       *[other] Öppna objektets mapp
    }
newtab-menu-open-file = Öppna fil

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Besökta
newtab-label-bookmarked = Bokmärkta
newtab-label-removed-bookmark = Bokmärke har tagits bort
newtab-label-recommended = Trend
newtab-label-saved = Spara till { -pocket-brand-name }
newtab-label-download = Hämtat
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Sponsrad
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Sponsrad av { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Sponsrad

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Ta bort sektion
newtab-section-menu-collapse-section = Fäll ihop sektion
newtab-section-menu-expand-section = Expandera sektion
newtab-section-menu-manage-section = Hantera sektion
newtab-section-menu-manage-webext = Hantera tillägg
newtab-section-menu-add-topsite = Lägg till mest besökta
newtab-section-menu-add-search-engine = Lägg till sökmotor
newtab-section-menu-move-up = Flytta upp
newtab-section-menu-move-down = Flytta ner
newtab-section-menu-privacy-notice = Sekretessmeddelande

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Fäll ihop sektion
newtab-section-expand-section-label =
    .aria-label = Expandera sektion

## Section Headers.

newtab-section-header-topsites = Mest besökta
newtab-section-header-recent-activity = Senaste aktivitet
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Rekommenderas av { $provider }
newtab-section-header-stories = Tankeväckande berättelser
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Dagens val för dig

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Börja surfa, och vi visar några av de bästa artiklarna, videoklippen och andra sidor du nyligen har besökt eller bokmärkt här.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Det finns inte fler. Kom tillbaka senare för fler huvudnyheter från { $provider }. Kan du inte vänta? Välj ett populärt ämne för att hitta fler bra nyheter från hela världen.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Det finns inte fler. Kom tillbaka senare för fler berättelser. Kan du inte vänta? Välj ett populärt ämne för att hitta fler bra berättelser från hela webben.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Du är ikapp!
newtab-discovery-empty-section-topstories-content = Kom tillbaka senare för fler berättelser.
newtab-discovery-empty-section-topstories-try-again-button = Försök igen
newtab-discovery-empty-section-topstories-loading = Laddar…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Hoppsan! Vi laddade nästan detta avsnitt, men inte riktigt.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Populära ämnen:
newtab-pocket-new-topics-title = Vill du ha fler berättelser? Se dessa populära ämnen från { -pocket-brand-name }
newtab-pocket-more-recommendations = Fler rekommendationer
newtab-pocket-learn-more = Läs mer
newtab-pocket-cta-button = Hämta { -pocket-brand-name }
newtab-pocket-cta-text = Spara de historier som du tycker är intressant i { -pocket-brand-name } och stimulera dina tankar med fascinerande läsmaterial.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } är en del av familjen { -brand-product-name }
newtab-pocket-save = Spara
newtab-pocket-saved = Sparad

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Mer sånt här
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Inte för mig
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Tack. Din feedback hjälper oss att förbättra ditt flöde.
newtab-toast-dismiss-button =
    .title = Ignorera
    .aria-label = Ignorera

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Upptäck det bästa från webben
newtab-pocket-onboarding-cta = { -pocket-brand-name } utforskar en mängd olika publikationer för att få det mest informativa, inspirerande och pålitliga innehållet direkt till din { -brand-product-name }-webbläsare.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Oj, något gick fel när innehållet skulle laddas.
newtab-error-fallback-refresh-link = Uppdatera sidan för att försöka igen.

## Customization Menu

newtab-custom-shortcuts-title = Genvägar
newtab-custom-shortcuts-subtitle = Webbplatser du sparar eller besöker
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Genvägar
    .description = Webbplatser du sparar eller besöker
newtab-custom-shortcuts-nova =
    .label = Genvägar
newtab-custom-row-description =
    .description = Antal rader
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } rad
           *[other] { $num } rader
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } rad
       *[other] { $num } rader
    }
newtab-custom-sponsored-sites = Sponsrade genvägar
newtab-custom-pocket-title = Rekommenderas av { -pocket-brand-name }
newtab-custom-pocket-subtitle = Särskilt innehåll valt av { -pocket-brand-name }, en del av familjen { -brand-product-name }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Rekommenderade berättelser
    .description = Exceptionellt innehåll kurerat av { -brand-product-name }-familjen
newtab-recommended-stories-toggle =
    .label = Rekommenderade berättelser
newtab-custom-stories-personalized-toggle =
    .label = Berättelser
newtab-custom-stories-personalized-checkbox-label = Personliga berättelser baserade på din aktivitet
newtab-custom-pocket-sponsored = Sponsrade berättelser
newtab-custom-pocket-show-recent-saves = Visa senast sparade
newtab-custom-recent-title = Senaste aktivitet
newtab-custom-recent-subtitle = Ett urval av senaste webbplatser och innehåll
newtab-custom-weather-toggle =
    .label = Väder
    .description = Dagens prognos i korthet
newtab-custom-widget-weather-toggle =
    .label = Väder
newtab-custom-widget-lists-toggle =
    .label = Listor
newtab-custom-widget-timer-toggle =
    .label = Timer
newtab-custom-widget-sports-toggle =
    .label = VM
newtab-custom-widget-clock-toggle =
    .label = Klocka
newtab-custom-widget-sports-toggle2 =
    .label = Sport
newtab-custom-widget-section-title = Widgetar
newtab-custom-widget-section-toggle =
    .label = Widgetar
newtab-widget-manage-title = Widgetar
newtab-widget-manage-widget-button =
    .label = Hantera widgetar
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Stäng
    .aria-label = Stäng meny
newtab-custom-close-button = Stäng
newtab-custom-settings = Hantera fler inställningar

## New Tab Wallpapers

newtab-wallpaper-title = Bakgrundsbilder
newtab-wallpaper-reset = Återställ till standardvärden
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Ladda upp en bild
newtab-wallpaper-add-an-image = Lägg till en bild
newtab-wallpaper-custom-color = Välj en färg
newtab-wallpaper-toggle-title =
    .label = Bakgrundsbilder
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Bilden överskred gränsen för filstorleken på { $file_size } MB. Prova att ladda upp en mindre fil.
newtab-wallpaper-error-upload-file-type = Vi kunde inte ladda upp din fil. Försök igen med en bildfil.
newtab-wallpaper-error-file-type = Vi kunde inte ladda upp din fil. Försök igen med en annan filtyp.
newtab-wallpaper-light-red-panda = Röd panda
newtab-wallpaper-light-mountain = Vita berg
newtab-wallpaper-light-sky = Himmel med lila och rosa moln
newtab-wallpaper-light-color = Blå, rosa och gula former
newtab-wallpaper-light-landscape = Berglandskap med blå dimma
newtab-wallpaper-light-beach = Strand med palmträd
newtab-wallpaper-dark-aurora = Norrsken
newtab-wallpaper-dark-color = Röda och blå former
newtab-wallpaper-dark-panda = Röd panda dold i skogen
newtab-wallpaper-dark-sky = Stadslandskap med en natthimmel
newtab-wallpaper-dark-mountain = Landskap med berg
newtab-wallpaper-dark-city = Lila stadslandskap
newtab-wallpaper-dark-fox-anniversary = En räv på trottoaren nära en skog
newtab-wallpaper-light-fox-anniversary = En räv i ett gräsbevuxet fält med ett dimmigt bergslandskap

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Enfärgade färger
newtab-wallpaper-colors = Färger
newtab-wallpaper-blue = Blå
newtab-wallpaper-light-blue = Ljusblå
newtab-wallpaper-light-purple = Ljuslila
newtab-wallpaper-light-green = Ljusgrön
newtab-wallpaper-green = Grön
newtab-wallpaper-beige = Beige
newtab-wallpaper-yellow = Gul
newtab-wallpaper-orange = Orange
newtab-wallpaper-pink = Rosa
newtab-wallpaper-light-pink = Ljusrosa
newtab-wallpaper-red = Röd
newtab-wallpaper-dark-blue = Mörkblå
newtab-wallpaper-dark-purple = Mörklila
newtab-wallpaper-dark-green = Mörkgrön
newtab-wallpaper-brown = Brun

## Abstract

newtab-wallpaper-category-title-abstract = Abstrakt
newtab-wallpaper-abstract-green = Gröna former
newtab-wallpaper-abstract-blue = Blå former
newtab-wallpaper-abstract-purple = Lila former
newtab-wallpaper-abstract-orange = Orange former
newtab-wallpaper-gradient-orange = Gradient orange och rosa
newtab-wallpaper-abstract-blue-purple = Blå och lila former
newtab-wallpaper-abstract-white-curves = Vit med skuggade kurvor
newtab-wallpaper-abstract-purple-green = Lila och grön ljusgradient
newtab-wallpaper-abstract-blue-purple-waves = Blå och lila vågiga former
newtab-wallpaper-abstract-black-waves = Svarta vågiga former

## Firefox

newtab-wallpaper-category-title-photographs = Fotografier
newtab-wallpaper-beach-at-sunrise = Strand vid soluppgång
newtab-wallpaper-beach-at-sunset = Strand vid solnedgång
newtab-wallpaper-storm-sky = Stormhimlen
newtab-wallpaper-sky-with-pink-clouds = Himmel med rosa moln
newtab-wallpaper-red-panda-yawns-in-a-tree = Röd panda gäspar i ett träd
newtab-wallpaper-white-mountains = Vita berg
newtab-wallpaper-hot-air-balloons = Blandad färg på luftballonger under dagtid
newtab-wallpaper-starry-canyon = Blå stjärnklar natt
newtab-wallpaper-suspension-bridge = Grå fotografering av helhängbro under dagtid
newtab-wallpaper-sand-dunes = Vita sanddyner
newtab-wallpaper-palm-trees = Silhuett av kokospalmer under gyllene timmen
newtab-wallpaper-blue-flowers = Närbild fotografi av blommor med blå kronblad i blom
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Foto av <a data-l10n-name="name-link">{ $author_string }</a> från <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Prova en skvätt färg
newtab-wallpaper-feature-highlight-content = Ge din Nya flik ett fräscht utseende med bakgrundsbilder.
newtab-wallpaper-feature-highlight-button = Jag förstår
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Ignorera
    .aria-label = Stäng popup
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Rymden
newtab-wallpaper-celestial-lunar-eclipse = Månförmörkelse
newtab-wallpaper-celestial-earth-night = Nattfoto från låg omloppsbana runt jorden
newtab-wallpaper-celestial-starry-sky = Stjärnklara himlen
newtab-wallpaper-celestial-eclipse-time-lapse = Tidsförlopp för månförmörkelse
newtab-wallpaper-celestial-black-hole = Illustration av svarta hål i galaxen
newtab-wallpaper-celestial-river = Satellitbild av floden

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Se prognos i { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Sponsrad
newtab-weather-menu-change-location = Ändra plats
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Sök plats
    .aria-label = Sök plats
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Använd aktuell plats
newtab-weather-menu-weather-display = Vädervisning
newtab-weather-todays-forecast = Dagens prognos
newtab-weather-see-full-forecast = Se fullständig prognos
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Enkel
newtab-weather-menu-change-weather-display-simple = Växla till enkel vy
newtab-weather-menu-weather-display-option-detailed = Detaljerad
newtab-weather-menu-change-weather-display-detailed = Växla till detaljerad vy
newtab-weather-menu-temperature-units = Temperaturenheter
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Byt till Fahrenheit
newtab-weather-menu-change-temperature-units-celsius = Byt till Celsius
newtab-weather-menu-hide-weather = Dölj väder på ny flik
newtab-weather-menu-learn-more = Läs mer
newtab-weather-menu-detect-my-location = Identifiera min plats
# This message is shown if user is working offline
newtab-weather-error-not-available = Väderdata är inte tillgänglig just nu.
newtab-weather-opt-in-see-weather = Vill du se vädret för din plats?
newtab-weather-opt-in-not-now =
    .label = Inte nu
newtab-weather-opt-in-yes =
    .label = Ja
newtab-weather-opt-in-headline = Få din lokala väderprognos
newtab-weather-opt-in-use-location =
    .label = Använd plats
newtab-weather-opt-in-choose-location = Välj plats
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Hög
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Låg
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Se prognos i { $provider }
    .aria-description = { $provider } ∙ Sponsrad

## Topic Labels

newtab-topic-label-business = Företag
newtab-topic-label-career = Karriär
newtab-topic-label-education = Utbildning
newtab-topic-label-arts = Underhållning
newtab-topic-label-food = Livsmedel
newtab-topic-label-health = Hälsa
newtab-topic-label-hobbies = Spel
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Pengar
newtab-topic-label-society-parenting = Föräldraskap
newtab-topic-label-government = Politik
newtab-topic-label-education-science = Vetenskap
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Lifehack
newtab-topic-label-sports = Sport
newtab-topic-label-tech = Teknik
newtab-topic-label-travel = Resa
newtab-topic-label-home = Hem & trädgård

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Välj ämnen för att finjustera ditt flöde
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Välj två eller flera ämnen. Våra expertkuratorer prioriterar nyheter anpassade efter dina intressen. Uppdatera när som helst.
newtab-topic-selection-save-button = Spara
newtab-topic-selection-cancel-button = Avbryt
newtab-topic-selection-button-maybe-later = Kanske senare
newtab-topic-selection-privacy-link = Lär dig hur vi skyddar och hanterar data
newtab-topic-selection-button-update-interests = Uppdatera dina intressen
newtab-topic-selection-button-pick-interests = Välj dina intressen

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Följ
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Följ { $topic }
newtab-section-following-button = Följer
newtab-section-unfollow-button = Sluta följa
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Följer: Sluta följa { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Finjustera ditt flöde
newtab-section-follow-highlight-subtitle = Följ dina intressen för att se mer av vad du gillar.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Blockera
newtab-section-blocked-button = Blockerad
newtab-section-unblock-button = Blockera inte
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Följ { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Sluta följa { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Blockera { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Avblockera { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = Inte nu
newtab-section-confirm-block-topic-p1 = Är du säker på att du vill blockera det här ämnet?
newtab-section-confirm-block-topic-p2 = Blockerade ämnen kommer inte längre att visas i ditt flöde.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Blockera { $topic }
newtab-section-block-cancel-button = Avbryt

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Ämnen
newtab-section-manage-topics-button-v2 =
    .label = Hantera ämnen
newtab-section-mangage-topics-followed-topics = Följd
newtab-section-mangage-topics-followed-topics-empty-state = Du har inte följt några ämnen än.
newtab-section-mangage-topics-blocked-topics = Blockerad
newtab-section-mangage-topics-blocked-topics-empty-state = Du har inte blockerat några ämnen än.
newtab-custom-wallpaper-title = Anpassade bakgrundsbilder finns här
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Ladda upp din egen bakgrundsbild eller välj en anpassad färg för att göra { -brand-product-name } till din.
newtab-custom-wallpaper-cta = Prova den

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Välj en bakgrundsbild för att göra { -brand-product-name } till din
newtab-new-user-custom-wallpaper-subtitle = Få varje ny flik att kännas som hemma med anpassade bakgrunder och färger.
newtab-new-user-custom-wallpaper-cta = Prova det nu

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Nya färska bakgrundsbilder har precis kommit
newtab-wallpaper-feature-highlight-subtitle = Välj din favorit och få varje ny flik att kännas som hemma.
newtab-wallpaper-feature-highlight-cta = Välj bakgrundsbild

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Hämta { -brand-product-name } för mobil
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Skanna koden för att säkert surfa när du är på språng.
newtab-download-mobile-highlight-body-variant-b = Fortsätt där du slutade när du synkroniserar dina flikar, lösenord och mer.
newtab-download-mobile-highlight-body-variant-c = Visste du att du kan ta med { -brand-product-name } när du är på språng? Samma webbläsare. I fickan.
newtab-download-mobile-highlight-image =
    .aria-label = QR-kod för att ladda ner { -brand-product-name } för mobil

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Dina favoriter nära till hands
newtab-shortcuts-highlight-subtitle = Lägg till en genväg så att du har dina favoritwebbplatser bara ett klick bort.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Varför anmäler du detta?
newtab-report-ads-reason-not-interested =
    .label = Jag är inte intresserad
newtab-report-ads-reason-inappropriate =
    .label = Det är olämpligt
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Jag har sett den alldeles för många gånger
newtab-report-content-wrong-category =
    .label = Fel kategori
newtab-report-content-outdated =
    .label = Föråldrad
newtab-report-content-inappropriate-offensive =
    .label = Olämplig eller kränkande
newtab-report-content-spam-misleading =
    .label = Skräppost eller vilseledande
newtab-report-content-requires-payment-subscription =
    .label = Kräver betalning eller abonnemang
newtab-report-content-requires-payment-subscription-learn-more = Läs mer
newtab-report-cancel = Avbryt
newtab-report-submit = Skicka in
newtab-toast-thanks-for-reporting =
    .message = Tack för att du rapporterade detta.
newtab-toast-widgets-hidden =
    .message = Välj pennikonen för att lägga till widgetar igen när som helst.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Du följer nu { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Du följer inte längre { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Du ser inte berättelser om { $topic } längre.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Möjligheterna är oändliga. Lägg till en.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Ny
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Slutförd ({ $number })
newtab-widget-lists-celebration-headline = Bra jobbat
newtab-widget-lists-celebration-subhead = Allt klart
newtab-widget-task-list-menu-copy = Kopiera
newtab-widget-lists-menu-edit = Redigera listnamn
newtab-widget-lists-menu-edit2 =
    .aria-label = Redigera listnamn
newtab-widget-lists-menu-create = Skapa en ny lista
newtab-widget-lists-menu-delete = Ta bort denna lista
newtab-widget-lists-menu-copy = Kopiera lista till urklipp
newtab-widget-lists-menu-learn-more = Läs mer
newtab-widget-lists-button-add-item = Lägg till ett objekt
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Lägg till ett objekt
    .aria-label = Lägg till ett objekt
newtab-widget-lists-input-error = Inkludera text för att lägga till ett objekt.
newtab-widget-lists-input-menu-open-link = Öppna länk
newtab-widget-lists-input-menu-move-up = Flytta upp
newtab-widget-lists-input-menu-move-down = Flytta ned
newtab-widget-lists-input-menu-delete = Ta bort
newtab-widget-lists-input-menu-edit = Redigera
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Redigera objekt
newtab-widget-lists-edit-clear =
    .aria-label = Avbryt
    .title = Avbryt
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Skapa en ny lista
newtab-widget-lists-name-label-default =
    .label = Uppgiftslista
newtab-widget-lists-name-label-checklist =
    .label = Checklista
newtab-widget-lists-name-placeholder-default =
    .placeholder = Uppgiftslista
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Checklista
    .aria-label = Redigera listnamn
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Ny lista
    .aria-label = Redigera listnamn
newtab-widget-section-title = Widgetar
newtab-widget-menu-hide = Dölj widget
newtab-widget-menu-change-size = Ändra storlek
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Flytta
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Vänster
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Höger
newtab-widget-size-small = Liten
newtab-widget-size-medium = Medium
newtab-widget-size-large = Stor
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Dölj widgetar
    .aria-label = Dölj alla widgetar
newtab-widget-section-maximize =
    .title = Expandera widgetar
    .aria-label = Expandera alla widgetar till full storlek
newtab-widget-section-minimize =
    .title = Minimera widgets
    .aria-label = Komprimera alla widgetar till kompakt storlek
newtab-widget-section-menu-button =
    .title = Widgetmeny
    .aria-label = Öppna widgetmenyn
newtab-widget-add-widgets-button =
    .aria-label = Lägg till widget
    .title = Lägg till widget
newtab-widget-section-menu-manage = Hantera widgetar
newtab-widget-section-menu-hide-all = Dölj widgetar
newtab-widget-section-menu-learn-more = Läs mer
newtab-widget-section-feedback = Berätta vad du tycker
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Visa fler widgetar
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Visa färre widgetar
newtab-widget-lists-name-default = Checklista

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Timer
newtab-widget-timer-notification-focus = Fokustiden är ute. Bra jobbat. Behöver du en paus?
newtab-widget-timer-notification-break = Din paus är över. Redo att fokusera?
newtab-widget-timer-notification-warning = Aviseringar är avstängda
newtab-widget-timer-mode-focus =
    .label = Fokus
newtab-widget-timer-mode-break =
    .label = Paus
newtab-widget-timer-label-play =
    .label = Spela
newtab-widget-timer-label-pause =
    .label = Pausa
newtab-widget-timer-reset =
    .title = Återställ
newtab-widget-timer-menu-notifications = Stäng av aviseringar
newtab-widget-timer-menu-notifications-on = Slå på aviseringar
newtab-widget-timer-menu-learn-more = Läs mer
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Topprubriker
newtab-daily-briefing-card-menu-dismiss = Ignorera
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Uppdaterad för { $minutes } minuter sedan
newtab-widget-message-title = Håll fokus med listor och en inbyggd timer
# to-dos stands for "things to do".
newtab-widget-message-copy = Från snabba påminnelser till dagliga att-göra-uppgifter, fokussessioner till stretchpauser — håll dig fokuserad och i tid.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = En plats för fokus, prognoser och mer
newtab-widget-message-focus-forecasts-body = Håll dagen i rullning med { -brand-product-name } widgets. Kontrollera prognosen, håll koll eller spåra tiden över hela världen.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Gör { -brand-product-name } till din
newtab-promo-card-body-addons = Välj en bakgrund ur vår samling eller skapa din egen.
newtab-promo-card-cta-addons = Testa på en gång
newtab-promo-card-title = Stöd { -brand-product-name }
newtab-promo-card-body = Våra sponsorer stöder vårt uppdrag att bygga en bättre webb
newtab-promo-card-cta = Läs mer
newtab-promo-card-dismiss-button =
    .title = Ignorera
    .aria-label = Ignorera

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
           *[other] Starta { $minutes }-minuters timer
        }
newtab-widget-timer-pause-aria =
    .aria-label = Pausa timer
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } minut
           *[other] { $minutes } minuter
        }
newtab-widget-timer-decrease-min =
    .title = Minska med 1 minut
newtab-widget-timer-increase-min =
    .title = Öka med 1 minut
newtab-widget-timer-mode-group =
    .aria-label = Timerläge
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Fokus
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Paus
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Dölj timer
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Bra jobbat
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Din paus är över
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Behöver du en paus?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Redo att fokusera?

##

newtab-sports-widget-menu-follow-teams = Följ lag
newtab-sports-widget-menu-view-schedule = Visa schema
newtab-sports-widget-menu-view-upcoming = Visa kommande
newtab-sports-widget-menu-view-results = Visa resultat
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Viktiga datum
newtab-sports-widget-menu-learn-more = Läs mer
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Håll koll på VM
newtab-sports-widget-get-updates = Få liveuppdateringar om matcher och mycket mer.
newtab-sports-widget-view-schedule =
    .label = Visa schema
newtab-sports-widget-follow-teams =
    .label = Följ lag
newtab-sports-widget-view-matches =
    .label = Visa träffar
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Följ upp till { $number } lag
       *[other] Följ upp till { $number } lag
    }
newtab-sports-widget-choose-wallpaper =
    .label = Välj en bakgrundsbild
newtab-sports-widget-skip = Hoppa över
newtab-sports-widget-search-country =
    .placeholder = Sök land
    .aria-label = Sök land
newtab-sports-widget-cancel = Avbryt
newtab-sports-widget-back-button =
    .aria-label = Tillbaka
newtab-sports-widget-done-button =
    .label = Klar
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (utslaget)
newtab-sports-widget-view-all =
    .label = Visa alla
newtab-sports-widget-show-less =
    .label = Visa mindre
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Endast följda team
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Titta
    .title = Titta live
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Titta live
    .title = Titta live
newtab-sports-widget-watch-dialog-close =
    .aria-label = Stäng
    .title = Stäng
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Gratis
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Gratis provperiod
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Gratis och betald
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Betalt
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Endast utvalda spel
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Tillgänglig i din region
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Andra regioner
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Öppna strömning
    .title = Öppna strömning
newtab-sports-widget-group-stage = Gruppspel
newtab-sports-widget-group-a = Grupp A
newtab-sports-widget-group-b = Grupp B
newtab-sports-widget-group-c = Grupp C
newtab-sports-widget-group-d = Grupp D
newtab-sports-widget-group-e = Grupp E
newtab-sports-widget-group-f = Grupp F
newtab-sports-widget-group-g = Grupp G
newtab-sports-widget-group-h = Grupp H
newtab-sports-widget-group-i = Grupp I
newtab-sports-widget-group-j = Grupp J
newtab-sports-widget-group-k = Grupp K
newtab-sports-widget-group-l = Grupp L
newtab-sports-widget-round-32 = Sextondelsfinal
newtab-sports-widget-round-16 = Åttondelsfinal
newtab-sports-widget-quarter-finals = Kvartsfinaler
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = LIVE
newtab-custom-widget-live-refresh =
    .title = Uppdatera poäng
    .aria-label = Uppdatera poäng
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Viktiga datum
newtab-sports-widget-upcoming = Kommande
# Used for a match currently ongoing
newtab-sports-widget-now = Nu
newtab-sports-widget-results = Resultat
newtab-sports-widget-semi-finals = Semifinaler
newtab-sports-widget-bronze-finals = Bronsfinal
# Final is the final match for 1st place.
newtab-sports-widget-final = Final
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Försenad
newtab-sports-widget-postponed = Uppskjuten
newtab-sports-widget-suspended = Avstängd
newtab-sports-widget-cancelled = Avbruten
newtab-sports-widget-information = Information om matchen
newtab-sports-widget-no-live-data = Live matchdata uppdateras inte just nu
newtab-sports-widget-view-results-link = Visa resultat
newtab-sports-widget-third-place = Tredje plats
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Tvåa
newtab-sports-widget-champions = Mästare
newtab-sports-widget-world-cup-champions = Världsmästare 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Heltid
newtab-sports-widget-match-halftime = Halvtid
newtab-sports-widget-match-extra-time = Förlängning
newtab-sports-widget-match-penalties = Straffar
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = mot
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Håll ögonen öppna för detaljer om kommande matcher

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Föregående
    .title = Föregående
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Nästa
    .title = Nästa
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Livematch { $index } av { $total }
    .title = Livematch { $index } av { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } mot { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) mot { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Live: { $homeTeam }, { $homeScore } mot { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } mot { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } mot { $awayTeam }, försenad
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } mot { $awayTeam }, uppskjuten
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } mot { $awayTeam }, avstängd
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } mot { $awayTeam }, avbruten

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosnien och Hercegovina
newtab-sports-widget-team-name-label-civ =
    .label = Elfenbenskusten
newtab-sports-widget-team-name-label-cod =
    .label = DR Kongo
newtab-sports-widget-team-name-label-eng =
    .label = Storbritannien
newtab-sports-widget-team-name-label-sco =
    .label = Skottland
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Kommer att bestämmas

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Sparka igång VM med nya bakgrundsbilder
newtab-sports-widget-message-wallpapers-body = Ta med lite energi till din webbläsare under tävlingen.
newtab-sports-widget-message-wallpapers-cta = Välj bakgrundsbild
newtab-sports-widget-message-add-widgets-cta =
    .label = Lägg till widgetar
newtab-sports-widget-message-day-in-play-title = Håll igång dagen med { -brand-product-name } widgets
newtab-sports-widget-message-day-in-play-body = Följ VM, håll fokus, registrera tiden runt om i världen och mycket mer.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Utforska widgetar

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Ignorera
    .aria-label = Ignorera
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Gör detta utrymme till ditt
newtab-activation-window-message-customization-focus-message = Välj en ny bakgrundsbild, lägg till genvägar till dina favoritsajter och håll dig uppdaterad om berättelser som intresserar dig.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Börja anpassa
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Det här utrymmet följer dina regler
newtab-activation-window-message-values-focus-message = Med { -brand-product-name } kan du surfa precis som du vill, med ett mer personligt sätt att börja dagen online. Gör { -brand-product-name } till din egen.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Dölj klocka
newtab-clock-widget-menu-learn-more = Läs mer
newtab-clock-widget-menu-edit = Redigera klockor
newtab-clock-widget-menu-switch-to-12h = Växla till 12-timmarsformat
newtab-clock-widget-menu-switch-to-24h = Växla till 24-timmarsformat
newtab-clock-widget-label-your-clocks = Dina klockor
newtab-clock-widget-search-location-input =
    .label = Plats
    .placeholder = Sök efter en stad
    .aria-label = Sök efter en stad
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Smeknamn (valfritt)
    .placeholder = Lägg till ett smeknamn
    .aria-label = Smeknamn (valfritt)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Lägg till ny klocka
    .aria-label = Lägg till ny klocka
newtab-clock-widget-button-add-clock = Lägg till
newtab-clock-widget-button-cancel = Avbryt
newtab-clock-widget-button-back =
    .title = Tillbaka
    .aria-label = Tillbaka
newtab-clock-widget-button-edit-clock =
    .title = Redigera klocka
    .aria-label = Redigera klocka
newtab-clock-widget-button-save = Spara
newtab-clock-widget-button-remove-clock =
    .title = Ta bort klocka
    .aria-label = Ta bort klocka
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
    .aria-label = { $city }, smeknamn: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Lägg till klocka
newtab-clock-widget-edit-clock-form =
    .aria-label = Redigera klocka
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Sökresultat
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Inga matchningar
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Öppna menyn för klocka
    .aria-label = Öppna menyn för klocka
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Smeknamn: { $nickname }
