# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Новая вкладка
newtab-settings-button =
    .title = Настроить свою страницу новой вкладки
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Настроить эту страницу
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Персонализация
newtab-customize-panel-label =
    .label = Персонализация
newtab-personalize-settings-icon-label =
    .title = Персонализировать Новую вкладку
    .aria-label = Настройки
newtab-settings-dialog-label =
    .aria-label = Настройки
newtab-personalize-icon-label =
    .title = Настроить новую вкладку
    .aria-label = Настроить новую вкладку
newtab-personalize-dialog-label =
    .aria-label = Настроить
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Убрать
    .aria-label = Убрать

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Домашняя страница
home-homepage-new-windows =
    .label = Новые окна
home-homepage-new-tabs =
    .label = Новые вкладки
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Выбрать определённый сайт

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Адрес(а) веб-сайтов
home-custom-homepage-address =
    .placeholder = Введите адрес
home-custom-homepage-address-button =
    .label = Добавить адрес
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Пока не добавлено ни одного веб-сайта.
home-custom-homepage-delete-address-button =
    .aria-label = Удалить адрес
    .title = Удалить адрес
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Заменить на
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Текущие открытые страницы
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Закладки…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name(case: "nominative_uppercase") }
home-prefs-search-header2 =
    .label = Поиск
home-prefs-stories-header2 =
    .label = Истории
    .description = Исключительный контент, курируемый семейством { -brand-product-name }
home-prefs-widgets-header =
    .label = Виджеты
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Списки
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Таймер
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Спорт
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Часы
home-prefs-mission-message2 =
    .message = Наши спонсоры поддерживают нашу миссию по созданию лучшего Интернета.
home-prefs-manage-topics-link2 =
    .label = Управление темами
home-prefs-choose-wallpaper-link2 =
    .label = Выберите обои
home-prefs-firefox-logo-header =
    .label = Логотип { -brand-short-name }
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Чтобы использовать эти функции, настройте для новых вкладок или новых окон { -firefox-home-brand-name(case: "genitive") }.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } строка
            [few] { $num } строки
           *[many] { $num } строк
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Расширение ({ $extension })
home-restore-defaults-srd =
    .label = Восстановить по умолчанию
    .accesskey = о
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name(case: "nominative_uppercase") } (по умолчанию)
home-mode-choice-custom-srd =
    .label = Мои URL-адреса…
home-mode-choice-blank-srd =
    .label = Пустая страница
home-prefs-shortcuts-header-srd =
    .label = Ярлыки
home-prefs-shortcuts-select =
    .aria-label = Ярлыки
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Спонсируемые ярлыки
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Статьи спонсоров
home-prefs-highlights-option-visited-pages-srd =
    .label = Посещённые страницы
home-prefs-highlights-options-bookmarks-srd =
    .label = Закладки
home-prefs-highlights-option-most-recent-download-srd =
    .label = Недавние загрузки
home-prefs-recent-activity-header-srd =
    .label = Последние действия
home-prefs-recent-activity-select =
    .aria-label = Последние действия
home-prefs-weather-header-srd =
    .label = Погода
home-prefs-support-firefox-header-srd =
    .label = Поддержите { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = Узнать как

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Искать
    .aria-label = Искать
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Найдите в { $engine } или введите адрес
newtab-search-box-handoff-text-no-engine = Введите запрос или адрес
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Найдите в { $engine } или введите адрес
    .title = Найдите в { $engine } или введите адрес
    .aria-label = Найдите в { $engine } или введите адрес
newtab-search-box-handoff-input-no-engine =
    .placeholder = Введите запрос или адрес
    .title = Введите запрос или адрес
    .aria-label = Введите запрос или адрес
newtab-search-box-text = Искать в Интернете
newtab-search-box-input =
    .placeholder = Поиск в Интернете
    .aria-label = Поиск в Интернете

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Добавить поисковую систему
newtab-topsites-add-shortcut-header = Новый ярлык
newtab-topsites-edit-topsites-header = Изменить сайт из любимых
newtab-topsites-edit-shortcut-header = Изменить ярлык
newtab-topsites-add-shortcut-label = Добавить ярлык
newtab-topsites-add-shortcut-title =
    .title = Добавить ярлык
    .aria-label = Добавить ярлык
newtab-topsites-title-label = Заголовок
newtab-topsites-title-input =
    .placeholder = Введите название
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Введите или вставьте URL
newtab-topsites-url-validation = Введите корректный URL
newtab-topsites-image-url-label = Свой URL изображения
newtab-topsites-use-image-link = Использовать своё изображение…
newtab-topsites-image-validation = Изображение не загрузилось. Попробуйте использовать другой URL.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Очистить текст

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Отмена
newtab-topsites-delete-history-button = Удалить из истории
newtab-topsites-save-button = Сохранить
newtab-topsites-preview-button = Предпросмотр
newtab-topsites-add-button = Добавить

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Вы действительно хотите удалить все записи об этой странице из вашей истории?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Это действие нельзя отменить.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Спонсировано

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (закреплено)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Открыть меню
    .aria-label = Открыть меню
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Убрать
    .aria-label = Убрать
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Открыть меню
    .aria-label = Открыть контекстное меню для { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Изменить этот сайт
    .aria-label = Изменить этот сайт

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Изменить
newtab-menu-open-new-window = Открыть в новом окне
newtab-menu-open-new-private-window = Открыть в новом приватном окне
newtab-menu-dismiss = Скрыть
newtab-menu-pin = Прикрепить
newtab-menu-unpin = Открепить
newtab-menu-delete-history = Удалить из истории
newtab-menu-save-to-pocket = Сохранить в { -pocket-brand-name }
newtab-menu-delete-pocket = Удалить из { -pocket-brand-name }
newtab-menu-archive-pocket = Архивировать в { -pocket-brand-name }
newtab-menu-show-privacy-info = Наши спонсоры и ваша приватность
newtab-menu-about-fakespot = О { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Сообщить
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Блокировать
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Отписаться
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Подробнее
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Отписаться от темы

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Управление рекламным содержимым
newtab-menu-our-sponsors-and-your-privacy = Наши спонсоры и ваша приватность
newtab-menu-report-this-ad = Пожаловаться на эту рекламу

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Готово
newtab-privacy-modal-button-manage = Управление настройками контента спонсоров
newtab-privacy-modal-header = Ваша приватность имеет значение.
newtab-privacy-modal-paragraph-2 = Помимо сохранения увлекательных статей, мы также показываем вам проверенный контент от избранных спонсоров. Будьте уверены, <strong>ваши данные веб-сёрфинга никогда не покинут вашу личную копию { -brand-product-name }</strong> — мы не имеем к ним доступа, и наши спонсоры тоже не имеют.
newtab-privacy-modal-link = Посмотрите, как работает приватность, в новой вкладке

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Удалить закладку
# Bookmark is a verb here.
newtab-menu-bookmark = Добавить в закладки

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Копировать ссылку на загрузку
newtab-menu-go-to-download-page = Перейти на страницу загрузки
newtab-menu-remove-download = Удалить из истории

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Показать в Finder
       *[other] Открыть папку с файлом
    }
newtab-menu-open-file = Открыть файл

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Посещено
newtab-label-bookmarked = В закладках
newtab-label-removed-bookmark = Закладка удалена
newtab-label-recommended = Популярные
newtab-label-saved = Сохранено в { -pocket-brand-name }
newtab-label-download = Скачано
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · На правах рекламы
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = От спонсора { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } мин.
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Спонсировано

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Удалить раздел
newtab-section-menu-collapse-section = Свернуть раздел
newtab-section-menu-expand-section = Развернуть раздел
newtab-section-menu-manage-section = Управление разделом
newtab-section-menu-manage-webext = Управление расширением
newtab-section-menu-add-topsite = Добавить в любимые сайты
newtab-section-menu-add-search-engine = Добавить поисковую систему
newtab-section-menu-move-up = Вверх
newtab-section-menu-move-down = Вниз
newtab-section-menu-privacy-notice = Уведомление о конфиденциальности

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Свернуть раздел
newtab-section-expand-section-label =
    .aria-label = Развернуть раздел

## Section Headers.

newtab-section-header-topsites = Любимые сайты
newtab-section-header-recent-activity = Последние действия
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Рекомендовано { $provider }
newtab-section-header-stories = Истории, наводящие на размышления
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Сегодняшняя подборка для вас

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Начните веб-сёрфинг, и мы покажем вам здесь некоторые из интересных статей, видеороликов и других страниц, которые вы недавно посетили или добавили в закладки.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Вы всё прочитали. Зайдите попозже, чтобы увидеть больше лучших статей от { $provider }. Не можете ждать? Выберите популярную тему, чтобы найти больше интересных статей со всего Интернета.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Вы всё прочитали. Зайдите попозже, чтобы увидеть больше статей. Не можете подождать? Выберите популярную тему, чтобы найти больше интересных статей со всего Интернета.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Вы всё прочитали!
newtab-discovery-empty-section-topstories-content = Зайдите попозже, чтобы увидеть больше статей.
newtab-discovery-empty-section-topstories-try-again-button = Попробовать снова
newtab-discovery-empty-section-topstories-loading = Загрузка…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Ой! Мы почти загрузили этот раздел, но не совсем.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Популярные темы:
newtab-pocket-new-topics-title = Хотите увидеть ещё больше историй? Вот самые популярные темы от { -pocket-brand-name }
newtab-pocket-more-recommendations = Ещё рекомендации
newtab-pocket-learn-more = Подробнее
newtab-pocket-cta-button = Скачать { -pocket-brand-name }
newtab-pocket-cta-text = Сохраняйте интересные статьи в { -pocket-brand-name } и подпитывайте свой ум увлекательным чтением.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } является частью семейства { -brand-product-name }
newtab-pocket-save = Сохранить
newtab-pocket-saved = Сохранено

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Больше похожих
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Не для меня
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Спасибо. Ваш отзыв поможет нам улучшить вашу ленту.
newtab-toast-dismiss-button =
    .title = Убрать
    .aria-label = Убрать

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Находите лучшее в сети
newtab-pocket-onboarding-cta = { -pocket-brand-name } исследует широкий спектр публикаций, чтобы предоставить вам самый информативный, вдохновляющий и заслуживающий доверия контент прямо в вашем браузере { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = К сожалению что-то пошло не так при загрузке этого содержимого.
newtab-error-fallback-refresh-link = Обновить страницу, чтобы попробовать ещё раз.

## Customization Menu

newtab-custom-shortcuts-title = Ярлыки
newtab-custom-shortcuts-subtitle = Сохранённые или посещаемые сайты
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Ярлыки
    .description = Сохранённые или посещаемые сайты
newtab-custom-shortcuts-nova =
    .label = Ярлыки
newtab-custom-row-description =
    .description = Количество строк
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } строка
            [few] { $num } строки
           *[many] { $num } строк
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } строка
        [few] { $num } строки
       *[many] { $num } строк
    }
newtab-custom-sponsored-sites = Спонсируемые ярлыки
newtab-custom-pocket-title = Рекомендуемые { -pocket-brand-name }
newtab-custom-pocket-subtitle = Особый контент, курируемый { -pocket-brand-name }, частью семейства { -brand-product-name }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Рекомендуемые истории
    .description = Исключительный контент, курируемый семейством { -brand-product-name }
newtab-recommended-stories-toggle =
    .label = Рекомендуемые истории
newtab-custom-stories-personalized-toggle =
    .label = Истории
newtab-custom-stories-personalized-checkbox-label = Персонализированные истории на основе вашей активности
newtab-custom-pocket-sponsored = Статьи спонсоров
newtab-custom-pocket-show-recent-saves = Отображать последние сохранения
newtab-custom-recent-title = Последние действия
newtab-custom-recent-subtitle = Подборка недавних сайтов и контента
newtab-custom-weather-toggle =
    .label = Погода
    .description = Краткий прогноз на сегодня
newtab-custom-widget-weather-toggle =
    .label = Погода
newtab-custom-widget-lists-toggle =
    .label = Списки
newtab-custom-widget-timer-toggle =
    .label = Таймер
newtab-custom-widget-sports-toggle =
    .label = Чемпионат мира
newtab-custom-widget-clock-toggle =
    .label = Часы
newtab-custom-widget-sports-toggle2 =
    .label = Спорт
newtab-custom-widget-section-title = Виджеты
newtab-custom-widget-section-toggle =
    .label = Виджеты
newtab-widget-manage-title = Виджеты
newtab-widget-manage-widget-button =
    .label = Управление виджетами
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Закрыть
    .aria-label = Закрыть меню
newtab-custom-close-button = Закрыть
newtab-custom-settings = Управление дополнительными настройками

## New Tab Wallpapers

newtab-wallpaper-title = Обои
newtab-wallpaper-reset = Восстановить по умолчанию
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Загрузить изображение
newtab-wallpaper-add-an-image = Добавить изображение
newtab-wallpaper-custom-color = Выберите цвет
newtab-wallpaper-toggle-title =
    .label = Обои
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Размер файла изображения превысил лимит в { $file_size }МБ. Пожалуйста, попробуйте загрузить файл меньшего размера.
newtab-wallpaper-error-upload-file-type = Мы не смогли загрузить ваш файл. Пожалуйста, попробуйте ещё раз с файлом изображения.
newtab-wallpaper-error-file-type = Мы не смогли загрузить ваш файл. Пожалуйста, попробуйте ещё раз с другим типом файла.
newtab-wallpaper-light-red-panda = Красная панда
newtab-wallpaper-light-mountain = Белая гора
newtab-wallpaper-light-sky = Небо с фиолетовыми и розовыми облаками
newtab-wallpaper-light-color = Синие, розовые и жёлтые формы
newtab-wallpaper-light-landscape = Горный пейзаж из синего дыма
newtab-wallpaper-light-beach = Пляж с пальмами
newtab-wallpaper-dark-aurora = Северное сияние
newtab-wallpaper-dark-color = Красные и синие формы
newtab-wallpaper-dark-panda = Красная панда, прячущаяся в лесу
newtab-wallpaper-dark-sky = Городской пейзаж с ночным небом
newtab-wallpaper-dark-mountain = Горный пейзаж
newtab-wallpaper-dark-city = Фиолетовый городской пейзаж
newtab-wallpaper-dark-fox-anniversary = Лиса на дороге рядом с лесом
newtab-wallpaper-light-fox-anniversary = Лиса на травяном поле с туманным горным ландшафтом

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Сплошные цвета
newtab-wallpaper-colors = Цвета
newtab-wallpaper-blue = Синий
newtab-wallpaper-light-blue = Голубой
newtab-wallpaper-light-purple = Светло-фиолетовый
newtab-wallpaper-light-green = Светло-зелёный
newtab-wallpaper-green = Зелёный
newtab-wallpaper-beige = Бежевый
newtab-wallpaper-yellow = Жёлтый
newtab-wallpaper-orange = Оранжевый
newtab-wallpaper-pink = Розовый
newtab-wallpaper-light-pink = Светло-розовый
newtab-wallpaper-red = Красный
newtab-wallpaper-dark-blue = Тёмно-синий
newtab-wallpaper-dark-purple = Тёмно-фиолетовый
newtab-wallpaper-dark-green = Тёмно-зелёный
newtab-wallpaper-brown = Коричневый

## Abstract

newtab-wallpaper-category-title-abstract = Абстракция
newtab-wallpaper-abstract-green = Зелёные формы
newtab-wallpaper-abstract-blue = Синие формы
newtab-wallpaper-abstract-purple = Фиолетовые формы
newtab-wallpaper-abstract-orange = Оранжевые формы
newtab-wallpaper-gradient-orange = Градиент оранжевого и розового
newtab-wallpaper-abstract-blue-purple = Синие и фиолетовые формы
newtab-wallpaper-abstract-white-curves = Белый с заштрихованными кривыми
newtab-wallpaper-abstract-purple-green = Фиолетово-зелёный световой градиент
newtab-wallpaper-abstract-blue-purple-waves = Синие и фиолетовые волнистые формы
newtab-wallpaper-abstract-black-waves = Чёрные волнообразные формы

## Firefox

newtab-wallpaper-category-title-photographs = Фотографии
newtab-wallpaper-beach-at-sunrise = Пляж на восходе
newtab-wallpaper-beach-at-sunset = Пляж на закате
newtab-wallpaper-storm-sky = Грозовое небо
newtab-wallpaper-sky-with-pink-clouds = Небо с розовыми облаками
newtab-wallpaper-red-panda-yawns-in-a-tree = Красная панда зевает на дереве
newtab-wallpaper-white-mountains = Белые горы
newtab-wallpaper-hot-air-balloons = Различные цвета воздушных шаров в дневное время
newtab-wallpaper-starry-canyon = Синяя звёздная ночь
newtab-wallpaper-suspension-bridge = Фотография серого подвесного моста в дневное время
newtab-wallpaper-sand-dunes = Белые песчаные дюны
newtab-wallpaper-palm-trees = Силуэт кокосовых пальм в золотой час
newtab-wallpaper-blue-flowers = Крупный план распускающихся цветов с голубыми цветами
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Фото <a data-l10n-name="name-link">{ $author_string }</a> на <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Попробуйте всплеск цвета
newtab-wallpaper-feature-highlight-content = Обновите вид Новой вкладки с помощью обоев.
newtab-wallpaper-feature-highlight-button = Понятно
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Убрать
    .aria-label = Закрыть окно
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Космос
newtab-wallpaper-celestial-lunar-eclipse = Лунное затмение
newtab-wallpaper-celestial-earth-night = Ночное фото с низкой околоземной орбиты
newtab-wallpaper-celestial-starry-sky = Звёздное небо
newtab-wallpaper-celestial-eclipse-time-lapse = Хронометраж лунного затмения
newtab-wallpaper-celestial-black-hole = Иллюстрация галактики с чёрной дырой
newtab-wallpaper-celestial-river = Космический снимок реки

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Посмотреть прогноз в { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ На правах рекламы
newtab-weather-menu-change-location = Изменить местоположение
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Поиск местоположения
    .aria-label = Поиск местоположения
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Использовать текущее местоположение
newtab-weather-menu-weather-display = Отображение погоды
newtab-weather-todays-forecast = Сегодняшний прогноз
newtab-weather-see-full-forecast = Посмотреть полный прогноз
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Простой
newtab-weather-menu-change-weather-display-simple = Переключиться в простой вид
newtab-weather-menu-weather-display-option-detailed = Подробный
newtab-weather-menu-change-weather-display-detailed = Переключиться в подробный вид
newtab-weather-menu-temperature-units = Единицы измерения температуры
newtab-weather-menu-temperature-option-fahrenheit = Фаренгейт
newtab-weather-menu-temperature-option-celsius = Цельсий
newtab-weather-menu-change-temperature-units-fahrenheit = Переключиться на градусы Фаренгейта
newtab-weather-menu-change-temperature-units-celsius = Переключиться на градусы Цельсия
newtab-weather-menu-hide-weather = Скрыть погоду на новой вкладке
newtab-weather-menu-learn-more = Подробнее
newtab-weather-menu-detect-my-location = Определить моё местоположение
# This message is shown if user is working offline
newtab-weather-error-not-available = Данные о погоде сейчас недоступны.
newtab-weather-opt-in-see-weather = Хотите видеть погоду для вашего местоположения?
newtab-weather-opt-in-not-now =
    .label = Не сейчас
newtab-weather-opt-in-yes =
    .label = Да
newtab-weather-opt-in-headline = Получите местный прогноз погоды
newtab-weather-opt-in-use-location =
    .label = Использовать местоположение
newtab-weather-opt-in-choose-location = Выбрать местоположение
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Нью-Йорк
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Высокая
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Низкая
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Посмотреть прогноз в { $provider }
    .aria-description = { $provider } ∙ На правах рекламы

## Topic Labels

newtab-topic-label-business = Бизнес
newtab-topic-label-career = Карьера
newtab-topic-label-education = Образование
newtab-topic-label-arts = Развлечения
newtab-topic-label-food = Еда
newtab-topic-label-health = Здоровье
newtab-topic-label-hobbies = Игры
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Деньги
newtab-topic-label-society-parenting = Воспитание
newtab-topic-label-government = Политика
newtab-topic-label-education-science = Наука
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Лайфхаки
newtab-topic-label-sports = Спорт
newtab-topic-label-tech = Техника
newtab-topic-label-travel = Путешествия
newtab-topic-label-home = Дом и сад

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Выберите темы для точной настройки вашей ленты
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Выберите две или более тем. Наши опытные кураторы расставляют приоритеты для статей с учётом ваших интересов. Обновляйте в любое время.
newtab-topic-selection-save-button = Сохранить
newtab-topic-selection-cancel-button = Отменить
newtab-topic-selection-button-maybe-later = Возможно, позже
newtab-topic-selection-privacy-link = Узнайте, как мы защищаем данные и управляем ими
newtab-topic-selection-button-update-interests = Обновите свои интересы
newtab-topic-selection-button-pick-interests = Выберите ваши интересы

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Подписаться
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Подписаться на { $topic }
newtab-section-following-button = Подписан
newtab-section-unfollow-button = Отписаться
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Подписка: Отписаться от { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Настройте вашу ленту новостей
newtab-section-follow-highlight-subtitle = Подпишитесь на свои интересы, чтобы увидеть больше того, что вам нравится.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Блокировать
newtab-section-blocked-button = Заблокировано
newtab-section-unblock-button = Разблокировать
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Подписаться на { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Отписаться от { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Заблокировать { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Разблокировать { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = Не сейчас
newtab-section-confirm-block-topic-p1 = Вы уверены, что хотите заблокировать эту тему?
newtab-section-confirm-block-topic-p2 = Заблокированные темы больше не будут появляться в вашей ленте.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Заблокировать { $topic }
newtab-section-block-cancel-button = Отмена

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Темы
newtab-section-manage-topics-button-v2 =
    .label = Управление темами
newtab-section-mangage-topics-followed-topics = Подписки
newtab-section-mangage-topics-followed-topics-empty-state = Вы пока не отслеживаете ни одну тему.
newtab-section-mangage-topics-blocked-topics = Заблокированы
newtab-section-mangage-topics-blocked-topics-empty-state = Вы пока не заблокировали ни одной темы.
newtab-custom-wallpaper-title = Пользовательские обои здесь
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Загрузите свои обои или выберите цвет оформления, чтобы настроить { -brand-product-name } под себя.
newtab-custom-wallpaper-cta = Попробовать

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Выберите обои, чтобы сделать { -brand-product-name } своим
newtab-new-user-custom-wallpaper-subtitle = Сделайте каждую новую вкладку своим домом с помощью собственных обоев и цветов.
newtab-new-user-custom-wallpaper-cta = Попробовать сейчас

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Только что появились новые свежие обои
newtab-wallpaper-feature-highlight-subtitle = Выберите свои любимые, и сделайте каждую новую вкладку своей, как дома.
newtab-wallpaper-feature-highlight-cta = Выберите обои

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Скачайте { -brand-product-name } для мобильных устройств
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Отсканируйте код, чтобы безопасно работать в Интернете.
newtab-download-mobile-highlight-body-variant-b = Продолжайте с того места, где вы остановились, при синхронизации вкладок, паролей и многого другого.
newtab-download-mobile-highlight-body-variant-c = Знаете ли вы, что { -brand-product-name } можно брать с собой? Тот же браузер. У вас в кармане.
newtab-download-mobile-highlight-image =
    .aria-label = QR-код для скачивания { -brand-product-name } для мобильных устройств

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Ваше любимое на кончиках ваших пальцев
newtab-shortcuts-highlight-subtitle = Добавьте ярлык, чтобы держать под рукой любимые сайты.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Почему вы сообщаете об этом?
newtab-report-ads-reason-not-interested =
    .label = Мне не интересно
newtab-report-ads-reason-inappropriate =
    .label = Это неуместно
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Я вижу это слишком много раз
newtab-report-content-wrong-category =
    .label = Неверная категория
newtab-report-content-outdated =
    .label = Неактуальное
newtab-report-content-inappropriate-offensive =
    .label = Неуместное или оскорбительное
newtab-report-content-spam-misleading =
    .label = Спам или вводящее в заблуждение
newtab-report-content-requires-payment-subscription =
    .label = Требуется оплата или подписка
newtab-report-content-requires-payment-subscription-learn-more = Узнать больше
newtab-report-cancel = Отмена
newtab-report-submit = Отправить
newtab-toast-thanks-for-reporting =
    .message = Благодарим за сообщение.
newtab-toast-widgets-hidden =
    .message = Щёлкните по значку карандаша, чтобы добавить виджеты обратно в любое время.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Теперь вы читаете { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Вы больше не читаете { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Вы больше не увидите статьи на тему { $topic }.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Возможности безграничны. Добавьте ещё одну.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Создать
newtab-widget-lists-label-beta =
    .label = Бета
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Завершено ({ $number })
newtab-widget-lists-celebration-headline = Хорошая работа
newtab-widget-lists-celebration-subhead = Всё чисто
newtab-widget-task-list-menu-copy = Копировать
newtab-widget-lists-menu-edit = Изменить имя списка
newtab-widget-lists-menu-edit2 =
    .aria-label = Изменить имя списка
newtab-widget-lists-menu-create = Создать новый список
newtab-widget-lists-menu-delete = Удалить этот список
newtab-widget-lists-menu-copy = Копировать список в буфер обмена
newtab-widget-lists-menu-learn-more = Подробнее
newtab-widget-lists-button-add-item = Добавить элемент
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Добавить элемент
    .aria-label = Добавить элемент
newtab-widget-lists-input-error = Пожалуйста, укажите текст, чтобы добавить элемент.
newtab-widget-lists-input-menu-open-link = Открыть ссылку
newtab-widget-lists-input-menu-move-up = Вверх
newtab-widget-lists-input-menu-move-down = Вниз
newtab-widget-lists-input-menu-delete = Удалить
newtab-widget-lists-input-menu-edit = Изменить
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Изменить элемент
newtab-widget-lists-edit-clear =
    .aria-label = Отмена
    .title = Отмена
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Создать новый список
newtab-widget-lists-name-label-default =
    .label = Список задач
newtab-widget-lists-name-label-checklist =
    .label = Контрольный список
newtab-widget-lists-name-placeholder-default =
    .placeholder = Список задач
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Контрольный список
    .aria-label = Изменить имя списка
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Новый список
    .aria-label = Изменить имя списка
newtab-widget-section-title = Виджеты
newtab-widget-menu-hide = Скрыть виджет
newtab-widget-menu-change-size = Изменить размер
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Переместить
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Влево
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Вправо
newtab-widget-size-small = Маленький
newtab-widget-size-medium = Средний
newtab-widget-size-large = Большой
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Скрыть виджеты
    .aria-label = Скрыть все виджеты
newtab-widget-section-maximize =
    .title = Развернуть виджеты
    .aria-label = Развернуть все виджеты до полного размера
newtab-widget-section-minimize =
    .title = Свернуть виджеты
    .aria-label = Свернуть все виджеты до компактного размера
newtab-widget-section-menu-button =
    .title = Меню виджетов
    .aria-label = Открыть меню виджетов
newtab-widget-add-widgets-button =
    .aria-label = Добавить виджет
    .title = Добавить виджет
newtab-widget-section-menu-manage = Управление виджетами
newtab-widget-section-menu-hide-all = Скрыть виджеты
newtab-widget-section-menu-learn-more = Подробнее
newtab-widget-section-feedback = Скажите нам, что вы думаете
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Показать больше виджетов
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Показывать меньше виджетов
newtab-widget-lists-name-default = Контрольный список

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Таймер
newtab-widget-timer-notification-focus = Время фокусировки вышло. Отличная работа. Нужен перерыв?
newtab-widget-timer-notification-break = Ваш перерыв закончен. Готовы сфокусироваться?
newtab-widget-timer-notification-warning = Уведомления отключены
newtab-widget-timer-mode-focus =
    .label = Фокусировка
newtab-widget-timer-mode-break =
    .label = Перерыв
newtab-widget-timer-label-play =
    .label = Запустить
newtab-widget-timer-label-pause =
    .label = Приостановить
newtab-widget-timer-reset =
    .title = Сбросить
newtab-widget-timer-menu-notifications = Отключить уведомления
newtab-widget-timer-menu-notifications-on = Включить уведомления
newtab-widget-timer-menu-learn-more = Подробнее
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Самые популярные новости
newtab-daily-briefing-card-menu-dismiss = Скрыть
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Обновлено { $minutes } мин. назад
newtab-widget-message-title = Оставайтесь в фокусе с помощью списков и встроенного таймера
# to-dos stands for "things to do".
newtab-widget-message-copy = От быстрых напоминаний до ежедневных задач, от фокус-сессий до длительных перерывов - выполняйте задачи вовремя.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Единое место для фокусировки, прогнозов погоды и пр.
newtab-widget-message-focus-forecasts-body = Пусть ваш день течёт с виджетами { -brand-product-name }. Проверяйте прогноз погоды, не отвлекайтесь от задачи или отслеживайте время в любой точке земного шара.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Сделайте { -brand-product-name } своим
newtab-promo-card-body-addons = Выберите обои из нашей коллекции или создайте свои собственные.
newtab-promo-card-cta-addons = Попробовать сейчас
newtab-promo-card-title = Поддержите { -brand-product-name }
newtab-promo-card-body = Наши спонсоры поддерживают нашу миссию по построению лучшего Интернета
newtab-promo-card-cta = Подробнее
newtab-promo-card-dismiss-button =
    .title = Убрать
    .aria-label = Убрать

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] Запустить таймер на { $minutes } минуту
            [few] Запустить таймер на { $minutes } минуты
           *[many] Запустить таймер на { $minutes } минут
        }
newtab-widget-timer-pause-aria =
    .aria-label = Приостановить таймер
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } минута
            [few] { $minutes } минуты
           *[many] { $minutes } минут
        }
newtab-widget-timer-decrease-min =
    .title = Уменьшить на 1 минуту
newtab-widget-timer-increase-min =
    .title = Увеличить на 1 минуту
newtab-widget-timer-mode-group =
    .aria-label = Режим таймера
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Фокусировка
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Перерыв
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Скрыть таймер
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Отличная работа
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Ваш перерыв закончен
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Нужен перерыв?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Готовы сфокусироваться?

##

newtab-sports-widget-menu-follow-teams = Подписаться на команды
newtab-sports-widget-menu-view-schedule = Просмотреть расписание
newtab-sports-widget-menu-view-upcoming = Просмотреть предстоящие
newtab-sports-widget-menu-view-results = Просмотреть результаты
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Ключевые даты
newtab-sports-widget-menu-learn-more = Подробнее
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Будьте в курсе событий ЧМ
newtab-sports-widget-get-updates = Получайте обновления по матчам и другую информацию в прямом эфире.
newtab-sports-widget-view-schedule =
    .label = Просмотреть расписание
newtab-sports-widget-follow-teams =
    .label = Подписаться на команды
newtab-sports-widget-view-matches =
    .label = Просмотреть совпадения
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Следить за до { $number } командой
        [few] Следить за до { $number } команд
       *[many] Следить за до { $number } команд
    }
newtab-sports-widget-choose-wallpaper =
    .label = Выберите обои
newtab-sports-widget-skip = Пропустить
newtab-sports-widget-search-country =
    .placeholder = Поиск страны
    .aria-label = Поиск страны
newtab-sports-widget-cancel = Отмена
newtab-sports-widget-back-button =
    .aria-label = Назад
newtab-sports-widget-done-button =
    .label = Готово
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (команда выбыла)
newtab-sports-widget-view-all =
    .label = Просмотреть все
newtab-sports-widget-show-less =
    .label = Показать меньше
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Только отслеживаемые команды
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Смотреть
    .title = Смотреть эфир
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Смотреть эфир
    .title = Смотреть эфир
newtab-sports-widget-watch-dialog-close =
    .aria-label = Закрыть
    .title = Закрыть
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Бесплатно
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Бесплатный период
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Бесплатно и платно
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Платно
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Выбрать только игры
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Доступно в вашем регионе
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Другие регионы
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Открыть трансляцию
    .title = Открыть трансляцию
newtab-sports-widget-group-stage = Групповой этап
newtab-sports-widget-group-a = Группа А
newtab-sports-widget-group-b = Группа B
newtab-sports-widget-group-c = Группа C
newtab-sports-widget-group-d = Группа D
newtab-sports-widget-group-e = Группа E
newtab-sports-widget-group-f = Группа F
newtab-sports-widget-group-g = Группа G
newtab-sports-widget-group-h = Группа H
newtab-sports-widget-group-i = Группа I
newtab-sports-widget-group-j = Группа J
newtab-sports-widget-group-k = Группа K
newtab-sports-widget-group-l = Группа L
newtab-sports-widget-round-32 = 1/16 финала
newtab-sports-widget-round-16 = 1/8 финала
newtab-sports-widget-quarter-finals = 1/4 финала
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = ЭФИР
newtab-custom-widget-live-refresh =
    .title = Обновить результаты
    .aria-label = Обновить результаты
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Ключевые даты
newtab-sports-widget-upcoming = Предстоящие
# Used for a match currently ongoing
newtab-sports-widget-now = Сейчас
newtab-sports-widget-results = Результаты
newtab-sports-widget-semi-finals = Полуфиналы
newtab-sports-widget-bronze-finals = Игра за третье место
# Final is the final match for 1st place.
newtab-sports-widget-final = Финал
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Задерживается
newtab-sports-widget-postponed = Отложено
newtab-sports-widget-suspended = Приостановлено
newtab-sports-widget-cancelled = Отменено
newtab-sports-widget-information = Информация о матче
newtab-sports-widget-no-live-data = Данные о матчах в данный момент не обновляются
newtab-sports-widget-view-results-link = Просмотреть результаты
newtab-sports-widget-third-place = Третье место
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Второе место
newtab-sports-widget-champions = Чемпионы
newtab-sports-widget-world-cup-champions = Чемпионы ЧМ 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Полное время
newtab-sports-widget-match-halftime = Перерыв
newtab-sports-widget-match-extra-time = Дополнительное время
newtab-sports-widget-match-penalties = Пенальти
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = против
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Следите за подробностями предстоящего матча

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Предыдущая
    .title = Предыдущая
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Следующая
    .title = Следующая
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Эфир матча { $index } из { $total }
    .title = Эфир матча { $index } из { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } против { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) против { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Эфир: { $homeTeam }, { $homeScore } против { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } против { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } против { $awayTeam }, задержка
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } против { $awayTeam }, отложено
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } против { $awayTeam }, приостановлено
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } против { $awayTeam }, отмена

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Босния и Герцеговина
newtab-sports-widget-team-name-label-civ =
    .label = Кот-д'Ивуар
newtab-sports-widget-team-name-label-cod =
    .label = ДР Конго
newtab-sports-widget-team-name-label-eng =
    .label = Англия
newtab-sports-widget-team-name-label-sco =
    .label = Шотландия
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = В ожидании

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Начните ЧМ с новых обоев
newtab-sports-widget-message-wallpapers-body = Внесите немного энергии игрового дня в свой браузер для этого турнира.
newtab-sports-widget-message-wallpapers-cta = Выберите обои
newtab-sports-widget-message-add-widgets-cta =
    .label = Добавить виджеты
newtab-sports-widget-message-day-in-play-title = Проводите день с игрой с помощью виджетов { -brand-product-name }
newtab-sports-widget-message-day-in-play-body = Следите за ЧМ, концентрируйтесь на задачах, отслеживайте время в любой точке земного шара и пр.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Ознакомьтесь с виджетами

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Убрать
    .aria-label = Убрать
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Сделайте это пространство своим
newtab-activation-window-message-customization-focus-message = Выберите новые обои, добавьте ярлыки на ваши любимые сайты и будьте в курсе новостей, которые вас интересуют.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Начать настройку
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Это пространство играет по вашим правилам
newtab-activation-window-message-values-focus-message = { -brand-product-name } позволяет вам сёрфить так, как вам нравится, более личное начало дня в Интернете. Сделайте { -brand-product-name } своим.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Скрыть часы
newtab-clock-widget-menu-learn-more = Узнать больше
newtab-clock-widget-menu-edit = Редактировать часы
newtab-clock-widget-menu-switch-to-12h = Переключиться на 12-часовой формат
newtab-clock-widget-menu-switch-to-24h = Перейти на 24-часовой формат
newtab-clock-widget-label-your-clocks = Ваши часы
newtab-clock-widget-search-location-input =
    .label = Местоположение
    .placeholder = Поиск города
    .aria-label = Поиск города
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Ник (необязательно)
    .placeholder = Добавить ник
    .aria-label = Ник (необязательно)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Добавить новые часы
    .aria-label = Добавить новые часы
newtab-clock-widget-button-add-clock = Добавить
newtab-clock-widget-button-cancel = Отмена
newtab-clock-widget-button-back =
    .title = Назад
    .aria-label = Назад
newtab-clock-widget-button-edit-clock =
    .title = Редактировать часы
    .aria-label = Редактировать часы
newtab-clock-widget-button-save = Сохранить
newtab-clock-widget-button-remove-clock =
    .title = Удалить часы
    .aria-label = Удалить часы
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
    .aria-label = { $city }, название: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Добавить часы
newtab-clock-widget-edit-clock-form =
    .aria-label = Редактировать часы
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Результаты поиска
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Нет совпадений
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Открыть меню для часов
    .aria-label = Открыть меню для часов
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Ник: { $nickname }
