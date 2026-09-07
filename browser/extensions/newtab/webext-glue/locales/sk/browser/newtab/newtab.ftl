# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Nová karta
newtab-settings-button =
    .title = Prispôsobte si svoju stránku Nová karta
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Prispôsobte si túto stránku
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Prispôsobiť
newtab-customize-panel-label =
    .label = Prispôsobiť
newtab-personalize-settings-icon-label =
    .title = Prispôsobte si Novú kartu
    .aria-label = Nastavenia
newtab-settings-dialog-label =
    .aria-label = Nastavenia
newtab-personalize-icon-label =
    .title = Prispôsobiť stránku novej karty
    .aria-label = Prispôsobiť stránku novej karty
newtab-personalize-dialog-label =
    .aria-label = Prispôsobiť
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Zavrieť
    .aria-label = Zavrieť

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Domovská stránka
home-homepage-new-windows =
    .label = Nové okná
home-homepage-new-tabs =
    .label = Nové karty
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Vyberte konkrétnu stránku

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Adresy webových stránok
home-custom-homepage-address =
    .placeholder = Zadajte adresu
home-custom-homepage-address-button =
    .label = Pridať adresu
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Zatiaľ neboli pridané žiadne webové stránky.
home-custom-homepage-delete-address-button =
    .aria-label = Odstrániť adresu
    .title = Odstrániť adresu
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Nahradiť s
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Aktuálne otvorené stránky
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Záložky…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Vyhľadávanie
home-prefs-stories-header2 =
    .label = Príbehy
    .description = Výnimočný obsah spravovaný rodinou { -brand-product-name }
home-prefs-widgets-header =
    .label = Miniaplikácie
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Zoznamy
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Časovač
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Šport
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Hodiny
home-prefs-mission-message2 =
    .message = Naši sponzori podporujú našu misiu budovať lepší web.
home-prefs-manage-topics-link2 =
    .label = Spravovať témy
home-prefs-choose-wallpaper-link2 =
    .label = Vybrať tapetu
home-prefs-firefox-logo-header =
    .label = Logo { -brand-short-name(case: "gen") }
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Ak chcete tieto funkcie používať, nastavte, aby sa pri otváraní nových kariet alebo okien načítavala { -firefox-home-brand-name }.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } riadok
            [few] { $num } riadky
           *[other] { $num } riadkov
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Rozšírenie ({ $extension })
home-restore-defaults-srd =
    .label = Obnoviť predvolené
    .accesskey = r
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (predvolené)
home-mode-choice-custom-srd =
    .label = Vlastné URL adresy…
home-mode-choice-blank-srd =
    .label = Prázdna stránka
home-prefs-shortcuts-header-srd =
    .label = Skratky
home-prefs-shortcuts-select =
    .aria-label = Skratky
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Sponzorované skratky
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Sponzorované stránky
home-prefs-highlights-option-visited-pages-srd =
    .label = Navštívené stránky
home-prefs-highlights-options-bookmarks-srd =
    .label = Záložky
home-prefs-highlights-option-most-recent-download-srd =
    .label = Nedávne sťahovania
home-prefs-recent-activity-header-srd =
    .label = Nedávna aktivita
home-prefs-recent-activity-select =
    .aria-label = Nedávna aktivita
home-prefs-weather-header-srd =
    .label = Počasie
home-prefs-support-firefox-header-srd =
    .label = Podpora pre { -brand-product-name(case: "acc") }
home-prefs-mission-message-learn-more-link-srd = Pozrite sa ako

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Hľadať
    .aria-label = Hľadať
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Vyhľadávajte cez { $engine } alebo zadajte webovú adresu
newtab-search-box-handoff-text-no-engine = Zadajte adresu alebo výraz vyhľadávania
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Vyhľadávajte cez { $engine } alebo zadajte webovú adresu
    .title = Vyhľadávajte cez { $engine } alebo zadajte webovú adresu
    .aria-label = Vyhľadávajte cez { $engine } alebo zadajte webovú adresu
newtab-search-box-handoff-input-no-engine =
    .placeholder = Zadajte adresu alebo výraz vyhľadávania
    .title = Zadajte adresu alebo výraz vyhľadávania
    .aria-label = Zadajte adresu alebo výraz vyhľadávania
newtab-search-box-text = Vyhľadávanie na webe
newtab-search-box-input =
    .placeholder = Vyhľadávanie na webe
    .aria-label = Vyhľadávanie na webe

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Pridať vyhľadávač
newtab-topsites-add-shortcut-header = Nová skratka
newtab-topsites-edit-topsites-header = Upraviť top stránku
newtab-topsites-edit-shortcut-header = Upraviť skratku
newtab-topsites-add-shortcut-label = Pridať skratku
newtab-topsites-add-shortcut-title =
    .title = Pridať skratku
    .aria-label = Pridať skratku
newtab-topsites-title-label = Názov
newtab-topsites-title-input =
    .placeholder = Zadajte názov
newtab-topsites-url-label = Adresa URL
newtab-topsites-url-input =
    .placeholder = Zadajte alebo prilepte adresu URL
newtab-topsites-url-validation = Vyžaduje sa platná adresa URL
newtab-topsites-image-url-label = Adresa URL vlastného obrázka
newtab-topsites-use-image-link = Použiť vlastný obrázok…
newtab-topsites-image-validation = Obrázok sa nepodarilo načítať. Skúste inú adresu URL.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Vymazať text

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Zrušiť
newtab-topsites-delete-history-button = Odstrániť z histórie
newtab-topsites-save-button = Uložiť
newtab-topsites-preview-button = Ukážka
newtab-topsites-add-button = Pridať

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Naozaj chcete odstrániť všetky výskyty tejto stránky z histórie prehliadania?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Túto akciu nie je možné vrátiť späť.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Sponzorované

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (pripnutá)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Otvorí ponuku
    .aria-label = Otvorí ponuku
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Odstrániť
    .aria-label = Odstrániť
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Otvorí ponuku
    .aria-label = Otvorí kontextovú ponuku pre { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Upraviť túto stránku
    .aria-label = Upraviť túto stránku

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Upraviť
newtab-menu-open-new-window = Otvoriť v novom okne
newtab-menu-open-new-private-window = Otvoriť v novom súkromnom okne
newtab-menu-dismiss = Skryť
newtab-menu-pin = Pripnúť
newtab-menu-unpin = Odopnúť
newtab-menu-delete-history = Odstrániť z histórie
newtab-menu-save-to-pocket = Uložiť do { -pocket-brand-name(case: "gen") }
newtab-menu-delete-pocket = Odstrániť z { -pocket-brand-name(case: "gen") }
newtab-menu-archive-pocket = Archivovať v { -pocket-brand-name(case: "loc") }
newtab-menu-show-privacy-info = Naši sponzori a vaše súkromie
newtab-menu-about-fakespot = Čo je { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Nahlásiť
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Blokovať
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Prestať sledovať
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Ďalšie informácie
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Prestať sledovať tému

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Spravovať sponzorovaný obsah
newtab-menu-our-sponsors-and-your-privacy = Naši sponzori a vaše súkromie
newtab-menu-report-this-ad = Nahlásiť túto reklamu

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Hotovo
newtab-privacy-modal-button-manage = Nastavenie sponzorovaného obsahu
newtab-privacy-modal-header = Na vašom súkromí záleží.
newtab-privacy-modal-paragraph-2 = Okrem zaujímavých článkov vám taktiež zobrazujeme relevantný a preverený obsah od vybraných sponzorov. Nemusíte sa báť, <strong>vaše údaje nikdy neopustia { -brand-product-name }</strong> - neodosielajú sa nám ani našim sponzorom.
newtab-privacy-modal-link = Ďalšie informácie o tom, ako funguje súkromie na stránke novej karty

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Odstrániť záložku
# Bookmark is a verb here.
newtab-menu-bookmark = Pridať medzi záložky

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Kopírovať adresu súboru
newtab-menu-go-to-download-page = Prejsť na stránku so súborom
newtab-menu-remove-download = Odstrániť z histórie

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Zobraziť vo Finderi
       *[other] Otvoriť priečinok so súborom
    }
newtab-menu-open-file = Otvoriť súbor

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Navštívené
newtab-label-bookmarked = V záložkách
newtab-label-removed-bookmark = Záložka bola odstránená
newtab-label-recommended = Trendy
newtab-label-saved = Uložené do { -pocket-brand-name(case: "gen") }
newtab-label-download = Stiahnuté
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Sponzorované
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Sponzorované spoločnosťou { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min.
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Sponzorované

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Odstrániť sekciu
newtab-section-menu-collapse-section = Zbaliť sekciu
newtab-section-menu-expand-section = Rozbaliť sekciu
newtab-section-menu-manage-section = Spravovať sekciu
newtab-section-menu-manage-webext = Spravovať rozšírenie
newtab-section-menu-add-topsite = Pridať top stránku
newtab-section-menu-add-search-engine = Pridať vyhľadávač
newtab-section-menu-move-up = Posunúť vyššie
newtab-section-menu-move-down = Posunúť nižšie
newtab-section-menu-privacy-notice = Vyhlásenie o ochrane osobných údajov

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Zbaliť sekciu
newtab-section-expand-section-label =
    .aria-label = Rozbaliť sekciu

## Section Headers.

newtab-section-header-topsites = Top stránky
newtab-section-header-recent-activity = Nedávna aktivita
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Odporúča { $provider }
newtab-section-header-stories = Príbehy na zamyslenie
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Dnešný výber pre vás

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Začnite s prehliadaním a my vám na tomto mieste ukážeme skvelé články, videá a ostatné stránky, ktoré ste nedávno navštívili alebo pridali medzi záložky.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Už ste prečítali všetko. Ďalšie príbehy zo služby { $provider } tu nájdete opäť neskôr. Nemôžete sa dočkať? Vyberte si populárnu tému a pozrite sa na ďalšie skvelé príbehy z celého webu.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Už ste prečítali všetko. Ďalšie príbehy tu nájdete neskôr. Neviete sa dočkať? Vyberte obľúbenú tému a nájdite ďalšie skvelé príbehy z celého webu.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Už ste prečítali všetko!
newtab-discovery-empty-section-topstories-content = Ďalšie príbehy tu nájdete opäť neskôr.
newtab-discovery-empty-section-topstories-try-again-button = Skúsiť znova
newtab-discovery-empty-section-topstories-loading = Načítava sa…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Hups! Túto sekciu sa nepodarilo načítať.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Populárne témy:
newtab-pocket-new-topics-title = Chcete ešte viac príbehov? Pozrite sa na tieto obľúbené témy z { -pocket-brand-name(case: "gen") }
newtab-pocket-more-recommendations = Ďalšie odporúčania
newtab-pocket-learn-more = Ďalšie informácie
newtab-pocket-cta-button = Získajte { -pocket-brand-name }
newtab-pocket-cta-text = Ukladajte si články do { -pocket-brand-name(case: "gen") } a užívajte si skvelé čítanie.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } je súčasťou rodiny { -brand-product-name(case: "gen") }
newtab-pocket-save = Uložiť
newtab-pocket-saved = Uložené

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Ďalšie podobné
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Nie je pre mňa
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Vďaka. Vaša spätná väzba nám pomôže zlepšiť váš informačný kanál.
newtab-toast-dismiss-button =
    .title = Zavrieť
    .aria-label = Zavrieť

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Objavte to najlepšie z webu
newtab-pocket-onboarding-cta = Služba { -pocket-brand-name } skúma rozmanitú škálu rôznych príspevkov, aby vám priniesla čo najviac informatívny, inšpiratívny a dôveryhodný obsah priamo do vášho prehliadača { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Hups, pri načítavaní tohto obsahu sa niečo pokazilo.
newtab-error-fallback-refresh-link = Obnovením stránky to skúsite znova.

## Customization Menu

newtab-custom-shortcuts-title = Skratky
newtab-custom-shortcuts-subtitle = Stránky, ktoré si uložíte alebo navštívite
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Skratky
    .description = Stránky, ktoré si uložíte alebo navštívite
newtab-custom-shortcuts-nova =
    .label = Skratky
newtab-custom-row-description =
    .description = Počet riadkov
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } riadok
            [few] { $num } riadky
           *[other] { $num } riadkov
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } riadok
        [few] { $num } riadky
       *[other] { $num } riadkov
    }
newtab-custom-sponsored-sites = Sponzorované skratky
newtab-custom-pocket-title = Odporúčané službou { -pocket-brand-name }
newtab-custom-pocket-subtitle = Výnimočný obsah vybraný službou { -pocket-brand-name }, ktorá je súčasťou rodiny { -brand-product-name(case: "gen") }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Odporúčané príbehy
    .description = Výnimočný obsah spravovaný rodinou { -brand-product-name }
newtab-recommended-stories-toggle =
    .label = Odporúčané príbehy
newtab-custom-stories-personalized-toggle =
    .label = Príbehy
newtab-custom-stories-personalized-checkbox-label = Prispôsobené príbehy na základe vašej aktivity
newtab-custom-pocket-sponsored = Sponzorované príbehy
newtab-custom-pocket-show-recent-saves = Zobraziť nedávno uložené položky
newtab-custom-recent-title = Nedávna aktivita
newtab-custom-recent-subtitle = Výber z nedávno navštívených stránok a obsahu
newtab-custom-weather-toggle =
    .label = Počasie
    .description = Dnešná predpoveď v skratke
newtab-custom-widget-weather-toggle =
    .label = Počasie
newtab-custom-widget-lists-toggle =
    .label = Zoznamy
newtab-custom-widget-timer-toggle =
    .label = Časovač
newtab-custom-widget-sports-toggle =
    .label = Majstrovstvá sveta
newtab-custom-widget-clock-toggle =
    .label = Hodiny
newtab-custom-widget-sports-toggle2 =
    .label = Šport
newtab-custom-widget-section-title = Miniaplikácie
newtab-custom-widget-section-toggle =
    .label = Miniaplikácie
newtab-widget-manage-title = Miniaplikácie
newtab-widget-manage-widget-button =
    .label = Spravovať miniaplikácie
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Zavrieť
    .aria-label = Ponuka Zavrieť
newtab-custom-close-button = Zavrieť
newtab-custom-settings = Ďalšie nastavenia

## New Tab Wallpapers

newtab-wallpaper-title = Tapety
newtab-wallpaper-reset = Obnoviť predvolenú tapetu
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Nahrať obrázok
newtab-wallpaper-add-an-image = Pridať obrázok
newtab-wallpaper-custom-color = Zvoľte farbu
newtab-wallpaper-toggle-title =
    .label = Tapety
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Obrázok prekročil limit veľkosti súboru { $file_size } MB. Skúste nahrať menší súbor.
newtab-wallpaper-error-upload-file-type = Nepodarilo sa nám nahrať váš súbor. Skúste to znova so súborom obrázka.
newtab-wallpaper-error-file-type = Nepodarilo sa nám nahrať váš súbor. Skúste to znova s iným typom súboru.
newtab-wallpaper-light-red-panda = Červená panda
newtab-wallpaper-light-mountain = Biela hora
newtab-wallpaper-light-sky = Obloha s fialovými a ružovými oblakmi
newtab-wallpaper-light-color = Modré, ružové a žlté tvary
newtab-wallpaper-light-landscape = Scenéria zahmlenej hory
newtab-wallpaper-light-beach = Pláž s palmou
newtab-wallpaper-dark-aurora = Polárna žiara
newtab-wallpaper-dark-color = Červené a modré tvary
newtab-wallpaper-dark-panda = Panda červená ukrytá v lese
newtab-wallpaper-dark-sky = Mestská scenéria s nočnou oblohou
newtab-wallpaper-dark-mountain = Horská scenéria
newtab-wallpaper-dark-city = Fialová mestská scenéria
newtab-wallpaper-dark-fox-anniversary = Líška na chodníku pri lese
newtab-wallpaper-light-fox-anniversary = Líška na trávnatom poli so zahmlenou horskou krajinou

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Plné farby
newtab-wallpaper-colors = Farby
newtab-wallpaper-blue = Modrá
newtab-wallpaper-light-blue = Svetlomodrá
newtab-wallpaper-light-purple = Svetlofialová
newtab-wallpaper-light-green = Svetlozelená
newtab-wallpaper-green = Zelená
newtab-wallpaper-beige = Béžová
newtab-wallpaper-yellow = Žltá
newtab-wallpaper-orange = Oranžová
newtab-wallpaper-pink = Ružová
newtab-wallpaper-light-pink = Svetloružová
newtab-wallpaper-red = Červená
newtab-wallpaper-dark-blue = Tmavomodrá
newtab-wallpaper-dark-purple = Tmavofialová
newtab-wallpaper-dark-green = Tmavozelená
newtab-wallpaper-brown = Hnedá

## Abstract

newtab-wallpaper-category-title-abstract = Abstraktné
newtab-wallpaper-abstract-green = Zelené tvary
newtab-wallpaper-abstract-blue = Modré tvary
newtab-wallpaper-abstract-purple = Fialové tvary
newtab-wallpaper-abstract-orange = Oranžové tvary
newtab-wallpaper-gradient-orange = Prechod oranžový a ružový
newtab-wallpaper-abstract-blue-purple = Modré a fialové tvary
newtab-wallpaper-abstract-white-curves = Biela s tieňovanými krivkami
newtab-wallpaper-abstract-purple-green = Gradient fialového a zeleného svetla
newtab-wallpaper-abstract-blue-purple-waves = Modré a fialové vlnité tvary
newtab-wallpaper-abstract-black-waves = Čierne vlnité tvary

## Firefox

newtab-wallpaper-category-title-photographs = Fotografie
newtab-wallpaper-beach-at-sunrise = Pláž pri východe slnka
newtab-wallpaper-beach-at-sunset = Pláž pri západe slnka
newtab-wallpaper-storm-sky = Búrková obloha
newtab-wallpaper-sky-with-pink-clouds = Obloha s ružovými oblakmi
newtab-wallpaper-red-panda-yawns-in-a-tree = Panda červená zíva na strome
newtab-wallpaper-white-mountains = Biele hory
newtab-wallpaper-hot-air-balloons = Rôzne farby teplovzdušných balónov počas dňa
newtab-wallpaper-starry-canyon = Modrá hviezdna noc
newtab-wallpaper-suspension-bridge = Sivá fotografia celoodpruženého mosta počas dňa
newtab-wallpaper-sand-dunes = Biele pieskové duny
newtab-wallpaper-palm-trees = Silueta kokosových paliem počas zlatej hodiny
newtab-wallpaper-blue-flowers = Detailná fotografia kvetov s modrými okvetnými lístkami
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Autor fotografie: <a data-l10n-name="name-link">{ $author_string }</a>, zdroj: <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Vyskúšajte nádych farieb
newtab-wallpaper-feature-highlight-content = Dodajte svojej novej karte svieži vzhľad pomocou tapiet.
newtab-wallpaper-feature-highlight-button = Rozumiem
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Zavrieť
    .aria-label = Zavrieť vyskakovacie okno
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Nebeské
newtab-wallpaper-celestial-lunar-eclipse = Zatmenie Mesiaca
newtab-wallpaper-celestial-earth-night = Nočná fotografia z nízkej obežnej dráhy Zeme
newtab-wallpaper-celestial-starry-sky = Hviezdna obloha
newtab-wallpaper-celestial-eclipse-time-lapse = Časozberné zatmenie Mesiaca
newtab-wallpaper-celestial-black-hole = Ilustrácia galaxie čiernej diery
newtab-wallpaper-celestial-river = Satelitný obraz rieky

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Pozrite si predpoveď od { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Sponzorované
newtab-weather-menu-change-location = Zmeniť lokalitu
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Hľadať lokalitu
    .aria-label = Hľadať lokalitu
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Použiť aktuálnu polohu
newtab-weather-menu-weather-display = Zobrazenie počasia
newtab-weather-todays-forecast = Dnešná predpoveď
newtab-weather-see-full-forecast = Zobraziť celú predpoveď
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Jednoduché
newtab-weather-menu-change-weather-display-simple = Prepnúť na jednoduché zobrazenie
newtab-weather-menu-weather-display-option-detailed = Podrobné
newtab-weather-menu-change-weather-display-detailed = Prepnúť na podrobné zobrazenie
newtab-weather-menu-temperature-units = Jednotky teploty
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celzius
newtab-weather-menu-change-temperature-units-fahrenheit = Prepnúť na stupne Fahrenheita
newtab-weather-menu-change-temperature-units-celsius = Prepnúť na stupne Celzia
newtab-weather-menu-hide-weather = Skryť počasie na novej karte
newtab-weather-menu-learn-more = Ďalšie informácie
newtab-weather-menu-detect-my-location = Zistiť moju polohu
# This message is shown if user is working offline
newtab-weather-error-not-available = Údaje o počasí nie sú momentálne k dispozícii.
newtab-weather-opt-in-see-weather = Chcete vidieť počasie pre vašu lokalitu?
newtab-weather-opt-in-not-now =
    .label = Teraz nie
newtab-weather-opt-in-yes =
    .label = Áno
newtab-weather-opt-in-headline = Získajte lokálnu predpoveď počasia
newtab-weather-opt-in-use-location =
    .label = Použiť polohu
newtab-weather-opt-in-choose-location = Vybrať lokalitu
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York City
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Najvyššia
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Najnižšia
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Pozrite si predpoveď od { $provider }
    .aria-description = { $provider } ∙ Sponzorované

## Topic Labels

newtab-topic-label-business = Podnikanie
newtab-topic-label-career = Kariéra
newtab-topic-label-education = Vzdelávanie
newtab-topic-label-arts = Zábava
newtab-topic-label-food = Jedlo
newtab-topic-label-health = Zdravie
newtab-topic-label-hobbies = Hranie hier
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Financie
newtab-topic-label-society-parenting = Rodičovstvo
newtab-topic-label-government = Politika
newtab-topic-label-education-science = Veda
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Zaujímavé tipy
newtab-topic-label-sports = Šport
newtab-topic-label-tech = Technológie
newtab-topic-label-travel = Cestovanie
newtab-topic-label-home = Dom a záhrada

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Vyberte témy na doladenie informačného kanála
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Vyberte si dve alebo viac tém. Naši odborní kurátori uprednostňujú príbehy prispôsobené vašim záujmom. Aktualizovať môžete kedykoľvek.
newtab-topic-selection-save-button = Uložiť
newtab-topic-selection-cancel-button = Zrušiť
newtab-topic-selection-button-maybe-later = Možno neskôr
newtab-topic-selection-privacy-link = Zistite, ako chránime a spravujeme údaje
newtab-topic-selection-button-update-interests = Aktualizujte svoje záujmy
newtab-topic-selection-button-pick-interests = Vyberte si svoje záujmy

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Sledovať
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Sledovať { $topic }
newtab-section-following-button = Sledované
newtab-section-unfollow-button = Prestať sledovať
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Sledovanie: Prestať sledovať { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Dolaďte si svoj feed
newtab-section-follow-highlight-subtitle = Sledujte svoje záujmy a uvidíte viac toho, čo sa vám páči.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Zablokovať
newtab-section-blocked-button = Zablokované
newtab-section-unblock-button = Odblokovať
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Sledovať tému { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Prestať sledovať tému { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Blokovať tému { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Odblokovať tému { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = Teraz nie
newtab-section-confirm-block-topic-p1 = Naozaj chcete zablokovať túto tému?
newtab-section-confirm-block-topic-p2 = Zablokované témy sa už nebudú zobrazovať vo vašom informačnom kanáli.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Blokovať { $topic }
newtab-section-block-cancel-button = Zrušiť

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Témy
newtab-section-manage-topics-button-v2 =
    .label = Spravovať témy
newtab-section-mangage-topics-followed-topics = Sledované
newtab-section-mangage-topics-followed-topics-empty-state = Zatiaľ nesledujete žiadne témy.
newtab-section-mangage-topics-blocked-topics = Zablokované
newtab-section-mangage-topics-blocked-topics-empty-state = Zatiaľ ste nezablokovali žiadne témy.
newtab-custom-wallpaper-title = Vlastné tapety sú tu
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Nahrajte svoju vlastnú tapetu alebo si vyberte vlastnú farbu a prispôsobte si svoj { -brand-product-name }.
newtab-custom-wallpaper-cta = Vyskúšajte to

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Vyberte si tapetu a prispôsobte si { -brand-product-name }
newtab-new-user-custom-wallpaper-subtitle = Vďaka vlastným tapetám a farbám sa budete cítiť ako doma na každej novej karte.
newtab-new-user-custom-wallpaper-cta = Vyskúšajte si to hneď teraz

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Práve dorazili nové tapety
newtab-wallpaper-feature-highlight-subtitle = Vyberte si svojho favorita a na každej novej karte sa budete cítiť ako doma.
newtab-wallpaper-feature-highlight-cta = Vyberte si tapetu

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Stiahnite si { -brand-product-name } pre mobilné zariadenia
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Naskenujte kód a bezpečne prehliadajte na cestách.
newtab-download-mobile-highlight-body-variant-b = Pokračujte tam, kde ste prestali. Synchronizujete svoje karty, heslá a ďalšie položky.
newtab-download-mobile-highlight-body-variant-c = Vedeli ste, že { -brand-product-name } si môžete vziať na cesty? Rovnaký prehliadač. Vo vrecku.
newtab-download-mobile-highlight-image =
    .aria-label = QR kód na stiahnutie { -brand-product-name(case: "gen") } pre mobilné zariadenia

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Vaše obľúbené položky na dosah ruky
newtab-shortcuts-highlight-subtitle = Pridajte si skratku, aby ste mali svoje obľúbené stránky dostupné na jedno kliknutie.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Prečo to nahlasujete?
newtab-report-ads-reason-not-interested =
    .label = Nemám záujem
newtab-report-ads-reason-inappropriate =
    .label = Je to nevhodné
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Videl som to príliš veľakrát
newtab-report-content-wrong-category =
    .label = Nesprávna kategória
newtab-report-content-outdated =
    .label = Zastarané
newtab-report-content-inappropriate-offensive =
    .label = Nevhodné alebo urážlivé
newtab-report-content-spam-misleading =
    .label = Spam alebo zavádzanie
newtab-report-content-requires-payment-subscription =
    .label = Vyžaduje platbu alebo predplatné
newtab-report-content-requires-payment-subscription-learn-more = Ďalšie informácie
newtab-report-cancel = Zrušiť
newtab-report-submit = Odoslať
newtab-toast-thanks-for-reporting =
    .message = Ďakujeme za nahlásenie.
newtab-toast-widgets-hidden =
    .message = Vyberte ikonu ceruzky a kedykoľvek znova pridajte miniaplikácie.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Teraz sledujete tému { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Už viac nesledujete tému { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Už sa vám nebudú zobrazovať články z témy { $topic }.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Možnosti sú nekonečné. Pridajte si svoju.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Nový
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Dokončené ({ $number })
newtab-widget-lists-celebration-headline = Dobrá práca
newtab-widget-lists-celebration-subhead = Vymazať všetko
newtab-widget-task-list-menu-copy = Kopírovať
newtab-widget-lists-menu-edit = Upraviť názov zoznamu
newtab-widget-lists-menu-edit2 =
    .aria-label = Upraviť názov zoznamu
newtab-widget-lists-menu-create = Vytvoriť nový zoznam
newtab-widget-lists-menu-delete = Odstrániť tento zoznam
newtab-widget-lists-menu-copy = Kopírovať zoznam do schránky
newtab-widget-lists-menu-learn-more = Ďalšie informácie
newtab-widget-lists-button-add-item = Pridať položku
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Pridať položku
    .aria-label = Pridať položku
newtab-widget-lists-input-error = Položku pridáte zadaním textu
newtab-widget-lists-input-menu-open-link = Otvoriť odkaz
newtab-widget-lists-input-menu-move-up = Posunúť nahor
newtab-widget-lists-input-menu-move-down = Posunúť nadol
newtab-widget-lists-input-menu-delete = Odstrániť
newtab-widget-lists-input-menu-edit = Upraviť
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Upraviť položku
newtab-widget-lists-edit-clear =
    .aria-label = Zrušiť
    .title = Zrušiť
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Vytvoriť nový zoznam
newtab-widget-lists-name-label-default =
    .label = Zoznam úloh
newtab-widget-lists-name-label-checklist =
    .label = Kontrolný zoznam
newtab-widget-lists-name-placeholder-default =
    .placeholder = Zoznam úloh
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Kontrolný zoznam
    .aria-label = Upraviť názov zoznamu
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Nový zoznam
    .aria-label = Upraviť názov zoznamu
newtab-widget-section-title = Miniaplikácie
newtab-widget-menu-hide = Skryť miniaplikáciu
newtab-widget-menu-change-size = Zmeniť veľkosť
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Presunúť
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Doľava
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Doprava
newtab-widget-size-small = Malá
newtab-widget-size-medium = Stredná
newtab-widget-size-large = Veľká
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Skryť miniaplikácie
    .aria-label = Skryť všetky miniaplikácie
newtab-widget-section-maximize =
    .title = Rozbaliť miniaplikácie
    .aria-label = Rozbaliť všetky miniaplikácie na plnú veľkosť
newtab-widget-section-minimize =
    .title = Minimalizovať miniaplikácie
    .aria-label = Zbaliť všetky miniaplikácie do kompaktnej veľkosti
newtab-widget-section-menu-button =
    .title = Ponuka Miniaplikácie
    .aria-label = Otvorí ponuku Miniaplikácie
newtab-widget-add-widgets-button =
    .aria-label = Pridať miniaplikáciu
    .title = Pridať miniaplikáciu
newtab-widget-section-menu-manage = Spravovať miniaplikácie
newtab-widget-section-menu-hide-all = Skryť miniaplikácie
newtab-widget-section-menu-learn-more = Ďalšie informácie
newtab-widget-section-feedback = Povedzte nám váš názor
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Zobraziť ďalšie miniaplikácie
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Zobraziť menej miniaplikácií
newtab-widget-lists-name-default = Kontrolný zoznam

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Časovač
newtab-widget-timer-notification-focus = Čas na sústredenie vypršal. Dobrá práca. Potrebujete si oddýchnuť?
newtab-widget-timer-notification-break = Vaša prestávka sa skončila. Ste pripravení sústrediť sa?
newtab-widget-timer-notification-warning = Upozornenia sú vypnuté
newtab-widget-timer-mode-focus =
    .label = Sústredenie
newtab-widget-timer-mode-break =
    .label = Prestávka
newtab-widget-timer-label-play =
    .label = Spustiť
newtab-widget-timer-label-pause =
    .label = Pozastaviť
newtab-widget-timer-reset =
    .title = Vynulovať
newtab-widget-timer-menu-notifications = Vypnúť upozornenia
newtab-widget-timer-menu-notifications-on = Zapnúť upozornenia
newtab-widget-timer-menu-learn-more = Ďalšie informácie
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Najlepšie titulky
newtab-daily-briefing-card-menu-dismiss = Zavrieť
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Aktualizované pred { $minutes } min.
newtab-widget-message-title = Zostaňte sústredení vďaka zoznamom a vstavanému časovaču
# to-dos stands for "things to do".
newtab-widget-message-copy = Od rýchlych pripomienok až po denné úlohy, od sústredených stretnutí až po prestávky – sústreďte sa na úlohy a dodržujte čas.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Jedno miesto pre sústredenie, predpovede počasia a ďalšie
newtab-widget-message-focus-forecasts-body = Využite svoj deň naplno s miniaplikáciami vo { -brand-product-name(case: "loc") }. Pozrite si predpoveď počasia, sústreďte sa na úlohy alebo sledujte čas na celom svete.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Prispôsobte si { -brand-product-name(case: "acc") }
newtab-promo-card-body-addons = Vyberte si tapetu z našej kolekcie alebo si vytvorte vlastnú.
newtab-promo-card-cta-addons = Vyskúšajte si to teraz
newtab-promo-card-title = Podporiť { -brand-product-name }
newtab-promo-card-body = Naši sponzori podporujú našu misiu budovať lepší web
newtab-promo-card-cta = Ďalšie informácie
newtab-promo-card-dismiss-button =
    .title = Zavrieť
    .aria-label = Zavrieť

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] Spustiť časovač na { $minutes } minútu
            [few] Spustiť časovač na { $minutes } minúty
            [many] Spustiť časovač na { $minutes } minút
           *[other] Spustiť časovač na { $minutes } minút
        }
newtab-widget-timer-pause-aria =
    .aria-label = Pozastaviť časovač
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } minúta
            [few] { $minutes } minúty
            [many] { $minutes } minút
           *[other] { $minutes } minút
        }
newtab-widget-timer-decrease-min =
    .title = Skrátiť o 1 minútu
newtab-widget-timer-increase-min =
    .title = Predĺžiť o 1 minútu
newtab-widget-timer-mode-group =
    .aria-label = Režim časovača
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Sústredenie
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Prestávka
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Skryť časovač
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Dobrá práca
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Tvoja prestávka sa skončila
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Potrebujete si oddýchnuť?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Pripravení sústrediť sa?

##

newtab-sports-widget-menu-follow-teams = Sledovať tímy
newtab-sports-widget-menu-view-schedule = Zobraziť rozpis zápasov
newtab-sports-widget-menu-view-upcoming = Zobraziť nadchádzajúce
newtab-sports-widget-menu-view-results = Zobraziť výsledky
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Kľúčové dátumy
newtab-sports-widget-menu-learn-more = Ďalšie informácie
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Sledujte Majstrovstvá sveta vo futbale
newtab-sports-widget-get-updates = Získajte živé aktualizácie zápasov a ďalšie informácie.
newtab-sports-widget-view-schedule =
    .label = Zobraziť rozpis zápasov
newtab-sports-widget-follow-teams =
    .label = Sledovať tímy
newtab-sports-widget-view-matches =
    .label = Zobraziť zápasy
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Sledujte { $number } tím
        [few] Sledujte { $number } tímy
        [many] Sledujte { $number } tímov
       *[other] Sledujte { $number } tímov
    }
newtab-sports-widget-choose-wallpaper =
    .label = Vyberte si tapetu
newtab-sports-widget-skip = Preskočiť
newtab-sports-widget-search-country =
    .placeholder = Hľadať krajinu
    .aria-label = Hľadať krajinu
newtab-sports-widget-cancel = Zrušiť
newtab-sports-widget-back-button =
    .aria-label = Naspäť
newtab-sports-widget-done-button =
    .label = Hotovo
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (vyradený)
newtab-sports-widget-view-all =
    .label = Zobraziť všetky
newtab-sports-widget-show-less =
    .label = Zobraziť menej
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Iba sledované tímy
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Sledovať
    .title = Sledovať naživo
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Sledovať naživo
    .title = Sledovať naživo
newtab-sports-widget-watch-dialog-close =
    .aria-label = Zavrieť
    .title = Zavrieť
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Zadarmo
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Bezplatná skúšobná doba
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Zadarmo aj platené
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Platené
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Iba vybrané zápasy
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Dostupné vo vašom regióne
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Ostatné regióny
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Otvoriť stream
    .title = Otvoriť stream
newtab-sports-widget-group-stage = Skupinová fáza
newtab-sports-widget-group-a = Skupina A
newtab-sports-widget-group-b = Skupina B
newtab-sports-widget-group-c = Skupina C
newtab-sports-widget-group-d = Skupina D
newtab-sports-widget-group-e = Skupina E
newtab-sports-widget-group-f = Skupina F
newtab-sports-widget-group-g = Skupina G
newtab-sports-widget-group-h = Skupina H
newtab-sports-widget-group-i = Skupina I
newtab-sports-widget-group-j = Skupina J
newtab-sports-widget-group-k = Skupina K
newtab-sports-widget-group-l = Skupina L
newtab-sports-widget-round-32 = Najlepších 32
newtab-sports-widget-round-16 = Najlepších 16
newtab-sports-widget-quarter-finals = Štvrťfinále
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = NAŽIVO
newtab-custom-widget-live-refresh =
    .title = Aktualizovať skóre
    .aria-label = Aktualizovať skóre
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Kľúčové dátumy
newtab-sports-widget-upcoming = Nadchádzajúce
# Used for a match currently ongoing
newtab-sports-widget-now = Teraz
newtab-sports-widget-results = Výsledky
newtab-sports-widget-semi-finals = Semifinále
newtab-sports-widget-bronze-finals = O tretie miesto
# Final is the final match for 1st place.
newtab-sports-widget-final = Finále
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Oneskorené
newtab-sports-widget-postponed = Odložené
newtab-sports-widget-suspended = Pozastavené
newtab-sports-widget-cancelled = Zrušené
newtab-sports-widget-information = Informácie o zápase
newtab-sports-widget-no-live-data = Údaje o zápasoch sa momentálne neaktualizujú
newtab-sports-widget-view-results-link = Zobraziť výsledky
newtab-sports-widget-third-place = Tretie miesto
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Druhé miesto
newtab-sports-widget-champions = Víťaz
newtab-sports-widget-world-cup-champions = Majstrovstvá sveta vo futbale 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Koniec zápasu
newtab-sports-widget-match-halftime = Polčas
newtab-sports-widget-match-extra-time = Predĺženie
newtab-sports-widget-match-penalties = Penalty
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = -
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Sledujte nás, čoskoro uverejníme podrobnosti o nadchádzajúcom zápase

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Predchádzajúci
    .title = Predchádzajúci
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Nasledujúci
    .title = Nasledujúci
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Prebiehajúci zápas { $index } z { $total }
    .title = Prebiehajúci zápas { $index } z { $total }

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
    .aria-label = { $homeTeam }  { $homeScore } - { $awayTeam }  { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }  { $homeScore } ({ $homePenalty }) - { $awayTeam }  { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Naživo: { $homeTeam }  { $homeScore } - { $awayTeam }  { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } - { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } - { $awayTeam }, meškanie
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } - { $awayTeam }, odložené
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } - { $awayTeam }, prerušené
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } - { $awayTeam }, zrušené

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosna a Hercegovina
newtab-sports-widget-team-name-label-civ =
    .label = Pobrežie Slonoviny
newtab-sports-widget-team-name-label-cod =
    .label = DR Kongo
newtab-sports-widget-team-name-label-eng =
    .label = Anglicko
newtab-sports-widget-team-name-label-sco =
    .label = Škótsko
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Bude upresnené

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Začnite Majstrovstvá sveta vo futbale s novými tapetami
newtab-sports-widget-message-wallpapers-body = Prineste si do prehliadača energiu na zápasový deň počas turnaja.
newtab-sports-widget-message-wallpapers-cta = Vyberte si tapetu
newtab-sports-widget-message-add-widgets-cta =
    .label = Pridať miniaplikácie
newtab-sports-widget-message-day-in-play-title = Využite svoj deň naplno s miniaplikáciami vo { -brand-product-name(case: "loc") }
newtab-sports-widget-message-day-in-play-body = Sledujte Majstrovstvá sveta, sústreďte sa na úlohy, sledujte čas po celom svete a mnoho ďalšieho.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Preskúmajte miniaplikácie

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Zavrieť
    .aria-label = Zavrieť
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Prispôsobte si tento priestor
newtab-activation-window-message-customization-focus-message = Vyberte si novú tapetu, pridajte odkazy na svoje obľúbené stránky a zostaňte v obraze o príbehoch, ktoré vás zaujímajú.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Začať prispôsobovať
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Tento priestor sa riadi vašimi pravidlami
newtab-activation-window-message-values-focus-message = { -brand-product-name } vám umožňuje prehliadať internet tak, ako sa vám páči, s osobnejším spôsobom, ako začať svoj online deň. Prispôsobte si { -brand-product-name(case: "acc") }.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Skryť hodiny
newtab-clock-widget-menu-learn-more = Ďalšie informácie
newtab-clock-widget-menu-edit = Upraviť hodiny
newtab-clock-widget-menu-switch-to-12h = Prepnúť na 12‑hodinový formát
newtab-clock-widget-menu-switch-to-24h = Prepnúť na 24‑hodinový formát
newtab-clock-widget-label-your-clocks = Vaše hodiny
newtab-clock-widget-search-location-input =
    .label = Lokalita
    .placeholder = Vyhľadať lokalitu
    .aria-label = Vyhľadať lokalitu
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Prezývka (voliteľné)
    .placeholder = Pridať prezývku
    .aria-label = Prezývka (voliteľné)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Pridať nové hodiny
    .aria-label = Pridať nové hodiny
newtab-clock-widget-button-add-clock = Pridať
newtab-clock-widget-button-cancel = Zrušiť
newtab-clock-widget-button-back =
    .title = Naspäť
    .aria-label = Naspäť
newtab-clock-widget-button-edit-clock =
    .title = Upraviť hodiny
    .aria-label = Upraviť hodiny
newtab-clock-widget-button-save = Uložiť
newtab-clock-widget-button-remove-clock =
    .title = Odstrániť hodiny
    .aria-label = Odstrániť hodiny
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
    .aria-label = { $city }, prezývka: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Pridať hodiny
newtab-clock-widget-edit-clock-form =
    .aria-label = Upraviť hodiny
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Výsledky vyhľadávania
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Nenájdené
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Otvoriť ponuku hodín
    .aria-label = Otvoriť ponuku hodín
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Prezývka: { $nickname }
