# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Tab Newydd
newtab-settings-button =
    .title = Cyfaddasu eich tudalen Tab Newydd
newtab-customize-panel-icon-button =
    .title = Cyfaddasu’r dudalen hon
newtab-customize-panel-icon-button-label = Cyfaddasu
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

## Top Sites - General form dialog.

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
newtab-empty-section-topstories = Rydych wedi dal i fynDewch nôl rhywbryd eto am fwy o'r straeon pwysicaf gan { $provider }. Methu aros? Dewiswch bwnc poblogaidd i ganfod straeon da o ar draws y we.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Rydych yn gyfredol. Dewch nôl yn ddiweddarach am fwy o straeon. Methu aros? Dewiswch bwnc poblogaidd i ganfod rhagor o straeon difyr o bob rhan o'r we.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Wedi dal i fyny!
newtab-discovery-empty-section-topstories-content = Dewch nôl eto am ragor o straeon.
newtab-discovery-empty-section-topstories-try-again-button = Ceisiwch eto
newtab-discovery-empty-section-topstories-loading = Yn llwytho…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Wps! Bron a lwytho'r adran hon, ond nid yn llwyr.

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
newtab-custom-shortcuts-toggle =
    .label = Llwybrau Byr
    .description = Gwefannau rydych yn eu cadw neu'n ymweld â nhw
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
newtab-custom-stories-toggle =
    .label = Straeon cymeradwy
    .description = Cynnwys eithriadol wedi'i gasglu gan deulu { -brand-product-name }
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
newtab-wallpaper-upload-image = Llwytho delwedd
newtab-wallpaper-custom-color = Dewis lliw
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

newtab-wallpaper-category-title-colors = Lliwiau solet
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
newtab-weather-menu-hide-weather-v2 = Cuddio'r tywydd
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
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Dinas Efrog Newydd
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
newtab-section-following-button = Yn dilyn
newtab-section-unfollow-button = Dad-ddilyn
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Mireinio'ch ffrwd
newtab-section-follow-highlight-subtitle = Dilynwch eich diddordebau i weld mwy o'r hyn rydych yn ei hoffi.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Rhwystro
newtab-section-blocked-button = Rhwystrwyd
newtab-section-unblock-button = Dadrwystro

## Confirmation modal for blocking a section

newtab-section-cancel-button = Nid nawr
newtab-section-confirm-block-topic-p1 = Ydych chi'n siŵr eich bod am rwystro'r pwnc hwn?
newtab-section-confirm-block-topic-p2 = Ni fydd pynciau sydd wedi'u rhwystro yn ymddangos yn eich llif bellach.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Rhwystro { $topic }

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
newtab-widget-task-list-menu-copy = Copïo
newtab-widget-lists-menu-edit = Golygu enw'r rhestr
newtab-widget-lists-menu-create = Creu rhestr newydd
newtab-widget-lists-menu-delete = Dileu'r rhestr hon
newtab-widget-lists-menu-copy = Copïo'r rhestr i'r clipfwrdd
newtab-widget-lists-menu-hide = Cuddio pob rhestr
newtab-widget-lists-menu-learn-more = Dysgu rhagor
newtab-widget-lists-input-add-an-item =
    .placeholder = Ychwanegu eitem
newtab-widget-lists-input-error = Cynhwyswch destun i ychwanegu eitem.
newtab-widget-lists-input-menu-open-link = Agor dolen
newtab-widget-lists-input-menu-move-up = Symud i fyny
newtab-widget-lists-input-menu-move-down = Symud i lawr
newtab-widget-lists-input-menu-delete = Dileu
newtab-widget-lists-input-menu-edit = Golygu
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Creu rhestr newydd
newtab-widget-lists-name-label-default =
    .label = Rhestr tasgau
newtab-widget-lists-name-placeholder-default =
    .placeholder = Rhestr tasgau
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new =
    .placeholder = Rhestr newydd
newtab-widget-section-title = Teclynnau
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

## Strings for timer productivity widget
## When the timer ends, a system notification may be shown. Depending on which mode the timer is in, that message would be shown

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
newtab-widget-timer-menu-hide = Cuddio'r amserydd
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
newtab-promo-card-title = Cefnogi { -brand-product-name }
newtab-promo-card-body = Mae ein noddwyr yn cefnogi ein cenhadaeth i adeiladu gwe well
newtab-promo-card-cta = Dysgu rhagor
newtab-promo-card-dismiss-button =
    .title = Cau
    .aria-label = Cau

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
