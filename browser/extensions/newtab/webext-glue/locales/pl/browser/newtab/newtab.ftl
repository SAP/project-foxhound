# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Nowa karta
newtab-settings-button =
    .title = Dostosuj stronę nowej karty
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Dostosuj tę stronę
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Dostosuj
newtab-customize-panel-label =
    .label = Dostosuj
newtab-personalize-settings-icon-label =
    .title = Personalizuj nową kartę
    .aria-label = Ustawienia
newtab-settings-dialog-label =
    .aria-label = Ustawienia
newtab-personalize-icon-label =
    .title = Personalizuj nową kartę
    .aria-label = Personalizuj nową kartę
newtab-personalize-dialog-label =
    .aria-label = Personalizuj
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Zamknij
    .aria-label = Zamknij

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Strona startowa
home-homepage-new-windows =
    .label = Nowe okna:
home-homepage-new-tabs =
    .label = Nowa karta:
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Wybierz inną stronę

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Adresy stron
home-custom-homepage-address =
    .placeholder = Wpisz adres
home-custom-homepage-address-button =
    .label = Dodaj adres
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Nie dodano jeszcze żadnych stron.
home-custom-homepage-delete-address-button =
    .aria-label = Usuń adres
    .title = Usuń adres
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Zastąp przez
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = obecnie otwarte strony
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = zakładki…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Wyszukiwanie
home-prefs-stories-header2 =
    .label = Artykuły
    .description = Wyjątkowe rzeczy wybrane przez rodzinę { -brand-product-name(case: "gen") }
home-prefs-widgets-header =
    .label = Widżety
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Listy
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Minutnik
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Sport
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Zegar
home-prefs-mission-message2 =
    .message = Nasi sponsorzy wspierają naszą misję budowania lepszej sieci.
home-prefs-manage-topics-link2 =
    .label = Zarządzaj tematami
home-prefs-choose-wallpaper-link2 =
    .label = Wybierz tapetę
home-prefs-firefox-logo-header =
    .label = Logo { -brand-short-name(case: "gen") }
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Aby korzystać z tych funkcji, ustaw nowe karty lub nowe okna na { -firefox-home-brand-name(case: "acc", capitalization: "lower") }.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } wiersz
            [few] { $num } wiersze
           *[many] { $num } wierszy
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Rozszerzenie ({ $extension })
home-restore-defaults-srd =
    .label = Przywróć domyślne
    .accesskey = P
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name(case: "nom", capitalization: "lower") } (domyślnie)
home-mode-choice-custom-srd =
    .label = inne strony
home-mode-choice-blank-srd =
    .label = pusta strona
home-prefs-shortcuts-header-srd =
    .label = Skróty
home-prefs-shortcuts-select =
    .aria-label = Skróty
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Sponsorowane skróty
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Sponsorowane artykuły
home-prefs-highlights-option-visited-pages-srd =
    .label = Historia
home-prefs-highlights-options-bookmarks-srd =
    .label = Zakładki
home-prefs-highlights-option-most-recent-download-srd =
    .label = Ostatnio pobrane pliki
home-prefs-recent-activity-header-srd =
    .label = Ostatnia aktywność
home-prefs-recent-activity-select =
    .aria-label = Ostatnia aktywność
home-prefs-weather-header-srd =
    .label = Pogoda
home-prefs-support-firefox-header-srd =
    .label = Wspieraj { -brand-product-name(case: "acc") }
home-prefs-mission-message-learn-more-link-srd = Więcej informacji

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Szukaj
    .aria-label = Szukaj
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Wprowadź adres lub szukaj w { $engine }
newtab-search-box-handoff-text-no-engine = Wprowadź adres lub szukaj
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Wprowadź adres lub szukaj w { $engine }
    .title = Wprowadź adres lub szukaj w { $engine }
    .aria-label = Wprowadź adres lub szukaj w { $engine }
newtab-search-box-handoff-input-no-engine =
    .placeholder = Wprowadź adres lub szukaj
    .title = Wprowadź adres lub szukaj
    .aria-label = Wprowadź adres lub szukaj
newtab-search-box-text = Szukaj w Internecie
newtab-search-box-input =
    .placeholder = Szukaj w Internecie
    .aria-label = Szukaj w Internecie

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Dodaj wyszukiwarkę
newtab-topsites-add-shortcut-header = Nowy skrót
newtab-topsites-edit-topsites-header = Edycja strony z sekcji Popularne
newtab-topsites-edit-shortcut-header = Edycja skrótu
newtab-topsites-add-shortcut-label = Dodaj skrót
newtab-topsites-add-shortcut-title =
    .title = Dodaj skrót
    .aria-label = Dodaj skrót
newtab-topsites-title-label = Tytuł
newtab-topsites-title-input =
    .placeholder = Wpisz tytuł
newtab-topsites-url-label = Adres URL
newtab-topsites-url-input =
    .placeholder = Wpisz lub wklej adres
newtab-topsites-url-validation = Wymagany jest prawidłowy adres URL
newtab-topsites-image-url-label = Własny obraz
newtab-topsites-use-image-link = Użyj własnego obrazu…
newtab-topsites-image-validation = Wczytanie obrazu się nie powiodło. Spróbuj innego adresu.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Wyczyść tekst

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Anuluj
newtab-topsites-delete-history-button = Usuń z historii
newtab-topsites-save-button = Zachowaj
newtab-topsites-preview-button = Podgląd
newtab-topsites-add-button = Dodaj

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Czy na pewno usunąć wszystkie wizyty na tej stronie z historii?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Tej czynności nie można cofnąć.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Sponsorowane

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (przypięte)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Otwórz menu
    .aria-label = Otwórz menu
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Zamknij
    .aria-label = Zamknij
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Otwórz menu
    .aria-label = Otwórz menu kontekstowe „{ $title }”
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Edytuj stronę
    .aria-label = Edytuj stronę

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Edytuj
newtab-menu-open-new-window = Otwórz w nowym oknie
newtab-menu-open-new-private-window = Otwórz w nowym oknie prywatnym
newtab-menu-dismiss = Usuń z tej sekcji
newtab-menu-pin = Przypnij
newtab-menu-unpin = Odepnij
newtab-menu-delete-history = Usuń z historii
newtab-menu-save-to-pocket = Wyślij do { -pocket-brand-name }
newtab-menu-delete-pocket = Usuń z { -pocket-brand-name }
newtab-menu-archive-pocket = Archiwizuj w { -pocket-brand-name }
newtab-menu-show-privacy-info = Nasi sponsorzy i Twoja prywatność
newtab-menu-about-fakespot = Informacje o { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Zgłoś
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Blokuj
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Przestań obserwować
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Więcej informacji
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Przestań obserwować temat

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Zarządzaj sponsorowanymi treściami
newtab-menu-our-sponsors-and-your-privacy = Nasi sponsorzy i Twoja prywatność
newtab-menu-report-this-ad = Zgłoś tę reklamę

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = OK
newtab-privacy-modal-button-manage = Zarządzaj ustawieniami treści sponsorowanych
newtab-privacy-modal-header = Twoja prywatność jest ważna.
newtab-privacy-modal-paragraph-2 =
    Oprócz ciekawych artykułów pokazujemy Ci również spersonalizowane,
    zweryfikowane treści od wybranych sponsorów. Zachowaj pewność, że
    <strong>Twoja historia przeglądania nigdy nie opuszcza Twojej własnej kopii { -brand-product-name(case: "gen") }</strong> — my jej nie widzimy, i nasi sponsorzy też nie.
newtab-privacy-modal-link = Więcej informacji o prywatności na stronie nowej karty

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Usuń zakładkę
# Bookmark is a verb here.
newtab-menu-bookmark = Dodaj zakładkę

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Kopiuj adres, z którego pobrano plik
newtab-menu-go-to-download-page = Przejdź do strony pobierania
newtab-menu-remove-download = Usuń z historii

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Pokaż w Finderze
       *[other] Otwórz folder nadrzędny
    }
newtab-menu-open-file = Otwórz plik

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Z odwiedzonych
newtab-label-bookmarked = Z zakładek
newtab-label-removed-bookmark = Usunięto zakładkę
newtab-label-recommended = Na czasie
newtab-label-saved = Z { -pocket-brand-name }
newtab-label-download = Z pobranych
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Sponsorowane
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Sponsor: { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Sponsorowane

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Usuń sekcję
newtab-section-menu-collapse-section = Zwiń sekcję
newtab-section-menu-expand-section = Rozwiń sekcję
newtab-section-menu-manage-section = Zarządzaj sekcją
newtab-section-menu-manage-webext = Zarządzaj rozszerzeniem
newtab-section-menu-add-topsite = Dodaj stronę do popularnych
newtab-section-menu-add-search-engine = Dodaj wyszukiwarkę
newtab-section-menu-move-up = Przesuń w górę
newtab-section-menu-move-down = Przesuń w dół
newtab-section-menu-privacy-notice = Prywatność

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Zwiń sekcję
newtab-section-expand-section-label =
    .aria-label = Rozwiń sekcję

## Section Headers.

newtab-section-header-topsites = Popularne
newtab-section-header-recent-activity = Ostatnia aktywność
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Polecane przez { $provider }
newtab-section-header-stories = Artykuły skłaniające do myślenia
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Dzisiejsze artykuły dla Ciebie

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Zacznij przeglądać Internet, a pojawią się tutaj świetne artykuły, filmy oraz inne ostatnio odwiedzane strony i dodane zakładki.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = To na razie wszystko. { $provider } później będzie mieć więcej popularnych artykułów. Nie możesz się doczekać? Wybierz popularny temat, aby znaleźć więcej artykułów z całego Internetu.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = To na razie wszystko. Później będzie tu więcej artykułów. Nie możesz się doczekać? Wybierz popularny temat, aby znaleźć więcej artykułów z całego Internetu.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Jesteś na bieżąco!
newtab-discovery-empty-section-topstories-content = Wróć później po więcej artykułów.
newtab-discovery-empty-section-topstories-try-again-button = Spróbuj ponownie
newtab-discovery-empty-section-topstories-loading = Wczytywanie…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Prawie udało się wczytać tę sekcję, ale nie do końca.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Popularne tematy:
newtab-pocket-new-topics-title = Chcesz przeczytać jeszcze więcej artykułów? Zobacz, co { -pocket-brand-name } proponuje na te popularne tematy
newtab-pocket-more-recommendations = Więcej polecanych
newtab-pocket-learn-more = Więcej informacji
newtab-pocket-cta-button = Pobierz { -pocket-brand-name }
newtab-pocket-cta-text = Zachowuj artykuły w { -pocket-brand-name }, aby wrócić później do ich lektury.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } jest częścią rodziny { -brand-product-name(case: "gen") }
newtab-pocket-save = Wyślij
newtab-pocket-saved = Wysłano

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Więcej takich jak to
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Nie dla mnie
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Dziękujemy. Twoja opinia pomoże nam ulepszyć treści dla Ciebie.
newtab-toast-dismiss-button =
    .title = Zamknij
    .aria-label = Zamknij

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Odkrywaj to, co najlepsze w sieci
newtab-pocket-onboarding-cta = { -pocket-brand-name } przeszukuje różnorodne publikacje, aby dostarczać najbardziej bogate w informacje, inspirujące i wiarygodne treści prosto do Twojej przeglądarki { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Coś się nie powiodło podczas wczytywania tej treści
newtab-error-fallback-refresh-link = Odśwież stronę, by spróbować ponownie

## Customization Menu

newtab-custom-shortcuts-title = Skróty
newtab-custom-shortcuts-subtitle = Zachowane i odwiedzane strony.
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Skróty
    .description = Zachowane i odwiedzane strony.
newtab-custom-shortcuts-nova =
    .label = Skróty
newtab-custom-row-description =
    .description = Liczba wierszy
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } wiersz
            [few] { $num } wiersze
           *[many] { $num } wierszy
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } wiersz
        [few] { $num } wiersze
       *[many] { $num } wierszy
    }
newtab-custom-sponsored-sites = Sponsorowane skróty
newtab-custom-pocket-title = Polecane przez { -pocket-brand-name }
newtab-custom-pocket-subtitle = Wyjątkowe rzeczy wybrane przez { -pocket-brand-name }, część rodziny { -brand-product-name(case: "gen") }.
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Polecane artykuły
    .description = Wyjątkowe rzeczy wybrane przez rodzinę { -brand-product-name(case: "gen") }
newtab-recommended-stories-toggle =
    .label = Polecane artykuły
newtab-custom-stories-personalized-toggle =
    .label = Artykuły
newtab-custom-stories-personalized-checkbox-label = Spersonalizowane artykuły na podstawie działań użytkownika
newtab-custom-pocket-sponsored = Sponsorowane artykuły
newtab-custom-pocket-show-recent-saves = Wyświetl ostatnio zapisane
newtab-custom-recent-title = Ostatnia aktywność
newtab-custom-recent-subtitle = Wybierane z ostatnio odwiedzanych stron i treści.
newtab-custom-weather-toggle =
    .label = Pogoda
    .description = Dzisiejsza prognoza w skrócie
newtab-custom-widget-weather-toggle =
    .label = Pogoda
newtab-custom-widget-lists-toggle =
    .label = Listy
newtab-custom-widget-timer-toggle =
    .label = Minutnik
newtab-custom-widget-sports-toggle =
    .label = Mistrzostwa świata w piłce nożnej
newtab-custom-widget-clock-toggle =
    .label = Zegar
newtab-custom-widget-sports-toggle2 =
    .label = Sport
newtab-custom-widget-section-title = Widżety
newtab-custom-widget-section-toggle =
    .label = Widżety
newtab-widget-manage-title = Widżety
newtab-widget-manage-widget-button =
    .label = Zarządzaj widżetami
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Zamknij
    .aria-label = Zamknij menu
newtab-custom-close-button = Zamknij
newtab-custom-settings = Więcej ustawień

## New Tab Wallpapers

newtab-wallpaper-title = Tapety
newtab-wallpaper-reset = Przywróć domyślne
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Dodaj obraz
newtab-wallpaper-add-an-image = Dodaj obraz
newtab-wallpaper-custom-color = Wybierz kolor
newtab-wallpaper-toggle-title =
    .label = Tapety
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Obraz przekracza ograniczenie rozmiaru pliku wynoszące { $file_size } MB. Spróbuj dodać mniejszy plik.
newtab-wallpaper-error-upload-file-type = Nie udało się dodać tego pliku. Spróbuj ponownie z plikiem obrazu.
newtab-wallpaper-error-file-type = Nie udało się dodać tego pliku. Spróbuj ponownie z innym typem pliku.
newtab-wallpaper-light-red-panda = Pandka ruda
newtab-wallpaper-light-mountain = Biała góra
newtab-wallpaper-light-sky = Niebo z fioletowymi i różowymi chmurami
newtab-wallpaper-light-color = Niebieskie, różowe i żółte kształty
newtab-wallpaper-light-landscape = Górski pejzaż z niebieską mgłą
newtab-wallpaper-light-beach = Plaża z palmą
newtab-wallpaper-dark-aurora = Zorza polarna
newtab-wallpaper-dark-color = Czerwone i niebieskie kształty
newtab-wallpaper-dark-panda = Pandka ruda schowana w lesie
newtab-wallpaper-dark-sky = Miejski pejzaż z nocnym niebem
newtab-wallpaper-dark-mountain = Górski pejzaż
newtab-wallpaper-dark-city = Fioletowy miejski pejzaż
newtab-wallpaper-dark-fox-anniversary = Lis na chodniku w pobliżu lasu
newtab-wallpaper-light-fox-anniversary = Lis na łące na tle mglistych gór

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Jednolite kolory
newtab-wallpaper-colors = Kolory
newtab-wallpaper-blue = Niebieski
newtab-wallpaper-light-blue = Jasnoniebieski
newtab-wallpaper-light-purple = Jasnofioletowy
newtab-wallpaper-light-green = Jasnozielony
newtab-wallpaper-green = Zielony
newtab-wallpaper-beige = Beżowy
newtab-wallpaper-yellow = Żółty
newtab-wallpaper-orange = Pomarańczowy
newtab-wallpaper-pink = Różowy
newtab-wallpaper-light-pink = Jasnoróżowy
newtab-wallpaper-red = Czerwony
newtab-wallpaper-dark-blue = Ciemnoniebieski
newtab-wallpaper-dark-purple = Ciemnofioletowy
newtab-wallpaper-dark-green = Ciemnoniebieski
newtab-wallpaper-brown = Brązowy

## Abstract

newtab-wallpaper-category-title-abstract = Abstrakcyjne
newtab-wallpaper-abstract-green = Zielone kształty
newtab-wallpaper-abstract-blue = Niebieskie kształty
newtab-wallpaper-abstract-purple = Fioletowe kształty
newtab-wallpaper-abstract-orange = Pomarańczowe kształty
newtab-wallpaper-gradient-orange = Przejście między pomarańczowym a różowym
newtab-wallpaper-abstract-blue-purple = Niebieskie i fioletowe kształty
newtab-wallpaper-abstract-white-curves = Biały z cieniowanymi łukami
newtab-wallpaper-abstract-purple-green = Gradient fioletowego i zielonego światła
newtab-wallpaper-abstract-blue-purple-waves = Niebieskie i fioletowe faliste kształty
newtab-wallpaper-abstract-black-waves = Czarne faliste kształty

## Firefox

newtab-wallpaper-category-title-photographs = Zdjęcia
newtab-wallpaper-beach-at-sunrise = Plaża o wschodzie słońca
newtab-wallpaper-beach-at-sunset = Plaża o zachodzie słońca
newtab-wallpaper-storm-sky = Burzowe niebo
newtab-wallpaper-sky-with-pink-clouds = Niebo z różowymi chmurami
newtab-wallpaper-red-panda-yawns-in-a-tree = Pandka ruda ziewa na drzewie
newtab-wallpaper-white-mountains = Białe góry
newtab-wallpaper-hot-air-balloons = Różnorodne kolory balonów na ogrzane powietrze w ciągu dnia
newtab-wallpaper-starry-canyon = Niebieska gwiaździsta noc
newtab-wallpaper-suspension-bridge = Szary most wiszący sfotografowany w ciągu dnia
newtab-wallpaper-sand-dunes = Białe wydmy
newtab-wallpaper-palm-trees = Sylwetka palm kokosowych przed zachodem słońca
newtab-wallpaper-blue-flowers = Zbliżenie na kwitnące niebieskie kwiatki
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Zdjęcie: <a data-l10n-name="name-link">{ $author_string }</a> z witryny <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Wypróbuj odrobiny koloru
newtab-wallpaper-feature-highlight-content = Nadaj nowej karcie świeży wygląd dzięki tapetom.
newtab-wallpaper-feature-highlight-button = OK
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Zamknij
    .aria-label = Zamknij tę funkcję
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Astronomiczne
newtab-wallpaper-celestial-lunar-eclipse = Zaćmienie Księżyca
newtab-wallpaper-celestial-earth-night = Zdjęcie nocne z niskiej orbity okołoziemskiej
newtab-wallpaper-celestial-starry-sky = Gwiaździste niebo
newtab-wallpaper-celestial-eclipse-time-lapse = Poklatkowe zaćmienie Księżyca
newtab-wallpaper-celestial-black-hole = Ilustracja przedstawiająca galaktykę z czarną dziurą
newtab-wallpaper-celestial-river = Zdjęcie satelitarne rzeki

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Zobacz prognozę na witrynie { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Sponsorowane
newtab-weather-menu-change-location = Zmień położenie
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Wyszukaj położenie
    .aria-label = Wyszukaj położenie
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Użyj obecnego położenia
newtab-weather-menu-weather-display = Wyświetlanie pogody
newtab-weather-todays-forecast = Prognoza na dziś
newtab-weather-see-full-forecast = Pełna prognoza
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Proste
newtab-weather-menu-change-weather-display-simple = Przełącz na prosty widok
newtab-weather-menu-weather-display-option-detailed = Szczegółowe
newtab-weather-menu-change-weather-display-detailed = Przełącz na szczegółowy widok
newtab-weather-menu-temperature-units = Jednostka temperatury
newtab-weather-menu-temperature-option-fahrenheit = Stopnie Fahrenheita
newtab-weather-menu-temperature-option-celsius = Stopnie Celsjusza
newtab-weather-menu-change-temperature-units-fahrenheit = Przełącz na stopnie Fahrenheita
newtab-weather-menu-change-temperature-units-celsius = Przełącz na stopnie Celsjusza
newtab-weather-menu-hide-weather = Ukryj pogodę na stronie nowej karty
newtab-weather-menu-learn-more = Więcej informacji
newtab-weather-menu-detect-my-location = Wykryj moje położenie
# This message is shown if user is working offline
newtab-weather-error-not-available = Informacje o pogodzie nie są w tej chwili dostępne.
newtab-weather-opt-in-see-weather = Czy wyświetlać pogodę dla tego położenia?
newtab-weather-opt-in-not-now =
    .label = Nie teraz
newtab-weather-opt-in-yes =
    .label = Tak
newtab-weather-opt-in-headline = Lokalna prognoza pogody
newtab-weather-opt-in-use-location =
    .label = Użyj położenia
newtab-weather-opt-in-choose-location = Wybierz położenie
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Nowy Jork
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Najwyższa
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Najniższa
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Zobacz prognozę na witrynie { $provider }
    .aria-description = { $provider } ∙ Sponsorowane

## Topic Labels

newtab-topic-label-business = Biznes
newtab-topic-label-career = Praca
newtab-topic-label-education = Edukacja
newtab-topic-label-arts = Rozrywka
newtab-topic-label-food = Jedzenie
newtab-topic-label-health = Zdrowie
newtab-topic-label-hobbies = Gry
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Finanse
newtab-topic-label-society-parenting = Rodzicielstwo
newtab-topic-label-government = Polityka
newtab-topic-label-education-science = Nauka
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Porady
newtab-topic-label-sports = Sport
newtab-topic-label-tech = Technologia
newtab-topic-label-travel = Podróże
newtab-topic-label-home = Dom i ogród

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Dostosuj treści dla siebie, wybierając tematy
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Wybierz minimum dwa tematy. Nasi eksperci wybierają artykuły pasujące do Twoich zainteresowań. Swój wybór możesz zmienić w dowolnej chwili.
newtab-topic-selection-save-button = Zachowaj
newtab-topic-selection-cancel-button = Anuluj
newtab-topic-selection-button-maybe-later = Może później
newtab-topic-selection-privacy-link = Dowiedz się, jak chronimy i zarządzamy danymi
newtab-topic-selection-button-update-interests = Zaktualizuj swoje zainteresowania
newtab-topic-selection-button-pick-interests = Wybierz swoje zainteresowania

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Obserwuj
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Obserwuj temat „{ $topic }”
newtab-section-following-button = Obserwowane
newtab-section-unfollow-button = Przestań obserwować
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Obserwowane: przestań obserwować temat „{ $topic }”
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Dostrój swoje treści
newtab-section-follow-highlight-subtitle = Obserwuj swoje zainteresowania, aby widzieć więcej tego, co lubisz.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Zablokuj
newtab-section-blocked-button = Zablokowano
newtab-section-unblock-button = Odblokuj
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Obserwuj temat „{ $topic }”
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Przestań obserwować temat „{ $topic }”
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Zablokuj temat „{ $topic }”
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Odblokuj temat „{ $topic }”

## Confirmation modal for blocking a section

newtab-section-cancel-button = Nie teraz
newtab-section-confirm-block-topic-p1 = Czy na pewno zablokować ten temat?
newtab-section-confirm-block-topic-p2 = Zablokowane tematy nie będą już wyświetlane.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Zablokuj temat „{ $topic }”
newtab-section-block-cancel-button = Anuluj

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Tematy
newtab-section-manage-topics-button-v2 =
    .label = Zarządzaj tematami
newtab-section-mangage-topics-followed-topics = Obserwowane
newtab-section-mangage-topics-followed-topics-empty-state = Żadne tematy nie są jeszcze obserwowane.
newtab-section-mangage-topics-blocked-topics = Zablokowane
newtab-section-mangage-topics-blocked-topics-empty-state = Żadne tematy nie są jeszcze zablokowane.
newtab-custom-wallpaper-title = Własne tapety już tu są
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Ustaw własną tapetę lub wybierz dowolny kolor, aby { -brand-product-name } stał się Twój.
newtab-custom-wallpaper-cta = Wypróbuj

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Wybierz tapetę, aby { -brand-product-name } stał się Twój
newtab-new-user-custom-wallpaper-subtitle = Czuj się na każdej nowej karcie jak w domu dzięki własnej tapecie lub kolorowi.
newtab-new-user-custom-wallpaper-cta = Wypróbuj teraz

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Nowe tapety właśnie wylądowały
newtab-wallpaper-feature-highlight-subtitle = Wybierz swoją ulubioną i na każdej nowej karcie czuj się jak w domu.
newtab-wallpaper-feature-highlight-cta = Wybierz tapetę

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Pobierz { -brand-product-name(case: "acc") } na telefon
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Zeskanuj kod, aby bezpiecznie przeglądać Internet wszędzie tam, gdzie jesteś.
newtab-download-mobile-highlight-body-variant-b = Szybko kontynuuj od tego samego miejsca po synchronizacji kart, haseł i nie tylko.
newtab-download-mobile-highlight-body-variant-c = Czy wiesz, że możesz zabrać { -brand-product-name(case: "acc") } ze sobą? Ta sama przeglądarka. W kieszeni.
newtab-download-mobile-highlight-image =
    .aria-label = Kod QR do pobrania { -brand-product-name(case: "gen") } na telefon

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Ulubione zawsze pod ręką
newtab-shortcuts-highlight-subtitle = Dodaj skrót, aby mieć ulubione witryny pod jednym kliknięciem.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Dlaczego to zgłaszasz?
newtab-report-ads-reason-not-interested =
    .label = Nie interesuje mnie
newtab-report-ads-reason-inappropriate =
    .label = Jest niestosowna
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Pojawiła się zbyt wiele razy
newtab-report-content-wrong-category =
    .label = Błędna kategoria
newtab-report-content-outdated =
    .label = Przestarzała
newtab-report-content-inappropriate-offensive =
    .label = Niestosowna lub obraźliwa
newtab-report-content-spam-misleading =
    .label = Spam lub wprowadza w błąd
newtab-report-content-requires-payment-subscription =
    .label = Wymaga płatności lub subskrypcji
newtab-report-content-requires-payment-subscription-learn-more = Więcej informacji
newtab-report-cancel = Anuluj
newtab-report-submit = Wyślij
newtab-toast-thanks-for-reporting =
    .message = Dziękujemy za zgłoszenie.
newtab-toast-widgets-hidden =
    .message = Aby z powrotem dodać widżety, kliknij ikonę ołówka.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Od teraz obserwujesz temat „{ $topic }”.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Już nie obserwujesz tematu „{ $topic }”.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Nie będziemy już wyświetlać artykułów na temat „{ $topic }”.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Możliwości są nieograniczone. Dodaj jedną.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Nowe
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Ukończone ({ $number })
newtab-widget-lists-celebration-headline = Dobra robota
newtab-widget-lists-celebration-subhead = Wszystko zrobione
newtab-widget-task-list-menu-copy = Kopiuj
newtab-widget-lists-menu-edit = Edytuj nazwę listy
newtab-widget-lists-menu-edit2 =
    .aria-label = Edytuj nazwę listy
newtab-widget-lists-menu-create = Utwórz nową listę
newtab-widget-lists-menu-delete = Usuń tę listę
newtab-widget-lists-menu-copy = Kopiuj listę do schowka
newtab-widget-lists-menu-learn-more = Więcej informacji
newtab-widget-lists-button-add-item = Dodaj pozycję
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Dodaj pozycję
    .aria-label = Dodaj pozycję
newtab-widget-lists-input-error = Wpisz tekst, aby dodać pozycję.
newtab-widget-lists-input-menu-open-link = Otwórz odnośnik
newtab-widget-lists-input-menu-move-up = Przesuń w górę
newtab-widget-lists-input-menu-move-down = Przesuń w dół
newtab-widget-lists-input-menu-delete = Usuń
newtab-widget-lists-input-menu-edit = Edytuj
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Edytuj pozycję
newtab-widget-lists-edit-clear =
    .aria-label = Anuluj
    .title = Anuluj
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Utwórz nową listę
newtab-widget-lists-name-label-default =
    .label = Lista zadań
newtab-widget-lists-name-label-checklist =
    .label = Lista rzeczy do zrobienia
newtab-widget-lists-name-placeholder-default =
    .placeholder = Lista zadań
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Lista rzeczy do zrobienia
    .aria-label = Edytuj nazwę listy
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Nowa lista
    .aria-label = Edytuj nazwę listy
newtab-widget-section-title = Widżety
newtab-widget-menu-hide = Ukryj widżet
newtab-widget-menu-change-size = Zmień rozmiar
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Przenieś
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = W lewo
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = W prawo
newtab-widget-size-small = Mały
newtab-widget-size-medium = Średni
newtab-widget-size-large = Duży
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Ukryj widżety
    .aria-label = Ukryj wszystkie widżety
newtab-widget-section-maximize =
    .title = Rozwiń widżety
    .aria-label = Rozwiń wszystkie widżety do pełnego rozmiaru
newtab-widget-section-minimize =
    .title = Minimalizuj widżety
    .aria-label = Zwiń wszystkie widżety do małego rozmiaru
newtab-widget-section-menu-button =
    .title = Menu widżetów
    .aria-label = Otwórz menu widżetów
newtab-widget-add-widgets-button =
    .aria-label = Dodaj widżet
    .title = Dodaj widżet
newtab-widget-section-menu-manage = Zarządzaj widżetami
newtab-widget-section-menu-hide-all = Ukryj widżety
newtab-widget-section-menu-learn-more = Więcej informacji
newtab-widget-section-feedback = Powiedz nam, co sądzisz
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Więcej widżetów
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Mniej widżetów
newtab-widget-lists-name-default = Lista rzeczy do zrobienia

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Minutnik
newtab-widget-timer-notification-focus = Czas na skupienie minął. Dobra robota. Potrzebujesz przerwy?
newtab-widget-timer-notification-break = Przerwa się skończyła. Czas się skoncentrować!
newtab-widget-timer-notification-warning = Powiadomienia są wyłączone
newtab-widget-timer-mode-focus =
    .label = Skupienie
newtab-widget-timer-mode-break =
    .label = Przerwa
newtab-widget-timer-label-play =
    .label = Rozpocznij
newtab-widget-timer-label-pause =
    .label = Wstrzymaj
newtab-widget-timer-reset =
    .title = Przywróć
newtab-widget-timer-menu-notifications = Wyłącz powiadomienia
newtab-widget-timer-menu-notifications-on = Włącz powiadomienia
newtab-widget-timer-menu-learn-more = Więcej informacji
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Najważniejsze nagłówki
newtab-daily-briefing-card-menu-dismiss = Zamknij
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Zaktualizowano { $minutes } min temu
newtab-widget-message-title = Nie trać koncentracji dzięki listom i wbudowanemu minutnikowi
# to-dos stands for "things to do".
newtab-widget-message-copy = Od szybkich przypomnień po codzienne listy zadań, od sesji skupienia po przerwy na rozciągnięcie — nie trać koncentracji ani czasu.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Jedno miejsce, w którym znajdziesz najważniejsze informacje, prognozy i nie tylko
newtab-widget-message-focus-forecasts-body = Zadbaj o płynny przebieg dnia dzięki widżetom { -brand-product-name(case: "gen") }. Sprawdzaj prognozę pogody, realizuj swoje zadania lub śledź czas w różnych strefach czasowych na świecie.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Ustaw { -brand-product-name(case: "acc") } po swojemu
newtab-promo-card-body-addons = Wybierz tapetę z naszej kolekcji lub utwórz własną.
newtab-promo-card-cta-addons = Wypróbuj teraz
newtab-promo-card-title = Wspieraj { -brand-product-name(case: "acc") }
newtab-promo-card-body = Nasi sponsorzy wspierają naszą misję budowania lepszej sieci.
newtab-promo-card-cta = Więcej informacji
newtab-promo-card-dismiss-button =
    .title = Zamknij
    .aria-label = Zamknij

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] Włącz minutnik na jedną minutę
            [few] Włącz minutnik na { $minutes } minuty
           *[many] Włącz minutnik na { $minutes } minut
        }
newtab-widget-timer-pause-aria =
    .aria-label = Wstrzymaj minutnik
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } minuta
            [few] { $minutes } minuty
           *[many] { $minutes } minut
        }
newtab-widget-timer-decrease-min =
    .title = Zmniejsz o 1 minutę
newtab-widget-timer-increase-min =
    .title = Zwiększ o 1 minutę
newtab-widget-timer-mode-group =
    .aria-label = Tryb minutnika
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Skupienie
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Przerwa
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Ukryj minutnik
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Dobra robota
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Przerwa się skończyła
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Potrzebujesz przerwy?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Czas się skoncentrować!

##

newtab-sports-widget-menu-follow-teams = Obserwuj drużyny
newtab-sports-widget-menu-view-schedule = Harmonogram
newtab-sports-widget-menu-view-upcoming = Niedługo
newtab-sports-widget-menu-view-results = Wyniki
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Kluczowe daty
newtab-sports-widget-menu-learn-more = Więcej informacji
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Bądź na bieżąco z mistrzostwami świata
newtab-sports-widget-get-updates = Bieżące informacje o meczach i nie tylko.
newtab-sports-widget-view-schedule =
    .label = Harmonogram
newtab-sports-widget-follow-teams =
    .label = Obserwuj drużyny
newtab-sports-widget-view-matches =
    .label = Mecze
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Obserwuj { $number } drużynę
        [few] Obserwuj do { $number } drużyn
       *[many] Obserwuj do { $number } drużyn
    }
newtab-sports-widget-choose-wallpaper =
    .label = Wybierz tapetę
newtab-sports-widget-skip = Pomiń
newtab-sports-widget-search-country =
    .placeholder = Wyszukaj kraj
    .aria-label = Wyszukaj kraj
newtab-sports-widget-cancel = Anuluj
newtab-sports-widget-back-button =
    .aria-label = Wstecz
newtab-sports-widget-done-button =
    .label = Gotowe
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (wyeliminowana)
newtab-sports-widget-view-all =
    .label = Wszystkie
newtab-sports-widget-show-less =
    .label = Mniej
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Tylko obserwowane drużyny
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Oglądaj
    .title = Oglądaj na żywo
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Oglądaj na żywo
    .title = Oglądaj na żywo
newtab-sports-widget-watch-dialog-close =
    .aria-label = Zamknij
    .title = Zamknij
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Darmowa
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Darmowy okres próbny
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Darmowa i płatna
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Płatna
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Tylko wybrane mecze
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Dostępne w Twoim regionie
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Inne regiony
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Otwórz transmisję
    .title = Otwórz transmisję
newtab-sports-widget-group-stage = Faza grupowa
newtab-sports-widget-group-a = Grupa A
newtab-sports-widget-group-b = Grupa B
newtab-sports-widget-group-c = Grupa C
newtab-sports-widget-group-d = Grupa D
newtab-sports-widget-group-e = Grupa E
newtab-sports-widget-group-f = Grupa F
newtab-sports-widget-group-g = Grupa G
newtab-sports-widget-group-h = Grupa H
newtab-sports-widget-group-i = Grupa I
newtab-sports-widget-group-j = Grupa J
newtab-sports-widget-group-k = Grupa K
newtab-sports-widget-group-l = Grupa L
newtab-sports-widget-round-32 = Pierwsza runda
newtab-sports-widget-round-16 = Druga runda
newtab-sports-widget-quarter-finals = Ćwierćfinały
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = Na żywo
newtab-custom-widget-live-refresh =
    .title = Odśwież wyniki
    .aria-label = Odśwież wyniki
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Kluczowe daty
newtab-sports-widget-upcoming = Niedługo
# Used for a match currently ongoing
newtab-sports-widget-now = Teraz
newtab-sports-widget-results = Wyniki
newtab-sports-widget-semi-finals = Półfinały
newtab-sports-widget-bronze-finals = Mecz o trzecie miejsce
# Final is the final match for 1st place.
newtab-sports-widget-final = Mecz finałowy
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Opóźniony
newtab-sports-widget-postponed = Przełożony
newtab-sports-widget-suspended = Zawieszony
newtab-sports-widget-cancelled = Odwołany
newtab-sports-widget-information = Informacje o meczu
newtab-sports-widget-no-live-data = Informacje o meczu na żywo nie są obecnie aktualizowane
newtab-sports-widget-view-results-link = Wyniki
newtab-sports-widget-third-place = Trzecie miejsce
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Drugie miejsce
newtab-sports-widget-champions = Mistrzowie
newtab-sports-widget-world-cup-champions = Mistrzowie świata 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Koniec meczu
newtab-sports-widget-match-halftime = Przerwa
newtab-sports-widget-match-extra-time = Dogrywka
newtab-sports-widget-match-penalties = Rzuty karne
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = —
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Niedługo pojawią się informacje o meczu

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Poprzednie
    .title = Poprzednie
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Następne
    .title = Następne
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = { $index }. z { $total } meczy na żywo
    .title = { $index }. z { $total } meczy na żywo

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
    .aria-label = { $homeTeam }, { $homeScore } kontra { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) kontra { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Na żywo: { $homeTeam }, { $homeScore } kontra { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } kontra { $awayTeam }, { DATETIME($date, day: "numeric", month: "long") } o { DATETIME($date, hour: "numeric", minute: "numeric") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } kontra { $awayTeam }, opóźniony
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } kontra { $awayTeam }, przełożony
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } kontra { $awayTeam }, zawieszony
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } kontra { $awayTeam }, odwołany

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bośnia i Hercegowina
newtab-sports-widget-team-name-label-civ =
    .label = Wybrzeże Kości Słoniowej
newtab-sports-widget-team-name-label-cod =
    .label = Demokratyczna Republika Konga
newtab-sports-widget-team-name-label-eng =
    .label = Anglia
newtab-sports-widget-team-name-label-sco =
    .label = Szkocja
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Jeszcze nieznane

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Zacznij mistrzostwa świata z nowymi tapetami
newtab-sports-widget-message-wallpapers-body = Podczas turnieju poczuj w swojej przeglądarce energię dnia meczowego.
newtab-sports-widget-message-wallpapers-cta = Wybierz tapetę
newtab-sports-widget-message-add-widgets-cta =
    .label = Dodaj widżety
newtab-sports-widget-message-day-in-play-title = Nie wychodź z gry dzięki widżetom { -brand-product-name(case: "gen") }
newtab-sports-widget-message-day-in-play-body = Śledź mistrzostwa świata, realizuj swoje zadania, kontroluj czas na całym świecie i nie tylko.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Przeglądaj widżety

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Zamknij
    .aria-label = Zamknij
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Ustaw to miejsce po swojemu
newtab-activation-window-message-customization-focus-message = Wybierz nową tapetę, dodaj skróty do swoich ulubionych stron i bądź na bieżąco z artykułami, które Cię interesują.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Dostosuj
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = To miejsce gra według Twoich zasad
newtab-activation-window-message-values-focus-message = { -brand-product-name } pozwala przeglądać Internet tak, jak lubisz, oferując bardziej spersonalizowany sposób na rozpoczęcie dnia w sieci. Ustaw { -brand-product-name(case: "acc") } po swojemu.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Ukryj zegar
newtab-clock-widget-menu-learn-more = Więcej informacji
newtab-clock-widget-menu-edit = Edytuj zegary
newtab-clock-widget-menu-switch-to-12h = Przełącz na zegar 12-godzinny
newtab-clock-widget-menu-switch-to-24h = Przełącz na zegar 24-godzinny
newtab-clock-widget-label-your-clocks = Twoje zegary
newtab-clock-widget-search-location-input =
    .label = Położenie
    .placeholder = Wyszukaj miasto
    .aria-label = Wyszukaj miasto
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Nazwa (opcjonalnie)
    .placeholder = Dodaj nazwę
    .aria-label = Nazwa (opcjonalnie)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Dodaj nowy zegar
    .aria-label = Dodaj nowy zegar
newtab-clock-widget-button-add-clock = Dodaj
newtab-clock-widget-button-cancel = Anuluj
newtab-clock-widget-button-back =
    .title = Wstecz
    .aria-label = Wstecz
newtab-clock-widget-button-edit-clock =
    .title = Edytuj zegar
    .aria-label = Edytuj zegar
newtab-clock-widget-button-save = Zachowaj
newtab-clock-widget-button-remove-clock =
    .title = Usuń zegar
    .aria-label = Usuń zegar
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
    .aria-label = { $city }, nazwa: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Dodaj zegar
newtab-clock-widget-edit-clock-form =
    .aria-label = Edytuj zegar
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Wyniki wyszukiwania
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Brak wyników
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Otwórz menu zegara
    .aria-label = Otwórz menu zegara
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Nazwa: { $nickname }
