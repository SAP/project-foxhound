# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Nove scheda
newtab-settings-button =
    .title = Personalisar tu pagina de nove scheda
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Personalisar iste pagina
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Personalisar
newtab-customize-panel-label =
    .label = Personalisar
newtab-personalize-settings-icon-label =
    .title = Personalisar le scheda nove
    .aria-label = Parametros
newtab-settings-dialog-label =
    .aria-label = Parametros
newtab-personalize-icon-label =
    .title = Personalisar nove scheda
    .aria-label = Personalisar nove scheda
newtab-personalize-dialog-label =
    .aria-label = Personalisar
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Ignorar
    .aria-label = Ignorar

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Pagina initial
home-homepage-new-windows =
    .label = Nove fenestras
home-homepage-new-tabs =
    .label = Nove schedas
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Eliger un sito specific

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Adresse(s) de sito web
home-custom-homepage-address =
    .placeholder = Insere adresse
home-custom-homepage-address-button =
    .label = Adder adresse
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Necun sito web ancora addite
home-custom-homepage-delete-address-button =
    .aria-label = Deler adresse
    .title = Deler adresse
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Substituer con
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Paginas actualmente aperte
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Marcapaginas…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Cercar
home-prefs-stories-header2 =
    .label = Historias
    .description = Contento exceptional curate per le familia de { -brand-product-name }
home-prefs-widgets-header =
    .label = Widgets
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Listas
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Temporisator
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Sports
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Horologio
home-prefs-mission-message2 =
    .message = Nostre patrocinatores supporta nostre mission pro construer un web melior.
home-prefs-manage-topics-link2 =
    .label = Gerer topicos
home-prefs-choose-wallpaper-link2 =
    .label = Eliger un fundo de schermo
home-prefs-firefox-logo-header =
    .label = Logo de { -brand-short-name }
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Pro usar iste functionalitates, predefini nove schedas o nove fenestras pro { -firefox-home-brand-name }.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } linea
           *[other] { $num } lineas
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Extension ({ $extension })
home-restore-defaults-srd =
    .label = Restaurar le predefinitiones
    .accesskey = R
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (predefinite)
home-mode-choice-custom-srd =
    .label = URLs personalisate...
home-mode-choice-blank-srd =
    .label = Pagina vacue
home-prefs-shortcuts-header-srd =
    .label = Accessos directe
home-prefs-shortcuts-select =
    .aria-label = Accessos directe
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Accessos directe sponsorisate
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Articulos sponsorisate
home-prefs-highlights-option-visited-pages-srd =
    .label = Paginas visitate
home-prefs-highlights-options-bookmarks-srd =
    .label = Marcapaginas
home-prefs-highlights-option-most-recent-download-srd =
    .label = Ultime discargamento
home-prefs-recent-activity-header-srd =
    .label = Recente activitate
home-prefs-recent-activity-select =
    .aria-label = Recente activitate
home-prefs-weather-header-srd =
    .label = Meteo
home-prefs-support-firefox-header-srd =
    .label = Supporta { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = Discoperi como

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Cercar
    .aria-label = Cercar
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Cercar con { $engine } o inserer un adresse
newtab-search-box-handoff-text-no-engine = Cercar o inserer un adresse
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Cercar con { $engine } o inserer adresse
    .title = Cercar con { $engine } o inserer adresse
    .aria-label = Cercar con { $engine } o inserer adresse
newtab-search-box-handoff-input-no-engine =
    .placeholder = Cercar o inserer un adresse
    .title = Cercar o inserer un adresse
    .aria-label = Cercar o inserer un adresse
newtab-search-box-text = Cercar in le Web
newtab-search-box-input =
    .placeholder = Cercar in le Web
    .aria-label = Cercar in le Web

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Adder un motor de recerca
newtab-topsites-add-shortcut-header = Nove accesso directe
newtab-topsites-edit-topsites-header = Modificar le sito preferite
newtab-topsites-edit-shortcut-header = Modificar accesso directe
newtab-topsites-add-shortcut-label = Adder accesso directe
newtab-topsites-add-shortcut-title =
    .title = Adder accesso directe
    .aria-label = Adder accesso directe
newtab-topsites-title-label = Titulo
newtab-topsites-title-input =
    .placeholder = Scriber un titulo
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Scriber o collar un URL
newtab-topsites-url-validation = Es necessari un URL valide
newtab-topsites-image-url-label = URL de imagine personal
newtab-topsites-use-image-link = Usar un imagine personalisate…
newtab-topsites-image-validation = Error durante le cargamento del imagine. Prova un altere URL.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Vacuar le texto

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Cancellar
newtab-topsites-delete-history-button = Deler del chronologia
newtab-topsites-save-button = Salvar
newtab-topsites-preview-button = Vista preliminar
newtab-topsites-add-button = Adder

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Desira tu vermente deler cata instantia de iste pagina de tu chronologia?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Iste action es irreversibile.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Sponsorisate

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (appunctate)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Aperir le menu
    .aria-label = Aperir le menu
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Remover
    .aria-label = Remover
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Aperir le menu
    .aria-label = Aperir le menu contextual pro { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Modificar iste sito
    .aria-label = Modificar iste sito

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Modificar
newtab-menu-open-new-window = Aperir in un nove fenestra
newtab-menu-open-new-private-window = Aperir in un nove fenestra private
newtab-menu-dismiss = Dimitter
newtab-menu-pin = Clavar
newtab-menu-unpin = Disclavar
newtab-menu-delete-history = Deler del chronologia
newtab-menu-save-to-pocket = Salvar in { -pocket-brand-name }
newtab-menu-delete-pocket = Deler de { -pocket-brand-name }
newtab-menu-archive-pocket = Archivar in { -pocket-brand-name }
newtab-menu-show-privacy-info = Nostre sponsores e tu vita private
newtab-menu-about-fakespot = A proposito de { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Reportar
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Blocar
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Non plus sequer
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Pro saper plus
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Non plus sequer le argumento

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Gerer contento sponsorisate
newtab-menu-our-sponsors-and-your-privacy = Nostre sponsores e tu confidentialitate
newtab-menu-report-this-ad = Reportar iste annuncio

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Facite
newtab-privacy-modal-button-manage = Gerer parametros de contento sponsorisate
newtab-privacy-modal-header = Tu vita private es importante.
newtab-privacy-modal-paragraph-2 = In addition a servir te historias captivante, nos te monstra anque contento pertinente e ben curate ab sponsores seligite. Sia assecurate que <strong>tu datos de navigation non essera jammais divulgate ab tu copia personal de { -brand-product-name }</strong>: nos non los vide, ni nostre sponsores.
newtab-privacy-modal-link = Saper plus sur le respecto del vita private in le pagina de nove scheda

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Remover le marcapaginas
# Bookmark is a verb here.
newtab-menu-bookmark = Adder marcapagina

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Copiar le ligamine de discargamento
newtab-menu-go-to-download-page = Ir al pagina de discargamento
newtab-menu-remove-download = Remover del chronologia

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Monstrar in Finder
       *[other] Aperir le dossier que lo contine
    }
newtab-menu-open-file = Aperir le file

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Visitate
newtab-label-bookmarked = Marcapagina addite
newtab-label-removed-bookmark = Marcapagina removite
newtab-label-recommended = Tendentias
newtab-label-saved = Salvate in { -pocket-brand-name }
newtab-label-download = Discargate
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Sponsorisate
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Sponsorisate per { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Sponsorisate

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Remover le section
newtab-section-menu-collapse-section = Collaber le section
newtab-section-menu-expand-section = Expander le section
newtab-section-menu-manage-section = Gerer le section
newtab-section-menu-manage-webext = Gerer extension
newtab-section-menu-add-topsite = Adder sito preferite
newtab-section-menu-add-search-engine = Adder un motor de recerca
newtab-section-menu-move-up = Mover in alto
newtab-section-menu-move-down = Mover in basso
newtab-section-menu-privacy-notice = Aviso de confidentialitate

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Collaber le section
newtab-section-expand-section-label =
    .aria-label = Expander le section

## Section Headers.

newtab-section-header-topsites = Sitos preferite
newtab-section-header-recent-activity = Recente activitate
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Recommendate per { $provider }
newtab-section-header-stories = Historias que face pensar
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Selectiones hodierne pro te

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Comencia a navigar e nos te monstrara hic alcunes del excellente articulos, videos e altere paginas que tu ha recentemente visitate o addite al marcapaginas.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Tu ja es toto al currente. Reveni plus tarde pro plus historias popular de { $provider }. Non vole attender? Selige un subjecto popular pro discoperir altere articulos interessante sur le web.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Tu ja es actualisate con toto. Re-controla plus tarde pro altere historias. Non vole attender? Selectiona un thema popular pro trovar le plus grande historias del web.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Il ha nihil plus!
newtab-discovery-empty-section-topstories-content = Reveni plus tarde pro leger altere articulos.
newtab-discovery-empty-section-topstories-try-again-button = Retentar
newtab-discovery-empty-section-topstories-loading = Cargamento…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Ups! Nos non ha potite cargar tote le articulos de iste section.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Subjectos popular:
newtab-pocket-new-topics-title = Vole ancora plus historias? Vide iste topicos popular de { -pocket-brand-name }
newtab-pocket-more-recommendations = Altere recommendationes
newtab-pocket-learn-more = Saper plus
newtab-pocket-cta-button = Obtener { -pocket-brand-name }
newtab-pocket-cta-text = Salva le articulos que tu ama in { -pocket-brand-name }, e alimenta tu mente con lecturas fascinante.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } es parte del familia de { -brand-product-name }
newtab-pocket-save = Salvar
newtab-pocket-saved = Salvate

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Plus como isto
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Non me interessa
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Gratias. Cognoscer tu opinion nos adjuta a meliorar tu canal.
newtab-toast-dismiss-button =
    .title = Dimitter
    .aria-label = Dimitter

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Discoperi le melio del Web
newtab-pocket-onboarding-cta = { -pocket-brand-name } explora un grande varietate de publicationes pro apportar le contento plus informative, fonte de inspiration, e digne de fide, justo a tu navigator { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Un error ha occurrite durante le cargamento de iste contento.
newtab-error-fallback-refresh-link = Refresca le pagina pro tentar de novo.

## Customization Menu

newtab-custom-shortcuts-title = Accessos directe
newtab-custom-shortcuts-subtitle = Sitos que tu salva o visita
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Accessos directe
    .description = Sitos que tu salva o visita
newtab-custom-shortcuts-nova =
    .label = Accessos directe
newtab-custom-row-description =
    .description = Numero de rangos
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } linea
           *[other] { $num } lineas
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } linea
       *[other] { $num } lineas
    }
newtab-custom-sponsored-sites = Accessos directe sponsorisate
newtab-custom-pocket-title = Recommendate per { -pocket-brand-name }
newtab-custom-pocket-subtitle = Contento exceptional a cura de { -pocket-brand-name }, parte del familia { -brand-product-name }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Historias recommendate
    .description = Exceptional contento curate per le familia de { -brand-product-name }
newtab-recommended-stories-toggle =
    .label = Historias recommendate
newtab-custom-stories-personalized-toggle =
    .label = Historias
newtab-custom-stories-personalized-checkbox-label = Historias personalisate basate sur tu activitate
newtab-custom-pocket-sponsored = Articulos sponsorisate
newtab-custom-pocket-show-recent-saves = Monstrar salvamentos recente
newtab-custom-recent-title = Activitate recente
newtab-custom-recent-subtitle = Un selection de sitos e contento recente
newtab-custom-weather-toggle =
    .label = Meteo
    .description = Prevision hodierne a un colpo de oculos
newtab-custom-widget-weather-toggle =
    .label = Meteo
newtab-custom-widget-lists-toggle =
    .label = Listas
newtab-custom-widget-timer-toggle =
    .label = Temporisator
newtab-custom-widget-sports-toggle =
    .label = Cuppa del Mundo
newtab-custom-widget-clock-toggle =
    .label = Horologio
newtab-custom-widget-sports-toggle2 =
    .label = Sports
newtab-custom-widget-section-title = Widgets
newtab-custom-widget-section-toggle =
    .label = Widgets
newtab-widget-manage-title = Widgets
newtab-widget-manage-widget-button =
    .label = Gerer widgets
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Clauder
    .aria-label = Clauder menu
newtab-custom-close-button = Clauder
newtab-custom-settings = Gerer altere parametros

## New Tab Wallpapers

newtab-wallpaper-title = Fundos
newtab-wallpaper-reset = Restaurar le predefinition
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Incargar un imagine
newtab-wallpaper-add-an-image = Adder un imagine
newtab-wallpaper-custom-color = Eliger un color
newtab-wallpaper-toggle-title =
    .label = Fundos
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Le dimension del imagine excede le limite de { $file_size }MB. Tenta incargar un file minus grande.
newtab-wallpaper-error-upload-file-type = Impossibile incargar tu file. Retenta con un file de imagine.
newtab-wallpaper-error-file-type = Impossibile incargar tu file. Retenta con un altere typo de file.
newtab-wallpaper-light-red-panda = Panda rubie
newtab-wallpaper-light-mountain = Montania blanc
newtab-wallpaper-light-sky = Celo con nubes purpuree e rosate
newtab-wallpaper-light-color = Formas blau, rosate e jalne
newtab-wallpaper-light-landscape = Paisage montan con bruma blau
newtab-wallpaper-light-beach = Plagia con arbore de palma
newtab-wallpaper-dark-aurora = Aurora Boreal
newtab-wallpaper-dark-color = Formas rubie e blau
newtab-wallpaper-dark-panda = Panda rubie celate in bosco
newtab-wallpaper-dark-sky = Paisage urban con un celo nocturne
newtab-wallpaper-dark-mountain = Paisage montan
newtab-wallpaper-dark-city = Paisage urban purpuree
newtab-wallpaper-dark-fox-anniversary = Un vulpe sur le pavimento presso un bosco
newtab-wallpaper-light-fox-anniversary = Un vulpe in un prato con un brumose paisage montan

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Colores unite
newtab-wallpaper-colors = Colores
newtab-wallpaper-blue = Blau
newtab-wallpaper-light-blue = Blau clar
newtab-wallpaper-light-purple = Purpuree clar
newtab-wallpaper-light-green = Verde clar
newtab-wallpaper-green = Verde
newtab-wallpaper-beige = Beige
newtab-wallpaper-yellow = Jalne
newtab-wallpaper-orange = Orange
newtab-wallpaper-pink = Rosate
newtab-wallpaper-light-pink = Rosate clar
newtab-wallpaper-red = Rubie
newtab-wallpaper-dark-blue = Blau obscur
newtab-wallpaper-dark-purple = Purpuree obscur
newtab-wallpaper-dark-green = Verde obscur
newtab-wallpaper-brown = Brun

## Abstract

newtab-wallpaper-category-title-abstract = Abstracte
newtab-wallpaper-abstract-green = Formas verde
newtab-wallpaper-abstract-blue = Formas blau
newtab-wallpaper-abstract-purple = Formas purpuree
newtab-wallpaper-abstract-orange = Formas orange
newtab-wallpaper-gradient-orange = Gradiente orange e rosate
newtab-wallpaper-abstract-blue-purple = Formas blau e purpuree
newtab-wallpaper-abstract-white-curves = Blanc con curvas umbrate
newtab-wallpaper-abstract-purple-green = Gradiente purpuree e verde clar
newtab-wallpaper-abstract-blue-purple-waves = Formas undulate blau e purpuree
newtab-wallpaper-abstract-black-waves = Formas undulate nigre

## Firefox

newtab-wallpaper-category-title-photographs = Photos
newtab-wallpaper-beach-at-sunrise = Plagia al levar del sol
newtab-wallpaper-beach-at-sunset = Plagia al poner del sol
newtab-wallpaper-storm-sky = Celo tempestuose
newtab-wallpaper-sky-with-pink-clouds = Celo con nubes rosate
newtab-wallpaper-red-panda-yawns-in-a-tree = Un panda rubie que balla sur un arbore
newtab-wallpaper-white-mountains = Montanias blanc
newtab-wallpaper-hot-air-balloons = Aerostatos de colores assortite durante le die
newtab-wallpaper-starry-canyon = Nocte stellate blau
newtab-wallpaper-suspension-bridge = Photographia de un ponte suspendite gris durante le die
newtab-wallpaper-sand-dunes = Dunas de arena blanc
newtab-wallpaper-palm-trees = Silhouette de palmas de coco durante le hora aurate
newtab-wallpaper-blue-flowers = Photographia in prime plano de flores con petalos blau florescente
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Photo per <a data-l10n-name="name-link">{ $author_string }</a> sur <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Prova un tocco de color
newtab-wallpaper-feature-highlight-content = Da a tu nove schedas un apparentia fresc con le fundos.
newtab-wallpaper-feature-highlight-button = OK
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Dimitter
    .aria-label = Claude le message comparente
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Celo
newtab-wallpaper-celestial-lunar-eclipse = Eclipse lunar
newtab-wallpaper-celestial-earth-night = Photo nocturne ab orbita terrestre basse
newtab-wallpaper-celestial-starry-sky = Celo stellate
newtab-wallpaper-celestial-eclipse-time-lapse = Time-lapse de eclipse lunar
newtab-wallpaper-celestial-black-hole = Illustration de galaxia con foramine nigre
newtab-wallpaper-celestial-river = Imagine de satellite de un fluvio

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Vider prevision in { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Sponsorisate
newtab-weather-menu-change-location = Cambiar loco
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Cercar loco
    .aria-label = Cercar loco
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Usar position actual
newtab-weather-menu-weather-display = Visualisation meteo
newtab-weather-todays-forecast = Prevision hodierne
newtab-weather-see-full-forecast = Vider prevision complete
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Simple
newtab-weather-menu-change-weather-display-simple = Passar al vista simple
newtab-weather-menu-weather-display-option-detailed = Detaliate
newtab-weather-menu-change-weather-display-detailed = Passar al vista detaliate
newtab-weather-menu-temperature-units = Unitates de temperatura
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Passar a Fahrenheit
newtab-weather-menu-change-temperature-units-celsius = Passar a Celsius
newtab-weather-menu-hide-weather = Celar meteo sur Nove scheda
newtab-weather-menu-learn-more = Pro saper plus
newtab-weather-menu-detect-my-location = Deteger mi position
# This message is shown if user is working offline
newtab-weather-error-not-available = Datos meteo non es disponibile al momento.
newtab-weather-opt-in-see-weather = Vole tu vider le meteo pro tu position?
newtab-weather-opt-in-not-now =
    .label = Non ora
newtab-weather-opt-in-yes =
    .label = Si
newtab-weather-opt-in-headline = Obtene tu prevision del conditiones meteorologic local
newtab-weather-opt-in-use-location =
    .label = Usar position
newtab-weather-opt-in-choose-location = Eliger position
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Citate de Nove York
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Alte
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Basse
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Vider prevision in { $provider }
    .aria-description = { $provider } ∙ Sponsorisate

## Topic Labels

newtab-topic-label-business = Negotios
newtab-topic-label-career = Carriera
newtab-topic-label-education = Education
newtab-topic-label-arts = Intertenimento
newtab-topic-label-food = Alimentos
newtab-topic-label-health = Sanitate
newtab-topic-label-hobbies = Jocos
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Moneta
newtab-topic-label-society-parenting = Education
newtab-topic-label-government = Politica
newtab-topic-label-education-science = Scientia
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Auto-amelioration
newtab-topic-label-sports = Sports
newtab-topic-label-tech = Technologia
newtab-topic-label-travel = Viages
newtab-topic-label-home = Casa e jardin

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Selige le themas pro le accordo fin de tu fluxo
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Selige duo o plus themas. Nostre curatores experte da prioritate al historias apte a tu interesses. Actualisa quando tu lo vole.
newtab-topic-selection-save-button = Salvar
newtab-topic-selection-cancel-button = Cancellar
newtab-topic-selection-button-maybe-later = Forsan un altere vice
newtab-topic-selection-privacy-link = Apprende como nos protege e gere le datos
newtab-topic-selection-button-update-interests = Actualisa tu interesses
newtab-topic-selection-button-pick-interests = Selige tu interesses

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Sequer
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Sequer{ $topic }
newtab-section-following-button = Sequente
newtab-section-unfollow-button = Non plus sequer
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Tu seque: cessar de sequer { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Perfectiona tu fluxo
newtab-section-follow-highlight-subtitle = Seque tu interesses pro vider plus de lo que te place.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Blocar
newtab-section-blocked-button = Blocate
newtab-section-unblock-button = Disblocar
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Sequer{ $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Cessar de sequer { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Blocar { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Disblocar { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = Non ora
newtab-section-confirm-block-topic-p1 = Desira tu vermente blocar iste topico?
newtab-section-confirm-block-topic-p2 = Le topicos blocate non apparera plus in tu fluxo.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Blocar { $topic }
newtab-section-block-cancel-button = Cancellar

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Topicos
newtab-section-manage-topics-button-v2 =
    .label = Gerer topicos
newtab-section-mangage-topics-followed-topics = Sequite
newtab-section-mangage-topics-followed-topics-empty-state = Tu non ha ancora sequite alcun topico.
newtab-section-mangage-topics-blocked-topics = Blocate
newtab-section-mangage-topics-blocked-topics-empty-state = Tu non ha ancora blocate alcun topico.
newtab-custom-wallpaper-title = Ecce le fundos personalisate
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Incarga tu proprie fundo o selige un color pro personalisar tu { -brand-product-name }.
newtab-custom-wallpaper-cta = Prova lo

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Selige un fundo pro render tue { -brand-product-name }
newtab-new-user-custom-wallpaper-subtitle = Rende cata nove scheda como tu casa con fundos e colores personal.
newtab-new-user-custom-wallpaper-cta = Proba lo subito

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Nove fundos justo atterrate
newtab-wallpaper-feature-highlight-subtitle = Elige tu favorite e rende cata nove scheda como le pagina principal.
newtab-wallpaper-feature-highlight-cta = Eliger fundo

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Discarga { -brand-product-name } pro apparatos mobile
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Scanna le codice pro navigar con securitate quando tu es in cammino.
newtab-download-mobile-highlight-body-variant-b = Reprende de ubi tu cessava quando tu synchronisa tu schedas, contrasignos, e plus.
newtab-download-mobile-highlight-body-variant-c = Sape tu que tu pote prender { -brand-product-name } quando tu es in cammino? Le mesme navigator, in tu tasca.
newtab-download-mobile-highlight-image =
    .aria-label = Codice QR pro discargar { -brand-product-name } pro apparatos mobile

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Tu preferentias a tu punctas de digitos
newtab-shortcuts-highlight-subtitle = Adde un accesso directe pro mantener tu sitos favorite a portata de clic.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Proque reporta tu isto?
newtab-report-ads-reason-not-interested =
    .label = Io non es interessate
newtab-report-ads-reason-inappropriate =
    .label = Es inappropriate
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Io lo ha vidite troppo de vices
newtab-report-content-wrong-category =
    .label = Categoria incorrecte
newtab-report-content-outdated =
    .label = Obsolete
newtab-report-content-inappropriate-offensive =
    .label = Inappropriate o offensive
newtab-report-content-spam-misleading =
    .label = Spam o deception
newtab-report-content-requires-payment-subscription =
    .label = Require pagamento o abonamento
newtab-report-content-requires-payment-subscription-learn-more = Pro saper plus
newtab-report-cancel = Cancellar
newtab-report-submit = Inviar
newtab-toast-thanks-for-reporting =
    .message = Gratias pro iste reporto.
newtab-toast-widgets-hidden =
    .message = Selige le icone de stilo pro quandocunque re-adder widgets
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Tu ora seque { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Tu cessava de sequer { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Tu non videra plus historias re { $topic }.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Le possibilitates es infinite. Adde un.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Nove
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Completate ({ $number })
newtab-widget-lists-celebration-headline = Optime labor
newtab-widget-lists-celebration-subhead = Toto ben
newtab-widget-task-list-menu-copy = Copiar
newtab-widget-lists-menu-edit = Modificar le nomine del lista
newtab-widget-lists-menu-edit2 =
    .aria-label = Modificar le nomine del lista
newtab-widget-lists-menu-create = Crear un nove lista
newtab-widget-lists-menu-delete = Deler iste lista
newtab-widget-lists-menu-copy = Copiar lista al area de transferentia
newtab-widget-lists-menu-learn-more = Pro saper plus
newtab-widget-lists-button-add-item = Adder un elemento
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Adder un elemento
    .aria-label = Adder un elemento
newtab-widget-lists-input-error = Include texto pro adder un elemento.
newtab-widget-lists-input-menu-open-link = Aperir ligamine
newtab-widget-lists-input-menu-move-up = Mover in alto
newtab-widget-lists-input-menu-move-down = Mover in basso
newtab-widget-lists-input-menu-delete = Deler
newtab-widget-lists-input-menu-edit = Modificar
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Elemento redigite
newtab-widget-lists-edit-clear =
    .aria-label = Cancellar
    .title = Cancellar
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Crear un nove lista
newtab-widget-lists-name-label-default =
    .label = Agenda
newtab-widget-lists-name-label-checklist =
    .label = Lista de verification
newtab-widget-lists-name-placeholder-default =
    .placeholder = Agenda
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Lista de verification
    .aria-label = Modificar le nomine del lista
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Nove lista
    .aria-label = Modificar le nomine del lista
newtab-widget-section-title = Widgets
newtab-widget-menu-hide = Celar widget
newtab-widget-menu-change-size = Cambiar dimension
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Mover
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Sinistra
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Dextra
newtab-widget-size-small = Parve
newtab-widget-size-medium = Medie
newtab-widget-size-large = Grande
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Celar widgets
    .aria-label = Celar tote le widgets
newtab-widget-section-maximize =
    .title = Expander widgets
    .aria-label = Expander tote le widgets a dimension real
newtab-widget-section-minimize =
    .title = Minimisar widgets
    .aria-label = Collaber tote le widgets a dimension compacte
newtab-widget-section-menu-button =
    .title = Menu de widgets
    .aria-label = Aperir menu de widgets
newtab-widget-add-widgets-button =
    .aria-label = Adder widget
    .title = Adder widget
newtab-widget-section-menu-manage = Gerer widgets
newtab-widget-section-menu-hide-all = Celar widgets
newtab-widget-section-menu-learn-more = Pro saper plus
newtab-widget-section-feedback = Conta nos lo que que tu pensa
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Monstrar altere widgets
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Monstrar minus widgets
newtab-widget-lists-name-default = Lista de verification

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Temporisator
newtab-widget-timer-notification-focus = Le periodo de concentration ha terminate. Belle labor. Besonio de un pausa?
newtab-widget-timer-notification-break = Tu pausa ha terminate. Preste a concentrar te?
newtab-widget-timer-notification-warning = Notificationes disactivate
newtab-widget-timer-mode-focus =
    .label = Concentration
newtab-widget-timer-mode-break =
    .label = Pausa
newtab-widget-timer-label-play =
    .label = Reproducer
newtab-widget-timer-label-pause =
    .label = Pausar
newtab-widget-timer-reset =
    .title = Reinitialisar
newtab-widget-timer-menu-notifications = Disactivar notificationes
newtab-widget-timer-menu-notifications-on = Activar notificationes
newtab-widget-timer-menu-learn-more = Pro saper plus
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Titulos principal
newtab-daily-briefing-card-menu-dismiss = Ignorar
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Actualisate desde { $minutes } min
newtab-widget-message-title = Remane concentrate con le listas e un temporisator integrate
# to-dos stands for "things to do".
newtab-widget-message-copy = De rememorationes a travalios, de concentration a relaxation – resta attente e a tempore.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Un sol puncto pro concentrar se, consultar previsiones meteo, e plus
newtab-widget-message-focus-forecasts-body = Mantene tu die fluente con le widgets de { -brand-product-name }. Consulta le previsiones meteo, concentra te sur tu activitates, o tracia le tempore a transverso le mundo.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Face tue { -brand-product-name }
newtab-promo-card-body-addons = Impedi al VPN integrate de esser disponibile al usatores.
newtab-promo-card-cta-addons = Proba lo subito
newtab-promo-card-title = Supporta { -brand-product-name }
newtab-promo-card-body = Nostre patrocinatores supporta nostre mission pro construer un web melior
newtab-promo-card-cta = Pro saper plus
newtab-promo-card-dismiss-button =
    .title = Clauder
    .aria-label = Clauder

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] Initiar temporisator pro { $minutes } minuta
           *[other] Initiar temporisator pro { $minutes } minutas
        }
newtab-widget-timer-pause-aria =
    .aria-label = Pausar temporisator
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } minuta
           *[other] { $minutes } minutas
        }
newtab-widget-timer-decrease-min =
    .title = Diminuer 1 minuta
newtab-widget-timer-increase-min =
    .title = Augmentar 1 minuta
newtab-widget-timer-mode-group =
    .aria-label = Modo de temporisator
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Focus
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Pausa
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Celar temporisator
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Optime labor
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Tu pausa es expirate
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Besonia tu un pausa?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Preste a concentrar?

##

newtab-sports-widget-menu-follow-teams = Sequer equipas
newtab-sports-widget-menu-view-schedule = Vider agenda
newtab-sports-widget-menu-view-upcoming = Vider matchs imminente
newtab-sports-widget-menu-view-results = Visualisar resultatos
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Datas clave
newtab-sports-widget-menu-learn-more = Pro saper plus
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Retener schedas sur le Cuppa del mundo
newtab-sports-widget-get-updates = Obtene actualisationes al vivo del matches e plus.
newtab-sports-widget-view-schedule =
    .label = Vider agenda
newtab-sports-widget-follow-teams =
    .label = Sequer equipas
newtab-sports-widget-view-matches =
    .label = Vider concordantias
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Seque usque { $number } equipa
       *[other] Seque usque { $number } equipas
    }
newtab-sports-widget-choose-wallpaper =
    .label = Eliger un fundo de schermo
newtab-sports-widget-skip = Saltar
newtab-sports-widget-search-country =
    .placeholder = Cercar pais
    .aria-label = Cercar pais
newtab-sports-widget-cancel = Cancellar
newtab-sports-widget-back-button =
    .aria-label = Retro
newtab-sports-widget-done-button =
    .label = Facite
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (eliminate)
newtab-sports-widget-view-all =
    .label = Vider toto
newtab-sports-widget-show-less =
    .label = Monstrar minus
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Solo equipas sequite
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Reguarda
    .title = Reguarda al vivo
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Reguarda al vivo
    .title = Reguarda al vivo
newtab-sports-widget-watch-dialog-close =
    .aria-label = Clauder
    .title = Clauder
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Gratuite
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Prova gratuite
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Gratuite e pagate
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Pagate
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Solo le jocos eligite
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Disponibile in tu region
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Altere regiones
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Aperir video al vivo
    .title = Aperir video al vivo
newtab-sports-widget-group-stage = Phase de grouppos
newtab-sports-widget-group-a = Gruppo A
newtab-sports-widget-group-b = Gruppo B
newtab-sports-widget-group-c = Gruppo C
newtab-sports-widget-group-d = Gruppo D
newtab-sports-widget-group-e = Gruppo E
newtab-sports-widget-group-f = Gruppo F
newtab-sports-widget-group-g = Gruppo G
newtab-sports-widget-group-h = Gruppo H
newtab-sports-widget-group-i = Gruppo I
newtab-sports-widget-group-j = Gruppo J
newtab-sports-widget-group-k = Gruppo K
newtab-sports-widget-group-l = Gruppo L
newtab-sports-widget-round-32 = Dece-sextos de final
newtab-sports-widget-round-16 = Octavos de final
newtab-sports-widget-quarter-finals = Quartos de final
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = AL VIVO
newtab-custom-widget-live-refresh =
    .title = Actualisar le scores
    .aria-label = Actualisar le scores
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Datas clave
newtab-sports-widget-upcoming = Proximemente
# Used for a match currently ongoing
newtab-sports-widget-now = Ora
newtab-sports-widget-results = Resultatos
newtab-sports-widget-semi-finals = Semi-finales
newtab-sports-widget-bronze-finals = Final pro le medalia de bronzo
# Final is the final match for 1st place.
newtab-sports-widget-final = Final
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Retardate
newtab-sports-widget-postponed = Postponite
newtab-sports-widget-suspended = Suspendite
newtab-sports-widget-cancelled = Cancellate
newtab-sports-widget-information = Informationes re le incontro
newtab-sports-widget-no-live-data = Le datos del match al vivo ancora non es actualisate
newtab-sports-widget-view-results-link = Visualisar resultatos
newtab-sports-widget-third-place = Tertie posto
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Secunde classificate
newtab-sports-widget-champions = Campiones
newtab-sports-widget-world-cup-champions = Campiones de Cuppa del mundo 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Incontro terminate
newtab-sports-widget-match-halftime = Intervallo
newtab-sports-widget-match-extra-time = Prorogation
newtab-sports-widget-match-penalties = Penalties
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = contra
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Resta syntonisate pro le detalios del matches imminente

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Previe
    .title = Previe
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Sequente
    .title = Sequente
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Match in vivo { $index } sur { $total }
    .title = Match in vivo { $index } sur { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } contra { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) contra { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Al vivo: { $homeTeam }, { $homeScore } contra le { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } contra { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } contra { $awayTeam }, retardate
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } contra { $awayTeam }, postponite
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } contra { $awayTeam }, suspendite
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } contra { $awayTeam }, cancellate

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosnia e Herzegovina
newtab-sports-widget-team-name-label-civ =
    .label = Costa de Ebore
newtab-sports-widget-team-name-label-cod =
    .label = R.D. del Congo
newtab-sports-widget-team-name-label-eng =
    .label = Anglaterra
newtab-sports-widget-team-name-label-sco =
    .label = Scotia
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = A definir

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Lancea le Cuppa del mundo con nove fundos de schermo
newtab-sports-widget-message-wallpapers-body = Apporta alcun energia de die de match a tu navigator pro le torneo.
newtab-sports-widget-message-wallpapers-cta = Eliger fundo
newtab-sports-widget-message-add-widgets-cta =
    .label = Adder widgets
newtab-sports-widget-message-day-in-play-title = Mantene tu die in joco con le widgets de  { -brand-product-name }
newtab-sports-widget-message-day-in-play-body = Seque le Cuppa del mundo, resta sur le activitate, tracia le tempore circum le mundo, e plus.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Explorar widgets

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Ignorar
    .aria-label = Ignorar
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Rende iste spatio tu proprie
newtab-activation-window-message-customization-focus-message = Elige un nove fundo, adde vias breve a tu sitos favorite, e resta actualisate sur le historias que te interessa.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Initiar le personalisation
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Iste spatio seque tu regulas
newtab-activation-window-message-values-focus-message = { -brand-product-name } te permitte de navigar per le maniera que te place, con un maniera plus personal de initiar tu die online. Rende tu proprie { -brand-product-name }.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Celar horologio
newtab-clock-widget-menu-learn-more = Pro saper plus
newtab-clock-widget-menu-edit = Modificar horologios
newtab-clock-widget-menu-switch-to-12h = Passa al formato 12 horas
newtab-clock-widget-menu-switch-to-24h = Passa al formato 24 horas
newtab-clock-widget-label-your-clocks = Tu horologios
newtab-clock-widget-search-location-input =
    .label = Position
    .placeholder = Cercar citate
    .aria-label = Cercar citate
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Pseudonymo (optional)
    .placeholder = Adder un pseudonymo
    .aria-label = Pseudonymo (optional)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Adder nove horologi
    .aria-label = Adder nove horologi
newtab-clock-widget-button-add-clock = Adder
newtab-clock-widget-button-cancel = Cancellar
newtab-clock-widget-button-back =
    .title = Retro
    .aria-label = Retro
newtab-clock-widget-button-edit-clock =
    .title = Modificar horologio
    .aria-label = Modificar horologio
newtab-clock-widget-button-save = Salvar
newtab-clock-widget-button-remove-clock =
    .title = Remover horologio
    .aria-label = Remover horologio
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
    .aria-label = { $city }, pseudonymo: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Adder horologio
newtab-clock-widget-edit-clock-form =
    .aria-label = Modificar horologio
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Resultatos del recerca
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Necun concordantia
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Aperir menu pro horologio
    .aria-label = Aperir menu pro horologio
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Pseudonymo: { $nickname }
