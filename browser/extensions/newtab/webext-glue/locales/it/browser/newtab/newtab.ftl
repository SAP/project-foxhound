# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Nuova scheda
newtab-settings-button =
    .title = Personalizza la pagina Nuova scheda
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Personalizza questa pagina
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Personalizza
newtab-customize-panel-label =
    .label = Personalizza
newtab-personalize-settings-icon-label =
    .title = Personalizza Nuova scheda
    .aria-label = Impostazioni
newtab-settings-dialog-label =
    .aria-label = Impostazioni
newtab-personalize-icon-label =
    .title = Personalizza Nuova scheda
    .aria-label = Personalizza Nuova scheda
newtab-personalize-dialog-label =
    .aria-label = Personalizza
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Chiudi
    .aria-label = Chiudi

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Pagina iniziale
home-homepage-new-windows =
    .label = Nuove finestre
home-homepage-new-tabs =
    .label = Nuove schede
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Scegli un sito specifico

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Indirizzi di siti web
home-custom-homepage-address =
    .placeholder = Inserisci indirizzo
home-custom-homepage-address-button =
    .label = Aggiungi indirizzo
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Non è stato ancora aggiunto alcun sito.
home-custom-homepage-delete-address-button =
    .aria-label = Elimina indirizzo
    .title = Elimina indirizzo
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Sostituisci con
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Pagine attualmente aperte
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Segnalibri…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Ricerca
home-prefs-stories-header2 =
    .label = Storie
    .description = Contenuti eccezionali curati dalla famiglia di prodotti { -brand-product-name }
home-prefs-widgets-header =
    .label = Widget
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Liste
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Timer
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Sport
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Orologio
home-prefs-mission-message2 =
    .message = Gli sponsor sostengono la nostra missione per un Web migliore.
home-prefs-manage-topics-link2 =
    .label = Gestisci argomenti
home-prefs-choose-wallpaper-link2 =
    .label = Scegli uno sfondo
home-prefs-firefox-logo-header =
    .label = Logo di { -brand-short-name }
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Per accedere a queste funzionalità, imposta { -firefox-home-brand-name } come pagina iniziale per le nuove schede o le nuove finestre.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } riga
           *[other] { $num } righe
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Estensione ({ $extension })
home-restore-defaults-srd =
    .label = Ripristina predefiniti
    .accesskey = R
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (predefinita)
home-mode-choice-custom-srd =
    .label = Indirizzi personalizzati…
home-mode-choice-blank-srd =
    .label = Pagina vuota
home-prefs-shortcuts-header-srd =
    .label = Scorciatoie
home-prefs-shortcuts-select =
    .aria-label = Scorciatoie
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Scorciatoie sponsorizzate
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Articoli sponsorizzati
home-prefs-highlights-option-visited-pages-srd =
    .label = Pagine visitate
home-prefs-highlights-options-bookmarks-srd =
    .label = Segnalibri
home-prefs-highlights-option-most-recent-download-srd =
    .label = Download più recenti
home-prefs-recent-activity-header-srd =
    .label = Attività recente
home-prefs-recent-activity-select =
    .aria-label = Attività recente
home-prefs-weather-header-srd =
    .label = Meteo
home-prefs-support-firefox-header-srd =
    .label = Sostieni { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = Scopri come

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Cerca
    .aria-label = Cerca
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Cerca con { $engine } o inserisci un indirizzo
newtab-search-box-handoff-text-no-engine = Cerca o inserisci un indirizzo
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Cerca con { $engine } o inserisci un indirizzo
    .title = Cerca con { $engine } o inserisci un indirizzo
    .aria-label = Cerca con { $engine } o inserisci un indirizzo
newtab-search-box-handoff-input-no-engine =
    .placeholder = Cerca o inserisci un indirizzo
    .title = Cerca o inserisci un indirizzo
    .aria-label = Cerca o inserisci un indirizzo
newtab-search-box-text = Cerca sul Web
newtab-search-box-input =
    .placeholder = Cerca sul Web
    .aria-label = Cerca sul Web

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Aggiungi motore di ricerca
newtab-topsites-add-shortcut-header = Nuova scorciatoia
newtab-topsites-edit-topsites-header = Modifica sito principale
newtab-topsites-edit-shortcut-header = Modifica scorciatoia
newtab-topsites-add-shortcut-label = Aggiungi scorciatoia
newtab-topsites-add-shortcut-title =
    .title = Aggiungi scorciatoia
    .aria-label = Aggiungi scorciatoia
newtab-topsites-title-label = Titolo
newtab-topsites-title-input =
    .placeholder = Inserire un titolo
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Digitare o incollare un URL
newtab-topsites-url-validation = È necessario fornire un URL valido
newtab-topsites-image-url-label = Indirizzo immagine personalizzata
newtab-topsites-use-image-link = Utilizza un’immagine personalizzata…
newtab-topsites-image-validation = Errore durante il caricamento dell’immagine. Prova con un altro indirizzo.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Cancella testo

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Annulla
newtab-topsites-delete-history-button = Elimina dalla cronologia
newtab-topsites-save-button = Salva
newtab-topsites-preview-button = Anteprima
newtab-topsites-add-button = Aggiungi

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Eliminare tutte le occorrenze di questa pagina dalla cronologia?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Questa operazione non può essere annullata.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Sponsorizzato

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (appuntato)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Apri menu
    .aria-label = Apri menu
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Rimuovi
    .aria-label = Rimuovi
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Apri menu
    .aria-label = Apri menu contestuale per { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Modifica questo sito
    .aria-label = Modifica questo sito

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Modifica
newtab-menu-open-new-window = Apri in nuova finestra
newtab-menu-open-new-private-window = Apri in nuova finestra anonima
newtab-menu-dismiss = Rimuovi
newtab-menu-pin = Appunta
newtab-menu-unpin = Rilascia
newtab-menu-delete-history = Elimina dalla cronologia
newtab-menu-save-to-pocket = Salva in { -pocket-brand-name }
newtab-menu-delete-pocket = Elimina da { -pocket-brand-name }
newtab-menu-archive-pocket = Archivia in { -pocket-brand-name }
newtab-menu-show-privacy-info = I nostri sponsor e la tua privacy
newtab-menu-about-fakespot = Informazioni su { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Segnala
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Blocca
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Smetti di seguire
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Ulteriori informazioni
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Smetti di seguire l’argomento

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Gestisci contenuti sponsorizzati
newtab-menu-our-sponsors-and-your-privacy = I nostri sponsor e la tua privacy
newtab-menu-report-this-ad = Segnala questo annuncio

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Fatto
newtab-privacy-modal-button-manage = Gestisci impostazioni per i contenuti sponsorizzati
newtab-privacy-modal-header = La tua privacy è importante.
newtab-privacy-modal-paragraph-2 =
    Oltre a servirti storie accattivanti, ti mostriamo anche contenuti,
    pertinenti e attentamente curati, promossi da un gruppo selezionato di
    sponsor. Ti garantiamo che <strong>nessun dato relativo alla tua navigazione
    viene condiviso dalla tua copia personale di { -brand-product-name }</strong>.
    Noi non abbiamo accesso a queste informazioni, e tantomeno ce l’hanno i
    nostri sponsor.
newtab-privacy-modal-link = Scopri come funziona la privacy nella pagina Nuova scheda

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Elimina segnalibro
# Bookmark is a verb here.
newtab-menu-bookmark = Aggiungi ai segnalibri

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Copia indirizzo di origine
newtab-menu-go-to-download-page = Vai alla pagina di download
newtab-menu-remove-download = Elimina dalla cronologia

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Mostra nel Finder
       *[other] Apri cartella di destinazione
    }
newtab-menu-open-file = Apri file

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Visitato
newtab-label-bookmarked = Nei segnalibri
newtab-label-removed-bookmark = Segnalibro eliminato
newtab-label-recommended = Di tendenza
newtab-label-saved = Salvato in { -pocket-brand-name }
newtab-label-download = Scaricata
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Sponsorizzata
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Sponsorizzata da { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Sponsorizzato

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Rimuovi sezione
newtab-section-menu-collapse-section = Comprimi sezione
newtab-section-menu-expand-section = Espandi sezione
newtab-section-menu-manage-section = Gestisci sezione
newtab-section-menu-manage-webext = Gestisci estensione
newtab-section-menu-add-topsite = Aggiungi sito principale
newtab-section-menu-add-search-engine = Aggiungi motore di ricerca
newtab-section-menu-move-up = Sposta su
newtab-section-menu-move-down = Sposta giù
newtab-section-menu-privacy-notice = Informativa sulla privacy

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Comprimi sezione
newtab-section-expand-section-label =
    .aria-label = Espandi sezione

## Section Headers.

newtab-section-header-topsites = Siti principali
newtab-section-header-recent-activity = Attività recente
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Consigliati da { $provider }
newtab-section-header-stories = Storie che fanno riflettere
# "picks" refers to recommended articles
newtab-section-header-todays-picks = I consigli di oggi per te

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Inizia a navigare e, in questa sezione, verranno visualizzati articoli, video e altre pagine visitate di recente o aggiunte ai segnalibri.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Non c’è altro. Controlla più tardi per altre storie da { $provider }. Non vuoi aspettare? Seleziona un argomento tra quelli più popolari per scoprire altre notizie interessanti dal Web.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Non c’è altro. Controlla più tardi per altre storie. Non vuoi aspettare? Seleziona un argomento tra quelli più popolari per scoprire altre notizie interessanti dal Web.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Non c’è altro.
newtab-discovery-empty-section-topstories-content = Controlla più tardi per altre storie.
newtab-discovery-empty-section-topstories-try-again-button = Riprova
newtab-discovery-empty-section-topstories-loading = Caricamento in corso…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Oops. Sembra che la sezione non si sia caricata completamente.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Argomenti popolari:
newtab-pocket-new-topics-title = Vuoi ancora più storie? Dai un’occhiata agli argomenti più popolari in { -pocket-brand-name }
newtab-pocket-more-recommendations = Altri suggerimenti
newtab-pocket-learn-more = Ulteriori informazioni
newtab-pocket-cta-button = Ottieni { -pocket-brand-name }
newtab-pocket-cta-text = Salva le storie che ami in { -pocket-brand-name } e nutri la tua mente con letture appassionanti.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } è parte della famiglia { -brand-product-name }
newtab-pocket-save = Salva
newtab-pocket-saved = Salvato

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Più contenuti come questo
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Non mi interessa
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Grazie. Conoscere la tua opinione ci aiuta a migliorare il tuo feed.
newtab-toast-dismiss-button =
    .title = Chiudi
    .aria-label = Chiudi

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Scopri il meglio del Web
newtab-pocket-onboarding-cta = { -pocket-brand-name } esplora un’ampia gamma di pubblicazioni per portare i contenuti più istruttivi, stimolanti e attendibili direttamente nel tuo { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Oops, qualcosa è andato storto durante il tentativo di caricare questo contenuto.
newtab-error-fallback-refresh-link = Aggiornare la pagina per riprovare.

## Customization Menu

newtab-custom-shortcuts-title = Scorciatoie
newtab-custom-shortcuts-subtitle = Siti che hai salvato oppure visitato
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Scorciatoie
    .description = Siti che hai salvato oppure visitato
newtab-custom-shortcuts-nova =
    .label = Scorciatoie
newtab-custom-row-description =
    .description = Numero di righe
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } riga
           *[other] { $num } righe
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } riga
       *[other] { $num } righe
    }
newtab-custom-sponsored-sites = Scorciatoie sponsorizzate
newtab-custom-pocket-title = Consigliati da { -pocket-brand-name }
newtab-custom-pocket-subtitle = Contenuti eccezionali a cura di { -pocket-brand-name }, un membro della famiglia { -brand-product-name }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Storie consigliate
    .description = Contenuti eccezionali curati dalla famiglia di prodotti { -brand-product-name }
newtab-recommended-stories-toggle =
    .label = Storie consigliate
newtab-custom-stories-personalized-toggle =
    .label = Storie
newtab-custom-stories-personalized-checkbox-label = Storie personalizzate in base alla tua attività
newtab-custom-pocket-sponsored = Storie sponsorizzate
newtab-custom-pocket-show-recent-saves = Mostra elementi salvati di recente
newtab-custom-recent-title = Attività recente
newtab-custom-recent-subtitle = Una selezione di siti e contenuti visualizzati di recente
newtab-custom-weather-toggle =
    .label = Meteo
    .description = Panoramica delle previsioni meteo per oggi
newtab-custom-widget-weather-toggle =
    .label = Meteo
newtab-custom-widget-lists-toggle =
    .label = Liste
newtab-custom-widget-timer-toggle =
    .label = Timer
newtab-custom-widget-sports-toggle =
    .label = Coppa del mondo
newtab-custom-widget-clock-toggle =
    .label = Orologio
newtab-custom-widget-sports-toggle2 =
    .label = Sport
newtab-custom-widget-section-title = Widget
newtab-custom-widget-section-toggle =
    .label = Widget
newtab-widget-manage-title = Widget
newtab-widget-manage-widget-button =
    .label = Gestisci widget
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Chiudi
    .aria-label = Chiudi menu
newtab-custom-close-button = Chiudi
newtab-custom-settings = Gestisci altre impostazioni

## New Tab Wallpapers

newtab-wallpaper-title = Sfondi
newtab-wallpaper-reset = Ripristina predefinito
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Carica immagine
newtab-wallpaper-add-an-image = Aggiungi un’immagine
newtab-wallpaper-custom-color = Scegli un colore
newtab-wallpaper-toggle-title =
    .label = Sfondi
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = L’immagine eccede la dimensione massima consentita ({ $file_size } MB). Prova a caricare un file più piccolo.
newtab-wallpaper-error-upload-file-type = Impossibile caricare il file. Riprova con un file immagine.
newtab-wallpaper-error-file-type = Impossibile caricare il file. Riprova con un altro tipo di file.
newtab-wallpaper-light-red-panda = Panda rosso
newtab-wallpaper-light-mountain = Montagna imbiancata
newtab-wallpaper-light-sky = Cielo con nuvole viola e rosa
newtab-wallpaper-light-color = Forme gialle, blu e rosa
newtab-wallpaper-light-landscape = Paesaggio con montagna avvolta da foschia blu
newtab-wallpaper-light-beach = Spiaggia con palma
newtab-wallpaper-dark-aurora = Aurora Borealis
newtab-wallpaper-dark-color = Forme rosse e blu
newtab-wallpaper-dark-panda = Panda rosso nascosto in una foresta
newtab-wallpaper-dark-sky = Paesaggio cittadino con cielo notturno
newtab-wallpaper-dark-mountain = Paesaggio con montagne
newtab-wallpaper-dark-city = Paesaggio cittadino con tonalità viola
newtab-wallpaper-dark-fox-anniversary = Una volpe sul marciapiede vicino a una foresta
newtab-wallpaper-light-fox-anniversary = Una volpe in un campo erboso con un paesaggio di montagna avvolto nella nebbia

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Colori solidi
newtab-wallpaper-colors = Colori
newtab-wallpaper-blue = Blu
newtab-wallpaper-light-blue = Blu chiaro
newtab-wallpaper-light-purple = Viola chiaro
newtab-wallpaper-light-green = Verde chiaro
newtab-wallpaper-green = Verde
newtab-wallpaper-beige = Beige
newtab-wallpaper-yellow = Giallo
newtab-wallpaper-orange = Arancio
newtab-wallpaper-pink = Rosa
newtab-wallpaper-light-pink = Rosa chiaro
newtab-wallpaper-red = Rosso
newtab-wallpaper-dark-blue = Blu scuro
newtab-wallpaper-dark-purple = Viola scuro
newtab-wallpaper-dark-green = Verde scuro
newtab-wallpaper-brown = Marrone

## Abstract

newtab-wallpaper-category-title-abstract = Astratti
newtab-wallpaper-abstract-green = Forme verdi
newtab-wallpaper-abstract-blue = Forme blu
newtab-wallpaper-abstract-purple = Forme viola
newtab-wallpaper-abstract-orange = Forme arancioni
newtab-wallpaper-gradient-orange = Sfumatura arancione e rosa
newtab-wallpaper-abstract-blue-purple = Forme blu e viola
newtab-wallpaper-abstract-white-curves = Bianco con curve sfumate
newtab-wallpaper-abstract-purple-green = Sfumatura di luce viola e verde
newtab-wallpaper-abstract-blue-purple-waves = Forme ondulate blu e viola
newtab-wallpaper-abstract-black-waves = Forme ondulate nere

## Firefox

newtab-wallpaper-category-title-photographs = Fotografie
newtab-wallpaper-beach-at-sunrise = Spiaggia all’alba
newtab-wallpaper-beach-at-sunset = Spiaggia al tramonto
newtab-wallpaper-storm-sky = Cielo tempestoso
newtab-wallpaper-sky-with-pink-clouds = Cielo con nuvole rosa
newtab-wallpaper-red-panda-yawns-in-a-tree = Panda rosso che sbadiglia su un albero
newtab-wallpaper-white-mountains = Montagne bianche
newtab-wallpaper-hot-air-balloons = Mongolfiere con colori assortiti riprese in pieno giorno
newtab-wallpaper-starry-canyon = Notte stellata blu
newtab-wallpaper-suspension-bridge = Fotografia di un ponte grigio sospeso scattata durante il giorno
newtab-wallpaper-sand-dunes = Dune di sabbia bianca
newtab-wallpaper-palm-trees = Sagome di palme da cocco riprese durante l’ora d’oro
newtab-wallpaper-blue-flowers = Fotografia ravvicinata di fiori con petali blu in fioritura
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Foto di <a data-l10n-name="name-link">{ $author_string }</a> da <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Prova un tocco di colore
newtab-wallpaper-feature-highlight-content = Dai un look diverso alle nuove schede con gli sfondi.
newtab-wallpaper-feature-highlight-button = OK
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Chiudi
    .aria-label = Chiudi pop-up
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Spazio
newtab-wallpaper-celestial-lunar-eclipse = Eclissi lunare
newtab-wallpaper-celestial-earth-night = Foto notturna dall’orbita terrestre bassa
newtab-wallpaper-celestial-starry-sky = Cielo stellato
newtab-wallpaper-celestial-eclipse-time-lapse = Time-lapse dell’eclissi lunare
newtab-wallpaper-celestial-black-hole = Illustrazione di una galassia
newtab-wallpaper-celestial-river = Immagine satellitare di un fiume

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Mostre le previsioni meteo in { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Sponsorizzato
newtab-weather-menu-change-location = Modifica località
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Cerca località
    .aria-label = Cerca località
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Utilizza la posizione corrente
newtab-weather-menu-weather-display = Visualizzazione meteo
newtab-weather-todays-forecast = Previsioni per oggi
newtab-weather-see-full-forecast = Mostra previsioni complete
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Sintetica
newtab-weather-menu-change-weather-display-simple = Passa alla visualizzazione sintetica
newtab-weather-menu-weather-display-option-detailed = Dettagliata
newtab-weather-menu-change-weather-display-detailed = Passa alla visualizzazione dettagliata
newtab-weather-menu-temperature-units = Unità di temperatura
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Passa a Fahrenheit
newtab-weather-menu-change-temperature-units-celsius = Passa a Celsius
newtab-weather-menu-hide-weather = Nascondi meteo in Nuova scheda
newtab-weather-menu-learn-more = Ulteriori informazioni
newtab-weather-menu-detect-my-location = Rileva la mia posizione
# This message is shown if user is working offline
newtab-weather-error-not-available = I dati sul meteo non sono al momento disponibili.
newtab-weather-opt-in-see-weather = Vuoi vedere il meteo per la tua posizione?
newtab-weather-opt-in-not-now =
    .label = Non adesso
newtab-weather-opt-in-yes =
    .label = Sì
newtab-weather-opt-in-headline = Ottieni le previsioni meteo locali
newtab-weather-opt-in-use-location =
    .label = Utilizza posizione
newtab-weather-opt-in-choose-location = Scegli posizione
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York City
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Massima
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Minima
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Mostre le previsioni meteo in { $provider }
    .aria-description = { $provider } ∙ Sponsorizzato

## Topic Labels

newtab-topic-label-business = Economia
newtab-topic-label-career = Carriera
newtab-topic-label-education = Educazione
newtab-topic-label-arts = Intrattenimento
newtab-topic-label-food = Alimentazione
newtab-topic-label-health = Salute
newtab-topic-label-hobbies = Videogiochi
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Finanze personali
newtab-topic-label-society-parenting = Educazione dei figli
newtab-topic-label-government = Politica
newtab-topic-label-education-science = Scienza
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Life hacks
newtab-topic-label-sports = Sport
newtab-topic-label-tech = Tecnologia
newtab-topic-label-travel = Viaggi
newtab-topic-label-home = Casa e giardino

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Seleziona degli argomenti per personalizzare il tuo feed
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Scegli due o più argomenti. I nostri esperti curatori daranno priorità alle storie più adatte ai tuoi interessi. Puoi aggiornare le tue preferenze in qualsiasi momento.
newtab-topic-selection-save-button = Salva
newtab-topic-selection-cancel-button = Annulla
newtab-topic-selection-button-maybe-later = Magari più tardi
newtab-topic-selection-privacy-link = Scopri come proteggiamo i tuoi dati e la tua privacy
newtab-topic-selection-button-update-interests = Aggiorna i tuoi interessi
newtab-topic-selection-button-pick-interests = Scegli i tuoi interessi

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Segui
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Segui { $topic }
newtab-section-following-button = Stai seguendo
newtab-section-unfollow-button = Smetti di seguire
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Stai seguendo: smetti di seguire { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Perfeziona il tuo feed
newtab-section-follow-highlight-subtitle = Segui gli argomenti che ti interessano per scoprire di più su ciò che ti appassiona.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Blocca
newtab-section-blocked-button = Bloccato
newtab-section-unblock-button = Sblocca
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Segui { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Smetti di seguire { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Blocca { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Sblocca { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = Non adesso
newtab-section-confirm-block-topic-p1 = Bloccare questo argomento?
newtab-section-confirm-block-topic-p2 = Gli argomenti bloccati non verranno più visualizzati nel feed.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Blocca { $topic }
newtab-section-block-cancel-button = Annulla

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Argomenti
newtab-section-manage-topics-button-v2 =
    .label = Gestisci argomenti
newtab-section-mangage-topics-followed-topics = Seguito
newtab-section-mangage-topics-followed-topics-empty-state = Non hai ancora seguito alcun argomento.
newtab-section-mangage-topics-blocked-topics = Bloccato
newtab-section-mangage-topics-blocked-topics-empty-state = Non hai ancora bloccato alcun argomento.
newtab-custom-wallpaper-title = Ora puoi utilizzare sfondi personalizzati
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Carica il tuo sfondo o scegli un colore personalizzato per personalizzare { -brand-product-name }.
newtab-custom-wallpaper-cta = Prova

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Scegli uno sfondo per rendere { -brand-product-name } davvero tuo
newtab-new-user-custom-wallpaper-subtitle = Fai sentire ogni nuova scheda come se fosse casa tua con sfondi e colori personalizzati.
newtab-new-user-custom-wallpaper-cta = Provalo ora

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Sono disponibili nuovi sfondi
newtab-wallpaper-feature-highlight-subtitle = Scegli lo sfondo che preferisci e trasforma ogni nuova scheda in un ambiente familiare.
newtab-wallpaper-feature-highlight-cta = Scegli sfondo

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Scarica { -brand-product-name } per dispositivi mobili
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Scansiona il codice per navigare in sicurezza, ovunque ti trovi.
newtab-download-mobile-highlight-body-variant-b = Riprendi da dove eri rimasto sincronizzando schede, password e altro ancora.
newtab-download-mobile-highlight-body-variant-c = Lo sapevi che puoi portare { -brand-product-name } sempre con te? Lo stesso browser, nella tua tasca.
newtab-download-mobile-highlight-image =
    .aria-label = Codice QR per scaricare { -brand-product-name } per dispositivi mobili

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = I tuoi preferiti a portata di mano
newtab-shortcuts-highlight-subtitle = Aggiungi una scorciatoia per mantenere i tuoi siti preferiti a portata di clic.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Perché stai segnalando questa pubblicità?
newtab-report-ads-reason-not-interested =
    .label = Non mi interessa
newtab-report-ads-reason-inappropriate =
    .label = È inappropriata
newtab-report-ads-reason-seen-it-too-many-times =
    .label = L’ho vista troppe volte
newtab-report-content-wrong-category =
    .label = Categoria errata
newtab-report-content-outdated =
    .label = Obsoleta
newtab-report-content-inappropriate-offensive =
    .label = Inappropriata o offensiva
newtab-report-content-spam-misleading =
    .label = Spam o ingannevole
newtab-report-content-requires-payment-subscription =
    .label = Richiede pagamento o abbonamento
newtab-report-content-requires-payment-subscription-learn-more = Ulteriori informazioni
newtab-report-cancel = Annulla
newtab-report-submit = Invia
newtab-toast-thanks-for-reporting =
    .message = Grazie per la segnalazione.
newtab-toast-widgets-hidden =
    .message = Seleziona l’icona a forma di matita per ripristinare i widget in qualsiasi momento.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Ora stai seguendo { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Non segui più { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Non verranno più visualizzate storie relative a { $topic }.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Le possibilità sono infinite. Aggiungine una.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Novità
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Completate ({ $number })
newtab-widget-lists-celebration-headline = Ottimo lavoro
newtab-widget-lists-celebration-subhead = Tutto fatto
newtab-widget-task-list-menu-copy = Copia
newtab-widget-lists-menu-edit = Modifica nome lista
newtab-widget-lists-menu-edit2 =
    .aria-label = Modifica nome lista
newtab-widget-lists-menu-create = Crea nuova lista
newtab-widget-lists-menu-delete = Elimina questa lista
newtab-widget-lists-menu-copy = Copia lista negli appunti
newtab-widget-lists-menu-learn-more = Ulteriori informazioni
newtab-widget-lists-button-add-item = Aggiungi un elemento
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Aggiungi un elemento
    .aria-label = Aggiungi un elemento
newtab-widget-lists-input-error = Includere del testo per aggiungere un elemento.
newtab-widget-lists-input-menu-open-link = Apri link
newtab-widget-lists-input-menu-move-up = Sposta in alto
newtab-widget-lists-input-menu-move-down = Sposta in basso
newtab-widget-lists-input-menu-delete = Elimina
newtab-widget-lists-input-menu-edit = Modifica
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Modifica elemento
newtab-widget-lists-edit-clear =
    .aria-label = Annulla
    .title = Annulla
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Crea nuova lista
newtab-widget-lists-name-label-default =
    .label = Lista di attività
newtab-widget-lists-name-label-checklist =
    .label = Lista di controllo
newtab-widget-lists-name-placeholder-default =
    .placeholder = Lista di attività
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Lista di controllo
    .aria-label = Modifica nome lista
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Nuova lista
    .aria-label = Modifica nome lista
newtab-widget-section-title = Widget
newtab-widget-menu-hide = Nascondi widget
newtab-widget-menu-change-size = Cambia dimensione
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Sposta
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = A sinistra
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = A destra
newtab-widget-size-small = Piccola
newtab-widget-size-medium = Media
newtab-widget-size-large = Grande
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Nascondi widget
    .aria-label = Nascondi tutti i widget
newtab-widget-section-maximize =
    .title = Espandi widget
    .aria-label = Espandi tutti i widget alla massima dimensione
newtab-widget-section-minimize =
    .title = Minimizza widget
    .aria-label = Comprimi tutti i widget alle dimensione più compatta
newtab-widget-section-menu-button =
    .title = Menu widget
    .aria-label = Apri il menu widget
newtab-widget-add-widgets-button =
    .aria-label = Aggiungi widget
    .title = Aggiungi widget
newtab-widget-section-menu-manage = Gestisci widget
newtab-widget-section-menu-hide-all = Nascondi widget
newtab-widget-section-menu-learn-more = Ulteriori informazioni
newtab-widget-section-feedback = Dicci cosa ne pensi
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Mostra altri widget
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Mostra meno widget
newtab-widget-lists-name-default = Lista di controllo

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Timer
newtab-widget-timer-notification-focus = Il tempo per concentrarti è terminato. Ottimo lavoro. Ti serve una pausa?
newtab-widget-timer-notification-break = La tua pausa è finita. Pronto per concentrarti?
newtab-widget-timer-notification-warning = Le notifiche sono disattivate
newtab-widget-timer-mode-focus =
    .label = Concentrazione
newtab-widget-timer-mode-break =
    .label = Pausa
newtab-widget-timer-label-play =
    .label = Avvia
newtab-widget-timer-label-pause =
    .label = Metti in pausa
newtab-widget-timer-reset =
    .title = Ripristina
newtab-widget-timer-menu-notifications = Disattiva notifiche
newtab-widget-timer-menu-notifications-on = Attiva le notifiche
newtab-widget-timer-menu-learn-more = Ulteriori informazioni
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Notizie in primo piano
newtab-daily-briefing-card-menu-dismiss = Chiudi
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Aggiornato { $minutes }m fa
newtab-widget-message-title = Mantieni la concentrazione utilizzando le liste e il timer integrato
# to-dos stands for "things to do".
newtab-widget-message-copy = Da promemoria veloci a liste di attività quotidiane, da sessioni di concentrazione a pause per rilassarsi: mantieni l’attenzione e rispetta i tempi.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Un unico spazio per concentrarsi, consultare le previsioni meteo e molto altro
newtab-widget-message-focus-forecasts-body = Rendi la tua giornata più fluida grazie ai widget di { -brand-product-name }. Consulta le previsioni meteo, resta concentrato sui tuoi impegni o tieni traccia dell’ora in tutto il mondo.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Rendi { -brand-product-name } davvero tuo
newtab-promo-card-body-addons = Scegli uno sfondo dalla nostra raccolta oppure creane uno tuo.
newtab-promo-card-cta-addons = Provalo ora
newtab-promo-card-title = Sostieni { -brand-product-name }
newtab-promo-card-body = Gli sponsor sostengono la nostra missione per un Web migliore
newtab-promo-card-cta = Ulteriori informazioni
newtab-promo-card-dismiss-button =
    .title = Chiudi
    .aria-label = Chiudi

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] Avvia timer da { $minutes } minuti
           *[other] Avvia timer da { $minutes } minuto
        }
newtab-widget-timer-pause-aria =
    .aria-label = Sospendi timer
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } minuto
           *[other] { $minutes } minuti
        }
newtab-widget-timer-decrease-min =
    .title = Diminuisci di 1 minuto
newtab-widget-timer-increase-min =
    .title = Aumenta di 1 minuto
newtab-widget-timer-mode-group =
    .aria-label = Modalità timer
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Concentrazione
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Pausa
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Nascondi timer
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Ottimo lavoro
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = La pausa è finita
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Hai bisogno di una pausa?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Sei pronto a concentrarti?

##

newtab-sports-widget-menu-follow-teams = Segui squadre
newtab-sports-widget-menu-view-schedule = Vedi il calendario
newtab-sports-widget-menu-view-upcoming = Visualizza in arrivo
newtab-sports-widget-menu-view-results = Visualizza risultati
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Date importanti
newtab-sports-widget-menu-learn-more = Ulteriori informazioni
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Resta aggiornato sui Mondiali
newtab-sports-widget-get-updates = Ricevi aggiornamenti in tempo reale sulle partite e altro ancora.
newtab-sports-widget-view-schedule =
    .label = Vedi il calendario
newtab-sports-widget-follow-teams =
    .label = Segui squadre
newtab-sports-widget-view-matches =
    .label = Visualizza partite
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Segui fino a { $number } squadra
       *[other] Segui fino a { $number } squadre
    }
newtab-sports-widget-choose-wallpaper =
    .label = Scegli uno sfondo
newtab-sports-widget-skip = Salta
newtab-sports-widget-search-country =
    .placeholder = Cerca nazione
    .aria-label = Cerca nazione
newtab-sports-widget-cancel = Annulla
newtab-sports-widget-back-button =
    .aria-label = Indietro
newtab-sports-widget-done-button =
    .label = Fatto
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (eliminato)
newtab-sports-widget-view-all =
    .label = Mostra tutto
newtab-sports-widget-show-less =
    .label = Nascondi dettagli
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Solo squadre seguite
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Guarda
    .title = Guarda online
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Guarda in diretta
    .title = Guarda in diretta
newtab-sports-widget-watch-dialog-close =
    .aria-label = Chiudi
    .title = Chiudi
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Gratuito
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Prova gratuita
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Gratuito e a pagamento
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = A pagamento
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Solo alcune partite
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Disponibili nella tua regione
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Altre regioni
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Apri diretta video
    .title = Apri diretta video
newtab-sports-widget-group-stage = Fase a gironi
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
newtab-sports-widget-round-32 = Sedicesimi di finale
newtab-sports-widget-round-16 = Ottavi di finale
newtab-sports-widget-quarter-finals = Quarti di finale
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = LIVE
newtab-custom-widget-live-refresh =
    .title = Aggiorna risultati
    .aria-label = Aggiorna risultati
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Date importanti
newtab-sports-widget-upcoming = In arrivo
# Used for a match currently ongoing
newtab-sports-widget-now = In corso
newtab-sports-widget-results = Risultati
newtab-sports-widget-semi-finals = Semifinali
newtab-sports-widget-bronze-finals = Finale per il terzo posto
# Final is the final match for 1st place.
newtab-sports-widget-final = Finale
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = In ritardo
newtab-sports-widget-postponed = Rinviata
newtab-sports-widget-suspended = Sospesa
newtab-sports-widget-cancelled = Annullata
newtab-sports-widget-information = Informazioni sulla partita
newtab-sports-widget-no-live-data = Al momento i dati delle partite in diretta non si stanno aggiornando
newtab-sports-widget-view-results-link = Visualizza risultati
newtab-sports-widget-third-place = Terzo posto
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Secondi classificati
newtab-sports-widget-champions = Campioni
newtab-sports-widget-world-cup-champions = Campioni della Coppa del Mondo 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Fine partita
newtab-sports-widget-match-halftime = Intervallo
newtab-sports-widget-match-extra-time = Tempi supplementari
newtab-sports-widget-match-penalties = Rigori
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = contro
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Torna presto per scoprire i dettagli delle prossime partite

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Precedente
    .title = Precedente
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Successivo
    .title = Successivo
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Partita in diretta { $index } di { $total }
    .title = Partita in diretta { $index } di { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } contro { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) contro { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = In diretta: { $homeTeam }, { $homeScore } contro { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } contro { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } contro { $awayTeam }, in ritardo
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } contro { $awayTeam }, posticipata
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } contro { $awayTeam }, sospesa
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } contro { $awayTeam }, annullata

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosnia ed Erzegovina
newtab-sports-widget-team-name-label-civ =
    .label = Costa d’Avorio
newtab-sports-widget-team-name-label-cod =
    .label = RD Congo
newtab-sports-widget-team-name-label-eng =
    .label = Inghilterra
newtab-sports-widget-team-name-label-sco =
    .label = Scozia
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Da definire

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Dai il via ai Mondiali con i nuovi sfondi
newtab-sports-widget-message-wallpapers-body = Porta un po’ di atmosfera da stadio nel tuo browser durante il torneo.
newtab-sports-widget-message-wallpapers-cta = Scegli sfondo
newtab-sports-widget-message-add-widgets-cta =
    .label = Aggiungi widget
newtab-sports-widget-message-day-in-play-title = Rendi la tua giornata più dinamica con i widget di { -brand-product-name }
newtab-sports-widget-message-day-in-play-body = Segui la Coppa del Mondo, resta concentrato, tieni traccia dell’ora in tutto il mondo e molto altro.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Esplora i widget

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Chiudi
    .aria-label = Chiudi
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Rendi questo spazio davvero tuo
newtab-activation-window-message-customization-focus-message = Scegli un nuovo sfondo, aggiungi scorciatoie ai tuoi siti preferiti e resta sempre aggiornato sulle storie che ti interessano.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Inizia a personalizzare
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Questo spazio segue le tue regole
newtab-activation-window-message-values-focus-message = { -brand-product-name } ti consente di navigare come preferisci, offrendoti un modo più personale per iniziare la tua giornata online. Rendi { -brand-product-name } davvero tuo.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Nascondi orologio
newtab-clock-widget-menu-learn-more = Ulteriori informazioni
newtab-clock-widget-menu-edit = Modifica gli orologi
newtab-clock-widget-menu-switch-to-12h = Passa al formato 12 ore
newtab-clock-widget-menu-switch-to-24h = Passa al formato 24 ore
newtab-clock-widget-label-your-clocks = I tuoi orologi
newtab-clock-widget-search-location-input =
    .label = Posizione
    .placeholder = Cerca una città
    .aria-label = Cerca una città
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Nome (facoltativo)
    .placeholder = Aggiungi un nome
    .aria-label = Nome (facoltativo)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Aggiungi nuovo orologio
    .aria-label = Aggiungi nuovo orologio
newtab-clock-widget-button-add-clock = Aggiungi
newtab-clock-widget-button-cancel = Annulla
newtab-clock-widget-button-back =
    .title = Indietro
    .aria-label = Indietro
newtab-clock-widget-button-edit-clock =
    .title = Modifica orologio
    .aria-label = Modifica orologio
newtab-clock-widget-button-save = Salva
newtab-clock-widget-button-remove-clock =
    .title = Rimuovi orologio
    .aria-label = Rimuovi orologio
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
    .aria-label = { $city }, nome: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Aggiungi orologio
newtab-clock-widget-edit-clock-form =
    .aria-label = Modifica orologio
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Risultati della ricerca
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Nessuna corrispondenza
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Apri il menu per l’orologio
    .aria-label = Apri il menu per l’orologio
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Nome: { $nickname }
