# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Ny fane
newtab-settings-button =
    .title = Tilpass sida for Ny fane
newtab-customize-panel-icon-button =
    .title = Tilpass denne sida
newtab-customize-panel-icon-button-label = Tilpass
newtab-personalize-settings-icon-label =
    .title = Tilpass ny fane
    .aria-label = Innstillingar
newtab-settings-dialog-label =
    .aria-label = Innstillingar
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

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Søk
    .aria-label = Søk
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Søk med { $engine } eller skriv inn ei adresse
newtab-search-box-handoff-text-no-engine = Søk eller skriv inn ei adresse
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Søk med { $engine } eller skriv inn ei adresse
    .title = Søk med { $engine } eller skriv inn ei adresse
    .aria-label = Søk med { $engine } eller skriv inn ei adresse
newtab-search-box-handoff-input-no-engine =
    .placeholder = Søk eller skriv inn ei adresse
    .title = Søk eller skriv inn ei adresse
    .aria-label = Søk eller skriv inn ei adresse
newtab-search-box-text = Søk på nettet
newtab-search-box-input =
    .placeholder = Søk på nettet
    .aria-label = Søk på nettet

## Top Sites - General form dialog.

newtab-topsites-add-search-engine-header = Legg til søkjemotor
newtab-topsites-add-shortcut-header = Ny snarveg
newtab-topsites-edit-topsites-header = Rediger Mest besøkt
newtab-topsites-edit-shortcut-header = Rediger snarveg
newtab-topsites-add-shortcut-label = Legg til snarveg
newtab-topsites-add-shortcut-title =
    .title = Legg til snarveg
    .aria-label = Legg til snarveg
newtab-topsites-title-label = Tittel
newtab-topsites-title-input =
    .placeholder = Skriv inn ein tittel
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Skriv eller lim inn ein URL
newtab-topsites-url-validation = Gyldig URL er påkravd
newtab-topsites-image-url-label = Tilpassa bilde-URL
newtab-topsites-use-image-link = Bruk eit tilpassa bilde…
newtab-topsites-image-validation = Klarte ikkje å lesa bildet. Prøv ein annan URL.

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Avbryt
newtab-topsites-delete-history-button = Slett frå historikk
newtab-topsites-save-button = Lagre
newtab-topsites-preview-button = Førehandsvis
newtab-topsites-add-button = Legg til

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Er du sikker på at du vil slette alle førekomstar av denne sida frå historikken din?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Denne handlinga kan ikkje angrast.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Sponsa

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (festa)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Opne meny
    .aria-label = Opne meny
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Fjern
    .aria-label = Fjern
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Opne meny
    .aria-label = Opne kontekstmeny for { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Rediger denne nettsida
    .aria-label = Rediger denne nettsida

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Rediger
newtab-menu-open-new-window = Opne i nytt vindauge
newtab-menu-open-new-private-window = Opne i eit nytt privat vindauge
newtab-menu-dismiss = Avvis
newtab-menu-pin = Fest
newtab-menu-unpin = Løys
newtab-menu-delete-history = Slett frå historikk
newtab-menu-save-to-pocket = Lagre til { -pocket-brand-name }
newtab-menu-delete-pocket = Slett frå { -pocket-brand-name }
newtab-menu-archive-pocket = Arkiver i { -pocket-brand-name }
newtab-menu-show-privacy-info = Våre sponsorar og ditt personvern
newtab-menu-about-fakespot = Om { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Rapporter
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Blokker
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Slutt å følgje emnet

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Handsam sponsa innhald
newtab-menu-our-sponsors-and-your-privacy = Sponsorane våre og ditt personvern
newtab-menu-report-this-ad = Rapporter denne annonsen

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Ferdig
newtab-privacy-modal-button-manage = Handsam innstillingar for sponsa innhald
newtab-privacy-modal-header = Personvernet ditt er viktig.
newtab-privacy-modal-paragraph-2 =
    I tillegg til å servere fengslande artiklar, viser vi deg også relevant og
    høgt kontrollert innhald frå utvalde sponsorar. Du kan vere sikker på, <strong>at surfedata dine
    aldri forlèt det personlege eksemplaret ditt av  { -brand-product-name }</strong> — vi ser dei ikkje, og sponsorane våre ser dei ikkje heller.
newtab-privacy-modal-link = Lær deg korleis personvernet fungerer på den nye fana

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Fjern bokmerke
# Bookmark is a verb here.
newtab-menu-bookmark = Bokmerke

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Kopier nedlastingslenke
newtab-menu-go-to-download-page = Gå til nedlastingsside
newtab-menu-remove-download = Fjern frå historikk

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Vis i Finder
       *[other] Opne innhaldsmappe
    }
newtab-menu-open-file = Opne fil

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Besøkt
newtab-label-bookmarked = Bokmerkte
newtab-label-removed-bookmark = Bokmerke fjerna
newtab-label-recommended = Trendar
newtab-label-saved = Lagra til { -pocket-brand-name }
newtab-label-download = Nedlasta
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Sponsa
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Sponsa av { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Sponsa

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Fjern seksjon
newtab-section-menu-collapse-section = Slå saman seksjon
newtab-section-menu-expand-section = Utvid seksjon
newtab-section-menu-manage-section = Handsam seksjon
newtab-section-menu-manage-webext = Handsam utviding
newtab-section-menu-add-topsite = Legg til mest besøkte
newtab-section-menu-add-search-engine = Legg til søkjemotor
newtab-section-menu-move-up = Flytt opp
newtab-section-menu-move-down = Flytt ned
newtab-section-menu-privacy-notice = Personvernfråsegn

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Slå saman seksjon
newtab-section-expand-section-label =
    .aria-label = Utvid seksjon

## Section Headers.

newtab-section-header-topsites = Mest besøkte nettstadar
newtab-section-header-recent-activity = Nyleg aktivitet
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Tilrådd av { $provider }
newtab-section-header-stories = Tankevekkjande artiklar
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Dagens utvalde artiklar for deg

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Begynn å surfe, og vi vil vise deg nokre av dei beste artiklane, videoane og andre sider du nyleg har besøkt eller bokmerka her.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Det finst ikkje fleire. Kom tilbake seinare for fleire topphistoriar frå { $provider }. Kan du ikkje vente? Vel eit populært emne for å finne fleire gode artiklar frå heile nettet.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Du har no lest alt. Kom tilbake seinare for fleire artiklar. Kan du ikkje vente? Vel eit populært emne for å finne fleire flotte artiklar frå nettet.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Du har lest alt!
newtab-discovery-empty-section-topstories-content = Kom tilbake seinare for fleire artiklar.
newtab-discovery-empty-section-topstories-try-again-button = Prøv på nytt
newtab-discovery-empty-section-topstories-loading = Lastar…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Ops! Vi lasta nesten denne delen, men ikkje heilt.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Populære emne:
newtab-pocket-new-topics-title = Vil du ha endå fleire artiklar? Sjå desse populære emna frå { -pocket-brand-name }
newtab-pocket-more-recommendations = Fleire tilrådingar
newtab-pocket-learn-more = Les meir
newtab-pocket-cta-button = Last ned { -pocket-brand-name }
newtab-pocket-cta-text = Lagre artiklane du synest er interessante i { -pocket-brand-name }, og stimuler tankane dine med fasinerande lesemateriell.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } er ein del av { -brand-product-name }-familien.
newtab-pocket-save = Lagre
newtab-pocket-saved = Lagra

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Meir som dette
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Ikkje for meg
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Takk. Tilbakemeldinga di  vil hjelpe oss med å gjere kjelda di betre.
newtab-toast-dismiss-button =
    .title = Avvis
    .aria-label = Avvis

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Oppdag det beste på nettet
newtab-pocket-onboarding-cta = { -pocket-brand-name } utforskar ei mengde ulike publikasjonar for å få det mest informative, inspirerande og pålitelege innhaldet direkte til { -brand-product-name }-nettlesaren din.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Ops, noko gjekk gale då innhaldet skulle lastast inn.
newtab-error-fallback-refresh-link = Oppdater sida for å prøve på nytt.

## Customization Menu

newtab-custom-shortcuts-title = Snarvegar
newtab-custom-shortcuts-subtitle = Nettstadar du lagrar eller besøkjer
newtab-custom-shortcuts-toggle =
    .label = Snarvegar
    .description = Nettstadar du lagrar eller besøkjer
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } rad
       *[other] { $num } rader
    }
newtab-custom-sponsored-sites = Sponsa snarvegar
newtab-custom-pocket-title = Tilrådd av { -pocket-brand-name }
newtab-custom-pocket-subtitle = Eksepsjonelt innhald sett saman av { -pocket-brand-name }, ein del av { -brand-product-name }-familien
newtab-custom-stories-toggle =
    .label = Tilrådde artiklar
    .description = Eineståande innhald utvalt av { -brand-product-name } familien
newtab-custom-stories-personalized-toggle =
    .label = Artiklar
newtab-custom-stories-personalized-checkbox-label = Personlege artiklar basert på aktiviteten din
newtab-custom-pocket-sponsored = Sponsa historier
newtab-custom-pocket-show-recent-saves = Vis siste lagra
newtab-custom-recent-title = Nyleg aktivitet
newtab-custom-recent-subtitle = Eit utval av nylege nettstadar og innhald
newtab-custom-weather-toggle =
    .label = Vêr
    .description = Dagens vêrmelding i korte trekk
newtab-custom-widget-weather-toggle =
    .label = Vêr
newtab-custom-widget-lists-toggle =
    .label = Lister
newtab-custom-widget-timer-toggle =
    .label = Nedteljing
newtab-custom-widget-section-title = Widgetar
newtab-custom-widget-section-toggle =
    .label = Widgetar
newtab-widget-manage-title = Widgetar
newtab-widget-manage-widget-button =
    .label = Handsam widgetar
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Lat att
    .aria-label = Lat att meny
newtab-custom-close-button = Lat att
newtab-custom-settings = Handsam fleire innstillingar

## New Tab Wallpapers

newtab-wallpaper-title = Bakgrunnsbilde
newtab-wallpaper-reset = Still tilbake til standard
newtab-wallpaper-upload-image = Last opp eit bilde
newtab-wallpaper-custom-color = Vel ein farge
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Bildet overskreid filstorleiksgrensa på { $file_size }MB. Prøv å laste opp ei mindre fil.
newtab-wallpaper-error-upload-file-type = Vi klarte ikkje å laste opp fila di. Prøv igjen med ei bildefil.
newtab-wallpaper-error-file-type = Vi klarte ikkje å laste opp fila di. Prøv igjen med ein annan filtype.
newtab-wallpaper-light-red-panda = Raudpanda
newtab-wallpaper-light-mountain = Kvitt fjell
newtab-wallpaper-light-sky = Himmel med lilla og rosa skyer
newtab-wallpaper-light-color = Blå, rosa og gule former
newtab-wallpaper-light-landscape = Fjellandskap med blå tåke
newtab-wallpaper-light-beach = Strand med palmetre
newtab-wallpaper-dark-aurora = Nordlys
newtab-wallpaper-dark-color = Raude og blå former
newtab-wallpaper-dark-panda = Raudpanda gøymt i skogen
newtab-wallpaper-dark-sky = Bylandskap med nattehimmel
newtab-wallpaper-dark-mountain = Fjellandskap
newtab-wallpaper-dark-city = Lilla bylandskap
newtab-wallpaper-dark-fox-anniversary = Ein rev på fortauet nær ein skog
newtab-wallpaper-light-fox-anniversary = Ein rev i ei graskledd mark med eit tåkete fjellandskap

## Solid Colors

newtab-wallpaper-category-title-colors = Einsfarga
newtab-wallpaper-blue = Blå
newtab-wallpaper-light-blue = Lyseblå
newtab-wallpaper-light-purple = Lyselilla
newtab-wallpaper-light-green = Lysegrøn
newtab-wallpaper-green = Grøn
newtab-wallpaper-beige = Beige
newtab-wallpaper-yellow = Gul
newtab-wallpaper-orange = Oransje
newtab-wallpaper-pink = Rosa
newtab-wallpaper-light-pink = Lyserosa
newtab-wallpaper-red = Raud
newtab-wallpaper-dark-blue = Mørkeblå
newtab-wallpaper-dark-purple = Mørkelilla
newtab-wallpaper-dark-green = Mørkegrøn
newtab-wallpaper-brown = Brun

## Abstract

newtab-wallpaper-category-title-abstract = Abstrakt
newtab-wallpaper-abstract-green = Grøne former
newtab-wallpaper-abstract-blue = Blåe former
newtab-wallpaper-abstract-purple = Lilla former
newtab-wallpaper-abstract-orange = Oransje former
newtab-wallpaper-gradient-orange = Fargeovergang oransje og rosa
newtab-wallpaper-abstract-blue-purple = Blå og lilla former
newtab-wallpaper-abstract-white-curves = Kvit med skraverte kurver
newtab-wallpaper-abstract-purple-green = Fargeovergang med lilla og grønt lys
newtab-wallpaper-abstract-blue-purple-waves = Blå og lilla bølgjeformer
newtab-wallpaper-abstract-black-waves = Svarte bølgjeformer

## Firefox

newtab-wallpaper-category-title-photographs = Fotografi
newtab-wallpaper-beach-at-sunrise = Strand ved soloppgang
newtab-wallpaper-beach-at-sunset = Strand ved solnedgang
newtab-wallpaper-storm-sky = Stormhimmel
newtab-wallpaper-sky-with-pink-clouds = Himmel med rosa skyer
newtab-wallpaper-red-panda-yawns-in-a-tree = Raud panda som geispar i eit tre
newtab-wallpaper-white-mountains = Kvite fjell
newtab-wallpaper-hot-air-balloons = Fargespel av luftballongar på dagtid
newtab-wallpaper-starry-canyon = Blå stjerneklar kveld
newtab-wallpaper-suspension-bridge = Foto av grå hengebru på dagtid
newtab-wallpaper-sand-dunes = Kvite sanddyner
newtab-wallpaper-palm-trees = Silhuett av kokospalmar i den gylne timen
newtab-wallpaper-blue-flowers = Nærbiletfotografering av blåblada blomstrar i bløming
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Bilde av <a data-l10n-name="name-link">{ $author_string }</a> på <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Prøv ein fargeklatt
newtab-wallpaper-feature-highlight-content = Gje ny fane-sida ein friskt utsjånad med bakgrunnsbilde.
newtab-wallpaper-feature-highlight-button = Eg forstår
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Lat att
    .aria-label = Lat att sprettoppvindauge
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Verdsrommet
newtab-wallpaper-celestial-lunar-eclipse = Måneformørking
newtab-wallpaper-celestial-earth-night = Nattfoto frå låg bane rundt jorda
newtab-wallpaper-celestial-starry-sky = Stjerneklar himmel
newtab-wallpaper-celestial-eclipse-time-lapse = Intervallfoto av måneformørking
newtab-wallpaper-celestial-black-hole = Illustrasjon av galakse med svart hol
newtab-wallpaper-celestial-river = Satellittbilde av elv

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Sjå vêrmelding hos { $provider }.
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Sponsa
newtab-weather-menu-change-location = Endre plassering
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Søk plassering
    .aria-label = Søk plassering
newtab-weather-menu-weather-display = Vêrvising
newtab-weather-todays-forecast = Vêrmeldinga i dag.
newtab-weather-see-full-forecast = Sjå fullstendig vêrmelding
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Enkel
newtab-weather-menu-change-weather-display-simple = Byt til enkel vising
newtab-weather-menu-weather-display-option-detailed = Detaljert
newtab-weather-menu-change-weather-display-detailed = Byt til detaljert vising
newtab-weather-menu-temperature-units = Temperatureiningar
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Byt til Fahrenheit
newtab-weather-menu-change-temperature-units-celsius = Byt til Celsius
newtab-weather-menu-hide-weather-v2 = Skjul vêr
newtab-weather-menu-hide-weather = Skjul vêret på ny fane
newtab-weather-menu-learn-more = Les meir
newtab-weather-menu-detect-my-location = Oppdag posisjonen min
# This message is shown if user is working offline
newtab-weather-error-not-available = Vêrdata er ikkje tilgjengeleg akkurat no.
newtab-weather-opt-in-see-weather = Vil du sjå vêret for plasseringa di?
newtab-weather-opt-in-not-now =
    .label = Ikkje no
newtab-weather-opt-in-yes =
    .label = Ja
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York City
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Sjå vêrmelding hos { $provider }.
    .aria-description = { $provider } ∙ Sponsa

## Topic Labels

newtab-topic-label-business = Business
newtab-topic-label-career = Karriere
newtab-topic-label-education = Utdanning
newtab-topic-label-arts = Underhaldning
newtab-topic-label-food = Mat
newtab-topic-label-health = Helse
newtab-topic-label-hobbies = Spel
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Pengar
newtab-topic-label-society-parenting = Foreldreskap
newtab-topic-label-government = Politikk
newtab-topic-label-education-science = Vitskap
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Kvardagsknep og småtriks
newtab-topic-label-sports = Sport
newtab-topic-label-tech = Teknologi
newtab-topic-label-travel = Reise
newtab-topic-label-home = Heim og hage

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Vel emne for å finjustere feed-en din
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Vel to eller fleire emne. Ekspertkuratorane våre prioriterer artiklar tilpassa etter dine interesser. Oppdater når som helst.
newtab-topic-selection-save-button = Lagre
newtab-topic-selection-cancel-button = Avbryt
newtab-topic-selection-button-maybe-later = Kanskje seinare
newtab-topic-selection-privacy-link = FInn ut korleis vi vernar og handsamar data
newtab-topic-selection-button-update-interests = Oppdater interessene dine
newtab-topic-selection-button-pick-interests = Vel interessene dine

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Følg
newtab-section-following-button = Følgjer
newtab-section-unfollow-button = Slutt å følgje
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Finjuster kjelda di
newtab-section-follow-highlight-subtitle = Følg interessene dine for å sjå meir av det du likar.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Blokker
newtab-section-blocked-button = Blokkert
newtab-section-unblock-button = Opphev blokkeringa

## Confirmation modal for blocking a section

newtab-section-cancel-button = Ikkje no
newtab-section-confirm-block-topic-p1 = Er du sikker på at du vil blokkere dette emnet?
newtab-section-confirm-block-topic-p2 = Blokkerte emne vil ikkje lenger visast i kanalen din.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Blokker { $topic }

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Emne
newtab-section-manage-topics-button-v2 =
    .label = Handsam emne
newtab-section-mangage-topics-followed-topics = Følgt
newtab-section-mangage-topics-followed-topics-empty-state = Du har ikkje følgt nokon emne enno.
newtab-section-mangage-topics-blocked-topics = Blokkert
newtab-section-mangage-topics-blocked-topics-empty-state = Du har ikkje blokkert nokon emne enno.
newtab-custom-wallpaper-title = No får du tilpassa bakgrunnsbilde
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Last opp ditt eige bakgrunnsbilde eller vel ein farge for å gjere { -brand-product-name } til din.
newtab-custom-wallpaper-cta = Prøv det

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Vel eit bakgrunnsbilde for å gjere { -brand-product-name } til din eigen
newtab-new-user-custom-wallpaper-subtitle = Få kvar nye fane til å kjennast som heime med tilpassa bakgrunnar og fargar.
newtab-new-user-custom-wallpaper-cta = Prøv det no

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Last ned { -brand-product-name } for mobil
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Skann koden for å surfe trygt medan du er på farta.
newtab-download-mobile-highlight-body-variant-b = Hald fram der du slutta når du synkroniserer faner, passord, og meir.
newtab-download-mobile-highlight-body-variant-c = Visste du at du kan ta med { -brand-product-name } på farta? Same nettlesar. I lomma.
newtab-download-mobile-highlight-image =
    .aria-label = QR-kode for å laste ned { -brand-product-name } for mobil

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Dine favorittar lett tilgjengelege
newtab-shortcuts-highlight-subtitle = Legg til ein snarveg for å ha favorittnettstadane dine eitt klikk unna.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Kvifor rapporterer du dette?
newtab-report-ads-reason-not-interested =
    .label = Eg er ikkje interessert
newtab-report-ads-reason-inappropriate =
    .label = Det er upassande
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Eg har sett den altfor mange gongar
newtab-report-content-wrong-category =
    .label = Feil kategori
newtab-report-content-outdated =
    .label = Utdatert
newtab-report-content-inappropriate-offensive =
    .label = Upassande eller krenkande
newtab-report-content-spam-misleading =
    .label = Søppelpost eller villeiande
newtab-report-content-requires-payment-subscription =
    .label = Krev betaling eller abonnement
newtab-report-content-requires-payment-subscription-learn-more = Les meir
newtab-report-cancel = Avbryt
newtab-report-submit = Send inn
newtab-toast-thanks-for-reporting =
    .message = Takk for at du rapporterte dette.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Moglegheitene er uendelege. Legg til éi.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Ny
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Fullført ({ $number })
newtab-widget-task-list-menu-copy = Kopier
newtab-widget-lists-menu-edit = Rediger listenamn
newtab-widget-lists-menu-create = Opprett ei ny liste
newtab-widget-lists-menu-delete = Slett denne lista
newtab-widget-lists-menu-copy = Kopier liste til utklippstavla
newtab-widget-lists-menu-hide = Skjul alle lister
newtab-widget-lists-menu-learn-more = Les meir
newtab-widget-lists-input-add-an-item =
    .placeholder = Legg til eit element
newtab-widget-lists-input-error = Legg til tekst for å leggje til eit element.
newtab-widget-lists-input-menu-open-link = Opne lenke
newtab-widget-lists-input-menu-move-up = Flytt opp
newtab-widget-lists-input-menu-move-down = Flytt ned
newtab-widget-lists-input-menu-delete = Slett
newtab-widget-lists-input-menu-edit = Rediger
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Lag ei ny liste
newtab-widget-lists-name-label-default =
    .label = Oppgåveliste
newtab-widget-lists-name-placeholder-default =
    .placeholder = Oppgåveliste
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new =
    .placeholder = Ny liste
newtab-widget-section-title = Widgetar
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Skjul widgetar
    .aria-label = Skjul alle widgetar
newtab-widget-section-maximize =
    .title = Utvid widgetar
    .aria-label = Utvid alle widgetar til full størrelse
newtab-widget-section-minimize =
    .title = Minimer widgetar
    .aria-label = Slå saman alle widgetar til kompakt størrelse

## Strings for timer productivity widget
## When the timer ends, a system notification may be shown. Depending on which mode the timer is in, that message would be shown

newtab-widget-timer-notification-title = Nedteljing
newtab-widget-timer-notification-focus = Fokustida er over. Bra jobba. Treng du ein pause?
newtab-widget-timer-notification-break = Pausen din er over. Klar til å fokusere?
newtab-widget-timer-notification-warning = Varsel er av
newtab-widget-timer-mode-focus =
    .label = Fokus
newtab-widget-timer-mode-break =
    .label = Pause
newtab-widget-timer-label-play =
    .label = Spel av
newtab-widget-timer-label-pause =
    .label = Pause
newtab-widget-timer-reset =
    .title = Tilbakestill
newtab-widget-timer-menu-notifications = Slå av varsel
newtab-widget-timer-menu-notifications-on = Slå på varsel
newtab-widget-timer-menu-hide = Skjul nedteljar
newtab-widget-timer-menu-learn-more = Les meir
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Toppoverskrifter
newtab-daily-briefing-card-menu-dismiss = Ignorer
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Oppdatert for { $minutes } minutt sidan
newtab-widget-message-title = Hald fokus med lister og ein innebygd nedteljar
# to-dos stands for "things to do".
newtab-widget-message-copy = Frå kjappe påminningar til daglege gjeremål, fokuserte arbeidsøkter til strekkpausar — hald deg til oppgåva og tidsplanen.
newtab-promo-card-title = Støtt { -brand-product-name }
newtab-promo-card-body = Sponsorane våre støttar oppdraget vårt om å byggje eit betre internett
newtab-promo-card-cta = Les meir
newtab-promo-card-dismiss-button =
    .title = Avvis
    .aria-label = Avvis

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
newtab-activation-window-message-customization-focus-header = Gjer dette området til ditt eige
newtab-activation-window-message-customization-focus-message = Vel eit nytt bakgrunnsbilde, legg til snarvegar til favorittnettstadane dine, og hald deg oppdatert på artiklar som interesserer deg.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Start tilpassing
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Dette området følgjer reglane dine
newtab-activation-window-message-values-focus-message = { -brand-product-name } lèt deg surfe slik du vil, med ein meir personleg måte å starte dagen din på nettet. Gjer { -brand-product-name } til ditt eige.
