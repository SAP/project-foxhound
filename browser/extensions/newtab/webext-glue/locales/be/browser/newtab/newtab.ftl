# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Новая картка
newtab-settings-button =
    .title = Наладзіць вашу старонку новай карткі
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Уладкаваць гэту старонку
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Уладкаваць
newtab-customize-panel-label =
    .label = Уладкаваць
newtab-personalize-settings-icon-label =
    .title = Персаналізаваць новую картку
    .aria-label = Налады
newtab-settings-dialog-label =
    .aria-label = Налады
newtab-personalize-icon-label =
    .title = Персаналізаваць новую картку
    .aria-label = Персаналізаваць новую картку
newtab-personalize-dialog-label =
    .aria-label = Персаналізаваць
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Адхіліць
    .aria-label = Адхіліць

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Хатняя старонка
home-homepage-new-windows =
    .label = Новыя вокны
home-homepage-new-tabs =
    .label = Новыя карткі
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Выберыце канкрэтны сайт

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Адрас(ы) сайта(ў)
home-custom-homepage-address =
    .placeholder = Увядзіце адрас
home-custom-homepage-address-button =
    .label = Дадаць адрас
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Пакуль не дададзены ніводны сайт.
home-custom-homepage-delete-address-button =
    .aria-label = Выдаліць адрас
    .title = Выдаліць адрас
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Замяніць на
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Зараз адкрытыя старонкі
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Закладкі…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Пошук
home-prefs-stories-header2 =
    .label = Гісторыі
    .description = Выключнае змесціва, курыраванае сям'ёй { -brand-product-name }
home-prefs-widgets-header =
    .label = Віджэты
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Спісы
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Таймер
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Спорт
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Гадзіннік
home-prefs-mission-message2 =
    .message = Нашы спонсары падтрымліваюць нашу місію па стварэнні лепшага Інтэрнэту.
home-prefs-manage-topics-link2 =
    .label = Кіраванне тэмамі
home-prefs-choose-wallpaper-link2 =
    .label = Выбраць шпалеры
home-prefs-firefox-logo-header =
    .label = Лагатып { -brand-short-name }
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Каб карыстацца гэтымі функцыямі, абярыце для новых картак або новых вокнаў { -firefox-home-brand-name }.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } радок
            [few] { $num } радкі
           *[many] { $num } радкоў
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Пашырэнне ({ $extension })
home-restore-defaults-srd =
    .label = Аднавіць прадвызначэнні
    .accesskey = А
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (тыповая)
home-mode-choice-custom-srd =
    .label = Свае URL-адрасы…
home-mode-choice-blank-srd =
    .label = Пустая старонка
home-prefs-shortcuts-header-srd =
    .label = Цэтлікі
home-prefs-shortcuts-select =
    .aria-label = Цэтлікі
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Спонсарскія цэтлікі
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Артыкулы ад спонсараў
home-prefs-highlights-option-visited-pages-srd =
    .label = Наведаныя старонкі
home-prefs-highlights-options-bookmarks-srd =
    .label = Закладкі
home-prefs-highlights-option-most-recent-download-srd =
    .label = Нядаўнія сцягванні
home-prefs-recent-activity-header-srd =
    .label = Апошняя актыўнасць
home-prefs-recent-activity-select =
    .aria-label = Апошняя актыўнасць
home-prefs-weather-header-srd =
    .label = Надвор'е
home-prefs-support-firefox-header-srd =
    .label = Падтрымаць { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = Даведацца, як

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Шукаць
    .aria-label = Шукаць
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Шукайце ў { $engine } або ўвядзіце адрас
newtab-search-box-handoff-text-no-engine = Увядзіце запыт або адрас
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Шукайце ў { $engine } або ўвядзіце адрас
    .title = Шукайце ў { $engine } або ўвядзіце адрас
    .aria-label = Шукайце ў { $engine } або ўвядзіце адрас
newtab-search-box-handoff-input-no-engine =
    .placeholder = Увядзіце запыт або адрас
    .title = Увядзіце запыт або адрас
    .aria-label = Увядзіце запыт або адрас
newtab-search-box-text = Шукаць у Iнтэрнэце
newtab-search-box-input =
    .placeholder = Пошук у інтэрнэце
    .aria-label = Шукайце ў Інтэрнэце

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Дадаць пашукавік
newtab-topsites-add-shortcut-header = Новы цэтлік
newtab-topsites-edit-topsites-header = Рэдагаваць папулярны сайт
newtab-topsites-edit-shortcut-header = Рэдагаваць цэтлік
newtab-topsites-add-shortcut-label = Дадаць цэтлік
newtab-topsites-add-shortcut-title =
    .title = Дадаць цэтлік
    .aria-label = Дадаць цэтлік
newtab-topsites-title-label = Загаловак
newtab-topsites-title-input =
    .placeholder = Увядзіце назву
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Увядзіце або ўстаўце URL
newtab-topsites-url-validation = Патрабуецца сапраўдны URL
newtab-topsites-image-url-label = Уласны URL выявы
newtab-topsites-use-image-link = Выкарыстоўваць уласную выяву…
newtab-topsites-image-validation = Не ўдалося атрымаць выяву. Паспрабуйце іншы URL.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Ачысціць тэкст

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Скасаваць
newtab-topsites-delete-history-button = Выдаліць з гісторыі
newtab-topsites-save-button = Захаваць
newtab-topsites-preview-button = Перадпрагляд
newtab-topsites-add-button = Дадаць

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Вы сапраўды жадаеце выдаліць усе запісы аб гэтай старонцы з гісторыі?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Гэта дзеянне немагчыма адмяніць.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Спонсарскі

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (замацавана)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Адкрыць меню
    .aria-label = Адкрыць меню
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Выдаліць
    .aria-label = Выдаліць
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Адкрыць меню
    .aria-label = Адкрыць кантэкстнае меню для { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Рэдагаваць гэты сайт
    .aria-label = Рэдагаваць гэты сайт

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Правіць
newtab-menu-open-new-window = Адкрыць у новым акне
newtab-menu-open-new-private-window = Адкрыць у новым прыватным акне
newtab-menu-dismiss = Адхіліць
newtab-menu-pin = Замацаваць
newtab-menu-unpin = Адмацаваць
newtab-menu-delete-history = Выдаліць з гісторыі
newtab-menu-save-to-pocket = Захаваць у { -pocket-brand-name }
newtab-menu-delete-pocket = Выдаліць з { -pocket-brand-name }
newtab-menu-archive-pocket = Архіваваць у { -pocket-brand-name }
newtab-menu-show-privacy-info = Нашы спонсары і ваша прыватнасць
newtab-menu-about-fakespot = Пра { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Паведаміць
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Блакаваць
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Адпісацца
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Даведацца больш
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Адпісацца ад тэмы

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Кіраваць спонсарскім змесцівам
newtab-menu-our-sponsors-and-your-privacy = Нашы спонсары і ваша прыватнасць
newtab-menu-report-this-ad = Паскардзіцца на гэту рэкламу

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Зроблена
newtab-privacy-modal-button-manage = Кіраваць наладамі спонсарскага змесціва
newtab-privacy-modal-header = Ваша прыватнасць мае значэнне.
newtab-privacy-modal-paragraph-2 =
    У дадатак да захапляльных гісторый, мы таксама паказваем вам рэлевантны,
    правераны змест ад выбраных спонсараў. Будзьце ўпэўненыя, <strong>вашы дадзеныя
    аглядання ніколі не пакідаюць вашу копію { -brand-product-name }</strong> — мы іх не бачым,
    гэтаксама і нашы спонсары.
newtab-privacy-modal-link = Даведайцеся, як працуе прыватнасць на новай картцы

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Выдаліць закладку
# Bookmark is a verb here.
newtab-menu-bookmark = У закладкі

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Капіяваць спасылку сцягвання
newtab-menu-go-to-download-page = Перайсці на старонку сцягвання
newtab-menu-remove-download = Выдаліць з гісторыі

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Паказаць у Finder
       *[other] Адкрыць змяшчальную папку
    }
newtab-menu-open-file = Адкрыць файл

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Наведанае
newtab-label-bookmarked = У закладках
newtab-label-removed-bookmark = Закладка выдалена
newtab-label-recommended = Тэндэнцыі
newtab-label-saved = Захавана ў { -pocket-brand-name }
newtab-label-download = Сцягнута
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Спансаравана
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Ад спонсара { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } хв
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Спонсарскі

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Выдаліць раздзел
newtab-section-menu-collapse-section = Згарнуць раздзел
newtab-section-menu-expand-section = Разгарнуць раздзел
newtab-section-menu-manage-section = Наладзіць раздзел
newtab-section-menu-manage-webext = Кіраваць пашырэннем
newtab-section-menu-add-topsite = Дадаць папулярны сайт
newtab-section-menu-add-search-engine = Дадаць пашукавік
newtab-section-menu-move-up = Пасунуць вышэй
newtab-section-menu-move-down = Пасунуць ніжэй
newtab-section-menu-privacy-notice = Паведамленне аб прыватнасці

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Згарнуць раздзел
newtab-section-expand-section-label =
    .aria-label = Разгарнуць раздзел

## Section Headers.

newtab-section-header-topsites = Папулярныя сайты
newtab-section-header-recent-activity = Апошняя актыўнасць
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Рэкамендавана { $provider }
newtab-section-header-stories = Гісторыі, якія прымушаюць задумацца
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Сённяшняя падборка для вас

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Пачніце агляданне, і мы пакажам вам тут некаторыя з найлепшых артыкулаў, відэаролікаў і іншых старонак, якія вы нядаўна наведалі або зрабілі закладкі.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Гатова. Праверце пазней, каб убачыць больш матэрыялаў ад { $provider }. Не жадаеце чакаць? Выберыце папулярную тэму, каб знайсці больш цікавых матэрыялаў з усяго Інтэрнэту.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Гатова. Праверце пазней, каб убачыць больш матэрыялаў. Не жадаеце чакаць? Выберыце папулярную тэму, каб знайсці больш цікавых матэрыялаў з усяго Інтэрнэту.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Вы ўсё прачыталі!
newtab-discovery-empty-section-topstories-content = Звярніцеся пазней, каб пабачыць больш артыкулаў.
newtab-discovery-empty-section-topstories-try-again-button = Паспрабаваць зноў
newtab-discovery-empty-section-topstories-loading = Чытаецца…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Ой! Мы амаль загрузілі гэты раздзел, але не зусім.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Папулярныя тэмы:
newtab-pocket-new-topics-title = Хочаце яшчэ больш гісторый? Глядзіце гэтыя папулярныя тэмы ад { -pocket-brand-name }
newtab-pocket-more-recommendations = Больш рэкамендацый
newtab-pocket-learn-more = Падрабязней
newtab-pocket-cta-button = Атрымаць { -pocket-brand-name }
newtab-pocket-cta-text = Захоўвайце ўлюбёныя гісторыі ў { -pocket-brand-name }, і сілкуйце свой розум добрай чытанкай.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } уваходзіць у сямейства { -brand-product-name }
newtab-pocket-save = Захаваць
newtab-pocket-saved = Захавана

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Больш падобных
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Не для мяне
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Дзякуй. Ваш водгук дапаможа нам палепшыць вашу стужку.
newtab-toast-dismiss-button =
    .title = Схаваць
    .aria-label = Схаваць

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Адкрыйце для сябе лепшае з Інтэрнэту
newtab-pocket-onboarding-cta = { -pocket-brand-name } даследуе разнастайныя публікацыі, каб прынесці найбольш інфарматыўнае, натхняльнае і вартае даверу змесціва прама ў ваш браўзер { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Ох, нешта пайшло не так пры загрузцы гэтага змесціва.
newtab-error-fallback-refresh-link = Абнавіць старонку, каб паўтарыць спробу.

## Customization Menu

newtab-custom-shortcuts-title = Цэтлікі
newtab-custom-shortcuts-subtitle = Сайты, якія вы захоўваеце або наведваеце
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Цэтлікі
    .description = Сайты, якія вы захоўваеце або наведваеце
newtab-custom-shortcuts-nova =
    .label = Цэтлікі
newtab-custom-row-description =
    .description = Колькасць радкоў
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } радок
            [few] { $num } радкі
           *[many] { $num } радкоў
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } радок
        [few] { $num } радкі
       *[many] { $num } радкоў
    }
newtab-custom-sponsored-sites = Спонсарскія цэтлікі
newtab-custom-pocket-title = Рэкамендавана { -pocket-brand-name }
newtab-custom-pocket-subtitle = Выключнае змесціва, куратарам якога з'яўляецца { -pocket-brand-name }, частка сям'і { -brand-product-name }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Рэкамендаваныя гісторыі
    .description = Выключнае змесціва, курыраванае сямействам { -brand-product-name }
newtab-recommended-stories-toggle =
    .label = Рэкамендаваныя гісторыі
newtab-custom-stories-personalized-toggle =
    .label = Гісторыі
newtab-custom-stories-personalized-checkbox-label = Персаналізаваныя гісторыі на аснове вашай актыўнасці
newtab-custom-pocket-sponsored = Артыкулы ад спонсараў
newtab-custom-pocket-show-recent-saves = Паказваць апошнія захаванні
newtab-custom-recent-title = Апошняя актыўнасць
newtab-custom-recent-subtitle = Падборка нядаўніх сайтаў і змесціва
newtab-custom-weather-toggle =
    .label = Надвор'е
    .description = Кароткі прагноз на сёння
newtab-custom-widget-weather-toggle =
    .label = Надвор'е
newtab-custom-widget-lists-toggle =
    .label = Спісы
newtab-custom-widget-timer-toggle =
    .label = Таймер
newtab-custom-widget-sports-toggle =
    .label = Кубак свету
newtab-custom-widget-clock-toggle =
    .label = Гадзіннік
newtab-custom-widget-sports-toggle2 =
    .label = Спорт
newtab-custom-widget-section-title = Віджэты
newtab-custom-widget-section-toggle =
    .label = Віджэты
newtab-widget-manage-title = Віджэты
newtab-widget-manage-widget-button =
    .label = Кіраванне віджэтамі
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Закрыць
    .aria-label = Закрыць меню
newtab-custom-close-button = Закрыць
newtab-custom-settings = Кіраваць дадатковымі наладамі

## New Tab Wallpapers

newtab-wallpaper-title = Шпалеры
newtab-wallpaper-reset = Скінуць да прадвызначаных
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Зацягнуць выяву
newtab-wallpaper-add-an-image = Дадаць выяву
newtab-wallpaper-custom-color = Выберыце колер
newtab-wallpaper-toggle-title =
    .label = Шпалеры
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Памер выявы перавышае абмежаванне ў { $file_size } МБ. Калі ласка, паспрабуйце загрузіць файл меншага памеру.
newtab-wallpaper-error-upload-file-type = Не ўдалося зацягнуць ваш файл. Паўтарыце спробу з файлам выявы.
newtab-wallpaper-error-file-type = Мы не змаглі зацягнуць ваш файл. Паўтарыце спробу з іншым тыпам файла.
newtab-wallpaper-light-red-panda = Чырвоная панда
newtab-wallpaper-light-mountain = Белая гара
newtab-wallpaper-light-sky = Неба з фіялетавымі і ружовымі аблокамі
newtab-wallpaper-light-color = Сінія, ружовыя і жоўтыя формы
newtab-wallpaper-light-landscape = Горны пейзаж з блакітнага туману
newtab-wallpaper-light-beach = Пляж з пальмамі
newtab-wallpaper-dark-aurora = Палярнае ззянне
newtab-wallpaper-dark-color = Чырвоныя і сінія фігуры
newtab-wallpaper-dark-panda = Чырвоная панда схаваная ў лесе
newtab-wallpaper-dark-sky = Гарадскі пейзаж з начным небам
newtab-wallpaper-dark-mountain = Горны пейзаж
newtab-wallpaper-dark-city = Пурпурны гарадскі пейзаж
newtab-wallpaper-dark-fox-anniversary = Ліса на тратуары каля лесу
newtab-wallpaper-light-fox-anniversary = Ліса ў травяністым полі з туманным горным ландшафтам

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Аднатонныя колеры
newtab-wallpaper-colors = Колеры
newtab-wallpaper-blue = Сіні
newtab-wallpaper-light-blue = Блакітны
newtab-wallpaper-light-purple = Светла-фіялетавы
newtab-wallpaper-light-green = Светла-зялёны
newtab-wallpaper-green = Зялёны
newtab-wallpaper-beige = Бэжавы
newtab-wallpaper-yellow = Жоўты
newtab-wallpaper-orange = Аранжавы
newtab-wallpaper-pink = Ружовы
newtab-wallpaper-light-pink = Светла-ружовы
newtab-wallpaper-red = Чырвоны
newtab-wallpaper-dark-blue = Цёмна-сіні
newtab-wallpaper-dark-purple = Цёмна-фіялетавы
newtab-wallpaper-dark-green = Цёмна-зялёны
newtab-wallpaper-brown = Карычневы

## Abstract

newtab-wallpaper-category-title-abstract = Абстракцыя
newtab-wallpaper-abstract-green = Зялёныя формы
newtab-wallpaper-abstract-blue = Сінія формы
newtab-wallpaper-abstract-purple = Фіялетавыя формы
newtab-wallpaper-abstract-orange = Аранжавыя формы
newtab-wallpaper-gradient-orange = Градыент аранжавага і ружовага
newtab-wallpaper-abstract-blue-purple = Сінія і фіялетавыя формы
newtab-wallpaper-abstract-white-curves = Белы з зацененымі крывымі
newtab-wallpaper-abstract-purple-green = Градыент фіялетавага і зялёнага святла
newtab-wallpaper-abstract-blue-purple-waves = Сінія і фіялетавыя хвалістыя формы
newtab-wallpaper-abstract-black-waves = Чорныя хвалістыя формы

## Firefox

newtab-wallpaper-category-title-photographs = Фатаграфіі
newtab-wallpaper-beach-at-sunrise = Пляж на ўсходзе сонца
newtab-wallpaper-beach-at-sunset = Пляж на заходзе сонца
newtab-wallpaper-storm-sky = Навальнічнае неба
newtab-wallpaper-sky-with-pink-clouds = Неба з ружовымі аблокамі
newtab-wallpaper-red-panda-yawns-in-a-tree = Чырвоная панда пазяхае на дрэве
newtab-wallpaper-white-mountains = Белыя горы
newtab-wallpaper-hot-air-balloons = Розныя колеры паветраных шароў удзень
newtab-wallpaper-starry-canyon = Сіняя зорная ноч
newtab-wallpaper-suspension-bridge = Фатаграфія шэрага поўнападвеснага моста ў дзённы час
newtab-wallpaper-sand-dunes = Белыя пясчаныя выдмы
newtab-wallpaper-palm-trees = Сілуэт какосавых пальмаў у залаты час
newtab-wallpaper-blue-flowers = Фатаграфія буйным планам кветак з блакітнымі пялёсткамі
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Фота <a data-l10n-name="name-link">{ $author_string }</a> з <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Паспрабуйце ўсплёск колеру
newtab-wallpaper-feature-highlight-content = Абнавіце выгляд новай карткі з дапамогай шпалер.
newtab-wallpaper-feature-highlight-button = Зразумела
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Адхіліць
    .aria-label = Закрыць выплыўное акно
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Нябесны
newtab-wallpaper-celestial-lunar-eclipse = Месяцовае зацьменне
newtab-wallpaper-celestial-earth-night = Начная фатаграфія з нізкай калязямной арбіты
newtab-wallpaper-celestial-starry-sky = Зорнае неба
newtab-wallpaper-celestial-eclipse-time-lapse = Прамежак часу месяцовага зацьмення
newtab-wallpaper-celestial-black-hole = Ілюстрацыя галактыкі з чорнай дзіркай
newtab-wallpaper-celestial-river = Спадарожнікавы здымак ракі

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Паглядзець прагноз у { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Спонсар
newtab-weather-menu-change-location = Змяніць месцазнаходжанне
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Шукаць месцазнаходжанне
    .aria-label = Шукаць месцазнаходжанне
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Ужыць дзейнае месцазнаходжанне
newtab-weather-menu-weather-display = Паказ надвор'я
newtab-weather-todays-forecast = Прагноз на сёння
newtab-weather-see-full-forecast = Паглядзець поўны прагноз
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Просты
newtab-weather-menu-change-weather-display-simple = Пераключыцца на просты выгляд
newtab-weather-menu-weather-display-option-detailed = Падрабязны
newtab-weather-menu-change-weather-display-detailed = Пераключыцца на падрабязны выгляд
newtab-weather-menu-temperature-units = Адзінкі вымярэння тэмпературы
newtab-weather-menu-temperature-option-fahrenheit = Фарэнгейт
newtab-weather-menu-temperature-option-celsius = Цэльсій
newtab-weather-menu-change-temperature-units-fahrenheit = Пераключыць на фарэнгейты
newtab-weather-menu-change-temperature-units-celsius = Пераключыць на градусы Цэльсія
newtab-weather-menu-hide-weather = Схаваць надвор'е на новай картцы
newtab-weather-menu-learn-more = Даведацца больш
newtab-weather-menu-detect-my-location = Вызначыць маё месцазнаходжанне
# This message is shown if user is working offline
newtab-weather-error-not-available = Звесткі пра надвор'е зараз недаступныя.
newtab-weather-opt-in-see-weather = Хочаце бачыць надвор'е для вашага месцазнаходжання?
newtab-weather-opt-in-not-now =
    .label = Не зараз
newtab-weather-opt-in-yes =
    .label = Так
newtab-weather-opt-in-headline = Атрымайце мясцовы прагноз надвор'я
newtab-weather-opt-in-use-location =
    .label = Ужыць месцазнаходжанне
newtab-weather-opt-in-choose-location = Абраць месцазнаходжанне
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Нью-Ёрк
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Найвышэйшая
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Найніжэйшая
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Паглядзець прагноз у { $provider }
    .aria-description = { $provider } ∙ Спонсар

## Topic Labels

newtab-topic-label-business = Бізнес
newtab-topic-label-career = Кар'ера
newtab-topic-label-education = Адукацыя
newtab-topic-label-arts = Забавы
newtab-topic-label-food = Ежа
newtab-topic-label-health = Здароўе
newtab-topic-label-hobbies = Гульні
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Грошы
newtab-topic-label-society-parenting = Выхаванне
newtab-topic-label-government = Палітыка
newtab-topic-label-education-science = Навука
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Лайфхакі
newtab-topic-label-sports = Спорт
newtab-topic-label-tech = Тэхналогіі
newtab-topic-label-travel = Падарожжы
newtab-topic-label-home = Дом і сад

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Выберыце тэмы, каб наладзіць сваю стужку
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Выберыце дзве або больш тэм. Нашы эксперты-куратары аддаюць перавагу гісторыям, якія адпавядаюць вашым інтарэсам. Абнаўляйце ў любы час.
newtab-topic-selection-save-button = Захаваць
newtab-topic-selection-cancel-button = Скасаваць
newtab-topic-selection-button-maybe-later = Магчыма пазней
newtab-topic-selection-privacy-link = Даведайцеся, як мы ахоўваем дадзеныя і распараджаемся імі
newtab-topic-selection-button-update-interests = Абнавіце свае зацікаўленасці
newtab-topic-selection-button-pick-interests = Выберыце свае зацікаўленасці

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Падпісацца
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Сачыць за { $topic }
newtab-section-following-button = Падпісаны
newtab-section-unfollow-button = Адпісацца
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Падпіска: Адпісацца ад { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Наладзьце сваю стужку навін
newtab-section-follow-highlight-subtitle = Падпішыцеся на свае зацікаўленасці, каб бачыць больш таго, што вам падабаецца.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Блакаваць
newtab-section-blocked-button = Заблакаваны
newtab-section-unblock-button = Разблакаваць
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Сачыць за { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Адпісацца ад { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Заблакаваць { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Разблакаваць { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = Не зараз
newtab-section-confirm-block-topic-p1 = Вы сапраўды хочаце заблакаваць гэтую тэму?
newtab-section-confirm-block-topic-p2 = Заблакаваныя тэмы больш не будуць з'яўляцца ў вашай стужцы.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Заблакаваць { $topic }
newtab-section-block-cancel-button = Скасаваць

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Тэмы
newtab-section-manage-topics-button-v2 =
    .label = Кіраванне тэмамі
newtab-section-mangage-topics-followed-topics = Падпіскі
newtab-section-mangage-topics-followed-topics-empty-state = Вы яшчэ не падпісаліся ні на адну тэму.
newtab-section-mangage-topics-blocked-topics = Заблакаваны
newtab-section-mangage-topics-blocked-topics-empty-state = Вы яшчэ не заблакавалі ніводнай тэмы.
newtab-custom-wallpaper-title = Карыстальніцкія шпалеры тут
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Зацягніце свае шпалеры або выберыце ўласны колер, каб зрабіць { -brand-product-name } сваім.
newtab-custom-wallpaper-cta = Паспрабаваць

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Выберыце шпалеры, каб зрабіць { -brand-product-name } сваім
newtab-new-user-custom-wallpaper-subtitle = Зрабіце кожную новую картку як дома з дапамогай карыстальніцкіх шпалер і колераў.
newtab-new-user-custom-wallpaper-cta = Паспрабаваць зараз

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Новыя шпалеры толькі што з'явіліся
newtab-wallpaper-feature-highlight-subtitle = Выберыце вашы любімыя і зрабіце кожную новую картку сваёй, як дома.
newtab-wallpaper-feature-highlight-cta = Абраць шпалеры

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Сцягнуць { -brand-product-name } для мабільных прылад
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Скануйце код, каб бяспечна аглядаць на хадзе.
newtab-download-mobile-highlight-body-variant-b = Працягвайце з таго месца, дзе спыніліся, сінхранізуючы карткі, паролі і іншае.
newtab-download-mobile-highlight-body-variant-c = Ці ведаеце вы, што { -brand-product-name } можна браць у дарогу? Той жа браўзер. У кішэні.
newtab-download-mobile-highlight-image =
    .aria-label = QR-код для сцягвання { -brand-product-name } для мабільных прылад

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Вашы любімыя рэчы ў вас пад рукой
newtab-shortcuts-highlight-subtitle = Дадайце цэтлік, каб вашы любімыя сайты былі на адлегласці дотыку.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Чаму вы паведамляеце пра гэта?
newtab-report-ads-reason-not-interested =
    .label = Мне не цікава
newtab-report-ads-reason-inappropriate =
    .label = Гэта недарэчна
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Я бачыў гэта занадта шмат разоў
newtab-report-content-wrong-category =
    .label = Няправільная катэгорыя
newtab-report-content-outdated =
    .label = Устарэлае
newtab-report-content-inappropriate-offensive =
    .label = Недарэчнае або абразлівае
newtab-report-content-spam-misleading =
    .label = Спам або зман
newtab-report-content-requires-payment-subscription =
    .label = Патрэбна аплата або падпіска
newtab-report-content-requires-payment-subscription-learn-more = Даведацца больш
newtab-report-cancel = Скасаваць
newtab-report-submit = Даслаць
newtab-toast-thanks-for-reporting =
    .message = Дзякуй, што паведамілі пра гэта.
newtab-toast-widgets-hidden =
    .message = Выберыце значок алоўка, каб ізноў дадаць віджэты ў любы час.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Цяпер вы падпісаны на { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Вы больш не падпісаныя на { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Вы больш не будзеце бачыць артыкулы па тэме { $topic }.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Магчымасці бязмежныя. Дадайце яшчэ адну.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Навінка
newtab-widget-lists-label-beta =
    .label = Бэта
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Завершана ({ $number })
newtab-widget-lists-celebration-headline = Добрая праца
newtab-widget-lists-celebration-subhead = Усё чыста
newtab-widget-task-list-menu-copy = Капіяваць
newtab-widget-lists-menu-edit = Змяніць назву спісу
newtab-widget-lists-menu-edit2 =
    .aria-label = Змяніць назву спісу
newtab-widget-lists-menu-create = Стварыць новы спіс
newtab-widget-lists-menu-delete = Выдаліць гэты спіс
newtab-widget-lists-menu-copy = Скапіяваць спіс у буфер абмену
newtab-widget-lists-menu-learn-more = Падрабязней
newtab-widget-lists-button-add-item = Дадаць элемент
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Дадаць элемент
    .aria-label = Дадаць элемент
newtab-widget-lists-input-error = Калі ласка, улучыце тэкст, каб дадаць элемент.
newtab-widget-lists-input-menu-open-link = Адкрыць спасылку
newtab-widget-lists-input-menu-move-up = Рухаць угору
newtab-widget-lists-input-menu-move-down = Рухаць уніз
newtab-widget-lists-input-menu-delete = Выдаліць
newtab-widget-lists-input-menu-edit = Змяніць
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Змяніць элемент
newtab-widget-lists-edit-clear =
    .aria-label = Скасаваць
    .title = Скасаваць
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Стварыць новы спіс
newtab-widget-lists-name-label-default =
    .label = Спіс задач
newtab-widget-lists-name-label-checklist =
    .label = Кантрольны спіс
newtab-widget-lists-name-placeholder-default =
    .placeholder = Спіс задач
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Кантрольны спіс
    .aria-label = Змяніць назву спіса
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Новы спіс
    .aria-label = Змяніць назву спісу
newtab-widget-section-title = Віджэты
newtab-widget-menu-hide = Схаваць віджэт
newtab-widget-menu-change-size = Змяніць памер
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Перанесці
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Улева
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Управа
newtab-widget-size-small = Малы
newtab-widget-size-medium = Сярэдні
newtab-widget-size-large = Вялікі
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Схаваць віджэты
    .aria-label = Схаваць усе віджэты
newtab-widget-section-maximize =
    .title = Разгарнуць віджэты
    .aria-label = Разгарнуць усе віджэты ў поўны памер
newtab-widget-section-minimize =
    .title = Згарнуць віджэты
    .aria-label = Згарнуць усе віджэты ў кампактны памер
newtab-widget-section-menu-button =
    .title = Меню віджэтаў
    .aria-label = Адкрыць меню віджэтаў
newtab-widget-add-widgets-button =
    .aria-label = Дадаць віджэт
    .title = Дадаць віджэт
newtab-widget-section-menu-manage = Кіраванне віджэтамі
newtab-widget-section-menu-hide-all = Схаваць віджэты
newtab-widget-section-menu-learn-more = Падрабязней
newtab-widget-section-feedback = Раскажыце нам, што вы думаеце
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Паказаць больш віджэтаў
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Паказваць менш віджэтаў
newtab-widget-lists-name-default = Кантрольны спіс

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Таймер
newtab-widget-timer-notification-focus = Час для канцэнтрацыі скончыўся. Выдатная праца. Патрэбен перапынак?
newtab-widget-timer-notification-break = Ваш перапынак скончыўся. Гатовыя засяродзіцца?
newtab-widget-timer-notification-warning = Апавяшчэнні выключаны
newtab-widget-timer-mode-focus =
    .label = Фокус
newtab-widget-timer-mode-break =
    .label = Перапынак
newtab-widget-timer-label-play =
    .label = Прайграць
newtab-widget-timer-label-pause =
    .label = Прыпыніць
newtab-widget-timer-reset =
    .title = Скінуць
newtab-widget-timer-menu-notifications = Выключыць апавяшчэнні
newtab-widget-timer-menu-notifications-on = Уключыць апавяшчэнні
newtab-widget-timer-menu-learn-more = Падрабязней
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Галоўныя загалоўкі
newtab-daily-briefing-card-menu-dismiss = Адхіліць
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Абноўлена { $minutes } хв. таму
newtab-widget-message-title = Заставайцеся сканцэнтраванымі з дапамогай спісаў і ўбудаванага таймера
# to-dos stands for "things to do".
newtab-widget-message-copy = Паспявайце ўсё з дапамогай хуткіх напамінаў, спісаў задач, заняткаў па канцэнтрацыі ўвагі ды перапынкаў на размінку.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Адзінае месца для факусіроўкі, прагнозаў і іншага
newtab-widget-message-focus-forecasts-body = Забяспечце сабе плынь дня з дапамогай віджэтаў { -brand-product-name }. Праверце прагноз надвор'я, засяродзьцеся на задачах або сачыце за часам у розных месцах зямной кулі.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Зрабіце { -brand-product-name } сваім
newtab-promo-card-body-addons = Выберыце шпалеры з нашай калекцыі або стварыце свае ўласныя.
newtab-promo-card-cta-addons = Паспрабаваць зараз
newtab-promo-card-title = Падтрымаць { -brand-product-name }
newtab-promo-card-body = Нашы спонсары падтрымліваюць нашу місію па стварэнні лепшага Інтэрнэту
newtab-promo-card-cta = Падрабязней
newtab-promo-card-dismiss-button =
    .title = Адхіліць
    .aria-label = Адхіліць

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] Пачаць таймер на { $minutes } хвіліну
            [few] Пачаць таймер на { $minutes } хвіліны
           *[many] Пачаць таймер на { $minutes } хвілін
        }
newtab-widget-timer-pause-aria =
    .aria-label = Прыпыніць таймер
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } хвіліна
            [few] { $minutes } хвіліны
           *[many] { $minutes } хвілін
        }
newtab-widget-timer-decrease-min =
    .title = Паменшыць на 1 хвіліну
newtab-widget-timer-increase-min =
    .title = Павялічыць на 1 хвіліну
newtab-widget-timer-mode-group =
    .aria-label = Рэжым таймера
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Фокус
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Перапынак
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Схаваць таймер
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Выдатная праца
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Ваш перапынак скончаны
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Патрэбен перапынак?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Гатовыя засяродзіцца?

##

newtab-sports-widget-menu-follow-teams = Падпісацца на каманды
newtab-sports-widget-menu-view-schedule = Паглядзець расклад
newtab-sports-widget-menu-view-upcoming = Праглядзець будучыя
newtab-sports-widget-menu-view-results = Паглядзець вынікі
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Ключавыя даты
newtab-sports-widget-menu-learn-more = Падрабязней
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Сачыце за чэмпіянатам свету
newtab-sports-widget-get-updates = Атрымлівайце абнаўленні па матчах у рэжыме рэальнага часу і многае іншае.
newtab-sports-widget-view-schedule =
    .label = Паглядзець расклад
newtab-sports-widget-follow-teams =
    .label = Падпісацца на каманды
newtab-sports-widget-view-matches =
    .label = Глядзець матчы
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Сачыць за да { $number } каманды
        [few] Сачыць за да { $number } каманд
       *[many] Сачыць за да { $number } каманд
    }
newtab-sports-widget-choose-wallpaper =
    .label = Выберыце шпалеры
newtab-sports-widget-skip = Прапусціць
newtab-sports-widget-search-country =
    .placeholder = Пошук краіны
    .aria-label = Пошук краіны
newtab-sports-widget-cancel = Скасаваць
newtab-sports-widget-back-button =
    .aria-label = Назад
newtab-sports-widget-done-button =
    .label = Гатова
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (выбылі)
newtab-sports-widget-view-all =
    .label = Паглядзець усе
newtab-sports-widget-show-less =
    .label = Паказаць менш
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Толькі каманды, за якімі вы сочыце
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Глядзець
    .title = Глядзець у прамым эфіры
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Глядзець у прамым эфіры
    .title = Глядзець у прамым эфіры
newtab-sports-widget-watch-dialog-close =
    .aria-label = Закрыць
    .title = Закрыць
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Бясплатна
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Бясплатны пробны перыяд
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Бясплатна і платна
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Платна
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Толькі выбраныя гульні
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Даступна ў вашым рэгіёне
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Іншыя рэгіёны
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Адкрыць трансляцыю
    .title = Адкрыць трансляцыю
newtab-sports-widget-group-stage = Групавы этап
newtab-sports-widget-group-a = Група A
newtab-sports-widget-group-b = Група B
newtab-sports-widget-group-c = Група C
newtab-sports-widget-group-d = Група D
newtab-sports-widget-group-e = Група E
newtab-sports-widget-group-f = Група F
newtab-sports-widget-group-g = Група G
newtab-sports-widget-group-h = Група H
newtab-sports-widget-group-i = Група I
newtab-sports-widget-group-j = Група J
newtab-sports-widget-group-k = Група K
newtab-sports-widget-group-l = Група L
newtab-sports-widget-round-32 = 1/16 фіналу
newtab-sports-widget-round-16 = 1/8 фіналу
newtab-sports-widget-quarter-finals = Чвэрцьфіналы
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = У ЖЫВЫМ ЭФІРЫ
newtab-custom-widget-live-refresh =
    .title = Абнавіць вынікі
    .aria-label = Абнавіць вынікі
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Ключавыя даты
newtab-sports-widget-upcoming = Наступныя
# Used for a match currently ongoing
newtab-sports-widget-now = Зараз
newtab-sports-widget-results = Вынікі
newtab-sports-widget-semi-finals = Паўфіналы
newtab-sports-widget-bronze-finals = Гульня за трэцяе месца
# Final is the final match for 1st place.
newtab-sports-widget-final = Фінал
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Затрымліваецца
newtab-sports-widget-postponed = Адкладзена
newtab-sports-widget-suspended = Прыпынена
newtab-sports-widget-cancelled = Адменена
newtab-sports-widget-information = Інфармацыя пра матч
newtab-sports-widget-no-live-data = Звесткі матчаў у прамым эфіры зараз не абнаўляюцца
newtab-sports-widget-view-results-link = Паглядзець вынікі
newtab-sports-widget-third-place = Трэцяе месца
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Другое месца
newtab-sports-widget-champions = Чэмпіёны
newtab-sports-widget-world-cup-champions = Чэмпіёны свету 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Поўны час
newtab-sports-widget-match-halftime = Перапынак
newtab-sports-widget-match-extra-time = Дадатковы час
newtab-sports-widget-match-penalties = Пенальці
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = супраць
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Сачыце за падрабязнасцямі будучага матчу

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Папярэдняя
    .title = Папярэдняя
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Наступная
    .title = Наступная
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Прамы эфір матчу { $index } з { $total }
    .title = Прамы эфір матчу { $index } з { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } супраць { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) супраць { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Прамы эфір: { $homeTeam }, { $homeScore } супраць { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } супраць { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } супраць { $awayTeam }, адкладзена
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } супраць { $awayTeam }, перанесена
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } супраць { $awayTeam }, прыпынена
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } супраць { $awayTeam }, адменена

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Боснія і Герцагавіна
newtab-sports-widget-team-name-label-civ =
    .label = Кот-д'Івуар
newtab-sports-widget-team-name-label-cod =
    .label = ДР Конга
newtab-sports-widget-team-name-label-eng =
    .label = Англія
newtab-sports-widget-team-name-label-sco =
    .label = Шатландыя
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Падлягае вызначэнню

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Пачніце чэмпіянат свету з новымі шпалерамі
newtab-sports-widget-message-wallpapers-body = Захапіцеся энергіяй матчавага дня ў сваім браўзеры ў час турніру.
newtab-sports-widget-message-wallpapers-cta = Абраць шпалеры
newtab-sports-widget-message-add-widgets-cta =
    .label = Дадаць віджэты
newtab-sports-widget-message-day-in-play-title = Не выходзьце з гульні з дапамогай віджэтаў { -brand-product-name }
newtab-sports-widget-message-day-in-play-body = Сачыце за чэмпіянатам свету, засяроджвайцеся на задачах, асочвайце час па ўсім свеце і многае іншае.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Азнаёмцеся з віджэтамі

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Адхіліць
    .aria-label = Адхіліць
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Зрабіце гэтую прастору сваёй
newtab-activation-window-message-customization-focus-message = Выберыце новыя шпалеры, дадайце цэтлікі да вашых любімых сайтаў і будзьце ў курсе гісторый, якія вас цікавяць.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Пачаць уладкаванне
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Гэта прастора гуляе па вашых правілах
newtab-activation-window-message-values-focus-message = { -brand-product-name } дазваляе аглядаць так, як вам падабаецца, з больш персаналізаваным спосабам пачаць свой дзень у інтэрнэце. Зрабіце { -brand-product-name } сваім уласным.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Схаваць гадзіннік
newtab-clock-widget-menu-learn-more = Даведацца больш
newtab-clock-widget-menu-edit = Змяніць гадзіннікі
newtab-clock-widget-menu-switch-to-12h = Перайсці на 12-гадзінны фармат
newtab-clock-widget-menu-switch-to-24h = Перайсці на 24-гадзінны фармат
newtab-clock-widget-label-your-clocks = Вашы гадзіннікі
newtab-clock-widget-search-location-input =
    .label = Месцазнаходжанне
    .placeholder = Пошук горада
    .aria-label = Пошук горада
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Мянушка (неабавязкова)
    .placeholder = Дадаць мянушку
    .aria-label = Мянушка (неабавязкова)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Дадаць новы гадзіннік
    .aria-label = Дадаць новы гадзіннік
newtab-clock-widget-button-add-clock = Дадаць
newtab-clock-widget-button-cancel = Скасаваць
newtab-clock-widget-button-back =
    .title = Назад
    .aria-label = Назад
newtab-clock-widget-button-edit-clock =
    .title = Змяніць гадзіннік
    .aria-label = Змяніць гадзіннік
newtab-clock-widget-button-save = Захаваць
newtab-clock-widget-button-remove-clock =
    .title = Выдаліць гадзіннік
    .aria-label = Выдаліць гадзіннік
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
    .aria-label = { $city }, назва: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Дадаць гадзіннік
newtab-clock-widget-edit-clock-form =
    .aria-label = Змяніць гадзіннік
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Вынікі пошуку
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Няма супадзенняў
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Адкрыць меню для гадзінніка
    .aria-label = Адкрыць меню для гадзінніка
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Мянушка: { $nickname }
