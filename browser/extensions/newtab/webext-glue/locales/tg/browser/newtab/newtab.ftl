# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Варақаи нав
newtab-settings-button =
    .title = Танзим кардани саҳифаи худ дар варақаи нав
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Фармоишдиҳии ин саҳифа
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Фармоишдиҳӣ
newtab-customize-panel-label =
    .label = Фармоишдиҳӣ
newtab-personalize-settings-icon-label =
    .title = Шахсисозии варақаи нав
    .aria-label = Танзимот
newtab-settings-dialog-label =
    .aria-label = Танзимот
newtab-personalize-icon-label =
    .title = Танзимоти шахсии варақаи нав
    .aria-label = Танзимоти шахсии варақаи нав
newtab-personalize-dialog-label =
    .aria-label = Танзимоти шахсӣ
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Нодида гузарондан
    .aria-label = Нодида гузарондан

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Саҳифаи асосӣ
home-homepage-new-windows =
    .label = Равзанаи нав
home-homepage-new-tabs =
    .label = Варақаҳои нав
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Интихоб кардани сомонаи муайян

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Нишони(ҳо)и сомона
home-custom-homepage-address =
    .placeholder = Нишониеро ворид намоед
home-custom-homepage-address-button =
    .label = Илова кардани нишонӣ
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = То ҳол ягон сомона илова карда нашудааст.
home-custom-homepage-delete-address-button =
    .aria-label = Нест кардани нишонӣ
    .title = Нест кардани нишонӣ
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Иваз кардан бо
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Саҳифаҳои кушодашудаи ҷорӣ
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Хатбаракҳо…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Ҷустуҷӯ
home-prefs-stories-header2 =
    .label = Ҳикояҳо
    .description = Муҳтавои мустасно аз тарафи оилаи «{ -brand-product-name }» дастгирӣ карда мешавад
home-prefs-widgets-header =
    .label = Виҷетҳо
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Рӯйхатҳо
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Вақтсанҷ
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Варзишҳо
home-prefs-mission-message2 =
    .message = Сарпарастони мо рисолати моро барои ташкили таҷрибаи беҳтарини Интернет дастгирӣ менамоянд.
home-prefs-manage-topics-link2 =
    .label = Идоракунии мавзуъҳо
home-prefs-choose-wallpaper-link2 =
    .label = Тасвири заминаиеро интихоб намоед
home-prefs-firefox-logo-header =
    .label = Ангораи «{ -brand-short-name }»
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } сатр
           *[other] { $num } сатр
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Васеъшавӣ ({ $extension })
home-restore-defaults-srd =
    .label = Барқарор кардани пешфарзҳо
    .accesskey = Б
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (Пешфарз)
home-mode-choice-custom-srd =
    .label = Нишониҳои URL-и фармоишӣ…
home-mode-choice-blank-srd =
    .label = Саҳифаи холӣ
home-prefs-shortcuts-header-srd =
    .label = Миёнбурҳо
home-prefs-shortcuts-select =
    .aria-label = Миёнбурҳо
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Миёнбурҳои сарпарастӣ
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Мақолаҳои сарпарастӣ
home-prefs-highlights-option-visited-pages-srd =
    .label = Саҳифаҳои кушодашуда
home-prefs-highlights-options-bookmarks-srd =
    .label = Хатбаракҳо
home-prefs-highlights-option-most-recent-download-srd =
    .label = Боргириҳои охирин
home-prefs-recent-activity-header-srd =
    .label = Фаъолияти охирин
home-prefs-recent-activity-select =
    .aria-label = Фаъолияти охирин
home-prefs-weather-header-srd =
    .label = Обу ҳаво
home-prefs-support-firefox-header-srd =
    .label = Дастгирӣ кардани «{ -brand-product-name }»
home-prefs-mission-message-learn-more-link-srd = Бифаҳмед, ки чӣ тавр

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Ҷустуҷӯ
    .aria-label = Ҷустуҷӯ
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Ба воситаи «{ $engine }» ҷустуҷӯ кунед ё нишониеро ворид намоед
newtab-search-box-handoff-text-no-engine = Нишониеро ҷустуҷӯ кунед ё ворид намоед
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Ба воситаи «{ $engine }» ҷустуҷӯ кунед ё нишониеро ворид намоед
    .title = Ба воситаи «{ $engine }» ҷустуҷӯ кунед ё нишониеро ворид намоед
    .aria-label = Ба воситаи «{ $engine }» ҷустуҷӯ кунед ё нишониеро ворид намоед
newtab-search-box-handoff-input-no-engine =
    .placeholder = Нишониеро ҷустуҷӯ кунед ё ворид намоед
    .title = Нишониеро ҷустуҷӯ кунед ё ворид намоед
    .aria-label = Нишониеро ҷустуҷӯ кунед ё ворид намоед
newtab-search-box-text = Ҷустуҷӯ дар Интернет
newtab-search-box-input =
    .placeholder = Ҷустуҷӯ дар Интернет
    .aria-label = Ҷустуҷӯ дар Интернет

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Илова кардани низоми ҷустуҷӯӣ
newtab-topsites-add-shortcut-header = Миёнбури нав
newtab-topsites-edit-topsites-header = Таҳрир кардани сомонаи беҳтарин
newtab-topsites-edit-shortcut-header = Таҳрир кардани миёнбур
newtab-topsites-add-shortcut-label = Илова кардани миёнбур
newtab-topsites-add-shortcut-title =
    .title = Илова кардани миёнбур
    .aria-label = Илова кардани миёнбур
newtab-topsites-title-label = Сарлавҳа
newtab-topsites-title-input =
    .placeholder = Сарлавҳаро ворид намоед
newtab-topsites-url-label = Нишонии «URL»
newtab-topsites-url-input =
    .placeholder = Нишонии «URL»-ро ворид кунед ё гузоред
newtab-topsites-url-validation = Нишонии «URL»-и эътибор лозим аст
newtab-topsites-image-url-label = Нишонии «URL»-и тасвири шахсӣ
newtab-topsites-use-image-link = Истифодаи тасвири шахсӣ…
newtab-topsites-image-validation = Тасвир бор карда нашуд. Нишонии «URL»-и дигареро кӯшиш кунед.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Пок кардани матн

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Бекор кардан
newtab-topsites-delete-history-button = Нест кардан аз таърих
newtab-topsites-save-button = Нигоҳ доштан
newtab-topsites-preview-button = Пешнамоиш
newtab-topsites-add-button = Илова кардан

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Шумо мутмаин ҳастед, ки мехоҳед ҳар як намунаи ин саҳифаро аз таърихи худ тоза намоед?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Ин амал бекор карда намешавад.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Сарпарастӣ

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (васлшуда)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Кушодани меню
    .aria-label = Кушодани меню
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Тоза кардан
    .aria-label = Тоза кардан
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Кушодани меню
    .aria-label = Кушодани менюи муҳтавоӣ барои { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Таҳрир кардани ин сомона
    .aria-label = Таҳрир кардани ин сомона

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Таҳрир кардан
newtab-menu-open-new-window = Кушодан дар равзанаи нав
newtab-menu-open-new-private-window = Кушодан дар равзанаи хусусии нав
newtab-menu-dismiss = Нодида гузарондан
newtab-menu-pin = Васл кардан
newtab-menu-unpin = Ҷудо кардан
newtab-menu-delete-history = Нест кардан аз таърих
newtab-menu-save-to-pocket = Нигоҳ доштан ба { -pocket-brand-name }
newtab-menu-delete-pocket = Нест кардан аз { -pocket-brand-name }
newtab-menu-archive-pocket = Бойгонӣ кардан ба { -pocket-brand-name }
newtab-menu-show-privacy-info = Сарпарастони мо ва махфияти шумо
newtab-menu-about-fakespot = Дар бораи «{ -fakespot-brand-name }»
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Гузориш додан
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Манъ кардан
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Бекор кардани обуна
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Маълумоти бештар
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Бекор кардани обуна аз мавзуъ

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Идоракунии муҳтавои сарпарастӣ
newtab-menu-our-sponsors-and-your-privacy = Сарпарастони мо ва махфияти шумо
newtab-menu-report-this-ad = Гузориш дар бораи ин таблиғ

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Тайёр
newtab-privacy-modal-button-manage = Идоракунии танзимоти муҳтавои сарпарастӣ
newtab-privacy-modal-header = Махфияти шумо муҳим аст.
newtab-privacy-modal-paragraph-2 =
    Илова ба нигоҳдории ҳикояҳои ҷолиб, мо, инчунин, ба шумо муҳтавои мувофиқ ва тафтишшударо аз сарпарастони мунтахаб нишон медиҳем. Боварӣ ҳосил кунед, ки <strong>маълумоти тамошобинӣ ҳеҷ вақт нусхаи шахсии «{ -brand-product-name }»-и шуморо бесоҳиб намемонад</strong> — ҳатто мо ба маълумоти шахсии шумо дастрасӣ надорем, сарпарастони мо ҳам дастрасӣ надоранд.
    сарпарастон низ надоранд.
newtab-privacy-modal-link = Маълумот гиред, ки чӣ тавр махфият дар варақаи нав риоя карда мешавад

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Тоза кардани хатбаракҳо
# Bookmark is a verb here.
newtab-menu-bookmark = Хатбарак

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Нусха бардоштани пайванди боргирӣ
newtab-menu-go-to-download-page = Гузариш ба саҳифаи боргирӣ
newtab-menu-remove-download = Нест кардан аз таърих

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Намоиш додан дар ҷӯянда
       *[other] Кушодани ҷузвдони дорои файл
    }
newtab-menu-open-file = Кушодани файл

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Дидашуда
newtab-label-bookmarked = Дар хатбаракҳо
newtab-label-removed-bookmark = Хатбарак тоза карда шуд
newtab-label-recommended = Ҳавасангез
newtab-label-saved = Ба { -pocket-brand-name } нигоҳ дошта шуд
newtab-label-download = Боргиришуда
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · дорои реклама мебошад
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Аз тарафи сарпарасти { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } дақиқа
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Сарпарастӣ

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Тоза кардани қисмат
newtab-section-menu-collapse-section = Пинҳон кардани қисмат
newtab-section-menu-expand-section = Нишон додани қисмат
newtab-section-menu-manage-section = Идоракунии қисмат
newtab-section-menu-manage-webext = Идоракунии васеъшавӣ
newtab-section-menu-add-topsite = Илова кардан ба сомонаҳои беҳтарин
newtab-section-menu-add-search-engine = Илова кардани низоми ҷустуҷӯӣ
newtab-section-menu-move-up = Ба боло гузоштан
newtab-section-menu-move-down = Ба поён гузоштан
newtab-section-menu-privacy-notice = Огоҳномаи махфият

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Пинҳон кардани қисмат
newtab-section-expand-section-label =
    .aria-label = Нишон додани қисмат

## Section Headers.

newtab-section-header-topsites = Сомонаҳои беҳтарин
newtab-section-header-recent-activity = Фаъолияти охирин
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Аз тарафи «{ $provider }» тавсия дода мешавад
newtab-section-header-stories = Ҳикояҳои андешаангез
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Маҷмуи маълумоти интихобшуда барои шумо

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Тамошобинии сомонаҳоро оғоз намоед ва мо баъзеи мақолаҳои шавқовар, видеоҳо ва саҳифаҳои дигареро, ки шумо тамошо кардед ё ба хатбаракҳо гузоштед, дар ин ҷо намоиш медиҳем.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Шумо ҳамаро хондед. Барои хондани ҳикояҳои ҷолиби дигар аз «{ $provider }» дертар биёед. Интизор шуда наметавонед? Барои пайдо кардани ҳикояҳои бузург аз саросари Интернет, мавзуи маълумеро интихоб намоед.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Шумо ҳамаро хондед. Барои хондани ҳикояҳои дигар дертар биёед. Интизор шуда наметавонед? Барои пайдо кардани ҳикояҳои бузург аз саросари Интернет, мавзуи маълумеро интихоб намоед.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Шумо ҳамаро хондед!
newtab-discovery-empty-section-topstories-content = Барои ҳикоятҳои бештар дертар баргардед.
newtab-discovery-empty-section-topstories-try-again-button = Аз нав кӯшиш кардан
newtab-discovery-empty-section-topstories-loading = Бор шуда истодааст…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Хуш! Мо ин қисматро қариб бор кардем, аммо на он қадар зиёд.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Мавзуъҳои маъмул:
newtab-pocket-new-topics-title = Ҳикоятҳои боз ҳам бештар лозиманд? Ба ҳамин мавзуъҳои оммавӣ аз { -pocket-brand-name } нигаред
newtab-pocket-more-recommendations = Тавсияҳои бештар
newtab-pocket-learn-more = Маълумоти бештар
newtab-pocket-cta-button = «{ -pocket-brand-name }»-ро бор кунед
newtab-pocket-cta-text = Ҳикояҳоеро, ки дӯст медоред, дар { -pocket-brand-name } нигоҳ доред ва ба зеҳни худ аз хониши дилрабо қувват диҳед.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } қисми оилаи { -brand-product-name } мебошад
newtab-pocket-save = Нигоҳ доштан
newtab-pocket-saved = Нигоҳ дошта шуд

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Бештар ба ин монанд
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Ман ҳавасманд нестам
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Ташаккур. Фикру мулоҳизаҳои шумо ба мо барои беҳтар кардани навори хабарҳои шумо ёрӣ медиҳанд.
newtab-toast-dismiss-button =
    .title = Нодида гузарондан
    .aria-label = Нодида гузарондан

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Маводи беҳтаринро дар Интернет пайдо намоед
newtab-pocket-onboarding-cta = «{ -pocket-brand-name }» ҳаҷми васеи нашрияҳои гуногунро баррасӣ карда, ба браузери «{ -brand-product-name }»-и шумо муҳтавои ахборотӣ, илҳомбахш ва боэътимодро таъмин менамояд.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Оҳ, ҳангоми боркунии ин муҳтаво чизе нодуруст ба миён омад.
newtab-error-fallback-refresh-link = Барои аз нав кӯшиш кардан саҳифаро навсозӣ намоед.

## Customization Menu

newtab-custom-shortcuts-title = Миёнбурҳо
newtab-custom-shortcuts-subtitle = Сомонаҳое, ки шумо нигоҳ медоред ё ба онҳо ворид мешавед
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Миёнбурҳо
    .description = Сомонаҳое, ки шумо нигоҳ медоред ё ба онҳо ворид мешавед
newtab-custom-shortcuts-nova =
    .label = Миёнбурҳо
newtab-custom-row-description =
    .description = Шумораи сатрҳо
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } сатр
           *[other] { $num } сатр
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } сатр
       *[other] { $num } сатр
    }
newtab-custom-sponsored-sites = Миёнбурҳои сарпарастӣ
newtab-custom-pocket-title = Аз тарафи { -pocket-brand-name } тавсия дода мешавад
newtab-custom-pocket-subtitle = Муҳтавои мустасно аз тарафи { -pocket-brand-name }, қисми оилаи { -brand-product-name } дастгирӣ карда мешавад
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Ҳикояҳои тавсияшуда
    .description = Маводҳои истисноӣ, ки аз ҷониби оилаи «{ -brand-product-name }» таҳия шудааст
newtab-recommended-stories-toggle =
    .label = Ҳикояҳои тавсияшуда
newtab-custom-stories-personalized-toggle =
    .label = Ҳикояҳо
newtab-custom-stories-personalized-checkbox-label = Ҳикояҳои фардӣ дар асоси фаъолияти шумо
newtab-custom-pocket-sponsored = Мақолаҳои сарпарастӣ
newtab-custom-pocket-show-recent-saves = Намоиш додани маводҳои охирин
newtab-custom-recent-title = Фаъолияти охирин
newtab-custom-recent-subtitle = Интихоби сомонаҳо ва муҳтавои охирин
newtab-custom-weather-toggle =
    .label = Обу ҳаво
    .description = Ҳолати обу ҳаво барои имрӯз
newtab-custom-widget-weather-toggle =
    .label = Обу ҳаво
newtab-custom-widget-lists-toggle =
    .label = Рӯйхатҳо
newtab-custom-widget-timer-toggle =
    .label = Вақтсанҷ
newtab-custom-widget-sports-toggle =
    .label = Ҷоми ҷаҳон
newtab-custom-widget-clock-toggle =
    .label = Соат
newtab-custom-widget-sports-toggle2 =
    .label = Варзишҳо
newtab-custom-widget-section-title = Виҷетҳо
newtab-custom-widget-section-toggle =
    .label = Виҷетҳо
newtab-widget-manage-title = Виҷетҳо
newtab-widget-manage-widget-button =
    .label = Идоракунии виҷетҳо
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Пӯшидан
    .aria-label = Пӯшидани меню
newtab-custom-close-button = Пӯшидан
newtab-custom-settings = Идоракунии танзимоти бештар

## New Tab Wallpapers

newtab-wallpaper-title = Тасвирҳои замина
newtab-wallpaper-reset = Ба ҳолати пешфарз барқарор кунед
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Бор кардани тасвир
newtab-wallpaper-add-an-image = Илова кардани тасвир
newtab-wallpaper-custom-color = Рангеро интихоб кунед
newtab-wallpaper-toggle-title =
    .label = Тасвирҳои замина
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Андозаи тасвир зиёда аз маҳдудияти андозаи файли { $file_size } МБ мебошад. Лутфан, кӯшиш кунед, ки файлеро бо андозаи хурдтар бор намоед.
newtab-wallpaper-error-upload-file-type = Мо файли шуморо бор карда натавонистем. Лутфан, бо файли тасвирӣ аз нав кӯшиш намоед.
newtab-wallpaper-error-file-type = Мо файли шуморо бор карда натавонистем. Лутфан, бо навъи дигари файл аз нав кӯшиш намоед.
newtab-wallpaper-light-red-panda = Пандаи сурх
newtab-wallpaper-light-mountain = Кӯҳи сафед
newtab-wallpaper-light-sky = Осмон бо абрҳои лоҷувард ва гулобӣ
newtab-wallpaper-light-color = Шаклҳои кабуд, гулобӣ ва зард
newtab-wallpaper-light-landscape = Манзараи кӯҳӣ бо тумани кабуд
newtab-wallpaper-light-beach = Соҳил бо дарахти хурмо
newtab-wallpaper-dark-aurora = Дурахши қутбӣ
newtab-wallpaper-dark-color = Шаклҳои сурх ва кабуд
newtab-wallpaper-dark-panda = Пандаи сурх дар ҷангал пинҳон шудааст
newtab-wallpaper-dark-sky = Манзараи шаҳр бо осмони шабона
newtab-wallpaper-dark-mountain = Манзараи кӯҳӣ
newtab-wallpaper-dark-city = Манзараи шаҳри лоҷувард
newtab-wallpaper-dark-fox-anniversary = Рӯбоҳи ҷилодор дар роҳи сангфарш дар назди ҷангал
newtab-wallpaper-light-fox-anniversary = Рӯбоҳи ҷилодор дар саҳрои сералаф бо манзараи тумани кӯҳӣ

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Рангҳои яклухт
newtab-wallpaper-colors = Рангҳо
newtab-wallpaper-blue = Кабуд
newtab-wallpaper-light-blue = Кабуди равшан
newtab-wallpaper-light-purple = Лоҷуварди равшан
newtab-wallpaper-light-green = Сабзи равшан
newtab-wallpaper-green = Сабз
newtab-wallpaper-beige = Қаҳваранг
newtab-wallpaper-yellow = Зард
newtab-wallpaper-orange = Норинҷӣ
newtab-wallpaper-pink = Гулобӣ
newtab-wallpaper-light-pink = Гулобии равшан
newtab-wallpaper-red = Сурх
newtab-wallpaper-dark-blue = Кабди торик
newtab-wallpaper-dark-purple = Лоҷуварди торик
newtab-wallpaper-dark-green = Сабзи торик
newtab-wallpaper-brown = Қаҳвагӣ

## Abstract

newtab-wallpaper-category-title-abstract = Мавҳум
newtab-wallpaper-abstract-green = Шаклҳои сабз
newtab-wallpaper-abstract-blue = Шаклҳои кабуд
newtab-wallpaper-abstract-purple = Шаклҳои лоҷувард
newtab-wallpaper-abstract-orange = Шаклҳои норинҷӣ
newtab-wallpaper-gradient-orange = Тағйирёбии норинҷӣ ва голубӣ
newtab-wallpaper-abstract-blue-purple = Шаклҳои кабуд ва норинҷӣ
newtab-wallpaper-abstract-white-curves = Сафед бо хатҳои каҷи сояандоз
newtab-wallpaper-abstract-purple-green = Тобиши лоҷувард ва сабзи равшан
newtab-wallpaper-abstract-blue-purple-waves = Шаклҳои мавҷноки кабуд ва норинҷӣ
newtab-wallpaper-abstract-black-waves = Шаклҳои мавҷноки сиёҳ

## Firefox

newtab-wallpaper-category-title-photographs = Суратҳо
newtab-wallpaper-beach-at-sunrise = Соҳил дар тулӯи офтоб
newtab-wallpaper-beach-at-sunset = Соҳил дар ғуруби офтоб
newtab-wallpaper-storm-sky = Осмони тӯфонӣ
newtab-wallpaper-sky-with-pink-clouds = Осмон бо абрҳои гулобӣ
newtab-wallpaper-red-panda-yawns-in-a-tree = Пандаи сурх дар дарахт хамёза мекашад
newtab-wallpaper-white-mountains = Кӯҳҳои сафед
newtab-wallpaper-hot-air-balloons = Рангҳои гуногуни пуфакҳои ҳавоӣ дар давоми рӯз
newtab-wallpaper-starry-canyon = Шаби ситоразори кабуд
newtab-wallpaper-suspension-bridge = Акси пули хокистариранги овезон дар давоми рӯз
newtab-wallpaper-sand-dunes = Хомаҳои регии сафед
newtab-wallpaper-palm-trees = Акси сиёҳи дарахтҳои ҷавзи ҳиндӣ дар соати тиллоӣ
newtab-wallpaper-blue-flowers = Аксҳои наздиктарини гулҳо бо гулбаргҳои кабуд дар гулгулшукуфоӣ
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Акс аз ҷониби <a data-l10n-name="name-link">{ $author_string }</a> дар <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Чакраҳои рангро кӯшиш намоед
newtab-wallpaper-feature-highlight-content = Бо истифода аз тасвирҳои замина ба варақаи нави худ намуди зоҳирии наверо диҳед.
newtab-wallpaper-feature-highlight-button = Фаҳмидам
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Нодида гузарондан
    .aria-label = Пӯшидани равзанаҳои зоҳиршаванда
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Осмонӣ
newtab-wallpaper-celestial-lunar-eclipse = Гирифти Моҳ
newtab-wallpaper-celestial-earth-night = Акси шабона аз мадори пасти кураи Замин
newtab-wallpaper-celestial-starry-sky = Осмони ситоразор
newtab-wallpaper-celestial-eclipse-time-lapse = Вақти фарогирии гирифти Моҳ
newtab-wallpaper-celestial-black-hole = Тасвири роҳи каҳкашон бо сӯрохи сиёҳ
newtab-wallpaper-celestial-river = Акси дарё аз моҳвораи алоқа

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Дидани обу ҳаво дар { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Реклама
newtab-weather-menu-change-location = Иваз кардани макон
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Ҷустуҷӯи макон
    .aria-label = Ҷустуҷӯи макон
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Истифодаи ҷойгиршавии ҷорӣ
newtab-weather-menu-weather-display = Намоиши обу ҳаво
newtab-weather-todays-forecast = Пешгӯии имрӯза
newtab-weather-see-full-forecast = Дидани пешгӯии пурра
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Оддӣ
newtab-weather-menu-change-weather-display-simple = Гузариш ба намуди оддӣ
newtab-weather-menu-weather-display-option-detailed = Ботафсил
newtab-weather-menu-change-weather-display-detailed = Гузариш ба намуди ботафсил
newtab-weather-menu-temperature-units = Воҳидҳои ченаки ҳарорат
newtab-weather-menu-temperature-option-fahrenheit = Фаренгейт
newtab-weather-menu-temperature-option-celsius = Селсий
newtab-weather-menu-change-temperature-units-fahrenheit = Гузариш ба Фаренгейт
newtab-weather-menu-change-temperature-units-celsius = Гузариш ба Селсий
newtab-weather-menu-hide-weather = Нинҳон кардани обу ҳаво дар варақаи нав
newtab-weather-menu-learn-more = Маълумоти бештар
newtab-weather-menu-detect-my-location = Ҷойгиршавии маро муайян кунед
# This message is shown if user is working offline
newtab-weather-error-not-available = Айни ҳол маълумот дар бораи обу ҳаво дастнорас аст.
newtab-weather-opt-in-see-weather = Шумо мехоҳед, ки маълумотро оид ба обу ҳавои макони худ бинед?
newtab-weather-opt-in-not-now =
    .label = Ҳоло не
newtab-weather-opt-in-yes =
    .label = Ҳа
newtab-weather-opt-in-use-location =
    .label = Истифодаи ҷойгиршавӣ
newtab-weather-opt-in-choose-location = Интихоби ҷойгиршавӣ
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Шаҳри Ню-Йорк
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Баланд
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Паст
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Дидани обу ҳаво дар { $provider }
    .aria-description = { $provider } ∙ Реклама

## Topic Labels

newtab-topic-label-business = Тиҷорат
newtab-topic-label-career = Пешравӣ
newtab-topic-label-education = Илму маърифат
newtab-topic-label-arts = Вақтхушӣ
newtab-topic-label-food = Ғизо
newtab-topic-label-health = Тандурустӣ
newtab-topic-label-hobbies = Бозиҳо
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Молия
newtab-topic-label-society-parenting = Тарбия
newtab-topic-label-government = Сиёсат
newtab-topic-label-education-science = Илм
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Таҷрибаи ҳаёт
newtab-topic-label-sports = Варзишҳо
newtab-topic-label-tech = Технологияҳо
newtab-topic-label-travel = Сайёҳӣ
newtab-topic-label-home = Хона ва боғ

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Барои танзими дақиқи навори хабарҳои худ, мавзуъҳоеро интихоб намоед
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Ду ё зиёда мавзуи дӯстдоштаро интихоб намоед. Нозирони коршиноси мо ба ҳикоятҳое, ки ба шавқу завқи шумо мувофиқанд, афзалият медиҳанд. Дар вақти дилхоҳ навсозӣ кунед.
newtab-topic-selection-save-button = Нигоҳ доштан
newtab-topic-selection-cancel-button = Бекор кардан
newtab-topic-selection-button-maybe-later = Шояд дертар
newtab-topic-selection-privacy-link = Бифаҳмед, ки чӣ тавр мо маълумотро ҳифз ва идора мекунем
newtab-topic-selection-button-update-interests = Манфиатҳои худро навсозӣ кунед
newtab-topic-selection-button-pick-interests = Манфиатҳои худро интихоб кунед

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Обуна шавед
newtab-section-following-button = Обуна шуд
newtab-section-unfollow-button = Бекор кардани обуна
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Навори хабарҳои худро ба таври дилхоҳ танзим кунед
newtab-section-follow-highlight-subtitle = Чизҳои дилбастагии худро пайгирӣ кунед, то чизҳои бештареро, ки ба шумо маъқуланд, бубинед.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Манъ кардан
newtab-section-blocked-button = Манъ карда шуд
newtab-section-unblock-button = Кушодан

## Confirmation modal for blocking a section

newtab-section-cancel-button = Ҳоло не
newtab-section-confirm-block-topic-p1 = Шумо мутмаин ҳастед, ки мехоҳед ин мавзуъро манъ кунед?
newtab-section-confirm-block-topic-p2 = Мавзуъҳои манъшуда дигар дар навори хабарҳои шумо пайдо намешаванд.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Манъ кардани { $topic }
newtab-section-block-cancel-button = Бекор кардан

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Мавзуъҳо
newtab-section-manage-topics-button-v2 =
    .label = Идоракунии мавзуъҳо
newtab-section-mangage-topics-followed-topics = Пайгирӣ карда мешавад
newtab-section-mangage-topics-followed-topics-empty-state = Шумо то ҳол ягон мавзуъро пайгирӣ накардаед.
newtab-section-mangage-topics-blocked-topics = Манъ карда мешавад
newtab-section-mangage-topics-blocked-topics-empty-state = Шумо то ҳол ягон мавзуъро манъ накардаед.
newtab-custom-wallpaper-title = Тасвирҳои заминаи фармоишӣ дар ин ҷой мебошанд
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Барои ба таври худ танзим кардани «{ -brand-product-name }», тасвири заминаи худро бор кунед ё ранги дилхоҳеро интихоб намоед.
newtab-custom-wallpaper-cta = Озмоед

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Тасвири заминаеро интихоб карда, соҳиби браузери «{ -brand-product-name }» шавед
newtab-new-user-custom-wallpaper-subtitle = Ҳар як варақаи навро ба як саҳифаи шахсии зебо табдил диҳед — бо тасвирҳои замина ва рангҳое, ки услуби шуморо инъикос мекунанд.
newtab-new-user-custom-wallpaper-cta = Ҳозир онро кӯшиш кунед

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-cta = Тасвири заминаиеро интихоб намоед

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Браузери «{ -brand-product-name }»-ро ба телефони мобилии худ боргирӣ кунед
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Барои тамошобинии бехатар дар Интернет, рамзеро тасвирбардорӣ намоед.
newtab-download-mobile-highlight-body-variant-b = Вақте ки шумо варақаҳо, ниҳонвожаҳо ва чизҳои дигареро ҳамоҳанг месозед, ба он ҷое, ки шумо ба қарибӣ тамошо кардаед, баргардонед.
newtab-download-mobile-highlight-body-variant-c = Оё шумо медонистед, ки метавонед «{ -brand-product-name }»-ро ба даст оред? Ҳамон браузери шинос — акнун дар кисаи шумо.
newtab-download-mobile-highlight-image =
    .aria-label = Рамзи «QR» барои боргирӣ кардани версияи мобилии «{ -brand-product-name }»

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Сомонаҳои дӯстдоштаи шумо дар нӯгҳои ангуштони шумо
newtab-shortcuts-highlight-subtitle = Миёнбуреро илова кунед, то сомонаҳои дӯстдоштаи шумо бо зеркунии як тугма дастрас шаванд.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Чаро шумо дар бораи ин гузориш медиҳед?
newtab-report-ads-reason-not-interested =
    .label = Ман шавқманд нестам
newtab-report-ads-reason-inappropriate =
    .label = Ин номуносиб аст
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Ман онро аз ҳад зиёд дидаам
newtab-report-content-wrong-category =
    .label = Категорияи нодуруст
newtab-report-content-outdated =
    .label = Ғайримуҳим
newtab-report-content-inappropriate-offensive =
    .label = Номуносиб ё таҳқиромез
newtab-report-content-spam-misleading =
    .label = Маълумоти номатлуб ё фиребанда
newtab-report-content-requires-payment-subscription =
    .label = Пардохт ё обунаро талаб мекунад
newtab-report-content-requires-payment-subscription-learn-more = Маълумоти бештар
newtab-report-cancel = Бекор кардан
newtab-report-submit = Пешниҳод кардан
newtab-toast-thanks-for-reporting =
    .message = Ташаккур барои гузориши шумо дар бораи ин масъала.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Имкониятҳо беохиранд. Вазифаи дилхоҳро илова намоед.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Нав
newtab-widget-lists-label-beta =
    .label = Бета
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Иҷро шуд ({ $number })
newtab-widget-lists-celebration-headline = Кори хуб
newtab-widget-task-list-menu-copy = Нусха бардоштан
newtab-widget-lists-menu-edit = Таҳрир кардани номи рӯйхат
newtab-widget-lists-menu-edit2 =
    .aria-label = Таҳрир кардани номи рӯйхат
newtab-widget-lists-menu-create = Эҷод кардани рӯйхати нав
newtab-widget-lists-menu-delete = Нест кардани ин рӯйхат
newtab-widget-lists-menu-copy = Нусха бардоштани рӯйхат ба ҳофизаи муваққатӣ
newtab-widget-lists-menu-learn-more = Маълумоти бештар
newtab-widget-lists-button-add-item = Илова кардани унсур
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Илова кардани унсур
    .aria-label = Илова кардани унсур
newtab-widget-lists-input-error = Лутфан, барои илова кардани унсур матнеро ворид намоед.
newtab-widget-lists-input-menu-open-link = Кушодани пайванд
newtab-widget-lists-input-menu-move-up = Ба боло гузоштан
newtab-widget-lists-input-menu-move-down = Ба поён гузоштан
newtab-widget-lists-input-menu-delete = Нест кардан
newtab-widget-lists-input-menu-edit = Таҳрир кардан
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Таҳрир кардани унсур
newtab-widget-lists-edit-clear =
    .aria-label = Бекор кардан
    .title = Бекор кардан
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Эҷод кардани рӯйхати нав
newtab-widget-lists-name-label-default =
    .label = Рӯйхати вазифаҳо
newtab-widget-lists-name-placeholder-default =
    .placeholder = Рӯйхати вазифаҳо
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Рӯйхати нав
    .aria-label = Таҳрир кардани номи рӯйхат
newtab-widget-section-title = Виҷетҳо
newtab-widget-menu-hide = Пинҳон кардани виҷет
newtab-widget-menu-change-size = Иваз кардани андоза
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Ҳаракат кардан
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Чап
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Рост
newtab-widget-size-small = Хурд
newtab-widget-size-medium = Миёна
newtab-widget-size-large = Калон
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Пинҳон кардани виҷетҳо
    .aria-label = Пинҳон кардани ҳамаи виҷетҳо
newtab-widget-section-maximize =
    .title = Баркушодани виҷетҳо
    .aria-label = Ҳамаи виҷетҳоро то андозаи пурра баркушоед
newtab-widget-section-minimize =
    .title = Ба ҳадди ақал сохтани виҷетҳо
    .aria-label = Ҳамаи виҷетҳои худро то андозаи хурд шакл созед
newtab-widget-add-widgets-button =
    .aria-label = Илова кардани виҷет
    .title = Илова кардани виҷет
newtab-widget-section-menu-manage = Идоракунии виҷетҳо
newtab-widget-section-menu-hide-all = Пинҳон кардани виҷетҳо
newtab-widget-section-menu-learn-more = Маълумоти бештар

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Вақтсанҷ
newtab-widget-timer-notification-focus = Вақти мутолиа ба анҷом расид. Кори хуб. Танаффус лозим аст?
newtab-widget-timer-notification-break = Танаффус ба анҷом расид. Омода ҳастед, ки боз диққат кунед?
newtab-widget-timer-notification-warning = Огоҳномаҳо хомӯш мебошанд
newtab-widget-timer-mode-focus =
    .label = Марказонидан
newtab-widget-timer-mode-break =
    .label = Қатъ кардан
newtab-widget-timer-label-play =
    .label = Пахш кардан
newtab-widget-timer-label-pause =
    .label = Таваққуф кардан
newtab-widget-timer-reset =
    .title = Аз нав танзим кардан
newtab-widget-timer-menu-notifications = Хомӯш кардани огоҳномаҳо
newtab-widget-timer-menu-notifications-on = Фаъол кардани огоҳномаҳо
newtab-widget-timer-menu-learn-more = Маълумоти бештар
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Сарлавҳаҳои хабарҳои асосӣ
newtab-daily-briefing-card-menu-dismiss = Нодида гузарондан
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = { $minutes } дақиқа пеш навсозӣ карда шуд
newtab-widget-message-title = Бо истифода аз рӯйхатҳо ва вақтсанҷи дарунсохт диққати худро нигоҳ доред
# to-dos stands for "things to do".
newtab-widget-message-copy = Аз ёдовариҳои фаврӣ то вазифаҳои ҳаррӯза ва аз ҷаласаҳои бодиққат то танаффусҳои бардавом — ҳар гуна вазифаҳоро дар сари вақт иҷро намоед.
newtab-promo-card-cta-addons = Ҳозир онро кӯшиш кунед
newtab-promo-card-title = Дастгирӣ кардани «{ -brand-product-name }»
newtab-promo-card-body = Сарпарастони мо рисолати моро барои ташкили таҷрибаи беҳтарини Интернет дастгирӣ менамоянд
newtab-promo-card-cta = Маълумоти бештар
newtab-promo-card-dismiss-button =
    .title = Нодида гузарондан
    .aria-label = Нодида гузарондан

## Strings introduced by the Nova redesign of the Timer widget

# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Марказонидан
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Қатъ кардан
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Пинҳон кардани вақтсанҷ

##

newtab-sports-widget-menu-view-results = Намоиш додани натиҷаҳо
newtab-sports-widget-menu-learn-more = Маълумоти бештар
newtab-sports-widget-choose-wallpaper =
    .label = Тасвири заминаиеро интихоб намоед
newtab-sports-widget-skip = Нодида гузарондан
newtab-sports-widget-cancel = Бекор кардан
newtab-sports-widget-back-button =
    .aria-label = Ба қафо
newtab-sports-widget-done-button =
    .label = Тайёр
newtab-sports-widget-group-stage = Марҳилаи гурӯҳӣ
newtab-sports-widget-group-a = Гурӯҳи «A»
newtab-sports-widget-group-b = Гурӯҳи «B»
newtab-sports-widget-group-c = Гурӯҳи «C»
newtab-sports-widget-group-d = Гурӯҳи «D»
newtab-sports-widget-group-e = Гурӯҳи «E»
newtab-sports-widget-group-f = Гурӯҳи «F»
newtab-sports-widget-group-g = Гурӯҳи «G»
newtab-sports-widget-group-h = Гурӯҳи «H»
newtab-sports-widget-group-i = Гурӯҳи «I»
newtab-sports-widget-group-j = Гурӯҳи «J»
newtab-sports-widget-group-k = Гурӯҳи «K»
newtab-sports-widget-group-l = Гурӯҳи «L»
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = ПАХШИ МУСТАҚИМ
# Used for a match currently ongoing
newtab-sports-widget-now = Ҳозир
newtab-sports-widget-results = Натиҷаҳо
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-view-results-link = Намоиш додани натиҷаҳо
newtab-sports-widget-third-place = Ҷойи сеюм
newtab-sports-widget-match-full-time = Вақти пурра

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Нодида гузарондан
    .aria-label = Нодида гузарондан
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Ин фазоро аз они худ созед
newtab-activation-window-message-customization-focus-message = Тасвири заминаи наверо интихоб кунед, миёнбурҳоро ба сомонаҳои дӯстдоштаи худ илова намоед ва дар бораи ҳикояҳое, ки ба шумо ҷолибанд, бохабар бошед.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Танзими шахсиро оғоз кунед
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Ин фазо тибқи қоидаҳои шумо рафтор мекунад

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Пинҳон кардани соат
newtab-clock-widget-menu-learn-more = Маълумоти бештар
newtab-clock-widget-menu-edit = Таҳрир кардани соат
newtab-clock-widget-label-your-clocks = Соатҳои шумо
newtab-clock-widget-button-add-clock = Илова кардан
newtab-clock-widget-button-cancel = Бекор кардан
newtab-clock-widget-button-back =
    .title = Ба қафо
    .aria-label = Ба қафо
newtab-clock-widget-button-edit-clock =
    .title = Таҳрир кардани соат
    .aria-label = Таҳрир кардани соат
newtab-clock-widget-button-save = Нигоҳ доштан
newtab-clock-widget-button-remove-clock =
    .title = Тоза кардани соат
    .aria-label = Тоза кардани соат
newtab-clock-widget-add-clock-form =
    .aria-label = Илова кардани соат
newtab-clock-widget-edit-clock-form =
    .aria-label = Таҳрир кардани соат
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Натиҷаҳои ҷустуҷӯ
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Ягон мутобиқат нест
