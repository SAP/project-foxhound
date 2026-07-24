# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Filă nouă
newtab-settings-button =
    .title = Personalizează pagina pentru filă nouă
newtab-customize-panel-icon-button =
    .title = Personalizează această pagină
newtab-customize-panel-icon-button-label = Personalizează
newtab-personalize-settings-icon-label =
    .title = Personalizează pagina de filă nouă
    .aria-label = Setări
newtab-settings-dialog-label =
    .aria-label = Setări
newtab-personalize-icon-label =
    .title = Personalizează pagina pentru filă nouă
    .aria-label = Personalizează pagina pentru filă nouă
newtab-personalize-dialog-label =
    .aria-label = Personalizează
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Închide
    .aria-label = Închide

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Caută
    .aria-label = Caută
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Caută cu { $engine } sau introdu adresa
newtab-search-box-handoff-text-no-engine = Caută sau introdu adresa
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Caută cu { $engine } sau introdu adresa
    .title = Caută cu { $engine } sau introdu adresa
    .aria-label = Caută cu { $engine } sau introdu adresa
newtab-search-box-handoff-input-no-engine =
    .placeholder = Caută sau introdu adresa
    .title = Caută sau introdu adresa
    .aria-label = Caută sau introdu adresa
newtab-search-box-text = Caută pe web
newtab-search-box-input =
    .placeholder = Caută pe web
    .aria-label = Caută pe web

## Top Sites - General form dialog.

newtab-topsites-add-search-engine-header = Adaugă motor de căutare
newtab-topsites-add-shortcut-header = Comandă rapidă nouă
newtab-topsites-edit-topsites-header = Editează site-ul de top
newtab-topsites-edit-shortcut-header = Editează comanda rapidă
newtab-topsites-add-shortcut-label = Adaugă comanda rapidă
newtab-topsites-add-shortcut-title =
    .title = Adaugă comanda rapidă
    .aria-label = Adaugă comanda rapidă
newtab-topsites-title-label = Titlu
newtab-topsites-title-input =
    .placeholder = Introdu un titlu
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Tastează sau inserează un URL
newtab-topsites-url-validation = URL valid necesar
newtab-topsites-image-url-label = URL pentru imagine personalizată
newtab-topsites-use-image-link = Folosește o imagine personalizată…
newtab-topsites-image-validation = Imaginea nu s-a încărcat. Încearcă o altă adresă.

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Anulează
newtab-topsites-delete-history-button = Șterge din istoric
newtab-topsites-save-button = Salvează
newtab-topsites-preview-button = Previzualizare
newtab-topsites-add-button = Adaugă

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Sigur vrei să ștergi fiecare instanță a acestei pagini din istoric?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Acțiunea este ireversibilă.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Sponsorizat

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (fixat)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Deschide meniul
    .aria-label = Deschide meniul
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Elimină
    .aria-label = Elimină
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Deschide meniul
    .aria-label = Deschide meniul contextual pentru { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Editează acest site
    .aria-label = Editează acest site

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Editează
newtab-menu-open-new-window = Deschide într-o fereastră nouă
newtab-menu-open-new-private-window = Deschide într-o fereastră privată nouă
newtab-menu-dismiss = Elimină
newtab-menu-pin = Fixează
newtab-menu-unpin = Anulează fixarea
newtab-menu-delete-history = Șterge din istoric
newtab-menu-save-to-pocket = Salvează în { -pocket-brand-name }
newtab-menu-delete-pocket = Șterge din { -pocket-brand-name }
newtab-menu-archive-pocket = Arhivează în { -pocket-brand-name }
newtab-menu-show-privacy-info = Sponsorii noștri și confidențialitatea ta
newtab-menu-about-fakespot = Despre { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Raportează
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Blochează
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Anulează urmărirea subiectului

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Gestionează conținutul sponsorizat
newtab-menu-our-sponsors-and-your-privacy = Sponsorii noștri și confidențialitatea ta
newtab-menu-report-this-ad = Raportează acest anunț

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Terminat
newtab-privacy-modal-button-manage = Gestionează setările conținuturilor sponsorizate
newtab-privacy-modal-header = Confidențialitatea ta contează.
newtab-privacy-modal-paragraph-2 = În plus față de afișarea unor articole captivante, îți arătăm și conținuturi relevante foarte bine cotate de la sponsori selectați. Fii fără grijă, <strong>datele tale de navigare nu pleacă niciodată din exemplarul tău personal de { -brand-product-name }</strong> — nici noi nu le vedem, nici sponsorii noștri.
newtab-privacy-modal-link = Află cum funcționează confidențialitatea în fila nouă

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Elimină marcajul
# Bookmark is a verb here.
newtab-menu-bookmark = Marchează

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Copiază linkul de descărcare
newtab-menu-go-to-download-page = Mergi la pagina de descărcare
newtab-menu-remove-download = Elimină din istoric

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Afișează în Finder
       *[other] Deschide dosarul conținător
    }
newtab-menu-open-file = Deschide fișierul

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Vizitat
newtab-label-bookmarked = Marcat
newtab-label-removed-bookmark = Marcaj eliminat
newtab-label-recommended = În tendințe
newtab-label-saved = Salvat în { -pocket-brand-name }
newtab-label-download = Descărcat
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Sponsorizat
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Sponsorizat de { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Sponsorizat

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Elimină secțiunea
newtab-section-menu-collapse-section = Restrânge secțiunea
newtab-section-menu-expand-section = Extinde secțiunea
newtab-section-menu-manage-section = Gestionează secțiunea
newtab-section-menu-manage-webext = Gestionează extensia
newtab-section-menu-add-topsite = Adaugă site de top
newtab-section-menu-add-search-engine = Adaugă motor de căutare
newtab-section-menu-move-up = Mută în sus
newtab-section-menu-move-down = Mută în jos
newtab-section-menu-privacy-notice = Notificare privind confidențialitatea

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Restrânge secțiunea
newtab-section-expand-section-label =
    .aria-label = Extinde secțiunea

## Section Headers.

newtab-section-header-topsites = Site-uri de top
newtab-section-header-recent-activity = Activitate recentă
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Recomandat de { $provider }
newtab-section-header-stories = Povești care îndeamnă la reflecție
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Alegerile de astăzi pentru tine

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Începe să navighezi și noi îți vom arăta articole interesante, videouri sau alte pagini pe care le-ai vizitat sau marcat recent.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Ai ajuns la capăt. Revino mai târziu pentru alte articole de la { $provider }. Nu mai vrei să aștepți? Selectează un subiect popular și găsește alte articole interesante de pe web.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Ai terminat. Revino mai târziu pentru alte articole. Nu mai poți aștepta? Selectează un subiect popular și găsește alte articole interesante de pe web.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Ești prins!
newtab-discovery-empty-section-topstories-content = Revino mai târziu pentru mai multe articole.
newtab-discovery-empty-section-topstories-try-again-button = Încearcă din nou
newtab-discovery-empty-section-topstories-loading = Se încarcă…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Ups! Aproape că am încărcat această secțiune, dar nu complet.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Subiecte populare:
newtab-pocket-new-topics-title = Vrei și mai multe articole? Vezi aceste subiecte populare de la { -pocket-brand-name }
newtab-pocket-more-recommendations = Mai multe recomandări
newtab-pocket-learn-more = Află mai multe
newtab-pocket-cta-button = Obține { -pocket-brand-name }
newtab-pocket-cta-text = Salvează în { -pocket-brand-name } articolele care ți-au plăcut și hrănește-ți mintea cu lecturi fascinante.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } face parte din familia { -brand-product-name }
newtab-pocket-save = Salvează
newtab-pocket-saved = Salvat

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Mai multe de genul acesta
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Nu-i pentru mine
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Mulțumesc. Feedback-ul tău ne va ajuta să-ți îmbunătățim fluxul.
newtab-toast-dismiss-button =
    .title = Respinge
    .aria-label = Respinge

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Descoperă ce e mai bun de pe web
newtab-pocket-onboarding-cta = { -pocket-brand-name } explorează o gamă diversă de publicații pentru a oferi cel mai informativ, care inspiră și de încredere conținut direct în browserul { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Ups, ceva nu a funcționat la încărcarea acestui conținut.
newtab-error-fallback-refresh-link = Reîmprospătează pagina pentru a încerca din nou.

## Customization Menu

newtab-custom-shortcuts-title = Comenzi rapide
newtab-custom-shortcuts-subtitle = Site-uri pe care le salvezi sau le vizitezi
newtab-custom-shortcuts-toggle =
    .label = Comenzi rapide
    .description = Site-uri pe care le salvezi sau le vizitezi
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } rând
        [few] { $num } rânduri
       *[other] { $num } de rânduri
    }
newtab-custom-sponsored-sites = Comenzi rapide sponsorizate
newtab-custom-pocket-title = Recomandat de { -pocket-brand-name }
newtab-custom-pocket-subtitle = Conținut excepțional, creat de { -pocket-brand-name }, parte a familiei { -brand-product-name }
newtab-custom-stories-toggle =
    .label = Articole recomandate
    .description = Conținut excepțional îngrijit de familia { -brand-product-name }
newtab-custom-stories-personalized-toggle =
    .label = Povești
newtab-custom-stories-personalized-checkbox-label = Povești personalizate bazate pe activitatea ta
newtab-custom-pocket-sponsored = Articole sponsorizate
newtab-custom-pocket-show-recent-saves = Afișează salvările recente
newtab-custom-recent-title = Activitate recentă
newtab-custom-recent-subtitle = O selecție de site-uri și conținut recente
newtab-custom-weather-toggle =
    .label = Meteo
    .description = Vremea de astăzi dintr-o privire
newtab-custom-widget-weather-toggle =
    .label = Meteo
newtab-custom-widget-lists-toggle =
    .label = Liste
newtab-custom-widget-timer-toggle =
    .label = Cronometru
newtab-custom-widget-section-title = Widgeturi
newtab-custom-widget-section-toggle =
    .label = Widgeturi
newtab-widget-manage-title = Widgeturi
newtab-widget-manage-widget-button =
    .label = Gestionează widgeturile
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Închide
    .aria-label = Închide meniul
newtab-custom-close-button = Închide
newtab-custom-settings = Gestionează mai multe setări

## New Tab Wallpapers

newtab-wallpaper-title = Imagini de fundal
newtab-wallpaper-reset = Resetează la valorile implicite
newtab-wallpaper-upload-image = Încarcă o imagine
newtab-wallpaper-custom-color = Alege o culoare
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Imaginea a depășit limita de dimensiune a fișierului de { $file_size } MB. Te rugăm să încerci să încarci un fișier mai mic.
newtab-wallpaper-error-upload-file-type = Nu am putut încărca fișierul. Te rugăm să încerci din nou cu un fișier de imagine.
newtab-wallpaper-error-file-type = Nu am putut încărca fișierul. Te rugăm să încerci din nou cu un alt tip de fișier.
newtab-wallpaper-light-red-panda = Panda roșu
newtab-wallpaper-light-mountain = Multe alb
newtab-wallpaper-light-sky = Cer cu nori violeți și roz
newtab-wallpaper-light-color = Forme albastre, roz și galbene
newtab-wallpaper-light-landscape = Peisaj montan cu ceață albastră
newtab-wallpaper-light-beach = Plajă cu palmier
newtab-wallpaper-dark-aurora = Aurora Boreală
newtab-wallpaper-dark-color = Forme roșii și albastre
newtab-wallpaper-dark-panda = Panda roșu ascuns în pădure
newtab-wallpaper-dark-sky = Peisaj urban cu cer nocturn
newtab-wallpaper-dark-mountain = Peisaj montan
newtab-wallpaper-dark-city = Peisaj urban violet
newtab-wallpaper-dark-fox-anniversary = O vulpe pe trotuar lângă o pădure
newtab-wallpaper-light-fox-anniversary = O vulpe într-un câmp ierbos cu un peisaj montan încețoșat

## Solid Colors

newtab-wallpaper-category-title-colors = Culori uni
newtab-wallpaper-blue = Albastru
newtab-wallpaper-light-blue = Albastru deschis
newtab-wallpaper-light-purple = Violet deschis
newtab-wallpaper-light-green = Verde deschis
newtab-wallpaper-green = Verde
newtab-wallpaper-beige = Bej
newtab-wallpaper-yellow = Galben
newtab-wallpaper-orange = Portocaliu
newtab-wallpaper-pink = Roz
newtab-wallpaper-light-pink = Roz deschis
newtab-wallpaper-red = Roșu
newtab-wallpaper-dark-blue = Albastru închis
newtab-wallpaper-dark-purple = Violet închis
newtab-wallpaper-dark-green = Verde închis
newtab-wallpaper-brown = Maro

## Abstract

newtab-wallpaper-category-title-abstract = Abstract
newtab-wallpaper-abstract-green = Forme verzi
newtab-wallpaper-abstract-blue = Forme albastre
newtab-wallpaper-abstract-purple = Forme violete
newtab-wallpaper-abstract-orange = Forme portocalii
newtab-wallpaper-gradient-orange = Gradient de portocaliu și roz
newtab-wallpaper-abstract-blue-purple = Forme albastre și violete
newtab-wallpaper-abstract-white-curves = Alb cu curbe umbrite
newtab-wallpaper-abstract-purple-green = Gradient de lumină violet și verde
newtab-wallpaper-abstract-blue-purple-waves = Forme ondulate albastre și violete
newtab-wallpaper-abstract-black-waves = Forme ondulate negre

## Firefox

newtab-wallpaper-category-title-photographs = Fotografii
newtab-wallpaper-beach-at-sunrise = Plajă la răsărit
newtab-wallpaper-beach-at-sunset = Plajă la apus
newtab-wallpaper-storm-sky = Cer cu furtună
newtab-wallpaper-sky-with-pink-clouds = Cer cu nori roz
newtab-wallpaper-red-panda-yawns-in-a-tree = Panda roșu căscând într-un copac
newtab-wallpaper-white-mountains = Munții albi
newtab-wallpaper-hot-air-balloons = Baloane cu aer cald în culori asortate, pe timp de zi
newtab-wallpaper-starry-canyon = Noapte albastră înstelată
newtab-wallpaper-suspension-bridge = Fotografie gri cu pod suspendat integral, pe timp de zi
newtab-wallpaper-sand-dunes = Dune de nisip alb
newtab-wallpaper-palm-trees = Siluetă de cocotieri la asfințit
newtab-wallpaper-blue-flowers = Fotografie de prim-plan cu flori cu petale albastre înflorite
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Fotografie de <a data-l10n-name="name-link">{ $author_string }</a> pe <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Încearcă o pată de culoare
newtab-wallpaper-feature-highlight-content = Dă-i filei noi un aspect proaspăt cu imagini de fundal.
newtab-wallpaper-feature-highlight-button = Am înțeles
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Respinge
    .aria-label = Închide pop-up-ul
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Ceresc
newtab-wallpaper-celestial-lunar-eclipse = Eclipsă de lună
newtab-wallpaper-celestial-earth-night = Fotografie nocturnă de pe orbita joasă a Pământului
newtab-wallpaper-celestial-starry-sky = Cer înstelat
newtab-wallpaper-celestial-eclipse-time-lapse = Eclipsă de lună în înregistrare secvenţială
newtab-wallpaper-celestial-black-hole = Ilustrație de galaxie cu gaură neagră
newtab-wallpaper-celestial-river = Imagine din satelit cu un râu

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Vezi prognoza meteo în { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Sponsorizat
newtab-weather-menu-change-location = Schimbă locația
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Caută locație
    .aria-label = Caută locație
newtab-weather-menu-weather-display = Afișaj meteo
newtab-weather-todays-forecast = Prognoza de astăzi
newtab-weather-see-full-forecast = Vezi prognoza completă
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Simplă
newtab-weather-menu-change-weather-display-simple = Afișează vizualizarea simplificată
newtab-weather-menu-weather-display-option-detailed = Detaliată
newtab-weather-menu-change-weather-display-detailed = Afișează vizualizarea detaliată
newtab-weather-menu-temperature-units = Unități de temperatură
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Treci pe Fahrenheit
newtab-weather-menu-change-temperature-units-celsius = Treci pe Celsius
newtab-weather-menu-hide-weather-v2 = Ascunde vremea
newtab-weather-menu-hide-weather = Ascunde vremea în fila nouă
newtab-weather-menu-learn-more = Află mai multe
newtab-weather-menu-detect-my-location = Detectează-mi locația
# This message is shown if user is working offline
newtab-weather-error-not-available = Datele meteo nu sunt disponibile momentan.
newtab-weather-opt-in-see-weather = Vrei să vezi vremea pentru locația ta?
newtab-weather-opt-in-not-now =
    .label = Nu acum
newtab-weather-opt-in-yes =
    .label = Da
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York City
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Vezi prognoza meteo în { $provider }
    .aria-description = { $provider } ∙ Sponsorizat

## Topic Labels

newtab-topic-label-business = Afaceri
newtab-topic-label-career = Carieră
newtab-topic-label-education = Educație
newtab-topic-label-arts = Divertisment
newtab-topic-label-food = Mâncare
newtab-topic-label-health = Sănătate
newtab-topic-label-hobbies = Jocuri
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Bani
newtab-topic-label-society-parenting = Creşterea şi educarea copiilor
newtab-topic-label-government = Politică
newtab-topic-label-education-science = Ştiinţă
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Sfaturi practice
newtab-topic-label-sports = Sport
newtab-topic-label-tech = Tehnică
newtab-topic-label-travel = Călătorie
newtab-topic-label-home = Casă și grădină

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Selectează subiecte pentru feed
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Alege două sau mai multe subiecte. Specialiștii noștri dau prioritate articolelor adaptate intereselor tale. Actualizează oricând.
newtab-topic-selection-save-button = Salvează
newtab-topic-selection-cancel-button = Anulează
newtab-topic-selection-button-maybe-later = Poate mai târziu
newtab-topic-selection-privacy-link = Aflați cum îți protejăm și gestionăm datele
newtab-topic-selection-button-update-interests = Actualizează-ți interesele
newtab-topic-selection-button-pick-interests = Alege-ți interesele

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Urmărește
newtab-section-following-button = Urmăresc
newtab-section-unfollow-button = Nu mai urmări
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Ajustează-ți feedul
newtab-section-follow-highlight-subtitle = Urmărește ce te interesează ca să vezi mai multe din ceea ce îți place.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Blochează
newtab-section-blocked-button = Blocat
newtab-section-unblock-button = Deblochează

## Confirmation modal for blocking a section

newtab-section-cancel-button = Nu acum
newtab-section-confirm-block-topic-p1 = Sigur vrei să blochezi acest subiect?
newtab-section-confirm-block-topic-p2 = Subiectele blocate nu vor mai apărea în fluxul tău.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Blochează { $topic }

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Subiecte
newtab-section-manage-topics-button-v2 =
    .label = Gestionează subiectele
newtab-section-mangage-topics-followed-topics = Urmărit
newtab-section-mangage-topics-followed-topics-empty-state = Nu ai urmărit încă niciun subiect.
newtab-section-mangage-topics-blocked-topics = Blocat
newtab-section-mangage-topics-blocked-topics-empty-state = Nu ai blocat încă niciun subiect.
newtab-custom-wallpaper-title = Sunt disponibile imagini de fundal personalizate
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Încarcă propria imagine de fundal sau alege o culoare personalizată ca să îți personalizezi imaginea de fundal { -brand-product-name }.
newtab-custom-wallpaper-cta = Încearcă-l

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Alege o imagine de fundal ca să personalizezi { -brand-product-name }
newtab-new-user-custom-wallpaper-subtitle = Fă să simți fiecare filă nouă ca a ta, cu imagini de fundal și culori personalizate.
newtab-new-user-custom-wallpaper-cta = Încearcă acum

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Descarcă { -brand-product-name } pentru mobil
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Scanează codul ca să navighezi în siguranță din mers.
newtab-download-mobile-highlight-body-variant-b = Reia de unde ai rămas când sincronizezi filele, parolele și multe altele.
newtab-download-mobile-highlight-body-variant-c = Știai că poți lua { -brand-product-name } oriunde? În același browser. În buzunar.
newtab-download-mobile-highlight-image =
    .aria-label = Cod QR pentru descărcarea { -brand-product-name } pentru mobil

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Preferatele tale la îndemână
newtab-shortcuts-highlight-subtitle = Adaugă o comandă rapidă ca să-ți păstrezi site-urile preferate la un clic distanță.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = De ce raportezi asta?
newtab-report-ads-reason-not-interested =
    .label = Nu mă interesează
newtab-report-ads-reason-inappropriate =
    .label = E necuviincios
newtab-report-ads-reason-seen-it-too-many-times =
    .label = L-am văzut de prea multe ori
newtab-report-content-wrong-category =
    .label = Categorie greșită
newtab-report-content-outdated =
    .label = Învechit
newtab-report-content-inappropriate-offensive =
    .label = Necuviincios sau ofensator
newtab-report-content-spam-misleading =
    .label = Spam sau conținut înșelător
newtab-report-content-requires-payment-subscription =
    .label = Necesită plată sau abonament
newtab-report-content-requires-payment-subscription-learn-more = Află mai multe
newtab-report-cancel = Anulează
newtab-report-submit = Trimite
newtab-toast-thanks-for-reporting =
    .message = Îți mulțumim pentru sesizare.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Posibilitățile sunt nelimitate. Adaugă una.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Nou
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Finalizat ({ $number })
newtab-widget-task-list-menu-copy = Copiază
newtab-widget-lists-menu-edit = Editează denumirea listei
newtab-widget-lists-menu-create = Creează o listă nouă
newtab-widget-lists-menu-delete = Șterge lista
newtab-widget-lists-menu-copy = Copiază lista în clipboard
newtab-widget-lists-menu-hide = Ascunde toate listele
newtab-widget-lists-menu-learn-more = Află mai multe
newtab-widget-lists-input-add-an-item =
    .placeholder = Adaugă un element
newtab-widget-lists-input-error = Te rugăm să incluzi text ca să adaugi un element.
newtab-widget-lists-input-menu-open-link = Deschide linkul
newtab-widget-lists-input-menu-move-up = Mută în sus
newtab-widget-lists-input-menu-move-down = Mută în jos
newtab-widget-lists-input-menu-delete = Șterge
newtab-widget-lists-input-menu-edit = Editează
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Creează o listă nouă
newtab-widget-lists-name-label-default =
    .label = Listă de sarcini
newtab-widget-lists-name-placeholder-default =
    .placeholder = Listă de sarcini
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new =
    .placeholder = Listă nouă
newtab-widget-section-title = Widgeturi
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Ascunde widgeturile
    .aria-label = Ascunde toate widgeturile
newtab-widget-section-maximize =
    .title = Extinde widgeturile
    .aria-label = Extinde toate widgeturile la mărimea maximă
newtab-widget-section-minimize =
    .title = Minimizează widgeturile
    .aria-label = Minimizează toate widgeturile la mărimea compactă

## Strings for timer productivity widget
## When the timer ends, a system notification may be shown. Depending on which mode the timer is in, that message would be shown

newtab-widget-timer-notification-title = Cronometru
newtab-widget-timer-notification-focus = Timpul de concentrare a expirat. Ai lucrat bine. Ai nevoie de o pauză?
newtab-widget-timer-notification-break = Pauza s-a terminat. Ești gata de concentrare?
newtab-widget-timer-notification-warning = Notificările sunt dezactivate
newtab-widget-timer-mode-focus =
    .label = Concentrează-te
newtab-widget-timer-mode-break =
    .label = Pauză
newtab-widget-timer-label-play =
    .label = Redă
newtab-widget-timer-label-pause =
    .label = Pauză
newtab-widget-timer-reset =
    .title = Resetează
newtab-widget-timer-menu-notifications = Oprește notificările
newtab-widget-timer-menu-notifications-on = Activează notificările
newtab-widget-timer-menu-hide = Ascunde cronometrul
newtab-widget-timer-menu-learn-more = Află mai multe
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Titluri principale
newtab-daily-briefing-card-menu-dismiss = Elimină
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Actualizat acum { $minutes } min
newtab-widget-message-title = Stai concentrat(ă) cu liste și un cronometru încorporat
# to-dos stands for "things to do".
newtab-widget-message-copy = De la mementouri rapide la liste zilnice de sarcini, sesiuni de concentrare până la pauze de întindere — stai concentrat(ă) pe sarcină și o termini la timp.
newtab-promo-card-title = Susține { -brand-product-name }
newtab-promo-card-body = Sponsorii noștri ne susțin misiunea de a construi un web mai bun
newtab-promo-card-cta = Află mai multe
newtab-promo-card-dismiss-button =
    .title = Respinge
    .aria-label = Respinge

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Închide
    .aria-label = Închide
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Personalizează-ți acest spațiu
newtab-activation-window-message-customization-focus-message = Alege o imagine de fundal nouă, adaugă scurtături către site-urile preferate și fii la curent cu știrile care te interesează.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Începe personalizarea
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Acest spațiu funcționează după regulile tale
newtab-activation-window-message-values-focus-message = { -brand-product-name } îți permite să navighezi cum dorești, cu un mod mai personal de a-ți începe ziua online. Personalizează { -brand-product-name }.
