# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Tab Newydd
newtab-settings-button =
    .title = Cyfaddasu eich tudalen Tab Newydd
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Cyfaddasu’r dudalen hon
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Cyfaddasu
newtab-customize-panel-label =
    .label = Cyfaddasu
newtab-personalize-settings-icon-label =
    .title = Personoli Tab Newydd
    .aria-label = Gosodiadau
newtab-settings-dialog-label =
    .aria-label = Gosodiadau
newtab-personalize-icon-label =
    .title = Personoli tab newydd
    .aria-label = Personoli tab newydd
newtab-personalize-dialog-label =
    .aria-label = Personoli
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Cau
    .aria-label = Cau

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Tudalen Cartref
home-homepage-new-windows =
    .label = Ffenestri newydd
home-homepage-new-tabs =
    .label = Tabiau newydd
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Dewis safle penodol

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Cyfeiriad(au) gwefan
home-custom-homepage-address =
    .placeholder = Rhowch gyfeiriad
home-custom-homepage-address-button =
    .label = Ychwanegu cyfeiriad
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Dim gwefannau wedi'u hychwanegu eto.
home-custom-homepage-delete-address-button =
    .aria-label = Dileu cyfeiriad
    .title = Dileu cyfeiriad
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Amnewid gyda
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Tudalennau ar agor nawr
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Nodau Tudalen…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Chwilio
home-prefs-stories-header2 =
    .label = Straeon
    .description = Cynnwys eithriadol wedi'i gasglu gan deulu { -brand-product-name }
home-prefs-widgets-header =
    .label = Teclynnau
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Rhestrau
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Amserydd
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Chwaraeon
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Cloc
home-prefs-mission-message2 =
    .message = Mae ein noddwyr yn cefnogi ein cenhadaeth i adeiladu gwe well
home-prefs-manage-topics-link2 =
    .label = Rheoli pynciau
home-prefs-choose-wallpaper-link2 =
    .label = Dewis Papur Wal
home-prefs-firefox-logo-header =
    .label = Logo { -brand-short-name }
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = I ddefnyddio'r nodweddion hyn, gosodwch dabiau newydd neu ffenestri newydd i { -firefox-home-brand-name }.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [zero] { $num } rhesi
            [one] { $num } rhes
            [two] { $num } res
            [few] { $num } rhes
            [many] { $num } rhes
           *[other] { $num } rhes
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Estyniad ( { $extension } )
home-restore-defaults-srd =
    .label = Adfer y Rhagosodiadau
    .accesskey = A
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (Rhagosodedig)
home-mode-choice-custom-srd =
    .label = URLau Cyfaddas...
home-mode-choice-blank-srd =
    .label = Tudalen Wag
home-prefs-shortcuts-header-srd =
    .label = Llwybrau Byr
home-prefs-shortcuts-select =
    .aria-label = Llwybrau Byr
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Llwybrau byr wedi'u noddi
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Straeon wedi’u noddi
home-prefs-highlights-option-visited-pages-srd =
    .label = Tudalennau Ymwelwyd â Nhw
home-prefs-highlights-options-bookmarks-srd =
    .label = Nodau Tudalen
home-prefs-highlights-option-most-recent-download-srd =
    .label = Y Llwytho i Lawr Diweddaraf
home-prefs-recent-activity-header-srd =
    .label = Gweithgaredd diweddar
home-prefs-recent-activity-select =
    .aria-label = Gweithgaredd diweddar
home-prefs-weather-header-srd =
    .label = Y Tywydd
home-prefs-support-firefox-header-srd =
    .label = Cefnogi { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = Dyma sut

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Chwilio
    .aria-label = Chwilio
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Chwilio gyda { $engine } neu roi cyfeiriad
newtab-search-box-handoff-text-no-engine = Chwilio neu gyfeiriad gwe
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Chwilio gyda { $engine } neu roi cyfeiriad
    .title = Chwilio gyda { $engine } neu roi cyfeiriad
    .aria-label = Chwilio gyda { $engine } neu roi cyfeiriad
newtab-search-box-handoff-input-no-engine =
    .placeholder = Chwilio neu gyfeiriad gwe
    .title = Chwilio neu gyfeiriad gwe
    .aria-label = Chwilio neu gyfeiriad gwe
newtab-search-box-text = Chwilio'r we
newtab-search-box-input =
    .placeholder = Chwilio'r we
    .aria-label = Chwilio'r we

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Ychwanegu Peiriant Chwilio
newtab-topsites-add-shortcut-header = Llwybr Byr Newydd
newtab-topsites-edit-topsites-header = Golygu'r Hoff Wefan
newtab-topsites-edit-shortcut-header = Golygu Llwybr Byr
newtab-topsites-add-shortcut-label = Ychwanegu Llwybr Byr
newtab-topsites-add-shortcut-title =
    .title = Ychwanegu Llwybr Byr
    .aria-label = Ychwanegu Llwybr Byr
newtab-topsites-title-label = Teitl
newtab-topsites-title-input =
    .placeholder = Rhoi teitl
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Teipio neu ludo URL
newtab-topsites-url-validation = Mae angen URL Ddilys
newtab-topsites-image-url-label = URL Delwedd Gyfaddas
newtab-topsites-use-image-link = Defnyddio delwedd gyfaddas…
newtab-topsites-image-validation = Methodd y ddelwedd â llwytho. Defnyddiwch URL gwahanol.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Clirio testun

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Diddymu
newtab-topsites-delete-history-button = Dileu o'r Hanes
newtab-topsites-save-button = Cadw
newtab-topsites-preview-button = Rhagolwg
newtab-topsites-add-button = Ychwanegu

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Ydych chi'n siŵr eich bod chi am ddileu pob enghraifft o'r dudalen hon o'ch hanes?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Nid oes modd dadwneud y weithred hon.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Noddwyd

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } piniwyd
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Agor dewislen
    .aria-label = Agor dewislen
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Tynnu
    .aria-label = Tynnu
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Agor dewislen
    .aria-label = Agor dewislen cynnwys { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Golygu'r wefan
    .aria-label = Golygu'r wefan

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Golygu
newtab-menu-open-new-window = Agor mewn Ffenestr Newydd
newtab-menu-open-new-private-window = Agor mewn Ffenestr Preifat Newydd
newtab-menu-dismiss = Cau
newtab-menu-pin = Pinio
newtab-menu-unpin = Dad-binio
newtab-menu-delete-history = Dileu o'r Hanes
newtab-menu-save-to-pocket = Cadw i { -pocket-brand-name }
newtab-menu-delete-pocket = Dileu o { -pocket-brand-name }
newtab-menu-archive-pocket = Archifo i { -pocket-brand-name }
newtab-menu-show-privacy-info = Ein noddwyr a'ch preifatrwydd
newtab-menu-about-fakespot = Ynghylch { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Adrodd
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Rhwystro
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Dad-ddilyn
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Rhagor
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Dad-ddilyn Pwnc

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Rheoli cynnwys noddedig
newtab-menu-our-sponsors-and-your-privacy = Ein noddwyr a’ch preifatrwydd chi
newtab-menu-report-this-ad = Adrodd am yr hysbyseb hwn

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Gorffen
newtab-privacy-modal-button-manage = Rheoli gosodiadau cynnwys wedi'i noddi
newtab-privacy-modal-header = Mae eich preifatrwydd yn bwysig.
newtab-privacy-modal-paragraph-2 =
    Yn ogystal â rhannu straeon cyfareddol, rydyn hefyd yn dangos i chi
    gynnwys perthnasol wedi'i ddewis yn ofalus gan noddwyr dethol. Peidiwch â phoeni,
    <strong>nid yw eich data pori byth yn gadael eich copi personol o { -brand-product-name }</strong> - nid ydym 
    yn ei weld, na'n
    noddwyr chwaith.
newtab-privacy-modal-link = Dysgwch sut mae preifatrwydd yn gweithio ar y tab newydd

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Tynnu Nod Tudalen
# Bookmark is a verb here.
newtab-menu-bookmark = Nod Tudalen

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Copïo Dolen Llwytho i Lawr
newtab-menu-go-to-download-page = Mynd i'r Dudalen Llwytho i Lawr
newtab-menu-remove-download = Tynnu o'r Hanes

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Dangos yn Finder
       *[other] Agor Ffolder Cynhwysol
    }
newtab-menu-open-file = Agor Ffeil

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Ymwelwyd
newtab-label-bookmarked = Nod Tudalen
newtab-label-removed-bookmark = Wedi Tynnu'r Nod Tudalen
newtab-label-recommended = Trendio
newtab-label-saved = Cadwyd i { -pocket-brand-name }
newtab-label-download = Wedi eu Llwytho i Lawr
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = Noddir gan { $sponsorOrSource }
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Noddir gan { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } mun
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Noddwyd

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Tynnu'r Adran
newtab-section-menu-collapse-section = Cau'r Adran
newtab-section-menu-expand-section = Ehangu'r Adran
newtab-section-menu-manage-section = Rheoli'r Adran
newtab-section-menu-manage-webext = Rheoli Estyniad
newtab-section-menu-add-topsite = Ychwanegu Hoff Wefan
newtab-section-menu-add-search-engine = Ychwanegu Peiriant Chwilio
newtab-section-menu-move-up = Symud i Fyny
newtab-section-menu-move-down = Symud i Lawr
newtab-section-menu-privacy-notice = Hysbysiad Preifatrwydd

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Cau'r Adran
newtab-section-expand-section-label =
    .aria-label = Ehangu'r Adran

## Section Headers.

newtab-section-header-topsites = Hoff Wefannau
newtab-section-header-recent-activity = Gweithgaredd diweddar
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Argymhellwyd gan { $provider }
newtab-section-header-stories = Straeon sy’n procio’r meddwl
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Dewisiadau heddiw i chi

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Cychwynnwch bori ac fe ddangoswn rhai erthyglau, fideos a thudalennau eraill difyr rydych wedi ymweld â nhw'n ddiweddar neu wedi gosod nod tudalen arnyn nhw yma.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Rydych yn gyfredol. Dewch nôl rhywbryd eto am fwy o'r straeon pwysicaf gan { $provider }. Methu aros? Dewiswch bwnc poblogaidd i ganfod straeon da ar draws y we.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Rydych yn gyfredol. Dewch nôl yn ddiweddarach am fwy o straeon. Methu aros? Dewiswch bwnc poblogaidd i ganfod rhagor o straeon difyr o bob rhan o'r we.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Rydych yn gyfredol!
newtab-discovery-empty-section-topstories-content = Dewch nôl eto am ragor o straeon.
newtab-discovery-empty-section-topstories-try-again-button = Ceisiwch eto
newtab-discovery-empty-section-topstories-loading = Yn llwytho…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Wps! Bron a llwytho'r adran hon, ond nid yn llwyr.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Pynciau Poblogaidd:
newtab-pocket-new-topics-title = Am gael mwy fyth o straeon? Edrychwch ar y pynciau poblogaidd hyn gan { -pocket-brand-name }
newtab-pocket-more-recommendations = Rhagor o Argymhellion
newtab-pocket-learn-more = Darllen rhagor
newtab-pocket-cta-button = Defnyddio { -pocket-brand-name }
newtab-pocket-cta-text = Cadw'r straeon rydych yn eu hoffi i { -pocket-brand-name } a bwydo'ch meddwl á deunydd diddorol.
newtab-pocket-pocket-firefox-family = Mae { -pocket-brand-name } yn rhan o deulu { -brand-product-name }
newtab-pocket-save = Cadw
newtab-pocket-saved = Wedi'u Cadw

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Mwy fel hyn
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Nid i mi
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Diolch. Bydd eich adborth yn ein helpu i wella'ch llif.
newtab-toast-dismiss-button =
    .title = Cau
    .aria-label = Cau

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Darganfod y gorau o'r we
newtab-pocket-onboarding-cta = Mae { -pocket-brand-name } yn archwilio ystod amrywiol o gyhoeddiadau i ddod â'r cynnwys mwyaf addysgiadol, ysbrydoledig a dibynadwy i'ch porwr { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Wps, aeth rhywbeth o'i le wrth llwytho'r cynnwys hwn.
newtab-error-fallback-refresh-link = Adnewyddu'r dudalen i geisio eto.

## Customization Menu

newtab-custom-shortcuts-title = Llwybrau Byr
newtab-custom-shortcuts-subtitle = Gwefannau rydych yn eu cadw neu'n ymweld â nhw
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Llwybrau Byr
    .description = Gwefannau rydych yn eu cadw neu'n ymweld â nhw
newtab-custom-shortcuts-nova =
    .label = Llwybrau Byr
newtab-custom-row-description =
    .description = Nifer y rhesi
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [zero] { $num } rhesi
            [one] { $num } rhes
            [two] { $num } res
            [few] { $num } rhes
            [many] { $num } rhes
           *[other] { $num } rhes
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [zero] { $num } rhesi
        [one] { $num } rhes
        [two] { $num } res
        [few] { $num } rhes
        [many] { $num } rhes
       *[other] { $num } rhes
    }
newtab-custom-sponsored-sites = Llwybrau byr wedi'u noddi
newtab-custom-pocket-title = Argymhellir gan  { -pocket-brand-name }
newtab-custom-pocket-subtitle = Cynnwys eithriadol wedi'i guradu gan { -pocket-brand-name }, rhan o deulu { -brand-product-name }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Straeon cymeradwy
    .description = Cynnwys eithriadol wedi'i gasglu gan deulu { -brand-product-name }
newtab-recommended-stories-toggle =
    .label = Straeon cymeradwy
newtab-custom-stories-personalized-toggle =
    .label = Straeon
newtab-custom-stories-personalized-checkbox-label = Straeon personol ar sail eich gweithgaredd
newtab-custom-pocket-sponsored = Straeon wedi'u noddi
newtab-custom-pocket-show-recent-saves = Dangos pethau gadwyd yn ddiweddar
newtab-custom-recent-title = Gweithgaredd diweddar
newtab-custom-recent-subtitle = Detholiad o wefannau a chynnwys diweddar
newtab-custom-weather-toggle =
    .label = Y Tywydd
    .description = Cipolwg ar ragolygon tywydd heddiw
newtab-custom-widget-weather-toggle =
    .label = Y Tywydd
newtab-custom-widget-lists-toggle =
    .label = Rhestrau
newtab-custom-widget-timer-toggle =
    .label = Amserydd
newtab-custom-widget-sports-toggle =
    .label = Cwpan y Byd
newtab-custom-widget-clock-toggle =
    .label = Cloc
newtab-custom-widget-sports-toggle2 =
    .label = Chwaraeon
newtab-custom-widget-section-title = Teclynnau
newtab-custom-widget-section-toggle =
    .label = Teclynnau
newtab-widget-manage-title = Teclynnau
newtab-widget-manage-widget-button =
    .label = Rheoli teclynnau
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Cau
    .aria-label = Cau'r ddewislen
newtab-custom-close-button = Cau
newtab-custom-settings = Rheoli rhagor o osodiadau

## New Tab Wallpapers

newtab-wallpaper-title = Papurau wal
newtab-wallpaper-reset = Ailosod i'r rhagosodiad
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Llwytho delwedd
newtab-wallpaper-add-an-image = Ychwanegu delwedd
newtab-wallpaper-custom-color = Dewis lliw
newtab-wallpaper-toggle-title =
    .label = Papurau wal
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Mae'r ddelwedd yn fwy na'r terfyn maint ffeil { $file_size }MB. Ceisiwch lwytho ffeil lai.
newtab-wallpaper-error-upload-file-type = Does dim modd i ni lwytho'ch ffeil. Ceisiwch eto gyda gwahanol fathau o ffeil.
newtab-wallpaper-error-file-type = Nid oes modd i ni lwytho'ch ffeil. Ceisiwch eto gyda gwahanol fathau o ffeil.
newtab-wallpaper-light-red-panda = Panda coch
newtab-wallpaper-light-mountain = Mynydd gwyn
newtab-wallpaper-light-sky = Awyr gyda chymylau porffor a phinc
newtab-wallpaper-light-color = Siapiau glas, pinc a melyn
newtab-wallpaper-light-landscape = Tirwedd mynydd a niwlen las
newtab-wallpaper-light-beach = Traeth gyda phalmwydd
newtab-wallpaper-dark-aurora = Aurora Borealis
newtab-wallpaper-dark-color = Siapiau coch a glas
newtab-wallpaper-dark-panda = Panda coch wedi'i guddio yn y goedwig
newtab-wallpaper-dark-sky = Tirwedd y ddinas gydag awyr y nos
newtab-wallpaper-dark-mountain = Tirwedd mynydd
newtab-wallpaper-dark-city = Tirwedd dinas borffor
newtab-wallpaper-dark-fox-anniversary = Llwynog ar y palmant ger coedwig
newtab-wallpaper-light-fox-anniversary = Llwynog mewn cae glaswelltog gyda thirlun mynydd niwlog

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Lliwiau solet
newtab-wallpaper-colors = Lliwiau
newtab-wallpaper-blue = Glas
newtab-wallpaper-light-blue = Glas golau
newtab-wallpaper-light-purple = Porffor golau
newtab-wallpaper-light-green = Gwyrdd golau
newtab-wallpaper-green = Gwyrdd
newtab-wallpaper-beige = Llwydfelyn
newtab-wallpaper-yellow = Melyn
newtab-wallpaper-orange = Oren
newtab-wallpaper-pink = Pinc
newtab-wallpaper-light-pink = Pinc golau
newtab-wallpaper-red = Coch
newtab-wallpaper-dark-blue = Glas tywyll
newtab-wallpaper-dark-purple = Porffor tywyll
newtab-wallpaper-dark-green = Gwyrdd tywyll
newtab-wallpaper-brown = Brown

## Abstract

newtab-wallpaper-category-title-abstract = Haniaethol
newtab-wallpaper-abstract-green = Siapiau gwyrdd
newtab-wallpaper-abstract-blue = Siapiau glas
newtab-wallpaper-abstract-purple = Siapiau porffor
newtab-wallpaper-abstract-orange = Siapiau oren
newtab-wallpaper-gradient-orange = Graddiant oren a phinc
newtab-wallpaper-abstract-blue-purple = Siapiau glas a phorffor
newtab-wallpaper-abstract-white-curves = Gwyn gyda chromlinau cysgodol
newtab-wallpaper-abstract-purple-green = Graddiant golau porffor a gwyrdd
newtab-wallpaper-abstract-blue-purple-waves = Siapiau tonnog glas a phorffor
newtab-wallpaper-abstract-black-waves = Siapiau tonnog du

## Firefox

newtab-wallpaper-category-title-photographs = Ffotograffau
newtab-wallpaper-beach-at-sunrise = Traeth ar godiad haul
newtab-wallpaper-beach-at-sunset = Traeth ar fachlud haul
newtab-wallpaper-storm-sky = Awyr stormus
newtab-wallpaper-sky-with-pink-clouds = Awyr gyda chymylau pinc
newtab-wallpaper-red-panda-yawns-in-a-tree = Panda coch yn dylyfu mewn coeden
newtab-wallpaper-white-mountains = Mynyddoedd gwyn
newtab-wallpaper-hot-air-balloons = Balwnau aer poeth o lliwiau amrywiol yn ystod y dydd
newtab-wallpaper-starry-canyon = Noson serennog las
newtab-wallpaper-suspension-bridge = Ffotograffau pont crog llwyd yn ystod y dydd
newtab-wallpaper-sand-dunes = Twyni tywod gwyn
newtab-wallpaper-palm-trees = Amlinell coed palmwydd cnau coco yn yr awr euraidd
newtab-wallpaper-blue-flowers = Ffotograffiaeth agos o flodau petalau glas yn eu blodau
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Llun gan <a data-l10n-name="name-link">{ $author_string }</a> ar <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Ychwanegwch bach o liw
newtab-wallpaper-feature-highlight-content = Rhowch olwg newydd i'ch Tab Newydd gyda phapurau wal.
newtab-wallpaper-feature-highlight-button = Iawn
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Cau
    .aria-label = Cau'r llamlen
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Wybrennol
newtab-wallpaper-celestial-lunar-eclipse = Eclipse lleuad
newtab-wallpaper-celestial-earth-night = Llun nos o orbit daear isel
newtab-wallpaper-celestial-starry-sky = Awyr serennog
newtab-wallpaper-celestial-eclipse-time-lapse = Eclipse amser llithro lleuad
newtab-wallpaper-celestial-black-hole = Darlun galaeth twll du
newtab-wallpaper-celestial-river = Delwedd lloeren o'r afon

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Gweld y rhagolygon yn { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Wedi'i noddi
newtab-weather-menu-change-location = Newid lleoliad
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Chwilio am leoliad
    .aria-label = Chwilio am leoliad
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Defnyddiwch y lleoliad presennol
newtab-weather-menu-weather-display = Dangos y tywydd
newtab-weather-todays-forecast = Rhagolwg heddiw
newtab-weather-see-full-forecast = Gweld y rhagolwg llawn
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Syml
newtab-weather-menu-change-weather-display-simple = Newid i'r golwg syml
newtab-weather-menu-weather-display-option-detailed = Manwl
newtab-weather-menu-change-weather-display-detailed = Newid i'r golwg manwl
newtab-weather-menu-temperature-units = Unedau tymheredd
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Newid i Fahrenheit
newtab-weather-menu-change-temperature-units-celsius = Newid i Celsius
newtab-weather-menu-hide-weather = Cuddio'r tywydd ar Dab Newydd
newtab-weather-menu-learn-more = Rhagor
newtab-weather-menu-detect-my-location = Canfod fy lleoliad
# This message is shown if user is working offline
newtab-weather-error-not-available = Nid yw data tywydd ar gael ar hyn o bryd.
newtab-weather-opt-in-see-weather = Hoffech chi weld weld tywydd eich lleoliad?
newtab-weather-opt-in-not-now =
    .label = Nid nawr
newtab-weather-opt-in-yes =
    .label = Iawn
newtab-weather-opt-in-headline = Cael eich rhagolygon tywydd lleol
newtab-weather-opt-in-use-location =
    .label = Defnyddio'r lleoliad
newtab-weather-opt-in-choose-location = Dewis lleoliad
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Dinas Efrog Newydd
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Uchel
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Isel
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Gweld y rhagolygon yn { $provider }
    .aria-description = { $provider } ∙ Wedi'i noddi

## Topic Labels

newtab-topic-label-business = Busnes
newtab-topic-label-career = Gyrfaoedd
newtab-topic-label-education = Addysg
newtab-topic-label-arts = Adloniant
newtab-topic-label-food = Bwyd
newtab-topic-label-health = Iechyd
newtab-topic-label-hobbies = Gemau
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Arian
newtab-topic-label-society-parenting = Rhiantu
newtab-topic-label-government = Gwleidyddiaeth
newtab-topic-label-education-science = Gwyddoniaeth
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Gwella'ch Bywyd
newtab-topic-label-sports = Chwaraeon
newtab-topic-label-tech = Technoleg
newtab-topic-label-travel = Teithio
newtab-topic-label-home = Cartref a Gardd

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Dewiswch bynciau i fireinio'ch llif
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Dewiswch ddau bwnc neu fwy. Mae ein curaduron arbenigol yn blaenoriaethu straeon sydd wedi'u teilwra i'ch diddordebau. Diweddarwch nhw ar unrhyw adeg.
newtab-topic-selection-save-button = Cadw
newtab-topic-selection-cancel-button = Diddymu
newtab-topic-selection-button-maybe-later = Rhywbryd eto
newtab-topic-selection-privacy-link = Dyma sut rydym yn diogelu ac yn rheoli data
newtab-topic-selection-button-update-interests = Diweddarwch eich diddordebau
newtab-topic-selection-button-pick-interests = Dewiswch eich diddordebau

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Dilyn
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Dilyn { $topic }
newtab-section-following-button = Yn dilyn
newtab-section-unfollow-button = Dad-ddilyn
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Yn dilyn: Dad-ddilyn { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Mireinio'ch ffrwd
newtab-section-follow-highlight-subtitle = Dilynwch eich diddordebau i weld mwy o'r hyn rydych yn ei hoffi.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Rhwystro
newtab-section-blocked-button = Rhwystrwyd
newtab-section-unblock-button = Dadrwystro
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Dilyn { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Peidio dilyn { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Rhwystro { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Peidio rhwystro { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = Nid nawr
newtab-section-confirm-block-topic-p1 = Ydych chi'n siŵr eich bod am rwystro'r pwnc hwn?
newtab-section-confirm-block-topic-p2 = Ni fydd pynciau sydd wedi'u rhwystro yn ymddangos yn eich llif bellach.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Rhwystro { $topic }
newtab-section-block-cancel-button = Diddymu

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Pynciau
newtab-section-manage-topics-button-v2 =
    .label = Rheoli pynciau
newtab-section-mangage-topics-followed-topics = Dilynwyd
newtab-section-mangage-topics-followed-topics-empty-state = Nid ydych wedi dilyn unrhyw bynciau eto.
newtab-section-mangage-topics-blocked-topics = Rhwystrwyd
newtab-section-mangage-topics-blocked-topics-empty-state = Nid ydych wedi rhwystro unrhyw bynciau eto.
newtab-custom-wallpaper-title = Mae papurau wal cyfaddas yma
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Llwythwch i fyny eich papur wal eich hun neu dewiswch liw cyfaddas i wneud { -brand-product-name } deimlo'n gartrefol.
newtab-custom-wallpaper-cta = Rhowch gynnig arni

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Dewiswch bapur wal i wneud { -brand-product-name } eich un chi
newtab-new-user-custom-wallpaper-subtitle = Gwnewch i bob tab newydd deimlo fel adref gyda phapurau wal a lliwiau cyfaddas.
newtab-new-user-custom-wallpaper-cta = Rhowch gynnig arno

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Mae papurau wal newydd ffres wedi cyrraedd
newtab-wallpaper-feature-highlight-subtitle = Dewis eich ffefryn a gwneud i bob tab newydd deimlo fel cartref.
newtab-wallpaper-feature-highlight-cta = Dewis papur wal

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Llwytho { -brand-product-name } symudol i lawr
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Sganiwch y cod i bori'n ddiogel wrth fynd.
newtab-download-mobile-highlight-body-variant-b = Codwch lle gwnaethoch chi adael pan fyddwch chi'n cydweddu'ch tabiau, cyfrineiriau, a mwy.
newtab-download-mobile-highlight-body-variant-c = Oeddech chi'n gwybod y gallwch chi gymryd { -brand-product-name } wrth fynd? Yr un porwr. Yn eich poced.
newtab-download-mobile-highlight-image =
    .aria-label = Cod QR i lwytho { -brand-product-name } i lawr ar gyfer ffôn symudol

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Eich ffefrynnau ar flaenau eich bysedd
newtab-shortcuts-highlight-subtitle = Ychwanegwch lwybr byr i gadw'ch hoff wefannau un clic i ffwrdd.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Pam ydych chi'n adrodd am hyn?
newtab-report-ads-reason-not-interested =
    .label = Does gen i ddim diddordeb
newtab-report-ads-reason-inappropriate =
    .label = Mae'n amhriodol
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Rwyf wedi ei weld ormod o weithiau
newtab-report-content-wrong-category =
    .label = Categori anghywir
newtab-report-content-outdated =
    .label = Wedi dyddio
newtab-report-content-inappropriate-offensive =
    .label = Anaddas neu sarhaus
newtab-report-content-spam-misleading =
    .label = Sbam neu gamarweiniol
newtab-report-content-requires-payment-subscription =
    .label = Mae angen taliad neu danysgrifiad
newtab-report-content-requires-payment-subscription-learn-more = Darllen rhagor
newtab-report-cancel = Diddymu
newtab-report-submit = Cyflwyno
newtab-toast-thanks-for-reporting =
    .message = Diolch am adrodd am hyn.
newtab-toast-widgets-hidden =
    .message = Dewiswch yr eicon pensil i adfer teclynnau unrhyw bryd.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Rydych nawr yn dilyn { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Dydych chi nawr ddim yn dilyn { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Fyddwch chi ddim yn gweld straeon am { $topic } bellach.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Mae'r posibiliadau'n ddiddiwedd. Ychwanegwch un.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Newydd
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Wedi cwblhau ( { $number })
newtab-widget-lists-celebration-headline = Gwaith da
newtab-widget-lists-celebration-subhead = Popeth wedi'i orffen
newtab-widget-task-list-menu-copy = Copïo
newtab-widget-lists-menu-edit = Golygu enw'r rhestr
newtab-widget-lists-menu-edit2 =
    .aria-label = Golygu enw'r rhestr
newtab-widget-lists-menu-create = Creu rhestr newydd
newtab-widget-lists-menu-delete = Dileu'r rhestr hon
newtab-widget-lists-menu-copy = Copïo'r rhestr i'r clipfwrdd
newtab-widget-lists-menu-learn-more = Dysgu rhagor
newtab-widget-lists-button-add-item = Ychwanegu eitem
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Ychwanegu eitem
    .aria-label = Ychwanegu eitem
newtab-widget-lists-input-error = Cynhwyswch destun i ychwanegu eitem.
newtab-widget-lists-input-menu-open-link = Agor dolen
newtab-widget-lists-input-menu-move-up = Symud i fyny
newtab-widget-lists-input-menu-move-down = Symud i lawr
newtab-widget-lists-input-menu-delete = Dileu
newtab-widget-lists-input-menu-edit = Golygu
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Golygu eitem
newtab-widget-lists-edit-clear =
    .aria-label = Diddymu
    .title = Diddymu
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Creu rhestr newydd
newtab-widget-lists-name-label-default =
    .label = Rhestr tasgau
newtab-widget-lists-name-label-checklist =
    .label = Rhestr wirio
newtab-widget-lists-name-placeholder-default =
    .placeholder = Rhestr tasgau
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Rhestr wirio
    .aria-label = Golygu enw'r rhestr
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Rhestr newydd
    .aria-label = Golygu enw'r rhestr
newtab-widget-section-title = Teclynnau
newtab-widget-menu-hide = Cuddio'r teclyn
newtab-widget-menu-change-size = Newid maint
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Symud
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Chwith
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = De
newtab-widget-size-small = Bach
newtab-widget-size-medium = Canolig
newtab-widget-size-large = Mawr
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Cuddio teclynnau
    .aria-label = Cuddio pob teclyn
newtab-widget-section-maximize =
    .title = Ehangu teclynnau
    .aria-label = Ehangu pob teclyn i'w faint llawn
newtab-widget-section-minimize =
    .title = Lleihau teclynnau
    .aria-label = Lleihau pob teclyn i faint llai
newtab-widget-section-menu-button =
    .title = Dewislen teclynnau
    .aria-label = Agor dewislen teclynnau
newtab-widget-add-widgets-button =
    .aria-label = Ychwanegu teclyn
    .title = Ychwanegu teclyn
newtab-widget-section-menu-manage = Rheoli teclynnau
newtab-widget-section-menu-hide-all = Cuddio teclynnau
newtab-widget-section-menu-learn-more = Dysgu rhagor
newtab-widget-section-feedback = Dywedwch wrthym beth yw eich barn
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Dangos rhagor o declynnau
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Dangos llai o declynnau
newtab-widget-lists-name-default = Rhestr wirio

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Amserydd
newtab-widget-timer-notification-focus = Mae'r amser canolbwyntio ar ben. Gwaith da. Angen seibiant?
newtab-widget-timer-notification-break = Mae'ch seibiant drosodd. Barod i ganolbwyntio?
newtab-widget-timer-notification-warning = Mae hysbysiadau wedi'u diffodd
newtab-widget-timer-mode-focus =
    .label = Canolbwyntio
newtab-widget-timer-mode-break =
    .label = Seibiant
newtab-widget-timer-label-play =
    .label = Chwarae
newtab-widget-timer-label-pause =
    .label = Oedi
newtab-widget-timer-reset =
    .title = Ailosod
newtab-widget-timer-menu-notifications = Diffodd hysbysiadau
newtab-widget-timer-menu-notifications-on = Troi hysbysiadau ymlaen
newtab-widget-timer-menu-learn-more = Dysgu rhagor
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Prif Benawdau
newtab-daily-briefing-card-menu-dismiss = Cau
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Diweddarwyd { $minutes }m yn ôl
newtab-widget-message-title = Canolbwyntio gyda rhestrau a'r amserydd mewnol
# to-dos stands for "things to do".
newtab-widget-message-copy = O negeseuon atgoffa cyflym i dasgau bob dydd, sesiynau canolbwyntio i egwyliau ymarfer corff — cadwch i'r dasg ac amser.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Un man ar gyfer canolbwynt, rhagolygon, a mwy
newtab-widget-message-focus-forecasts-body = Cadwch eich diwrnod i lifo gyda theclynnau { -brand-product-name }. Gwiriwch y rhagolwg, cadw ar dasg, neu ddilyn amser ledled y byd.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Gwnewch { -brand-product-name } yn gartrefol
newtab-promo-card-body-addons = Dewiswch bapur wal o'n casgliad, neu crëwch un eich hun.
newtab-promo-card-cta-addons = Rhowch gynnig arno nawr
newtab-promo-card-title = Cefnogi { -brand-product-name }
newtab-promo-card-body = Mae ein noddwyr yn cefnogi ein cenhadaeth i adeiladu gwe well
newtab-promo-card-cta = Dysgu rhagor
newtab-promo-card-dismiss-button =
    .title = Cau
    .aria-label = Cau

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [zero] Cychwyn amserydd { $minutes }-munudau
            [one] Cychwyn amserydd { $minutes }-munud
            [two] Cychwyn amserydd { $minutes }-funud
            [few] Cychwyn amserydd { $minutes }-munud
            [many] Cychwyn amserydd { $minutes }-munud
           *[other] Cychwyn amserydd { $minutes }-munud
        }
newtab-widget-timer-pause-aria =
    .aria-label = Oedi amserydd
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [zero] { $minutes } munudau
            [one] { $minutes } munud
            [two] { $minutes } funud
            [few] { $minutes } munud
            [many] { $minutes } munud
           *[other] { $minutes } munud
        }
newtab-widget-timer-decrease-min =
    .title = Llai 1 munud
newtab-widget-timer-increase-min =
    .title = Mwy 1 munud
newtab-widget-timer-mode-group =
    .aria-label = Modd amserydd
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Canolbwynt
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Toriad
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Cuddio'r amserydd
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Gwaith da
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Mae'ch toriad drosodd
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Angen toriad?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Yn barod i ganolbwyntio?

##

newtab-sports-widget-menu-follow-teams = Dilyn timau
newtab-sports-widget-menu-view-schedule = Gweld amserlen
newtab-sports-widget-menu-view-upcoming = Gweld yr hyn sydd i ddod
newtab-sports-widget-menu-view-results = Gweld y canlyniadau
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Dyddiadau allweddol
newtab-sports-widget-menu-learn-more = Dysgu rhagor
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Cadw golwg ar Gwpan y Byd
newtab-sports-widget-get-updates = Cael diweddariadau gemau byw a mwy.
newtab-sports-widget-view-schedule =
    .label = Gweld yr amserlen
newtab-sports-widget-follow-teams =
    .label = Dilyn timau
newtab-sports-widget-view-matches =
    .label = Gweld gemau
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [zero] Dilyn hyd at { $number } timau
        [one] Dilyn hyd at { $number } tîm
        [two] Dilyn hyd at { $number } dîm
        [few] Dilyn hyd at { $number } tîm
        [many] Dilyn hyd at { $number } thîm
       *[other] Dilyn hyd at { $number } tîm
    }
newtab-sports-widget-choose-wallpaper =
    .label = Dewis Papur Wal
newtab-sports-widget-skip = Hepgor
newtab-sports-widget-search-country =
    .placeholder = Chwilio gwlad
    .aria-label = Chwilio gwlad
newtab-sports-widget-cancel = Na
newtab-sports-widget-back-button =
    .aria-label = Nôl
newtab-sports-widget-done-button =
    .label = Gorffen
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } ( wedi'i fwrw allan)
newtab-sports-widget-view-all =
    .label = Gweld y cyfan
newtab-sports-widget-show-less =
    .label = Dangos llai
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Dim ond timau sy'n cael eu dilyn
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Gwylio
    .title = Gwylio'n fyw
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Gwylio'n fyw
    .title = Gwylio'n fyw
newtab-sports-widget-watch-dialog-close =
    .aria-label = Cau
    .title = Cau
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Am Ddim
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Profi am ddim
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Am ddim ac am dâl
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Am dâl
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Dim ond gemau penodol
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Ar gael yn eich ardal
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Ardaloedd eraill
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Agor ffrwd
    .title = Agor ffrwd
newtab-sports-widget-group-stage = Cymal Grŵp
newtab-sports-widget-group-a = Grŵp A
newtab-sports-widget-group-b = Grŵp B
newtab-sports-widget-group-c = Grŵp C
newtab-sports-widget-group-d = Grŵp D
newtab-sports-widget-group-e = Grŵp E
newtab-sports-widget-group-f = Grŵp F
newtab-sports-widget-group-g = Grŵp G
newtab-sports-widget-group-h = Grŵp H
newtab-sports-widget-group-i = Grŵp I
newtab-sports-widget-group-j = Grŵp J
newtab-sports-widget-group-k = Grŵp K
newtab-sports-widget-group-l = Grŵp L
newtab-sports-widget-round-32 = Rownd o 32
newtab-sports-widget-round-16 = Rownd o 16
newtab-sports-widget-quarter-finals = Chwarteri
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = BYW
newtab-custom-widget-live-refresh =
    .title = Diweddaru sgoriau
    .aria-label = Diweddaru sgoriau
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Dyddiadau allweddol
newtab-sports-widget-upcoming = I Ddod
# Used for a match currently ongoing
newtab-sports-widget-now = Nawr
newtab-sports-widget-results = Canlyniadau
newtab-sports-widget-semi-finals = Cyn-derfynol
newtab-sports-widget-bronze-finals = Y Ffeinal Efydd
# Final is the final match for 1st place.
newtab-sports-widget-final = Y Ffeinal
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Rhedeg yn Hwyr
newtab-sports-widget-postponed = Wedi'i Ohirio
newtab-sports-widget-suspended = Wedi'i Atal
newtab-sports-widget-cancelled = Wedi'i Ganslo
newtab-sports-widget-information = Gwybodaeth am y gêm
newtab-sports-widget-no-live-data = Dyw data gêm fyw ddim yn cael ei ddiweddaru ar hyn o bryd
newtab-sports-widget-view-results-link = Gweld y canlyniadau
newtab-sports-widget-third-place = Yn Drydydd
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Yn Ail
newtab-sports-widget-champions = Pencampwyr
newtab-sports-widget-world-cup-champions = Pencampwyr Cwpan y Byd 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Amser llawn
newtab-sports-widget-match-halftime = Hanner amser
newtab-sports-widget-match-extra-time = Amser ychwanegol
newtab-sports-widget-match-penalties = Ciciau cosb
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = vs
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Cadwch olwg am fanylion gêm sydd i ddod

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Blaenorol
    .title = Blaenorol
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Nesaf
    .title = Nesaf
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = { $index }  gêm fyw o { $total }
    .title = { $index }  gêm fyw o { $total }

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
    .aria-label = { $homeTeam } , { $homeScore } yn erbyn { $awayTeam } , { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam } , { $homeScore } ( { $homePenalty }) yn erbyn { $awayTeam }, { $awayScore } ( { $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Yn fyw: { $homeTeam } , { $homeScore } yn erbyn { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } yn erbyn { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } yn erbyn { $awayTeam } , wedi'i ohirio
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } yn erbyn { $awayTeam } , wedi'i ohirio
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } yn erbyn { $awayTeam }, wedi'i atal
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } yn erbyn { $awayTeam } , wedi'i ganslo

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosnia a Herzegovina
newtab-sports-widget-team-name-label-civ =
    .label = Côte d'Ivoire
newtab-sports-widget-team-name-label-cod =
    .label = DR Congo
newtab-sports-widget-team-name-label-eng =
    .label = Lloegr
newtab-sports-widget-team-name-label-sco =
    .label = Yr Alban
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = I'w benderfynu

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Cychwyn Cwpan y Byd gyda phapurau wal newydd
newtab-sports-widget-message-wallpapers-body = Dewch ag ychydig o egni diwrnod gêm i'ch porwr ar gyfer y twrnamaint.
newtab-sports-widget-message-wallpapers-cta = Dewis papur wal
newtab-sports-widget-message-add-widgets-cta =
    .label = Ychwanegu teclyn
newtab-sports-widget-message-day-in-play-title = Cadwch eich diwrnod ar waith gyda theclynnau { -brand-product-name }
newtab-sports-widget-message-day-in-play-body = Dilynwch Gwpan y Byd, cadw ar y dasg, dilyn amser o amgylch y byd, a mwy.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Archwilio'r teclynnau

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Cau
    .aria-label = Cau
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Gwnewch y gofod hwn eich un chi
newtab-activation-window-message-customization-focus-message = Dewiswch bapur wal newydd, ychwanegu llwybrau byr i'ch hoff wefannau, a chadw'r wybodaeth ddiweddaraf am straeon diddorol.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Cychwyn cyfaddasu
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Mae'r gofod hwn yn chwarae yn ôl eich rheolau chi
newtab-activation-window-message-values-focus-message = Mae { -brand-product-name } yn gadael i chi bori'r ffordd fyddwch chi'n ei hoffi, gyda dull mwy personol i ddechrau'ch diwrnod ar-lein. Gwnewch { -brand-product-name } yn ddefnyddiol i chi.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Cuddio cloc
newtab-clock-widget-menu-learn-more = Dysgu rhagor
newtab-clock-widget-menu-edit = Golygu clociau
newtab-clock-widget-menu-switch-to-12h = Newid i fformat 12 awr
newtab-clock-widget-menu-switch-to-24h = Newid i fformat 24 awr
newtab-clock-widget-label-your-clocks = Eich clociau
newtab-clock-widget-search-location-input =
    .label = Lleoliad
    .placeholder = Chwilio am ddinas
    .aria-label = Chwilio am ddinas
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Llysenw (dewisol)
    .placeholder = Ychwanegu llysenw
    .aria-label = Llysenw (dewisol)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Ychwanegu cloc newydd
    .aria-label = Ychwanegu cloc newydd
newtab-clock-widget-button-add-clock = Ychwanegu
newtab-clock-widget-button-cancel = Na
newtab-clock-widget-button-back =
    .title = Nôl
    .aria-label = Nôl
newtab-clock-widget-button-edit-clock =
    .title = Golygu cloc
    .aria-label = Golygu cloc
newtab-clock-widget-button-save = Cadw
newtab-clock-widget-button-remove-clock =
    .title = Tynnu cloc
    .aria-label = Tynnu cloc
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
    .aria-label = { $city }, llysenw: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Ychwanegu cloc
newtab-clock-widget-edit-clock-form =
    .aria-label = Golygu cloc
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Canlyniadau chwilio
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Dim cydweddiad
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Agor y ddewislen ar gyfer cloc
    .aria-label = Agor y ddewislen ar gyfer cloc
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Llysenw: { $nickname }
