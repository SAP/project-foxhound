# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Nueva pestaña
newtab-settings-button =
    .title = Personaliza tu página de Nueva pestaña
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Personalizar esta página
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Personalizar
newtab-customize-panel-label =
    .label = Personalizar
newtab-personalize-settings-icon-label =
    .title = Personalizar nueva pestaña
    .aria-label = Ajustes
newtab-settings-dialog-label =
    .aria-label = Ajustes
newtab-personalize-icon-label =
    .title = Personalizar nueva pestaña
    .aria-label = Personalizar nueva pestaña
newtab-personalize-dialog-label =
    .aria-label = Personalizar
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Ocultar
    .aria-label = Ocultar

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Página de inicio
home-homepage-new-windows =
    .label = Nuevas ventanas
home-homepage-new-tabs =
    .label = Nuevas pestañas
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Elige un sitio específico

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Dirección(es) del sitio web
home-custom-homepage-address =
    .placeholder = Ingresar dirección
home-custom-homepage-address-button =
    .label = Añadir dirección
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Todavía no se han añadido sitios web
home-custom-homepage-delete-address-button =
    .aria-label = Eliminar dirección
    .title = Eliminar dirección
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Reemplazar con
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Páginas actualmente abiertas
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Marcadores…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Buscar
home-prefs-stories-header2 =
    .label = Historias
    .description = Contenido excepcional seleccionado por la familia { -brand-product-name }
home-prefs-widgets-header =
    .label = Widgets
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Listas
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Temporizador
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Deportes
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Reloj
home-prefs-mission-message2 =
    .message = Nuestros patrocinadores apoyan nuestra misión de construir una mejor web.
home-prefs-manage-topics-link2 =
    .label = Administrar temas
home-prefs-choose-wallpaper-link2 =
    .label = Elige un fondo de pantalla
home-prefs-firefox-logo-header =
    .label = Logo de { -brand-short-name }
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Para usar estas funcionalidades, configura las nuevas pestañas o ventanas nuevas con { -firefox-home-brand-name }.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } fila
           *[other] { $num } filas
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Extensión ({ $extension })
home-restore-defaults-srd =
    .label = Restaurar predeterminados
    .accesskey = R
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (predeterminado)
home-mode-choice-custom-srd =
    .label = URLs personalizadas…
home-mode-choice-blank-srd =
    .label = Página en blanco
home-prefs-shortcuts-header-srd =
    .label = Atajos
home-prefs-shortcuts-select =
    .aria-label = Atajos
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Atajos patrocinados
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Historias patrocinadas
home-prefs-highlights-option-visited-pages-srd =
    .label = Páginas visitadas
home-prefs-highlights-options-bookmarks-srd =
    .label = Marcadores
home-prefs-highlights-option-most-recent-download-srd =
    .label = Descarga más reciente
home-prefs-recent-activity-header-srd =
    .label = Actividad reciente
home-prefs-recent-activity-select =
    .aria-label = Actividad reciente
home-prefs-weather-header-srd =
    .label = Clima
home-prefs-support-firefox-header-srd =
    .label = Apoyar a { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = Descubre cómo

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Buscar
    .aria-label = Buscar
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Busca con { $engine } o ingresa una dirección
newtab-search-box-handoff-text-no-engine = Buscar o ingresar dirección
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Busca con { $engine } o ingresa una dirección
    .title = Busca con { $engine } o ingresa una dirección
    .aria-label = Busca con { $engine } o ingresa una dirección
newtab-search-box-handoff-input-no-engine =
    .placeholder = Buscar o ingresar dirección
    .title = Buscar o ingresar dirección
    .aria-label = Buscar o ingresar dirección
newtab-search-box-text = Buscar en la web
newtab-search-box-input =
    .placeholder = Buscar en la web
    .aria-label = Buscar en la web

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Añadir motor de búsqueda
newtab-topsites-add-shortcut-header = Nuevo atajo
newtab-topsites-edit-topsites-header = Editar sitio frecuente
newtab-topsites-edit-shortcut-header = Editar atajo
newtab-topsites-add-shortcut-label = Añadir acceso directo
newtab-topsites-add-shortcut-title =
    .title = Añadir acceso directo
    .aria-label = Añadir acceso directo
newtab-topsites-title-label = Título
newtab-topsites-title-input =
    .placeholder = Ingresar un título
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Escribe o pega una URL
newtab-topsites-url-validation = URL válida requerida
newtab-topsites-image-url-label = URL de imagen personalizada
newtab-topsites-use-image-link = Utilizar una imagen personalizada…
newtab-topsites-image-validation = Falló la carga de la imagen. Prueba una URL diferente.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Limpiar texto

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Cancelar
newtab-topsites-delete-history-button = Eliminar del historial
newtab-topsites-save-button = Guardar
newtab-topsites-preview-button = Vista previa
newtab-topsites-add-button = Añadir

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = ¿De verdad quieres eliminar cada instancia de esta página de tu historial?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Esta acción no puede ser deshecha.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Patrocinado

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (fijado)
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
    .aria-label = Abrir menú contextual para { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Editar este sitio
    .aria-label = Editar este sitio

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Editar
newtab-menu-open-new-window = Abrir en una nueva ventana
newtab-menu-open-new-private-window = Abrir en una nueva ventana privada
newtab-menu-dismiss = Descartar
newtab-menu-pin = Fijar
newtab-menu-unpin = Soltar
newtab-menu-delete-history = Eliminar del historial
newtab-menu-save-to-pocket = Guardar en { -pocket-brand-name }
newtab-menu-delete-pocket = Eliminar de { -pocket-brand-name }
newtab-menu-archive-pocket = Archivar en { -pocket-brand-name }
newtab-menu-show-privacy-info = Nuestros patrocinadores y tu privacidad
newtab-menu-about-fakespot = Acerca de { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Reportar
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Bloquear
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Dejar de seguir
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Aprender más
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Dejar de seguir el tema

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Gestionar contenido patrocinado
newtab-menu-our-sponsors-and-your-privacy = Nuestros patrocinadores y tu privacidad
newtab-menu-report-this-ad = Reportar este anuncio

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Hecho
newtab-privacy-modal-button-manage = Gestiona los ajustes de contenido patrocinado
newtab-privacy-modal-header = Tu privacidad importa.
newtab-privacy-modal-paragraph-2 = Junto con ofrecer historias cautivadoras, te mostramos contenido relevante y muy revisado de patrocinadores seleccionados. No te preocupes, <strong>tus datos de navegación jamás dejan tu copia personal de { -brand-product-name }</strong> — nosotros los vemos, y tampoco lo hacen nuestros patrocinadores.
newtab-privacy-modal-link = Aprende cómo funciona la privacidad en la nueva pestaña

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Remover marcador
# Bookmark is a verb here.
newtab-menu-bookmark = Marcador

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Copiar enlace de descarga
newtab-menu-go-to-download-page = Ir a la página de descarga
newtab-menu-remove-download = Eliminar del historial

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Mostrar en Finder
       *[other] Abrir carpeta contenedora
    }
newtab-menu-open-file = Abrir archivo

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Visitado
newtab-label-bookmarked = Marcado
newtab-label-removed-bookmark = Marcador eliminado
newtab-label-recommended = Popular
newtab-label-saved = Guardado en { -pocket-brand-name }
newtab-label-download = Descargado
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Patrocinado
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

newtab-section-menu-remove-section = Eliminar sección
newtab-section-menu-collapse-section = Contraer sección
newtab-section-menu-expand-section = Expandir sección
newtab-section-menu-manage-section = Gestionar secciones
newtab-section-menu-manage-webext = Gestionar extensión
newtab-section-menu-add-topsite = Añadir sitio frecuente
newtab-section-menu-add-search-engine = Añadir motor de búsqueda
newtab-section-menu-move-up = Subir
newtab-section-menu-move-down = Bajar
newtab-section-menu-privacy-notice = Aviso de privacidad

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Contraer sección
newtab-section-expand-section-label =
    .aria-label = Expandir sección

## Section Headers.

newtab-section-header-topsites = Sitios frecuentes
newtab-section-header-recent-activity = Actividad reciente
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Recomendado por { $provider }
newtab-section-header-stories = Historias que provocan reflexión
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Las selecciones de hoy para ti

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Empieza a navegar, y nosotros te mostraremos aquí algunos de los mejores artículos, videos y otras páginas que hayas visitado recientemente o marcado.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Te has puesto al día. Revisa más tarde para ver más historias de { $provider }. ¿No puedes esperar? Selecciona un tema popular para encontrar más historias de todo el mundo.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Te has puesto al día. Revisa más tarde para ver más historias. ¿No puedes esperar? Selecciona un tema popular para encontrar más historias de todo el mundo.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = ¡Estás al día!
newtab-discovery-empty-section-topstories-content = Revisa más tarde para nuevas historias.
newtab-discovery-empty-section-topstories-try-again-button = Volver a intentarlo
newtab-discovery-empty-section-topstories-loading = Cargando…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = ¡Chuta! Casi logramos cargar la sección completa, pero quizá falta una parte.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Temas populares:
newtab-pocket-new-topics-title = ¿Quieres más historias? Mira estos temas populares de { -pocket-brand-name }
newtab-pocket-more-recommendations = Más recomendaciones
newtab-pocket-learn-more = Aprender más
newtab-pocket-cta-button = Obtener { -pocket-brand-name }
newtab-pocket-cta-text = Guarda las historias que amas en { -pocket-brand-name }, y potencia tu mente con fascinantes lecturas.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } es parte de la familia { -brand-product-name }
newtab-pocket-save = Guardar
newtab-pocket-saved = Guardado

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Más como esto
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = No para mí
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Gracias. Tus comentarios nos ayudarán a mejorar tu feed.
newtab-toast-dismiss-button =
    .title = Ocultar
    .aria-label = Ocultar

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Descubre lo mejor de la web
newtab-pocket-onboarding-cta = { -pocket-brand-name } explora una amplia gama de publicaciones para traer el contenido más informativo, inspirador y confiable directamente a tu navegador { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Chuta, algo se fue a las pailas al cargar este contenido.
newtab-error-fallback-refresh-link = Recarga la página para volver a intentarlo.

## Customization Menu

newtab-custom-shortcuts-title = Atajos
newtab-custom-shortcuts-subtitle = Sitios que guardas o visitas
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Atajos
    .description = Sitios que guardas o visitas
newtab-custom-shortcuts-nova =
    .label = Atajos
newtab-custom-row-description =
    .description = Número de filas
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } fila
           *[other] { $num } filas
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } fila
       *[other] { $num } filas
    }
newtab-custom-sponsored-sites = Atajos patrocinados
newtab-custom-pocket-title = Recomendado por { -pocket-brand-name }
newtab-custom-pocket-subtitle = Contenido excepcional seleccionado por { -pocket-brand-name }, parte de la familia { -brand-product-name }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Historias recomendadas
    .description = Contenido excepcional seleccionado por la familia { -brand-product-name }
newtab-recommended-stories-toggle =
    .label = Historias recomendadas
newtab-custom-stories-personalized-toggle =
    .label = Historias
newtab-custom-stories-personalized-checkbox-label = Historias personalizadas basadas en tu actividad
newtab-custom-pocket-sponsored = Historias patrocinadas
newtab-custom-pocket-show-recent-saves = Mostrar guardados recientes
newtab-custom-recent-title = Actividad reciente
newtab-custom-recent-subtitle = Una selección de sitios y contenidos recientes
newtab-custom-weather-toggle =
    .label = Clima
    .description = El pronóstico del día de un vistazo
newtab-custom-widget-weather-toggle =
    .label = Clima
newtab-custom-widget-lists-toggle =
    .label = Listas
newtab-custom-widget-timer-toggle =
    .label = Temporizador
newtab-custom-widget-sports-toggle =
    .label = Copa Mundial
newtab-custom-widget-clock-toggle =
    .label = Reloj
newtab-custom-widget-sports-toggle2 =
    .label = Deportes
newtab-custom-widget-section-title = Widgets
newtab-custom-widget-section-toggle =
    .label = Widgets
newtab-widget-manage-title = Widgets
newtab-widget-manage-widget-button =
    .label = Gestionar widgets
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Cerrar
    .aria-label = Cerrar menú
newtab-custom-close-button = Cerrar
newtab-custom-settings = Administrar más ajustes

## New Tab Wallpapers

newtab-wallpaper-title = Fondos de pantalla
newtab-wallpaper-reset = Restablecer a predeterminados
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Subir una imagen
newtab-wallpaper-add-an-image = Añadir una imagen
newtab-wallpaper-custom-color = Elegir un color
newtab-wallpaper-toggle-title =
    .label = Fondos de pantalla
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = La imagen supera el límite de tamaño de archivo de { $file_size } MB. Por favor, intenta cargar un archivo más pequeño.
newtab-wallpaper-error-upload-file-type = No pudimos cargar tu archivo. Por favor, vuelve a intentarlo con un archivo de imagen.
newtab-wallpaper-error-file-type = No pudimos cargar tu archivo. Por favor, vuelve a intentarlo con un tipo de archivo diferente.
newtab-wallpaper-light-red-panda = Panda rojo
newtab-wallpaper-light-mountain = Montaña Blanca
newtab-wallpaper-light-sky = Cielo con nubes moradas y rosas
newtab-wallpaper-light-color = Formas azules, rosadas y amarillas
newtab-wallpaper-light-landscape = Paisaje de montaña con neblina azul
newtab-wallpaper-light-beach = Playa con palmera
newtab-wallpaper-dark-aurora = Aurora boreal
newtab-wallpaper-dark-color = Formas rojas y azules
newtab-wallpaper-dark-panda = Panda rojo oculto en el bosque
newtab-wallpaper-dark-sky = Paisaje de ciudad con cielo nocturno
newtab-wallpaper-dark-mountain = Paisaje de montaña
newtab-wallpaper-dark-city = Paisaje de ciudad púrpura
newtab-wallpaper-dark-fox-anniversary = Un zorro en la acera cerca de un bosque
newtab-wallpaper-light-fox-anniversary = Un zorro en un campo de pasto con un paisaje montañoso brumoso

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Colores sólidos
newtab-wallpaper-colors = Colores
newtab-wallpaper-blue = Azul
newtab-wallpaper-light-blue = Azul claro
newtab-wallpaper-light-purple = Morado claro
newtab-wallpaper-light-green = Verde claro
newtab-wallpaper-green = Verde
newtab-wallpaper-beige = Beige
newtab-wallpaper-yellow = Amarillo
newtab-wallpaper-orange = Naranjo
newtab-wallpaper-pink = Rosado
newtab-wallpaper-light-pink = Rosado claro
newtab-wallpaper-red = Rojo
newtab-wallpaper-dark-blue = Azul oscuro
newtab-wallpaper-dark-purple = Morado oscuro
newtab-wallpaper-dark-green = Verde oscuro
newtab-wallpaper-brown = Café

## Abstract

newtab-wallpaper-category-title-abstract = Abstracto
newtab-wallpaper-abstract-green = Formas verdes
newtab-wallpaper-abstract-blue = Formas azules
newtab-wallpaper-abstract-purple = Formas moradas
newtab-wallpaper-abstract-orange = Formas naranjas
newtab-wallpaper-gradient-orange = Naranja y rosado en gradiente
newtab-wallpaper-abstract-blue-purple = Formas azules y moradas
newtab-wallpaper-abstract-white-curves = Blanco con curvas sombreadas
newtab-wallpaper-abstract-purple-green = Gradiente de luz violeta y verde
newtab-wallpaper-abstract-blue-purple-waves = Formas onduladas de color azul y morado
newtab-wallpaper-abstract-black-waves = Formas onduladas negras

## Firefox

newtab-wallpaper-category-title-photographs = Fotografías
newtab-wallpaper-beach-at-sunrise = Playa al amanecer
newtab-wallpaper-beach-at-sunset = Playa al atardecer
newtab-wallpaper-storm-sky = Cielo de tormenta
newtab-wallpaper-sky-with-pink-clouds = Cielo con nubes rosadas
newtab-wallpaper-red-panda-yawns-in-a-tree = Panda rojo bostezando en un árbol
newtab-wallpaper-white-mountains = Montañas blancas
newtab-wallpaper-hot-air-balloons = Colores variados de globos aerostáticos durante el día.
newtab-wallpaper-starry-canyon = Noche estrellada azul
newtab-wallpaper-suspension-bridge = Fotografía de un puente colgante gris durante el día
newtab-wallpaper-sand-dunes = Dunas de arena blanca
newtab-wallpaper-palm-trees = Silueta de palmeras durante la hora dorada
newtab-wallpaper-blue-flowers = Fotografía de primer plano de flores de pétalos azules.
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Foto de <a data-l10n-name="name-link">{ $author_string }</a> en <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Prueba un toque de color
newtab-wallpaper-feature-highlight-content = Dale a tu Nueva pestaña una apariencia renovada con fondos de pantalla.
newtab-wallpaper-feature-highlight-button = Entendido
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Ocultar
    .aria-label = Cerrar aviso emergente
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
newtab-wallpaper-celestial-lunar-eclipse = Eclipse lunar
newtab-wallpaper-celestial-earth-night = Fotografía nocturna desde la órbita terrestre baja
newtab-wallpaper-celestial-starry-sky = Cielo estrellado
newtab-wallpaper-celestial-eclipse-time-lapse = Lapso de tiempo del eclipse lunar
newtab-wallpaper-celestial-black-hole = Ilustración de una galaxia con un agujero negro
newtab-wallpaper-celestial-river = Imagen satelital de un río

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Ver pronóstico en { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Patrocinado
newtab-weather-menu-change-location = Cambiar ubicación
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Buscar ubicación
    .aria-label = Buscar ubicación
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Utilizar la ubicación actual
newtab-weather-menu-weather-display = Visualización del clima
newtab-weather-todays-forecast = Pronóstico del tiempo para hoy
newtab-weather-see-full-forecast = Ver pronóstico completo
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Simple
newtab-weather-menu-change-weather-display-simple = Cambiar a vista simple
newtab-weather-menu-weather-display-option-detailed = Detallada
newtab-weather-menu-change-weather-display-detailed = Cambiar a vista detallada
newtab-weather-menu-temperature-units = Unidades de temperatura
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Cambiar a Fahrenheit
newtab-weather-menu-change-temperature-units-celsius = Cambiar a Celsius
newtab-weather-menu-hide-weather = Ocultar el clima en Nueva pestaña
newtab-weather-menu-learn-more = Aprender más
newtab-weather-menu-detect-my-location = Detectar mi ubicación
# This message is shown if user is working offline
newtab-weather-error-not-available = Los datos meteorológicos no están disponibles en este momento.
newtab-weather-opt-in-see-weather = ¿Quieres ver el clima para tu ubicación?
newtab-weather-opt-in-not-now =
    .label = Ahora no
newtab-weather-opt-in-yes =
    .label = Sí
newtab-weather-opt-in-headline = Consulta el pronóstico del tiempo local.
newtab-weather-opt-in-use-location =
    .label = Usar ubicación
newtab-weather-opt-in-choose-location = Elegir ubicación
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Nueva York
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Alta
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Baja
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Ver pronóstico en { $provider }
    .aria-description = { $provider } ∙ Patrocinado

## Topic Labels

newtab-topic-label-business = Negocios
newtab-topic-label-career = Empleo
newtab-topic-label-education = Educación
newtab-topic-label-arts = Entretenimiento
newtab-topic-label-food = Comida
newtab-topic-label-health = Salud
newtab-topic-label-hobbies = Juegos
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Dinero
newtab-topic-label-society-parenting = Paternidad
newtab-topic-label-government = Política
newtab-topic-label-education-science = Ciencia
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Trucos para la vida
newtab-topic-label-sports = Deportes
newtab-topic-label-tech = Tecnología
newtab-topic-label-travel = Viajes
newtab-topic-label-home = Hogar y jardín

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Seleccione temas para ajustar tu feed
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Elige dos o más temas. Nuestros expertos curadores priorizan las historias adaptadas a tus intereses. Actualiza en cualquier momento.
newtab-topic-selection-save-button = Guardar
newtab-topic-selection-cancel-button = Cancelar
newtab-topic-selection-button-maybe-later = Quizá más tarde
newtab-topic-selection-privacy-link = Aprende cómo protegemos y gestionamos los datos
newtab-topic-selection-button-update-interests = Actualiza tus intereses
newtab-topic-selection-button-pick-interests = Elige tus intereses

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Seguir
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Seguir { $topic }
newtab-section-following-button = Siguiendo
newtab-section-unfollow-button = Dejar de seguir
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Siguiendo: Dejar de seguir { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Optimiza tu feed
newtab-section-follow-highlight-subtitle = Sigue tus intereses para ver más de lo que te gusta.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Bloquear
newtab-section-blocked-button = Bloqueado
newtab-section-unblock-button = Desbloquear
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Seguir { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Dejar de seguir { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Bloquear { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Desbloquear { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = Ahora no
newtab-section-confirm-block-topic-p1 = ¿Estás seguro de que desea bloquear este tema?
newtab-section-confirm-block-topic-p2 = Los temas bloqueados ya no aparecerán en tu feed.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Bloquear { $topic }
newtab-section-block-cancel-button = Cancelar

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Temas
newtab-section-manage-topics-button-v2 =
    .label = Administrar temas
newtab-section-mangage-topics-followed-topics = Seguidos
newtab-section-mangage-topics-followed-topics-empty-state = Todavía no sigues ningún tema.
newtab-section-mangage-topics-blocked-topics = Bloqueados
newtab-section-mangage-topics-blocked-topics-empty-state = Todavía no has bloqueado ningún tema.
newtab-custom-wallpaper-title = Los fondos de pantalla personalizados están aquí
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Sube tu propio fondo de pantalla o elige un color personalizado para hacer tuyo { -brand-product-name }.
newtab-custom-wallpaper-cta = Inténtalo

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Elige un fondo de pantalla para que { -brand-product-name } sea tuyo
newtab-new-user-custom-wallpaper-subtitle = Haz que cada nueva pestaña se sienta como en casa con fondos de pantalla y colores personalizados.
newtab-new-user-custom-wallpaper-cta = Pruébalo ahora

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Acaban de llegar nuevos fondos de pantalla.
newtab-wallpaper-feature-highlight-subtitle = Elige tu favorito y haz que cada pestaña nueva te haga sentir como en casa.
newtab-wallpaper-feature-highlight-cta = Elegir fondo de pantalla

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Bajar { -brand-product-name } para dispositivos móviles
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Escanea el código para navegar de forma segura mientras viajas.
newtab-download-mobile-highlight-body-variant-b = Continúa donde quedaste dejaste al sincronizar tus pestañas, contraseñas y más.
newtab-download-mobile-highlight-body-variant-c = ¿Sabías que puedes llevar { -brand-product-name } contigo? El mismo navegador. En tu bolsillo.
newtab-download-mobile-highlight-image =
    .aria-label = Código QR para descargar { -brand-product-name } para móviles

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Tus favoritos al alcance de tus dedos
newtab-shortcuts-highlight-subtitle = Añade un acceso directo para tener tus sitios favoritos a un solo clic de distancia.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = ¿Por qué estás informando esto?
newtab-report-ads-reason-not-interested =
    .label = No me interesa
newtab-report-ads-reason-inappropriate =
    .label = Es inapropiado
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Lo he visto demasiadas veces
newtab-report-content-wrong-category =
    .label = Categoría incorrecta
newtab-report-content-outdated =
    .label = Desactualizado
newtab-report-content-inappropriate-offensive =
    .label = Inapropiado u ofensivo
newtab-report-content-spam-misleading =
    .label = Spam o engañoso
newtab-report-content-requires-payment-subscription =
    .label = Requiere pago o suscripción
newtab-report-content-requires-payment-subscription-learn-more = Aprender más
newtab-report-cancel = Cancelar
newtab-report-submit = Enviar
newtab-toast-thanks-for-reporting =
    .message = Gracias por informar esto.
newtab-toast-widgets-hidden =
    .message = Selecciona el ícono de lápiz para volver a añadir widgets en cualquier momento.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Ahora estás siguiendo { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Ya no estás siguiendo { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Ya no verás historias sobre { $topic }.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Las posibilidades son infinitas. Añade una.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Nuevo
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Completado ({ $number })
newtab-widget-lists-celebration-headline = Buen trabajo
newtab-widget-lists-celebration-subhead = Todo listo
newtab-widget-task-list-menu-copy = Copiar
newtab-widget-lists-menu-edit = Editar el nombre de la lista
newtab-widget-lists-menu-edit2 =
    .aria-label = Editar el nombre de la lista
newtab-widget-lists-menu-create = Crear una nueva lista
newtab-widget-lists-menu-delete = Eliminar esta lista
newtab-widget-lists-menu-copy = Copiar lista al portapapeles
newtab-widget-lists-menu-learn-more = Aprender más
newtab-widget-lists-button-add-item = Añadir un elemento
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Añadir un elemento
    .aria-label = Añadir un elemento
newtab-widget-lists-input-error = Por favor, incluye texto para añadir un elemento.
newtab-widget-lists-input-menu-open-link = Abrir enlace
newtab-widget-lists-input-menu-move-up = Subir
newtab-widget-lists-input-menu-move-down = Bajar
newtab-widget-lists-input-menu-delete = Eliminar
newtab-widget-lists-input-menu-edit = Editar
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Editar elemento
newtab-widget-lists-edit-clear =
    .aria-label = Cancelar
    .title = Cancelar
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Crear una nueva lista
newtab-widget-lists-name-label-default =
    .label = Lista de tareas
newtab-widget-lists-name-label-checklist =
    .label = Lista de tareas
newtab-widget-lists-name-placeholder-default =
    .placeholder = Lista de tareas
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Lista de tareas
    .aria-label = Editar el nombre de la lista
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Nueva lista
    .aria-label = Editar el nombre de la lista
newtab-widget-section-title = Widgets
newtab-widget-menu-hide = Ocultar widget
newtab-widget-menu-change-size = Cambiar tamaño
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Mover
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Izquierda
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Derecha
newtab-widget-size-small = Pequeño
newtab-widget-size-medium = Mediano
newtab-widget-size-large = Grande
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Ocultar widgets
    .aria-label = Ocultar todos los widgets
newtab-widget-section-maximize =
    .title = Expandir widgets
    .aria-label = Expandir todos los widgets al tamaño completo
newtab-widget-section-minimize =
    .title = Minimizar widgets
    .aria-label = Minimizar todos los widgets al tamaño compacto
newtab-widget-section-menu-button =
    .title = Menú de widgets
    .aria-label = Abrir menú de widgets
newtab-widget-add-widgets-button =
    .aria-label = Añadir widget
    .title = Añadir widget
newtab-widget-section-menu-manage = Gestionar widgets
newtab-widget-section-menu-hide-all = Ocultar widgets
newtab-widget-section-menu-learn-more = Aprender más
newtab-widget-section-feedback = Cuéntanos lo que piensas
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Mostrar más widgets
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Mostrar menos widgets
newtab-widget-lists-name-default = Lista de tareas

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Temporizador
newtab-widget-timer-notification-focus = Se acabó el tiempo de concentración. Buen trabajo. ¿Necesitas un descanso?
newtab-widget-timer-notification-break = Se acabó tu descanso. ¿Listo para concentrarte?
newtab-widget-timer-notification-warning = Las notificaciones están desactivadas
newtab-widget-timer-mode-focus =
    .label = Focus
newtab-widget-timer-mode-break =
    .label = Descanso
newtab-widget-timer-label-play =
    .label = Reproducir
newtab-widget-timer-label-pause =
    .label = Pausar
newtab-widget-timer-reset =
    .title = Restablecer
newtab-widget-timer-menu-notifications = Desactivar notificaciones
newtab-widget-timer-menu-notifications-on = Activar notificaciones
newtab-widget-timer-menu-learn-more = Más información
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Titulares principales
newtab-daily-briefing-card-menu-dismiss = Ocultar
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Actualizado hace { $minutes }m
newtab-widget-message-title = Mantén la concentración con listas y un temporizador incorporado
# to-dos stands for "things to do".
newtab-widget-message-copy = Desde recordatorios rápidos hasta tareas diarias, sesiones de concentración y descansos para estirarse, mantén la concentración en tus tareas y a tiempo.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Un único lugar para información clave, pronósticos y mucho más.
newtab-widget-message-focus-forecasts-body = Mantén tu día organizado con los widgets de { -brand-product-name }. Consulta el pronóstico del clima, concéntrate en tus tareas o controla el tiempo en todo el mundo.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Hazlo { -brand-product-name } tuyo
newtab-promo-card-body-addons = Elige un fondo de pantalla de nuestra colección o crea el tuyo.
newtab-promo-card-cta-addons = Pruébalo ahora
newtab-promo-card-title = Apoyar a { -brand-product-name }
newtab-promo-card-body = Nuestros patrocinadores apoyan nuestra misión de construir una mejor web
newtab-promo-card-cta = Más información
newtab-promo-card-dismiss-button =
    .title = Ocultar
    .aria-label = Ocultar

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] Iniciar temporizador de { $minutes } minuto
           *[other] Iniciar temporizador de { $minutes } minutos
        }
newtab-widget-timer-pause-aria =
    .aria-label = Pausar temporizador
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } minuto
           *[other] { $minutes } minutos
        }
newtab-widget-timer-decrease-min =
    .title = Disminuir 1 minuto
newtab-widget-timer-increase-min =
    .title = Aumentar 1 minuto
newtab-widget-timer-mode-group =
    .aria-label = Modo temporizador
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Foco
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Descanso
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Ocultar temporizador
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Buen trabajo
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Se acabó tu descanso
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = ¿Necesitas un descanso?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = ¿Listo para enfocarte?

##

newtab-sports-widget-menu-follow-teams = Seguir equipos
newtab-sports-widget-menu-view-schedule = Ver calendarización
newtab-sports-widget-menu-view-upcoming = Ver próximos
newtab-sports-widget-menu-view-results = Ver resultados
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Fechas clave
newtab-sports-widget-menu-learn-more = Aprender más
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Mantente al tanto de la Copa Mundial
newtab-sports-widget-get-updates = Recibe actualizaciones de partidos en directo y mucho más.
newtab-sports-widget-view-schedule =
    .label = Ver calendarización
newtab-sports-widget-follow-teams =
    .label = Seguir equipos
newtab-sports-widget-view-matches =
    .label = Ver partidos
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Seguimiento al equipos
       *[other] Seguimiento a los { $number } equipos
    }
newtab-sports-widget-choose-wallpaper =
    .label = Elige un fondo de pantalla
newtab-sports-widget-skip = Saltar
newtab-sports-widget-search-country =
    .placeholder = Buscar país
    .aria-label = Buscar país
newtab-sports-widget-cancel = Cancelar
newtab-sports-widget-back-button =
    .aria-label = Atrás
newtab-sports-widget-done-button =
    .label = Hecho
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (eliminado)
newtab-sports-widget-view-all =
    .label = Ver todos
newtab-sports-widget-show-less =
    .label = Mostrar menos
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Solo equipos seguidos
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Ver
    .title = Ver en vivo
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Ver en vivo
    .title = Ver en vivo
newtab-sports-widget-watch-dialog-close =
    .aria-label = Cerrar
    .title = Cerrar
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Gratis
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Prueba gratuita
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Gratis y de pago
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = De pago
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Solo partidos seleccionados
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Disponible en tu región
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Otras regiones
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Abrir transmisión
    .title = Abrir transmisión
newtab-sports-widget-group-stage = Fase de grupos
newtab-sports-widget-group-a = Grupo A
newtab-sports-widget-group-b = Grupo B
newtab-sports-widget-group-c = Grupo C
newtab-sports-widget-group-d = Grupo D
newtab-sports-widget-group-e = Grupo E
newtab-sports-widget-group-f = Grupo F
newtab-sports-widget-group-g = Grupo G
newtab-sports-widget-group-h = Grupo H
newtab-sports-widget-group-i = Grupo I
newtab-sports-widget-group-j = Grupo J
newtab-sports-widget-group-k = Grupo K
newtab-sports-widget-group-l = Grupo L
newtab-sports-widget-round-32 = 16avos de final
newtab-sports-widget-round-16 = Octavos de final
newtab-sports-widget-quarter-finals = Cuartos de final
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = EN VIVO
newtab-custom-widget-live-refresh =
    .title = Actualizar puntuaciones
    .aria-label = Actualizar puntuaciones
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Fechas clave
newtab-sports-widget-upcoming = Próximamente
# Used for a match currently ongoing
newtab-sports-widget-now = Ahora
newtab-sports-widget-results = Resultados
newtab-sports-widget-semi-finals = Semifinales
newtab-sports-widget-bronze-finals = Tercer puesto
# Final is the final match for 1st place.
newtab-sports-widget-final = Final
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Retrasado
newtab-sports-widget-postponed = Pospuesto
newtab-sports-widget-suspended = Suspendido
newtab-sports-widget-cancelled = Cancelado
newtab-sports-widget-information = Información sobre el partido
newtab-sports-widget-no-live-data = Los datos del partido en vivo no se están actualizando en este momento.
newtab-sports-widget-view-results-link = Ver resultados
newtab-sports-widget-third-place = Tercer lugar
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Subcampeón
newtab-sports-widget-champions = Campeones
newtab-sports-widget-world-cup-champions = Campeones de la Copa Mundial 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Partido completo
newtab-sports-widget-match-halftime = Medio tiempo
newtab-sports-widget-match-extra-time = Tiempo extra
newtab-sports-widget-match-penalties = Penales
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = vs
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Mantente atento para conocer los detalles del próximo partido.

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Anterior
    .title = Anterior
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Siguiente
    .title = Siguiente
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Partido en vivo { $index } de { $total }
    .title = Partido en vivo { $index } de { $total }

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
    .aria-label = En vivo: { $homeTeam }, { $homeScore } versus { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } vs. { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } vs. { $awayTeam }, retrasado
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } vs. { $awayTeam }, postergado
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } vs. { $awayTeam }, suspendido
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } vs. { $awayTeam }, cancelado

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosnia y Herzegovina
newtab-sports-widget-team-name-label-civ =
    .label = Costa de Marfil
newtab-sports-widget-team-name-label-cod =
    .label = RD Congo
newtab-sports-widget-team-name-label-eng =
    .label = Inglaterra
newtab-sports-widget-team-name-label-sco =
    .label = Escocia
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Por determinar

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Da el puntapié inicial a la Copa del Mundo con nuevos fondos de pantalla
newtab-sports-widget-message-wallpapers-body = Recibe la energía de los partidos en tu navegador.
newtab-sports-widget-message-wallpapers-cta = Elegir fondo de pantalla
newtab-sports-widget-message-add-widgets-cta =
    .label = Añadir widgets
newtab-sports-widget-message-day-in-play-title = Llena tu día con los partidos usando los widgets de { -brand-product-name }
newtab-sports-widget-message-day-in-play-body = Sigue el Mundial, mantente al día con tus tareas, controla el tiempo en todo el mundo y mucho más.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Explorar widgets

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Ocultar
    .aria-label = Ocultar
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Haz tuyo este espacio
newtab-activation-window-message-customization-focus-message = Elige un fondo de pantalla nuevo, agrega accesos directos a tus sitios favoritos y mantente al día sobre las historias que te interesan.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Empieza a personalizar
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Este espacio juega según tus reglas
newtab-activation-window-message-values-focus-message = { -brand-product-name } te permite navegar como quieras, con una forma más personal de empezar el día en línea. Personaliza { -brand-product-name }.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Ocultar reloj
newtab-clock-widget-menu-learn-more = Aprender más
newtab-clock-widget-menu-edit = Editar relojes
newtab-clock-widget-menu-switch-to-12h = Cambiar al formato de 12 horas
newtab-clock-widget-menu-switch-to-24h = Cambiar al formato de 24 horas
newtab-clock-widget-label-your-clocks = Tus relojes
newtab-clock-widget-search-location-input =
    .label = Ubicación
    .placeholder = Buscar una ciudad
    .aria-label = Buscar una ciudad
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Seudónimo (opcional)
    .placeholder = Añadir seudónimo
    .aria-label = Seudónimo (opcional)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Añadir nuevo reloj
    .aria-label = Añadir nuevo reloj
newtab-clock-widget-button-add-clock = Añadir
newtab-clock-widget-button-cancel = Cancelar
newtab-clock-widget-button-back =
    .title = Atrás
    .aria-label = Atrás
newtab-clock-widget-button-edit-clock =
    .title = Editar reloj
    .aria-label = Editar reloj
newtab-clock-widget-button-save = Guardar
newtab-clock-widget-button-remove-clock =
    .title = Quitar el reloj
    .aria-label = Quitar el reloj
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
    .aria-label = { $city }, apodo: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Añadir reloj
newtab-clock-widget-edit-clock-form =
    .aria-label = Editar reloj
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Resultados de la búsqueda
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Sin coincidencias
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Abrir menú para el reloj
    .aria-label = Abrir menú para el reloj
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Seudónimo: { $nickname }
