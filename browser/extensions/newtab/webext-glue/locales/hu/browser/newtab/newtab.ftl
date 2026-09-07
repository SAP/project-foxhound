# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Új lap
newtab-settings-button =
    .title = Az Új lap oldal személyre szabása
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Oldal testreszabása
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Testreszabás
newtab-customize-panel-label =
    .label = Testreszabás
newtab-personalize-settings-icon-label =
    .title = Új lap testreszabása
    .aria-label = Beállítások
newtab-settings-dialog-label =
    .aria-label = Beállítások
newtab-personalize-icon-label =
    .title = Új lap testreszabása
    .aria-label = Új lap testreszabása
newtab-personalize-dialog-label =
    .aria-label = Testreszabás
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Eltüntetés
    .aria-label = Eltüntetés

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Kezdőlap
home-homepage-new-windows =
    .label = Új ablakok
home-homepage-new-tabs =
    .label = Új lapok
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Válasszon egy adott oldalt

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Webhelyek címei
home-custom-homepage-address =
    .placeholder = Cím megadása
home-custom-homepage-address-button =
    .label = Cím hozzáadása
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Még nincsenek webhelyek hozzáadva.
home-custom-homepage-delete-address-button =
    .aria-label = Cím törlése
    .title = Cím törlése
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Csere erre:
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Jelenleg megnyitott oldalak
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Könyvjelzők…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Keresés
home-prefs-stories-header2 =
    .label = Történetek
    .description = Kivételes tartalmak a { -brand-product-name } család válogatásában
home-prefs-widgets-header =
    .label = Kisalkalmazások
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Listák
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Időzítő
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Sport
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Óra
home-prefs-mission-message2 =
    .message = Szponzoraink támogatják a küldetésünket, hogy jobb webet építsünk.
home-prefs-manage-topics-link2 =
    .label = Témák kezelése
home-prefs-choose-wallpaper-link2 =
    .label = Válasszon egy háttérképet
home-prefs-firefox-logo-header =
    .label = { -brand-short-name } logó
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Ezen funkciók használatához állítsa be az új lapokat vagy ablakokat, hogy a { -firefox-home-brand-name }ot jelenítsék meg.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } sor
           *[other] { $num } sor
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Kiegészítő ({ $extension })
home-restore-defaults-srd =
    .label = Alapértelmezések visszaállítása
    .accesskey = A
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (alapértelmezett)
home-mode-choice-custom-srd =
    .label = Egyéni webcímek…
home-mode-choice-blank-srd =
    .label = Üres lap
home-prefs-shortcuts-header-srd =
    .label = Indítóikonok
home-prefs-shortcuts-select =
    .aria-label = Indítóikonok
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Szponzorált indítóikonok
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Szponzorált történetek
home-prefs-highlights-option-visited-pages-srd =
    .label = Látogatott oldalak
home-prefs-highlights-options-bookmarks-srd =
    .label = Könyvjelzők
home-prefs-highlights-option-most-recent-download-srd =
    .label = Legutóbbi letöltés
home-prefs-recent-activity-header-srd =
    .label = Legutóbbi tevékenység
home-prefs-recent-activity-select =
    .aria-label = Legutóbbi tevékenység
home-prefs-weather-header-srd =
    .label = Időjárás
home-prefs-support-firefox-header-srd =
    .label = A { -brand-product-name } támogatása
home-prefs-mission-message-learn-more-link-srd = Tudja meg hogyan

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Keresés
    .aria-label = Keresés
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Keressen a(z) { $engine } keresővel vagy adjon meg egy címet
newtab-search-box-handoff-text-no-engine = Keressen, vagy adjon meg címet
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Keressen a(z) { $engine } keresővel vagy adjon meg egy címet
    .title = Keressen a(z) { $engine } keresővel vagy adjon meg egy címet
    .aria-label = Keressen a(z) { $engine } keresővel vagy adjon meg egy címet
newtab-search-box-handoff-input-no-engine =
    .placeholder = Keressen, vagy adjon meg címet
    .title = Keressen, vagy adjon meg címet
    .aria-label = Keressen, vagy adjon meg címet
newtab-search-box-text = Keresés a weben
newtab-search-box-input =
    .placeholder = Keresés a weben
    .aria-label = Keresés a weben

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Keresőszolgáltatás hozzáadása
newtab-topsites-add-shortcut-header = Új gyorskereső
newtab-topsites-edit-topsites-header = Népszerű oldal szerkesztése
newtab-topsites-edit-shortcut-header = Gyorskereső szerkesztése
newtab-topsites-add-shortcut-label = Indítóikon hozzáadása
newtab-topsites-add-shortcut-title =
    .title = Indítóikon hozzáadása
    .aria-label = Indítóikon hozzáadása
newtab-topsites-title-label = Cím
newtab-topsites-title-input =
    .placeholder = Cím megadása
newtab-topsites-url-label = Webcím
newtab-topsites-url-input =
    .placeholder = Írjon vagy illesszen be egy webcímet
newtab-topsites-url-validation = Érvényes webcím szükséges
newtab-topsites-image-url-label = Egyéni kép webcíme
newtab-topsites-use-image-link = Egyéni kép használata…
newtab-topsites-image-validation = A kép betöltése nem sikerült. Próbáljon meg egy másik webcímet.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Szöveg törlése

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Mégse
newtab-topsites-delete-history-button = Törlés az előzményekből
newtab-topsites-save-button = Mentés
newtab-topsites-preview-button = Előnézet
newtab-topsites-add-button = Hozzáadás

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Biztosan törli ezen oldal minden példányát az előzményekből?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Ez a művelet nem vonható vissza.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Szponzorált

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (rögzítve)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Menü megnyitása
    .aria-label = Menü megnyitása
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Eltávolítás
    .aria-label = Eltávolítás
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Menü megnyitása
    .aria-label = Környezeti menü megnyitása ehhez: { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Webhely szerkesztése
    .aria-label = Webhely szerkesztése

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Szerkesztés
newtab-menu-open-new-window = Megnyitás új ablakban
newtab-menu-open-new-private-window = Megnyitás új privát ablakban
newtab-menu-dismiss = Elutasítás
newtab-menu-pin = Rögzítés
newtab-menu-unpin = Rögzítés feloldása
newtab-menu-delete-history = Törlés az előzményekből
newtab-menu-save-to-pocket = Mentés a { -pocket-brand-name }be
newtab-menu-delete-pocket = Törlés a { -pocket-brand-name }ből
newtab-menu-archive-pocket = Archiválás a { -pocket-brand-name }ben
newtab-menu-show-privacy-info = Támogatóink és az Ön adatvédelme
newtab-menu-about-fakespot = A { -fakespot-brand-name } névjegye
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Jelentés
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Tiltás
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Követés megszüntetése
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = További tudnivalók
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Téma követésének megszüntetése

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Szponzorált tartalmak kezelése
newtab-menu-our-sponsors-and-your-privacy = Támogatóink és az Ön adatvédelme
newtab-menu-report-this-ad = Hirdetés jelentése

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Kész
newtab-privacy-modal-button-manage = Szponzorált tartalom beállításainak kezelése
newtab-privacy-modal-header = Számít az Ön adatvédelme.
newtab-privacy-modal-paragraph-2 =
    A magával ragadó történetek mellett, kiválasztott szponzoraink releváns,
    válogatott tartalmait is megjelenítjük. Biztos lehet benne, hogy <strong>a böngészési adatai
    sosem hagyják el az Ön { -brand-product-name } példányát</strong> – mi nem látjuk azokat,
    és a szponzoraink sem.
newtab-privacy-modal-link = Tudja meg, hogyan működik az adatvédelem az új lapon

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Könyvjelző eltávolítása
# Bookmark is a verb here.
newtab-menu-bookmark = Könyvjelzőzés

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Letöltési hivatkozás másolása
newtab-menu-go-to-download-page = Ugrás a letöltési oldalra
newtab-menu-remove-download = Törlés az előzményekből

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Megjelenítés a Finderben
       *[other] Tartalmazó mappa megnyitása
    }
newtab-menu-open-file = Fájl megnyitása

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Látogatott
newtab-label-bookmarked = Könyvjelzőzött
newtab-label-removed-bookmark = Könyvjelző törölve
newtab-label-recommended = Népszerű
newtab-label-saved = Mentve a { -pocket-brand-name }be
newtab-label-download = Letöltve
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Szponzorált
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Szponzorálta: { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } perc
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Szponzorált

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Szakasz eltávolítása
newtab-section-menu-collapse-section = Szakasz összecsukása
newtab-section-menu-expand-section = Szakasz lenyitása
newtab-section-menu-manage-section = Szakasz kezelése
newtab-section-menu-manage-webext = Kiegészítő kezelése
newtab-section-menu-add-topsite = Hozzáadás a népszerű oldalakhoz
newtab-section-menu-add-search-engine = Keresőszolgáltatás hozzáadása
newtab-section-menu-move-up = Mozgatás felfelé
newtab-section-menu-move-down = Mozgatás lefelé
newtab-section-menu-privacy-notice = Adatvédelmi nyilatkozat

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Szakasz összecsukása
newtab-section-expand-section-label =
    .aria-label = Szakasz lenyitása

## Section Headers.

newtab-section-header-topsites = Népszerű oldalak
newtab-section-header-recent-activity = Legutóbbi tevékenység
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = A(z) { $provider } ajánlásával
newtab-section-header-stories = Elgondolkodtató történetek
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Mai kedvencek

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Kezdjen el böngészni, és itt fognak megjelenni azok a nagyszerű cikkek, videók és más lapok, amelyeket nemrég meglátogatott vagy könyvjelzőzött.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Már felzárkózott. Nézzen vissza később a legújabb { $provider } hírekért. Nem tud várni? Válasszon egy népszerű témát, hogy még több sztorit találjon a weben.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Már felzárkózott. Nézzen vissza később további történetekért. Nem tud várni? Válasszon egy népszerű témát, hogy még több sztorit találjon a weben.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Felzárkózott.
newtab-discovery-empty-section-topstories-content = Nézzen vissza később további történetekért.
newtab-discovery-empty-section-topstories-try-again-button = Újrapróbálkozás
newtab-discovery-empty-section-topstories-loading = Betöltés…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Hoppá! Majdnem betöltöttük ezt a részt, de nem egészen.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Népszerű témák:
newtab-pocket-new-topics-title = Még több történetet szeretne? Nézze meg ezeket a népszerű témákat a { -pocket-brand-name }től.
newtab-pocket-more-recommendations = További javaslatok
newtab-pocket-learn-more = További tudnivalók
newtab-pocket-cta-button = { -pocket-brand-name } beszerzése
newtab-pocket-cta-text = Mentse az Ön által kedvelt történeteket a { -pocket-brand-name }be, és töltse fel elméjét lebilincselő olvasnivalókkal.
newtab-pocket-pocket-firefox-family = A { -pocket-brand-name } a { -brand-product-name } család része
newtab-pocket-save = Mentés
newtab-pocket-saved = Mentve

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Több hasonló
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Nem nekem való
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Köszönjük. Visszajelzése segít nekünk a hírforrás fejlesztésében.
newtab-toast-dismiss-button =
    .title = Eltüntetés
    .aria-label = Eltüntetés

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Fedezze fel a web legjavát
newtab-pocket-onboarding-cta = A { -pocket-brand-name } publikációk széles választékát fedezi fel, hogy a lehető leginformatívabb, inspirálóbb és megbízhatóbb tartalmakat hozza el a { -brand-product-name } böngészőjébe.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Hoppá, valami hiba történt a tartalom betöltésekor.
newtab-error-fallback-refresh-link = Az újrapróbálkozáshoz frissítse az oldalt.

## Customization Menu

newtab-custom-shortcuts-title = Indítóikonok
newtab-custom-shortcuts-subtitle = Mentett vagy felkeresett webhelyek
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Indítóikonok
    .description = Mentett vagy felkeresett webhelyek
newtab-custom-shortcuts-nova =
    .label = Indítóikonok
newtab-custom-row-description =
    .description = Sorok száma
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } sor
           *[other] { $num } sor
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } sor
       *[other] { $num } sor
    }
newtab-custom-sponsored-sites = Szponzorált indítóikonok
newtab-custom-pocket-title = A { -pocket-brand-name } által ajánlott
newtab-custom-pocket-subtitle = Kivételes tartalmak a { -pocket-brand-name } válogatásában, amely a { -brand-product-name } család része
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Ajánlott történetek
    .description = Kivételes tartalmak a { -brand-product-name } család válogatásában
newtab-recommended-stories-toggle =
    .label = Ajánlott történetek
newtab-custom-stories-personalized-toggle =
    .label = Történetek
newtab-custom-stories-personalized-checkbox-label = Személyre szabott történetek a tevékenysége alapján
newtab-custom-pocket-sponsored = Szponzorált történetek
newtab-custom-pocket-show-recent-saves = Legutóbbi mentések megjelenítése
newtab-custom-recent-title = Legutóbbi tevékenység
newtab-custom-recent-subtitle = Válogatás a legutóbbi webhelyekből és tartalmakból
newtab-custom-weather-toggle =
    .label = Időjárás
    .description = A mai előrejelzés egy pillantásra
newtab-custom-widget-weather-toggle =
    .label = Időjárás
newtab-custom-widget-lists-toggle =
    .label = Listák
newtab-custom-widget-timer-toggle =
    .label = Időzítő
newtab-custom-widget-sports-toggle =
    .label = Világbajnokság
newtab-custom-widget-clock-toggle =
    .label = Óra
newtab-custom-widget-sports-toggle2 =
    .label = Sport
newtab-custom-widget-section-title = Kisalkalmazások
newtab-custom-widget-section-toggle =
    .label = Kisalkalmazások
newtab-widget-manage-title = Kisalkalmazások
newtab-widget-manage-widget-button =
    .label = Kisalkalmazások kezelése
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Bezárás
    .aria-label = Menü bezárása
newtab-custom-close-button = Bezárás
newtab-custom-settings = További beállítások kezelése

## New Tab Wallpapers

newtab-wallpaper-title = Háttérképek
newtab-wallpaper-reset = Visszaállítás az alapértelmezésre
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Kép feltöltése
newtab-wallpaper-add-an-image = Kép hozzáadása
newtab-wallpaper-custom-color = Válasszon színt
newtab-wallpaper-toggle-title =
    .label = Háttérképek
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = A kép túllépte a { $file_size } MB-os fájlméretkorlátot. Próbáljon meg egy kisebb fájlt feltölteni.
newtab-wallpaper-error-upload-file-type = Nem tudtuk feltölteni a fájlt. Próbálja meg újra egy képfájllal.
newtab-wallpaper-error-file-type = Nem tudtuk feltölteni a fájlt. Próbálja meg újra egy másik fájltípussal.
newtab-wallpaper-light-red-panda = Vörös panda
newtab-wallpaper-light-mountain = Fehér hegy
newtab-wallpaper-light-sky = Ég, lila és rózsaszín felhőkkel
newtab-wallpaper-light-color = Kék, rózsaszín és sárga alakzatok
newtab-wallpaper-light-landscape = Kék ködös hegyi táj
newtab-wallpaper-light-beach = Strand pálmafával
newtab-wallpaper-dark-aurora = Sarki fény
newtab-wallpaper-dark-color = Vörös és kék alakzatok
newtab-wallpaper-dark-panda = Vörös panda elrejtve az erdőben
newtab-wallpaper-dark-sky = Városi táj éjszakai égbolttal
newtab-wallpaper-dark-mountain = Hegyvidéki táj
newtab-wallpaper-dark-city = Lila városi táj
newtab-wallpaper-dark-fox-anniversary = Egy róka a járdán, közel egy erdőhöz
newtab-wallpaper-light-fox-anniversary = Egy róka egy füves mezőben, ködös hegyi tájjal

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Egyszínű színek
newtab-wallpaper-colors = Színek
newtab-wallpaper-blue = Kék
newtab-wallpaper-light-blue = Világoskék
newtab-wallpaper-light-purple = Világoslila
newtab-wallpaper-light-green = Világoszöld
newtab-wallpaper-green = Zöld
newtab-wallpaper-beige = Bézs
newtab-wallpaper-yellow = Sárga
newtab-wallpaper-orange = Narancssárga
newtab-wallpaper-pink = Rózsaszín
newtab-wallpaper-light-pink = Világos rózsaszín
newtab-wallpaper-red = Vörös
newtab-wallpaper-dark-blue = Sötétkék
newtab-wallpaper-dark-purple = Sötétlila
newtab-wallpaper-dark-green = Sötétzöld
newtab-wallpaper-brown = Barna

## Abstract

newtab-wallpaper-category-title-abstract = Absztrakt
newtab-wallpaper-abstract-green = Zöld alakzatok
newtab-wallpaper-abstract-blue = Kék alakzatok
newtab-wallpaper-abstract-purple = Lila alakzatok
newtab-wallpaper-abstract-orange = Narancssárga alakzatok
newtab-wallpaper-gradient-orange = Narancssárga és rózsaszín átmenet
newtab-wallpaper-abstract-blue-purple = Kék és lila alakzatok
newtab-wallpaper-abstract-white-curves = Fehér, árnyalt ívekkel
newtab-wallpaper-abstract-purple-green = Lila és zöld fényátmenet
newtab-wallpaper-abstract-blue-purple-waves = Kék és lila hullámos alakzatok
newtab-wallpaper-abstract-black-waves = Fekete hullámos alakzatok

## Firefox

newtab-wallpaper-category-title-photographs = Fényképek
newtab-wallpaper-beach-at-sunrise = Strand napkeltekor
newtab-wallpaper-beach-at-sunset = Strand naplementekor
newtab-wallpaper-storm-sky = Viharos égbolt
newtab-wallpaper-sky-with-pink-clouds = Égbolt rózsaszín felhőkkel
newtab-wallpaper-red-panda-yawns-in-a-tree = Vörös panda ásít egy fán
newtab-wallpaper-white-mountains = Fehér hegyek
newtab-wallpaper-hot-air-balloons = Különböző színű hőlégballonok napközben
newtab-wallpaper-starry-canyon = Kék csillagos éjszaka
newtab-wallpaper-suspension-bridge = Fénykép egy szürke függőhídról, napközben
newtab-wallpaper-sand-dunes = Fehér homokdűnék
newtab-wallpaper-palm-trees = Kókuszpálmák sziluettje alkonyatkor
newtab-wallpaper-blue-flowers = Közeli fénykép kék szirmú virágokról virágzás közben
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Fénykép: <a data-l10n-name="name-link">{ $author_string }</a> itt: <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Próbáljon ki egy kis színt
newtab-wallpaper-feature-highlight-content = Adjon friss külsőt az Új lap oldalnak háttérképekkel.
newtab-wallpaper-feature-highlight-button = Megértettem!
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Eltüntetés
    .aria-label = Felugró ablak bezárása
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Mennyei
newtab-wallpaper-celestial-lunar-eclipse = Holdfogyatkozás
newtab-wallpaper-celestial-earth-night = Éjszakai fénykép alacsony Föld körüli pályáról
newtab-wallpaper-celestial-starry-sky = Csillagos égbolt
newtab-wallpaper-celestial-eclipse-time-lapse = Holdfogyatkozás gyorsítva
newtab-wallpaper-celestial-black-hole = Illusztráció egy galaxisról egy fekete lyukkal
newtab-wallpaper-celestial-river = Folyó műholdképe

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Előrejelzés megtekintése itt: { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Szponzorálva
newtab-weather-menu-change-location = Hely módosítása
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Keresési hely
    .aria-label = Keresési hely
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Jelenlegi hely használata
newtab-weather-menu-weather-display = Időjárás-kijelző
newtab-weather-todays-forecast = Mai előrejelzés
newtab-weather-see-full-forecast = Teljes előrejelzés megtekintése
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Egyszerű
newtab-weather-menu-change-weather-display-simple = Átváltás egyszerű nézetre
newtab-weather-menu-weather-display-option-detailed = Részletek
newtab-weather-menu-change-weather-display-detailed = Átváltás részletes nézetre
newtab-weather-menu-temperature-units = Hőmérséklet-egységek
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Váltás Fahrenheitre
newtab-weather-menu-change-temperature-units-celsius = Váltás Celsiusra
newtab-weather-menu-hide-weather = Időjárás elrejtése az Új lapon
newtab-weather-menu-learn-more = További tudnivalók
newtab-weather-menu-detect-my-location = Saját hely észlelése
# This message is shown if user is working offline
newtab-weather-error-not-available = Az időjárásadatok most nem érhetők el
newtab-weather-opt-in-see-weather = Szeretné látni a helye időjárását?
newtab-weather-opt-in-not-now =
    .label = Most nem
newtab-weather-opt-in-yes =
    .label = Igen
newtab-weather-opt-in-headline = Kapjon helyi időjárás-előrejelzést
newtab-weather-opt-in-use-location =
    .label = Hely használata
newtab-weather-opt-in-choose-location = Válasszon helyet
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York City
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Legmagasabb
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Legalacsonyabb
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Előrejelzés megtekintése itt: { $provider }
    .aria-description = { $provider } ∙ Szponzorálva

## Topic Labels

newtab-topic-label-business = Üzlet
newtab-topic-label-career = Karrier
newtab-topic-label-education = Oktatás
newtab-topic-label-arts = Szórakozás
newtab-topic-label-food = Étel
newtab-topic-label-health = Egészség
newtab-topic-label-hobbies = Játék
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Pénz
newtab-topic-label-society-parenting = Gyereknevelés
newtab-topic-label-government = Politika
newtab-topic-label-education-science = Tudomány
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Életmód
newtab-topic-label-sports = Sport
newtab-topic-label-tech = Technika
newtab-topic-label-travel = Utazás
newtab-topic-label-home = Otthon és kert

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Válasszon témákat a hírforrás finomhangolásához
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Válasszon kettő vagy több témát. Szakértő kurátoraink az érdeklődési körének megfelelő történeteket részesítik előnyben. Frissítse bármikor.
newtab-topic-selection-save-button = Mentés
newtab-topic-selection-cancel-button = Mégse
newtab-topic-selection-button-maybe-later = Talán később
newtab-topic-selection-privacy-link = Tudja meg, hogyan védjük és kezeljük az adatait
newtab-topic-selection-button-update-interests = Frissítse az érdeklődési köreit
newtab-topic-selection-button-pick-interests = Válassza ki az érdeklődési köreit

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Követés
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = { $topic } követése
newtab-section-following-button = Követés
newtab-section-unfollow-button = Követés megszüntetése
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Követés: { $topic } követésének megszüntetése
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Finomhangolja a hírfolyamát
newtab-section-follow-highlight-subtitle = Kövesse az érdeklődési köreit, hogy többet lásson abból, amit kedvel.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Blokkolás
newtab-section-blocked-button = Blokkolva
newtab-section-unblock-button = Blokkolás feloldása
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = { $topic } követése
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = { $topic } követésének megszüntetése
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = { $topic } blokkolása
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = { $topic } blokkolásának megszüntetése

## Confirmation modal for blocking a section

newtab-section-cancel-button = Most nem
newtab-section-confirm-block-topic-p1 = Biztos, hogy blokkolja ezt a témát?
newtab-section-confirm-block-topic-p2 = A blokkolt témák többé nem fognak megjelenni a hírfolyamában.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = { $topic } blokkolása
newtab-section-block-cancel-button = Mégse

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Témák
newtab-section-manage-topics-button-v2 =
    .label = Témák kezelése
newtab-section-mangage-topics-followed-topics = Követve
newtab-section-mangage-topics-followed-topics-empty-state = Még nem követ egyetlen témát sem.
newtab-section-mangage-topics-blocked-topics = Blokkolva
newtab-section-mangage-topics-blocked-topics-empty-state = Még nem blokkol egyetlen témát sem.
newtab-custom-wallpaper-title = Itt vannak az egyéni háttérképek
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Töltse fel a saját háttérképét, vagy válasszon egy egyéni háttérszínt, hogy a { -brand-product-name } a sajátja legyen.
newtab-custom-wallpaper-cta = Próbálja ki

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Válasszon háttérképet, hogy a { -brand-product-name }ot a sajátjává tegye
newtab-new-user-custom-wallpaper-subtitle = Tegyen minden új lapot otthonossá az egyéni háttérképekkel és színekkel.
newtab-new-user-custom-wallpaper-cta = Próbálja ki most

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Friss háttérképek érkeztek
newtab-wallpaper-feature-highlight-subtitle = Válassza ki a kedvencét, és legyen otthonos az összes új lapja.
newtab-wallpaper-feature-highlight-cta = Háttérkép választása

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Töltse le a mobilos { -brand-product-name }ot
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Olvassa le a kódot, hogy biztonságosan böngésszen útközben.
newtab-download-mobile-highlight-body-variant-b = Folytassa ott, ahol abbahagyta, és szinkronizálja lapjait, jelszavait és egyebeit.
newtab-download-mobile-highlight-body-variant-c = Tudta, hogy magával viheti a { -brand-product-name }ot? Ugyanaz a böngésző. A zsebében.
newtab-download-mobile-highlight-image =
    .aria-label = QR-kód a mobilos { -brand-product-name } letöltéséhez

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = A kedvencei egy karnyújtásnyira
newtab-shortcuts-highlight-subtitle = Adjon hozzá egy indítót, hogy a kedvenc oldalai egy kattintásra legyenek.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Miért jelenti ezt be?
newtab-report-ads-reason-not-interested =
    .label = Nem érdekel
newtab-report-ads-reason-inappropriate =
    .label = Nem megfelelő
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Túl sokszor láttam
newtab-report-content-wrong-category =
    .label = Hibás kategória
newtab-report-content-outdated =
    .label = Elavult
newtab-report-content-inappropriate-offensive =
    .label = Nem megfelelő vagy sértő
newtab-report-content-spam-misleading =
    .label = Kéretlen vagy félrevezető
newtab-report-content-requires-payment-subscription =
    .label = Fizetést vagy előfizetést igényel
newtab-report-content-requires-payment-subscription-learn-more = További tudnivalók
newtab-report-cancel = Mégse
newtab-report-submit = Elküldés
newtab-toast-thanks-for-reporting =
    .message = Köszönjük, hogy bejelentette.
newtab-toast-widgets-hidden =
    .message = Válassza a ceruza ikont, hogy bármikor újra kisalkalmazásokat adjon hozzá.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Mostantól követi a következőt: { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Már nem követi a következőt: { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Többé nem fog történeteket látni erről: { $topic }.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = A lehetőségek végtelenek. Adjon hozzá egyet.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Új
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Kész ({ $number })
newtab-widget-lists-celebration-headline = Szép munka
newtab-widget-lists-celebration-subhead = Minden tiszta
newtab-widget-task-list-menu-copy = Másolás
newtab-widget-lists-menu-edit = Listanév szerkesztése
newtab-widget-lists-menu-edit2 =
    .aria-label = Listanév szerkesztése
newtab-widget-lists-menu-create = Új lista létrehozása
newtab-widget-lists-menu-delete = Lista törlése
newtab-widget-lists-menu-copy = Lista vágólapra másolása
newtab-widget-lists-menu-learn-more = További tudnivalók
newtab-widget-lists-button-add-item = Elem hozzáadása
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Elem hozzáadása
    .aria-label = Elem hozzáadása
newtab-widget-lists-input-error = Elem hozzáadásához adjon meg szöveget.
newtab-widget-lists-input-menu-open-link = Hivatkozás megnyitása
newtab-widget-lists-input-menu-move-up = Mozgatás felfelé
newtab-widget-lists-input-menu-move-down = Mozgatás lefelé
newtab-widget-lists-input-menu-delete = Törlés
newtab-widget-lists-input-menu-edit = Szerkesztés
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Elem szerkesztése
newtab-widget-lists-edit-clear =
    .aria-label = Mégse
    .title = Mégse
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Új lista létrehozása
newtab-widget-lists-name-label-default =
    .label = Feladatlista
newtab-widget-lists-name-label-checklist =
    .label = Ellenőrzőlista
newtab-widget-lists-name-placeholder-default =
    .placeholder = Feladatlista
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Ellenőrzőlista
    .aria-label = Listanév szerkesztése
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Új lista
    .aria-label = Listanév szerkesztése
newtab-widget-section-title = Kisalkalmazások
newtab-widget-menu-hide = Kisalkalmazás elrejtése
newtab-widget-menu-change-size = Méret módosítása
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Áthelyezés
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Balra
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Jobbra
newtab-widget-size-small = Kicsi
newtab-widget-size-medium = Közepes
newtab-widget-size-large = Nagy
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Kisalkalmazások elrejtése
    .aria-label = Összes kisalkalmazás elrejtése
newtab-widget-section-maximize =
    .title = Kisalkalmazások kibontása
    .aria-label = Összes kisalkalmazás kibontása teljes méretűre
newtab-widget-section-minimize =
    .title = Kisalkalmazások minimalizálása
    .aria-label = Összes kisalkalmazás összecsukása kompakt méretre
newtab-widget-section-menu-button =
    .title = Kisalkalmazások menü
    .aria-label = Kisalkalmazások menü megnyitása
newtab-widget-add-widgets-button =
    .aria-label = Kisalkalmazás hozzáadása
    .title = Kisalkalmazás hozzáadása
newtab-widget-section-menu-manage = Kisalkalmazások kezelése
newtab-widget-section-menu-hide-all = Kisalkalmazások elrejtése
newtab-widget-section-menu-learn-more = További tudnivalók
newtab-widget-section-feedback = Mondja el nekünk mit gondol
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = További kisalkalmazások megjelenítése
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Kevesebb kisalkalmazás megjelenítése
newtab-widget-lists-name-default = Ellenőrzőlista

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Időzítő
newtab-widget-timer-notification-focus = Lejárt a fókuszidő. Szép munka. Szüksége van egy kis szünetre?
newtab-widget-timer-notification-break = A szünete véget ért. Készen áll az összpontosításra?
newtab-widget-timer-notification-warning = Az értesítések ki vannak kapcsolva
newtab-widget-timer-mode-focus =
    .label = Fókusz
newtab-widget-timer-mode-break =
    .label = Szünet
newtab-widget-timer-label-play =
    .label = Indítás
newtab-widget-timer-label-pause =
    .label = Szünet
newtab-widget-timer-reset =
    .title = Visszaállítás
newtab-widget-timer-menu-notifications = Értesítések kikapcsolása
newtab-widget-timer-menu-notifications-on = Értesítések bekapcsolása
newtab-widget-timer-menu-learn-more = További tudnivalók
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Legfontosabb szalagcímek
newtab-daily-briefing-card-menu-dismiss = Eltüntetés
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Frissítve: { $minutes } perce
newtab-widget-message-title = Maradjon fókuszált a listákkal és a beépített időzítővel
# to-dos stands for "things to do".
newtab-widget-message-copy = A gyors emlékeztetőktől a napi tennivalókig, fókuszált munkaszakaszoktól a nyújtó szünetekig — maradjon a feladatnál és időben.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Egy helyen összefoglalva minden lényeg, időjárás, egyebek
newtab-widget-message-focus-forecasts-body = Minden napja gördülékeny lehet a { -brand-product-name } moduljaival. Nézze meg az időjárás-előrejelzést, tartsa számon feladatait, vagy kövesse az időt szerte a világon.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Tegye sajátjává a { -brand-product-name }ot
newtab-promo-card-body-addons = Válasszon egy háttérképet a gyűjteményünkből, vagy készítse el a sajátját.
newtab-promo-card-cta-addons = Próbálja ki most
newtab-promo-card-title = Támogassa a { -brand-product-name }ot
newtab-promo-card-body = Szponzoraink támogatják a küldetésünket, hogy jobb webet építsünk
newtab-promo-card-cta = További tudnivalók
newtab-promo-card-dismiss-button =
    .title = Eltüntetés
    .aria-label = Eltüntetés

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] { $minutes } perces időzítő indítása
           *[other] { $minutes } perces időzítő indítása
        }
newtab-widget-timer-pause-aria =
    .aria-label = Időzítő szüneteltetése
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } perc
           *[other] { $minutes } perc
        }
newtab-widget-timer-decrease-min =
    .title = Csökkentés 1 perccel
newtab-widget-timer-increase-min =
    .title = Növelés 1 perccel
newtab-widget-timer-mode-group =
    .aria-label = Időzítő mód
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Fókusz
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Szünet
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Időzítő elrejtése
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Szép munka
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = A szünete véget ért
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Szüksége van egy kis szünetre?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Készen áll a fókuszálásra?

##

newtab-sports-widget-menu-follow-teams = Csapatok követése
newtab-sports-widget-menu-view-schedule = Beosztás megtekintése
newtab-sports-widget-menu-view-upcoming = Közelgők megtekintése
newtab-sports-widget-menu-view-results = Eredmények megtekintése
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Kulcsdátumok
newtab-sports-widget-menu-learn-more = További tudnivalók
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Kövesse a világbajnokságot
newtab-sports-widget-get-updates = Kapjon élő mérkőzésinformációkat és még sok mást.
newtab-sports-widget-view-schedule =
    .label = Beosztás megtekintése
newtab-sports-widget-follow-teams =
    .label = Csapatok követése
newtab-sports-widget-view-matches =
    .label = Mérkőzések megtekintése
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Kövessen akár { $number } csapatot
       *[other] Kövessen akár { $number } csapatot
    }
newtab-sports-widget-choose-wallpaper =
    .label = Válasszon egy háttérképet
newtab-sports-widget-skip = Kihagyás
newtab-sports-widget-search-country =
    .placeholder = Ország keresése
    .aria-label = Ország keresése
newtab-sports-widget-cancel = Mégse
newtab-sports-widget-back-button =
    .aria-label = Vissza
newtab-sports-widget-done-button =
    .label = Kész
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (kiesve)
newtab-sports-widget-view-all =
    .label = Összes megtekintése
newtab-sports-widget-show-less =
    .label = Kevesebb megjelenítése
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Csak követett csapatok
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Követés
    .title = Élő követés
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Élő követés
    .title = Élő követés
newtab-sports-widget-watch-dialog-close =
    .aria-label = Bezárás
    .title = Bezárás
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Ingyenes
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Ingyenes próbaidőszak
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Ingyenes és fizetős
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Fizetős
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Csak egyes játékok
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Régiójában elérhető
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Egyéb régiók
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Közvetítés megnyitása
    .title = Közvetítés megnyitása
newtab-sports-widget-group-stage = Csoportkörök szakasza
newtab-sports-widget-group-a = A csoport
newtab-sports-widget-group-b = B csoport
newtab-sports-widget-group-c = C csoport
newtab-sports-widget-group-d = D csoport
newtab-sports-widget-group-e = E csoport
newtab-sports-widget-group-f = F csoport
newtab-sports-widget-group-g = G csoport
newtab-sports-widget-group-h = H csoport
newtab-sports-widget-group-i = I csoport
newtab-sports-widget-group-j = J csoport
newtab-sports-widget-group-k = K csoport
newtab-sports-widget-group-l = L csoport
newtab-sports-widget-round-32 = Legjobb 32
newtab-sports-widget-round-16 = Legjobb 16
newtab-sports-widget-quarter-finals = Negyeddöntők
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = ÉLŐ
newtab-custom-widget-live-refresh =
    .title = Pontszámok frissítése
    .aria-label = Pontszámok frissítése
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Kulcsdátumok
newtab-sports-widget-upcoming = Közelgő
# Used for a match currently ongoing
newtab-sports-widget-now = Most
newtab-sports-widget-results = Eredmények
newtab-sports-widget-semi-finals = Elődöntők
newtab-sports-widget-bronze-finals = Bronzmérkőzés
# Final is the final match for 1st place.
newtab-sports-widget-final = Döntő
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Késleltetve
newtab-sports-widget-postponed = Elhalasztva
newtab-sports-widget-suspended = Felfüggesztve
newtab-sports-widget-cancelled = Lemondva
newtab-sports-widget-information = Információk a mérkőzésről
newtab-sports-widget-no-live-data = Az élő mérkőzésadatok most nem frissülnek
newtab-sports-widget-view-results-link = Eredmények megtekintése
newtab-sports-widget-third-place = Harmadik helyezett
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Második helyezett
newtab-sports-widget-champions = Bajnokok
newtab-sports-widget-world-cup-champions = A 2026-os világbajnokság bajnokai
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Teljes játékidő
newtab-sports-widget-match-halftime = Félidő
newtab-sports-widget-match-extra-time = Hosszabbítás
newtab-sports-widget-match-penalties = Büntetők
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = kontra
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Maradjon velünk a közelgő mérkőzés részleteiért

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Előző
    .title = Előző
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Következő
    .title = Következő
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = { $index }. élő mérkőzés / { $total }
    .title = { $index }. élő mérkőzés / { $total }

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
    .aria-label = Élő: { $homeTeam }, { $homeScore } kontra { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } kontra { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } kontra { $awayTeam }, késleltetve
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } kontra { $awayTeam }, elhalasztva
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } kontra { $awayTeam }, felfüggesztve
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } kontra { $awayTeam }, törölve

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosznia-Hercegovina
newtab-sports-widget-team-name-label-civ =
    .label = Elefántcsontpart
newtab-sports-widget-team-name-label-cod =
    .label = Kongói Demokratikus Köztársaság
newtab-sports-widget-team-name-label-eng =
    .label = Anglia
newtab-sports-widget-team-name-label-sco =
    .label = Skócia
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Még nincs meghatározva

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Indítsa a világbajnokságot új háttérképekkel
newtab-sports-widget-message-wallpapers-body = Vigyen egy kis játékos energiát a böngészőjébe a bajnokság alatt.
newtab-sports-widget-message-wallpapers-cta = Háttérkép választása
newtab-sports-widget-message-add-widgets-cta =
    .label = Kisalkalmazások hozzáadása
newtab-sports-widget-message-day-in-play-title = Maradjon játékban egész nap a { -brand-product-name } kisalkalmazásaival
newtab-sports-widget-message-day-in-play-body = Kövesse a vb-t, tartsa számon feladatait, kövesse az időt a világ minden táján, és így tovább.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Kisalkalmazások felfedezése

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Eltüntetés
    .aria-label = Eltüntetés
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Tegye sajátjává ezt a helyet
newtab-activation-window-message-customization-focus-message = Válasszon egy friss háttérképet, adjon hozzá indítóikonokat a kedvenc webhelyeihez, és legyen naprakész az Önt érdeklő történetekről.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Testreszabás megkezdése
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Ez a hely az Ön szabályai szerint játszik
newtab-activation-window-message-values-focus-message = A { -brand-product-name } használatával úgy böngészhet, ahogy tetszik, és személyesebben kezdheti a napját online. Tegye sajátjává a { -brand-product-name } böngészőt.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Óra elrejtése
newtab-clock-widget-menu-learn-more = További tudnivalók
newtab-clock-widget-menu-edit = Órák szerkesztése
newtab-clock-widget-menu-switch-to-12h = Váltás 12 órás formátumra
newtab-clock-widget-menu-switch-to-24h = Váltás 24 órás formátumra
newtab-clock-widget-label-your-clocks = Saját órák
newtab-clock-widget-search-location-input =
    .label = Hely
    .placeholder = Város keresése
    .aria-label = Város keresése
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Becenév (nem kötelező)
    .placeholder = Becenév hozzáadása
    .aria-label = Becenév (nem kötelező)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Új óra hozzáadása
    .aria-label = Új óra hozzáadása
newtab-clock-widget-button-add-clock = Hozzáadás
newtab-clock-widget-button-cancel = Mégse
newtab-clock-widget-button-back =
    .title = Vissza
    .aria-label = Vissza
newtab-clock-widget-button-edit-clock =
    .title = Óra szerkesztése
    .aria-label = Óra szerkesztése
newtab-clock-widget-button-save = Mentés
newtab-clock-widget-button-remove-clock =
    .title = Óra eltávolítása
    .aria-label = Óra eltávolítása
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
    .aria-label = { $city }, becenév: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Óra hozzáadása
newtab-clock-widget-edit-clock-form =
    .aria-label = Óra szerkesztése
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Találatok
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Nincs találat
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Óra menüjének megnyitása
    .aria-label = Óra menüjének megnyitása
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Becenév: { $nickname }
