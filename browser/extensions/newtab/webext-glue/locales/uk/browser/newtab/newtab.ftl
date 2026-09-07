# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Нова вкладка
newtab-settings-button =
    .title = Налаштуйте свою сторінку нової вкладки
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Налаштувати цю сторінку
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Налаштувати
newtab-customize-panel-label =
    .label = Налаштувати
newtab-personalize-settings-icon-label =
    .title = Персоналізувати нову вкладку
    .aria-label = Налаштування
newtab-settings-dialog-label =
    .aria-label = Налаштування
newtab-personalize-icon-label =
    .title = Персоналізувати нову вкладку
    .aria-label = Персоналізувати нову вкладку
newtab-personalize-dialog-label =
    .aria-label = Персоналізувати
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Відхилити
    .aria-label = Відхилити

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Домівка
home-homepage-new-windows =
    .label = Нові вікна
home-homepage-new-tabs =
    .label = Нові вкладки
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Вибрати певний сайт

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Адреса вебсайту
home-custom-homepage-address =
    .placeholder = Введіть адресу
home-custom-homepage-address-button =
    .label = Додати адресу
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Ще не додано жодного вебсайту.
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Замінити на
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Поточні відкриті сторінки
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Закладки…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Пошук
home-prefs-stories-header2 =
    .label = Історії
    .description = Добірні матеріали від { -brand-product-name }
home-prefs-widgets-header =
    .label = Віджети
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Списки
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Таймер
home-prefs-mission-message2 =
    .message = Наші спонсори підтримують нашу місію зі створення кращого інтернету.
home-prefs-manage-topics-link2 =
    .label = Керувати темами
home-prefs-choose-wallpaper-link2 =
    .label = Виберіть шпалеру
home-prefs-firefox-logo-header =
    .label = Логотип { -brand-short-name }
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } рядок
            [few] { $num } рядки
           *[many] { $num } рядків
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Розширення ({ $extension })
home-restore-defaults-srd =
    .label = Відновити типові
    .accesskey = т
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (Типово)
home-mode-choice-custom-srd =
    .label = Власні URL-адреси…
home-mode-choice-blank-srd =
    .label = Чиста сторінка
home-prefs-shortcuts-header-srd =
    .label = Ярлики
home-prefs-shortcuts-select =
    .aria-label = Ярлики
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Спонсоровані ярлики
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Матеріали від спонсорів
home-prefs-highlights-option-visited-pages-srd =
    .label = Відвідані сторінки
home-prefs-highlights-options-bookmarks-srd =
    .label = Закладки
home-prefs-highlights-option-most-recent-download-srd =
    .label = Останні завантаження
home-prefs-recent-activity-header-srd =
    .label = Нещодавня активність
home-prefs-recent-activity-select =
    .aria-label = Нещодавня активність
home-prefs-weather-header-srd =
    .label = Погода
home-prefs-support-firefox-header-srd =
    .label = Підтримка { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = Дізнайтеся як

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Пошук
    .aria-label = Пошук
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Шукайте за допомогою { $engine } або введіть адресу
newtab-search-box-handoff-text-no-engine = Введіть запит чи адресу
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Шукайте за допомогою { $engine } або введіть адресу
    .title = Шукайте за допомогою { $engine } або введіть адресу
    .aria-label = Шукайте за допомогою { $engine } або введіть адресу
newtab-search-box-handoff-input-no-engine =
    .placeholder = Введіть запит чи адресу
    .title = Введіть запит чи адресу
    .aria-label = Введіть запит чи адресу
newtab-search-box-text = Пошук в Інтернеті
newtab-search-box-input =
    .placeholder = Пошук в Інтернеті
    .aria-label = Пошук в Інтернеті

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Додати пошукову систему
newtab-topsites-add-shortcut-header = Новий ярлик
newtab-topsites-edit-topsites-header = Редагувати популярний сайт
newtab-topsites-edit-shortcut-header = Редагувати ярлик
newtab-topsites-add-shortcut-label = Додати ярлик
newtab-topsites-add-shortcut-title =
    .title = Додати ярлик
    .aria-label = Додати ярлик
newtab-topsites-title-label = Заголовок
newtab-topsites-title-input =
    .placeholder = Введіть назву
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Введіть або вставте URL-адресу
newtab-topsites-url-validation = Необхідна дійсна адреса URL
newtab-topsites-image-url-label = URL власного зображення
newtab-topsites-use-image-link = Використати власне зображення…
newtab-topsites-image-validation = Не вдалося завантажити зображення. Спробуйте інший URL.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Очистити текст

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Скасувати
newtab-topsites-delete-history-button = Видалити з історії
newtab-topsites-save-button = Зберегти
newtab-topsites-preview-button = Попередній перегляд
newtab-topsites-add-button = Додати

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Ви справді хочете видалити всі записи про цю сторінку з історії?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Цю дію неможливо скасувати.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Спонсоровано

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (закріплено)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Відкрити меню
    .aria-label = Відкрити меню
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Вилучити
    .aria-label = Вилучити
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Відкрити меню
    .aria-label = Відкрити контекстне меню для { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Змінити цей сайт
    .aria-label = Змінити цей сайт

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Змінити
newtab-menu-open-new-window = Відкрити в новому вікні
newtab-menu-open-new-private-window = Відкрити в приватному вікні
newtab-menu-dismiss = Сховати
newtab-menu-pin = Закріпити
newtab-menu-unpin = Відкріпити
newtab-menu-delete-history = Видалити з історії
newtab-menu-save-to-pocket = Зберегти в { -pocket-brand-name }
newtab-menu-delete-pocket = Видалити з { -pocket-brand-name }
newtab-menu-archive-pocket = Архівувати в { -pocket-brand-name }
newtab-menu-show-privacy-info = Наші спонсори і ваша приватність
newtab-menu-about-fakespot = Про { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Повідомити
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Блокувати
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Докладніше
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Відписатися від теми

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Керувати спонсорованим вмістом
newtab-menu-our-sponsors-and-your-privacy = Наші спонсори і ваша приватність
newtab-menu-report-this-ad = Повідомити про це оголошення

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Готово
newtab-privacy-modal-button-manage = Налаштування спонсорованого вмісту
newtab-privacy-modal-header = Ваша приватність має значення.
newtab-privacy-modal-paragraph-2 =
    Окрім захопливих історій, ми також показуємо вам відповідний,
    перевірений вміст від обраних спонсорів. Будьте впевнені, що <strong>ваші дані
    перегляду ніколи не виходять за межі { -brand-product-name }</strong> – ми їх не бачимо,
    і наші спонсори теж.
newtab-privacy-modal-link = Дізнайтеся, як працює приватність, у новій вкладці

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Вилучити закладку
# Bookmark is a verb here.
newtab-menu-bookmark = Додати до закладок

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Копіювати адресу завантаження
newtab-menu-go-to-download-page = Перейти на сторінку завантаження
newtab-menu-remove-download = Вилучити з історії

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Показати у Finder
       *[other] Відкрити теку з файлом
    }
newtab-menu-open-file = Відкрити файл

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Відвідано
newtab-label-bookmarked = Додано до закладок
newtab-label-removed-bookmark = Закладку вилучено
newtab-label-recommended = Популярне
newtab-label-saved = Збережено в { -pocket-brand-name }
newtab-label-download = Завантажено
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Спонсоровано
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Від спонсора { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } хв
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Спонсоровано

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Вилучити розділ
newtab-section-menu-collapse-section = Згорнути розділ
newtab-section-menu-expand-section = Розгорнути розділ
newtab-section-menu-manage-section = Керувати розділом
newtab-section-menu-manage-webext = Керувати розширенням
newtab-section-menu-add-topsite = Додати до популярних сайтів
newtab-section-menu-add-search-engine = Додати пошукову систему
newtab-section-menu-move-up = Вгору
newtab-section-menu-move-down = Вниз
newtab-section-menu-privacy-notice = Положення про приватність

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Згорнути розділ
newtab-section-expand-section-label =
    .aria-label = Розгорнути розділ

## Section Headers.

newtab-section-header-topsites = Популярні сайти
newtab-section-header-recent-activity = Нещодавня активність
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Рекомендації від { $provider }
newtab-section-header-stories = Розповіді, що спонукають замислитися
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Сьогоднішня підбірка для вас

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Почніть перегляд, і тут з'являться цікаві статті, відео та інші сторінки, нещодавно відвідані чи збережені вами до закладок.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Готово. Перевірте згодом, щоб побачити більше матеріалів від { $provider }. Не хочете чекати? Оберіть популярну тему, щоб знайти більше цікавих матеріалів з усього Інтернету.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Готово. Перевірте згодом, щоб побачити більше матеріалів. Не хочете чекати? Оберіть популярну тему, щоб знайти більше цікавих матеріалів з усього Інтернету.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Ви все прочитали!
newtab-discovery-empty-section-topstories-content = Перевірте згодом, щоб побачити більше матеріалів.
newtab-discovery-empty-section-topstories-try-again-button = Спробувати знову
newtab-discovery-empty-section-topstories-loading = Завантаження…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Отакої! Ми майже завантажили цей розділ, але не повністю.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Популярні теми:
newtab-pocket-new-topics-title = Хочете ще більше розповідей? Перегляньте ці популярні теми від { -pocket-brand-name }
newtab-pocket-more-recommendations = Інші рекомендації
newtab-pocket-learn-more = Докладніше
newtab-pocket-cta-button = Отримати { -pocket-brand-name }
newtab-pocket-cta-text = Зберігайте улюблені статті в { -pocket-brand-name } і задовольніть себе захопливим читанням.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } є частиною родини { -brand-product-name }
newtab-pocket-save = Зберегти
newtab-pocket-saved = Збережено

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Більше подібного
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Не для мене
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Дякуємо. Ваш відгук допоможе нам покращити вашу стрічку.
newtab-toast-dismiss-button =
    .title = Відхилити
    .aria-label = Відхилити

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Знаходьте найкраще в інтернеті
newtab-pocket-onboarding-cta = { -pocket-brand-name } досліджує різноманітні публікації, щоб пропонувати вам найкращі інформаційні, натхненні й надійні матеріали безпосередньо в браузері { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Йой, під час завантаження цього вмісту щось пішло не так.
newtab-error-fallback-refresh-link = Оновіть сторінку, щоб спробувати знову.

## Customization Menu

newtab-custom-shortcuts-title = Ярлики
newtab-custom-shortcuts-subtitle = Сайти, які ви зберігаєте чи відвідуєте
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Ярлики
    .description = Сайти, які ви зберігаєте чи відвідуєте
newtab-custom-shortcuts-nova =
    .label = Ярлики
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } рядок
            [few] { $num } рядки
           *[many] { $num } рядків
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } рядок
        [few] { $num } рядки
       *[many] { $num } рядків
    }
newtab-custom-sponsored-sites = Спонсоровані ярлики
newtab-custom-pocket-title = Рекомендації від { -pocket-brand-name }
newtab-custom-pocket-subtitle = Добірні матеріали від { -pocket-brand-name }, що входить до родини { -brand-product-name }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Рекомендовані матеріали
    .description = Виняткові матеріали, відібрані командою { -brand-product-name }
newtab-recommended-stories-toggle =
    .label = Рекомендовані матеріали
newtab-custom-stories-personalized-toggle =
    .label = Історії
newtab-custom-stories-personalized-checkbox-label = Персоналізовані історії на основі вашої активності
newtab-custom-pocket-sponsored = Матеріали від спонсорів
newtab-custom-pocket-show-recent-saves = Показати останні збереження
newtab-custom-recent-title = Недавня активність
newtab-custom-recent-subtitle = Добірка недавніх сайтів та вмісту
newtab-custom-weather-toggle =
    .label = Погода
    .description = Точний прогноз на сьогодні
newtab-custom-widget-weather-toggle =
    .label = Погода
newtab-custom-widget-lists-toggle =
    .label = Списки
newtab-custom-widget-timer-toggle =
    .label = Таймер
newtab-custom-widget-section-title = Віджети
newtab-custom-widget-section-toggle =
    .label = Віджети
newtab-widget-manage-title = Віджети
newtab-widget-manage-widget-button =
    .label = Керувати віджетами
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Закрити
    .aria-label = Закрити меню
newtab-custom-close-button = Закрити
newtab-custom-settings = Керувати іншими налаштуваннями

## New Tab Wallpapers

newtab-wallpaper-title = Шпалери
newtab-wallpaper-reset = Відновити типові
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Вивантажте зображення
newtab-wallpaper-custom-color = Виберіть колір
newtab-wallpaper-toggle-title =
    .label = Шпалери
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Зображення перевищує обмеження розміру файлу в { $file_size } МБ. Спробуйте вивантажити менший файл.
newtab-wallpaper-error-upload-file-type = Не вдалося вивантажити ваш файл. Повторіть спробу з файлом зображення.
newtab-wallpaper-error-file-type = Не вдалося вивантажити ваш файл. Повторіть спробу з іншим типом файлу.
newtab-wallpaper-light-red-panda = Червона панда
newtab-wallpaper-light-mountain = Біла гора
newtab-wallpaper-light-sky = Небо з фіолетовими та рожевими хмарами
newtab-wallpaper-light-color = Сині, рожеві та жовті фігури
newtab-wallpaper-light-landscape = Гірський пейзаж із блакитним туманом
newtab-wallpaper-light-beach = Пляж з пальмою
newtab-wallpaper-dark-aurora = Північне сяйво
newtab-wallpaper-dark-color = Червоні та сині фігури
newtab-wallpaper-dark-panda = Червона панда, що ховається в лісі
newtab-wallpaper-dark-sky = Міський пейзаж з нічним небом
newtab-wallpaper-dark-mountain = Гірський краєвид
newtab-wallpaper-dark-city = Фіолетовий міський пейзаж
newtab-wallpaper-dark-fox-anniversary = Лисиця на тротуарі біля лісу
newtab-wallpaper-light-fox-anniversary = Лисиця в трав'янистому полі з туманним гірським ландшафтом

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Суцільні кольори
newtab-wallpaper-blue = Синій
newtab-wallpaper-light-blue = Блакитний
newtab-wallpaper-light-purple = Світло-пурпуровий
newtab-wallpaper-light-green = Світло-зелений
newtab-wallpaper-green = Зелений
newtab-wallpaper-beige = Бежевий
newtab-wallpaper-yellow = Жовтий
newtab-wallpaper-orange = Помаранчевий
newtab-wallpaper-pink = Рожевий
newtab-wallpaper-light-pink = Світло-рожевий
newtab-wallpaper-red = Червоний
newtab-wallpaper-dark-blue = Темно-синій
newtab-wallpaper-dark-purple = Темно-пурпуровий
newtab-wallpaper-dark-green = Темно-зелений
newtab-wallpaper-brown = Коричневий

## Abstract

newtab-wallpaper-category-title-abstract = Абстракція
newtab-wallpaper-abstract-green = Зелені форми
newtab-wallpaper-abstract-blue = Сині форми
newtab-wallpaper-abstract-purple = Фіолетові форми
newtab-wallpaper-abstract-orange = Помаранчеві форми
newtab-wallpaper-gradient-orange = Градієнт помаранчевого і рожевого
newtab-wallpaper-abstract-blue-purple = Сині та пурпурові форми
newtab-wallpaper-abstract-white-curves = Білий із заштрихованими кривими
newtab-wallpaper-abstract-purple-green = Фіолетовий і зелений світловий градієнт
newtab-wallpaper-abstract-blue-purple-waves = Сині та фіолетові хвилясті форми
newtab-wallpaper-abstract-black-waves = Чорні хвилясті форми

## Firefox

newtab-wallpaper-category-title-photographs = Фотографії
newtab-wallpaper-beach-at-sunrise = Пляж на сході сонця
newtab-wallpaper-beach-at-sunset = Пляж на заході сонця
newtab-wallpaper-storm-sky = Грозове небо
newtab-wallpaper-sky-with-pink-clouds = Небо з рожевими хмарами
newtab-wallpaper-red-panda-yawns-in-a-tree = Червона панда позіхає на дереві
newtab-wallpaper-white-mountains = Білі гори
newtab-wallpaper-hot-air-balloons = Різні кольори повітряних куль протягом дня
newtab-wallpaper-starry-canyon = Синя зоряна ніч
newtab-wallpaper-suspension-bridge = Фотографія сірого підвісного мосту вдень
newtab-wallpaper-sand-dunes = Білі піщані дюни
newtab-wallpaper-palm-trees = Силует кокосових пальм у час золотої години
newtab-wallpaper-blue-flowers = Фотографія блакитних квітів у розквіті
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Фото від <a data-l10n-name="name-link">{ $author_string }</a> з <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Спробуйте сплеск кольорів
newtab-wallpaper-feature-highlight-content = Надайте своїй новій вкладці свіжий вигляд за допомогою шпалер.
newtab-wallpaper-feature-highlight-button = Зрозуміло
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Відхилити
    .aria-label = Закрити спливне вікно
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Небесний
newtab-wallpaper-celestial-lunar-eclipse = Місячне затемнення
newtab-wallpaper-celestial-earth-night = Нічне фото з низької навколоземної орбіти
newtab-wallpaper-celestial-starry-sky = Зоряне небо
newtab-wallpaper-celestial-eclipse-time-lapse = Хронометраж місячного затемнення
newtab-wallpaper-celestial-black-hole = Ілюстрація галактики з чорною дірою
newtab-wallpaper-celestial-river = Супутниковий знімок річки

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Дивіться прогноз у { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Спонсоровано
newtab-weather-menu-change-location = Змінити розташування
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Пошук розташування
    .aria-label = Пошук розташування
newtab-weather-menu-weather-display = Подання погоди
newtab-weather-todays-forecast = Прогноз на сьогодні
newtab-weather-see-full-forecast = Переглянути повний прогноз
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Просте
newtab-weather-menu-change-weather-display-simple = Перемкнути на просте подання
newtab-weather-menu-weather-display-option-detailed = Подробиці
newtab-weather-menu-change-weather-display-detailed = Перемкнути на подання з подробицями
newtab-weather-menu-temperature-units = Одиниці вимірювання температури
newtab-weather-menu-temperature-option-fahrenheit = Градуси Фаренгейта
newtab-weather-menu-temperature-option-celsius = Градуси Цельсія
newtab-weather-menu-change-temperature-units-fahrenheit = Перемкнути на градуси Фаренгейта
newtab-weather-menu-change-temperature-units-celsius = Перемкнути на градуси Цельсія
newtab-weather-menu-hide-weather = Сховати погоду на новій вкладці
newtab-weather-menu-learn-more = Докладніше
newtab-weather-menu-detect-my-location = Визначити моє розташування
# This message is shown if user is working offline
newtab-weather-error-not-available = Дані про погоду зараз недоступні.
newtab-weather-opt-in-see-weather = Хочете бачити погоду для вашого розташування?
newtab-weather-opt-in-not-now =
    .label = Не зараз
newtab-weather-opt-in-yes =
    .label = Так
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Нью-Йорк
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Дивіться прогноз у { $provider }
    .aria-description = { $provider } ∙ Спонсоровано

## Topic Labels

newtab-topic-label-business = Бізнес
newtab-topic-label-career = Кар'єра
newtab-topic-label-education = Навчання
newtab-topic-label-arts = Розваги
newtab-topic-label-food = Їжа
newtab-topic-label-health = Здоров'я
newtab-topic-label-hobbies = Ігри
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Гроші
newtab-topic-label-society-parenting = Батьківство
newtab-topic-label-government = Політика
newtab-topic-label-education-science = Наука
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Корисні поради
newtab-topic-label-sports = Спорт
newtab-topic-label-tech = Технології
newtab-topic-label-travel = Подорожі
newtab-topic-label-home = Дім і сад

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Виберіть теми, щоб налаштувати свій канал
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Оберіть принаймні дві теми. Наші досвідчені куратори підбирають матеріали відповідно до ваших інтересів. Оновлюйте коли завгодно.
newtab-topic-selection-save-button = Зберегти
newtab-topic-selection-cancel-button = Скасувати
newtab-topic-selection-button-maybe-later = Можливо, пізніше
newtab-topic-selection-privacy-link = Дізнайтеся, як ми захищаємо дані та керуємо ними
newtab-topic-selection-button-update-interests = Оновіть свої інтереси
newtab-topic-selection-button-pick-interests = Виберіть свої інтереси

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Читати
newtab-section-following-button = Ви читаєте
newtab-section-unfollow-button = Відписатися
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Налаштуйте свою стрічку
newtab-section-follow-highlight-subtitle = Слідкуйте за своїми інтересами, щоб бачити більше того, що вам подобається.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Блокувати
newtab-section-blocked-button = Заблоковано
newtab-section-unblock-button = Розблокувати

## Confirmation modal for blocking a section

newtab-section-cancel-button = Не зараз
newtab-section-confirm-block-topic-p1 = Ви дійсно хочете заблокувати цю тему?
newtab-section-confirm-block-topic-p2 = Заблоковані теми більше не з'являтимуться у вашій стрічці.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Заблокувати { $topic }

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Теми
newtab-section-manage-topics-button-v2 =
    .label = Керувати темами
newtab-section-mangage-topics-followed-topics = Відстежується
newtab-section-mangage-topics-followed-topics-empty-state = Ви ще не стежите за жодною темою.
newtab-section-mangage-topics-blocked-topics = Заблоковано
newtab-section-mangage-topics-blocked-topics-empty-state = Ви ще не заблокували жодної теми.
newtab-custom-wallpaper-title = Користувацькі шпалери
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Вивантажте власне зображення або виберіть особливий колір, щоб персоналізувати { -brand-product-name }.
newtab-custom-wallpaper-cta = Спробувати

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Оберіть шпалери, щоб персоналізувати { -brand-product-name }
newtab-new-user-custom-wallpaper-subtitle = Персоналізуйте кожну нову вкладку завдяки власним шпалерам і кольорам.
newtab-new-user-custom-wallpaper-cta = Спробувати зараз

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Завантажте { -brand-product-name } для мобільних пристроїв
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Скануйте код, щоб безпечно переглядати вебсторінки в дорозі.
newtab-download-mobile-highlight-body-variant-b = Продовжуйте з того місця, де зупинилися, синхронізуючи вкладки, паролі тощо.
newtab-download-mobile-highlight-body-variant-c = Чи знаєте ви, що { -brand-product-name } можна використовувати де б ви не були? Той самий браузер у вашій кишені.
newtab-download-mobile-highlight-image =
    .aria-label = QR-код для завантаження { -brand-product-name } для мобільних пристроїв

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Ваші закладки завжди під рукою
newtab-shortcuts-highlight-subtitle = Додайте ярлик, щоб мати миттєвий доступ до своїх улюблених сайтів.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Чому ви повідомляєте про це?
newtab-report-ads-reason-not-interested =
    .label = Мене це не цікавить
newtab-report-ads-reason-inappropriate =
    .label = Це недоречно
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Показується занадто часто
newtab-report-content-wrong-category =
    .label = Невідповідна категорія
newtab-report-content-outdated =
    .label = Застаріле
newtab-report-content-inappropriate-offensive =
    .label = Недоречно або образливо
newtab-report-content-spam-misleading =
    .label = Спам або введення в оману
newtab-report-content-requires-payment-subscription =
    .label = Потрібна оплата або передплата
newtab-report-content-requires-payment-subscription-learn-more = Докладніше
newtab-report-cancel = Скасувати
newtab-report-submit = Надіслати
newtab-toast-thanks-for-reporting =
    .message = Дякуємо, що повідомили про це.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Можливості безмежні. Додайте ще.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Нове
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Завершено ({ $number })
newtab-widget-task-list-menu-copy = Копіювати
newtab-widget-lists-menu-edit = Редагувати назву списку
newtab-widget-lists-menu-edit2 =
    .aria-label = Редагувати назву списку
newtab-widget-lists-menu-create = Створити новий список
newtab-widget-lists-menu-delete = Видалити цей список
newtab-widget-lists-menu-copy = Копіювати список до буфера обміну
newtab-widget-lists-menu-learn-more = Докладніше
newtab-widget-lists-button-add-item = Додати запис
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Додати запис
    .aria-label = Додати запис
newtab-widget-lists-input-error = Введіть текст, щоб додати запис
newtab-widget-lists-input-menu-open-link = Відкрити посилання
newtab-widget-lists-input-menu-move-up = Посунути вгору
newtab-widget-lists-input-menu-move-down = Посунути вниз
newtab-widget-lists-input-menu-delete = Видалити
newtab-widget-lists-input-menu-edit = Редагувати
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Створити новий список
newtab-widget-lists-name-label-default =
    .label = Список завдань
newtab-widget-lists-name-placeholder-default =
    .placeholder = Список завдань
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Новий список
    .aria-label = Редагувати назву списку
newtab-widget-section-title = Віджети
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Приховати віджети
    .aria-label = Приховати всі віджети
newtab-widget-section-maximize =
    .title = Розгорнути віджети
    .aria-label = Розгорнути всі віджети до повного розміру
newtab-widget-section-minimize =
    .title = Згорнути віджети
    .aria-label = Згорнути всі віджети до компактного розміру
newtab-widget-section-menu-manage = Керувати віджетами

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Таймер
newtab-widget-timer-notification-focus = Час зосередження вичерпано. Гарна робота. Потрібна перерва?
newtab-widget-timer-notification-break = Ваша перерва закінчилася. Готові зосередитися?
newtab-widget-timer-notification-warning = Сповіщення вимкнено
newtab-widget-timer-mode-focus =
    .label = Зосередження
newtab-widget-timer-mode-break =
    .label = Перерва
newtab-widget-timer-label-play =
    .label = Відтворити
newtab-widget-timer-label-pause =
    .label = Призупинити
newtab-widget-timer-reset =
    .title = Скинути
newtab-widget-timer-menu-notifications = Вимкнути сповіщення
newtab-widget-timer-menu-notifications-on = Увімкнути сповіщення
newtab-widget-timer-menu-learn-more = Докладніше
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Найпопулярніші заголовки
newtab-daily-briefing-card-menu-dismiss = Відхилити
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Оновлено { $minutes } хв. тому
newtab-widget-message-title = Будьте зосередженими завдяки спискам і вбудованому таймеру
# to-dos stands for "things to do".
newtab-widget-message-copy = Миттєві нагадування, щоденні справи, сеанси зосередження і перерви – контролюйте свої завдання і виконуйте їх вчасно.
newtab-promo-card-title = Підтримка { -brand-product-name }
newtab-promo-card-body = Наші спонсори підтримують нашу місію зі створення кращого інтернету
newtab-promo-card-cta = Докладніше
newtab-promo-card-dismiss-button =
    .title = Відхилити
    .aria-label = Відхилити

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Відхилити
    .aria-label = Відхилити
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Персоналізуйте цей простір
newtab-activation-window-message-customization-focus-message = Оберіть нові шпалери, додайте ярлики до улюблених сайтів і будьте в курсі новин, які вас цікавлять.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Почати налаштування
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Цей простір відповідає вашим вимогам
newtab-activation-window-message-values-focus-message = { -brand-product-name } дає вам можливість користуватись інтернетом так, як вам подобається, завдяки засобам персоналізації. Налаштуйте { -brand-product-name } відповідно до своїх потреб.
