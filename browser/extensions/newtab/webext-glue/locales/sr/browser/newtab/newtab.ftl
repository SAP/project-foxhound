# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Нови језичак
newtab-settings-button =
    .title = Прилагодите страницу новог језичка
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Прилагоди ову страницу
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Прилагоди
newtab-customize-panel-label =
    .label = Прилагоди
newtab-personalize-settings-icon-label =
    .title = Промените изглед новог језичка
    .aria-label = Подешавања
newtab-settings-dialog-label =
    .aria-label = Подешавања
newtab-personalize-icon-label =
    .title = Промените изглед новог језичка
    .aria-label = Промените изглед новог језичка
newtab-personalize-dialog-label =
    .aria-label = Персонализација
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Одбаци
    .aria-label = Одбаци

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Почетна страница
home-homepage-new-windows =
    .label = Нови прозори
home-homepage-new-tabs =
    .label = Нови језичци:
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Изаберите одређени сајт

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Адреса(е) веб сајта
home-custom-homepage-address =
    .placeholder = Унесите адресу
home-custom-homepage-address-button =
    .label = Додај адресу
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Још увек нема додатих веб сајтова.
home-custom-homepage-delete-address-button =
    .aria-label = Обриши адресу
    .title = Обриши адресу
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Замени са
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Тренутно отворене странице
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Обележивачи…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Претрага
home-prefs-stories-header2 =
    .label = Приче
    .description = Изузетан садржај који припрема { -brand-product-name } породица
home-prefs-widgets-header =
    .label = Елементи
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Спискови
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Одбројавач
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Спорт
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Часовник
home-prefs-mission-message2 =
    .message = Наши спонзори подржавају нашу мисију изградње бољег веба.
home-prefs-manage-topics-link2 =
    .label = Управљај темама
home-prefs-choose-wallpaper-link2 =
    .label = Изаберите позадину
home-prefs-firefox-logo-header =
    .label = Логотип { -brand-short-name }-а
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Да бисте употребили ове могућности, подесите нове језичке картице или нове прозоре на { -firefox-home-brand-name }.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } ред
            [few] { $num } реда
           *[other] { $num } редова
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Додатак ({ $extension })
home-restore-defaults-srd =
    .label = Врати на подразумевано
    .accesskey = В
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (Подразумевано)
home-mode-choice-custom-srd =
    .label = прилагођена адреса…
home-mode-choice-blank-srd =
    .label = празна страница
home-prefs-shortcuts-header-srd =
    .label = Пречице
home-prefs-shortcuts-select =
    .aria-label = Пречице
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Спонзорисане пречице
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Спонзорисане приче
home-prefs-highlights-option-visited-pages-srd =
    .label = Посећене странице
home-prefs-highlights-options-bookmarks-srd =
    .label = Обележивачи
home-prefs-highlights-option-most-recent-download-srd =
    .label = Најновије преузимање
home-prefs-recent-activity-header-srd =
    .label = Недавна активност
home-prefs-recent-activity-select =
    .aria-label = Недавна активност
home-prefs-weather-header-srd =
    .label = Време
home-prefs-support-firefox-header-srd =
    .label = Подржите { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = Сазнајте како

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Претражи
    .aria-label = Претражи
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Претражите у претраживачу { $engine } или унесите адресу
newtab-search-box-handoff-text-no-engine = Претражите или унесите адресу
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Претражите у претраживачу { $engine } или унесите адресу
    .title = Претражите у претраживачу { $engine } или унесите адресу
    .aria-label = Претражите у претраживачу { $engine } или унесите адресу
newtab-search-box-handoff-input-no-engine =
    .placeholder = Претражите или унесите адресу
    .title = Претражите или унесите адресу
    .aria-label = Претражите или унесите адресу
newtab-search-box-text = Претражи интернет
newtab-search-box-input =
    .placeholder = Претражите интернет
    .aria-label = Претражите интернет

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Додај претраживач
newtab-topsites-add-shortcut-header = Нова пречица
newtab-topsites-edit-topsites-header = Уреди популарне странице
newtab-topsites-edit-shortcut-header = Измени пречицу
newtab-topsites-add-shortcut-label = Додај пречицу
newtab-topsites-add-shortcut-title =
    .title = Додај пречицу
    .aria-label = Додај пречицу
newtab-topsites-title-label = Наслов
newtab-topsites-title-input =
    .placeholder = Унесите наслов
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Унесите или налепите URL
newtab-topsites-url-validation = Исправан URL се захтева
newtab-topsites-image-url-label = URL прилагођене слике
newtab-topsites-use-image-link = Користи прилагођену слику…
newtab-topsites-image-validation = Нисам успео да учитам слику. Пробајте са другим URL-ом.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Очисти текст

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Откажи
newtab-topsites-delete-history-button = Избриши из историје
newtab-topsites-save-button = Сачувај
newtab-topsites-preview-button = Прегледај
newtab-topsites-add-button = Додај

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Желите ли заиста да избришете све записе о овој страници из историје?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Ова радња се не може опозвати.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Спонзорисано

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (закачено)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Отвори мени
    .aria-label = Отвори мени
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Уклони
    .aria-label = Уклони
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Отвори мени
    .aria-label = Отвори контекстуални мени за { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Уреди ову страницу
    .aria-label = Уреди ову страницу

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Уреди
newtab-menu-open-new-window = Отвори у новом прозору
newtab-menu-open-new-private-window = Отвори у новом приватном прозору
newtab-menu-dismiss = Одбаци
newtab-menu-pin = Закачи
newtab-menu-unpin = Откачи
newtab-menu-delete-history = Избриши из историје
newtab-menu-save-to-pocket = Сачувај у { -pocket-brand-name(case: "loc") }
newtab-menu-delete-pocket = Избриши из { -pocket-brand-name(case: "gen") }
newtab-menu-archive-pocket = Архивирај у { -pocket-brand-name(case: "loc") }
newtab-menu-show-privacy-info = Наши спонзори и ваша приватност
newtab-menu-about-fakespot = О { -fakespot-brand-name }-у
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Пријави
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Блокирај
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Прекини праћење
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Сазнајте више
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Престани да пратиш тему

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Управљај спонзорисаним садржајем
newtab-menu-our-sponsors-and-your-privacy = Наши спонзори и ваша приватност
newtab-menu-report-this-ad = Пријави овај оглас

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Готово
newtab-privacy-modal-button-manage = Управљај спонзорисаним садржајем
newtab-privacy-modal-header = Ваша приватност је битна.
newtab-privacy-modal-paragraph-2 =
    Поред дељења занимљивих прича, такође вам приказујемо релевантне,
    пажљиво проверен садржаје одабраних спонзора. Будите сигурни, <strong>ваши подаци претраживања
    никада не остављају вашу личну { -brand-product-name } копију</strong> - ми их не видимо,
    као ни наши спонзори.
newtab-privacy-modal-link = Сазнајте више о приватности у новом језичку

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Уклони обележивач
# Bookmark is a verb here.
newtab-menu-bookmark = Забележи

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Копирај адресу преузимања
newtab-menu-go-to-download-page = Иди на страницу преузимања
newtab-menu-remove-download = Уклони из историје

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file = Прикажи у фасцикли
newtab-menu-open-file = Отвори датотеку

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Посећено
newtab-label-bookmarked = Забележено
newtab-label-removed-bookmark = Обележивач је уклоњен
newtab-label-recommended = У тренду
newtab-label-saved = Сачувано у { -pocket-brand-name(case: "loc") }
newtab-label-download = Преузето
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Спонзорисано
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Спонзорише { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } мин
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Спонзорисано

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Уклони одељак
newtab-section-menu-collapse-section = Скупи одељак
newtab-section-menu-expand-section = Прошири одељак
newtab-section-menu-manage-section = Управљај одељком
newtab-section-menu-manage-webext = Управљај додатком
newtab-section-menu-add-topsite = Додај омиљену страницу
newtab-section-menu-add-search-engine = Додај претраживач
newtab-section-menu-move-up = Помери горе
newtab-section-menu-move-down = Помери доле
newtab-section-menu-privacy-notice = Обавештење о приватности

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Скупи одељак
newtab-section-expand-section-label =
    .aria-label = Прошири одељак

## Section Headers.

newtab-section-header-topsites = Популарне странице
newtab-section-header-recent-activity = Недавна активност
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Предложио { $provider }
newtab-section-header-stories = Приче које подстичу на размишљање
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Данашњи предлози за вас

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Почните да претражујете интернет а ми ћемо вам овде приказати одличне чланке, видео-снимке и друге странице које сте недавно посетили или обележили.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Вратите се касније за нове вести { $provider }. Не можете дочекати? Изаберите популарну тему да пронађете још занимљивих вести из света.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Све сте већ прочитали. Вратите се касније за нове приче. Не можете дочекати? Изаберите популарну тему да пронађете још занимљивих прича са мреже.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = У току сте!
newtab-discovery-empty-section-topstories-content = За више прича, вратите се нешто касније.
newtab-discovery-empty-section-topstories-try-again-button = Покушај поново
newtab-discovery-empty-section-topstories-loading = Учитавам…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Упс! Нисмо могли учитати овај одељак до краја.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Популарне теме:
newtab-pocket-new-topics-title = Тражите још прича? Погледајте ове популарне теме са { -pocket-brand-name }-а
newtab-pocket-more-recommendations = Још препорука
newtab-pocket-learn-more = Сазнајте више
newtab-pocket-cta-button = Преузми { -pocket-brand-name(case: "acc") }
newtab-pocket-cta-text = Сачувајте приче које вам се свиђају у { -pocket-brand-name(case: "loc") } и уживајте у врхунском штиву.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } је члан { -brand-product-name } породице
newtab-pocket-save = Сачувај
newtab-pocket-saved = Сачувано

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Више овога
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Није за мене
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Хвала. Ваше повратне информације помоћи ће нам да побољшамо предлоге.
newtab-toast-dismiss-button =
    .title = Одбаци
    .aria-label = Одбаци

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Откријте најбоље од интернета
newtab-pocket-onboarding-cta = { -pocket-brand-name } истражује широк распон публикација да ваш { -brand-product-name } прегледач обогати информативним, инспиришућим и поузданим садржајем.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Дошло је до грешке при учитавању овог садржаја.
newtab-error-fallback-refresh-link = Освежите страницу да бисте покушали поново.

## Customization Menu

newtab-custom-shortcuts-title = Пречице
newtab-custom-shortcuts-subtitle = Сачуване или посећене странице
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Пречице
    .description = Сачуване или посећене странице
newtab-custom-shortcuts-nova =
    .label = Пречице
newtab-custom-row-description =
    .description = Број редова
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } ред
            [few] { $num } реда
           *[other] { $num } редова
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } ред
        [few] { $num } реда
       *[other] { $num } редова
    }
newtab-custom-sponsored-sites = Спонзорисане пречице
newtab-custom-pocket-title = Препоруке из { -pocket-brand-name(case: "gen") }
newtab-custom-pocket-subtitle = Изузетан садржај који уређује { -pocket-brand-name }, део породице { -brand-product-name }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Препоручене приче
    .description = Изузетан садржај који је бирала { -brand-product-name } породица
newtab-recommended-stories-toggle =
    .label = Препоручене приче
newtab-custom-stories-personalized-toggle =
    .label = Приче
newtab-custom-stories-personalized-checkbox-label = Персонализоване приче засноване на вашој активности
newtab-custom-pocket-sponsored = Спонзорисане приче
newtab-custom-pocket-show-recent-saves = Прикажи недавно сачувано
newtab-custom-recent-title = Недавна активност
newtab-custom-recent-subtitle = Избор недавних страница и садржаја
newtab-custom-weather-toggle =
    .label = Време
    .description = Временска прогноза за данас
newtab-custom-widget-weather-toggle =
    .label = Време
newtab-custom-widget-lists-toggle =
    .label = Спискови
newtab-custom-widget-timer-toggle =
    .label = Одбројавач
newtab-custom-widget-sports-toggle =
    .label = Светско првенство
newtab-custom-widget-clock-toggle =
    .label = Часовник
newtab-custom-widget-sports-toggle2 =
    .label = Спорт
newtab-custom-widget-section-title = Елементи
newtab-custom-widget-section-toggle =
    .label = Елементи
newtab-widget-manage-title = Елементи
newtab-widget-manage-widget-button =
    .label = Управљај елементима
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Затвори
    .aria-label = Затвори мени
newtab-custom-close-button = Затвори
newtab-custom-settings = Додатна подешавања

## New Tab Wallpapers

newtab-wallpaper-title = Позадине
newtab-wallpaper-reset = Врати на подразумевано
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Отпреми слику
newtab-wallpaper-add-an-image = Додај слику
newtab-wallpaper-custom-color = Изабери боју
newtab-wallpaper-toggle-title =
    .label = Позадине
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Слика је премашила ограничење величине датотеке од { $file_size } MB. Покушајте да отпремите мању датотеку.
newtab-wallpaper-error-upload-file-type = Не можемо да отпремимо вашу датотеку. Покушајте поново са сликом.
newtab-wallpaper-error-file-type = Не можемо да отпремимо вашу датотеку. Покушајте поново са другом врстом датотеке.
newtab-wallpaper-light-red-panda = Црвена панда
newtab-wallpaper-light-mountain = Бела гора
newtab-wallpaper-light-sky = Небо са љубичастим и розим облацима
newtab-wallpaper-light-color = Плави, рози и жути облици
newtab-wallpaper-light-landscape = Планински пејзаж у плавој измаглици
newtab-wallpaper-light-beach = Плажа са палмом
newtab-wallpaper-dark-aurora = Поларна светлост
newtab-wallpaper-dark-color = Црвени и плави облици
newtab-wallpaper-dark-panda = Црвена панда сакривена у шуми
newtab-wallpaper-dark-sky = Градски призор са ноћним небом
newtab-wallpaper-dark-mountain = Планински пејзаж
newtab-wallpaper-dark-city = Љубичасти градски призор
newtab-wallpaper-dark-fox-anniversary = Лисица на тротоару покрај шуме
newtab-wallpaper-light-fox-anniversary = Лисица на ливади са планинским пејзажом у измаглици

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Једнобојне
newtab-wallpaper-colors = Боје
newtab-wallpaper-blue = Плава
newtab-wallpaper-light-blue = Светло плава
newtab-wallpaper-light-purple = Светло љубичаста
newtab-wallpaper-light-green = Светло зелена
newtab-wallpaper-green = Зелена
newtab-wallpaper-beige = Беж
newtab-wallpaper-yellow = Жута
newtab-wallpaper-orange = Наранџаста
newtab-wallpaper-pink = Розе
newtab-wallpaper-light-pink = Светло розе
newtab-wallpaper-red = Црвена
newtab-wallpaper-dark-blue = Тамно плава
newtab-wallpaper-dark-purple = Тамно љубичаста
newtab-wallpaper-dark-green = Тамно зелена
newtab-wallpaper-brown = Смеђа

## Abstract

newtab-wallpaper-category-title-abstract = Апстрактне
newtab-wallpaper-abstract-green = Зелени облици
newtab-wallpaper-abstract-blue = Плави облици
newtab-wallpaper-abstract-purple = Љубичасти облици
newtab-wallpaper-abstract-orange = Наранџасти облици
newtab-wallpaper-gradient-orange = Градијент наранџасте и розе
newtab-wallpaper-abstract-blue-purple = Плави и љубичасти облици
newtab-wallpaper-abstract-white-curves = Бело са засенченим кривама
newtab-wallpaper-abstract-purple-green = Љубичасто-зелени прелив светла
newtab-wallpaper-abstract-blue-purple-waves = Плави и љубичасти таласасти облици
newtab-wallpaper-abstract-black-waves = Црни таласасти облици

## Firefox

newtab-wallpaper-category-title-photographs = Фотографије
newtab-wallpaper-beach-at-sunrise = Плажа у изласку сунца
newtab-wallpaper-beach-at-sunset = Плажа у заласку сунца
newtab-wallpaper-storm-sky = Олујно небо
newtab-wallpaper-sky-with-pink-clouds = Небо са розе облацима
newtab-wallpaper-red-panda-yawns-in-a-tree = Црвена панда зева на дрвету
newtab-wallpaper-white-mountains = Беле планине
newtab-wallpaper-hot-air-balloons = Разнобојни балони током дана
newtab-wallpaper-starry-canyon = Плава звездана ноћ
newtab-wallpaper-suspension-bridge = Сиви висећи мост током дана
newtab-wallpaper-sand-dunes = Беле пешчане дине
newtab-wallpaper-palm-trees = Силуета палми током златног сата
newtab-wallpaper-blue-flowers = Крупни план плавог цвећа у цвату
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Аутор фотографије <a data-l10n-name="name-link">{ $author_string }</a> на <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Пробајте нове боје
newtab-wallpaper-feature-highlight-content = Дајте вашем новом језичку свеж изглед помоћу позадина.
newtab-wallpaper-feature-highlight-button = Важи
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Одбаци
    .aria-label = Затвори искачући прозор
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Небеска тела
newtab-wallpaper-celestial-lunar-eclipse = Помрачење Месеца
newtab-wallpaper-celestial-earth-night = Ноћна фотографија из ниске Земљине орбите
newtab-wallpaper-celestial-starry-sky = Звездано небо
newtab-wallpaper-celestial-eclipse-time-lapse = Убрзани снимак помрачења Месеца
newtab-wallpaper-celestial-black-hole = Илустрација галаксије са црном рупом
newtab-wallpaper-celestial-river = Сателитски снимак реке

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Погледајте прогнозу у { $provider }-у
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } - Спонзорисано
newtab-weather-menu-change-location = Промени место
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Потражи место
    .aria-label = Потражи место
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Употреби тренутну локацију
newtab-weather-menu-weather-display = Приказ времена
newtab-weather-todays-forecast = Данашња прогноза
newtab-weather-see-full-forecast = Погледајте целу прогнозу
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Једноставно
newtab-weather-menu-change-weather-display-simple = Пређи на једноставни приказ
newtab-weather-menu-weather-display-option-detailed = Детаљно
newtab-weather-menu-change-weather-display-detailed = Пређи на детаљан приказ
newtab-weather-menu-temperature-units = Јединице за температуру
newtab-weather-menu-temperature-option-fahrenheit = Фаренхајт
newtab-weather-menu-temperature-option-celsius = Целзијус
newtab-weather-menu-change-temperature-units-fahrenheit = Пребаци на Фаренхајт
newtab-weather-menu-change-temperature-units-celsius = Пребаци на Целзијус
newtab-weather-menu-hide-weather = Сакриј временску прогнозу на новом језичку
newtab-weather-menu-learn-more = Сазнајте више
newtab-weather-menu-detect-my-location = Одреди моју локацију
# This message is shown if user is working offline
newtab-weather-error-not-available = Временска прогноза тренутно није доступна.
newtab-weather-opt-in-see-weather = Желите ли да видите временску прогнозу за вашу локацију?
newtab-weather-opt-in-not-now =
    .label = Не сада
newtab-weather-opt-in-yes =
    .label = Да
newtab-weather-opt-in-headline = Добијте локалну временску прогнозу
newtab-weather-opt-in-use-location =
    .label = Користи локацију
newtab-weather-opt-in-choose-location = Изаберите место
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Њујорк
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Висока
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Ниска
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Погледајте прогнозу у { $provider }-у
    .aria-description = { $provider } - Спонзорисано

## Topic Labels

newtab-topic-label-business = Посао
newtab-topic-label-career = Каријера
newtab-topic-label-education = Образовање
newtab-topic-label-arts = Забава
newtab-topic-label-food = Храна
newtab-topic-label-health = Здравље
newtab-topic-label-hobbies = Игре
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Новац
newtab-topic-label-society-parenting = Родитељство
newtab-topic-label-government = Политика
newtab-topic-label-education-science = Наука
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Животни савети
newtab-topic-label-sports = Спорт
newtab-topic-label-tech = Технологија
newtab-topic-label-travel = Путовањa
newtab-topic-label-home = Кућа и башта

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Одабери теме за боље предлоге
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Одаберите две или више тема. Наши стручни сарадници дају првенство причама које су по вашем укусу. Ажурирајте било када.
newtab-topic-selection-save-button = Сачувај
newtab-topic-selection-cancel-button = Откажи
newtab-topic-selection-button-maybe-later = Можда касније
newtab-topic-selection-privacy-link = Сазнајте како штитимо и управљамо подацима
newtab-topic-selection-button-update-interests = Ажурирајте ваша интересовања
newtab-topic-selection-button-pick-interests = Одаберите ваша интересовања

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Прати
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Прати { $topic }
newtab-section-following-button = Пратите
newtab-section-unfollow-button = Прекини праћење
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Пратите: прекини праћење { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Фино подесите свој довод
newtab-section-follow-highlight-subtitle = Пратите своја интересовања да бисте видели више онога што волите.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Блокирај
newtab-section-blocked-button = Блокирано
newtab-section-unblock-button = Одблокирај
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Прати { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Прекини праћење { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Блокирај { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Одблокирај { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = Не сада
newtab-section-confirm-block-topic-p1 = Јесте ли сигурни да желите да блокирате ову тему?
newtab-section-confirm-block-topic-p2 = Блокиране теме се више неће појављивати у вашем доводу.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Блокирај { $topic }
newtab-section-block-cancel-button = Откажи

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Теме
newtab-section-manage-topics-button-v2 =
    .label = Управљај темама
newtab-section-mangage-topics-followed-topics = Праћено
newtab-section-mangage-topics-followed-topics-empty-state = Још увек не пратите ниједну тему.
newtab-section-mangage-topics-blocked-topics = Блокирано
newtab-section-mangage-topics-blocked-topics-empty-state = Још увек нисте блокирали ниједну тему.
newtab-custom-wallpaper-title = Пристигле су прилагођене позадине
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Отпремите сопствену позадину или изаберите прилагођену боју да бисте учинили { -brand-product-name } својим.
newtab-custom-wallpaper-cta = Испробајте

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Изаберите позадину да бисте { -brand-product-name } учинили својим
newtab-new-user-custom-wallpaper-subtitle = Учините да се сваки нови језичак осећа као код куће уз прилагођене позадине и боје.
newtab-new-user-custom-wallpaper-cta = Испробајте одмах

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Свеже нове позадине су управо стигле
newtab-wallpaper-feature-highlight-subtitle = Изаберите своју омиљену и учините да се сваки нови језичак осећа као код куће.
newtab-wallpaper-feature-highlight-cta = Изаберите позадину

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Преузмите { -brand-product-name } за мобилне уређаје
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Скенирајте код за безбедно прегледање у покрету.
newtab-download-mobile-highlight-body-variant-b = Наставите тамо где сте стали када усагласите своје језичке, лозинке и још много тога.
newtab-download-mobile-highlight-body-variant-c = Да ли сте знали да можете понети { -brand-product-name } са собом? Исти прегледач. У вашем џепу.
newtab-download-mobile-highlight-image =
    .aria-label = КР код за преузимање { -brand-product-name } прегледача за мобилне уређаје

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Ваше омиљене ставке на дохват руке
newtab-shortcuts-highlight-subtitle = Додајте пречицу да би ваше омиљене веб странице биле на само један клик.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Зашто ово пријављујете?
newtab-report-ads-reason-not-interested =
    .label = Нисам заинтересован
newtab-report-ads-reason-inappropriate =
    .label = Неприкладно је
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Видео сам ово превише пута
newtab-report-content-wrong-category =
    .label = Погрешна категорија
newtab-report-content-outdated =
    .label = Застарело
newtab-report-content-inappropriate-offensive =
    .label = Неприкладно или увредљиво
newtab-report-content-spam-misleading =
    .label = Непожељно или обмањујуће
newtab-report-content-requires-payment-subscription =
    .label = Захтева плаћање или претплату
newtab-report-content-requires-payment-subscription-learn-more = Сазнајте више
newtab-report-cancel = Откажи
newtab-report-submit = Пошаљи
newtab-toast-thanks-for-reporting =
    .message = Хвала вам што сте ово пријавили.
newtab-toast-widgets-hidden =
    .message = Изаберите иконицу оловке да бисте поново додали елементе било када.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Сада пратите { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Више не пратите { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Више нећете видети приче о теми { $topic }.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Могућности су бескрајне. Додајте једну.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Ново
newtab-widget-lists-label-beta =
    .label = Бета
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list =
    { $number ->
        [one] Завршен ({ $number })
        [few] Завршено ({ $number })
       *[other] Завршених ({ $number })
    }
newtab-widget-lists-celebration-headline = Добар посао
newtab-widget-lists-celebration-subhead = Све је завршено
newtab-widget-task-list-menu-copy = Умножи
newtab-widget-lists-menu-edit = Уреди назив списка
newtab-widget-lists-menu-edit2 =
    .aria-label = Уреди назив списка
newtab-widget-lists-menu-create = Направи нови списак
newtab-widget-lists-menu-delete = Обриши овај списак
newtab-widget-lists-menu-copy = Умножи списак у оставу
newtab-widget-lists-menu-learn-more = Сазнајте више
newtab-widget-lists-button-add-item = Додај ставку
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Додај ставку
    .aria-label = Додај ставку
newtab-widget-lists-input-error = Укључите текст да бисте додали ставку.
newtab-widget-lists-input-menu-open-link = Отвори везу
newtab-widget-lists-input-menu-move-up = Премести горе
newtab-widget-lists-input-menu-move-down = Премести доле
newtab-widget-lists-input-menu-delete = Обриши
newtab-widget-lists-input-menu-edit = Уреди
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Уреди ставку
newtab-widget-lists-edit-clear =
    .aria-label = Откажи
    .title = Откажи
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Направи нови списак
newtab-widget-lists-name-label-default =
    .label = Списак задатака
newtab-widget-lists-name-label-checklist =
    .label = Списак задатака
newtab-widget-lists-name-placeholder-default =
    .placeholder = Списак задатака
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Списак задатака
    .aria-label = Уреди назив списка
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Нови списак
    .aria-label = Уреди назив списка
newtab-widget-section-title = Елементи
newtab-widget-menu-hide = Сакриј елемент
newtab-widget-menu-change-size = Промени величину
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Помери
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Лево
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Десно
newtab-widget-size-small = Мала
newtab-widget-size-medium = Средња
newtab-widget-size-large = Велика
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Сакриј елементе
    .aria-label = Сакриј све елементе
newtab-widget-section-maximize =
    .title = Прошири елементе
    .aria-label = Прошири све елементе на пуну величину
newtab-widget-section-minimize =
    .title = Умањи елементе
    .aria-label = Скупи све елементе на компактну величину
newtab-widget-section-menu-button =
    .title = Мени елемената
    .aria-label = Отвори мени елемената
newtab-widget-add-widgets-button =
    .aria-label = Додај елемент
    .title = Додај елемент
newtab-widget-section-menu-manage = Управљај елементима
newtab-widget-section-menu-hide-all = Сакриј елементе
newtab-widget-section-menu-learn-more = Сазнајте више
newtab-widget-section-feedback = Реците нам шта мислите
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Прикажи више елемената
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Прикажи мање елемената
newtab-widget-lists-name-default = Списак задатака

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Одбројавач
newtab-widget-timer-notification-focus = Време за фокус је истекло. Добар посао. Желите ли одмор?
newtab-widget-timer-notification-break = Ваш одмор је готов. Спремни за фокус?
newtab-widget-timer-notification-warning = Обавештења су искључена
newtab-widget-timer-mode-focus =
    .label = Фокус
newtab-widget-timer-mode-break =
    .label = Одмор
newtab-widget-timer-label-play =
    .label = Пусти
newtab-widget-timer-label-pause =
    .label = Паузирај
newtab-widget-timer-reset =
    .title = Поново постави
newtab-widget-timer-menu-notifications = Искључи обавештења
newtab-widget-timer-menu-notifications-on = Укључи обавештења
newtab-widget-timer-menu-learn-more = Сазнајте више
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Најважније вести
newtab-daily-briefing-card-menu-dismiss = Одбаци
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp =
    { $minutes ->
        [one] Ажурирано пре { $minutes } минут
        [few] Ажурирано пре { $minutes } минута
       *[other] Ажурирано пре { $minutes } минута
    }
newtab-widget-message-title = Останите фокусирани уз спискове и уграђени тајмер
# to-dos stands for "things to do".
newtab-widget-message-copy = Од брзих подсетника до дневних задатака, сесија фокуса до пауза за протезање - останите на задатку и на време.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Једно место за фокус, прогнозе и још много тога
newtab-widget-message-focus-forecasts-body = Нека ваш дан тече глатко уз { -brand-product-name } елементе. Проверите прогнозу, останите фокусирани на задатке или пратите време широм света.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Прилагодите { -brand-product-name } себи
newtab-promo-card-body-addons = Изаберите позадину из наше збирке или направите своју.
newtab-promo-card-cta-addons = Испробај одмах
newtab-promo-card-title = Подржите { -brand-product-name }
newtab-promo-card-body = Наши спонзори подржавају нашу мисију изградње бољег веба
newtab-promo-card-cta = Сазнајте више
newtab-promo-card-dismiss-button =
    .title = Одбаци
    .aria-label = Одбаци

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
           *[other] Покрени одбројавач од { $minutes } минута
        }
newtab-widget-timer-pause-aria =
    .aria-label = Паузирај одбројавач
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } минут
            [few] { $minutes } минута
           *[other] { $minutes } минута
        }
newtab-widget-timer-decrease-min =
    .title = Смањи за 1 минут
newtab-widget-timer-increase-min =
    .title = Повећај за 1 минут
newtab-widget-timer-mode-group =
    .aria-label = Режим одбројавача
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Фокус
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Одмор
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Сакриј одбројавач
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Сјајан посао
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Ваш одмор је завршен
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Треба ли вам одмор?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Спремни за фокус?

##

newtab-sports-widget-menu-follow-teams = Прати екипе
newtab-sports-widget-menu-view-schedule = Прикажи распоред
newtab-sports-widget-menu-view-upcoming = Прикажи предстојеће
newtab-sports-widget-menu-view-results = Прикажи резултате
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Кључни датуми
newtab-sports-widget-menu-learn-more = Сазнајте више
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Пратите Светско првенство
newtab-sports-widget-get-updates = Пратите вести утакмица уживо и још много тога.
newtab-sports-widget-view-schedule =
    .label = Прикажи распоред
newtab-sports-widget-follow-teams =
    .label = Прати екипе
newtab-sports-widget-view-matches =
    .label = Прикажи подударања
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Пратите до { $number } тима
        [few] Пратите до { $number } тима
       *[other] Пратите до { $number } тимова
    }
newtab-sports-widget-choose-wallpaper =
    .label = Изаберите позадину
newtab-sports-widget-skip = Прескочи
newtab-sports-widget-search-country =
    .placeholder = Претражи државу
    .aria-label = Претражи државу
newtab-sports-widget-cancel = Откажи
newtab-sports-widget-back-button =
    .aria-label = Назад
newtab-sports-widget-done-button =
    .label = Готово
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (испала)
newtab-sports-widget-view-all =
    .label = Прикажи све
newtab-sports-widget-show-less =
    .label = Прикажи мање
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Само праћени тимови
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Гледај
    .title = Гледајте уживо
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Гледајте уживо
    .title = Гледајте уживо
newtab-sports-widget-watch-dialog-close =
    .aria-label = Затвори
    .title = Затвори
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Бесплатно
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Бесплатна проба
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Бесплатно и плаћено
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Плаћено
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Само одређене утакмице
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Доступно у вашој области
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Остале области
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Отвори ток
    .title = Отвори ток
newtab-sports-widget-group-stage = Групна фаза
newtab-sports-widget-group-a = Група А
newtab-sports-widget-group-b = Група Б
newtab-sports-widget-group-c = Група Ц
newtab-sports-widget-group-d = Група Д
newtab-sports-widget-group-e = Група Е
newtab-sports-widget-group-f = Група Ф
newtab-sports-widget-group-g = Група Г
newtab-sports-widget-group-h = Група Х
newtab-sports-widget-group-i = Група И
newtab-sports-widget-group-j = Група Ј
newtab-sports-widget-group-k = Група К
newtab-sports-widget-group-l = Група Л
newtab-sports-widget-round-32 = Шеснаестина финала
newtab-sports-widget-round-16 = Осмина финала
newtab-sports-widget-quarter-finals = Четвртфинале
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = УЖИВО
newtab-custom-widget-live-refresh =
    .title = Освежи резултате
    .aria-label = Освежи резултате
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Кључни датуми
newtab-sports-widget-upcoming = Предстојећи
# Used for a match currently ongoing
newtab-sports-widget-now = Сада
newtab-sports-widget-results = Резултати
newtab-sports-widget-semi-finals = Полуфинале
newtab-sports-widget-bronze-finals = Меч за треће место
# Final is the final match for 1st place.
newtab-sports-widget-final = Финале
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } - { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Одложено
newtab-sports-widget-postponed = Померено
newtab-sports-widget-suspended = Обустављено
newtab-sports-widget-cancelled = Отказано
newtab-sports-widget-information = Подаци о утакмици
newtab-sports-widget-no-live-data = Подаци о утакмици у живо се тренутно не ажурирају
newtab-sports-widget-view-results-link = Прикажи резултате
newtab-sports-widget-third-place = Треће место
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Други
newtab-sports-widget-champions = Шампиони
newtab-sports-widget-world-cup-champions = Шампиони Светског првенства 2026.
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Крај
newtab-sports-widget-match-halftime = Полувреме
newtab-sports-widget-match-extra-time = Продужетак
newtab-sports-widget-match-penalties = Пенали
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = против
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Пратите нас за појединости о предстојећим утакмицама

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Претходна
    .title = Претходна
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Следећа
    .title = Следећа
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Утакмица уживо { $index } од { $total }
    .title = Утакмица уживо { $index } од { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } против земље { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) против земље { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = УЖИВО: { $homeTeam }, { $homeScore } против земље { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } против земље { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } против земље { $awayTeam }, одложено
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } против земље { $awayTeam }, одложено
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } против земље { $awayTeam }, обустављено
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } против земље { $awayTeam }, отказано

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Босна и Херцеговина
newtab-sports-widget-team-name-label-civ =
    .label = Обала Слоноваче
newtab-sports-widget-team-name-label-cod =
    .label = ДР Конго
newtab-sports-widget-team-name-label-eng =
    .label = Енглеска
newtab-sports-widget-team-name-label-sco =
    .label = Шкотска
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Биће познато касније

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Започните Светско првенство новим позадинама
newtab-sports-widget-message-wallpapers-body = Донесите енергију дана утакмице у свој прегледач за овај турнир.
newtab-sports-widget-message-wallpapers-cta = Изаберите позадину
newtab-sports-widget-message-add-widgets-cta =
    .label = Додај елементе
newtab-sports-widget-message-day-in-play-title = Останите у игри током дана уз елементе за { -brand-product-name }
newtab-sports-widget-message-day-in-play-body = Пратите Светско првенство, останите фокусирани на своје задатке, пратите време широм света и још много тога.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Истражите елементе

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Одбаци
    .aria-label = Одбаци
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Учините овај простор својим
newtab-activation-window-message-customization-focus-message = Изаберите нову позадину, додајте пречице до својих омиљених страница и будите у току са причама које вас занимају.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Започните прилагођавање
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Овај простор се прилагођава вама
newtab-activation-window-message-values-focus-message = { -brand-product-name } вам омогућава да прегледате веб на начин који желите, уз личнији почетак вашег дана на мрежи. Прилагодите { -brand-product-name } себи.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Сакриј часовник
newtab-clock-widget-menu-learn-more = Сазнајте више
newtab-clock-widget-menu-edit = Уреди часовнике
newtab-clock-widget-menu-switch-to-12h = Пребаци на 12-часовни формат
newtab-clock-widget-menu-switch-to-24h = Пребаци на 24-часовни формат
newtab-clock-widget-label-your-clocks = Ваши часовници
newtab-clock-widget-search-location-input =
    .label = Локација
    .placeholder = Потражите град
    .aria-label = Потражите град
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Надимак (необавезно)
    .placeholder = Додајте надимак
    .aria-label = Надимак (необавезно)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Додај нови часовник
    .aria-label = Додај нови часовник
newtab-clock-widget-button-add-clock = Додај
newtab-clock-widget-button-cancel = Откажи
newtab-clock-widget-button-back =
    .title = Назад
    .aria-label = Назад
newtab-clock-widget-button-edit-clock =
    .title = Уреди часовник
    .aria-label = Уреди часовник
newtab-clock-widget-button-save = Сачувај
newtab-clock-widget-button-remove-clock =
    .title = Уклони часовник
    .aria-label = Уклони часовник
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
    .aria-label = { $city }, надимак: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Додај часовник
newtab-clock-widget-edit-clock-form =
    .aria-label = Уреди часовник
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Резултати претраге
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Нема подударања
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Отвори мени за часовник
    .aria-label = Отвори мени за часовник
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Надимак: { $nickname }
