# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Neuer Tab
newtab-settings-button =
    .title = Einstellungen für neue Tabs anpassen
newtab-customize-panel-icon-button =
    .title = Diese Seite anpassen
newtab-customize-panel-icon-button-label = Anpassen
newtab-personalize-settings-icon-label =
    .title = Neuen Tab anpassen
    .aria-label = Einstellungen
newtab-settings-dialog-label =
    .aria-label = Einstellungen
newtab-personalize-icon-label =
    .title = Neuen Tab anpassen
    .aria-label = Neuen Tab anpassen
newtab-personalize-dialog-label =
    .aria-label = Anpassen
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Verwerfen
    .aria-label = Verwerfen

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

## Top Sites - General form dialog.

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
newtab-section-header-stories = Geschichten, die zum Nachdenken anregen
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Unsere heutigen Tipps für Sie

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Surfen Sie los und wir zeigen Ihnen hier einige der interessanten Artikel, Videos und anderen Seiten, die Sie kürzlich besucht oder als Lesezeichen gespeichert haben.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Jetzt kennen Sie die Neuigkeiten. Schauen Sie später wieder vorbei, um neue Informationen von { $provider } zu erhalten. Können Sie nicht warten? Wählen Sie ein beliebtes Thema und lesen Sie weitere interessante Geschichten aus dem Internet.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Jetzt kennen Sie die Neuigkeiten. Schauen Sie später wieder vorbei, um neue Artikel zu erhalten. Können Sie nicht warten? Wählen Sie ein beliebtes Thema und lesen Sie weitere interessante Geschichten aus dem Internet.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Alle Artikel gelesen
newtab-discovery-empty-section-topstories-content = Öffnen Sie diese Seite später ein weiteres Mal, um neue Artikel angezeigt zu bekommen.
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
newtab-custom-shortcuts-toggle =
    .label = Verknüpfungen
    .description = Websites, die Sie speichern oder besuchen
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
newtab-custom-stories-toggle =
    .label = Empfohlene Geschichten
    .description = Besondere Inhalte ausgewählt von der { -brand-product-name }-Familie
newtab-custom-stories-personalized-toggle =
    .label = Geschichten
newtab-custom-stories-personalized-checkbox-label = Personalisierte Geschichten basierend auf Ihrer Aktivität
newtab-custom-pocket-sponsored = Gesponserte Inhalte
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
newtab-wallpaper-upload-image = Grafik hochladen
newtab-wallpaper-custom-color = Farbe auswählen
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

newtab-wallpaper-category-title-colors = Einfarbig
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
newtab-wallpaper-feature-highlight-content = Geben Sie Ihrem neuen Tab einen frischen Anstrich mit Hintergrundbildern.
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
newtab-weather-menu-hide-weather-v2 = Wetter ausblenden
newtab-weather-menu-hide-weather = Wetter bei neuem Tab ausblenden
newtab-weather-menu-learn-more = Weitere Informationen
newtab-weather-menu-detect-my-location = Meinen Standort erkennen
# This message is shown if user is working offline
newtab-weather-error-not-available = Wetterdaten sind derzeit nicht verfügbar.
newtab-weather-opt-in-see-weather = Möchten Sie das Wetter für Ihren Standort sehen?
newtab-weather-opt-in-not-now =
    .label = Nicht jetzt
newtab-weather-opt-in-yes =
    .label = Ja
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York City
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
newtab-topic-selection-subtitle = Wählen Sie zwei oder mehr Themen aus. Unsere erfahrenen Kuratoren priorisieren Geschichten, die auf Ihre Interessen zugeschnitten sind. Passen Sie die Themen jederzeit an.
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
newtab-section-following-button = Folgen
newtab-section-unfollow-button = Nicht mehr folgen
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Passen Sie Ihren Feed an
newtab-section-follow-highlight-subtitle = Folgen Sie Ihren Interessen, um mehr von dem zu sehen, was Ihnen gefällt.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Blockieren
newtab-section-blocked-button = Blockiert
newtab-section-unblock-button = Nicht mehr blockieren

## Confirmation modal for blocking a section

newtab-section-cancel-button = Nicht jetzt
newtab-section-confirm-block-topic-p1 = Soll dieses Thema wirklich blockiert werden?
newtab-section-confirm-block-topic-p2 = Blockierte Themen erscheinen nicht mehr in Ihrem Feed.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = { $topic } blockieren

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
newtab-new-user-custom-wallpaper-subtitle = Fühlen Sie sich in jedem Tab wie zu Hause — mit benutzerdefinierten Hintergrundbildern und Farben.
newtab-new-user-custom-wallpaper-cta = Jetzt ausprobieren

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
newtab-widget-task-list-menu-copy = Kopieren
newtab-widget-lists-menu-edit = Listenname bearbeiten
newtab-widget-lists-menu-create = Neue Liste erstellen
newtab-widget-lists-menu-delete = Diese Liste löschen
newtab-widget-lists-menu-copy = Liste in Zwischenablage kopieren
newtab-widget-lists-menu-hide = Alle Listen ausblenden
newtab-widget-lists-menu-learn-more = Weitere Informationen
newtab-widget-lists-input-add-an-item =
    .placeholder = Einen Eintrag hinzufügen
newtab-widget-lists-input-error = Bitte fügen Sie Text hinzu, um einen Eintrag hinzuzufügen.
newtab-widget-lists-input-menu-open-link = Link öffnen
newtab-widget-lists-input-menu-move-up = Nach oben
newtab-widget-lists-input-menu-move-down = Nach unten
newtab-widget-lists-input-menu-delete = Löschen
newtab-widget-lists-input-menu-edit = Bearbeiten
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Eine neue Liste erstellen
newtab-widget-lists-name-label-default =
    .label = Aufgabenliste
newtab-widget-lists-name-placeholder-default =
    .placeholder = Aufgabenliste
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new =
    .placeholder = Neue Liste
newtab-widget-section-title = Widgets
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

## Strings for timer productivity widget
## When the timer ends, a system notification may be shown. Depending on which mode the timer is in, that message would be shown

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
newtab-widget-timer-menu-hide = Timer ausblenden
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
newtab-promo-card-title = { -brand-product-name } unterstützen
newtab-promo-card-body = Unsere Sponsoren unterstützen unsere Mission, ein besseres Internet zu schaffen
newtab-promo-card-cta = Weitere Informationen
newtab-promo-card-dismiss-button =
    .title = Verwerfen
    .aria-label = Verwerfen

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
newtab-activation-window-message-customization-focus-message = Wählen Sie ein neues Hintergrundbild, fügen Sie Verknüpfungen zu Ihren Lieblingsseiten hinzu und bleiben Sie auf dem neuesten Stand, wenn es um Geschichten geht, die Sie interessieren.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Beginnen Sie mit den Anpassungen
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Dieser Platz spielt nach Ihren Regeln
newtab-activation-window-message-values-focus-message = Mit { -brand-product-name } können Sie so surfen, wie Sie es möchten. Mit einer persönlicheren Möglichkeit, Ihren Tag online zu starten. Passen Sie { -brand-product-name } an Ihre Wünsche an.
