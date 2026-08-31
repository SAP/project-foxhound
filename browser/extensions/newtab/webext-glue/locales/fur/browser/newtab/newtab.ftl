# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Gnove schede
newtab-settings-button =
    .title = Personalize la pagjine de tô gnove schede
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Personalize cheste pagjine
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Personalize
newtab-customize-panel-label =
    .label = Personalize
newtab-personalize-settings-icon-label =
    .title = Personalize Gnove schede
    .aria-label = Impostazions
newtab-settings-dialog-label =
    .aria-label = Impostazions
newtab-personalize-icon-label =
    .title = Personalize gnove schede
    .aria-label = Personalize gnove schede
newtab-personalize-dialog-label =
    .aria-label = Personalize
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Siere
    .aria-label = Siere

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Pagjine iniziâl
home-homepage-new-windows =
    .label = Gnûfs barcons
home-homepage-new-tabs =
    .label = Gnovis schedis
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Sielç un sît specific

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Direzions di sîts web
home-custom-homepage-address =
    .placeholder = Inserìs une direzion
home-custom-homepage-address-button =
    .label = Zonte direzion
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Nol è stât zontât ancjemò nissun sît.
home-custom-homepage-delete-address-button =
    .aria-label = Elimine la direzion
    .title = Elimine la direzion
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Sostituìs cun
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Pagjinis viertis in chest moment
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Segnelibris…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Ricercje
home-prefs-stories-header2 =
    .label = Storiis
    .description = Contignûts ecezionâi curâts de famee di prodots { -brand-product-name }
home-prefs-widgets-header =
    .label = Widgets
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Listis
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Temporizadôr
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Sports
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Orloi
home-prefs-mission-message2 =
    .message = I nestris prudeladôrs a sostegnin la nestre mission di fâ sù un web miôr.
home-prefs-manage-topics-link2 =
    .label = Gjestìs argoments
home-prefs-choose-wallpaper-link2 =
    .label = Sielç un fonts
home-prefs-firefox-logo-header =
    .label = Logo di { -brand-short-name }
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Par doprâ chestis funzions, stabilìs gnovis schedis o gnûfs barcons su { -firefox-home-brand-name }.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } rie
           *[other] { $num } riis
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Estension ({ $extension })
home-restore-defaults-srd =
    .label = Ripristine predefinîts
    .accesskey = R
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (predefinît)
home-mode-choice-custom-srd =
    .label = Direzions web personalizadis…
home-mode-choice-blank-srd =
    .label = Pagjine vueide
home-prefs-shortcuts-header-srd =
    .label = Scurtis
home-prefs-shortcuts-select =
    .aria-label = Scurtis
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Scurtis sponsorizadis
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Storiis patrocinadis
home-prefs-highlights-option-visited-pages-srd =
    .label = Pagjinis visitadis
home-prefs-highlights-options-bookmarks-srd =
    .label = Segnelibris
home-prefs-highlights-option-most-recent-download-srd =
    .label = Discjariâts plui di resint
home-prefs-recent-activity-header-srd =
    .label = Ativitât resinte
home-prefs-recent-activity-select =
    .aria-label = Ativitât resinte
home-prefs-weather-header-srd =
    .label = Meteo
home-prefs-support-firefox-header-srd =
    .label = Prudele { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = Scuvierç cemût

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Cîr
    .aria-label = Cîr
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Cîr cun { $engine } o inserìs la direzion
newtab-search-box-handoff-text-no-engine = Cîr o inserìs la direzion
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Cîr cun { $engine } o inserìs la direzion
    .title = Cîr cun { $engine } o inserìs la direzion
    .aria-label = Cîr cun { $engine } o inserìs la direzion
newtab-search-box-handoff-input-no-engine =
    .placeholder = Cîr o inserìs la direzion
    .title = Cîr o inserìs la direzion
    .aria-label = Cîr o inserìs la direzion
newtab-search-box-text = Cîr tal web
newtab-search-box-input =
    .placeholder = Cîr tal web
    .aria-label = Cîr tal web

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Zonte motôr di ricercje
newtab-topsites-add-shortcut-header = Gnove scurte
newtab-topsites-edit-topsites-header = Modifiche sît principâl
newtab-topsites-edit-shortcut-header = Modifiche scurte
newtab-topsites-add-shortcut-label = Zonte scurte
newtab-topsites-add-shortcut-title =
    .title = Zonte scurte
    .aria-label = Zonte scurte
newtab-topsites-title-label = Titul
newtab-topsites-title-input =
    .placeholder = Inserìs un titul
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Scrîf o tache un URL
newtab-topsites-url-validation = URL valit necessari
newtab-topsites-image-url-label = URL di imagjin personalizade
newtab-topsites-use-image-link = Dopre une imagjin personalizade…
newtab-topsites-image-validation = No si à rivât a cjariâ la imagjin. Prove cuntun URL diferent.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Nete test

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Anule
newtab-topsites-delete-history-button = Elimine de cronologjie
newtab-topsites-save-button = Salve
newtab-topsites-preview-button = Anteprime
newtab-topsites-add-button = Zonte

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Eliminâ pardabon ogni istance di cheste pagjine de tô cronologjie?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = No si pues tornâ indaûr di cheste operazion.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Sponsorizât

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (fissât)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Vierç menù
    .aria-label = Vierç menù
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Gjave
    .aria-label = Gjave
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Vierç menù
    .aria-label = Vierç il menù contestuâl par { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Modifiche chest sît
    .aria-label = Modifiche chest sît

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Modifiche
newtab-menu-open-new-window = Vierç intun gnûf barcon
newtab-menu-open-new-private-window = Vierç intun gnûf barcon privât
newtab-menu-dismiss = Scarte
newtab-menu-pin = Fisse
newtab-menu-unpin = Mole
newtab-menu-delete-history = Elimine de cronologjie
newtab-menu-save-to-pocket = Salve su { -pocket-brand-name }
newtab-menu-delete-pocket = Elimine di { -pocket-brand-name }
newtab-menu-archive-pocket = Archivie in { -pocket-brand-name }
newtab-menu-show-privacy-info = I nestris patrocinadôrs e la tô riservatece
newtab-menu-about-fakespot = Informazions su { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Segnale
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Bloche
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Smet di sta daûr
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Plui informazions
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Smet di sta daûr al argoment

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Gjestìs contignûts sponsorizâts
newtab-menu-our-sponsors-and-your-privacy = I nestris sponsors e la tô riservatece
newtab-menu-report-this-ad = Segnale chest anunci

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Fat
newtab-privacy-modal-button-manage = Gjestìs lis impostazions dai contignûts sponsorizâts
newtab-privacy-modal-header = La tô riservatece e je impuartante.
newtab-privacy-modal-paragraph-2 =
    Sore a proponiti storiis inmagantis, ti mostrin ancje contignûts,
    pertinents e curâts cun atenzion, promovûts di un grup selezionât di
    sponsors. Ti garantìn che <strong>nissun dât relatîf ae tô navigazion
    al vignarà condividût de tô copie personâl di { -brand-product-name }</strong>.
    Nô no viodìn chestis informazions e ancjemò di mancul i nestris sponsors.
newtab-privacy-modal-link = Scuvierç cemût che la riservatece e funzione te gnove schede

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Gjave segnelibri
# Bookmark is a verb here.
newtab-menu-bookmark = Segnelibri

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Copie colegament dal discjariament
newtab-menu-go-to-download-page = Va te pagjine dai discjariaments
newtab-menu-remove-download = Gjave de cronologjie

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Mostre in Finder
       *[other] Vierç la cartele che lu conten
    }
newtab-menu-open-file = Vierç file

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Visitât
newtab-label-bookmarked = Metût tai segnelibris
newtab-label-removed-bookmark = Segnelibri gjavât
newtab-label-recommended = Di tindince
newtab-label-saved = Salvât su { -pocket-brand-name }
newtab-label-download = Discjariât
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Sponsorizât
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Patrocinât di { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Sponsorizât

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Gjave sezion
newtab-section-menu-collapse-section = Strenç la sezion
newtab-section-menu-expand-section = Slargje sezion
newtab-section-menu-manage-section = Gjestìs sezion
newtab-section-menu-manage-webext = Gjestìs estension
newtab-section-menu-add-topsite = Zonte sît principâl
newtab-section-menu-add-search-engine = Zonte motôr di ricercje
newtab-section-menu-move-up = Sposte in sù
newtab-section-menu-move-down = Sposte in jù
newtab-section-menu-privacy-notice = Informative su la riservatece

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Strenç la sezion
newtab-section-expand-section-label =
    .aria-label = Slargje sezion

## Section Headers.

newtab-section-header-topsites = Sîts principâi
newtab-section-header-recent-activity = Ativitât resinte
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Conseât di { $provider }
newtab-section-header-stories = Storiis che a fasin pensâ
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Lis sieltis di vuê par te

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Scomence a navigâ e, in cheste sezion, ti mostrarìn cualchi articul impuartant, videos e altris pagjinis che tu âs visitât di resint o tu âs metût tai segnelibris.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Tu sês rivât insom. Controle plui indenant par vê altris storiis di { $provider }. No tu rivis a spietâ? Selezione un argoment tra chei plui popolârs par cjatâ altris storiis interessantis ator pal web.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Nuie altri di gnûf. Torne controle plui indevant par altris storiis. No tu rivis a spietâ? Selezione un argoment di chei plui popolârs par scuvierzi altris storiis interessantis dal web.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Tu sês rivât insom!
newtab-discovery-empty-section-topstories-content = Controle plui indenant par vê plui storiis.
newtab-discovery-empty-section-topstories-try-again-button = Torne prove
newtab-discovery-empty-section-topstories-loading = Daûr a cjariâ…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Orpo! Al somee che cheste sezion no si sedi cjariade dal dut.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Argoments popolârs:
newtab-pocket-new-topics-title = Desideristu vê ancjemò plui storiis? Bute un voli a chescj argoments popolârs di { -pocket-brand-name }
newtab-pocket-more-recommendations = Altris sugjeriments
newtab-pocket-learn-more = Plui informazions
newtab-pocket-cta-button = Oten { -pocket-brand-name }
newtab-pocket-cta-text = Salve lis storiis che ti plasin in { -pocket-brand-name } e nudrìs il to cjâf cun leturis apassionantis.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } al è part de famee { -brand-product-name }
newtab-pocket-save = Salve
newtab-pocket-saved = Salvât

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Plui contignûts come chest
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = No mi interesse
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Graciis. La tô opinion nus judarà a miorâ il to feed.
newtab-toast-dismiss-button =
    .title = Siere
    .aria-label = Scarte

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Scuvierç il miôr dal web
newtab-pocket-onboarding-cta = { -pocket-brand-name } al esplore une grande schirie di publicazions par puartâ i contignûts plui informatîfs, stimolants e afidabii dret sul to navigadôr { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Orpo!, alc al è lât strucj tal cjariâ chest contignût.
newtab-error-fallback-refresh-link = Inzorne la pagjine par tornâ a provâ.

## Customization Menu

newtab-custom-shortcuts-title = Scurtis
newtab-custom-shortcuts-subtitle = Sîts che tu âs salvât o visitât
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Scurtis
    .description = Sîts che tu âs salvât o visitât
newtab-custom-shortcuts-nova =
    .label = Scurtis
newtab-custom-row-description =
    .description = Numar di riis
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } rie
           *[other] { $num } riis
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } rie
       *[other] { $num } riis
    }
newtab-custom-sponsored-sites = Scurtis sponsorizadis
newtab-custom-pocket-title = Conseâts di { -pocket-brand-name }
newtab-custom-pocket-subtitle = Contignûts ecezionâi curâts di { -pocket-brand-name }, part de famee { -brand-product-name }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Storiis conseadis
    .description = Contignûts ecezionâl curât de famee di prodots { -brand-product-name }
newtab-recommended-stories-toggle =
    .label = Storiis conseadis
newtab-custom-stories-personalized-toggle =
    .label = Storiis
newtab-custom-stories-personalized-checkbox-label = Storiis personalizadis in base ae tô ativitât
newtab-custom-pocket-sponsored = Storiis sponsorizadis
newtab-custom-pocket-show-recent-saves = Mostre salvaments resints
newtab-custom-recent-title = Ativitât resinte
newtab-custom-recent-subtitle = Une selezion di sîts e contignûts resints
newtab-custom-weather-toggle =
    .label = Meteo
    .description = Previsions par vuê cuntune voglade
newtab-custom-widget-weather-toggle =
    .label = Meteo
newtab-custom-widget-lists-toggle =
    .label = Listis
newtab-custom-widget-timer-toggle =
    .label = Temporizadôr
newtab-custom-widget-sports-toggle =
    .label = Cope dal mont
newtab-custom-widget-clock-toggle =
    .label = Orloi
newtab-custom-widget-sports-toggle2 =
    .label = Sports
newtab-custom-widget-section-title = Widgets
newtab-custom-widget-section-toggle =
    .label = Widgets
newtab-widget-manage-title = Widgets
newtab-widget-manage-widget-button =
    .label = Gjestìs widgets
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Siere
    .aria-label = Siere menù
newtab-custom-close-button = Siere
newtab-custom-settings = Gjestìs plui impostazions

## New Tab Wallpapers

newtab-wallpaper-title = Fonts
newtab-wallpaper-reset = Ripristine predefinît
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Cjame une imagjin
newtab-wallpaper-add-an-image = Zonte une imagjin
newtab-wallpaper-custom-color = Sielç un colôr
newtab-wallpaper-toggle-title =
    .label = Fonts
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = La imagjin e va fûr de dimension massime ametude ({ $file_size } MB). Prove a cjariâ un file plui piçul.
newtab-wallpaper-error-upload-file-type = No sin rivâts a cjariâ in rêt il to file. Torne prove cuntun file di imagjin.
newtab-wallpaper-error-file-type = No rivìn a cjariâ il to file. Torne prove cuntun altri gjenar di file.
newtab-wallpaper-light-red-panda = Panda ros
newtab-wallpaper-light-mountain = Montagne blancje
newtab-wallpaper-light-sky = Cîl cun nui viole e rose
newtab-wallpaper-light-color = Formis zalis, blu e rose
newtab-wallpaper-light-landscape = Paisaç cun montagne involuçât intune fumate blu
newtab-wallpaper-light-beach = Splaze cun palmis
newtab-wallpaper-dark-aurora = Aurore boreâl
newtab-wallpaper-dark-color = Formis rossis e blu
newtab-wallpaper-dark-panda = Panda ros platât tal bosc
newtab-wallpaper-dark-sky = Paisaç di citât cun cîl di gnot
newtab-wallpaper-dark-mountain = Paisaç cun montagne
newtab-wallpaper-dark-city = Paisaç citadin cun tonalitât viole
newtab-wallpaper-dark-fox-anniversary = Une bolp sul marcjepît dongje di un bosc
newtab-wallpaper-light-fox-anniversary = Une bolp intun cjamp jerbôs cuntun paesaç di montagne infumatât

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Colôr solit
newtab-wallpaper-colors = Colôrs
newtab-wallpaper-blue = Blu
newtab-wallpaper-light-blue = Blu clâr
newtab-wallpaper-light-purple = Viole clâr
newtab-wallpaper-light-green = Vert clâr
newtab-wallpaper-green = Vert
newtab-wallpaper-beige = Beige
newtab-wallpaper-yellow = Zâl
newtab-wallpaper-orange = Naranç
newtab-wallpaper-pink = Rose
newtab-wallpaper-light-pink = Rose clâr
newtab-wallpaper-red = Ros
newtab-wallpaper-dark-blue = Blu scûr
newtab-wallpaper-dark-purple = Viole scûr
newtab-wallpaper-dark-green = Vert scûr
newtab-wallpaper-brown = Maron

## Abstract

newtab-wallpaper-category-title-abstract = Astrat
newtab-wallpaper-abstract-green = Formis verdis
newtab-wallpaper-abstract-blue = Formis blu
newtab-wallpaper-abstract-purple = Formis viole
newtab-wallpaper-abstract-orange = Formis naranç
newtab-wallpaper-gradient-orange = Gradient naranç e rose
newtab-wallpaper-abstract-blue-purple = Formis blu e viole
newtab-wallpaper-abstract-white-curves = Blanc cun curvis sfumadis
newtab-wallpaper-abstract-purple-green = Sfumadure di lûs viole e verde
newtab-wallpaper-abstract-blue-purple-waves = Formis ondadis blu e viole
newtab-wallpaper-abstract-black-waves = Formis ondadis neris

## Firefox

newtab-wallpaper-category-title-photographs = Fotografiis
newtab-wallpaper-beach-at-sunrise = Splaze al cricâ dal dì
newtab-wallpaper-beach-at-sunset = Splaze al tramont
newtab-wallpaper-storm-sky = Cîl di tampieste
newtab-wallpaper-sky-with-pink-clouds = Cîl cun nui rose
newtab-wallpaper-red-panda-yawns-in-a-tree = Panda ros che al sossede suntun arbul
newtab-wallpaper-white-mountains = Montagnis blancjis
newtab-wallpaper-hot-air-balloons = Mongolfieris cun colôrs assortîts cjapadis in plen dì
newtab-wallpaper-starry-canyon = Gnot stelade blu
newtab-wallpaper-suspension-bridge = Fotografie di un puint grîs sospindût fate vie pal dì
newtab-wallpaper-sand-dunes = Dunis di savalon blanc
newtab-wallpaper-palm-trees = Sacume di palme di coco cjapade vie pe ore di aur
newtab-wallpaper-blue-flowers = Fotografie fate di dongje di rosis cun pics blu in floridure
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Foto di <a data-l10n-name="name-link">{ $author_string }</a> su <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Prove une man di colôr
newtab-wallpaper-feature-highlight-content = Da un aspiet diviers aes tôs gnovis schedis cui fonts.
newtab-wallpaper-feature-highlight-button = Capît
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Siere
    .aria-label = Siere barcon a comparse
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Spazi celest
newtab-wallpaper-celestial-lunar-eclipse = Eclìs lunâr
newtab-wallpaper-celestial-earth-night = Foto di gnot de orbite de tiere basse
newtab-wallpaper-celestial-starry-sky = Cîl di stelis
newtab-wallpaper-celestial-eclipse-time-lapse = Dade di timp de eclìs lunâr
newtab-wallpaper-celestial-black-hole = Ilustrazion de galassie di un bûs neri
newtab-wallpaper-celestial-river = Imagjin satelitâr di un flum

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Viôt lis previsions in { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Sponsorizât
newtab-weather-menu-change-location = Cambie localitât
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Cîr localitât
    .aria-label = Cîr localitât
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Dopre la posizion atuâl
newtab-weather-menu-weather-display = Visualizazion meteo
newtab-weather-todays-forecast = Previsions par vuê
newtab-weather-see-full-forecast = Viôt la prevision complete
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Sintetiche
newtab-weather-menu-change-weather-display-simple = Passe ae viodude sintetiche
newtab-weather-menu-weather-display-option-detailed = Detaiade
newtab-weather-menu-change-weather-display-detailed = Passe ae viodude detaiade
newtab-weather-menu-temperature-units = Unitâts di temperadure
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Passe a Fahrenheit
newtab-weather-menu-change-temperature-units-celsius = Passe a Celsius
newtab-weather-menu-hide-weather = Plate il meteo ae Gnove schede
newtab-weather-menu-learn-more = Plui informazions
newtab-weather-menu-detect-my-location = Rileve la mê posizion
# This message is shown if user is working offline
newtab-weather-error-not-available = I dâts sul meteo in chest moment no son disponibii.
newtab-weather-opt-in-see-weather = Desideristu viodi il timp pe tô posizion?
newtab-weather-opt-in-not-now =
    .label = No cumò
newtab-weather-opt-in-yes =
    .label = Sì
newtab-weather-opt-in-headline = Viôt lis previsions meteorologjichis locâls
newtab-weather-opt-in-use-location =
    .label = Dopre posizion
newtab-weather-opt-in-choose-location = Sielç posizion
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Massime
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Minime
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Viôt lis previsions in { $provider }
    .aria-description = { $provider } ∙ Sponsorizât

## Topic Labels

newtab-topic-label-business = Economie
newtab-topic-label-career = Cariere
newtab-topic-label-education = Educazion
newtab-topic-label-arts = Intratigniment
newtab-topic-label-food = Mangjative
newtab-topic-label-health = Salût
newtab-topic-label-hobbies = Zûcs
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Financis personâls
newtab-topic-label-society-parenting = Educazion dai fîs
newtab-topic-label-government = Politiche
newtab-topic-label-education-science = Sience
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Mioraments personâi
newtab-topic-label-sports = Sports
newtab-topic-label-tech = Tecnologjie
newtab-topic-label-travel = Viaçs
newtab-topic-label-home = Cjase e zardin

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Selezione i argoments par regolâ il to feed
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Sielç doi o plui argoments. I nestris esperts curadôrs a daran prioritât aes storiis plui adatis ai tiei interès. Tu puedis inzornâ lis tôs preferencis cuant che tu vûs.
newtab-topic-selection-save-button = Salve
newtab-topic-selection-cancel-button = Anule
newtab-topic-selection-button-maybe-later = Magari plui indevant
newtab-topic-selection-privacy-link = Scuvierç cemût che o gjestìn e o protezìn i dâts
newtab-topic-selection-button-update-interests = Inzorne i tiei interès
newtab-topic-selection-button-pick-interests = Sielç i tiei interès

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Sta daûr
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Sta daûr a { $topic }
newtab-section-following-button = Tu stâs daûr
newtab-section-unfollow-button = Smet di sta daûr
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Tu stâs daûr: smet di stâ daûr a { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Regole di fin il to feed
newtab-section-follow-highlight-subtitle = Sta daûr dai argoments che ti interessin par scuvierzi di plui su ce che ti plâs.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Bloche
newtab-section-blocked-button = Blocât
newtab-section-unblock-button = Sbloche
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Sta daûr a { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Smet di stâ daûr a { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Bloche { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Sbloche { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = No cumò
newtab-section-confirm-block-topic-p1 = Blocâ pardabon chest argoment?
newtab-section-confirm-block-topic-p2 = I argoments blocâts no vignaran plui mostrâts tal to feed.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Bloche { $topic }
newtab-section-block-cancel-button = Anule

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Argoments
newtab-section-manage-topics-button-v2 =
    .label = Gjestìs argoments
newtab-section-mangage-topics-followed-topics = Tu vâs daûr
newtab-section-mangage-topics-followed-topics-empty-state = No tu sês ancjemò daûr a nissun argoment.
newtab-section-mangage-topics-blocked-topics = Blocât
newtab-section-mangage-topics-blocked-topics-empty-state = No tu âs ancjemò blocât nissun argoment.
newtab-custom-wallpaper-title = I fonts personalizâts a son achì
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Cjame il to font o sielç un colôr personalizât par fâ to { -brand-product-name }.
newtab-custom-wallpaper-cta = Provilu

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Sielç un fonts par personalizâ il to { -brand-product-name }
newtab-new-user-custom-wallpaper-subtitle = Rint ogni gnove schede come se e fos cjase tô, cun fonts e colôrs personalizâts.
newtab-new-user-custom-wallpaper-cta = Provilu daurman

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = A son rivâts gnûfs fonts
newtab-wallpaper-feature-highlight-subtitle = Sielç il fonts che ti plâs di plui e rint familiâr ogni gnove schede.
newtab-wallpaper-feature-highlight-cta = Sielç fonts

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Discjame { -brand-product-name } par dispositîfs mobii
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Scansione il codiç par navigâ in sigurece dapardut.
newtab-download-mobile-highlight-body-variant-b = Ripie di dulà che tu jeris restât sincronizant schedis, passwords e tant altri.
newtab-download-mobile-highlight-body-variant-c = Savevistu che tu puedis simpri puartâ daûr { -brand-product-name }? Il stes navigadôr, te tô sachete.
newtab-download-mobile-highlight-image =
    .aria-label = Codiç QR par discjariâ { -brand-product-name } par dispositîfs mobii

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = I tiei preferîts a puartade di man
newtab-shortcuts-highlight-subtitle = Zonte une scurte par mantignî i tiei sîts preferîts a puartade di clic.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Parcè stâstu segnalant cheste publicitât?
newtab-report-ads-reason-not-interested =
    .label = No mi interesse
newtab-report-ads-reason-inappropriate =
    .label = E je inadate
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Le ai viodude masse voltis
newtab-report-content-wrong-category =
    .label = Categorie sbaliade
newtab-report-content-outdated =
    .label = Vecje
newtab-report-content-inappropriate-offensive =
    .label = Inadate o ofensive
newtab-report-content-spam-misleading =
    .label = Spam o ingjanose
newtab-report-content-requires-payment-subscription =
    .label = Al domande il paiament o l'abonament
newtab-report-content-requires-payment-subscription-learn-more = Par savê di plui
newtab-report-cancel = Anule
newtab-report-submit = Invie
newtab-toast-thanks-for-reporting =
    .message = Graciis pe segnalazion.
newtab-toast-widgets-hidden =
    .message = Selezione la icone a forme di lapis par tornâ a zontâ i widgets cuant che tu vuelis.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Cumò tu stâs daûr a { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = No tu stâs plui daûr a { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = No tu viodarâs plui storiis su { $topic }.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Lis pussibilitâts a son infinidis. Zonte une.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Novitâts
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Completadis ({ $number })
newtab-widget-lists-celebration-headline = Biel lavôr
newtab-widget-lists-celebration-subhead = Fat dut
newtab-widget-task-list-menu-copy = Copie
newtab-widget-lists-menu-edit = Modifiche non liste
newtab-widget-lists-menu-edit2 =
    .aria-label = Modifiche non liste
newtab-widget-lists-menu-create = Cree gnove liste
newtab-widget-lists-menu-delete = Elimine cheste liste
newtab-widget-lists-menu-copy = Copie liste intes notis
newtab-widget-lists-menu-learn-more = Plui informazions
newtab-widget-lists-button-add-item = Zonte un element
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Zonte un element
    .aria-label = Zonte un element
newtab-widget-lists-input-error = Inclût test par zontâ un element.
newtab-widget-lists-input-menu-open-link = Vierç colegament
newtab-widget-lists-input-menu-move-up = Sposte in sù
newtab-widget-lists-input-menu-move-down = Sposte in jù
newtab-widget-lists-input-menu-delete = Elimine
newtab-widget-lists-input-menu-edit = Modifiche
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Modifiche element
newtab-widget-lists-edit-clear =
    .aria-label = Anule
    .title = Anule
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Cree une gnove liste
newtab-widget-lists-name-label-default =
    .label = Liste di ativitâts
newtab-widget-lists-name-label-checklist =
    .label = Liste di control
newtab-widget-lists-name-placeholder-default =
    .placeholder = Liste di ativitâts
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Liste di control
    .aria-label = Modifiche non de liste
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Gnove liste
    .aria-label = Modifiche non liste
newtab-widget-section-title = Widgets
newtab-widget-menu-hide = Plate widgets
newtab-widget-menu-change-size = Cambie dimension
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Sposte
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = A çampe
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = A diestre
newtab-widget-size-small = Piçule
newtab-widget-size-medium = Medie
newtab-widget-size-large = Grande
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Plate widgets
    .aria-label = Plate ducj i widgets
newtab-widget-section-maximize =
    .title = Slargje widgets
    .aria-label = Slargje ducj i widgets ae dimension massime
newtab-widget-section-minimize =
    .title = Minimize widgets
    .aria-label = Strenç ducj i widgets ae dimension compate
newtab-widget-section-menu-button =
    .title = Menù widgets
    .aria-label = Vierç menù dai widgets
newtab-widget-add-widgets-button =
    .aria-label = Zonte widget
    .title = Zonte widget
newtab-widget-section-menu-manage = Gjestìs widgets
newtab-widget-section-menu-hide-all = Plate widgets
newtab-widget-section-menu-learn-more = Plui informazions
newtab-widget-section-feedback = Dânus la tô opinion
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Mostre altris widgets
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Mostre mancul widgets
newtab-widget-lists-name-default = Liste di control

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Temporizadôr
newtab-widget-timer-notification-focus = Il timp par concentrâti al è finît. Ben fate. Ti coventie une pause?
newtab-widget-timer-notification-break = La tô pause e je finide. Sêstu pront(e) par concentrâti?
newtab-widget-timer-notification-warning = Lis notifichis a son disativadis
newtab-widget-timer-mode-focus =
    .label = Concentrazion
newtab-widget-timer-mode-break =
    .label = Pause
newtab-widget-timer-label-play =
    .label = Invie
newtab-widget-timer-label-pause =
    .label = Met in pause
newtab-widget-timer-reset =
    .title = Ripristine
newtab-widget-timer-menu-notifications = Disative lis notifichis
newtab-widget-timer-menu-notifications-on = Ative lis notifichis
newtab-widget-timer-menu-learn-more = Plui informazions
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Gnovis in evidence
newtab-daily-briefing-card-menu-dismiss = Siere
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Inzornât { $minutes }m indaûr
newtab-widget-message-title = Reste concentrât doprant lis listis e il temporizadôr integrât
# to-dos stands for "things to do".
newtab-widget-message-copy = Di pro memoria svelts a listis di ativitâts cuotidianis, di sessions di concentrazion a pausis par rilassâsi — manten la atenzion e rispiete i timps.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Un puest dulà concentrâsi, viodi lis previsions dal timp e tant altri
newtab-widget-message-focus-forecasts-body = Fâs cori la tô zornade cui widgets di { -brand-product-name }. Bute un voli aes previsions dal timp, reste concentrât su lis tôs ativitâts o ten di voli l'orloi globâl.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Rint { -brand-product-name } pardabon to
newtab-promo-card-body-addons = Sielç un fonts de nestre colezion opûr prodûs un to.
newtab-promo-card-cta-addons = Provilu daurman
newtab-promo-card-title = Prudele { -brand-product-name }
newtab-promo-card-body = I nestris patrocinadôrs nus supuartin te nestre mission di fâ sù un web miôr
newtab-promo-card-cta = Plui informazions
newtab-promo-card-dismiss-button =
    .title = Siere
    .aria-label = Scarte e siere

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] Invie il temporizadôr di { $minutes } minût
           *[other] Invie il temporizadôr di { $minutes } minûts
        }
newtab-widget-timer-pause-aria =
    .aria-label = Met in pause il temporizadôr
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } minût
           *[other] { $minutes } minûts
        }
newtab-widget-timer-decrease-min =
    .title = Diminuìs di 1 minût
newtab-widget-timer-increase-min =
    .title = Aumente di 1 minût
newtab-widget-timer-mode-group =
    .aria-label = Modalitât temporizadôr
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Concentrazion
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Pause
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Plate temporizadôr
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Biel lavôr
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = La tô pause e je finide
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Ti coventie une pause?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Sêstu pront(e) a concentrâti?

##

newtab-sports-widget-menu-follow-teams = Sta daûr des scuadris
newtab-sports-widget-menu-view-schedule = Viôt il calendari
newtab-sports-widget-menu-view-upcoming = Visualize ce che al sta par rivâ
newtab-sports-widget-menu-view-results = Viôt i risultâts
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Datis impuartantis
newtab-sports-widget-menu-learn-more = Plui informazions
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Reste inzornât sui mondiâi
newtab-sports-widget-get-updates = Ricêf inzornaments in timp reâl su lis partidis e ancjemò altri.
newtab-sports-widget-view-schedule =
    .label = Viôt il calendari
newtab-sports-widget-follow-teams =
    .label = Sta daûr des scuadris
newtab-sports-widget-view-matches =
    .label = Viôt partidis
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Sta daûr fin a un massim di { $number } scuadre
       *[other] Sta daûr fin a un massim di { $number } scuadris
    }
newtab-sports-widget-choose-wallpaper =
    .label = Sielç un fonts
newtab-sports-widget-skip = Salte
newtab-sports-widget-search-country =
    .placeholder = Cîr nazion
    .aria-label = Cîr nazion
newtab-sports-widget-cancel = Anule
newtab-sports-widget-back-button =
    .aria-label = Indaûr
newtab-sports-widget-done-button =
    .label = Fat
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (eliminât)
newtab-sports-widget-view-all =
    .label = Mostre dut
newtab-sports-widget-show-less =
    .label = Mostre di mancul
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Dome scuadris che tu stâs daûr
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Cjale
    .title = Cjale direte
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Cjale in direte
    .title = Cjale in direte
newtab-sports-widget-watch-dialog-close =
    .aria-label = Siere
    .title = Siere
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Gratis
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Prove gratuite
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Gratis e a paiament
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = A paiament
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Dome cualchi partide
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Disponibii te tô regjon
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Altris regjons
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Vierç direte video
    .title = Vierç direte video
newtab-sports-widget-group-stage = Fase a zirons
newtab-sports-widget-group-a = Grup A
newtab-sports-widget-group-b = Grup B
newtab-sports-widget-group-c = Grup C
newtab-sports-widget-group-d = Grup D
newtab-sports-widget-group-e = Grup E
newtab-sports-widget-group-f = Grup F
newtab-sports-widget-group-g = Grup G
newtab-sports-widget-group-h = Grup H
newtab-sports-widget-group-i = Grup I
newtab-sports-widget-group-j = Grup J
newtab-sports-widget-group-k = Grup K
newtab-sports-widget-group-l = Grup L
newtab-sports-widget-round-32 = Diesim sescj di finâl
newtab-sports-widget-round-16 = Otâfs di finâl
newtab-sports-widget-quarter-finals = Cuarts di finâl
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = DIRETE
newtab-custom-widget-live-refresh =
    .title = Inzorne risultâts
    .aria-label = Inzorne risultâts
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Datis impuartantis
newtab-sports-widget-upcoming = Daûr a rivâ
# Used for a match currently ongoing
newtab-sports-widget-now = In cors
newtab-sports-widget-results = Risultâts
newtab-sports-widget-semi-finals = Semifinâls
newtab-sports-widget-bronze-finals = Finâl pal tierç puest
# Final is the final match for 1st place.
newtab-sports-widget-final = Finâl
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = In ritart
newtab-sports-widget-postponed = Posticipade
newtab-sports-widget-suspended = Sospindude
newtab-sports-widget-cancelled = Anulade
newtab-sports-widget-information = Informazions su la partide
newtab-sports-widget-no-live-data = In chest moment i dâts de partide in direte no si stan inzornant
newtab-sports-widget-view-results-link = Viôt i risultâts
newtab-sports-widget-third-place = Tierç puest
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Seconts classificâts
newtab-sports-widget-champions = Campions
newtab-sports-widget-world-cup-champions = Campions de Cope dal mont 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Partide finide
newtab-sports-widget-match-halftime = Interval
newtab-sports-widget-match-extra-time = Timps suplementârs
newtab-sports-widget-match-penalties = Rigôrs
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = cuintri
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Torne par cognossi i detais des prossimis partidis

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Prime
    .title = Prime
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Prossime
    .title = Prossime
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Partide in direte { $index } di { $total }
    .title = Partide in direte { $index } di { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } cuintri { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) cuintri { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = In direte: { $homeTeam }, { $homeScore } cuintri { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } cuintri { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } cuintri { $awayTeam }, in ritart
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } cuintri { $awayTeam }, posticipade
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } cuintri { $awayTeam }, sospindude
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } cuintri { $awayTeam }, anulade

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosgne e Erzegovine
newtab-sports-widget-team-name-label-civ =
    .label = Cueste di Avoli
newtab-sports-widget-team-name-label-cod =
    .label = RD Congo
newtab-sports-widget-team-name-label-eng =
    .label = Ingletiere
newtab-sports-widget-team-name-label-sco =
    .label = Scozie
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Di definî

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Scomence i mondiâi cui gnûfs fonts
newtab-sports-widget-message-wallpapers-body = Puarte un tic di atmosfere di partide tal to navigadôr intant dal torneu.
newtab-sports-widget-message-wallpapers-cta = Sielç fonts
newtab-sports-widget-message-add-widgets-cta =
    .label = Zonte widgets
newtab-sports-widget-message-day-in-play-title = Rint plui dinamiche la tô zornade cui widgets di { -brand-product-name }
newtab-sports-widget-message-day-in-play-body = Sta daûr de cope dal mont, reste concentrât, ten di voli de ore ator pal mont e tant altri.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Esplore i widgets

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Siere
    .aria-label = Siere
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Rint chest spazi pardabon to
newtab-activation-window-message-customization-focus-message = Sielç un gnûf fonts, zonte scurtis ai tiei sîts web preferîts e reste inzornât cun lis storiis che ti interessin.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Scomence a personalizâ
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Chest spazi al va daûr lis tôs regulis
newtab-activation-window-message-values-focus-message = { -brand-product-name } ti lasse navigâ come che ti plâs, un mût plui personâl di scomençâ la zornade in rêt. Rint { -brand-product-name } pardabon to.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Plate orloi
newtab-clock-widget-menu-learn-more = Plui informazions
newtab-clock-widget-menu-edit = Modifiche i orlois
newtab-clock-widget-menu-switch-to-12h = Passe al formât di 12 oris
newtab-clock-widget-menu-switch-to-24h = Passe al formât di 24 oris
newtab-clock-widget-label-your-clocks = I tiei orlois
newtab-clock-widget-search-location-input =
    .label = Posizion
    .placeholder = Cîr une citât
    .aria-label = Cîr une citât
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Sorenon (facoltatîf)
    .placeholder = Zonte un sorenon
    .aria-label = Sorenon (facoltatîf)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Zonte gnûf orloi
    .aria-label = Zonte gnûf orloi
newtab-clock-widget-button-add-clock = Zonte
newtab-clock-widget-button-cancel = Anule
newtab-clock-widget-button-back =
    .title = Indaûr
    .aria-label = Indaûr
newtab-clock-widget-button-edit-clock =
    .title = Modifiche orloi
    .aria-label = Modifiche orloi
newtab-clock-widget-button-save = Salve
newtab-clock-widget-button-remove-clock =
    .title = Gjave orloi
    .aria-label = Gjave orloi
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
    .aria-label = { $city }, sorenon: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Zonte orloi
newtab-clock-widget-edit-clock-form =
    .aria-label = Modifiche orloi
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Risultâts de ricercje
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Nissune corispondence
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Vierç il menù pal orloi
    .aria-label = Vierç il menù pal orloi
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Sorenon: { $nickname }
