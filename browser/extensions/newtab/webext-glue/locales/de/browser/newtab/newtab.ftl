# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Neuer Tab
newtab-settings-button =
    .title = Firefox-Startseite anpassen
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Diese Seite anpassen
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Anpassen
newtab-customize-panel-label =
    .label = Anpassen
newtab-personalize-settings-icon-label =
    .title = Firefox-Startseite anpassen
    .aria-label = Einstellungen
newtab-settings-dialog-label =
    .aria-label = Einstellungen
newtab-personalize-icon-label =
    .title = Firefox-Startseite anpassen
    .aria-label = Firefox-Startseite anpassen
newtab-personalize-dialog-label =
    .aria-label = Anpassen
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Verwerfen
    .aria-label = Verwerfen

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Startseite
home-homepage-new-windows =
    .label = Neue Fenster
home-homepage-new-tabs =
    .label = Neue Tabs
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Wählen Sie eine bestimmte Website

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Website-Adresse(n)
home-custom-homepage-address =
    .placeholder = Adresse eingeben
home-custom-homepage-address-button =
    .label = Adresse hinzufügen
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Noch keine Websites hinzugefügt.
home-custom-homepage-delete-address-button =
    .aria-label = Adresse löschen
    .title = Adresse löschen
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Ersetzen durch
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Derzeit geöffnete Seiten
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Lesezeichen…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Suchen
home-prefs-stories-header2 =
    .label = Artikel
    .description = Besondere Inhalte ausgewählt von der { -brand-product-name }-Familie
home-prefs-widgets-header =
    .label = Widgets
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Listen
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Timer
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Sport
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Uhr
home-prefs-mission-message2 =
    .message = Unsere Sponsoren unterstützen unsere Mission, ein besseres Web zu erschaffen.
home-prefs-manage-topics-link2 =
    .label = Themen verwalten
home-prefs-choose-wallpaper-link2 =
    .label = Wählen Sie ein Hintergrundbild
home-prefs-firefox-logo-header =
    .label = { -brand-short-name }-Logo
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Wählen Sie die Option { -firefox-home-brand-name } unter "Startseite", um diese Funktionen verwenden zu können.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } Zeile
           *[other] { $num } Zeilen
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Erweiterung ({ $extension })
home-restore-defaults-srd =
    .label = Standard wiederherstellen
    .accesskey = w
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (Standard)
home-mode-choice-custom-srd =
    .label = Benutzerdefinierte Adressen…
home-mode-choice-blank-srd =
    .label = Leere Seite
home-prefs-shortcuts-header-srd =
    .label = Verknüpfungen
home-prefs-shortcuts-select =
    .aria-label = Verknüpfungen
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Gesponserte Verknüpfungen
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Gesponserte Artikel
home-prefs-highlights-option-visited-pages-srd =
    .label = Besuchte Seiten
home-prefs-highlights-options-bookmarks-srd =
    .label = Lesezeichen
home-prefs-highlights-option-most-recent-download-srd =
    .label = Neueste Downloads
home-prefs-recent-activity-header-srd =
    .label = Neueste Aktivität
home-prefs-recent-activity-select =
    .aria-label = Neueste Aktivität
home-prefs-weather-header-srd =
    .label = Wetter
home-prefs-support-firefox-header-srd =
    .label = { -brand-product-name } unterstützen
home-prefs-mission-message-learn-more-link-srd = Erfahren, wie das geht

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Suchen
    .aria-label = Suchen
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Mit { $engine } suchen oder Adresse eingeben
newtab-search-box-handoff-text-no-engine = Suche oder Adresse eingeben
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Mit { $engine } suchen oder Adresse eingeben
    .title = Mit { $engine } suchen oder Adresse eingeben
    .aria-label = Mit { $engine } suchen oder Adresse eingeben
newtab-search-box-handoff-input-no-engine =
    .placeholder = Suche oder Adresse eingeben
    .title = Suche oder Adresse eingeben
    .aria-label = Suche oder Adresse eingeben
newtab-search-box-text = Das Web durchsuchen
newtab-search-box-input =
    .placeholder = Das Web durchsuchen
    .aria-label = Das Web durchsuchen

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Suchmaschine hinzufügen
newtab-topsites-add-shortcut-header = Neue Verknüpfung
newtab-topsites-edit-topsites-header = Wichtige Seite bearbeiten
newtab-topsites-edit-shortcut-header = Verknüpfung bearbeiten
newtab-topsites-add-shortcut-label = Verknüpfung hinzufügen
newtab-topsites-add-shortcut-title =
    .title = Verknüpfung hinzufügen
    .aria-label = Verknüpfung hinzufügen
newtab-topsites-title-label = Titel
newtab-topsites-title-input =
    .placeholder = Name eingeben
newtab-topsites-url-label = Adresse
newtab-topsites-url-input =
    .placeholder = Eine Adresse eingeben oder einfügen
newtab-topsites-url-validation = Gültige Adresse erforderlich
newtab-topsites-image-url-label = Adresse von benutzerdefinierter Grafik
newtab-topsites-use-image-link = Eine benutzerdefinierte Grafik verwenden…
newtab-topsites-image-validation = Grafik konnte nicht geladen werden. Verwenden Sie eine andere Adresse.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Text löschen

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Abbrechen
newtab-topsites-delete-history-button = Aus Chronik löschen
newtab-topsites-save-button = Speichern
newtab-topsites-preview-button = Vorschau
newtab-topsites-add-button = Hinzufügen

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Soll wirklich jede Instanz dieser Seite aus Ihrer Chronik gelöscht werden?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Diese Aktion kann nicht rückgängig gemacht werden.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Gesponsert

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (angeheftet)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Menü öffnen
    .aria-label = Menü öffnen
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Entfernen
    .aria-label = Entfernen
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Menü öffnen
    .aria-label = Kontextmenü für { $title } öffnen
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Diese Website bearbeiten
    .aria-label = Diese Website bearbeiten

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Bearbeiten
newtab-menu-open-new-window = In neuem Fenster öffnen
newtab-menu-open-new-private-window = In neuem privaten Fenster öffnen
newtab-menu-dismiss = Entfernen
newtab-menu-pin = Anheften
newtab-menu-unpin = Ablösen
newtab-menu-delete-history = Aus Chronik löschen
newtab-menu-save-to-pocket = Bei { -pocket-brand-name } speichern
newtab-menu-delete-pocket = Aus { -pocket-brand-name } löschen
newtab-menu-archive-pocket = In { -pocket-brand-name } archivieren
newtab-menu-show-privacy-info = Unsere Sponsoren & Ihre Privatsphäre
newtab-menu-about-fakespot = Über { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Melden
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Blockieren
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Nicht mehr folgen
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Weitere Informationen
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Thema nicht mehr folgen

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Gesponserte Inhalte verwalten
newtab-menu-our-sponsors-and-your-privacy = Unsere Sponsoren und Ihre Privatsphäre
newtab-menu-report-this-ad = Diese Anzeige melden

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Fertig
newtab-privacy-modal-button-manage = Einstellungen für gesponserte Inhalte
newtab-privacy-modal-header = Ihre Privatsphäre ist wichtig.
newtab-privacy-modal-paragraph-2 =
    Neben spannenden Geschichten zeigen wir Ihnen auch relevante,
    geprüfte Inhalte von ausgewählten Sponsoren. <strong>Ihre 
    Surf-Daten verlassen niemals Ihre { -brand-product-name }-Installation</strong> — wir sehen sie nicht und unsere
    Sponsoren auch nicht.
newtab-privacy-modal-link = Wie Datenschutz für die Tab-Startseite funktioniert

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Lesezeichen entfernen
# Bookmark is a verb here.
newtab-menu-bookmark = Lesezeichen

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Download-Link kopieren
newtab-menu-go-to-download-page = Zur Download-Seite gehen
newtab-menu-remove-download = Aus Chronik entfernen

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Im Finder anzeigen
       *[other] Beinhaltenden Ordner öffnen
    }
newtab-menu-open-file = Datei öffnen

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Besucht
newtab-label-bookmarked = Lesezeichen
newtab-label-removed-bookmark = Lesezeichen entfernt
newtab-label-recommended = Beliebt
newtab-label-saved = Bei { -pocket-brand-name } gespeichert
newtab-label-download = Heruntergeladen
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Gesponsert
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Werbung von { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Gesponsert

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Abschnitt entfernen
newtab-section-menu-collapse-section = Abschnitt einklappen
newtab-section-menu-expand-section = Abschnitt ausklappen
newtab-section-menu-manage-section = Abschnitt verwalten
newtab-section-menu-manage-webext = Erweiterung verwalten
newtab-section-menu-add-topsite = Wichtige Seite hinzufügen
newtab-section-menu-add-search-engine = Suchmaschine hinzufügen
newtab-section-menu-move-up = Nach oben schieben
newtab-section-menu-move-down = Nach unten schieben
newtab-section-menu-privacy-notice = Datenschutzhinweis

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Abschnitt einklappen
newtab-section-expand-section-label =
    .aria-label = Abschnitt ausklappen

## Section Headers.

newtab-section-header-topsites = Wichtige Seiten
newtab-section-header-recent-activity = Neueste Aktivität
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Empfohlen von { $provider }
newtab-section-header-stories = Artikel, die zum Nachdenken anregen
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Unsere heutigen Tipps für Sie

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Surfen Sie los und wir zeigen Ihnen hier einige der interessanten Artikel, Videos und anderen Seiten, die Sie kürzlich besucht oder als Lesezeichen gespeichert haben.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Das war's. Schauen Sie später wieder vorbei, um neue Artikel von { $provider } zu erhalten. Sie können es kaum erwarten? Wählen Sie ein beliebtes Thema aus, um weitere interessante Artikel aus dem Internet zu durchstöbern.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Das war's. Schauen Sie später wieder vorbei, um neue Artikel zu erhalten. Sie können es kaum erwarten? Wählen Sie ein beliebtes Thema, um weitere interessante Artikel aus dem Internet zu durchstöbern.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Alle Artikel gelesen
newtab-discovery-empty-section-topstories-content = Kommen Sie später wieder, um neue Artikel angezeigt zu bekommen.
newtab-discovery-empty-section-topstories-try-again-button = Erneut versuchen
newtab-discovery-empty-section-topstories-loading = Wird geladen…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Leider ist ein Fehler beim Laden des Abschnitts aufgetreten.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Beliebte Themen:
newtab-pocket-new-topics-title = Sie wollen noch mehr Artikel? Sehen Sie sich diese beliebten Themen von { -pocket-brand-name } an
newtab-pocket-more-recommendations = Mehr Empfehlungen
newtab-pocket-learn-more = Weitere Informationen
newtab-pocket-cta-button = { -pocket-brand-name } holen
newtab-pocket-cta-text = Speichern Sie Ihre Lieblingstexte in { -pocket-brand-name } und gewinnen Sie gedankenreiche Einblicke durch faszinierende Texte.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } ist Teil der { -brand-product-name }-Familie
newtab-pocket-save = Speichern
newtab-pocket-saved = Gespeichert

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Mehr solcher Artikel
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Nichts für mich
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Vielen Dank. Ihr Feedback hilft uns, Ihren Feed zu verbessern.
newtab-toast-dismiss-button =
    .title = Schließen
    .aria-label = Schließen

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Entdecken Sie das Beste des Internets
newtab-pocket-onboarding-cta = { -pocket-brand-name } durchsucht eine Vielzahl von Veröffentlichungen, um die informativsten, inspirierendsten und vertrauenswürdigsten Inhalte direkt in Ihren { -brand-product-name }-Browser zu bringen.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Beim Laden dieses Inhalts ist ein Fehler aufgetreten.
newtab-error-fallback-refresh-link = Aktualisieren Sie die Seite, um es erneut zu versuchen.

## Customization Menu

newtab-custom-shortcuts-title = Verknüpfungen
newtab-custom-shortcuts-subtitle = Websites, die Sie speichern oder besuchen
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Verknüpfungen
    .description = Websites, die Sie speichern oder besuchen
newtab-custom-shortcuts-nova =
    .label = Verknüpfungen
newtab-custom-row-description =
    .description = Anzahl der Zeilen
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } Zeile
           *[other] { $num } Zeilen
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } Zeile
       *[other] { $num } Zeilen
    }
newtab-custom-sponsored-sites = Gesponserte Verknüpfungen
newtab-custom-pocket-title = Empfohlen von { -pocket-brand-name }
newtab-custom-pocket-subtitle = Besondere Inhalte ausgewählt von { -pocket-brand-name }, Teil der { -brand-product-name }-Familie
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Empfohlene Artikel
    .description = Besondere Inhalte ausgewählt von der { -brand-product-name }-Familie
newtab-recommended-stories-toggle =
    .label = Empfohlene Artikel
newtab-custom-stories-personalized-toggle =
    .label = Artikel
newtab-custom-stories-personalized-checkbox-label = Artikel, die Ihnen gefallen könnten
newtab-custom-pocket-sponsored = Gesponserte Artikel
newtab-custom-pocket-show-recent-saves = Zuletzt hinzugefügte Einträge anzeigen
newtab-custom-recent-title = Neueste Aktivität
newtab-custom-recent-subtitle = Eine Auswahl kürzlich besuchter Websites und Inhalte
newtab-custom-weather-toggle =
    .label = Wetter
    .description = Heutige Vorhersage auf einen Blick
newtab-custom-widget-weather-toggle =
    .label = Wetter
newtab-custom-widget-lists-toggle =
    .label = Listen
newtab-custom-widget-timer-toggle =
    .label = Timer
newtab-custom-widget-sports-toggle =
    .label = Weltmeisterschaft
newtab-custom-widget-clock-toggle =
    .label = Uhr
newtab-custom-widget-sports-toggle2 =
    .label = Sport
newtab-custom-widget-section-title = Widgets
newtab-custom-widget-section-toggle =
    .label = Widgets
newtab-widget-manage-title = Widgets
newtab-widget-manage-widget-button =
    .label = Widgets verwalten
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Schließen
    .aria-label = Menü schließen
newtab-custom-close-button = Schließen
newtab-custom-settings = Weitere Einstellungen verwalten

## New Tab Wallpapers

newtab-wallpaper-title = Hintergrundbilder
newtab-wallpaper-reset = Standard wiederherstellen
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Grafik hochladen
newtab-wallpaper-add-an-image = Ein Bild hinzufügen
newtab-wallpaper-custom-color = Farbe auswählen
newtab-wallpaper-toggle-title =
    .label = Hintergrundbilder
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Die Grafik hat die Größenbegrenzung von { $file_size } MB überschritten. Bitte versuchen Sie, eine kleinere Datei hochzuladen.
newtab-wallpaper-error-upload-file-type = Wir konnten Ihre Datei nicht hochladen. Bitte versuchen Sie es erneut mit einer Grafikdatei.
newtab-wallpaper-error-file-type = Wir konnten Ihre Datei nicht hochladen. Bitte versuchen Sie es erneut mit einem anderen Dateityp.
newtab-wallpaper-light-red-panda = Roter Panda
newtab-wallpaper-light-mountain = Weißer Berg
newtab-wallpaper-light-sky = Himmel mit violetten und rosafarbenen Wolken
newtab-wallpaper-light-color = Blaue, rosa und gelbe Formen
newtab-wallpaper-light-landscape = Berglandschaft mit blauem Nebel
newtab-wallpaper-light-beach = Strand mit Palme
newtab-wallpaper-dark-aurora = Aurora Borealis
newtab-wallpaper-dark-color = Rote und blaue Formen
newtab-wallpaper-dark-panda = Roter Panda im Wald versteckt
newtab-wallpaper-dark-sky = Stadtlandschaft mit Nachthimmel
newtab-wallpaper-dark-mountain = Berg in der Landschaft
newtab-wallpaper-dark-city = Violette Stadtlandschaft
newtab-wallpaper-dark-fox-anniversary = Ein Fuchs auf einer Straße in der Nähe eines Waldes
newtab-wallpaper-light-fox-anniversary = Ein Fuchs auf einer Weide vor einer nebligen Berglandschaft

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Einfarbig
newtab-wallpaper-colors = Farben
newtab-wallpaper-blue = Blau
newtab-wallpaper-light-blue = Hellblau
newtab-wallpaper-light-purple = Helllila
newtab-wallpaper-light-green = Hellgrün
newtab-wallpaper-green = Grün
newtab-wallpaper-beige = Beige
newtab-wallpaper-yellow = Gelb
newtab-wallpaper-orange = Orange
newtab-wallpaper-pink = Rosa
newtab-wallpaper-light-pink = Hellrosa
newtab-wallpaper-red = Rot
newtab-wallpaper-dark-blue = Dunkelblau
newtab-wallpaper-dark-purple = Dunkellila
newtab-wallpaper-dark-green = Dunkelgrün
newtab-wallpaper-brown = Braun

## Abstract

newtab-wallpaper-category-title-abstract = Abstrakt
newtab-wallpaper-abstract-green = Grüne Formen
newtab-wallpaper-abstract-blue = Blaue Formen
newtab-wallpaper-abstract-purple = Lila Formen
newtab-wallpaper-abstract-orange = Orangefarbene Formen
newtab-wallpaper-gradient-orange = Farbverlauf orange und rosa
newtab-wallpaper-abstract-blue-purple = Blaue und lila Formen
newtab-wallpaper-abstract-white-curves = Weiß mit schattierten Rundungen
newtab-wallpaper-abstract-purple-green = Lilafarbener und grüner Lichtverlauf
newtab-wallpaper-abstract-blue-purple-waves = Blaue und lila gewellte Formen
newtab-wallpaper-abstract-black-waves = Schwarze gewellte Formen

## Firefox

newtab-wallpaper-category-title-photographs = Fotos
newtab-wallpaper-beach-at-sunrise = Strand bei Sonnenaufgang
newtab-wallpaper-beach-at-sunset = Strand bei Sonnenuntergang
newtab-wallpaper-storm-sky = Gewitterhimmel
newtab-wallpaper-sky-with-pink-clouds = Himmel mit rosafarbenen Wolken
newtab-wallpaper-red-panda-yawns-in-a-tree = Roter Panda gähnt auf einem Baum
newtab-wallpaper-white-mountains = Weiße Berge
newtab-wallpaper-hot-air-balloons = Heißluftballons in verschiedenen Farben bei Tag
newtab-wallpaper-starry-canyon = Blaue sternenklare Nacht
newtab-wallpaper-suspension-bridge = Graue Fotografie einer Hängebrücke bei Tag
newtab-wallpaper-sand-dunes = Weiße Sanddünen
newtab-wallpaper-palm-trees = Silhouette von Kokospalmen zur Goldenen Stunde
newtab-wallpaper-blue-flowers = Detailaufnahmen von blühenden blauen Blumen
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Foto von <a data-l10n-name="name-link">{ $author_string }</a> auf <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Wie wäre es mit einem Farbtupfer?
newtab-wallpaper-feature-highlight-content = Geben Sie Ihrer Firefox-Startseite einen frischen Anstrich mit Hintergrundbildern.
newtab-wallpaper-feature-highlight-button = Verstanden
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Verwerfen
    .aria-label = Pop-up schließen
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Astronomie
newtab-wallpaper-celestial-lunar-eclipse = Mondfinsternis
newtab-wallpaper-celestial-earth-night = Nachtfoto aus der niedrigen Erdumlaufbahn
newtab-wallpaper-celestial-starry-sky = Sternenhimmel
newtab-wallpaper-celestial-eclipse-time-lapse = Zeitraffer zur Mondfinsternis
newtab-wallpaper-celestial-black-hole = Illustration von Galaxie mit schwarzem Loch
newtab-wallpaper-celestial-river = Satellitenbild eines Flusses

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Vorhersage in { $provider } ansehen
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Gesponsert
newtab-weather-menu-change-location = Standort ändern
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Standort suchen
    .aria-label = Standort suchen
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Aktuellen Standort verwenden
newtab-weather-menu-weather-display = Wetteranzeige
newtab-weather-todays-forecast = Die heutige Wettervorhersage
newtab-weather-see-full-forecast = Vollständige Prognose ansehen
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Einfach
newtab-weather-menu-change-weather-display-simple = Zur einfachen Ansicht wechseln
newtab-weather-menu-weather-display-option-detailed = Ausführlich
newtab-weather-menu-change-weather-display-detailed = Zur ausführlichen Ansicht wechseln
newtab-weather-menu-temperature-units = Temperatureinheiten
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Zu Fahrenheit wechseln
newtab-weather-menu-change-temperature-units-celsius = Zu Celsius wechseln
newtab-weather-menu-hide-weather = Wetter auf der Firefox-Startseite ausblenden
newtab-weather-menu-learn-more = Weitere Informationen
newtab-weather-menu-detect-my-location = Meinen Standort erkennen
# This message is shown if user is working offline
newtab-weather-error-not-available = Wetterdaten sind derzeit nicht verfügbar.
newtab-weather-opt-in-see-weather = Möchten Sie das Wetter für Ihren Standort sehen?
newtab-weather-opt-in-not-now =
    .label = Nicht jetzt
newtab-weather-opt-in-yes =
    .label = Ja
newtab-weather-opt-in-headline = Holen Sie sich Ihre lokale Wettervorhersage
newtab-weather-opt-in-use-location =
    .label = Standort verwenden
newtab-weather-opt-in-choose-location = Standort auswählen
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York City
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Höchste
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Niedrigste
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Vorhersage in { $provider } ansehen
    .aria-description = { $provider } ∙ Gesponsert

## Topic Labels

newtab-topic-label-business = Wirtschaft
newtab-topic-label-career = Karriere
newtab-topic-label-education = Bildung
newtab-topic-label-arts = Unterhaltung
newtab-topic-label-food = Essen
newtab-topic-label-health = Gesundheit
newtab-topic-label-hobbies = Gaming
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Finanzen
newtab-topic-label-society-parenting = Erziehung
newtab-topic-label-government = Politik
newtab-topic-label-education-science = Wissenschaft
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Life-Hacks
newtab-topic-label-sports = Sport
newtab-topic-label-tech = Technik
newtab-topic-label-travel = Reisen
newtab-topic-label-home = Haus und Garten

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Wählen Sie Themen aus, um Ihren Feed zu optimieren
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Wählen Sie zwei oder mehr Themen aus. Unsere erfahrenen Kuratoren priorisieren Artikel, die auf Ihre Interessen zugeschnitten sind. Passen Sie die Themen jederzeit an.
newtab-topic-selection-save-button = Speichern
newtab-topic-selection-cancel-button = Abbrechen
newtab-topic-selection-button-maybe-later = Vielleicht später
newtab-topic-selection-privacy-link = Erfahren Sie, wie wir Daten schützen und verwalten
newtab-topic-selection-button-update-interests = Aktualisieren Sie Ihre Interessen
newtab-topic-selection-button-pick-interests = Wählen Sie Ihre Interessen aus

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Folgen
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = { $topic } folgen
newtab-section-following-button = Folgen
newtab-section-unfollow-button = Nicht mehr folgen
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Folgen: { $topic } nicht mehr folgen
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Passen Sie Ihren Feed an
newtab-section-follow-highlight-subtitle = Folgen Sie Ihren Interessen, um mehr von dem zu sehen, was Ihnen gefällt.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Blockieren
newtab-section-blocked-button = Blockiert
newtab-section-unblock-button = Nicht mehr blockieren
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = { $topic } folgen
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = { $topic } nicht mehr folgen
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = { $topic } blockieren
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = { $topic } nicht mehr blockieren

## Confirmation modal for blocking a section

newtab-section-cancel-button = Nicht jetzt
newtab-section-confirm-block-topic-p1 = Soll dieses Thema wirklich blockiert werden?
newtab-section-confirm-block-topic-p2 = Blockierte Themen erscheinen nicht mehr in Ihrem Feed.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = { $topic } blockieren
newtab-section-block-cancel-button = Abbrechen

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Themen
newtab-section-manage-topics-button-v2 =
    .label = Themen verwalten
newtab-section-mangage-topics-followed-topics = Gefolgt
newtab-section-mangage-topics-followed-topics-empty-state = Sie folgen noch keinen Themen.
newtab-section-mangage-topics-blocked-topics = Blockiert
newtab-section-mangage-topics-blocked-topics-empty-state = Sie haben noch keine Themen blockiert.
newtab-custom-wallpaper-title = Hier gibt es benutzerdefinierte Hintergrundbilder
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Laden Sie Ihr eigenes Hintergrundbild hoch oder wählen Sie eine benutzerdefinierte Farbe, um { -brand-product-name } für Sie anzupassen.
newtab-custom-wallpaper-cta = Ausprobieren

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Wählen Sie ein Hintergrundbild, um { -brand-product-name } zu personalisieren
newtab-new-user-custom-wallpaper-subtitle = Fühlen Sie sich auf Ihrer Firefox-Startseite wie zu Hause — mit benutzerdefinierten Hintergrundbildern und Farben.
newtab-new-user-custom-wallpaper-cta = Jetzt ausprobieren

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Neue Hintergrundbilder sind da
newtab-wallpaper-feature-highlight-subtitle = Wählen Sie Ihren Favoriten und gestalten Sie jeden neuen Tab wie Sie möchten.
newtab-wallpaper-feature-highlight-cta = Hintergrundbild auswählen

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = { -brand-product-name } für Mobilgeräte herunterladen
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Scannen Sie den Code, um sicher unterwegs zu surfen.
newtab-download-mobile-highlight-body-variant-b = Machen Sie da weiter, wo Sie aufgehört haben, wenn Sie Ihre Tabs, Passwörter und mehr synchronisieren.
newtab-download-mobile-highlight-body-variant-c = Wussten Sie, dass Sie { -brand-product-name } auch unterwegs verwenden können? Gleicher Browser. In der Hosentasche.
newtab-download-mobile-highlight-image =
    .aria-label = QR-Code zum Herunterladen von { -brand-product-name } für Mobilgeräte

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Ihre Favoriten in Griffweite
newtab-shortcuts-highlight-subtitle = Fügen Sie eine Verknüpfung hinzu, damit Ihre Lieblings-Websites mit einem Klick erreichbar sind.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Warum melden Sie das?
newtab-report-ads-reason-not-interested =
    .label = Ich habe kein Interesse
newtab-report-ads-reason-inappropriate =
    .label = Es ist unangebracht
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Ich habe es zu oft gesehen
newtab-report-content-wrong-category =
    .label = Falsche Kategorie
newtab-report-content-outdated =
    .label = Veraltet
newtab-report-content-inappropriate-offensive =
    .label = Unangemessen oder anstößig
newtab-report-content-spam-misleading =
    .label = Spam oder irreführend
newtab-report-content-requires-payment-subscription =
    .label = Zahlung oder Abonnement erforderlich
newtab-report-content-requires-payment-subscription-learn-more = Weitere Informationen
newtab-report-cancel = Abbrechen
newtab-report-submit = Absenden
newtab-toast-thanks-for-reporting =
    .message = Danke für die Meldung.
newtab-toast-widgets-hidden =
    .message = Wählen Sie das Stiftsymbol, um jederzeit wieder Widgets hinzuzufügen.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Sie folgen jetzt { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Sie folgen { $topic } nicht mehr.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Sie sehen nun keine Artikel mehr über { $topic }.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Die Möglichkeiten sind unendlich. Fügen Sie eine hinzu.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Neu
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Abgeschlossen ({ $number })
newtab-widget-lists-celebration-headline = Gute Arbeit
newtab-widget-lists-celebration-subhead = Alles erledigt
newtab-widget-task-list-menu-copy = Kopieren
newtab-widget-lists-menu-edit = Listenname bearbeiten
newtab-widget-lists-menu-edit2 =
    .aria-label = Listenname bearbeiten
newtab-widget-lists-menu-create = Neue Liste erstellen
newtab-widget-lists-menu-delete = Diese Liste löschen
newtab-widget-lists-menu-copy = Liste in Zwischenablage kopieren
newtab-widget-lists-menu-learn-more = Weitere Informationen
newtab-widget-lists-button-add-item = Einen Eintrag hinzufügen
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Einen Eintrag hinzufügen
    .aria-label = Einen Eintrag hinzufügen
newtab-widget-lists-input-error = Bitte fügen Sie Text hinzu, um einen Eintrag hinzuzufügen.
newtab-widget-lists-input-menu-open-link = Link öffnen
newtab-widget-lists-input-menu-move-up = Nach oben
newtab-widget-lists-input-menu-move-down = Nach unten
newtab-widget-lists-input-menu-delete = Löschen
newtab-widget-lists-input-menu-edit = Bearbeiten
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Eintrag bearbeiten
newtab-widget-lists-edit-clear =
    .aria-label = Abbrechen
    .title = Abbrechen
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Eine neue Liste erstellen
newtab-widget-lists-name-label-default =
    .label = Aufgabenliste
newtab-widget-lists-name-label-checklist =
    .label = Checkliste
newtab-widget-lists-name-placeholder-default =
    .placeholder = Aufgabenliste
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Checkliste
    .aria-label = Listenname bearbeiten
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Neue Liste
    .aria-label = Listenname bearbeiten
newtab-widget-section-title = Widgets
newtab-widget-menu-hide = Widget ausblenden
newtab-widget-menu-change-size = Größe ändern
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Verschieben
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Links
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Rechts
newtab-widget-size-small = Klein
newtab-widget-size-medium = Mittel
newtab-widget-size-large = Groß
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Widgets ausblenden
    .aria-label = alle Widgets ausblenden
newtab-widget-section-maximize =
    .title = Widgets ausklappen
    .aria-label = alle Widgets zur vollen Größe ausklappen
newtab-widget-section-minimize =
    .title = Widgets minimieren
    .aria-label = Alle Widgets auf kompakte Größe reduzieren
newtab-widget-section-menu-button =
    .title = Widgets-Menü
    .aria-label = Widgets-Menü öffnen
newtab-widget-add-widgets-button =
    .aria-label = Widget hinzufügen
    .title = Widget hinzufügen
newtab-widget-section-menu-manage = Widgets verwalten
newtab-widget-section-menu-hide-all = Widgets ausblenden
newtab-widget-section-menu-learn-more = Weitere Informationen
newtab-widget-section-feedback = Sagen Sie uns Ihre Meinung
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Weitere Widgets anzeigen
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Weniger Widgets anzeigen
newtab-widget-lists-name-default = Checkliste

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Timer
newtab-widget-timer-notification-focus = Die Fokuszeit ist abgelaufen. Gute Arbeit. Benötigen Sie eine Pause?
newtab-widget-timer-notification-break = Ihre Pause ist zu Ende. Bereit zum Fokussieren?
newtab-widget-timer-notification-warning = Benachrichtigungen sind deaktiviert
newtab-widget-timer-mode-focus =
    .label = Fokussieren
newtab-widget-timer-mode-break =
    .label = Pause
newtab-widget-timer-label-play =
    .label = Starten
newtab-widget-timer-label-pause =
    .label = Pausieren
newtab-widget-timer-reset =
    .title = Zurücksetzen
newtab-widget-timer-menu-notifications = Benachrichtigungen deaktivieren
newtab-widget-timer-menu-notifications-on = Benachrichtigungen aktivieren
newtab-widget-timer-menu-learn-more = Weitere Informationen
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Wichtigste Schlagzeilen
newtab-daily-briefing-card-menu-dismiss = Schließen
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp =
    { $minutes ->
        [one] Aktualisiert vor { $minutes } Minute
       *[other] Aktualisiert vor { $minutes } Minuten
    }
newtab-widget-message-title = Bleiben Sie konzentriert mit Listen und einem integrierten Timer
# to-dos stands for "things to do".
newtab-widget-message-copy = Von kurzen Erinnerungen über tägliche Aufgaben bis hin zu Fokussitzungen und Dehnungspausen – bleiben Sie bei der Sache und im Zeitplan.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Fokus, Wettervorhersage und mehr an einer Stelle
newtab-widget-message-focus-forecasts-body = Gestalten Sie Ihren Tag mit { -brand-product-name }-Widgets. Sehen Sie sich die Wettervorhersage an, bleiben Sie bei einer Aufgabe oder verfolgen Sie die Zeit auf der ganzen Welt.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Passen Sie { -brand-product-name } an Ihre Wünsche an
newtab-promo-card-body-addons = Wählen Sie ein Hintergrundbild aus unserer Sammlung, oder erstellen Sie Ihr eigenes.
newtab-promo-card-cta-addons = Jetzt ausprobieren
newtab-promo-card-title = { -brand-product-name } unterstützen
newtab-promo-card-body = Unsere Sponsoren unterstützen unsere Mission, ein besseres Internet zu schaffen
newtab-promo-card-cta = Weitere Informationen
newtab-promo-card-dismiss-button =
    .title = Verwerfen
    .aria-label = Verwerfen

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] { $minutes }-Minute-Timer starten
           *[other] { $minutes }-Minuten-Timer starten
        }
newtab-widget-timer-pause-aria =
    .aria-label = Timer pausieren
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } Minute
           *[other] { $minutes } Minuten
        }
newtab-widget-timer-decrease-min =
    .title = 1 Minute verringern
newtab-widget-timer-increase-min =
    .title = 1 Minute verlängern
newtab-widget-timer-mode-group =
    .aria-label = Timer-Modus
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Fokus
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Pause
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Timer ausblenden
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Gute Arbeit
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Ihre Pause ist vorbei
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Benötigen Sie eine Pause?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Bereit, sich zu konzentrieren?

##

newtab-sports-widget-menu-follow-teams = Teams folgen
newtab-sports-widget-menu-view-schedule = Spielplan ansehen
newtab-sports-widget-menu-view-upcoming = Kommende anzeigen
newtab-sports-widget-menu-view-results = Ergebnisse anzeigen
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Wichtige Daten
newtab-sports-widget-menu-learn-more = Weitere Informationen
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Behalten Sie die WM im Auge
newtab-sports-widget-get-updates = Erhalten Sie Live-Updates zu Spielen und mehr.
newtab-sports-widget-view-schedule =
    .label = Spielplan ansehen
newtab-sports-widget-follow-teams =
    .label = Teams folgen
newtab-sports-widget-view-matches =
    .label = Spiele anzeigen
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Meldungen von { $number } Team
       *[other] Meldungen von { $number } Teams
    }
newtab-sports-widget-choose-wallpaper =
    .label = Wählen Sie ein Hintergrundbild
newtab-sports-widget-skip = Überspringen
newtab-sports-widget-search-country =
    .placeholder = Land suchen
    .aria-label = Land suchen
newtab-sports-widget-cancel = Abbrechen
newtab-sports-widget-back-button =
    .aria-label = Zurück
newtab-sports-widget-done-button =
    .label = Fertig
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (ausgeschieden)
newtab-sports-widget-view-all =
    .label = Alle anzeigen
newtab-sports-widget-show-less =
    .label = Weniger anzeigen
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Nur Teams, denen gefolgt wird
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Ansehen
    .title = Live ansehen
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Live ansehen
    .title = Live ansehen
newtab-sports-widget-watch-dialog-close =
    .aria-label = Schließen
    .title = Schließen
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Kostenlos
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Kostenlose Testversion
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Gratis und kostenpflichtig
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Kostenpflichtig
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Nur ausgewählte Spiele
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = In Ihrer Region verfügbar
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Andere Regionen
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Stream öffnen
    .title = Stream öffnen
newtab-sports-widget-group-stage = Gruppenphase
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
newtab-sports-widget-round-32 = Runde der letzten 32
newtab-sports-widget-round-16 = Runde der letzten 16
newtab-sports-widget-quarter-finals = Viertelfinale
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = LIVE
newtab-custom-widget-live-refresh =
    .title = Spielstände aktualisieren
    .aria-label = Spielstände aktualisieren
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Wichtige Daten
newtab-sports-widget-upcoming = In Kürze
# Used for a match currently ongoing
newtab-sports-widget-now = Jetzt
newtab-sports-widget-results = Ergebnisse
newtab-sports-widget-semi-finals = Halbfinale
newtab-sports-widget-bronze-finals = Spiel um Platz 3
# Final is the final match for 1st place.
newtab-sports-widget-final = Finale
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, day: "numeric", month: "short") } – { DATETIME($end, day: "numeric", month: "short") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, day: "numeric", month: "short") }
newtab-sports-widget-delayed = Verzögert
newtab-sports-widget-postponed = Verschoben
newtab-sports-widget-suspended = Gesperrt
newtab-sports-widget-cancelled = Abgebrochen
newtab-sports-widget-information = Informationen über das Spiel
newtab-sports-widget-no-live-data = Live-Daten zum Spiel werden derzeit nicht aktualisiert
newtab-sports-widget-view-results-link = Ergebnisse anzeigen
newtab-sports-widget-third-place = Dritter Platz
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Zweiter
newtab-sports-widget-champions = Meister
newtab-sports-widget-world-cup-champions = Weltmeister 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Spielende
newtab-sports-widget-match-halftime = Halbzeit
newtab-sports-widget-match-extra-time = Verlängerung
newtab-sports-widget-match-penalties = Elfmeterschließen
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = :
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Bleiben Sie dran für die kommenden Spieldetails

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Vorherige
    .title = Vorherige
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Nächste
    .title = Nächste
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Live-Spiel { $index } von { $total }
    .title = Live-Spiel { $index } von { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } gegen { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) gegen { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Live: { $homeTeam }, { $homeScore } gegen { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } gegen { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } gegen { $awayTeam }, verzögert
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } gegen { $awayTeam }, verschoben
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } gegen { $awayTeam }, unterbrochen
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } gegen { $awayTeam }, abgesagt

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosnien und Herzegowina
newtab-sports-widget-team-name-label-civ =
    .label = Elfenbeinküste
newtab-sports-widget-team-name-label-cod =
    .label = DR Kongo
newtab-sports-widget-team-name-label-eng =
    .label = England
newtab-sports-widget-team-name-label-sco =
    .label = Schottland
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Wird noch festgelegt

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Beginnen Sie die Weltmeisterschaft mit neuen Hintergrundbildern
newtab-sports-widget-message-wallpapers-body = Bringen Sie ein bisschen Spieltagsstimmung in Ihren Browser – für das Turnier.
newtab-sports-widget-message-wallpapers-cta = Hintergrundbild auswählen
newtab-sports-widget-message-add-widgets-cta =
    .label = Widgets hinzufügen
newtab-sports-widget-message-day-in-play-title = Behalten Sie den Überblick über Ihren Tag mit { -brand-product-name }-Widgets
newtab-sports-widget-message-day-in-play-body = Verfolgen Sie die Weltmeisterschaft, bleiben Sie bei der Aufgabe, verfolgen Sie die Zeit auf der ganzen Welt und mehr.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Widgets entdecken

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Verwerfen
    .aria-label = Verwerfen
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Passen Sie diesen Raum an
newtab-activation-window-message-customization-focus-message = Wählen Sie ein neues Hintergrundbild, fügen Sie Verknüpfungen zu Ihren Lieblingsseiten hinzu und bleiben Sie auf dem neuesten Stand. mit Artikeln, die Sie interessieren.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Beginnen Sie mit den Anpassungen
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Dieser Platz spielt nach Ihren Regeln
newtab-activation-window-message-values-focus-message = Mit { -brand-product-name } können Sie so surfen, wie Sie es möchten. Mit einer persönlicheren Möglichkeit, Ihren Tag online zu starten. Passen Sie { -brand-product-name } an Ihre Wünsche an.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Uhr ausblenden
newtab-clock-widget-menu-learn-more = Weitere Informationen
newtab-clock-widget-menu-edit = Uhren bearbeiten
newtab-clock-widget-menu-switch-to-12h = Zum 12- Stunden-Format wechseln
newtab-clock-widget-menu-switch-to-24h = Zum 24 Stunden-Format wechseln
newtab-clock-widget-label-your-clocks = Ihre Uhren
newtab-clock-widget-search-location-input =
    .label = Standort
    .placeholder = Ort suchen
    .aria-label = Ort suchen
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Name (optional)
    .placeholder = Geben Sie einen Namen ein
    .aria-label = Name (optional)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Neue Uhr hinzufügen
    .aria-label = Neue Uhr hinzufügen
newtab-clock-widget-button-add-clock = Hinzufügen
newtab-clock-widget-button-cancel = Abbrechen
newtab-clock-widget-button-back =
    .title = Zurück
    .aria-label = Zurück
newtab-clock-widget-button-edit-clock =
    .title = Uhr bearbeiten
    .aria-label = Uhr bearbeiten
newtab-clock-widget-button-save = Speichern
newtab-clock-widget-button-remove-clock =
    .title = Uhr entfernen
    .aria-label = Uhr entfernen
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
    .aria-label = { $city }, Name: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Uhr hinzufügen
newtab-clock-widget-edit-clock-form =
    .aria-label = Uhr bearbeiten
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Suchergebnisse
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Keine Übereinstimmungen
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Menü für Uhr öffnen
    .aria-label = Menü für Uhr öffnen
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Name: { $nickname }
