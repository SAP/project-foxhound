# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Nový panel
newtab-settings-button =
    .title = Přizpůsobení stránky nového panelu
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Přizpůsobte si tuto stránku
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Přizpůsobit
newtab-customize-panel-label =
    .label = Přizpůsobit
newtab-personalize-settings-icon-label =
    .title = Přizpůsobení nového panelu
    .aria-label = Nastavení
newtab-settings-dialog-label =
    .aria-label = Nastavení
newtab-personalize-icon-label =
    .title = Přizpůsobení nového panelu
    .aria-label = Přizpůsobení nového panelu
newtab-personalize-dialog-label =
    .aria-label = Přizpůsobit
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Zavřít
    .aria-label = Zavřít

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Domovská stránka
home-homepage-new-windows =
    .label = Nová okna
home-homepage-new-tabs =
    .label = V novém panelu
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Zvolte konkrétní stránku

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Adresy webových stránek
home-custom-homepage-address =
    .placeholder = Zadejte webovou adresu
home-custom-homepage-address-button =
    .label = Přidat adresu
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Dosud nebyly přidány žádné stránky.
home-custom-homepage-delete-address-button =
    .aria-label = Smazat adresu
    .title = Smazat adresu
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Nahradit s
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Právě otevřené stránky
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Záložky…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Hledat
home-prefs-stories-header2 =
    .label = Příběhy
    .description = Výjimečný obsah od rodiny { -brand-product-name(case: "gen") }
home-prefs-widgets-header =
    .label = Widgety
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Seznamy
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Časovač
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Sporty
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Hodiny
home-prefs-mission-message2 =
    .message = Naši sponzoři podporují naši misi budovat lepší web.
home-prefs-manage-topics-link2 =
    .label = Správa témat
home-prefs-choose-wallpaper-link2 =
    .label = Zvolte si tapetu
home-prefs-firefox-logo-header =
    .label =
        { -brand-short-name.case-status ->
            [with-cases] Logo { -brand-short-name(case: "gen") }
           *[no-cases] Logo aplikace { -brand-short-name }
        }
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Chcete-li tyto funkce využívat, nastavte pro nové panely nebo okna načítání { -firefox-home-brand-name }.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } řádek
            [few] { $num } řádky
           *[other] { $num } řádků
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Rozšíření ({ $extension })
home-restore-defaults-srd =
    .label = Obnovit výchozí
    .accesskey = O
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (výchozí)
home-mode-choice-custom-srd =
    .label = Vlastní adresy…
home-mode-choice-blank-srd =
    .label = Prázdná stránka
home-prefs-shortcuts-header-srd =
    .label = Zkratky
home-prefs-shortcuts-select =
    .aria-label = Zkratky
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Sponzorované zkratky
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Sponzorované příběhy
home-prefs-highlights-option-visited-pages-srd =
    .label = Navštívené stránky
home-prefs-highlights-options-bookmarks-srd =
    .label = Záložky
home-prefs-highlights-option-most-recent-download-srd =
    .label = Nedávná stahování
home-prefs-recent-activity-header-srd =
    .label = Nedávná aktivita
home-prefs-recent-activity-select =
    .aria-label = Nedávná aktivita
home-prefs-weather-header-srd =
    .label = Počasí
home-prefs-support-firefox-header-srd =
    .label =
        { -brand-product-name.case-status ->
            [with-cases] Podpora { -brand-product-name(case: "gen") }
           *[no-cases] Podpora aplikace { -brand-product-name }
        }
home-prefs-mission-message-learn-more-link-srd = Zjistěte jak

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Vyhledat
    .aria-label = Vyhledat
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Zadejte webovou adresu nebo dotaz pro vyhledávač { $engine }
newtab-search-box-handoff-text-no-engine = Zadejte webovou adresu nebo dotaz pro vyhledávač
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Zadejte webovou adresu nebo dotaz pro vyhledávač { $engine }
    .title = Zadejte webovou adresu nebo dotaz pro vyhledávač { $engine }
    .aria-label = Zadejte webovou adresu nebo dotaz pro vyhledávač { $engine }
newtab-search-box-handoff-input-no-engine =
    .placeholder = Zadejte webovou adresu nebo dotaz pro vyhledávač
    .title = Zadejte webovou adresu nebo dotaz pro vyhledávač
    .aria-label = Zadejte webovou adresu nebo dotaz pro vyhledávač
newtab-search-box-text = Vyhledat na webu
newtab-search-box-input =
    .placeholder = Vyhledat na webu
    .aria-label = Vyhledat na webu

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Přidat vyhledávač
newtab-topsites-add-shortcut-header = Nová zkratka
newtab-topsites-edit-topsites-header = Upravit top stránku
newtab-topsites-edit-shortcut-header = Upravit zkratku
newtab-topsites-add-shortcut-label = Přidat zkratku
newtab-topsites-add-shortcut-title =
    .title = Přidat zkratku
    .aria-label = Přidat zkratku
newtab-topsites-title-label = Název stránky
newtab-topsites-title-input =
    .placeholder = Zadejte název
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Zadejte nebo vložte adresu URL
newtab-topsites-url-validation = Je vyžadována platná URL
newtab-topsites-image-url-label = Adresa URL vlastního obrázku
newtab-topsites-use-image-link = Použít vlastní obrázek…
newtab-topsites-image-validation = Obrázek se nepodařilo načíst. Zkuste jinou adresu URL.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Smazat text

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Zrušit
newtab-topsites-delete-history-button = Smazat z historie
newtab-topsites-save-button = Uložit
newtab-topsites-preview-button = Náhled
newtab-topsites-add-button = Přidat

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Opravdu chcete smazat všechny výskyty této stránky z historie vašeho prohlížení?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Tuto akci nelze vzít zpět.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Sponzorováno

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (připnuta)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Otevře nabídku
    .aria-label = Otevře nabídku
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Odstranit
    .aria-label = Odstranit
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Otevře nabídku
    .aria-label = Otevřít kontextovou nabídku pro { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Upravit tuto stránku
    .aria-label = Upravit tuto stránku

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Upravit
newtab-menu-open-new-window = Otevřít v novém okně
newtab-menu-open-new-private-window = Otevřít v novém anonymním okně
newtab-menu-dismiss = Skrýt
newtab-menu-pin = Připnout
newtab-menu-unpin = Odepnout
newtab-menu-delete-history = Smazat z historie
newtab-menu-save-to-pocket = Uložit do { -pocket-brand-name(case: "gen") }
newtab-menu-delete-pocket = Smazat z { -pocket-brand-name(case: "gen") }
newtab-menu-archive-pocket = Archivovat do { -pocket-brand-name(case: "gen") }
newtab-menu-show-privacy-info = Naši sponzoři a vaše soukromí
newtab-menu-about-fakespot = Co je { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Nahlásit
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Blokovat
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Přestat sledovat
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Zjistit více
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Přestat sledovat téma

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Správa sponzorovaného obsahu
newtab-menu-our-sponsors-and-your-privacy = Naši sponzoři a vaše soukromí
newtab-menu-report-this-ad = Nahlásit tuto reklamu

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Hotovo
newtab-privacy-modal-button-manage = Nastavení sponzorovaného obsahu
newtab-privacy-modal-header = Na vašem soukromí záleží.
newtab-privacy-modal-paragraph-2 =
    { -brand-product-name.gender ->
        [masculine] Kromě zajímavých příběhů zobrazujeme také relevantní a prověřený obsah od vybraných partnerů. Nemusíte se ale bát, <strong>vaše údaje nikdy neopustí váš { -brand-product-name(case: "acc") }</strong> - neodesílají se nám ani našim partnerům.
        [feminine] Kromě zajímavých příběhů zobrazujeme také relevantní a prověřený obsah od vybraných partnerů. Nemusíte se ale bát, <strong>vaše údaje nikdy neopustí vaši { -brand-product-name(case: "acc") }</strong> - neodesílají se nám ani našim partnerům.
        [neuter] Kromě zajímavých příběhů zobrazujeme také relevantní a prověřený obsah od vybraných partnerů. Nemusíte se ale bát, <strong>vaše údaje nikdy neopustí vaše { -brand-product-name(case: "acc") }</strong> - neodesílají se nám ani našim partnerům.
       *[other] Kromě zajímavých příběhů zobrazujeme také relevantní a prověřený obsah od vybraných partnerů. Nemusíte se ale bát, <strong>vaše údaje nikdy neopustí vaši aplikaci { -brand-product-name }</strong> - neodesílají se nám ani našim partnerům.
    }
newtab-privacy-modal-link = Zjistěte, jak chráníme vaše soukromí na stránce nového panelu.

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Odebrat záložku
# Bookmark is a verb here.
newtab-menu-bookmark = Přidat do záložek

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Kopírovat stahovaný odkaz
newtab-menu-go-to-download-page = Přejít na stránku stahování
newtab-menu-remove-download = Odstranit z historie

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Zobrazit ve Finderu
       *[other] Otevřít složku
    }
newtab-menu-open-file = Otevřít soubor

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Navštívené
newtab-label-bookmarked = V záložkách
newtab-label-removed-bookmark = Záložka odebrána
newtab-label-recommended = Populární
newtab-label-saved = Uloženo do { -pocket-brand-name(case: "gen") }
newtab-label-download = Staženo
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · sponzrováno
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Sponzorováno společností { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min.
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Sponzorováno

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Odebrat sekci
newtab-section-menu-collapse-section = Sbalit sekci
newtab-section-menu-expand-section = Rozbalit sekci
newtab-section-menu-manage-section = Nastavení sekce
newtab-section-menu-manage-webext = Správa rozšíření
newtab-section-menu-add-topsite = Přidat mezi top stránky
newtab-section-menu-add-search-engine = Přidat vyhledávač
newtab-section-menu-move-up = Posunout nahoru
newtab-section-menu-move-down = Posunout dolů
newtab-section-menu-privacy-notice = Zásady ochrany osobních údajů

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Sbalit sekci
newtab-section-expand-section-label =
    .aria-label = Rozbalit sekci

## Section Headers.

newtab-section-header-topsites = Top stránky
newtab-section-header-recent-activity = Nedávná aktivita
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Doporučení ze služby { $provider }
newtab-section-header-stories = Podnětné příběhy
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Dnešní výběr pro vás

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Začněte prohlížet a my vám zde ukážeme některé skvělé články, videa a další stránky, které jste nedávno viděli nebo uložili do záložek.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Už jste všechno přečetli. Další příběhy ze služby { $provider } tu najdete zase později. Ale pokud se nemůžete dočkat, vyberte své oblíbené téma a podívejte se na další velké příběhy z celého webu.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Už jste všechno přečetli. Další příběhy zde najdete později. Nechcete čekat? Vyberte si oblíbené téma a najděte další skvělé příběhy z celého webu.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Už jste všechno přečetli.
newtab-discovery-empty-section-topstories-content = Další příběhy zde najdete později.
newtab-discovery-empty-section-topstories-try-again-button = Zkusit znovu
newtab-discovery-empty-section-topstories-loading = Načítání…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Jejda, při načítání obsahu se něco pokazilo.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Oblíbená témata:
newtab-pocket-new-topics-title = Chcete další příběhy? Podívejte se na oblíbené témata v { -pocket-brand-name(case: "loc") }.
newtab-pocket-more-recommendations = Další doporučení
newtab-pocket-learn-more = Zjistit více
newtab-pocket-cta-button = Získejte { -pocket-brand-name(case: "acc") }
newtab-pocket-cta-text = Ukládejte si příběhy do { -pocket-brand-name(case: "gen") } a užívejte si skvělé čtení.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } je součástí rodiny { -brand-product-name(case: "gen") }
newtab-pocket-save = Uložit
newtab-pocket-saved = Uloženo

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Další podobné
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Ne pro mě
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Děkujeme. Vaše zpětná vazba nám pomůže váš informační kanál vylepšit.
newtab-toast-dismiss-button =
    .title = Zavřít
    .aria-label = Zavřít

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Objevte to nejlepší na webu
newtab-pocket-onboarding-cta =
    { -brand-product-name.case-status ->
        [with-cases] { -pocket-brand-name } prozkoumává rozmanitou škálu publikací a přináší informativní, inspirativní a důvěryhodný obsah přímo do { -brand-product-name(case: "gen") }.
       *[no-cases] { -pocket-brand-name } prozkoumává rozmanitou škálu publikací a přináší informativní, inspirativní a důvěryhodný obsah přímo do prohlížeče { -brand-product-name }.
    }

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Jejda, při načítání tohoto obsahu se něco pokazilo.
newtab-error-fallback-refresh-link = Opětovným načtením stránky to zkuste znovu.

## Customization Menu

newtab-custom-shortcuts-title = Zkratky
newtab-custom-shortcuts-subtitle = Uložené nebo navštěvované stránky
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Zkratky
    .description = Uložené nebo navštěvované stránky
newtab-custom-shortcuts-nova =
    .label = Zkratky
newtab-custom-row-description =
    .description = Počet řádků
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } řádek
            [few] { $num } řádky
           *[other] { $num } řádků
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } řádek
        [few] { $num } řádky
       *[other] { $num } řádků
    }
newtab-custom-sponsored-sites = Sponzorované zkratky
newtab-custom-pocket-title = Doporučeno službou { -pocket-brand-name }
newtab-custom-pocket-subtitle = Výjimečný obsah vybraný službou { -pocket-brand-name }, která je součástí rodiny { -brand-product-name(case: "gen") }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Doporučené příběhy
    .description = Výjimečný obsah spravovaný rodinou { -brand-product-name(case: "gen") }
newtab-recommended-stories-toggle =
    .label = Doporučené příběhy
newtab-custom-stories-personalized-toggle =
    .label = Příběhy
newtab-custom-stories-personalized-checkbox-label = Personalizované příběhy na základě vaší aktivity
newtab-custom-pocket-sponsored = Sponzorované příběhy
newtab-custom-pocket-show-recent-saves = Zobrazit nedávno uložené
newtab-custom-recent-title = Nedávná aktivita
newtab-custom-recent-subtitle = Výběr z nedávných stránek a obsahu
newtab-custom-weather-toggle =
    .label = Počasí
    .description = Dnešní předpověď v kostce
newtab-custom-widget-weather-toggle =
    .label = Počasí
newtab-custom-widget-lists-toggle =
    .label = Seznamy
newtab-custom-widget-timer-toggle =
    .label = Časovač
newtab-custom-widget-sports-toggle =
    .label = Světový šampionát
newtab-custom-widget-clock-toggle =
    .label = Hodiny
newtab-custom-widget-sports-toggle2 =
    .label = Sporty
newtab-custom-widget-section-title = Widgety
newtab-custom-widget-section-toggle =
    .label = Widgety
newtab-widget-manage-title = Widgety
newtab-widget-manage-widget-button =
    .label = Spravovat widgety
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Zavřít
    .aria-label = Zavřít nabídku
newtab-custom-close-button = Zavřít
newtab-custom-settings = Další nastavení

## New Tab Wallpapers

newtab-wallpaper-title = Tapety
newtab-wallpaper-reset = Obnovit výchozí nastavení
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Nahrát obrázek
newtab-wallpaper-add-an-image = Přidat obrázek
newtab-wallpaper-custom-color = Vybrat barvu
newtab-wallpaper-toggle-title =
    .label = Tapety
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Obrázek překročil limit velikosti souboru { $file_size } MB. Zkuste nahrát menší soubor.
newtab-wallpaper-error-upload-file-type = Váš soubor se nám nepodařilo nahrát. Zkuste to prosím znovu se souborem obrázku.
newtab-wallpaper-error-file-type = Váš soubor se nám nepodařilo nahrát. Zkuste to prosím znovu s jiným typem souboru.
newtab-wallpaper-light-red-panda = Panda červená
newtab-wallpaper-light-mountain = Bílá hora
newtab-wallpaper-light-sky = Obloha s fialovými a růžovými mraky
newtab-wallpaper-light-color = Modré, růžové a žluté tvary
newtab-wallpaper-light-landscape = Horská krajina s modrou mlhou
newtab-wallpaper-light-beach = Pláž s palmou
newtab-wallpaper-dark-aurora = Polární záře
newtab-wallpaper-dark-color = Červené a modré tvary
newtab-wallpaper-dark-panda = Panda červená ukrytá v lese
newtab-wallpaper-dark-sky = Městská krajina s noční oblohou
newtab-wallpaper-dark-mountain = Horská scenérie
newtab-wallpaper-dark-city = Fialová krajina města
newtab-wallpaper-dark-fox-anniversary = Liška na chodníku u lesa
newtab-wallpaper-light-fox-anniversary = Liška na louce se zamlženou horskou krajinou

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Jednobarevné
newtab-wallpaper-colors = Barvy
newtab-wallpaper-blue = Modrá
newtab-wallpaper-light-blue = Světle modrá
newtab-wallpaper-light-purple = Světle fialová
newtab-wallpaper-light-green = Světle zelená
newtab-wallpaper-green = Zelená
newtab-wallpaper-beige = Béžová
newtab-wallpaper-yellow = Žlutá
newtab-wallpaper-orange = Oranžová
newtab-wallpaper-pink = Růžová
newtab-wallpaper-light-pink = Světle růžová
newtab-wallpaper-red = Červená
newtab-wallpaper-dark-blue = Tmavě modrá
newtab-wallpaper-dark-purple = Tmavě fialová
newtab-wallpaper-dark-green = Tmavě zelená
newtab-wallpaper-brown = Hnědá

## Abstract

newtab-wallpaper-category-title-abstract = Abstraktní
newtab-wallpaper-abstract-green = Zelené tvary
newtab-wallpaper-abstract-blue = Modré tvary
newtab-wallpaper-abstract-purple = Fialové tvary
newtab-wallpaper-abstract-orange = Oranžové tvary
newtab-wallpaper-gradient-orange = Přechod oranžové a růžové
newtab-wallpaper-abstract-blue-purple = Modré a fialové tvary
newtab-wallpaper-abstract-white-curves = Bílá se stínovanými křivkami
newtab-wallpaper-abstract-purple-green = Přechod fialové a zelené barvy
newtab-wallpaper-abstract-blue-purple-waves = Modré a fialové zvlněné tvary
newtab-wallpaper-abstract-black-waves = Černé zvlněné tvary

## Firefox

newtab-wallpaper-category-title-photographs = Fotografie
newtab-wallpaper-beach-at-sunrise = Pláž při východu slunce
newtab-wallpaper-beach-at-sunset = Pláž při západu slunce
newtab-wallpaper-storm-sky = Bouřková obloha
newtab-wallpaper-sky-with-pink-clouds = Obloha s růžovými obláčky
newtab-wallpaper-red-panda-yawns-in-a-tree = Panda červená zívá na stromě
newtab-wallpaper-white-mountains = Bílé hory
newtab-wallpaper-hot-air-balloons = Různé barvy horkovzdušných balonů během dne
newtab-wallpaper-starry-canyon = Modrá hvězdná noc
newtab-wallpaper-suspension-bridge = Šedivé fotografování celé visuté můstky během dne
newtab-wallpaper-sand-dunes = Bílé písečné duny
newtab-wallpaper-palm-trees = Silueta kokosových palem během zlaté hodiny
newtab-wallpaper-blue-flowers = Detailní fotografie modrých okvětních lístků v květu
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Fotografie od autora <a data-l10n-name="name-link">{ $author_string }</a> z webu <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Zkuste barevný nádech
newtab-wallpaper-feature-highlight-content = Dejte svému novému panelu svěží vzhled pomocí tapet.
newtab-wallpaper-feature-highlight-button = Rozumím
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Zavřít
    .aria-label = Zavře okno
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Nebeská
newtab-wallpaper-celestial-lunar-eclipse = Zatmění Měsíce
newtab-wallpaper-celestial-earth-night = Noční fotografie z nízké oběžné dráhy Země
newtab-wallpaper-celestial-starry-sky = Hvězdná obloha
newtab-wallpaper-celestial-eclipse-time-lapse = Časosběrné snímání zatmění Měsíce
newtab-wallpaper-celestial-black-hole = Ilustrace galaxie Černá díra
newtab-wallpaper-celestial-river = Satelitní snímek řeky

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Podívejte se na předpověď od { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙Sponzorované
newtab-weather-menu-change-location = Změnit místo
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Hledat umístění
    .aria-label = Hledat umístění
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Použít aktuální polohu
newtab-weather-menu-weather-display = Zobrazení počasí
newtab-weather-todays-forecast = Dnešní předpověď
newtab-weather-see-full-forecast = Zobrazit úplnou předpověď
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Jednoduché
newtab-weather-menu-change-weather-display-simple = Přepnout na jednoduché zobrazení
newtab-weather-menu-weather-display-option-detailed = Podrobné
newtab-weather-menu-change-weather-display-detailed = Přepnout na podrobné zobrazení
newtab-weather-menu-temperature-units = Jednotky teploty
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Přepnout na stupně Fahrenheita
newtab-weather-menu-change-temperature-units-celsius = Přepnout na stupně Celsia
newtab-weather-menu-hide-weather = Skrýt počasí na novém panelu
newtab-weather-menu-learn-more = Zjistit více
newtab-weather-menu-detect-my-location = Zjistit mou polohu
# This message is shown if user is working offline
newtab-weather-error-not-available = Údaje o počasí nejsou momentálně dostupné.
newtab-weather-opt-in-see-weather = Chcete vidět počasí pro vaši oblast?
newtab-weather-opt-in-not-now =
    .label = Teď ne
newtab-weather-opt-in-yes =
    .label = Ano
newtab-weather-opt-in-headline = Získejte místní předpověď počasí
newtab-weather-opt-in-use-location =
    .label = Použít polohu
newtab-weather-opt-in-choose-location = Vyberte umístění
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Vysoká
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Nízká
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Podívejte se na předpověď od { $provider }
    .aria-description = { $provider } ∙Sponzorované

## Topic Labels

newtab-topic-label-business = Podnikání
newtab-topic-label-career = Kariéra
newtab-topic-label-education = Vzdělávání
newtab-topic-label-arts = Zábava
newtab-topic-label-food = Jídlo
newtab-topic-label-health = Zdraví
newtab-topic-label-hobbies = Hraní her
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Finance
newtab-topic-label-society-parenting = Rodičovství
newtab-topic-label-government = Politika
newtab-topic-label-education-science = Věda
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Zajímavé tipy
newtab-topic-label-sports = Sporty
newtab-topic-label-tech = Technologie
newtab-topic-label-travel = Cestování
newtab-topic-label-home = Dům a zahrada

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Vyberte témata pro vyladění svého kanálu
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Vyberte dvě nebo více témat. Naši odborní kurátoři upřednostňují příběhy přizpůsobené vašim zájmům. Aktualizovat můžete kdykoliv.
newtab-topic-selection-save-button = Uložit
newtab-topic-selection-cancel-button = Zrušit
newtab-topic-selection-button-maybe-later = Možná později
newtab-topic-selection-privacy-link = Zjistěte, jak chráníme a spravujeme data
newtab-topic-selection-button-update-interests = Aktualizujte své zájmy
newtab-topic-selection-button-pick-interests = Vyberte, co vás zajímá

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Sledovat
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Sledovat téma { $topic }
newtab-section-following-button = Sledované
newtab-section-unfollow-button = Přestat sledovat
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Sledování: přestat sledovat téma { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Dolaďte si svůj kanál
newtab-section-follow-highlight-subtitle = Sledujte své zájmy a uvidíte víc toho, co se vám líbí.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Blokovat
newtab-section-blocked-button = Blokováno
newtab-section-unblock-button = Odblokovat
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Sledovat téma { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Přestat sledovat téma { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Blokovat téma { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Odblokovat téma { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = Teď ne
newtab-section-confirm-block-topic-p1 = Opravdu chcete zablokovat toto téma?
newtab-section-confirm-block-topic-p2 = Zablokovaná témata se již nebudou zobrazovat ve vašem kanálu.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Blokovat { $topic }
newtab-section-block-cancel-button = Zrušit

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Témata
newtab-section-manage-topics-button-v2 =
    .label = Správa témat
newtab-section-mangage-topics-followed-topics = Sledováno
newtab-section-mangage-topics-followed-topics-empty-state = Zatím nesledujete žádné téma.
newtab-section-mangage-topics-blocked-topics = Blokováno
newtab-section-mangage-topics-blocked-topics-empty-state = Zatím jste nezablokovali žádná témata.
newtab-custom-wallpaper-title = Vlastní tapety jsou zde
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle =
    { -brand-product-name.case-status ->
        [with-cases] Nahrajte si vlastní tapetu nebo si vyberte vlastní barvu, aby { -brand-product-name } byl podle vás.
       *[no-cases] Nahrajte si vlastní tapetu nebo si vyberte vlastní barvu, aby aplikace { -brand-product-name } byla podle vás.
    }
newtab-custom-wallpaper-cta = Vyzkoušejte ho

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title =
    { -brand-product-name.case-status ->
        [with-cases] Vyberte si tapetu, kterou chcete, aby byl { -brand-product-name } podle vás
       *[no-cases] Vyberte si tapetu, kterou chcete, aby byla aplikace { -brand-product-name } podle vás
    }
newtab-new-user-custom-wallpaper-subtitle = Zajistěte, aby se každý nový panel cítil jako doma pomocí vlastních tapet a barev.
newtab-new-user-custom-wallpaper-cta = Vyzkoušejte nyní

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Právě přišly nové čerstvé tapety
newtab-wallpaper-feature-highlight-subtitle = Vyberte si svůj oblíbený a v každém novém panelu se budete cítit jako doma.
newtab-wallpaper-feature-highlight-cta = Zvolte si tapetu

## Strings for download mobile highlight

newtab-download-mobile-highlight-title =
    { -brand-product-name.case-status ->
        [with-cases] Stáhnout { -brand-product-name(case: "acc") } pro mobily
       *[no-cases] Stáhnout aplikaci { -brand-product-name } pro mobily
    }
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Naskenujte kód a bezpečně prohlížejte internet i na cestách.
newtab-download-mobile-highlight-body-variant-b = Se synchronizací svých panelů, hesel a dalších věcí můžete pokračovat tam, kde jste skončili.
newtab-download-mobile-highlight-body-variant-c =
    { -brand-product-name.case-status ->
        [with-cases] Víte, že { -brand-product-name(case: "acc") } si můžete vzít s sebou? Stejný prohlížeč. Do vaší kapsy.
       *[no-cases] Víte, že aplikaci { -brand-product-name } si můžete vzít s sebou? Stejný prohlížeč. Do vaší kapsy.
    }
newtab-download-mobile-highlight-image =
    .aria-label =
        { -brand-product-name.case-status ->
            [with-cases] QR kód pro stažení { -brand-product-name(case: "gen") } pro mobily
           *[no-cases] QR kód pro stažení aplikace { -brand-product-name } pro mobily
        }

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Vaše oblíbené položky na dosah ruky
newtab-shortcuts-highlight-subtitle = Přidejte si zkratky, abyste měli oblíbené weby dostupné na jedno klepnutí.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Proč to nahlašujete?
newtab-report-ads-reason-not-interested =
    .label = Nemám zájem
newtab-report-ads-reason-inappropriate =
    .label = Je to nevhodné
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Už jsem to viděl(a) mockrát
newtab-report-content-wrong-category =
    .label = Špatná kategorie
newtab-report-content-outdated =
    .label = Zastaralé
newtab-report-content-inappropriate-offensive =
    .label = Nevhodné nebo urážlivé
newtab-report-content-spam-misleading =
    .label = Nevyžádaný příspěvek nebo klamavá zpráva
newtab-report-content-requires-payment-subscription =
    .label = Vyžaduje platbu nebo předplatné
newtab-report-content-requires-payment-subscription-learn-more = Zjistit více
newtab-report-cancel = Zrušit
newtab-report-submit = Odeslat
newtab-toast-thanks-for-reporting =
    .message = Děkujeme za nahlášení.
newtab-toast-widgets-hidden =
    .message = Klepněte na ikonu tužky a widgety si můžete kdykoliv zpět přidat.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Nyní sledujete téma { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Již nesledujete téma { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Články na téma { $topic } už neuvidíte.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Přidejte si nějaký. Možností je neomezeně.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Nový
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Splněno ({ $number })
newtab-widget-lists-celebration-headline = Dobrá práce
newtab-widget-lists-celebration-subhead = Vše vyřešeno
newtab-widget-task-list-menu-copy = Kopírovat
newtab-widget-lists-menu-edit = Upravit název seznamu
newtab-widget-lists-menu-edit2 =
    .aria-label = Upravit název seznamu
newtab-widget-lists-menu-create = Vytvoření nového seznamu
newtab-widget-lists-menu-delete = Smazat tento seznam
newtab-widget-lists-menu-copy = Zkopírovat seznam do schránky
newtab-widget-lists-menu-learn-more = Zjistit více
newtab-widget-lists-button-add-item = Přidat položku
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Přidat položku
    .aria-label = Přidat položku
newtab-widget-lists-input-error = Položku přidáte zadáním textu.
newtab-widget-lists-input-menu-open-link = Otevřít odkaz
newtab-widget-lists-input-menu-move-up = Posunout výše
newtab-widget-lists-input-menu-move-down = Posunout níže
newtab-widget-lists-input-menu-delete = Smazat
newtab-widget-lists-input-menu-edit = Upravit
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Upravit položku
newtab-widget-lists-edit-clear =
    .aria-label = Zrušit
    .title = Zrušit
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Vytvořit nový seznam
newtab-widget-lists-name-label-default =
    .label = Seznam úkolů
newtab-widget-lists-name-label-checklist =
    .label = Kontrolní seznam
newtab-widget-lists-name-placeholder-default =
    .placeholder = Seznam úkolů
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Kontrolní seznam
    .aria-label = Upravit název seznamu
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Nový seznam
    .aria-label = Upravit název seznamu
newtab-widget-section-title = Widgety
newtab-widget-menu-hide = Skrýt widget
newtab-widget-menu-change-size = Změnit velikost
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Přesunout
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Doleva
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Doprava
newtab-widget-size-small = Malý
newtab-widget-size-medium = Střední
newtab-widget-size-large = Velký
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Skrýt widgety
    .aria-label = Skrýt všechny widgety
newtab-widget-section-maximize =
    .title = Rozbalit widgety
    .aria-label = Rozbalení všech widgetů na plnou velikost
newtab-widget-section-minimize =
    .title = Minimalizovat wigety
    .aria-label = Sbalení všech widgetů na kompaktní velikost
newtab-widget-section-menu-button =
    .title = Nabídka widgetů
    .aria-label = Otevřít nabídku widgetů
newtab-widget-add-widgets-button =
    .aria-label = Přidat widget
    .title = Přidat widget
newtab-widget-section-menu-manage = Spravovat widgety
newtab-widget-section-menu-hide-all = Skrýt widgety
newtab-widget-section-menu-learn-more = Zjistit více
newtab-widget-section-feedback = Sdělte nám svůj názor
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Zobrazit více widgetů
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Zobrazit méně widgetů
newtab-widget-lists-name-default = Kontrolní seznam

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Časovač
newtab-widget-timer-notification-focus = Čas soustředění vypršel. Pěkná práce. Potřebujete přestávku?
newtab-widget-timer-notification-break = Vaše přestávka skončila. Jste připraveni se soustředit?
newtab-widget-timer-notification-warning = Oznámení jsou vypnutá
newtab-widget-timer-mode-focus =
    .label = Soustředění
newtab-widget-timer-mode-break =
    .label = Přestávka
newtab-widget-timer-label-play =
    .label = Spustit
newtab-widget-timer-label-pause =
    .label = Pozastavit
newtab-widget-timer-reset =
    .title = Obnovit
newtab-widget-timer-menu-notifications = Vypnout oznámení
newtab-widget-timer-menu-notifications-on = Zapnout oznámení
newtab-widget-timer-menu-learn-more = Zjistit více
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Hlavní titulky
newtab-daily-briefing-card-menu-dismiss = Skrýt
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Aktualizováno před { $minutes } min.
newtab-widget-message-title = Soustřeďte se díky seznamům a vestavěnému časovači
# to-dos stands for "things to do".
newtab-widget-message-copy = Od rychlých připomínek po každodenní úkoly, od soustředění po přestávky na protažení - plňte úkoly včas.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Jedno místo na soustředění, předpověď počasí a další
newtab-widget-message-focus-forecasts-body =
    { -brand-product-name.case-status ->
        [with-cases] Udržte si plynulý průběh dne díky widgetům { -brand-product-name(case: "gen") }. Podívejte se na předpověď počasí, soustřeďte se na práci nebo sledujte čas v různých částech světa.
       *[no-cases] Udržte si plynulý průběh dne díky widgetům aplikace { -brand-product-name }. Podívejte se na předpověď počasí, soustřeďte se na práci nebo sledujte čas v různých částech světa.
    }
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Přizpůsobte si { -brand-product-name } podle sebe
newtab-promo-card-body-addons = Vyberte si tapetu z naší kolekce nebo si vytvořte vlastní.
newtab-promo-card-cta-addons = Vyzkoušejte nyní
newtab-promo-card-title =
    { -brand-product-name.case-status ->
        [with-cases] Podpořit { -brand-product-name(case: "acc") }
       *[no-cases] Podpořit aplikaci { -brand-product-name }
    }
newtab-promo-card-body = Naši sponzoři podporují naši misi budovat lepší web.
newtab-promo-card-cta = Zjistit více
newtab-promo-card-dismiss-button =
    .title = Zavřít
    .aria-label = Zavřít

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] Spustit časovač na { $minutes } minutu
            [few] Spustit časovač na { $minutes } minuty
            [many] Spustit časovač na { $minutes } minut
           *[other] Spustit časovač na { $minutes } minut
        }
newtab-widget-timer-pause-aria =
    .aria-label = Pozastavit časovač
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } minuta
            [few] { $minutes } minuty
            [many] { $minutes } minut
           *[other] { $minutes } minut
        }
newtab-widget-timer-decrease-min =
    .title = Zkrátit o 1 minutu
newtab-widget-timer-increase-min =
    .title = Zvýšit o 1 minutu
newtab-widget-timer-mode-group =
    .aria-label = Režim časovače
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Soustředění
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Přestávka
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Skrýt časovač
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Skvělá práce
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Vaše přestávka skončila
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Potřebujete přestávku?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Jste připraveni se soustředit?

##

newtab-sports-widget-menu-follow-teams = Sledovat týmy
newtab-sports-widget-menu-view-schedule = Zobrazit rozpis zápasů
newtab-sports-widget-menu-view-upcoming = Zobrazit nadcházející
newtab-sports-widget-menu-view-results = Zobrazit výsledky
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Klíčová data
newtab-sports-widget-menu-learn-more = Zjistit více
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Sledujte Mistrovství světa ve fotbale
newtab-sports-widget-get-updates = Získejte živé informace o zápasech a další informace.
newtab-sports-widget-view-schedule =
    .label = Zobrazit rozpis zápasů
newtab-sports-widget-follow-teams =
    .label = Sledovat týmy
newtab-sports-widget-view-matches =
    .label = Zobrazit zápasy
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Sledovat { $number } tým
        [few] Sledovat { $number } týmy
        [many] Sledovat { $number } týmů
       *[other] Sledovat { $number } týmů
    }
newtab-sports-widget-choose-wallpaper =
    .label = Zvolte si tapetu
newtab-sports-widget-skip = Přeskočit
newtab-sports-widget-search-country =
    .placeholder = Hledat zemi
    .aria-label = Hledat zemi
newtab-sports-widget-cancel = Zrušit
newtab-sports-widget-back-button =
    .aria-label = Zpět
newtab-sports-widget-done-button =
    .label = Hotovo
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = Tým { $teamName } (vyřazen)
newtab-sports-widget-view-all =
    .label = Zobrazit vše
newtab-sports-widget-show-less =
    .label = Zobrazit méně
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Pouze sledované týmy
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Sledovat
    .title = Sledovat živě
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Sledovat živě
    .title = Sledovat živě
newtab-sports-widget-watch-dialog-close =
    .aria-label = Zavřít
    .title = Zavřít
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Zdarma
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Vyzkoušení zdarma
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Zdarma i placené
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Placené
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Pouze vybrané zápasy
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Dostupné ve vašem regionu
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Ostatní regiony
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Otevřít stream
    .title = Otevřít stream
newtab-sports-widget-group-stage = Skupinová fáze
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
newtab-sports-widget-round-32 = Nejlepších 32
newtab-sports-widget-round-16 = Nejlepších 16
newtab-sports-widget-quarter-finals = Čtvrtfinále
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = ŽIVĚ
newtab-custom-widget-live-refresh =
    .title = Obnovit skóre
    .aria-label = Obnovit skóre
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Klíčová data
newtab-sports-widget-upcoming = Nadcházející
# Used for a match currently ongoing
newtab-sports-widget-now = Teď
newtab-sports-widget-results = Výsledky
newtab-sports-widget-semi-finals = Semifinále
newtab-sports-widget-bronze-finals = O třetí místo
# Final is the final match for 1st place.
newtab-sports-widget-final = Finále
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Zpožděno
newtab-sports-widget-postponed = Odloženo
newtab-sports-widget-suspended = Pozastaveno
newtab-sports-widget-cancelled = Zrušeno
newtab-sports-widget-information = Informace o zápase
newtab-sports-widget-no-live-data = Data o aktuálních zápasech se aktuálně neaktualizují
newtab-sports-widget-view-results-link = Zobrazit výsledky
newtab-sports-widget-third-place = Třetí místo
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Druhé místo
newtab-sports-widget-champions = Vítěz
newtab-sports-widget-world-cup-champions = Mistrovství světa ve fotbale 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Konec zápasu
newtab-sports-widget-match-halftime = Poločas
newtab-sports-widget-match-extra-time = Prodloužení
newtab-sports-widget-match-penalties = Penalty
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = vs
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Sledujte nás, brzy zveřejníme podrobnosti o nadcházejícím zápase

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Předchozí
    .title = Předchozí
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Následující
    .title = Následující
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Probíhající zápas { $index } z { $total }
    .title = Probíhající zápas { $index } z { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } proti { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) proti { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Živě: { $homeTeam }, { $homeScore } proti { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } vs. { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } vs. { $awayTeam }, zpoždění
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } vs. { $awayTeam }, odloženo
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } vs. { $awayTeam }, pozastaveno
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } vs. { $awayTeam }, zrušeno

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosna a Hercegovina
newtab-sports-widget-team-name-label-civ =
    .label = Pobřeží Slonoviny
newtab-sports-widget-team-name-label-cod =
    .label = Konžská demokratická republika
newtab-sports-widget-team-name-label-eng =
    .label = Anglie
newtab-sports-widget-team-name-label-sco =
    .label = Skotsko
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Bude upřesněno

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Odstartujte světový šampionát s novými tapetami
newtab-sports-widget-message-wallpapers-body = Vneste do svého prohlížeče trochu té zápasové energie na dobu turnaje.
newtab-sports-widget-message-wallpapers-cta = Zvolte si tapetu
newtab-sports-widget-message-add-widgets-cta =
    .label = Přidat widgety
newtab-sports-widget-message-day-in-play-title =
    { -brand-product-name.case-status ->
        [with-cases] Udržte svůj den v pohybu díky widgetům { -brand-product-name(case: "gen") }
       *[no-cases] Udržte svůj den v pohybu díky widgetům aplikace { -brand-product-name }
    }
newtab-sports-widget-message-day-in-play-body = Sledujte mistrovství světa, soustřeďte se na své úkoly, sledujte čas v různých částech světa a mnoho dalšího.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Prozkoumejte widgety

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Zavřít
    .aria-label = Zavřít
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Přizpůsobte si tento prostor
newtab-activation-window-message-customization-focus-message = Vyberte si novou tapetu, přidejte zkratky na své oblíbené stránky a mějte přehled o novinkách, které vás zajímají.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Začít s přizpůsobováním
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Tento prostor hraje podle vašich pravidel
newtab-activation-window-message-values-focus-message =
    { -brand-product-name.case-status ->
        [with-cases] { -brand-product-name } vám umožní procházet internet způsobem, který vám vyhovuje a je přizpůsoben vašemu dennímu programu. Přizpůsobte si { -brand-product-name(case: "acc") }.
       *[no-cases] { -brand-product-name } vám umožní procházet internet způsobem, který vám vyhovuje a je přizpůsoben vašemu dennímu programu. Přizpůsobte si aplikaci { -brand-product-name }.
    }

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Skrýt hodiny
newtab-clock-widget-menu-learn-more = Zjistit více
newtab-clock-widget-menu-edit = Úprava hodin
newtab-clock-widget-menu-switch-to-12h = Přepnout na 12hodinový formát
newtab-clock-widget-menu-switch-to-24h = Přepnout na 24-hodinový formát
newtab-clock-widget-label-your-clocks = Vaše hodiny
newtab-clock-widget-search-location-input =
    .label = Umístění
    .placeholder = Vyhledat město
    .aria-label = Vyhledat město
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Přezdívka (volitelné)
    .placeholder = Přidat přezdívku
    .aria-label = Přezdívka (volitelné)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Přidat nové hodiny
    .aria-label = Přidat nové hodiny
newtab-clock-widget-button-add-clock = Přidat
newtab-clock-widget-button-cancel = Zrušit
newtab-clock-widget-button-back =
    .title = Zpět
    .aria-label = Zpět
newtab-clock-widget-button-edit-clock =
    .title = Upravit hodiny
    .aria-label = Upravit hodiny
newtab-clock-widget-button-save = Uložit
newtab-clock-widget-button-remove-clock =
    .title = Odebrat hodiny
    .aria-label = Odebrat hodiny
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
    .aria-label = { $city }, označení: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Přidat hodiny
newtab-clock-widget-edit-clock-form =
    .aria-label = Upravit hodiny
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Výsledky vyhledávání
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Žádná shoda
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Otevřít nabídku pro hodiny
    .aria-label = Otevřít nabídku pro hodiny
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Přezdívka: { $nickname }
