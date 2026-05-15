# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Pestanya nova
newtab-settings-button =
    .title = Personalitzeu la pàgina de pestanya nova
newtab-customize-panel-icon-button =
    .title = Personalitza aquesta pàgina
newtab-customize-panel-icon-button-label = Personalitza
newtab-personalize-settings-icon-label =
    .title = Personalitza la pestanya nova
    .aria-label = Paràmetres
newtab-settings-dialog-label =
    .aria-label = Paràmetres
newtab-personalize-icon-label =
    .title = Personalitza la pestanya nova
    .aria-label = Personalitza la pestanya nova
newtab-personalize-dialog-label =
    .aria-label = Personalitza
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Cerca
    .aria-label = Cerca
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Cerqueu amb { $engine } o escriviu una adreça
newtab-search-box-handoff-text-no-engine = Escriviu una cerca o adreça
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Cerqueu amb { $engine } o escriviu una adreça
    .title = Cerqueu amb { $engine } o escriviu una adreça
    .aria-label = Cerqueu amb { $engine } o escriviu una adreça
newtab-search-box-handoff-input-no-engine =
    .placeholder = Escriviu una cerca o adreça
    .title = Escriviu una cerca o adreça
    .aria-label = Escriviu una cerca o adreça
newtab-search-box-text = Cerca al web
newtab-search-box-input =
    .placeholder = Cerca al web
    .aria-label = Cerca al web

## Top Sites - General form dialog.

newtab-topsites-add-search-engine-header = Afegeix un motor de cerca
newtab-topsites-add-shortcut-header = Drecera nova
newtab-topsites-edit-topsites-header = Edita el lloc principal
newtab-topsites-edit-shortcut-header = Edita la drecera
newtab-topsites-add-shortcut-label = Afegeix una drecera
newtab-topsites-add-shortcut-title =
    .title = Afegeix una drecera
    .aria-label = Afegeix una drecera
newtab-topsites-title-label = Títol
newtab-topsites-title-input =
    .placeholder = Escriviu el títol
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Escriviu o enganxeu un URL
newtab-topsites-url-validation = Es necessita un URL vàlid
newtab-topsites-image-url-label = URL d'imatge personalitzada
newtab-topsites-use-image-link = Utilitza una imatge personalitzada…
newtab-topsites-image-validation = S'ha produït un error en carregar la imatge. Proveu un altre URL.

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Cancel·la
newtab-topsites-delete-history-button = Suprimeix de l'historial
newtab-topsites-save-button = Desa
newtab-topsites-preview-button = Previsualització
newtab-topsites-add-button = Afegeix

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Segur que voleu suprimir de l'historial totes les instàncies d'aquesta pàgina?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Aquesta acció no es pot desfer.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Patrocinat

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (fixat)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Obre el menú
    .aria-label = Obre el menú
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Elimina
    .aria-label = Elimina
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Obre el menú
    .aria-label = Obre el menú contextual de { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Edita aquest lloc
    .aria-label = Edita aquest lloc

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Edita
newtab-menu-open-new-window = Obre en una finestra nova
newtab-menu-open-new-private-window = Obre en una finestra privada nova
newtab-menu-dismiss = Descarta
newtab-menu-pin = Fixa
newtab-menu-unpin = No fixis
newtab-menu-delete-history = Suprimeix de l'historial
newtab-menu-save-to-pocket = Desa al { -pocket-brand-name }
newtab-menu-delete-pocket = Suprimeix del { -pocket-brand-name }
newtab-menu-archive-pocket = Arxiva en el { -pocket-brand-name }
newtab-menu-show-privacy-info = Els nostres patrocinadors i la vostra privadesa
newtab-menu-about-fakespot = Quant a { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Informa
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Bloca
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Deixa de seguir el tema

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Gestiona el contingut patrocinat
newtab-menu-our-sponsors-and-your-privacy = Els nostres patrocinadors i la vostra privadesa
newtab-menu-report-this-ad = Informa sobre aquest anunci

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Fet
newtab-privacy-modal-button-manage = Gestiona els paràmetres de contingut patrocinat
newtab-privacy-modal-header = La vostra privadesa és important.
newtab-privacy-modal-paragraph-2 =
    A més de mostrar els articles més captivadors, també us mostrem contingut
    rellevant revisat per patrocinadors selectes. Us garantim que <strong>les vostres dades
    de navegació no surten mai del { -brand-product-name }</strong>: no les veiem ni nosaltres 
    ni els nostres patrocinadors.
newtab-privacy-modal-link = Vegeu com funciona la privadesa en la pestanya nova

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Elimina l'adreça d'interès
# Bookmark is a verb here.
newtab-menu-bookmark = Afegeix a les adreces d'interès

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Copia l'enllaç de la baixada
newtab-menu-go-to-download-page = Vés a la pàgina de la baixada
newtab-menu-remove-download = Elimina de l'historial

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Mostra-ho en el Finder
       *[other] Obre la carpeta on es troba
    }
newtab-menu-open-file = Obre el fitxer

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Visitat
newtab-label-bookmarked = A les adreces d'interès
newtab-label-removed-bookmark = S'ha eliminat l'adreça d'interès
newtab-label-recommended = Tendència
newtab-label-saved = Desat al { -pocket-brand-name }
newtab-label-download = Baixat
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Patrocinat
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Patrocinat per { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } - { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Patrocinat

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Elimina la secció
newtab-section-menu-collapse-section = Redueix la secció
newtab-section-menu-expand-section = Amplia la secció
newtab-section-menu-manage-section = Gestiona la secció
newtab-section-menu-manage-webext = Gestiona l'extensió
newtab-section-menu-add-topsite = Afegeix com a lloc principal
newtab-section-menu-add-search-engine = Afegeix un motor de cerca
newtab-section-menu-move-up = Mou cap amunt
newtab-section-menu-move-down = Mou cap avall
newtab-section-menu-privacy-notice = Avís de privadesa

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Redueix la secció
newtab-section-expand-section-label =
    .aria-label = Amplia la secció

## Section Headers.

newtab-section-header-topsites = Llocs principals
newtab-section-header-recent-activity = Activitat recent
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Recomanat per { $provider }
newtab-section-header-stories = Articles suggerents
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Seleccions del dia

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Comenceu a navegar i aquí us mostrarem els millors articles, vídeos i altres pàgines que hàgiu visitat o afegit a les adreces d'interès recentment.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Ja esteu al dia. Torneu més tard per veure més articles populars de { $provider }. No podeu esperar? Trieu un tema popular per descobrir els articles més interessants de tot el web.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Ja esteu al dia. Torneu més tard per veure més articles. No podeu esperar? Trieu un tema popular per descobrir els articles més interessants de tot el web.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Ja esteu al dia.
newtab-discovery-empty-section-topstories-content = Torneu més tard per veure si hi ha més articles.
newtab-discovery-empty-section-topstories-try-again-button = Torna-ho a provar
newtab-discovery-empty-section-topstories-loading = S'està carregant…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Ups! Sembla que aquesta secció no s'ha carregat del tot.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Temes populars:
newtab-pocket-new-topics-title = Voleu encara més articles? Descobriu aquests temes populars del { -pocket-brand-name }
newtab-pocket-more-recommendations = Més recomanacions
newtab-pocket-learn-more = Més informació
newtab-pocket-cta-button = Obtén el { -pocket-brand-name }
newtab-pocket-cta-text = Deseu els vostres articles preferits al { -pocket-brand-name } i gaudiu d'altres recomanacions fascinants.
newtab-pocket-pocket-firefox-family = El { -pocket-brand-name } és part de la família { -brand-product-name }
newtab-pocket-save = Desa
newtab-pocket-saved = S'ha desat

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Més d’aquest estil
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = No és per a mi
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Gràcies. Els vostres comentaris ens ajudaran a millorar-vos les recomanacions.
newtab-toast-dismiss-button =
    .title = Descarta
    .aria-label = Descarta

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Descobriu el millor del web
newtab-pocket-onboarding-cta = El { -pocket-brand-name } revisa un gran ventall de publicacions per oferir el contingut més informatiu, inspirador i fiable directament en el vostre navegador { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Vaja, s'ha produït un error en carregar aquest contingut.
newtab-error-fallback-refresh-link = Actualitzeu la pàgina per tornar-ho a provar.

## Customization Menu

newtab-custom-shortcuts-title = Dreceres
newtab-custom-shortcuts-subtitle = Llocs que deseu o visiteu
newtab-custom-shortcuts-toggle =
    .label = Dreceres
    .description = Llocs que deseu o visiteu
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } fila
       *[other] { $num } files
    }
newtab-custom-sponsored-sites = Dreceres patrocinades
newtab-custom-pocket-title = Recomanat per { -pocket-brand-name }
newtab-custom-pocket-subtitle = Contingut excepcional seleccionat per { -pocket-brand-name }, part de la família de { -brand-product-name }
newtab-custom-stories-toggle =
    .label = Articles recomanats
    .description = Contingut excepcional seleccionat per la família del { -brand-product-name }
newtab-custom-stories-personalized-toggle =
    .label = Articles
newtab-custom-stories-personalized-checkbox-label = Articles personalitzats basats en la vostra activitat
newtab-custom-pocket-sponsored = Articles patrocinats
newtab-custom-pocket-show-recent-saves = Mostra els elements desats recentment
newtab-custom-recent-title = Activitat recent
newtab-custom-recent-subtitle = Una selecció de llocs i continguts recents
newtab-custom-weather-toggle =
    .label = Informació meteorològica
    .description = La previsió d’avui d’un cop d’ull
newtab-custom-widget-weather-toggle =
    .label = Informació meteorològica
newtab-custom-widget-lists-toggle =
    .label = Llistes
newtab-custom-widget-timer-toggle =
    .label = Temporitzador
newtab-custom-widget-section-title = Ginys
newtab-custom-widget-section-toggle =
    .label = Ginys
newtab-widget-manage-title = Ginys
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Tanca
    .aria-label = Tanca el menú
newtab-custom-close-button = Tanca
newtab-custom-settings = Gestiona més paràmetres

## New Tab Wallpapers

newtab-wallpaper-title = Fons de pantalla
newtab-wallpaper-reset = Reinicia als valors per defecte
newtab-wallpaper-upload-image = Puja una imatge
newtab-wallpaper-custom-color = Trieu un color
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = La imatge supera el límit de mida de fitxer de { $file_size } MB. Proveu de pujar un fitxer més petit.
newtab-wallpaper-error-upload-file-type = No s’ha pogut pujar el fitxer. Torneu-ho a provar amb un fitxer d'imatge.
newtab-wallpaper-error-file-type = No s’ha pogut pujar el fitxer. Torneu-ho a provar amb un altre tipus de fitxer.
newtab-wallpaper-light-red-panda = Panda vermell
newtab-wallpaper-light-mountain = Muntanya blanca
newtab-wallpaper-light-sky = Cel amb núvols roses i liles
newtab-wallpaper-light-color = Formes blaves, roses i grogues
newtab-wallpaper-light-landscape = Paisatge de muntanya amb boirina blava
newtab-wallpaper-light-beach = Platja amb palmera
newtab-wallpaper-dark-aurora = Aurora boreal
newtab-wallpaper-dark-color = Formes vermelles i blaves
newtab-wallpaper-dark-panda = Panda vermell amagat al bosc
newtab-wallpaper-dark-sky = Paisatge urbà amb un cel nocturn
newtab-wallpaper-dark-mountain = Paisatge de muntanya
newtab-wallpaper-dark-city = Paisatge urbà porpra
newtab-wallpaper-dark-fox-anniversary = Una guineu a la vorera prop d'un bosc
newtab-wallpaper-light-fox-anniversary = Una guineu en un camp d'herba amb un paisatge de muntanya emboirat

## Solid Colors

newtab-wallpaper-category-title-colors = Colors sòlids
newtab-wallpaper-blue = Blau
newtab-wallpaper-light-blue = Blau clar
newtab-wallpaper-light-purple = Porpra clar
newtab-wallpaper-light-green = Verd clar
newtab-wallpaper-green = Verd
newtab-wallpaper-beige = Beix
newtab-wallpaper-yellow = Groc
newtab-wallpaper-orange = Taronja
newtab-wallpaper-pink = Rosa
newtab-wallpaper-light-pink = Rosa clar
newtab-wallpaper-red = Vermell
newtab-wallpaper-dark-blue = Blau fosc
newtab-wallpaper-dark-purple = Porpra fosc
newtab-wallpaper-dark-green = Verd fosc
newtab-wallpaper-brown = Marró

## Abstract

newtab-wallpaper-category-title-abstract = Abstracte
newtab-wallpaper-abstract-green = Formes verdes
newtab-wallpaper-abstract-blue = Formes blaves
newtab-wallpaper-abstract-purple = Formes porpres
newtab-wallpaper-abstract-orange = Formes taronges
newtab-wallpaper-gradient-orange = Degradat taronja i rosa
newtab-wallpaper-abstract-blue-purple = Formes blaves i porpres
newtab-wallpaper-abstract-white-curves = Blanc amb corbes ombrejades
newtab-wallpaper-abstract-purple-green = Gradient de llum morada i verda
newtab-wallpaper-abstract-blue-purple-waves = Formes ondulades blaves i morades
newtab-wallpaper-abstract-black-waves = Formes ondulades negres

## Firefox

newtab-wallpaper-category-title-photographs = Fotografies
newtab-wallpaper-beach-at-sunrise = Platja a l'alba
newtab-wallpaper-beach-at-sunset = Platja al capvespre
newtab-wallpaper-storm-sky = Cel tempestuós
newtab-wallpaper-sky-with-pink-clouds = Cel amb núvols rosats
newtab-wallpaper-red-panda-yawns-in-a-tree = Un panda vermell badalla en un arbre
newtab-wallpaper-white-mountains = Muntanyes blanques
newtab-wallpaper-hot-air-balloons = Globus aerostàtics de colors variats durant el dia
newtab-wallpaper-starry-canyon = Nit blava estrellada
newtab-wallpaper-suspension-bridge = Fotografia d'un pont penjant gris durant el dia
newtab-wallpaper-sand-dunes = Dunes de sorra blanca
newtab-wallpaper-palm-trees = Silueta de cocoters durant l'hora daurada
newtab-wallpaper-blue-flowers = Fotografia de primer pla de flors de pètals blaus
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Foto de <a data-l10n-name="name-link">{ $author_string }</a> a <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Afegiu-hi un toc de color
newtab-wallpaper-feature-highlight-content = Doneu un aspecte més fresc a les pestanyes noves amb els fons de pantalla.
newtab-wallpaper-feature-highlight-button = Entesos
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Tanca
    .aria-label = Tanca la finestra emergent
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Celestial
newtab-wallpaper-celestial-lunar-eclipse = Eclipsi lunar
newtab-wallpaper-celestial-earth-night = Fotografia nocturna des de l'òrbita terrestre baixa
newtab-wallpaper-celestial-starry-sky = Cel estrellat
newtab-wallpaper-celestial-eclipse-time-lapse = Filmació a intervals d'eclipse lunar
newtab-wallpaper-celestial-black-hole = Il·lustració d'una galàxia d'un forat negre
newtab-wallpaper-celestial-river = Imatge de satèl·lit d'un riu

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Mostra la previsió meteorològica de { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Patrocinat
newtab-weather-menu-change-location = Canvia la ubicació
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Cerca la ubicació
    .aria-label = Cerca la ubicació
newtab-weather-menu-weather-display = Visualització de la informació meteorològica
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Senzilla
newtab-weather-menu-change-weather-display-simple = Canvia a la vista senzilla
newtab-weather-menu-weather-display-option-detailed = Detallada
newtab-weather-menu-change-weather-display-detailed = Canvia a la vista detallada
newtab-weather-menu-temperature-units = Unitats de temperatura
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Canvia a Fahrenheit
newtab-weather-menu-change-temperature-units-celsius = Canvia a Celsius
newtab-weather-menu-hide-weather = Amaga la informació meteorològica en les pestanyes noves
newtab-weather-menu-learn-more = Més informació
newtab-weather-menu-detect-my-location = Detecta la meva ubicació
# This message is shown if user is working offline
newtab-weather-error-not-available = La informació meteorològica no està disponible ara mateix.
newtab-weather-opt-in-see-weather = Voleu veure el temps que fa a la vostra ubicació?
newtab-weather-opt-in-not-now =
    .label = Ara no
newtab-weather-opt-in-yes =
    .label = Sí
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Nova York
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Mostra la previsió meteorològica de { $provider }
    .aria-description = { $provider } ∙ Patrocinat

## Topic Labels

newtab-topic-label-business = Negocis
newtab-topic-label-career = Carrera professional
newtab-topic-label-education = Educació
newtab-topic-label-arts = Entreteniment
newtab-topic-label-food = Menjar
newtab-topic-label-health = Salut
newtab-topic-label-hobbies = Jocs
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Diners
newtab-topic-label-society-parenting = Criança
newtab-topic-label-government = Política
newtab-topic-label-education-science = Ciència
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Creixement personal
newtab-topic-label-sports = Esports
newtab-topic-label-tech = Tecnologia
newtab-topic-label-travel = Viatges
newtab-topic-label-home = Casa i jardí

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Trieu temes per a ajustar-vos les recomanacions
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Trieu dos temes o més. Els nostres experts prioritzen els articles que s’ajusten als vostres interessos. Podeu actualitzar-los quan vulgueu.
newtab-topic-selection-save-button = Desa
newtab-topic-selection-cancel-button = Cancel·la
newtab-topic-selection-button-maybe-later = Potser més tard
newtab-topic-selection-privacy-link = Informeu-vos sobre com protegim i gestionem les dades
newtab-topic-selection-button-update-interests = Actualitzeu els vostres interessos
newtab-topic-selection-button-pick-interests = Trieu els vostres interessos

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Segueix
newtab-section-following-button = Seguint
newtab-section-unfollow-button = Deixar de seguir
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Ajusteu el canal
newtab-section-follow-highlight-subtitle = Seguiu els vostres interessos per a veure més contingut que us agradi.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Bloqueja
newtab-section-blocked-button = Blocat
newtab-section-unblock-button = Desbloca

## Confirmation modal for blocking a section

newtab-section-cancel-button = Ara no
newtab-section-confirm-block-topic-p1 = Segur que voleu blocar aquest tema?
newtab-section-confirm-block-topic-p2 = Els temes blocats ja no apareixeran a la vostra cronologia.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Bloca { $topic }

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Temes
newtab-section-manage-topics-button-v2 =
    .label = Gestiona els temes
newtab-section-mangage-topics-followed-topics = Seguits
newtab-section-mangage-topics-followed-topics-empty-state = Encara no seguiu cap tema.
newtab-section-mangage-topics-blocked-topics = Blocat
newtab-section-mangage-topics-blocked-topics-empty-state = Encara no heu blocat cap tema.
newtab-custom-wallpaper-title = Els fons de pantalla personalitzats són aquí
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Pugeu els vostres fons de pantalla o trieu un color per a personalitzar el { -brand-product-name }.
newtab-custom-wallpaper-cta = Proveu-ho

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Trieu un fons de pantalla per a personalitzar el { -brand-product-name }
newtab-new-user-custom-wallpaper-subtitle = Decoreu cada pestanya nova al vostre gust amb fons de pantalla i colors personalitzats.
newtab-new-user-custom-wallpaper-cta = Proveu-ho ara

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Baixeu el { -brand-product-name } per a mòbils
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Escanegeu el codi per a navegar de manera segura des de qualsevol lloc.
newtab-download-mobile-highlight-body-variant-b = Continueu des d'on ho havíeu deixat quan sincronitzeu les pestanyes, les contrasenyes i més.
newtab-download-mobile-highlight-body-variant-c = Sabeu que us podeu endur el { -brand-product-name } a qualsevol lloc? El mateix navegador. A la butxaca.
newtab-download-mobile-highlight-image =
    .aria-label = Codi QR per baixar el { -brand-product-name } per a mòbils

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Els vostres favorits a l'abast de la mà
newtab-shortcuts-highlight-subtitle = Afegiu una drecera per a tenir els vostres llocs favorits a un sol clic.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Per què ho denuncieu?
newtab-report-ads-reason-not-interested =
    .label = No m'interessa
newtab-report-ads-reason-inappropriate =
    .label = És inadequat
newtab-report-ads-reason-seen-it-too-many-times =
    .label = L'he vist massa cops
newtab-report-content-wrong-category =
    .label = Categoria incorrecta
newtab-report-content-outdated =
    .label = Obsolet
newtab-report-content-inappropriate-offensive =
    .label = Inadequat o ofensiu
newtab-report-content-spam-misleading =
    .label = Correu brossa o enganyós
newtab-report-content-requires-payment-subscription =
    .label = El pagament o la subscripció són obligatoris
newtab-report-content-requires-payment-subscription-learn-more = Més informació
newtab-report-cancel = Cancel·la
newtab-report-submit = Envia
newtab-toast-thanks-for-reporting =
    .message = Gràcies per denunciar-ho.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Les possibilitats són infinites. Afegiu-ne una.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Nova
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Completats ({ $number })
newtab-widget-task-list-menu-copy = Copia
newtab-widget-lists-menu-edit = Edita el nom de la llista
newtab-widget-lists-menu-create = Crea una llista nova
newtab-widget-lists-menu-delete = Suprimeix aquesta llista
newtab-widget-lists-menu-copy = Copia la llista al porta-retalls
newtab-widget-lists-menu-hide = Amaga totes les llistes
newtab-widget-lists-menu-learn-more = Més informació
newtab-widget-lists-input-add-an-item =
    .placeholder = Afegeix un element
newtab-widget-lists-input-error = Incloeu text per a afegir un element.
newtab-widget-lists-input-menu-open-link = Obre l'enllaç
newtab-widget-lists-input-menu-move-up = Mou cap amunt
newtab-widget-lists-input-menu-move-down = Mou cap avall
newtab-widget-lists-input-menu-delete = Suprimeix
newtab-widget-lists-input-menu-edit = Edita
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Crea una llista nova
newtab-widget-lists-name-label-default =
    .label = Llista de tasques
newtab-widget-lists-name-placeholder-default =
    .placeholder = Llista de tasques
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new =
    .placeholder = Llista nova
newtab-widget-section-title = Ginys
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Amaga els ginys
    .aria-label = Amaga tots els ginys
newtab-widget-section-maximize =
    .title = Amplia els ginys
    .aria-label = Amplia tots els ginys al màxim
newtab-widget-section-minimize =
    .title = Minimitza els widgets
    .aria-label = Minimitza tots els widgets a mida compacta

## Strings for timer productivity widget
## When the timer ends, a system notification may be shown. Depending on which mode the timer is in, that message would be shown

newtab-widget-timer-notification-title = Temporitzador
newtab-widget-timer-notification-focus = S'ha acabat el temps de concentració. Et felicito. Vols fer una pausa?
newtab-widget-timer-notification-break = S'ha acabat la pausa. Estàs a punt per concentrar-te?
newtab-widget-timer-notification-warning = Les notificacions estan desactivades
newtab-widget-timer-mode-focus =
    .label = Concentració
newtab-widget-timer-mode-break =
    .label = Pausa
newtab-widget-timer-label-play =
    .label = Reprodueix
newtab-widget-timer-reset =
    .title = Reinicia
newtab-widget-timer-menu-notifications = Desactiva les notificacions
newtab-widget-timer-menu-notifications-on = Activa les notificacions
newtab-widget-timer-menu-hide = Amaga el temporitzador
newtab-widget-timer-menu-learn-more = Més informació
newtab-widget-message-title = Mantingueu la concentració amb les llistes i amb un temporitzador integrat
# to-dos stands for "things to do".
newtab-widget-message-copy = Des de recordatoris ràpids fins a tasques diàries pendents, sessions de concentració o pauses d'estirament: manteniu la productivitat i la puntualitat.
newtab-promo-card-body = Els nostres patrocinadors donen suport a la nostra missió de crear un web millor
newtab-promo-card-cta = Més informació
newtab-promo-card-dismiss-button =
    .title = Ignora
    .aria-label = Ignora
