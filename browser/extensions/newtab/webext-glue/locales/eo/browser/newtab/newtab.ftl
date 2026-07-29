# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Nova langeto
newtab-settings-button =
    .title = Personecigi la paĝon por novaj langetoj
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Personecigi tiun ĉi paĝon
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Personecigi
newtab-customize-panel-label =
    .label = Personecigi
newtab-personalize-settings-icon-label =
    .title = Personecigi la paĝon por novaj langetoj
    .aria-label = Agordoj
newtab-settings-dialog-label =
    .aria-label = Agordoj
newtab-personalize-icon-label =
    .title = Personecigi novan langeton
    .aria-label = Personecigi novan langeton
newtab-personalize-dialog-label =
    .aria-label = Personcecigi
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Ignori
    .aria-label = Ignori

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Eka paĝo
home-homepage-new-windows =
    .label = Novaj fenestroj
home-homepage-new-tabs =
    .label = Novaj langetoj
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Elekti specifan retejon

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Adreso(j) de retejo
home-custom-homepage-address =
    .placeholder = Tajpi adreson
home-custom-homepage-address-button =
    .label = Aldoni adreson
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Ankoraŭ neniu retejo aldonita.
home-custom-homepage-delete-address-button =
    .aria-label = Forigi adreson
    .title = Forigi adreson
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Anstataŭigi per
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Nune malfermitaj paĝoj
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Legosignoj…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Serĉi
home-prefs-stories-header2 =
    .label = Artikoloj
    .description = Eksterordinara enhavo elektita de la familio de { -brand-product-name }
home-prefs-widgets-header =
    .label = Komponantoj
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Listoj
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Tempumilo
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Sporto
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Horloĝo
home-prefs-mission-message2 =
    .message = Niaj patronoj subtenas nian mision: krei pli bonan interreton.
home-prefs-manage-topics-link2 =
    .label = Administri temojn
home-prefs-choose-wallpaper-link2 =
    .label = Elekti ekranfonon
home-prefs-firefox-logo-header =
    .label = Emblemo de { -brand-short-name }
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Por uzi tiujn ĉi trajtojn, agordu novajn lagetojn aŭ fenestrojn en { -firefox-home-brand-name }.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } vico
           *[other] { $num } vicoj
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Etendaĵo ({ $extension })
home-restore-defaults-srd =
    .label = Remeti normojn
    .accesskey = R
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (Norma)
home-mode-choice-custom-srd =
    .label = Personecigitaj URL…
home-mode-choice-blank-srd =
    .label = Malplena paĝo
home-prefs-shortcuts-header-srd =
    .label = Ŝparvojoj
home-prefs-shortcuts-select =
    .aria-label = Ŝparvojoj
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Patronitaj ŝparvojoj
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Patronitaj artikoloj
home-prefs-highlights-option-visited-pages-srd =
    .label = Vizititaj paĝoj
home-prefs-highlights-options-bookmarks-srd =
    .label = Legosignoj
home-prefs-highlights-option-most-recent-download-srd =
    .label = Lasta elŝuto
home-prefs-recent-activity-header-srd =
    .label = Ĵusa agado
home-prefs-recent-activity-select =
    .aria-label = Ĵusa agado
home-prefs-weather-header-srd =
    .label = Vetero
home-prefs-support-firefox-header-srd =
    .label = Helpi { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = Malkovri kiel

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Serĉi
    .aria-label = Serĉi
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Serĉi per { $engine } aŭ tajpi adreson
newtab-search-box-handoff-text-no-engine = Serĉi aŭ tajpi adreson
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Serĉi per { $engine } aŭ tajpi adreson
    .title = Serĉi per { $engine } aŭ tajpi adreson
    .aria-label = Serĉi per { $engine } aŭ tajpi adreson
newtab-search-box-handoff-input-no-engine =
    .placeholder = Serĉi aŭ tajpi adreson
    .title = Serĉi aŭ tajpi adreson
    .aria-label = Serĉi aŭ tajpi adreson
newtab-search-box-text = Serĉi en la reto
newtab-search-box-input =
    .placeholder = Serĉi en la reto
    .aria-label = Serĉi en la reto

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Aldoni serĉilon
newtab-topsites-add-shortcut-header = Nova ŝparvojo
newtab-topsites-edit-topsites-header = Redakti oftan retejon
newtab-topsites-edit-shortcut-header = Redakti ŝparvojon
newtab-topsites-add-shortcut-label = Aldoni ŝparvojon
newtab-topsites-add-shortcut-title =
    .title = Aldoni ŝparvojon
    .aria-label = Aldoni ŝparvojon
newtab-topsites-title-label = Titolo
newtab-topsites-title-input =
    .placeholder = Tajpu titolon
newtab-topsites-url-label = Retadreso
newtab-topsites-url-input =
    .placeholder = Tajpu aŭ alguu retadreson
newtab-topsites-url-validation = Valida retadreso estas postulata
newtab-topsites-image-url-label = Personecitiga retadreso de bildo
newtab-topsites-use-image-link = Uzi personecigitan bildon…
newtab-topsites-image-validation = Ne eblis ŝargi la bildon. Klopodu alian retadreson.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Viŝi tekston

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Nuligi
newtab-topsites-delete-history-button = Forigi el historio
newtab-topsites-save-button = Konservi
newtab-topsites-preview-button = Antaŭvidi
newtab-topsites-add-button = Aldoni

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Ĉu vi certe volas forigi ĉiun aperon de tiu ĉi paĝo el via historio?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Tiu ĉi ago ne estas malfarebla.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Patronita

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (alpinglita)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Malfermi menuon
    .aria-label = Malfermi menuon
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Forigi
    .aria-label = Forigi
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Malfermi menuon
    .aria-label = Malfermi kuntekstan menu por { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Modifi tiun ĉi retejon
    .aria-label = Modifi tiun ĉi retejon

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Redakti
newtab-menu-open-new-window = Malfermi en nova fenestro
newtab-menu-open-new-private-window = Malfermi en nova privata fenestro
newtab-menu-dismiss = Ignori
newtab-menu-pin = Alpingli
newtab-menu-unpin = Depingli
newtab-menu-delete-history = Forigi el historio
newtab-menu-save-to-pocket = Konservi en { -pocket-brand-name }
newtab-menu-delete-pocket = Forigi el { -pocket-brand-name }
newtab-menu-archive-pocket = Arĥivi en { -pocket-brand-name }
newtab-menu-show-privacy-info = Niaj patronoj kaj via privateco
newtab-menu-about-fakespot = Pri { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Raporti
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Bloki
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Ne plu sekvi
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Pli da informo
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Ne plu sekvi temon

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Administri patronitan enhavon
newtab-menu-our-sponsors-and-your-privacy = Niaj patronoj kaj via privateco
newtab-menu-report-this-ad = Raporti tiun ĉi reklamon

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Farita
newtab-privacy-modal-button-manage = Administri agordojn de patronita enhavo
newtab-privacy-modal-header = Via privateco gravas.
newtab-privacy-modal-paragraph-2 = Krom allogajn artikolojn ni montras al vi ankaŭ gravajn, zorge reviziitan enhavon el elektitaj patronoj. Estu certa, <strong>viaj retumaj datumoj neniam foriras el via loka instalaĵo de { -brand-product-name }</strong> — ni ne vidas ilin, kaj ankaŭ ne niaj patronoj.
newtab-privacy-modal-link = Pli da informo pri privateco en novaj folioj

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Forigi legosignon
# Bookmark is a verb here.
newtab-menu-bookmark = Aldoni legosignon

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Kopii elŝutan ligilon
newtab-menu-go-to-download-page = Iri al la paĝo de elŝuto
newtab-menu-remove-download = Forigi el la historio

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Montri en Finder
       *[other] Malfermi entenantan dosierujon
    }
newtab-menu-open-file = Malfermi dosieron

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Vizitita
newtab-label-bookmarked = Kun legosigno
newtab-label-removed-bookmark = Legosigno forigita
newtab-label-recommended = Tendencoj
newtab-label-saved = Konservita en { -pocket-brand-name }
newtab-label-download = Elŝutita
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Patronita
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Patronita de { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Patronita

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Forigi sekcion
newtab-section-menu-collapse-section = Faldi sekcion
newtab-section-menu-expand-section = Malfaldi sekcion
newtab-section-menu-manage-section = Administri sekcion
newtab-section-menu-manage-webext = Administri etendaĵon
newtab-section-menu-add-topsite = Aldoni oftan retejon
newtab-section-menu-add-search-engine = Aldoni serĉilon
newtab-section-menu-move-up = Movi supren
newtab-section-menu-move-down = Movi malsupren
newtab-section-menu-privacy-notice = Rimarko pri privateco

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Faldi sekcion
newtab-section-expand-section-label =
    .aria-label = Malfaldi sekcion

## Section Headers.

newtab-section-header-topsites = Plej vizititaj
newtab-section-header-recent-activity = Ĵusa agado
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Rekomendita de { $provider }
newtab-section-header-stories = Pensigaj artikoloj
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Niaj hodiaŭaj elektoj por vi

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Komencu retumi kaj ĉi tie ni montros al vi kelkajn el la plej bonaj artikoloj, filmetoj kaj aliaj paĝoj, kiujn vi antaŭ nelonge vizits aŭ por kiuj vi aldonis legosignon.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Vi legis ĉion. Kontrolu denove poste ĉu estas pli da novaĵoj de { $provider }. Ĉu vi ne povas atendi? Elektu popularan temon por trovi pli da interesaj artikoloj tra la tuta reto.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Vi legis ĉion. Kontrolu denove poste ĉu estas pli da novaĵoj. Ĉu vi ne povas atendi? Elektu popularan temon por trovi pli da interesaj artikoloj tra la tuta reto.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Estas nenio alia.
newtab-discovery-empty-section-topstories-content = Kontrolu poste por pli da artikoloj.
newtab-discovery-empty-section-topstories-try-again-button = Klopodu denove
newtab-discovery-empty-section-topstories-loading = Ŝargado…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Fuŝ! Ni preskaŭ tute ŝargis tiun ĉi sekcion, sed tamen ne.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Ĉefaj temoj:
newtab-pocket-new-topics-title = Ĉu vi volas eĉ pli da artikoloj? Vidu tiujn ĉi popularajn temojn el { -pocket-brand-name }
newtab-pocket-more-recommendations = Pli da rekomendoj
newtab-pocket-learn-more = Pli da informo
newtab-pocket-cta-button = Instali { -pocket-brand-name }
newtab-pocket-cta-text = Konservu viajn ŝatatajn artikolojn en { -pocket-brand-name }, kaj stimulu vian menson per ravaj legaĵoj.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } estas parto de la familio { -brand-product-name }
newtab-pocket-save = Konservi
newtab-pocket-saved = Konservitaj

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Pli da ĉi tiaj
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Tio ne interesas min
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Dankon, viaj komentoj helpos nin plibonigi vian informan fonton.
newtab-toast-dismiss-button =
    .title = Ignori
    .aria-label = I

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Malkovru la plej bonajn aferojn en la reto
newtab-pocket-onboarding-cta = { -pocket-brand-name } esploras vastan diversecon de publikigaĵoj por alporti la plej informan, inspiran kaj fidindan enhavon al via retumilo { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Fuŝ', io malbona okazis dum ŝargo de tiu ĉi enhavo.
newtab-error-fallback-refresh-link = Refreŝigi paĝon por klopodi denove.

## Customization Menu

newtab-custom-shortcuts-title = Ŝparvojoj
newtab-custom-shortcuts-subtitle = Retejoj konservitaj aŭ vizititaj de vi
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Ŝparvojoj
    .description = Retejoj konservitaj aŭ vizititaj de vi
newtab-custom-shortcuts-nova =
    .label = Ŝparvojoj
newtab-custom-row-description =
    .description = Nombro de vicoj
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] unu vico
           *[other] { $num } vicoj
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] unu vico
       *[other] { $num } vicoj
    }
newtab-custom-sponsored-sites = Patronitaj ŝparvojoj
newtab-custom-pocket-title = Rekomendita de { -pocket-brand-name }
newtab-custom-pocket-subtitle = Eksterordinara  enhavo reviziita de  { -pocket-brand-name }, parto de la familio { -brand-product-name }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Rekomenditaj artikoloj
    .description = Eksterordinara enhavo elekita de la familio de { -brand-product-name }
newtab-recommended-stories-toggle =
    .label = Rekomenditaj artikoloj
newtab-custom-stories-personalized-toggle =
    .label = Artikoloj
newtab-custom-stories-personalized-checkbox-label = Personecigitaj artikoloj laŭ via retumo
newtab-custom-pocket-sponsored = Patronitaj artikoloj
newtab-custom-pocket-show-recent-saves = Montri ĵusajn konservojn
newtab-custom-recent-title = Ĵusa agado
newtab-custom-recent-subtitle = Elekto de ĵusaj retejoj kaj enhavoj
newtab-custom-weather-toggle =
    .label = Vetero
    .description = Rapida rigardo al la veterprognozo hodiaŭa
newtab-custom-widget-weather-toggle =
    .label = Vetero
newtab-custom-widget-lists-toggle =
    .label = Listoj
newtab-custom-widget-timer-toggle =
    .label = Tempumilo
newtab-custom-widget-sports-toggle =
    .label = Piedpilka mondpokalo
newtab-custom-widget-clock-toggle =
    .label = Horloĝo
newtab-custom-widget-sports-toggle2 =
    .label = Sporto
newtab-custom-widget-section-title = Komponantoj
newtab-custom-widget-section-toggle =
    .label = Komponantoj
newtab-widget-manage-title = Komponantoj
newtab-widget-manage-widget-button =
    .label = Administri komponantojn
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Fermi
    .aria-label = Fermi menuon
newtab-custom-close-button = Fermi
newtab-custom-settings = Administri aliajn agordojn

## New Tab Wallpapers

newtab-wallpaper-title = Ekranfonoj
newtab-wallpaper-reset = Reŝargi normajn valorojn
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Alŝuti bildon
newtab-wallpaper-add-an-image = Aldoni bildon
newtab-wallpaper-custom-color = Elekti koloron
newtab-wallpaper-toggle-title =
    .label = Ekranfonoj
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = La grando de la bildo superas la maksimuman grandon de dosiero, kiu estas { $file_size }MO. Bonvolu provi alŝuti pli etan dosieron.
newtab-wallpaper-error-upload-file-type = Ni ne povis alŝuti vian dosieron. Bonvolu provi denove per bilda dosiero.
newtab-wallpaper-error-file-type = Ni ne povis alŝuti vian dosieron. Bonvolu provi denove per alia tipo de dosiero.
newtab-wallpaper-light-red-panda = Ruĝa pando
newtab-wallpaper-light-mountain = Blanka monto
newtab-wallpaper-light-sky = Ĉielo kun purpuraj kaj rozkoloraj nuboj
newtab-wallpaper-light-color = Bluaj, rozkoloraj kaj flavaj formoj
newtab-wallpaper-light-landscape = Pejzaĝo monta kun blua nebulo
newtab-wallpaper-light-beach = Strando kun palmarbo
newtab-wallpaper-dark-aurora = Polusa lumo
newtab-wallpaper-dark-color = Ruĝaj kaj bluaj formoj
newtab-wallpaper-dark-panda = Ruĝa pando kaŝita en arbaro
newtab-wallpaper-dark-sky = Pejzaĝo urba kun nokta ĉielo
newtab-wallpaper-dark-mountain = Pejzaĝo monta
newtab-wallpaper-dark-city = Purpura pejzaĝo urba
newtab-wallpaper-dark-fox-anniversary = Vulpo sur pavimo proksime de arbaro
newtab-wallpaper-light-fox-anniversary = Vulpo sur herbejo kun nebula pejzaĝo monta

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Solidaj koloroj
newtab-wallpaper-colors = Koloroj
newtab-wallpaper-blue = Blua
newtab-wallpaper-light-blue = Helblua
newtab-wallpaper-light-purple = Helpurpura
newtab-wallpaper-light-green = Helverda
newtab-wallpaper-green = Verda
newtab-wallpaper-beige = Grizflava
newtab-wallpaper-yellow = Flava
newtab-wallpaper-orange = Oranĝa
newtab-wallpaper-pink = Roza
newtab-wallpaper-light-pink = Helroza
newtab-wallpaper-red = Ruĝa
newtab-wallpaper-dark-blue = Malhelblua
newtab-wallpaper-dark-purple = Malhelpurpura
newtab-wallpaper-dark-green = Malhelverda
newtab-wallpaper-brown = Bruna

## Abstract

newtab-wallpaper-category-title-abstract = Abstrakta
newtab-wallpaper-abstract-green = Verdaj formoj
newtab-wallpaper-abstract-blue = Bluaj formoj
newtab-wallpaper-abstract-purple = Purpuraj formoj
newtab-wallpaper-abstract-orange = Oranĝaj formoj
newtab-wallpaper-gradient-orange = Gamo oranĝa kaj roza
newtab-wallpaper-abstract-blue-purple = Bluaj kaj purpuraj formoj
newtab-wallpaper-abstract-white-curves = Blanka kun ombritaj kurboj
newtab-wallpaper-abstract-purple-green = Gradiento luma purpura kaj verda
newtab-wallpaper-abstract-blue-purple-waves = Bluaj kaj purpuraj ondaj formoj
newtab-wallpaper-abstract-black-waves = Nigraj ondaj formoj

## Firefox

newtab-wallpaper-category-title-photographs = Fotoj
newtab-wallpaper-beach-at-sunrise = Strando dum suneliro
newtab-wallpaper-beach-at-sunset = Strando dum sunsubiro
newtab-wallpaper-storm-sky = Ŝtorma ĉielo
newtab-wallpaper-sky-with-pink-clouds = Ĉielo kun rozkoloraj nuboj
newtab-wallpaper-red-panda-yawns-in-a-tree = Ruĝa pando oscedas sur arbo
newtab-wallpaper-white-mountains = Blankaj montoj
newtab-wallpaper-hot-air-balloons = Plurkoloraj balonoj dum tago
newtab-wallpaper-starry-canyon = Blua steloplena nokto
newtab-wallpaper-suspension-bridge = Griza foto de pendponto dum tago
newtab-wallpaper-sand-dunes = Blankaj sablomontetoj
newtab-wallpaper-palm-trees = Konturo de kokosaj palmarboj dum sunsubiro
newtab-wallpaper-blue-flowers = Deproksima foto de blu-petalaj floroj en florado
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Fotita de <a data-l10n-name="name-link">{ $author_string }</a> en <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Provu koloran tuŝeton
newtab-wallpaper-feature-highlight-content = Donu al viaj langetoj novan aspekton per fonoj.
newtab-wallpaper-feature-highlight-button = Mi komprenis
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Ignori
    .aria-label = Fermi elŝprucaĵon
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Ĉiela
newtab-wallpaper-celestial-lunar-eclipse = Luneklipso
newtab-wallpaper-celestial-earth-night = Nokta foto el malalta Tera orbito
newtab-wallpaper-celestial-starry-sky = Steloplena ĉielo
newtab-wallpaper-celestial-eclipse-time-lapse = Tempopasa filmado de luneklipso
newtab-wallpaper-celestial-black-hole = Ilustraĵo de galaksio kun nigra truo
newtab-wallpaper-celestial-river = Satelita bildo de rivero

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Vidi veterprognozon en { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Patronita
newtab-weather-menu-change-location = Ŝanĝi lokon
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Serĉi lokon
    .aria-label = Serĉi lokon
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Uzi nunan pozicion
newtab-weather-menu-weather-display = Montro de vetero
newtab-weather-todays-forecast = Hodiaŭa veterprognozo
newtab-weather-see-full-forecast = Vidi kompletan prognozon
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Simpla
newtab-weather-menu-change-weather-display-simple = Montri la simplan vidon
newtab-weather-menu-weather-display-option-detailed = Detala
newtab-weather-menu-change-weather-display-detailed = Montri la detalan vidon
newtab-weather-menu-temperature-units = Temperaturaj unuoj
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Ŝanĝi al Fahrenheit
newtab-weather-menu-change-temperature-units-celsius = Ŝanĝi al Celsius
newtab-weather-menu-hide-weather = Kaŝi veteron en nova langeto
newtab-weather-menu-learn-more = Pli da informo
newtab-weather-menu-detect-my-location = Trovi mian pozicion
# This message is shown if user is working offline
newtab-weather-error-not-available = En tiu ĉi momento ne haveblas veteraj datumoj.
newtab-weather-opt-in-see-weather = Ĉu vi volas vidi la veteron por via ejo?
newtab-weather-opt-in-not-now =
    .label = Ne nun
newtab-weather-opt-in-yes =
    .label = Jes
newtab-weather-opt-in-headline = Ricevu vian lokan veterprognozon
newtab-weather-opt-in-use-location =
    .label = Uzi vian lokon
newtab-weather-opt-in-choose-location = Elekti lokon
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Novjorko
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Maksimuma
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Minimuma
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Vidi veterprognozon en { $provider }
    .aria-description = { $provider } ∙ Patronita

## Topic Labels

newtab-topic-label-business = Negoco
newtab-topic-label-career = Kariero
newtab-topic-label-education = Eduko
newtab-topic-label-arts = Distro
newtab-topic-label-food = Manĝaĵo
newtab-topic-label-health = Sano
newtab-topic-label-hobbies = Ludo
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Financo
newtab-topic-label-society-parenting = Gepatreco
newtab-topic-label-government = Politiko
newtab-topic-label-education-science = Scienco
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Vivsimpligiloj
newtab-topic-label-sports = Sporto
newtab-topic-label-tech = Teknologio
newtab-topic-label-travel = Vojaĝo
newtab-topic-label-home = Domo kaj ĝardeno

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Elektu temojn por rafini vian informan fonton
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Elektu du aŭ pli da temoj. Niaj spertaj informzorgantoj elektos unue artikolojn, kiuj kongruas kun viaj interesoj. Vi povas ĝisdatigi tion iam ajn.
newtab-topic-selection-save-button = Konservi
newtab-topic-selection-cancel-button = Nuligi
newtab-topic-selection-button-maybe-later = Eble poste
newtab-topic-selection-privacy-link = Pli da informo pri kiel ni protektas kaj administras datumojn
newtab-topic-selection-button-update-interests = Ĝisdatigi viajn interesojn
newtab-topic-selection-button-pick-interests = Elekti viajn interesojn

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Sekvi
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Sekvi { $topic }
newtab-section-following-button = Sekvata
newtab-section-unfollow-button = Ne plu sekvi
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Sekvata: Ne plu sekvi { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Personecigu vian informan fonton
newtab-section-follow-highlight-subtitle = Sekvu viajn interesojn por vidi pli da tio, kion vi ŝatas.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Bloki
newtab-section-blocked-button = Blokita
newtab-section-unblock-button = Malbloki
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Sekvi { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Ne plu sekvi { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Bloki { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Malbloki { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = Ne nun
newtab-section-confirm-block-topic-p1 = Ĉu vi certe volas bloki tiun ĉi temon?
newtab-section-confirm-block-topic-p2 = Blokitaj temoj ne plu aperos en via informa fonto
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Bloki { $topic }
newtab-section-block-cancel-button = Nuligi

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Temoj
newtab-section-manage-topics-button-v2 =
    .label = Administri temojn
newtab-section-mangage-topics-followed-topics = Sekvataj
newtab-section-mangage-topics-followed-topics-empty-state = Vi ankoraŭ sekvas neniun temon.
newtab-section-mangage-topics-blocked-topics = Blokitaj
newtab-section-mangage-topics-blocked-topics-empty-state = Vi ankoraŭ blokas neniun temon.
newtab-custom-wallpaper-title = Tie ĉi troviĝas personecigitaj ekranfonoj
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Alŝutu vian propran ekranfonon aŭ elektu koloron por personecigi { -brand-product-name }.
newtab-custom-wallpaper-cta = Provi

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Elekti ekranfonon por personecigi vian { -brand-product-name }
newtab-new-user-custom-wallpaper-subtitle = Igu ĉiun novan langeton propra per personecigitaj ekranfonoj kaj koloroj.
newtab-new-user-custom-wallpaper-cta = Provu nun

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Novaj ekranfonoj ĵus alvenis
newtab-wallpaper-feature-highlight-subtitle = Elektu vian plej ŝatatan kaj personecigu ĉiun novan langeton.
newtab-wallpaper-feature-highlight-cta = Elekti ekranfonon

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Elŝutu { -brand-product-name } por poŝaparatoj
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Skanu la kodon por sekure retumi ie ajn.
newtab-download-mobile-highlight-body-variant-b = Rekomencu kie vi haltis kiam vi spegulas viajn langetojn, pasvortojn kaj pli.
newtab-download-mobile-highlight-body-variant-c = Ĉu vi sciis ke vi povas porti { -brand-product-name } ĉien? Sama retumilo. En via poŝo.
newtab-download-mobile-highlight-image =
    .aria-label = Kodo QR por elŝuti { -brand-product-name } por poŝaparatoj

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Viaj plej ŝatataj retejoj ĉemane
newtab-shortcuts-highlight-subtitle = Aldonu ŝparvojon por havi viajn plej ŝatatajn retejojn je unu alklako.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Kial vi raportas tion ĉi?
newtab-report-ads-reason-not-interested =
    .label = Tio ne interesas min
newtab-report-ads-reason-inappropriate =
    .label = Tio estas neadekvata
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Mi vidis tion tro multe da fojoj
newtab-report-content-wrong-category =
    .label = Malĝusta kategorio
newtab-report-content-outdated =
    .label = Kaduka
newtab-report-content-inappropriate-offensive =
    .label = Neadekvata aŭ ofenda
newtab-report-content-spam-misleading =
    .label = Truda aŭ trompa
newtab-report-content-requires-payment-subscription =
    .label = Postulata pago aŭ abono
newtab-report-content-requires-payment-subscription-learn-more = Pli da informo
newtab-report-cancel = Nuligi
newtab-report-submit = Sendi
newtab-toast-thanks-for-reporting =
    .message = Dankon pro via raporto.
newtab-toast-widgets-hidden =
    .message = Elektu la krajonan emblemon por realdoni komponantojn, iam ajn.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Vi nun sekvas { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Vi ne plu sekvas { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Vi ne plu vidos artikolojn pri { $topic }.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Estas senfinaj ebloj. Aldonu taskon.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Nova
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Plenumitaj ({ $number })
newtab-widget-lists-celebration-headline = Bona laboro
newtab-widget-lists-celebration-subhead = Ĉio farita
newtab-widget-task-list-menu-copy = Kopii
newtab-widget-lists-menu-edit = Modifi nomon de listo
newtab-widget-lists-menu-edit2 =
    .aria-label = Modifi nomon de listo
newtab-widget-lists-menu-create = Krei novan liston
newtab-widget-lists-menu-delete = Forigi tiun ĉi liston
newtab-widget-lists-menu-copy = Kopii liston al tondujo
newtab-widget-lists-menu-learn-more = Pli da informo
newtab-widget-lists-button-add-item = Aldoni elementon
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Aldoni elementon
    .aria-label = Aldoni elementon
newtab-widget-lists-input-error = Bonvolu enigi tekston por aldoni elementon.
newtab-widget-lists-input-menu-open-link = Malfermi ligilon
newtab-widget-lists-input-menu-move-up = Movi supren
newtab-widget-lists-input-menu-move-down = Movi malsupren
newtab-widget-lists-input-menu-delete = Forigi
newtab-widget-lists-input-menu-edit = Modifi
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Modifi elementon
newtab-widget-lists-edit-clear =
    .aria-label = Nuligi
    .title = Nuligi
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Krei novan liston
newtab-widget-lists-name-label-default =
    .label = Listo de taskoj
newtab-widget-lists-name-label-checklist =
    .label = Listo de taskoj
newtab-widget-lists-name-placeholder-default =
    .placeholder = Listo de taskoj
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Listo de taskoj
    .aria-label = Modifi nomon de listo
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Nova listo
    .aria-label = Modifi nomon de listo
newtab-widget-section-title = Komponantoj
newtab-widget-menu-hide = Kaŝi komponanton
newtab-widget-menu-change-size = Ŝanĝi grandon
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Movi
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Maldekstren
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Dekstren
newtab-widget-size-small = Eta
newtab-widget-size-medium = Mezgranda
newtab-widget-size-large = Granda
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Kaŝi komponantojn
    .aria-label = Kaŝi ĉiujn komponantojn
newtab-widget-section-maximize =
    .title = Malfaldi komponantojn
    .aria-label = Malfaldi ĉiujn komponantojn al normala grando
newtab-widget-section-minimize =
    .title = Plejetigi komponantojn
    .aria-label = Faldi ĉiujn komponantojn en kompakta grando
newtab-widget-section-menu-button =
    .title = Menuo de komponantoj
    .aria-label = Malfermi menuon de komponantoj
newtab-widget-add-widgets-button =
    .aria-label = Aldoni komponanton
    .title = Aldoni komponanton
newtab-widget-section-menu-manage = Administri komponantojn
newtab-widget-section-menu-hide-all = Kaŝi komponantojn
newtab-widget-section-menu-learn-more = Pli da informo
newtab-widget-section-feedback = Rakontu al ni vian opinion
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Montri pli da komponantoj
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Montri malpli da komponantoj
newtab-widget-lists-name-default = Listo de taskoj

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Tempumilo
newtab-widget-timer-notification-focus = La koncentriĝa periodo finiĝis. Bone farita. Ĉu fari paŭzon?
newtab-widget-timer-notification-break = Via paŭzo estas finita. Ĉu preta rekoncentriĝi?
newtab-widget-timer-notification-warning = Sciigoj malŝaltitaj
newtab-widget-timer-mode-focus =
    .label = Koncentriĝo
newtab-widget-timer-mode-break =
    .label = Paŭzo
newtab-widget-timer-label-play =
    .label = Komenci
newtab-widget-timer-label-pause =
    .label = Paŭzigi
newtab-widget-timer-reset =
    .title = Rekomenci
newtab-widget-timer-menu-notifications = Malŝalti sciigojn
newtab-widget-timer-menu-notifications-on = Ŝalti sciigojn
newtab-widget-timer-menu-learn-more = Pli da informo
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Ĉefaj titoloj
newtab-daily-briefing-card-menu-dismiss = Ignori
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp =
    { $minutes ->
        [one] Ĝisdatigita antaŭ minuto
       *[other] Ĝisdatigita antaŭ { $minutes } minutoj
    }
newtab-widget-message-title = Resti koncentrita danke al listoj kaj integrita tempumilo
# to-dos stands for "things to do".
newtab-widget-message-copy = Rapidaj memorigaĵoj, ĉiutagaj farendaĵoj, koncentriĝaj seancoj kaj ripozaj paŭzoj — akurate plenumu taskojn.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Koncentriĝo, veterprognozoj kaj pli, en unu loko
newtab-widget-message-focus-forecasts-body = Permesu al via tago flui per la komponantoj de { -brand-product-name }. Kontrolu la veterprognozon, koncentriĝu en taskoj aŭ sciu kioma horo estas en la cetero de la mondo.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Personecigu { -brand-product-name } laŭ via gusto
newtab-promo-card-body-addons = Elektu ekranfonon en nia kolekto aŭ kreu propran.
newtab-promo-card-cta-addons = Provu nun
newtab-promo-card-title = Subtenu { -brand-product-name }
newtab-promo-card-body = Niaj patronoj subtenas nian mision: krei pli bonan interreton.
newtab-promo-card-cta = Pli da informo
newtab-promo-card-dismiss-button =
    .title = Ignori
    .aria-label = Ignori

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] Komenci unuminutan tempumilon
           *[other] Komenci { $minutes } minutan tempumilon
        }
newtab-widget-timer-pause-aria =
    .aria-label = Paŭzigi tempumilon
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] unu minuto
           *[other] { $minutes } minutoj
        }
newtab-widget-timer-decrease-min =
    .title = Redukti je 1 minuto
newtab-widget-timer-increase-min =
    .title = Aldoni 1 minuton
newtab-widget-timer-mode-group =
    .aria-label = Tempumila reĝimo
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Koncentriĝo
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Paŭzo
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Kaŝi tempumilon
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Bona laboro
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Via paŭzo finiĝis
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Ĉu vi bezonas paŭzi?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Ĉu preta koncentriĝi?

##

newtab-sports-widget-menu-follow-teams = Sekvi teamojn
newtab-sports-widget-menu-view-schedule = Montri kalendaron
newtab-sports-widget-menu-view-upcoming = Montri venontajn
newtab-sports-widget-menu-view-results = Montri rezultojn
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Ĉefaj datoj
newtab-sports-widget-menu-learn-more = Pli da informo
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Akompanu la piedpilkan mondpokalon
newtab-sports-widget-get-updates = Ricevu informojn pri ludoj kaj pli.
newtab-sports-widget-view-schedule =
    .label = Montri kalendaron
newtab-sports-widget-follow-teams =
    .label = Sekvi teamojn
newtab-sports-widget-view-matches =
    .label = Montri ludojn
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Sekvi ĝis unu teamo
       *[other] Sekvi ĝis { $number } teamoj
    }
newtab-sports-widget-choose-wallpaper =
    .label = Elekti ekranfonon
newtab-sports-widget-skip = Ignori
newtab-sports-widget-search-country =
    .placeholder = Serĉi landon
    .aria-label = Serĉi landon
newtab-sports-widget-cancel = Nuligi
newtab-sports-widget-back-button =
    .aria-label = Malantaŭen
newtab-sports-widget-done-button =
    .label = Farita
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (forigita)
newtab-sports-widget-view-all =
    .label = Montri ĉion
newtab-sports-widget-show-less =
    .label = Montri malpli
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Nur sekvataj teamoj
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Spekti
    .title = Spekti rekte
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Spekti rekte
    .title = Spekti rekte
newtab-sports-widget-watch-dialog-close =
    .aria-label = Fermi
    .title = Fermi
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Senpage
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Senpaga provo
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Senpaga kaj pagendaj
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Pagendaj
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Nur elektitaj ludoj
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Disponeblaj en via regiono
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Aliaj regionoj
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Malfermi elsendon
    .title = Malfermi elsendon
newtab-sports-widget-group-stage = Grupa fazo
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
newtab-sports-widget-round-32 = Rondo de 32
newtab-sports-widget-round-16 = Rondo de 16
newtab-sports-widget-quarter-finals = Kvaronfinaloj
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = REKTE
newtab-custom-widget-live-refresh =
    .title = Refreŝigi rezultojn
    .aria-label = Refreŝigi rezultojn
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Ĉefaj datoj
newtab-sports-widget-upcoming = Venontaj
# Used for a match currently ongoing
newtab-sports-widget-now = Nun
newtab-sports-widget-results = Rezultoj
newtab-sports-widget-semi-finals = Duonfinaloj
newtab-sports-widget-bronze-finals = BRONZA FINALO
# Final is the final match for 1st place.
newtab-sports-widget-final = Finalo
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Malfruigita
newtab-sports-widget-postponed = Prokrastita
newtab-sports-widget-suspended = Haltigita
newtab-sports-widget-cancelled = Nuligita
newtab-sports-widget-information = Informoj pri la ludo
newtab-sports-widget-no-live-data = Ne estas nunaj ĝisdatigoj por la ludo
newtab-sports-widget-view-results-link = Montri rezultojn
newtab-sports-widget-third-place = Tria loko
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Dua loko
newtab-sports-widget-champions = Ĉampionoj
newtab-sports-widget-world-cup-champions = Ĉampionoj de la piedpilka mondpokalo 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Ludo finita
newtab-sports-widget-match-halftime = Intertempa paŭzo
newtab-sports-widget-match-extra-time = Ekstra tempo
newtab-sports-widget-match-penalties = Penaloj
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = kontraŭ
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Restu atenta por koni la detalojn de la venonta ludo

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Antaŭa
    .title = Antaŭa
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Venonta
    .title = Venonta
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Rekta ludo { $index } el { $total }
    .title = Rekta ludo { $index } el { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } kontraŭ { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) kontraŭ { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Rekte: { $homeTeam }, { $homeScore } kontraŭ { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } kontraŭ { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } kontraŭ { $awayTeam }, malfruigita
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } kontraŭ { $awayTeam }, prokrastita
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } kontraŭ { $awayTeam }, haltigita
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } kontraŭ { $awayTeam }, nuligita

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosnujo and Hercegovino
newtab-sports-widget-team-name-label-civ =
    .label = Eburbordo
newtab-sports-widget-team-name-label-cod =
    .label = Demokratia Respubliko Kongo
newtab-sports-widget-team-name-label-eng =
    .label = Anglio
newtab-sports-widget-team-name-label-sco =
    .label = Skotlando
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Difinota

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Komencu la mondpokalon kun novaj ekranfonoj
newtab-sports-widget-message-wallpapers-body = Aldonu iom da luda energio al via retumilo.
newtab-sports-widget-message-wallpapers-cta = Elekti ekranfonon
newtab-sports-widget-message-add-widgets-cta =
    .label = Aldoni komponantojn
newtab-sports-widget-message-day-in-play-title = Restu en la etoso pokala per la komponantoj de { -brand-product-name }
newtab-sports-widget-message-day-in-play-body = Sekvu la mondpokalon, koncentriĝu en taskoj, sciu kioma horo estas en la cetero de la mondo, kaj pli.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Esplori komponantojn

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Ignori
    .aria-label = Ignori
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Personecigu tiun ĉi lokon
newtab-activation-window-message-customization-focus-message = Elektu novan ekranfonon, aldoni ŝparvojojn al viaj plej ŝatataj retejoj kaj restu informita pri la temoj, kiuj interesas vin.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Komenci personecigi
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Tiu ĉi loko sekvas viajn regulojn
newtab-activation-window-message-values-focus-message = { -brand-product-name } permesas al vi retumi kiel vi ŝatas, per pli persona maniero komenci vian tagan retumon. Personecigu { -brand-product-name }.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Kaŝi horloĝon
newtab-clock-widget-menu-learn-more = Pli da informo
newtab-clock-widget-menu-edit = Modifi horloĝojn
newtab-clock-widget-menu-switch-to-12h = Ŝanĝi al 12 hora formo
newtab-clock-widget-menu-switch-to-24h = Ŝanĝi al 24 hora formo
newtab-clock-widget-label-your-clocks = Viaj horloĝoj
newtab-clock-widget-search-location-input =
    .label = Loko
    .placeholder = Serĉi urbon
    .aria-label = Serĉi urbon
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Kromnomo (nedeviga)
    .placeholder = Aldoni kromnomon
    .aria-label = Kromnomo (nedeviga)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Aldoni novan horloĝon
    .aria-label = Aldoni novan horloĝon
newtab-clock-widget-button-add-clock = Aldoni
newtab-clock-widget-button-cancel = Nuligi
newtab-clock-widget-button-back =
    .title = Reen
    .aria-label = Reen
newtab-clock-widget-button-edit-clock =
    .title = Modifi horloĝon
    .aria-label = Modifi horloĝon
newtab-clock-widget-button-save = Konservi
newtab-clock-widget-button-remove-clock =
    .title = Forigi horloĝon
    .aria-label = Forigi horloĝon
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
    .aria-label = { $city }, kromnomo: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Aldoni horloĝon
newtab-clock-widget-edit-clock-form =
    .aria-label = Modifi horloĝon
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Rezulto de serĉo
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Neniu kongruo
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Malfermi horloĝan menuon
    .aria-label = Malfermi horloĝan menuon
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Kromnomo: { $nickname }
