# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Ny fane
newtab-settings-button =
    .title = Tilpass siden for Ny fane
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Tilpass denne siden
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Tilpass
newtab-customize-panel-label =
    .label = Tilpass
newtab-personalize-settings-icon-label =
    .title = Tilpass ny fane
    .aria-label = Innstillinger
newtab-settings-dialog-label =
    .aria-label = Innstillinger
newtab-personalize-icon-label =
    .title = Tilpass ny fane-side
    .aria-label = Tilpass ny fane-side
newtab-personalize-dialog-label =
    .aria-label = Tilpass
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Ignorer
    .aria-label = Ignorer

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Startside
home-homepage-new-windows =
    .label = Nye vinduer
home-homepage-new-tabs =
    .label = Nye faner
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Velg et bestemt nettsted

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Nettadresse(r)
home-custom-homepage-address =
    .placeholder = Skriv inn adresse
home-custom-homepage-address-button =
    .label = Legg til adresse
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Ingen nettsteder lagt til ennå.
home-custom-homepage-delete-address-button =
    .aria-label = Slett adresse
    .title = Slett adresse
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Erstatt med
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Gjeldende åpnede sider
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Bokmerker…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Søk
home-prefs-stories-header2 =
    .label = Artikler
    .description = Enestående innhold kuratert av { -brand-product-name }-familien
home-prefs-widgets-header =
    .label = Widgeter
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Lister
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Nedtelling
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Sport
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Klokke
home-prefs-mission-message2 =
    .message = Våre sponsorer støtter vårt oppdrag om å bygge et bedre internett.
home-prefs-manage-topics-link2 =
    .label = Behandle emner
home-prefs-choose-wallpaper-link2 =
    .label = Velg et bakgrunnsbilde
home-prefs-firefox-logo-header =
    .label = { -brand-short-name }-logo
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = For å bruke disse funksjonene må du sette nye faner eller nye vinduer til { -firefox-home-brand-name }.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } rekke
           *[other] { $num } rekker
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Utvidelse ({ $extension })
home-restore-defaults-srd =
    .label = Bruk standard
    .accesskey = r
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (standard)
home-mode-choice-custom-srd =
    .label = Tilpassede nettadresser…
home-mode-choice-blank-srd =
    .label = Blank side
home-prefs-shortcuts-header-srd =
    .label = Snarveier
home-prefs-shortcuts-select =
    .aria-label = Snarveier
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Sponsede snarveier
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Sponsede historier
home-prefs-highlights-option-visited-pages-srd =
    .label = Besøkte nettsider
home-prefs-highlights-options-bookmarks-srd =
    .label = Bokmerker
home-prefs-highlights-option-most-recent-download-srd =
    .label = Siste nedlasting
home-prefs-recent-activity-header-srd =
    .label = Nylig aktivitet
home-prefs-recent-activity-select =
    .aria-label = Nylig aktivitet
home-prefs-weather-header-srd =
    .label = Vær
home-prefs-support-firefox-header-srd =
    .label = Støtt { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = Finn ut hvordan

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Søk
    .aria-label = Søk
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Søk med { $engine } eller skriv inn adresse
newtab-search-box-handoff-text-no-engine = Søk eller skriv inn adresse
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Søk med { $engine } eller skriv inn adresse
    .title = Søk med { $engine } eller skriv inn adresse
    .aria-label = Søk med { $engine } eller skriv inn adresse
newtab-search-box-handoff-input-no-engine =
    .placeholder = Søk eller skriv inn adresse
    .title = Søk eller skriv inn adresse
    .aria-label = Søk eller skriv inn adresse
newtab-search-box-text = Søk på nettet
newtab-search-box-input =
    .placeholder = Søk på nettet
    .aria-label = Søk på nettet

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Legg til søkemotor
newtab-topsites-add-shortcut-header = Ny snarvei
newtab-topsites-edit-topsites-header = Rediger toppsted
newtab-topsites-edit-shortcut-header = Rediger snarvei
newtab-topsites-add-shortcut-label = Legg til snarvei
newtab-topsites-add-shortcut-title =
    .title = Legg til snarvei
    .aria-label = Legg til snarvei
newtab-topsites-title-label = Tittel
newtab-topsites-title-input =
    .placeholder = Oppgi en tittel
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Skriv eller lim inn en URL
newtab-topsites-url-validation = Gyldig URL er nødvendig
newtab-topsites-image-url-label = Egendefinert bilde-URL
newtab-topsites-use-image-link = Bruk et egendefinert bilde…
newtab-topsites-image-validation = Kunne ikke lese inn bildet. Prøv en annen URL.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Fjern tekst

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Avbryt
newtab-topsites-delete-history-button = Slett fra historikk
newtab-topsites-save-button = Lagre
newtab-topsites-preview-button = Forhåndsvis
newtab-topsites-add-button = Legg til

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Er du sikker på at du vil slette alle forekomster av denne siden fra historikken?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Denne handlingen kan ikke angres.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Sponset

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (festet)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Åpne meny
    .aria-label = Åpne meny
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Fjern
    .aria-label = Fjern
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Åpne meny
    .aria-label = Åpne kontekstmeny for { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Rediger denne nettsiden
    .aria-label = Rediger denne nettsiden

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Rediger
newtab-menu-open-new-window = Åpne i nytt vindu
newtab-menu-open-new-private-window = Åpne i nytt privat vindu
newtab-menu-dismiss = Avslå
newtab-menu-pin = Fest
newtab-menu-unpin = Løsne
newtab-menu-delete-history = Slett fra historikk
newtab-menu-save-to-pocket = Lagre til { -pocket-brand-name }
newtab-menu-delete-pocket = Slett fra { -pocket-brand-name }
newtab-menu-archive-pocket = Arkiver i { -pocket-brand-name }
newtab-menu-show-privacy-info = Våre sponsorer og ditt personvern
newtab-menu-about-fakespot = Om { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Rapporter
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Blokker
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Slutt å følge
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Les mer
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Slutt å følge emnet

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Behandle sponset innhold
newtab-menu-our-sponsors-and-your-privacy = Våre sponsorer og ditt personvern
newtab-menu-report-this-ad = Rapporter denne annonsen

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Ferdig
newtab-privacy-modal-button-manage = Behandle innstillinger for sponset innhold
newtab-privacy-modal-header = Personvernet ditt er viktig.
newtab-privacy-modal-paragraph-2 =
    I tillegg til å servere fengslende artikler, viser vi deg også relevant og
    høyt kontrollert innhold fra utvalgte sponsorer. Du kan være sikker på, <strong>at dine surfedata
    aldri forlater ditt personlige eksemplar av  { -brand-product-name }</strong> — vi ser dem ikke, og sponsorerene våre ser dem ikke heller.
newtab-privacy-modal-link = Les mer om hvordan personvernet fungerer på den nye fanen

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Fjern bokmerke
# Bookmark is a verb here.
newtab-menu-bookmark = Bokmerke

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Kopier nedlastingslenke
newtab-menu-go-to-download-page = Gå til nedlastingssiden
newtab-menu-remove-download = Fjern fra historikk

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Vis i Finder
       *[other] Åpne mappen med filen
    }
newtab-menu-open-file = Åpne fil

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Besøkt
newtab-label-bookmarked = Bokmerket
newtab-label-removed-bookmark = Bokmerke fjernet
newtab-label-recommended = Trender
newtab-label-saved = Lagret til { -pocket-brand-name }
newtab-label-download = Lastet ned
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Sponset
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Sponset av { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Sponset

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Fjern seksjon
newtab-section-menu-collapse-section = Slå sammen seksjon
newtab-section-menu-expand-section = Utvid seksjon
newtab-section-menu-manage-section = Håndter seksjon
newtab-section-menu-manage-webext = Behandle utvidelse
newtab-section-menu-add-topsite = Legg til toppsted
newtab-section-menu-add-search-engine = Legg til søkemotor
newtab-section-menu-move-up = Flytt opp
newtab-section-menu-move-down = Flytt ned
newtab-section-menu-privacy-notice = Personvernerklæring

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Slå sammen seksjon
newtab-section-expand-section-label =
    .aria-label = Utvid seksjon

## Section Headers.

newtab-section-header-topsites = Mest besøkte nettsteder
newtab-section-header-recent-activity = Nylig aktivitet
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Anbefalt av { $provider }
newtab-section-header-stories = Tankevekkende artikler
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Dagens utvalgte artikler for deg

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Begynn å surfe, og vi viser noen av de beste artiklene, videoer og andre sider du nylig har besøkt eller bokmerket her.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Du har tatt igjen. Kom tilbake senere for flere topphistorier fra { $provider }. Kan du ikke vente? Velg et populært emne for å finne flere gode artikler fra hele Internett.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Du har nå lest alt. Kom tilbake senere for flere artikler. Kan du ikke vente? Velg et populært emne for å finne flere flotte artikler fra nettet.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Du har lest alt!
newtab-discovery-empty-section-topstories-content = Kom tilbake senere for flere artikler.
newtab-discovery-empty-section-topstories-try-again-button = Prøv igjen
newtab-discovery-empty-section-topstories-loading = Laster…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Ops! Vi lastet nesten denne delen, men ikke helt.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Populære emner:
newtab-pocket-new-topics-title = Vil du ha enda flere artikler? Se disse populære emnene fra { -pocket-brand-name }
newtab-pocket-more-recommendations = Flere anbefalinger
newtab-pocket-learn-more = Les mer
newtab-pocket-cta-button = Hent { -pocket-brand-name }
newtab-pocket-cta-text = Lagre artiklene du synes er interessante i { -pocket-brand-name }, og stimuler dine tanker med fasinerende lesermateriell.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } er en del av { -brand-product-name }-familien.
newtab-pocket-save = Lagre
newtab-pocket-saved = Lagret

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Mer som dette
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Ikke for meg
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Takk. Tilbakemeldingen din vil hjelpe oss med å forbedre kilden din.
newtab-toast-dismiss-button =
    .title = Lukk
    .aria-label = Lukk

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Oppdag det beste fra nettet
newtab-pocket-onboarding-cta = { -pocket-brand-name } utforsker et mangfold av publikasjoner for å få det mest informative, inspirerende og pålitelige innholdet rett til { -brand-product-name }-nettleseren din.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Ups, noe gikk galt når innholdet skulle lastes inn.
newtab-error-fallback-refresh-link = Oppdater siden for å prøve igjen.

## Customization Menu

newtab-custom-shortcuts-title = Snarveier
newtab-custom-shortcuts-subtitle = Nettsteder du lagrer eller besøker
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Snarveier
    .description = Nettsteder du lagrer eller besøker
newtab-custom-shortcuts-nova =
    .label = Snarveier
newtab-custom-row-description =
    .description = Antall rader
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
newtab-custom-sponsored-sites = Sponsede snarveier
newtab-custom-pocket-title = Anbefalt av { -pocket-brand-name }
newtab-custom-pocket-subtitle = Eksepsjonelt innhold satt sammen av { -pocket-brand-name }, en del av { -brand-product-name }-familien
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Anbefalte artikler
    .description = Enestående innhold kuratert av { -brand-product-name }-familien
newtab-recommended-stories-toggle =
    .label = Anbefalte artikler
newtab-custom-stories-personalized-toggle =
    .label = Artikler
newtab-custom-stories-personalized-checkbox-label = Personlige artikler basert på aktiviteten din
newtab-custom-pocket-sponsored = Sponsede historier
newtab-custom-pocket-show-recent-saves = Se sist lagrede
newtab-custom-recent-title = Nylig aktivitet
newtab-custom-recent-subtitle = Et utvalg av nylige nettsteder og innhold
newtab-custom-weather-toggle =
    .label = Vær
    .description = Dagens værmelding i korte trekk
newtab-custom-widget-weather-toggle =
    .label = Vær
newtab-custom-widget-lists-toggle =
    .label = Lister
newtab-custom-widget-timer-toggle =
    .label = Nedtelling
newtab-custom-widget-sports-toggle =
    .label = VM
newtab-custom-widget-clock-toggle =
    .label = Klokke
newtab-custom-widget-sports-toggle2 =
    .label = Sport
newtab-custom-widget-section-title = Widgeter
newtab-custom-widget-section-toggle =
    .label = Widgeter
newtab-widget-manage-title = Widgeter
newtab-widget-manage-widget-button =
    .label = Behandle widgeter
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Lukk
    .aria-label = Lukk meny
newtab-custom-close-button = Lukk
newtab-custom-settings = Behandle flere innstillinger

## New Tab Wallpapers

newtab-wallpaper-title = Bakgrunnsbilder
newtab-wallpaper-reset = Tilbakestill til standard
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Last opp et bilde
newtab-wallpaper-add-an-image = Legg til et bilde
newtab-wallpaper-custom-color = Velg en farge
newtab-wallpaper-toggle-title =
    .label = Bakgrunnsbilder
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Bildet overskred filstørrelsesgrensen på { $file_size } MB. Prøv å laste opp en mindre fil.
newtab-wallpaper-error-upload-file-type = Vi kunne ikke laste opp filen din. Prøv igjen med en bildefil.
newtab-wallpaper-error-file-type = Vi kunne ikke laste opp filen din. Prøv igjen med en annen filtype.
newtab-wallpaper-light-red-panda = Rødpanda
newtab-wallpaper-light-mountain = Hvitt fjell
newtab-wallpaper-light-sky = Himmel med lilla og rosa skyer
newtab-wallpaper-light-color = Blå, rosa og gule former
newtab-wallpaper-light-landscape = Blå tåke fjellandskap
newtab-wallpaper-light-beach = Strand med palmetre
newtab-wallpaper-dark-aurora = Nordlys
newtab-wallpaper-dark-color = Røde og blå former
newtab-wallpaper-dark-panda = Rødpanda gjemt i skogen
newtab-wallpaper-dark-sky = Bylandskap med nattehimmel
newtab-wallpaper-dark-mountain = Landskap fjell
newtab-wallpaper-dark-city = Lilla bylandskap
newtab-wallpaper-dark-fox-anniversary = En rev på fortauet nær en skog
newtab-wallpaper-light-fox-anniversary = En rev i en gressmark med et tåkete fjellandskap

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Ensfarget
newtab-wallpaper-colors = Farger
newtab-wallpaper-blue = Blå
newtab-wallpaper-light-blue = Lyseblå
newtab-wallpaper-light-purple = Lyselilla
newtab-wallpaper-light-green = Lysegrønn
newtab-wallpaper-green = Grønn
newtab-wallpaper-beige = Beige
newtab-wallpaper-yellow = Gul
newtab-wallpaper-orange = Oransje
newtab-wallpaper-pink = Rosa
newtab-wallpaper-light-pink = Lyserosa
newtab-wallpaper-red = Rød
newtab-wallpaper-dark-blue = Mørkeblå
newtab-wallpaper-dark-purple = Mørkelilla
newtab-wallpaper-dark-green = Mørkegrønn
newtab-wallpaper-brown = Brun

## Abstract

newtab-wallpaper-category-title-abstract = Abstrakt
newtab-wallpaper-abstract-green = Grønne former
newtab-wallpaper-abstract-blue = Blåe former
newtab-wallpaper-abstract-purple = Lilla former
newtab-wallpaper-abstract-orange = Oransje former
newtab-wallpaper-gradient-orange = Fargeovergang oransje og rosa
newtab-wallpaper-abstract-blue-purple = Blå og lilla former
newtab-wallpaper-abstract-white-curves = Hvit med skraverte kurver
newtab-wallpaper-abstract-purple-green = Fargeovergang med lilla og grønt lys
newtab-wallpaper-abstract-blue-purple-waves = Blå og lilla bølgete former
newtab-wallpaper-abstract-black-waves = Svarte bølgeformer

## Firefox

newtab-wallpaper-category-title-photographs = Fotografier
newtab-wallpaper-beach-at-sunrise = Strand ved soloppgang
newtab-wallpaper-beach-at-sunset = Strand ved solnedgang
newtab-wallpaper-storm-sky = Stormhimmel
newtab-wallpaper-sky-with-pink-clouds = Himmel med rosa skyer
newtab-wallpaper-red-panda-yawns-in-a-tree = Rød panda som gjesper i et tre
newtab-wallpaper-white-mountains = Hvite fjell
newtab-wallpaper-hot-air-balloons = Varmluftsballonger i forskjellige farger på dagtid
newtab-wallpaper-starry-canyon = Blå stjerneklar natt
newtab-wallpaper-suspension-bridge = Bilde av en grå hengebro om dagen
newtab-wallpaper-sand-dunes = Hvite sanddyner
newtab-wallpaper-palm-trees = Silhuett av kokospalmer under den gyldne timen
newtab-wallpaper-blue-flowers = Nærbilde av blåblomstrede blomster i full blomst
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Bilde av <a data-l10n-name="name-link">{ $author_string }</a> på <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Prøv en fargeklatt
newtab-wallpaper-feature-highlight-content = Gi ny fane-siden et friskt utseende med bakgrunnsbilder.
newtab-wallpaper-feature-highlight-button = Jeg forstår
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Lukk
    .aria-label = Lukk sprettoppvindu
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Rommet
newtab-wallpaper-celestial-lunar-eclipse = Måneformørkelse
newtab-wallpaper-celestial-earth-night = Nattbilde fra lav jordbane
newtab-wallpaper-celestial-starry-sky = Stjernehimmel
newtab-wallpaper-celestial-eclipse-time-lapse = Tidsforløpet til en måneformørkelse
newtab-wallpaper-celestial-black-hole = Illustrasjon av en galakse med et sort hull
newtab-wallpaper-celestial-river = Satellittbilde av elv

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Se værmelding hos { $provider }.
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Sponset
newtab-weather-menu-change-location = Endre plassering
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Søk plassering
    .aria-label = Søk plassering
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Bruk gjeldende posisjon
newtab-weather-menu-weather-display = Værvisning
newtab-weather-todays-forecast = Dagens værmelding
newtab-weather-see-full-forecast = Se fullstendig værmelding
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Enkel
newtab-weather-menu-change-weather-display-simple = Bytt til enkel visning
newtab-weather-menu-weather-display-option-detailed = Detaljert
newtab-weather-menu-change-weather-display-detailed = Bytt til detaljert visning
newtab-weather-menu-temperature-units = Temperaturenheter
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Bytt til Fahrenheit
newtab-weather-menu-change-temperature-units-celsius = Bytt til Celsius
newtab-weather-menu-hide-weather = Skjul været på ny fane
newtab-weather-menu-learn-more = Les mer
newtab-weather-menu-detect-my-location = Oppdag posisjonen min
# This message is shown if user is working offline
newtab-weather-error-not-available = Værdata er ikke tilgjengelig akkurat nå.
newtab-weather-opt-in-see-weather = Vil du se været for din plassering?
newtab-weather-opt-in-not-now =
    .label = Ikke nå
newtab-weather-opt-in-yes =
    .label = Ja
newtab-weather-opt-in-headline = Få din lokale værmelding
newtab-weather-opt-in-use-location =
    .label = Bruk plassering
newtab-weather-opt-in-choose-location = Velg plassering
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York City
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Høy
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Lav
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Se værmelding hos { $provider }.
    .aria-description = { $provider } ∙ Sponset

## Topic Labels

newtab-topic-label-business = Forretning
newtab-topic-label-career = Karriere
newtab-topic-label-education = Utdannelse
newtab-topic-label-arts = Underholdning
newtab-topic-label-food = Mat
newtab-topic-label-health = Helse
newtab-topic-label-hobbies = Spill
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Penger
newtab-topic-label-society-parenting = Foreldreskap
newtab-topic-label-government = Politikk
newtab-topic-label-education-science = Vitenskap
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Life hacks
newtab-topic-label-sports = Sport
newtab-topic-label-tech = Teknologi
newtab-topic-label-travel = Reise
newtab-topic-label-home = Hjem og hage

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Velg emner for å finjustere kilden din
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Velg to eller flere emner. Våre ekspertkuratorer prioriterer artikler tilpasset dine interesser. Oppdater når som helst.
newtab-topic-selection-save-button = Lagre
newtab-topic-selection-cancel-button = Avbryt
newtab-topic-selection-button-maybe-later = Kanskje senere
newtab-topic-selection-privacy-link = Finn ut hvordan vi beskytter og behandler data
newtab-topic-selection-button-update-interests = Oppdater dine interesser
newtab-topic-selection-button-pick-interests = Velg dine interesser

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Følge
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Følg { $topic }
newtab-section-following-button = Følger
newtab-section-unfollow-button = Slutt å følge
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Følger: Slutt å følge { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Finjuster kilden din
newtab-section-follow-highlight-subtitle = Følg interessene dine for å se mer av det du liker.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Blokker
newtab-section-blocked-button = Blokkert
newtab-section-unblock-button = Opphev blokkering
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Følg { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Slutt å følge { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Blokker { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Opphev blokkering av { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = Ikke nå
newtab-section-confirm-block-topic-p1 = Er du sikker på at du vil blokkere dette emnet?
newtab-section-confirm-block-topic-p2 = Blokkerte emner vil ikke lenger vises i kilden din.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Blokker { $topic }
newtab-section-block-cancel-button = Avbryt

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Emner
newtab-section-manage-topics-button-v2 =
    .label = Behandle emner
newtab-section-mangage-topics-followed-topics = Fulgt
newtab-section-mangage-topics-followed-topics-empty-state = Du har ikke fulgt noen emner ennå.
newtab-section-mangage-topics-blocked-topics = Blokkert
newtab-section-mangage-topics-blocked-topics-empty-state = Du har ikke blokkert noen emner ennå.
newtab-custom-wallpaper-title = Nå kan du velge din egen bakgrunn
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Last opp ditt eget bakgrunnsbilde eller velg en egendefinert farge for å gjøre { -brand-product-name } til ditt eget.
newtab-custom-wallpaper-cta = Prøv det

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Velg et bakgrunnsbilde for å gjøre { -brand-product-name } til din egen
newtab-new-user-custom-wallpaper-subtitle = Få hver nye fane til å føles som hjemme med tilpassede bakgrunner og farger.
newtab-new-user-custom-wallpaper-cta = Prøv det nå

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Nye bakgrunnsbilder er nå tilgjengelige
newtab-wallpaper-feature-highlight-subtitle = Velg favoritten din og få hver ny fane til å føles som hjemme
newtab-wallpaper-feature-highlight-cta = Velg bakgrunnsbilde

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Last ned { -brand-product-name } for mobil
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Skann koden for å surfe trygt på farten.
newtab-download-mobile-highlight-body-variant-b = Fortsett der du sluttet når du synkroniserer faner, passord og mer.
newtab-download-mobile-highlight-body-variant-c = Visste du at du kan ta med deg { -brand-product-name } på farten? Samme nettleser. I lommen.
newtab-download-mobile-highlight-image =
    .aria-label = QR-kode for å laste ned { -brand-product-name } for mobil

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Dine favoritter lett tilgjengelig
newtab-shortcuts-highlight-subtitle = Legg til en snarvei for å ha favorittnettstedene dine ett klikk unna.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Hvorfor rapporterer du dette?
newtab-report-ads-reason-not-interested =
    .label = Jeg er ikke interessert
newtab-report-ads-reason-inappropriate =
    .label = Det er upassende
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Jeg har sett det for mange ganger
newtab-report-content-wrong-category =
    .label = Feil kategori
newtab-report-content-outdated =
    .label = Utdatert
newtab-report-content-inappropriate-offensive =
    .label = Upassende eller støtende
newtab-report-content-spam-misleading =
    .label = Spam eller villedende
newtab-report-content-requires-payment-subscription =
    .label = Krever betaling eller abonnement
newtab-report-content-requires-payment-subscription-learn-more = Les mer
newtab-report-cancel = Avbryt
newtab-report-submit = Send
newtab-toast-thanks-for-reporting =
    .message = Takk for at du rapporterte dette.
newtab-toast-widgets-hidden =
    .message = Velg blyantikonet for å legge til widgeter igjen når som helst.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Du følger nå { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Du følger ikke lenger { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Du vil ikke lenger se saker om { $topic }.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Mulighetene er uendelige. Legg til én.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Ny
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Fullført ({ $number })
newtab-widget-lists-celebration-headline = Bra jobbet
newtab-widget-lists-celebration-subhead = Alt klart
newtab-widget-task-list-menu-copy = Kopier
newtab-widget-lists-menu-edit = Rediger listenavn
newtab-widget-lists-menu-edit2 =
    .aria-label = Rediger listenavn
newtab-widget-lists-menu-create = Opprett en ny liste
newtab-widget-lists-menu-delete = Slett denne listen
newtab-widget-lists-menu-copy = Kopier liste til utklippstavlen
newtab-widget-lists-menu-learn-more = Les mer
newtab-widget-lists-button-add-item = Legg til et element
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Legg til et element
    .aria-label = Legg til et element
newtab-widget-lists-input-error = Legg til tekst for å legge til et element.
newtab-widget-lists-input-menu-open-link = Åpne lenke
newtab-widget-lists-input-menu-move-up = Flytt opp
newtab-widget-lists-input-menu-move-down = Flytt ned
newtab-widget-lists-input-menu-delete = Slett
newtab-widget-lists-input-menu-edit = Rediger
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Rediger element
newtab-widget-lists-edit-clear =
    .aria-label = Avbryt
    .title = Avbryt
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Lag en ny liste
newtab-widget-lists-name-label-default =
    .label = Oppgaveliste
newtab-widget-lists-name-label-checklist =
    .label = Sjekkliste
newtab-widget-lists-name-placeholder-default =
    .placeholder = Oppgaveliste
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Sjekkliste
    .aria-label = Rediger listenavn
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Ny liste
    .aria-label = Rediger listenavn
newtab-widget-section-title = Widgeter
newtab-widget-menu-hide = Skjul widget
newtab-widget-menu-change-size = Endre størrelse
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Flytt
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Til venstre
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Til høyre
newtab-widget-size-small = Liten
newtab-widget-size-medium = Mellomstor
newtab-widget-size-large = Stor
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Skjul widgeter
    .aria-label = Skjul alle widgeter
newtab-widget-section-maximize =
    .title = Utvid widgeter
    .aria-label = Utvid alle widgeter til full størrelse
newtab-widget-section-minimize =
    .title = Minimer widgeter
    .aria-label = Slå sammen alle widgeter til kompakt størrelse
newtab-widget-section-menu-button =
    .title = Widget-meny
    .aria-label = Åpne widget-menyen
newtab-widget-add-widgets-button =
    .aria-label = Legg til widget
    .title = Legg til widget
newtab-widget-section-menu-manage = Behandle widgeter
newtab-widget-section-menu-hide-all = Skjul widgeter
newtab-widget-section-menu-learn-more = Les mer
newtab-widget-section-feedback = Fortell oss hva du synes
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Vis flere widgeter
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Vis færre widgeter
newtab-widget-lists-name-default = Sjekkliste

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Nedtelling
newtab-widget-timer-notification-focus = Fokustiden er over. Bra jobbet. Trenger du en pause?
newtab-widget-timer-notification-break = Pausen din er over. Klar til å fokusere?
newtab-widget-timer-notification-warning = Varsler er av
newtab-widget-timer-mode-focus =
    .label = Fokus
newtab-widget-timer-mode-break =
    .label = Pause
newtab-widget-timer-label-play =
    .label = Spill av
newtab-widget-timer-label-pause =
    .label = Pause
newtab-widget-timer-reset =
    .title = Tilbakestill
newtab-widget-timer-menu-notifications = Slå av varsler
newtab-widget-timer-menu-notifications-on = Slå på varsler
newtab-widget-timer-menu-learn-more = Les mer
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Toppoverskrifter
newtab-daily-briefing-card-menu-dismiss = Ignorer
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Oppdatert for { $minutes } minutter siden
newtab-widget-message-title = Hold fokus med lister og en innebygd nedteller
# to-dos stands for "things to do".
newtab-widget-message-copy = Fra kjappe påminnelser til daglige gjøremål, fokuserte arbeidsøkter til strekkpauser — hold deg til oppgaven og tidsplanen.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Ett sted for fokus, værmeldinger og mer
newtab-widget-message-focus-forecasts-body = Hold flyten gjennom dagen med widgeter i { -brand-product-name }. Sjekk værmeldingen, hold fokus på oppgavene dine eller følg tiden rundt om i verden.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Gjør { -brand-product-name } til ditt eget
newtab-promo-card-body-addons = Velg et bakgrunnsbilde fra samlingen vår, eller lag ditt eget.
newtab-promo-card-cta-addons = Prøv det nå
newtab-promo-card-title = Støtt { -brand-product-name }
newtab-promo-card-body = Våre sponsorer støtter vårt oppdrag om å bygge et bedre internett
newtab-promo-card-cta = Les mer
newtab-promo-card-dismiss-button =
    .title = Avvis
    .aria-label = Avvis

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
           *[other] Start { $minutes }-minutt nedtelling
        }
newtab-widget-timer-pause-aria =
    .aria-label = Sett nedtelleren på pause
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label = { $minutes } minutt
newtab-widget-timer-decrease-min =
    .title = Reduser med 1 minutt
newtab-widget-timer-increase-min =
    .title = Øk med 1 minutt
newtab-widget-timer-mode-group =
    .aria-label = Nedtellingsmodus
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Fokus
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Pause
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Skjul nedteller
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Bra jobbet
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Pausen din er over
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Trenger du en pause?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Klar til å fokusere?

##

newtab-sports-widget-menu-follow-teams = Følg lag
newtab-sports-widget-menu-view-schedule = Se kampoppsettet
newtab-sports-widget-menu-view-upcoming = Vis kommende
newtab-sports-widget-menu-view-results = Vis resultater
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Viktige datoer
newtab-sports-widget-menu-learn-more = Les mer
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Følg med på VM
newtab-sports-widget-get-updates = Få direkte kampoppdateringer og mer.
newtab-sports-widget-view-schedule =
    .label = Se kampoppsettet
newtab-sports-widget-follow-teams =
    .label = Følg lag
newtab-sports-widget-view-matches =
    .label = Vis kamper
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
       *[other] Følg opptil { $number } lag
    }
newtab-sports-widget-choose-wallpaper =
    .label = Velg et bakgrunnsbilde
newtab-sports-widget-skip = Hopp over
newtab-sports-widget-search-country =
    .placeholder = Søk etter land
    .aria-label = Søk etter land
newtab-sports-widget-cancel = Avbryt
newtab-sports-widget-back-button =
    .aria-label = Tilbake
newtab-sports-widget-done-button =
    .label = Ferdig
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (utslått)
newtab-sports-widget-view-all =
    .label = Vis alle
newtab-sports-widget-show-less =
    .label = Vis mindre
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Bare fulgte lag
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Se
    .title = Se direkte
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Se direkte
    .title = Se direkte
newtab-sports-widget-watch-dialog-close =
    .aria-label = Lukk
    .title = Lukk
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Gratis
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Gratis prøveperiode
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Gratis og betalt
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Betalt
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Bare utvalgte kamper
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Tilgjengelig i din region
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Andre regioner
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Åpne strøm
    .title = Åpne strøm
newtab-sports-widget-group-stage = Gruppespill
newtab-sports-widget-group-a = Gruppe A
newtab-sports-widget-group-b = Gruppe B
newtab-sports-widget-group-c = Gruppe C
newtab-sports-widget-group-d = Gruppe D
newtab-sports-widget-group-e = Gruppe E
newtab-sports-widget-group-f = Gruppe F
newtab-sports-widget-group-g = Gruppe G
newtab-sports-widget-group-h = Gruppe H
newtab-sports-widget-group-i = Gruppe I
newtab-sports-widget-group-j = Gruppe J
newtab-sports-widget-group-k = Gruppe K
newtab-sports-widget-group-l = Gruppe L
newtab-sports-widget-round-32 = Sekstendedelsfinale
newtab-sports-widget-round-16 = Åttendedelsfinale
newtab-sports-widget-quarter-finals = Kvartfinaler
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = DIREKTE
newtab-custom-widget-live-refresh =
    .title = Oppdater poeng
    .aria-label = Oppdater poeng
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Viktige datoer
newtab-sports-widget-upcoming = Kommende
# Used for a match currently ongoing
newtab-sports-widget-now = Nå
newtab-sports-widget-results = Resultater
newtab-sports-widget-semi-finals = Semifinaler
newtab-sports-widget-bronze-finals = Bronsefinale
# Final is the final match for 1st place.
newtab-sports-widget-final = Finale
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Forsinket
newtab-sports-widget-postponed = Utsatt
newtab-sports-widget-suspended = Suspendert
newtab-sports-widget-cancelled = Avlyst
newtab-sports-widget-information = Informasjon om kampen
newtab-sports-widget-no-live-data = Direkte kampdata oppdateres ikke akkurat nå
newtab-sports-widget-view-results-link = Vis resultater
newtab-sports-widget-third-place = Tredjeplass
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Andreplass
newtab-sports-widget-champions = Mestere
newtab-sports-widget-world-cup-champions = VM 2026 – verdensmestere
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Slutt
newtab-sports-widget-match-halftime = Pause
newtab-sports-widget-match-extra-time = Ekstra tid
newtab-sports-widget-match-penalties = Straffer
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = mot
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Følg med for kommende kampdetaljer

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Forrige
    .title = Forrige
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Neste
    .title = Neste
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Pågående kamp { $index } av { $total }
    .title = Pågående kamp { $index } av { $total }

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
    .aria-label = Direkte: { $homeTeam }, { $homeScore } mot { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } mot { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } mot { $awayTeam }, forsinket
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } mot { $awayTeam }, utsatt
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } mot { $awayTeam }, avbrutt
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } mot { $awayTeam }, kansellert

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosnia og Herzegovina
newtab-sports-widget-team-name-label-civ =
    .label = Elfenbenskysten
newtab-sports-widget-team-name-label-cod =
    .label = DR Kongo
newtab-sports-widget-team-name-label-eng =
    .label = England
newtab-sports-widget-team-name-label-sco =
    .label = Skottland
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Ikke avgjort

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Spark i gang VM med nye bakgrunnsbilder
newtab-sports-widget-message-wallpapers-body = Gi nettleseren litt kampstemning under turneringen.
newtab-sports-widget-message-wallpapers-cta = Velg bakgrunnsbilde
newtab-sports-widget-message-add-widgets-cta =
    .label = Legg til widgeter
newtab-sports-widget-message-day-in-play-title = Hold dagen i gang med widgeter i { -brand-product-name }
newtab-sports-widget-message-day-in-play-body = Følg VM, hold fokus på oppgavene dine, følg tiden rundt om i verden og mer.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Utforsk widgeter

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Ignorer
    .aria-label = Ignorer
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Gjør dette området til ditt eget
newtab-activation-window-message-customization-focus-message = Velg et nytt bakgrunnsbilde, legg til snarveier til favorittnettstedene dine, og hold deg oppdatert på artikler som interesserer deg.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Begynn å tilpasse
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Dette området følger reglene dine
newtab-activation-window-message-values-focus-message = { -brand-product-name } lar deg surfe slik du vil, med en mer personlig måte å starte dagen din på nettet. Gjør { -brand-product-name } til ditt eget.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Skjul klokke
newtab-clock-widget-menu-learn-more = Les mer
newtab-clock-widget-menu-edit = Rediger klokker
newtab-clock-widget-menu-switch-to-12h = Bytt til 12-timers format
newtab-clock-widget-menu-switch-to-24h = Bytt til 24-timers format
newtab-clock-widget-label-your-clocks = Dine klokker
newtab-clock-widget-search-location-input =
    .label = Plassering
    .placeholder = Søk etter en by
    .aria-label = Søk etter en by
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Kallenavn (valgfritt)
    .placeholder = Legg til et kallenavn
    .aria-label = Kallenavn (valgfritt)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Legg til ny klokke
    .aria-label = Legg til ny klokke
newtab-clock-widget-button-add-clock = Legg til
newtab-clock-widget-button-cancel = Avbryt
newtab-clock-widget-button-back =
    .title = Tilbake
    .aria-label = Tilbake
newtab-clock-widget-button-edit-clock =
    .title = Rediger klokke
    .aria-label = Rediger klokke
newtab-clock-widget-button-save = Lagre
newtab-clock-widget-button-remove-clock =
    .title = Fjern klokke
    .aria-label = Fjern klokke
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
    .aria-label = { $city }, kallenavn: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Legg til klokke
newtab-clock-widget-edit-clock-form =
    .aria-label = Rediger klokke
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Søkeresultat
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Ingen treff
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Åpne klokkemeny
    .aria-label = Åpne klokkemeny
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Kallenavn: { $nickname }
