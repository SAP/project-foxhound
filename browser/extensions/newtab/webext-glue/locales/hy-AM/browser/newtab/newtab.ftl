# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Նոր ներդիր
newtab-settings-button =
    .title = Հարմարեցրեք ձեր Նոր Ներդիր էջը
newtab-customize-panel-icon-button =
    .title = Հարմարեցնել այս էջը
newtab-customize-panel-icon-button-label = Հարմարեցնել
newtab-personalize-settings-icon-label =
    .title = Անհատականացնել նոր ներդիրը
    .aria-label = Կարգավորումներ
newtab-settings-dialog-label =
    .aria-label = Կարգավորումներ
newtab-personalize-icon-label =
    .title = Անհատականացնել նոր ներդիրը
    .aria-label = Անհատականացնել նոր ներդիրը
newtab-personalize-dialog-label =
    .aria-label = Անհատականացնել
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Բաց թողնել
    .aria-label = Բաց թողնել

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = որոնում
    .aria-label = որոնում
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Որոնեք { $engine }-ով կամ մուտքագրեք հասցե
newtab-search-box-handoff-text-no-engine = Որոնեք կամ մուտքագրեք հասցե
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Որոնեք { $engine }-ով կամ մուտքագրեք հասցե
    .title = Որոնեք { $engine }-ով կամ մուտքագրեք հասցե
    .aria-label = Որոնեք { $engine }-ով կամ մուտքագրեք հասցե
newtab-search-box-handoff-input-no-engine =
    .placeholder = Որոնեք կամ մուտքագրեք հասցե
    .title = Որոնեք կամ մուտքագրեք հասցե
    .aria-label = Որոնեք կամ մուտքագրեք հասցե
newtab-search-box-text = Որոնել համացանցում
newtab-search-box-input =
    .placeholder = Որոնել համացանցում
    .aria-label = Որոնել համացանցում

## Top Sites - General form dialog.

newtab-topsites-add-search-engine-header = Ավելացնել որոնիչ
newtab-topsites-add-shortcut-header = Նոր դյուրանցում
newtab-topsites-edit-topsites-header = Խմբագրել Լավագույն կայքերը
newtab-topsites-edit-shortcut-header = Խմբագրել դյուրանցումը
newtab-topsites-add-shortcut-label = Ավելացնել դյուրանցում
newtab-topsites-add-shortcut-title =
    .title = Ավելացնել դյուրանցում
    .aria-label = Ավելացնել դյուրանցում
newtab-topsites-title-label = Անվանում
newtab-topsites-title-input =
    .placeholder = Մուտքագրեք անվանում
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Մուտքագրեք կամ փակցրեք URL
newtab-topsites-url-validation = Անհրաժեշտ է վավեր URL
newtab-topsites-image-url-label = Հարմարեցված պատկերի URL
newtab-topsites-use-image-link = Օգտագործել հարմարեցված պատկեր...
newtab-topsites-image-validation = Նկարը չհաջողվեց բեռնել: Փորձեք այլ URL.

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Չեղարկել
newtab-topsites-delete-history-button = Ջնջել Պատմությունից
newtab-topsites-save-button = Պահպանել
newtab-topsites-preview-button = Նախադիտել
newtab-topsites-add-button = Ավելացնել

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Վստահ եք, որ ցանկանում եք ջնջել այս էջի ամեն մի օրինակ ձեր պատմությունից?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Այս գործողությունը չի կարող վերացվել.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Հովանավորված

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (ամրացված)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Բացել ցանկը
    .aria-label = Բացել ցանկը
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Հեռացնել
    .aria-label = Հեռացնել
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Բացել ցանկը
    .aria-label = Բացել համատեքստի ցանկը { $title }-ի համար
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Խմբագրել այս կայքը
    .aria-label = Խմբագրել այս կայքը

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Խմբագրել
newtab-menu-open-new-window = Բացել Նոր Պատուհանով
newtab-menu-open-new-private-window = Բացել նոր գաղտնի պատուհանում
newtab-menu-dismiss = Բաց թողնել
newtab-menu-pin = Ամրացնել
newtab-menu-unpin = Ապամրացնել
newtab-menu-delete-history = Ջնջել պատմությունից
newtab-menu-save-to-pocket = Պահպանել { -pocket-brand-name }-ում
newtab-menu-delete-pocket = Ջնջել { -pocket-brand-name }-ից
newtab-menu-archive-pocket = Արխիվացնել { -pocket-brand-name }-ում
newtab-menu-show-privacy-info = Մեր հովանավորները և ձեր գաղտնիությունը
newtab-menu-about-fakespot = { -fakespot-brand-name }-ի մասին
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Զեկուցել
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Արգելափակել
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Չհետևել թեմային

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Կառավարել հովանավորված բովանդակությունը
newtab-menu-our-sponsors-and-your-privacy = Մեր հովանավորները և ձեր գաղտնիությունը
newtab-menu-report-this-ad = Հաղորդել այս գովազդի մասին

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Ավարտ
newtab-privacy-modal-button-manage = Կառավարել հովանավորված բովանդակության կարգավորումները
newtab-privacy-modal-header = Ձեր գաղտնիությունը կարևոր է։
newtab-privacy-modal-paragraph-2 =
    Բացի հետաքրքրաշարժ հոդվածներ պահպանելուց, մենք նաև ցույց ենք տալիս ձեզ ընտրված հովանավորների կողմից ապացուցված բովանդակություն։ <strong>Համոզվեք որ ձեր տվյալները
    վեբ֊սերվինգը երբեք չի թողնի { -brand-product-name }</strong> — ձեր անձնական օրինակը, մենք չունենք։ Նրանց հասանելիությունը, և մեր հովանավորները նույնպես չունեն։
newtab-privacy-modal-link = Իմացեք թե ինչպես է գաղտնիությունն աշխատում նոր ներդիրում

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Հեռացնել էջանիշը
# Bookmark is a verb here.
newtab-menu-bookmark = Էջանիշ

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Պատճենել ներբեռնելու հղումը
newtab-menu-go-to-download-page = Գնալ ներբեռնման էջ
newtab-menu-remove-download = Ջնջել պատմությունից

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Ցուցադրել Որոնիչում
       *[other] Բացել պարունակության պանակը
    }
newtab-menu-open-file = Բացել ֆայլը

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Այցելած
newtab-label-bookmarked = Էջանշված
newtab-label-removed-bookmark = Էջանիշը հեռացվել է
newtab-label-recommended = Թրենդինգ
newtab-label-saved = Պահպանված է { -pocket-brand-name }-ում
newtab-label-download = Ներբեռնված է
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Հովանավորված
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Հովանավորված է { $sponsor }-ի կողմից
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } ր․
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Հովանավորված

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Հեռացնել բաժինը
newtab-section-menu-collapse-section = Կոծկել բաժինը
newtab-section-menu-expand-section = Ընդարձակել բաժինը
newtab-section-menu-manage-section = Կառավարել բաժինը
newtab-section-menu-manage-webext = Կառավարել ընդլայնումը
newtab-section-menu-add-topsite = Ավելացնել Լավագույն կայքերին
newtab-section-menu-add-search-engine = Ավելացնել որոնիչ
newtab-section-menu-move-up = Վեր
newtab-section-menu-move-down = Վար
newtab-section-menu-privacy-notice = Գաղտնիության դրույթներ

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Կոծկել բաժինը
newtab-section-expand-section-label =
    .aria-label = Ընդարձակել բաժինը

## Section Headers.

newtab-section-header-topsites = Լավագույն կայքեր
newtab-section-header-recent-activity = Վերջին ակտիվություն
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Առաջարկվում է { $provider }
newtab-section-header-stories = Մտահանգման պատմություններով
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Այսօրվա ընտրությունը ձեզ համար

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Սկսեք դիտարկել և մենք կցուցադրենք հիանալի հոդվածներ, տեսանյութեր և այլ էջեր, որոնք այցելել եք վերջերս կամ էջանշել եք դրանք:
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Ամեն ինչ պատրաստ է։ Ստուգեք ավելի ուշ՝ավելի շատ պատմություններ ստանալու համար { $provider } մատակարարից։Չեք կարող սպասել։Ընտրեք հանրաճանաչ թեմա՝ համացանցից ավելի հիանալի պատմություններ գտնելու համար։

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Ամեն ինչ պատրաստ է։
newtab-discovery-empty-section-topstories-content = Վերադարձեք ավելի ուշ՝ այլ պատմությունների համար:
newtab-discovery-empty-section-topstories-try-again-button = Կրկին փորձել
newtab-discovery-empty-section-topstories-loading = Բեռնում...
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Վայ մենք գրեթե բեռնում ենք այս հատվածը, բայց ոչ ամբողջովին:

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Հանրաճանաչ թեմաներ.
newtab-pocket-more-recommendations = Լրացուցիչ առաջարկություններ
newtab-pocket-learn-more = Իմանալ ավելին
newtab-pocket-cta-button = Ստանալ { -pocket-brand-name }
newtab-pocket-cta-text = Խնայեք ձեր սիրած պատմությունները { -pocket-brand-name }, և ձեր միտքը վառեցրեք հետաքրքրաշարժ ընթերցանությամբ:
newtab-pocket-save = Պահել
newtab-pocket-saved = Պահված է

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Ավելի շատ նման
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Ինձ համար չէ
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Շնորհակալություն։ Ձեր կարծիքը կօգնի մեզ բարելավել ձեր հոսքը:
newtab-toast-dismiss-button =
    .title = Բաց թողնել
    .aria-label = Բաց թողնել

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Բացահայտեք համացանցի լավագույնը

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Վայ, ինչ-որ սխալ է տեղի ունեցել այս բովանդակությունը բեռնելու համար:
newtab-error-fallback-refresh-link = Թարմացրեք էջը՝ կրկին փորձելու համար:

## Customization Menu

newtab-custom-shortcuts-title = Դյուրանցումներ
newtab-custom-shortcuts-subtitle = Կայքեր, որոնք պահել կամ այցելել եք
newtab-custom-shortcuts-toggle =
    .label = Դյուրանցումներ
    .description = Կայքեր, որոնք պահել կամ այցելել եք
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } տող
       *[other] { $num } տող
    }
newtab-custom-sponsored-sites = Հովանավորված դյուրանցումներ
newtab-custom-pocket-title = Խորհուրդ է տրվում { -pocket-brand-name }-ի կողմից
newtab-custom-stories-personalized-toggle =
    .label = Պատմություններ
newtab-custom-pocket-sponsored = Հովանավորված պատմություններ
newtab-custom-pocket-show-recent-saves = Ցուցադրել վերջին պահումները
newtab-custom-recent-title = Վերջին ակտիվություն
newtab-custom-recent-subtitle = Վերջին կայքերի և բովանդակության ընտրում
newtab-custom-weather-toggle =
    .label = Եղանակ
    .description = Այսօրվա կանխատեսումը մի հայացքով
newtab-custom-widget-weather-toggle =
    .label = Եղանակ
newtab-custom-widget-lists-toggle =
    .label = Ցանկեր
newtab-custom-widget-timer-toggle =
    .label = ժամաչափ
newtab-custom-widget-section-title = Վիջեթներ
newtab-custom-widget-section-toggle =
    .label = Վիջեթներ
newtab-widget-manage-title = Վիջեթներ
newtab-widget-manage-widget-button =
    .label = Կառավարել վիջեթները
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Փակել
    .aria-label = Փակել ցանկը
newtab-custom-close-button = Փակել
newtab-custom-settings = Կառավարել լրացուցիչ կարգավորումները

## New Tab Wallpapers

newtab-wallpaper-title = Պաստառներ
newtab-wallpaper-reset = Վերակայել սկզբնադիրը
newtab-wallpaper-upload-image = Վերբեռնել պատկեր
newtab-wallpaper-custom-color = Ընտրել գույն
newtab-wallpaper-error-upload-file-type = Մենք չկարողացանք վերբեռնել ձեր ֆայլը։ Խնդրում ենք կրկին փորձել պատկերի ֆայլով։
newtab-wallpaper-light-red-panda = Կարմիր պանդա
newtab-wallpaper-light-mountain = Սպիտակ լեռ
newtab-wallpaper-light-sky = Երկինք մանուշակագույն և վարդագույն ամպերով
newtab-wallpaper-light-color = Կապույտ, վարդագույն և դեղին ձևեր
newtab-wallpaper-light-landscape = Կապույտ մառախուղ լեռնային լանդշաֆտ
newtab-wallpaper-light-beach = Լողափ արմավենու ծառով
newtab-wallpaper-dark-aurora = Ավրորա Բորեալիս
newtab-wallpaper-dark-color = Կարմիր և կապույտ ձևեր
newtab-wallpaper-dark-panda = Կարմիր պանդան թաքնված է անտառում
newtab-wallpaper-dark-sky = Քաղաքի լանդշաֆտ գիշերային երկնքով
newtab-wallpaper-dark-mountain = Լանդշաֆտային լեռ
newtab-wallpaper-dark-city = Մանուշակագույն քաղաքի լանդշաֆտ
newtab-wallpaper-dark-fox-anniversary = Աղվեսը մայթին անտառի մոտ
newtab-wallpaper-light-fox-anniversary = Աղվեսը խոտածածկ դաշտում՝ մառախլապատ լեռնային լանդշաֆտով

## Solid Colors

newtab-wallpaper-category-title-colors = Կոշտ գույներ
newtab-wallpaper-blue = Կապույտ
newtab-wallpaper-light-blue = Բաց կապույտ
newtab-wallpaper-light-purple = Բաց մանուշակագույն
newtab-wallpaper-light-green = Բաց կանաչ
newtab-wallpaper-green = Կանաչ
newtab-wallpaper-beige = Բեժ
newtab-wallpaper-yellow = Դեղին
newtab-wallpaper-orange = Նարնջագույն
newtab-wallpaper-pink = Վարդագույն
newtab-wallpaper-light-pink = Բաց վարդագույն
newtab-wallpaper-red = Կարմիր
newtab-wallpaper-dark-blue = Մուգ կապույտ
newtab-wallpaper-dark-purple = Մուգ մանուշակագույն
newtab-wallpaper-dark-green = Մուգ կանաչ
newtab-wallpaper-brown = Շագանակագույն

## Abstract

newtab-wallpaper-category-title-abstract = Վերացական
newtab-wallpaper-abstract-green = Կանաչ ձևեր
newtab-wallpaper-abstract-blue = Կապույտ ձևեր
newtab-wallpaper-abstract-purple = Մանուշակագույն ձևեր
newtab-wallpaper-abstract-orange = Նարնջագույն ձևեր
newtab-wallpaper-gradient-orange = Գրադիենտ նարնջագույն և վարդագույն
newtab-wallpaper-abstract-blue-purple = Կապույտ և մանուշակագույն ձևեր
newtab-wallpaper-abstract-white-curves = Սպիտակ՝ ստվերագծված կորերով
newtab-wallpaper-abstract-purple-green = Մանուշակագույն և կանաչ լույսի գրադիենտ

## Firefox

newtab-wallpaper-category-title-photographs = Լուսանկարներ
newtab-wallpaper-beach-at-sunrise = Լողափ արևածագին
newtab-wallpaper-beach-at-sunset = Լողափ մայրամուտին
newtab-wallpaper-storm-sky = Փոթորիկ երկինք
newtab-wallpaper-sky-with-pink-clouds = Երկինք վարդագույն ամպերով
newtab-wallpaper-red-panda-yawns-in-a-tree = Կարմիր պանդան հորանջում է ծառի վրա
newtab-wallpaper-white-mountains = Սպիտակ լեռներ
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Լուսանկարի հեղինակ՝ <a data-l10n-name="name-link">{ $author_string }</a>, <a data-l10n-name="webpage-link">{ $webpage_string }</a>-ում
newtab-wallpaper-feature-highlight-header = Փորձեք գույն շաղ տալ
newtab-wallpaper-feature-highlight-content = Ձեր նոր ներդիրին թարմ տեսք տվեք պաստառներով:
newtab-wallpaper-feature-highlight-button = Հասկացա
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Բաց թողնել
    .aria-label = Փակել թռուցիկը
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Երկնային
newtab-wallpaper-celestial-lunar-eclipse = Լուսնի խավարում
newtab-wallpaper-celestial-earth-night = Գիշերային լուսանկար Երկրի ցածր ուղեծրից
newtab-wallpaper-celestial-starry-sky = Աստղազարդ երկինք
newtab-wallpaper-celestial-eclipse-time-lapse = Լուսնի խավարման ժամանակի լապս
newtab-wallpaper-celestial-black-hole = Սև խոռոչի գալակտիկայի նկարազարդում
newtab-wallpaper-celestial-river = Գետի արբանյակային պատկեր

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Տեսեք կանխատեսումը { $provider }-ում
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Հովանավորվում է
newtab-weather-menu-change-location = Փոխել գտնվելու վայրը
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Որոնել գտնվելու վայրը
    .aria-label = Որոնել գտնվելու վայրը
newtab-weather-menu-weather-display = Եղանակի ցուցադրում
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Պարզ
newtab-weather-menu-change-weather-display-simple = Փոխել պարզ տեսքի
newtab-weather-menu-weather-display-option-detailed = Մանրամասներ
newtab-weather-menu-change-weather-display-detailed = Անցնել մանրամասն դիտմանը
newtab-weather-menu-temperature-units = Ջերմաստիճանի միավորներ
newtab-weather-menu-temperature-option-fahrenheit = Ֆարենհեյթ
newtab-weather-menu-temperature-option-celsius = Ցելսիուս
newtab-weather-menu-change-temperature-units-fahrenheit = Փոխարկել ֆարենհեյթին
newtab-weather-menu-change-temperature-units-celsius = Փոխարկել ցելսիուսին
newtab-weather-menu-hide-weather = Թաքցնել եղանակը Նոր ներդիրում
newtab-weather-menu-learn-more = Իմանալ ավելին
newtab-weather-menu-detect-my-location = Հայտնաբերել իմ գտնվելու վայրը
# This message is shown if user is working offline
newtab-weather-error-not-available = Եղանակի տվյալներն այս պահին հասանելի չեն:
newtab-weather-opt-in-see-weather = Ցանկանո՞ւմ եք տեսնել ձեր գտնվելու վայրի եղանակը։
newtab-weather-opt-in-not-now =
    .label = Ոչ հիմա
newtab-weather-opt-in-yes =
    .label = Այո
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Նյու Յորք քաղաք
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Տեսեք կանխատեսումը { $provider }-ում
    .aria-description = { $provider } ∙ Հովանավորվում է

## Topic Labels

newtab-topic-label-business = Բիզնես
newtab-topic-label-career = Կարիերա
newtab-topic-label-education = Կրթություն
newtab-topic-label-arts = Ժամանց
newtab-topic-label-food = Սնունդ
newtab-topic-label-health = Առողջություն
newtab-topic-label-hobbies = Խաղեր
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Փող
newtab-topic-label-society-parenting = Դաստիարակություն
newtab-topic-label-government = Քաղաքականություն
newtab-topic-label-education-science = Գիտություն
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Լայֆ-հաքներ
newtab-topic-label-sports = Սպորտ
newtab-topic-label-tech = Տեխ
newtab-topic-label-travel = Ճամփորդություն
newtab-topic-label-home = Տուն և այգի

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Ընտրեք թեմաներ՝ ձեր հոսքը ճշգրտելու համար
newtab-topic-selection-save-button = Պահել
newtab-topic-selection-cancel-button = Չեղարկել
newtab-topic-selection-button-maybe-later = Ավելի ուշ
newtab-topic-selection-privacy-link = Իմացեք, թե ինչպես ենք մենք պաշտպանում և կառավարում տվյալները
newtab-topic-selection-button-update-interests = Թարմացրեք ձեր հետաքրքրությունները
newtab-topic-selection-button-pick-interests = Ընտրեք ձեր հետաքրքրությունները

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Հետևել
newtab-section-following-button = Հետևվում է
newtab-section-unfollow-button = Ապահետևել
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Կարգավորեք ձեր լրահոսը

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Արգելափակել
newtab-section-blocked-button = Արգելափակված
newtab-section-unblock-button = Ապաարգելափակել

## Confirmation modal for blocking a section

newtab-section-cancel-button = Ոչ հիմա
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Արգելափակել { $topic }-ը

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Թեմաներ
newtab-section-manage-topics-button-v2 =
    .label = Կառավարել թեմաները
newtab-section-mangage-topics-followed-topics = Հետևված
newtab-section-mangage-topics-followed-topics-empty-state = Դուք դեռ որևէ թեմայի չեք հետևել։
newtab-section-mangage-topics-blocked-topics = Արգելափակված
newtab-section-mangage-topics-blocked-topics-empty-state = Դուք դեռ որևէ թեմա չեք արգելափակել։
newtab-custom-wallpaper-title = Պատվերով պատրաստված պաստառներ այստեղ են
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Վերբեռնեք ձեր սեփական պաստառը կամ ընտրեք ձեր սեփական գույնը՝ { -brand-product-name }-ը ձերը դարձնելու համար։
newtab-custom-wallpaper-cta = Փորձել

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-cta = Փորձել հիմա

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Ներբեռնեք { -brand-product-name }-ը բջջայինի համար
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Սկանավորեք կոդը՝ ճանապարհին անվտանգ զննարկելու համար։
newtab-download-mobile-highlight-body-variant-b = Շարունակեք այնտեղից, որտեղ կանգ եք առել, երբ համաժամեցնում եք ձեր ներդիրները, գաղտնաբառերը և այլն:

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Ձեր սիրելիները՝ ձեր մատների ծայրերին

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Ինչո՞ւ եք սա հաղորդում։
newtab-report-ads-reason-not-interested =
    .label = Ես հետաքրքրված չեմ
newtab-report-ads-reason-inappropriate =
    .label = Անպատշաճ է
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Ես դա չափազանց շատ անգամներ եմ տեսել
newtab-report-content-wrong-category =
    .label = Սխալ անվանակարգ
newtab-report-content-outdated =
    .label = Հնացած
newtab-report-content-inappropriate-offensive =
    .label = Անպատշաճ կամ վիրավորական
newtab-report-content-spam-misleading =
    .label = Սպամ կամ մոլորեցնող
newtab-report-content-requires-payment-subscription-learn-more = Իմանալ ավելին
newtab-report-cancel = Չեղարկել
newtab-report-submit = Ուղարկել
newtab-toast-thanks-for-reporting =
    .message = Շնորհակալություն հայտնելու համար:

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Հնարավորությունները անվերջ են։ Ավելացրեք մեկը։
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Նոր
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Ավարտված է ({ $number })
newtab-widget-task-list-menu-copy = Պատճենել
newtab-widget-lists-menu-edit = Խմբագրել ցանկի անունը
newtab-widget-lists-menu-create = Ստեղծել նոր ցանկ
newtab-widget-lists-menu-delete = Ջնջել այս ցանկը
newtab-widget-lists-menu-copy = Պատճենել ցանկը սեղմատախտակին
newtab-widget-lists-menu-hide = Թաքցնել բոլոր ցանկերը
newtab-widget-lists-menu-learn-more = Իմանալ ավելին
newtab-widget-lists-input-add-an-item =
    .placeholder = Ավելացնել միույթ
newtab-widget-lists-input-error = Խնդրում ենք ներառել տեքստ՝ տարր ավելացնելու համար։
newtab-widget-lists-input-menu-open-link = Բացել հղումը
newtab-widget-lists-input-menu-move-up = Շարժել վերև
newtab-widget-lists-input-menu-move-down = Շարժել ներքև
newtab-widget-lists-input-menu-delete = Ջնջել
newtab-widget-lists-input-menu-edit = Խմբագրել
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Ստեղծել նոր ցուցակ
newtab-widget-lists-name-label-default =
    .label = Առաջադրանքների ցանկ
newtab-widget-lists-name-placeholder-default =
    .placeholder = Առաջադրանքների ցանկ
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new =
    .placeholder = Նոր ցանկ
newtab-widget-section-title = Վիջեթներ
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Թաքցնել վիջեթները
    .aria-label = Թաքցնել բոլոր վիջեթները
newtab-widget-section-maximize =
    .title = Ընդարձակել վիջեթները
    .aria-label = Ընդարձակել բոլոր վիջեթները լրիվ չափով
newtab-widget-section-minimize =
    .title = Փոքրացնել վիջեթները
    .aria-label = Կոծկել բոլոր վիջեթները սեղմ չափի

## Strings for timer productivity widget
## When the timer ends, a system notification may be shown. Depending on which mode the timer is in, that message would be shown

newtab-widget-timer-notification-title = ժամաչափ
newtab-widget-timer-notification-focus = Կենտրոնանալու ժամանակը սպառվեց։ Լավ աշխատանք։ Հանգստի կարիք ունե՞ք։
newtab-widget-timer-notification-break = Ձեր ընդմիջումն ավարտվեց։ Պատրա՞ստ եք կենտրոնանալու։
newtab-widget-timer-notification-warning = Ծանուցումներն անջատված են
newtab-widget-timer-mode-focus =
    .label = Կենտրոնացում
newtab-widget-timer-mode-break =
    .label = Ընդմիջում
newtab-widget-timer-label-play =
    .label = Նվագարկել
newtab-widget-timer-label-pause =
    .label = Դադար
newtab-widget-timer-reset =
    .title = Վերակայել
newtab-widget-timer-menu-notifications = Անջատել ծանուցումները
newtab-widget-timer-menu-notifications-on = Միացնել ծանուցումները
newtab-widget-timer-menu-hide = Թաքցնել ժամաչափը
newtab-widget-timer-menu-learn-more = Իմանալ ավելին
newtab-widget-message-title = Մնացեք կենտրոնացած ցուցակների և ներկառուցված ժամանակաչափի միջոցով
newtab-promo-card-title = Աջակցել { -brand-product-name }-ին
newtab-promo-card-body = Մեր հովանավորները աջակցում են ավելի լավ համացանց կերտելու մեր առաքելությանը
newtab-promo-card-cta = Իմանալ ավելին
newtab-promo-card-dismiss-button =
    .title = Բաց թողնել
    .aria-label = Բաց թողնել

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-customization-focus-primary-button =
    .label = Սկսեք անհատականացնել
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Այս տարածքը խաղում է ձեր կանոններով
