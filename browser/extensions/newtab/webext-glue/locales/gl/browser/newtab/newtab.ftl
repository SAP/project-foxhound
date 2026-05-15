# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Nova lapela
newtab-settings-button =
    .title = Personalice a páxina de nova lapela
newtab-customize-panel-icon-button =
    .title = Personalizar esta páxina
newtab-customize-panel-icon-button-label = Personalizar
newtab-personalize-settings-icon-label =
    .title = Personalizar a nova pestana
    .aria-label = Configuración
newtab-settings-dialog-label =
    .aria-label = Configuración
newtab-personalize-icon-label =
    .title = personalizar lapela nova
    .aria-label = personalizar lapela nova
newtab-personalize-dialog-label =
    .aria-label = Personalizar
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Buscar
    .aria-label = Buscar
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Buscar con { $engine } ou escribir enderezo
newtab-search-box-handoff-text-no-engine = Buscar ou introducir enderezo
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Buscar con { $engine } ou introducir enderezo
    .title = Buscar con { $engine } ou introducir enderezo
    .aria-label = Buscar con { $engine } ou introducir enderezo
newtab-search-box-handoff-input-no-engine =
    .placeholder = Buscar ou introducir enderezo
    .title = Buscar ou introducir enderezo
    .aria-label = Buscar ou introducir enderezo
newtab-search-box-text = Buscar na Rede
newtab-search-box-input =
    .placeholder = Buscar na web
    .aria-label = Buscar na web

## Top Sites - General form dialog.

newtab-topsites-add-search-engine-header = Engadir buscador
newtab-topsites-add-shortcut-header = Novo atallo
newtab-topsites-edit-topsites-header = Editar sitio favorito
newtab-topsites-edit-shortcut-header = Editar o atallo
newtab-topsites-add-shortcut-label = Engadir atallo
newtab-topsites-add-shortcut-title =
    .title = Engadir atallo
    .aria-label = Engadir atallo
newtab-topsites-title-label = Título
newtab-topsites-title-input =
    .placeholder = Escribir un título
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Escribir ou pegar un URL
newtab-topsites-url-validation = Requírese un URL válido
newtab-topsites-image-url-label = URL da imaxe personalizada
newtab-topsites-use-image-link = Usar unha imaxe personalizada…
newtab-topsites-image-validation = Produciuse un fallo ao cargar a imaxe. Probe un URL diferente.

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Cancelar
newtab-topsites-delete-history-button = Eliminar do historial
newtab-topsites-save-button = Gardar
newtab-topsites-preview-button = Previsualizar
newtab-topsites-add-button = Engadir

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Confirma que quere eliminar do historial todas as instancias desta páxina?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Non é posíbel desfacer esta acción.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Patrocinado

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (fixado)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Abrir menú
    .aria-label = Abrir menú
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Eliminar
    .aria-label = Eliminar
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Abrir menú
    .aria-label = Abrir o menú contextual para { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Editar este sitio
    .aria-label = Editar este sitio

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Editar
newtab-menu-open-new-window = Abrir nunha nova xanela
newtab-menu-open-new-private-window = Abrir nunha nova xanela privada
newtab-menu-dismiss = Rexeitar
newtab-menu-pin = Fixar
newtab-menu-unpin = Quitar
newtab-menu-delete-history = Eliminar do historial
newtab-menu-save-to-pocket = Gardar en { -pocket-brand-name }
newtab-menu-delete-pocket = Eliminar do { -pocket-brand-name }
newtab-menu-archive-pocket = Arquivar no { -pocket-brand-name }
newtab-menu-show-privacy-info = Os nosos patrocinadores e a súa privacidade
newtab-menu-about-fakespot = Acerca de { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Informar
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Bloquear
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Deixa de seguir o tema

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Xestionar contido patrocinado
newtab-menu-our-sponsors-and-your-privacy = Os nosos patrocinadores e a túa privacidade
newtab-menu-report-this-ad = Denunciar este anuncio

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Feito
newtab-privacy-modal-button-manage = Xestionar a configuración de contido patrocinado
newtab-privacy-modal-header = A súa privacidade importa.
newtab-privacy-modal-paragraph-2 =
    Ademais de servir historias engaiolantes, tamén lle mostramos
    contido relevante, e inspeccionado antes, de patrocinadores selectos. Teña a certeza de que <strong> a súa navegación
    os datos nunca deixan a súa copia persoal de { -brand-product-name } </strong>: non a vemos nós e os nosos
    patrocinadores tampouco a ven.
newtab-privacy-modal-link = Aprender como funciona a privacidade na nova lapela

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Retirar marcador
# Bookmark is a verb here.
newtab-menu-bookmark = Engadir aos marcadores

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Copiar ligazón de descarga
newtab-menu-go-to-download-page = Ir á páxina de descargas
newtab-menu-remove-download = Retirar do historial

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Amosar no Finder
       *[other] Abrir o cartafol que o contén
    }
newtab-menu-open-file = Abrir o ficheiro

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Visitados
newtab-label-bookmarked = Nos marcadores
newtab-label-removed-bookmark = Retirouse o marcador
newtab-label-recommended = Tendencias
newtab-label-saved = Gardado no { -pocket-brand-name }
newtab-label-download = Descargado
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource }· Patrocinado
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Patrocinado por { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Patrocinado

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Retirar sección
newtab-section-menu-collapse-section = Contraer sección
newtab-section-menu-expand-section = Expandir sección
newtab-section-menu-manage-section = Xestionar sección
newtab-section-menu-manage-webext = Xestionar extensión
newtab-section-menu-add-topsite = Engadir sitio favorito
newtab-section-menu-add-search-engine = Engadir buscador
newtab-section-menu-move-up = Subir
newtab-section-menu-move-down = Baixar
newtab-section-menu-privacy-notice = Política de privacidade

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Contraer sección
newtab-section-expand-section-label =
    .aria-label = Expandir sección

## Section Headers.

newtab-section-header-topsites = Sitios favoritos
newtab-section-header-recent-activity = Actividade recente
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Recomendado por { $provider }
newtab-section-header-stories = Historias para reflexionar
# "picks" refers to recommended articles
newtab-section-header-todays-picks = As seleccións de hoxe para ti

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Comece a navegar e aquí amosarémoslle algúns dos mellores artigos, vídeos e outras páxinas que visitara recentemente ou que engadira aos marcadores.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Xa está ao día. Regrese máis tarde para ver máis historias de { $provider }. Non pode agardar? Seleccione un tema popular e atopará máis historias interesantes da web.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Xa estás ao día. Volve máis tarde para ver máis historias. Non podes esperar? Selecciona un tema popular para atopar máis historias xeniais na web.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Está atrapado!
newtab-discovery-empty-section-topstories-content = Volva máis tarde para ver máis historias.
newtab-discovery-empty-section-topstories-try-again-button = Intentar de novo
newtab-discovery-empty-section-topstories-loading = Cargando…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Carafio! Case cargamos esta sección, pero non de todo.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Temas populares:
newtab-pocket-new-topics-title = Quere máis historias? Vexa estes temas populares de { -pocket-brand-name }
newtab-pocket-more-recommendations = Máis recomendacións
newtab-pocket-learn-more = Máis información
newtab-pocket-cta-button = Obter { -pocket-brand-name }
newtab-pocket-cta-text = Garde no { -pocket-brand-name } as historias que lle gusten, e alimente a súa imaxinación con lecturas fascinantes.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } forma parte da familia { -brand-product-name }
newtab-pocket-save = Gardar
newtab-pocket-saved = Gardado

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Máis así
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Non para min
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Grazas. Os teus comentarios axudaranos a mellorar o teu feed.
newtab-toast-dismiss-button =
    .title = Rexeitar
    .aria-label = Rexeitar

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Descubrir o mellor da web
newtab-pocket-onboarding-cta = { -pocket-brand-name } explora unha ampla gama de publicacións para achegar o contido máis informativo, inspirador e fiable ao seu navegador { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Vaites, produciuse un erro ao cargar este contido.
newtab-error-fallback-refresh-link = Actualice a páxina para tentalo de novo.

## Customization Menu

newtab-custom-shortcuts-title = Atallos
newtab-custom-shortcuts-subtitle = Sitios gardados ou visitados
newtab-custom-shortcuts-toggle =
    .label = Atallos
    .description = Sitios gardados ou visitados
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } fila
       *[other] { $num } filas
    }
newtab-custom-sponsored-sites = Atallos patrocinados
newtab-custom-pocket-title = Recomendado por { -pocket-brand-name }
newtab-custom-pocket-subtitle = Contido excepcional patrocinado por { -pocket-brand-name }, parte da familia { -brand-product-name }
newtab-custom-stories-toggle =
    .label = Historias recomendadas
    .description = Contido excepcional seleccionado pola familia de { -brand-product-name }
newtab-custom-stories-personalized-toggle =
    .label = Historias
newtab-custom-pocket-sponsored = Historias patrocinadas
newtab-custom-pocket-show-recent-saves = Mostrar o gardado recentemente
newtab-custom-recent-title = Actividade recente
newtab-custom-recent-subtitle = Unha selección de sitios e contido recentes
newtab-custom-weather-toggle =
    .label = Tempo
    .description = Predición de hoxe dunha ollada
newtab-custom-widget-weather-toggle =
    .label = Tempo
newtab-custom-widget-lists-toggle =
    .label = Listas
newtab-custom-widget-timer-toggle =
    .label = Temporizador
newtab-custom-widget-section-title = Widgets
newtab-custom-widget-section-toggle =
    .label = Widgets
newtab-widget-manage-title = Widgets
newtab-custom-close-button = Pechar
newtab-custom-settings = Xestionar máis axustes

## New Tab Wallpapers

newtab-wallpaper-title = Fondos de pantalla
newtab-wallpaper-reset = Restablecer os valores predeterminados
newtab-wallpaper-upload-image = Subir unha imaxe
newtab-wallpaper-custom-color = Escolle unha cor
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = A imaxe superou o límite de tamaño do ficheiro de { $file_size }MB. Proba a subir un ficheiro máis pequeno.
newtab-wallpaper-error-file-type = Non puidemos cargar o teu ficheiro. Téntao de novo cun tipo de ficheiro diferente.
newtab-wallpaper-light-red-panda = Panda vermello
newtab-wallpaper-light-mountain = Montaña branca
newtab-wallpaper-light-sky = Ceo con nubes rosas e vermellas
newtab-wallpaper-light-color = Formas azuis, rosas e amarelas
newtab-wallpaper-light-landscape = Paisaxe de montaña de néboa azul
newtab-wallpaper-light-beach = Praia con palmeira
newtab-wallpaper-dark-aurora = Aurora boreal
newtab-wallpaper-dark-color = Formas vermellas e azuis
newtab-wallpaper-dark-panda = Panda vermello escondido no bosque
newtab-wallpaper-dark-sky = Paisaxe da cidade cun ceo nocturno
newtab-wallpaper-dark-mountain = Paisaxe de montaña
newtab-wallpaper-dark-city = Paisaxe de cidade púrpura
newtab-wallpaper-dark-fox-anniversary = Un raposo no pavimento preto dun bosque
newtab-wallpaper-light-fox-anniversary = Un raposo nun campo herboso cunha paisaxe de montaña brumosa

## Solid Colors

newtab-wallpaper-category-title-colors = Cores sólidas
newtab-wallpaper-blue = Azul
newtab-wallpaper-light-blue = Azul claro
newtab-wallpaper-light-purple = Púrpura claro
newtab-wallpaper-light-green = Verde claro
newtab-wallpaper-green = Verde
newtab-wallpaper-beige = Beixe
newtab-wallpaper-yellow = Amarelo
newtab-wallpaper-orange = Laranxa
newtab-wallpaper-pink = Rosa
newtab-wallpaper-light-pink = Rosa claro
newtab-wallpaper-red = Vermello
newtab-wallpaper-dark-blue = Azul escuro
newtab-wallpaper-dark-purple = Violeta escuro
newtab-wallpaper-dark-green = Verde escuro
newtab-wallpaper-brown = Marrón

## Abstract

newtab-wallpaper-category-title-abstract = Abstracto
newtab-wallpaper-abstract-green = Formas verdes
newtab-wallpaper-abstract-blue = Formas azuis
newtab-wallpaper-abstract-purple = Formas violetas
newtab-wallpaper-abstract-orange = Formas laranxas
newtab-wallpaper-gradient-orange = Degradado laranxa e rosa
newtab-wallpaper-abstract-blue-purple = Formas azuis e moradas
newtab-wallpaper-abstract-white-curves = Branco con curvas sombreadas
newtab-wallpaper-abstract-purple-green = Degradado de luz violeta e verde
newtab-wallpaper-abstract-blue-purple-waves = Formas onduladas azuis e moradas
newtab-wallpaper-abstract-black-waves = Formas onduladas negras

## Firefox

newtab-wallpaper-category-title-photographs = Fotografías
newtab-wallpaper-beach-at-sunrise = Praia ao amencer
newtab-wallpaper-beach-at-sunset = Praia ao solpor
newtab-wallpaper-storm-sky = Ceo de tormenta
newtab-wallpaper-sky-with-pink-clouds = Ceo con nubes rosas
newtab-wallpaper-red-panda-yawns-in-a-tree = Un panda vermello bocexa nunha árbore
newtab-wallpaper-white-mountains = Montañas brancas
newtab-wallpaper-hot-air-balloons = Cores variados de globos aerostáticos durante o día.
newtab-wallpaper-starry-canyon = Noite estrelada azul
newtab-wallpaper-suspension-bridge = Fotografía dunha ponte colgante gris durante o día
newtab-wallpaper-sand-dunes = Dunas de area branca
newtab-wallpaper-palm-trees = Silueta de cocoteiros durante a hora dourada
newtab-wallpaper-blue-flowers = Fotografía en detalle de flores de pétalos azuis en flor
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Foto de <a data-l10n-name="name-link">{ $author_string }</a> en <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Probar un toque de cor
newtab-wallpaper-feature-highlight-content = Dálle un aspecto novo á túa nova pestana con fondos de pantalla.
newtab-wallpaper-feature-highlight-button = Entendido
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Rexeitar
    .aria-label = Pechar ventá emerxente
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Celestial
newtab-wallpaper-celestial-lunar-eclipse = Eclipse lunar
newtab-wallpaper-celestial-earth-night = Foto nocturna desde a órbita terrestre baixa
newtab-wallpaper-celestial-starry-sky = Ceo estrelado
newtab-wallpaper-celestial-eclipse-time-lapse = Timelapse dunha eclipse lunar
newtab-wallpaper-celestial-black-hole = Ilustración dunh galaxia cun buraco negro
newtab-wallpaper-celestial-river = Imaxe de satélite dun río

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Ver a previsión en { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Patrocinado
newtab-weather-menu-change-location = Cambiar localización
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Busca localización
    .aria-label = Busca localización
newtab-weather-menu-weather-display = Pantalla do tempo
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Simple
newtab-weather-menu-change-weather-display-simple = Cambia á vista simple
newtab-weather-menu-weather-display-option-detailed = Detallado
newtab-weather-menu-change-weather-display-detailed = Cambia á vista detallada
newtab-weather-menu-temperature-units = Unidades de temperatura
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Cambiar a Fahrenheit
newtab-weather-menu-change-temperature-units-celsius = Cambiar a Celsius
newtab-weather-menu-hide-weather = Ocultar o tempo na nova pestana
newtab-weather-menu-learn-more = Máis información
# This message is shown if user is working offline
newtab-weather-error-not-available = Os datos meteorolóxicos non están dispoñibles neste momento.
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Ver a previsión en { $provider }
    .aria-description = { $provider } ∙ Patrocinado

## Topic Labels

newtab-topic-label-business = Negocios
newtab-topic-label-career = Emprego
newtab-topic-label-education = Educación
newtab-topic-label-arts = Entretemento
newtab-topic-label-food = Comida
newtab-topic-label-health = Saúde
newtab-topic-label-hobbies = Xogos
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Diñeiro
newtab-topic-label-society-parenting = Paternidade
newtab-topic-label-government = Política
newtab-topic-label-education-science = Ciencia
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Trucos para a vida
newtab-topic-label-sports = Deportes
newtab-topic-label-tech = Tecnoloxía
newtab-topic-label-travel = Viaxes
newtab-topic-label-home = Casa e xardín

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Seleccionar temas para afinar o seu feed
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Escolla dous ou máis temas. Os nosos comisarios expertos priorizan historias adaptadas aos seus intereses. Actualice en calquera momento.
newtab-topic-selection-save-button = Gardar
newtab-topic-selection-cancel-button = Cancelar
newtab-topic-selection-button-maybe-later = Quizais máis tarde
newtab-topic-selection-privacy-link = Aprender como protexemos e xestionamos os datos
newtab-topic-selection-button-update-interests = Actualizar os seus intereses
newtab-topic-selection-button-pick-interests = Seleccionar os seus intereses

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Seguir
newtab-section-following-button = Seguindo
newtab-section-unfollow-button = Deixar de seguir
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Axusta o teu feed
newtab-section-follow-highlight-subtitle = Sigue os teus intereses para ver máis do que che gusta.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Bloquear
newtab-section-blocked-button = Bloqueado
newtab-section-unblock-button = Desbloquear

## Confirmation modal for blocking a section

newtab-section-cancel-button = Agora non
newtab-section-confirm-block-topic-p1 = Estás seguro de que queres bloquear este tema?
newtab-section-confirm-block-topic-p2 = Os temas bloqueados xa non aparecerán no teu feed.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Bloquear { $topic }

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Temas
newtab-section-manage-topics-button-v2 =
    .label = Xestionar temas
newtab-section-mangage-topics-followed-topics = Seguido
newtab-section-mangage-topics-followed-topics-empty-state = Aínda non segues ningún tema.
newtab-section-mangage-topics-blocked-topics = Bloqueado
newtab-section-mangage-topics-blocked-topics-empty-state = Aínda non bloqueaches ningún tema.
newtab-custom-wallpaper-title = Os fondos de pantalla personalizados están aquí
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Carga o teu propio fondo de pantalla ou escolle unha cor personalizada para personalizar { -brand-product-name }.
newtab-custom-wallpaper-cta = Téntao

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Escolle un fondo de pantalla para facer teu { -brand-product-name }
newtab-new-user-custom-wallpaper-subtitle = Fai que cada nova pestana se sinta como na casa con fondos de pantalla e cores personalizados.
newtab-new-user-custom-wallpaper-cta = Probar agora

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Descargar { -brand-product-name } para móbil
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Escanea o código para navegar de forma segura en calquera lugar.
newtab-download-mobile-highlight-body-variant-b = Continúa onde o deixaches cando sincronices as túas pestanas, contrasinais e moito máis.
newtab-download-mobile-highlight-body-variant-c = Sabías que podes levar { -brand-product-name } contigo? O mesmo navegador. No teu peto.
newtab-download-mobile-highlight-image =
    .aria-label = Código QR para descargar { -brand-product-name } para móbiles

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Os teus favoritos na punta dos teus dedos
newtab-shortcuts-highlight-subtitle = Engade un atallo para manter os teus sitios favoritos a un clic de distancia.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Por que informas isto?
newtab-report-ads-reason-not-interested =
    .label = Non me interesa
newtab-report-ads-reason-inappropriate =
    .label = É inapropiado
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Vino demasiadas veces
newtab-report-content-wrong-category =
    .label = Categoría incorrecta
newtab-report-content-outdated =
    .label = Desactualizado
newtab-report-content-inappropriate-offensive =
    .label = Inadecuado ou ofensivo
newtab-report-content-spam-misleading =
    .label = Spam ou enganoso
newtab-report-cancel = Cancelar
newtab-report-submit = Enviar
newtab-toast-thanks-for-reporting =
    .message = Grazas por informar sobre isto.

## Strings for task / to-do list productivity widget

# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Novo
newtab-widget-lists-label-beta =
    .label = Beta
newtab-widget-task-list-menu-copy = Copiar
newtab-widget-lists-menu-edit = Editar o nome da lista
newtab-widget-lists-menu-create = Crea unha nova lista
newtab-widget-lists-menu-delete = Eliminar esta lista
newtab-widget-lists-menu-copy = Copiar a lista no portapapeis
newtab-widget-lists-menu-hide = Ocultar todas as listas
newtab-widget-lists-menu-learn-more = Máis información
newtab-widget-lists-input-add-an-item =
    .placeholder = Engadir un elemento

## Strings for timer productivity widget
## When the timer ends, a system notification may be shown. Depending on which mode the timer is in, that message would be shown

newtab-widget-timer-label-play =
    .label = Reproducir
newtab-widget-timer-label-pause =
    .label = Pausar
newtab-widget-timer-menu-notifications-on = Activar as notificacións
newtab-widget-timer-menu-hide = Ocultar o temporizador
newtab-widget-timer-menu-learn-more = Máis información
newtab-widget-message-title = Mantente concentrado con listas e un temporizador incorporado
newtab-promo-card-title = Apoiar a { -brand-product-name }
newtab-promo-card-body = Os nosos patrocinadores apoian a nosa misión de construír unha web mellor
newtab-promo-card-cta = Máis información
newtab-promo-card-dismiss-button =
    .title = Rexeitar
    .aria-label = Rexeitar
