# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Жаңа бет
newtab-settings-button =
    .title = Жаңа бетті баптаңыз
newtab-customize-panel-icon-button =
    .title = Бұл бетті баптау
newtab-customize-panel-icon-button-label = Баптау
newtab-personalize-settings-icon-label =
    .title = Жаңа бетті жекелендіру
    .aria-label = Баптаулар
newtab-settings-dialog-label =
    .aria-label = Баптаулар
newtab-personalize-icon-label =
    .title = Жаңа бетті жекелендіру
    .aria-label = Жаңа бетті жекелендіру
newtab-personalize-dialog-label =
    .aria-label = Жекелендіру
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Елемеу
    .aria-label = Елемеу

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Іздеу
    .aria-label = Іздеу
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = { $engine } көмегімен іздеу немесе адрес
newtab-search-box-handoff-text-no-engine = Іздеу немесе адрес
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = { $engine } көмегімен іздеу немесе адрес
    .title = { $engine } көмегімен іздеу немесе адрес
    .aria-label = { $engine } көмегімен іздеу немесе адрес
newtab-search-box-handoff-input-no-engine =
    .placeholder = Іздеу немесе адрес
    .title = Іздеу немесе адрес
    .aria-label = Іздеу немесе адрес
newtab-search-box-text = Интернетте іздеу
newtab-search-box-input =
    .placeholder = Интернетте іздеу
    .aria-label = Интернетте іздеу

## Top Sites - General form dialog.

newtab-topsites-add-search-engine-header = Іздеу жүйесін қосу
newtab-topsites-add-shortcut-header = Жаңа жарлық
newtab-topsites-edit-topsites-header = Топ сайтын түзету
newtab-topsites-edit-shortcut-header = Жарлықты түзету
newtab-topsites-add-shortcut-label = Жарлықты қосу
newtab-topsites-add-shortcut-title =
    .title = Жарлықты қосу
    .aria-label = Жарлықты қосу
newtab-topsites-title-label = Атауы
newtab-topsites-title-input =
    .placeholder = Атауын енгізіңіз
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Сілтемені теріңіз немесе кірістіріңіз
newtab-topsites-url-validation = Жарамды сілтеме керек
newtab-topsites-image-url-label = Өз суреттің URL адресі
newtab-topsites-use-image-link = Таңдауыңызша суретті қолдану…
newtab-topsites-image-validation = Суретті жүктеу қатемен аяқталды. Басқа URL адресін қолданып көріңіз.

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Бас тарту
newtab-topsites-delete-history-button = Тарихтан өшіру
newtab-topsites-save-button = Сақтау
newtab-topsites-preview-button = Алдын-ала қарау
newtab-topsites-add-button = Қосу

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Бұл парақтың барлық кездесулерін шолу тарихыңыздан өшіруді қалайсыз ба?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Бұл әрекетті болдырмау мүмкін болмайды.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Демеуленген

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (бекітілген)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Мәзірді ашу
    .aria-label = Мәзірді ашу
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Өшіру
    .aria-label = Өшіру
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Мәзірді ашу
    .aria-label = { $title } үшін контекст мәзірін ашу
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Бұл сайтты түзету
    .aria-label = Бұл сайтты түзету

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Түзету
newtab-menu-open-new-window = Жаңа терезеде ашу
newtab-menu-open-new-private-window = Жаңа жекелік терезесінде ашу
newtab-menu-dismiss = Тайдыру
newtab-menu-pin = Бекіту
newtab-menu-unpin = Бекітуді алып тастау
newtab-menu-delete-history = Тарихтан өшіру
newtab-menu-save-to-pocket = { -pocket-brand-name } ішіне сақтау
newtab-menu-delete-pocket = { -pocket-brand-name }-тен өшіру
newtab-menu-archive-pocket = { -pocket-brand-name }-те архивтеу
newtab-menu-show-privacy-info = Біздің демеушілеріміз және сіздің жекелігіңіз
newtab-menu-about-fakespot = { -fakespot-brand-name } туралы
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Хабарлау
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Блоктау
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Тақырыпқа жазылудан бас тарту

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Демеуші мазмұнын басқару
newtab-menu-our-sponsors-and-your-privacy = Біздің демеушілеріміз және сіздің жекелігіңіз
newtab-menu-report-this-ad = Бұл жарнаманы хабарлау

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Дайын
newtab-privacy-modal-button-manage = Демеуші мазмұн баптауларын басқару
newtab-privacy-modal-header = Сіздің жекелігіңіз маңызды.
newtab-privacy-modal-paragraph-2 =
    Қызықтыратын оқиғаларды сақтаумен қоса, біз сізге таңдамалы демеушілер
    ұсынған, тексерілген мазмұнды көрсетеміз. <strong>Шолу деректеріңіз сіздің жеке 
    { -brand-product-name } көшірмесінен ешқайда кетпейтініне сенімді болыңыз</strong> 
    — оларға біз де, демеушілер де қол жеткізе алмайды.
newtab-privacy-modal-link = Жекелік қалай жұмыс істейтінін жаңа бетте қараңыз

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Бетбелгіні өшіру
# Bookmark is a verb here.
newtab-menu-bookmark = Бетбелгілерге қосу

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Жүктеу сілтемесін көшіріп алу
newtab-menu-go-to-download-page = Жүктеп алу парағына өту
newtab-menu-remove-download = Тарихтан өшіру

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Finder ішінен көрсету
       *[other] Орналасқан бумасын ашу
    }
newtab-menu-open-file = Файлды ашу

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Қаралған
newtab-label-bookmarked = Бетбелгілерде
newtab-label-removed-bookmark = Бетбелгі өшірілді
newtab-label-recommended = Әйгілі
newtab-label-saved = { -pocket-brand-name }-ке сақталған
newtab-label-download = Жүктеп алынған
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Демеушілік
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = { $sponsor } демеушісінен
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } мин
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Демеуленген

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Санатты өшіру
newtab-section-menu-collapse-section = Санатты бүктеу
newtab-section-menu-expand-section = Санатты жазық қылу
newtab-section-menu-manage-section = Санатты басқару
newtab-section-menu-manage-webext = Кеңейтуді басқару
newtab-section-menu-add-topsite = Үздік сайт қосу
newtab-section-menu-add-search-engine = Іздеу жүйесін қосу
newtab-section-menu-move-up = Жоғары жылжыту
newtab-section-menu-move-down = Төмен жылжыту
newtab-section-menu-privacy-notice = Жекелік ескертуі

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Санатты бүктеу
newtab-section-expand-section-label =
    .aria-label = Санатты жазық қылу

## Section Headers.

newtab-section-header-topsites = Үздік сайттар
newtab-section-header-recent-activity = Соңғы белсенділігі
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Ұсынушы { $provider }
newtab-section-header-stories = Ойландыратын оқиғалар
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Бүгінгі таңдаулар сіз үшін

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Шолуды бастаңыз, сіз жақында шолған немесе бетбелгілерге қосқан тамаша мақалалар, видеолар немесе басқа парақтардың кейбіреулері осында көрсетіледі.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Дайын. { $provider } ұсынған көбірек оқиғаларды алу үшін кейінірек тексеріңіз. Күте алмайсыз ба? Интернеттен көбірек тамаша оқиғаларды алу үшін әйгілі теманы таңдаңыз.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Дайын. Көбірек оқиғаларды алу үшін кейінірек тексеріңіз. Күте алмайсыз ба? Интернеттен көбірек тамаша оқиғаларды алу үшін әйгілі теманы таңдаңыз.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Барлығын оқып шықтыңыз!
newtab-discovery-empty-section-topstories-content = Көбірек оқиғаларды көру үшін кейінірек кіріңіз.
newtab-discovery-empty-section-topstories-try-again-button = Қайталап көру
newtab-discovery-empty-section-topstories-loading = Жүктелуде…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Қап! Бұл санатты жүктеуді аяқтауға сәл қалды, бірақ бітпеді.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Әйгілі тақырыптар:
newtab-pocket-new-topics-title = Көбірек оқиғаларды көргіңіз келе ме? { -pocket-brand-name } ұсынған келесі әйгілі темаларды қараңыз
newtab-pocket-more-recommendations = Көбірек ұсыныстар
newtab-pocket-learn-more = Көбірек білу
newtab-pocket-cta-button = { -pocket-brand-name }-ті алу
newtab-pocket-cta-text = Өзіңіз ұнатқан хикаяларды { -pocket-brand-name } ішіне сақтап, миіңізді тамаша оқумен толықтырыңыз.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } өнімі { -brand-product-name } отбасының мүшесі болып табылады
newtab-pocket-save = Сақтау
newtab-pocket-saved = Сақталған

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Осы сияқты көбірек
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Мен үшін емес
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Рахмет. Сіздің пікіріңіз бізге арнаңызды жақсартуға көмектеседі.
newtab-toast-dismiss-button =
    .title = Елемеу
    .aria-label = Елемеу

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Интернеттің ең жақсысын шолыңыз
newtab-pocket-onboarding-cta = { -pocket-brand-name } ең ақпараттандыратын, шабыттандыратын және сенімді мазмұнды тікелей { -brand-product-name } браузеріне жеткізу үшін жарияланымдардың алуан түрін зерттейді.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Қап, бұл құраманы жүктеу кезінде бірнәрсе қате кетті.
newtab-error-fallback-refresh-link = Қайталап көру үшін, бетті жаңартыңыз.

## Customization Menu

newtab-custom-shortcuts-title = Жарлықтар
newtab-custom-shortcuts-subtitle = Сіз сақтайтын немесе шолатын сайттар
newtab-custom-shortcuts-toggle =
    .label = Жарлықтар
    .description = Сіз сақтайтын немесе шолатын сайттар
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
       *[other] { $num } жол
    }
newtab-custom-sponsored-sites = Демеушілік жарлықтары
newtab-custom-pocket-title = { -pocket-brand-name } ұсынған
newtab-custom-pocket-subtitle = { -brand-product-name } отбасының мүшесі болып табылатын, { -pocket-brand-name } жетекшілік ететін тамаша құрама
newtab-custom-stories-toggle =
    .label = Ұсынылатын оқиғалар
    .description = { -brand-product-name } жетекшілік ететін тамаша құрама
newtab-custom-stories-personalized-toggle =
    .label = Әңгімелер
newtab-custom-stories-personalized-checkbox-label = Әрекетіңізге негізделген жекелендірілген хикаялар
newtab-custom-pocket-sponsored = Демеушілер мақалалары
newtab-custom-pocket-show-recent-saves = Соңғы сақтауларды көрсету
newtab-custom-recent-title = Жуырдағы белсенділік
newtab-custom-recent-subtitle = Жуырдағы сайттар мен құрама таңдауы
newtab-custom-weather-toggle =
    .label = Ауа райы
    .description = Бүгінге қысқа болжам
newtab-custom-widget-weather-toggle =
    .label = Ауа райы
newtab-custom-widget-lists-toggle =
    .label = Тізімдер
newtab-custom-widget-timer-toggle =
    .label = Таймер
newtab-custom-widget-section-title = Виджеттер
newtab-custom-widget-section-toggle =
    .label = Виджеттер
newtab-widget-manage-title = Виджеттер
newtab-widget-manage-widget-button =
    .label = Виджеттерді басқару
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Жабу
    .aria-label = Мәзірді жабу
newtab-custom-close-button = Жабу
newtab-custom-settings = Көбірек баптауларды басқару

## New Tab Wallpapers

newtab-wallpaper-title = Түсқағаздар
newtab-wallpaper-reset = Бастапқы түріне тастау
newtab-wallpaper-upload-image = Суретті жүктеп жіберу
newtab-wallpaper-custom-color = Түсті таңдау
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Сурет файл өлшемі шегінен { $file_size } МБ асып кетті. Шағындау файлды жүктеп салып көріңіз.
newtab-wallpaper-error-upload-file-type = Файлыңызды жүктеп жіберу мүмкін болмады. Сурет файлымен әрекетті қайталаңыз.
newtab-wallpaper-error-file-type = Файлыңызды жүктеп жіберу мүмкін болмады. Басқа файл түрімен әрекетті қайталаңыз.
newtab-wallpaper-light-red-panda = Қызыл панда
newtab-wallpaper-light-mountain = Ақ тау
newtab-wallpaper-light-sky = Күлгін және қызғылт бұлттары бар аспан
newtab-wallpaper-light-color = Көк, қызғылт және сары пішіндер
newtab-wallpaper-light-landscape = Көк тұман тау пейзажы
newtab-wallpaper-light-beach = Пальма ағашы бар жағажай
newtab-wallpaper-dark-aurora = Солтүстік шұғыласы
newtab-wallpaper-dark-color = Қызыл және көк пішіндер
newtab-wallpaper-dark-panda = Орманда жасырылған қызыл панда
newtab-wallpaper-dark-sky = Түнгі аспаны бар қала пейзажы
newtab-wallpaper-dark-mountain = Таулы пейзаж
newtab-wallpaper-dark-city = Күлгін қала пейзажы
newtab-wallpaper-dark-fox-anniversary = Орман жанындағы тротуардағы түлкі
newtab-wallpaper-light-fox-anniversary = Тұманды тау пейзажы бар шөпті алқаптағы түлкі

## Solid Colors

newtab-wallpaper-category-title-colors = Тұтас түстер
newtab-wallpaper-blue = Көк
newtab-wallpaper-light-blue = Ашық көк
newtab-wallpaper-light-purple = Ашық күлгін
newtab-wallpaper-light-green = Ашық жасыл
newtab-wallpaper-green = Жасыл
newtab-wallpaper-beige = Беж
newtab-wallpaper-yellow = Сары
newtab-wallpaper-orange = Қызғылт сары
newtab-wallpaper-pink = Қызғылт
newtab-wallpaper-light-pink = Ашық қызғылт
newtab-wallpaper-red = Қызыл
newtab-wallpaper-dark-blue = Қою көк
newtab-wallpaper-dark-purple = Қою күлгін
newtab-wallpaper-dark-green = Қою жасыл
newtab-wallpaper-brown = Қоңыр

## Abstract

newtab-wallpaper-category-title-abstract = Абстрактты
newtab-wallpaper-abstract-green = Жасыл пішіндер
newtab-wallpaper-abstract-blue = Көк пішіндер
newtab-wallpaper-abstract-purple = Күлгін пішіндер
newtab-wallpaper-abstract-orange = Қызғылт сары пішіндер
newtab-wallpaper-gradient-orange = Градиент қызғылт сары және қызғылт
newtab-wallpaper-abstract-blue-purple = Көк және күлгін пішіндер
newtab-wallpaper-abstract-white-curves = Көлеңкелі қисықтары бар ақ
newtab-wallpaper-abstract-purple-green = Күлгін және жасыл жарық градиенті
newtab-wallpaper-abstract-blue-purple-waves = Көк және күлгін толқынды пішіндер
newtab-wallpaper-abstract-black-waves = Қара толқынды пішіндер

## Firefox

newtab-wallpaper-category-title-photographs = Фотосуреттер
newtab-wallpaper-beach-at-sunrise = Күн шыққанда жағажай
newtab-wallpaper-beach-at-sunset = Күн батқанда жағажай
newtab-wallpaper-storm-sky = Дауылды аспан
newtab-wallpaper-sky-with-pink-clouds = Қызғылт бұлттары бар аспан
newtab-wallpaper-red-panda-yawns-in-a-tree = Қызыл панда ағашта есінейді
newtab-wallpaper-white-mountains = Ақ таулар
newtab-wallpaper-hot-air-balloons = Күндізгі ауа шарларының әртүрлі түсі
newtab-wallpaper-starry-canyon = Көк жұлдызды түн
newtab-wallpaper-suspension-bridge = Сұр түсті толық аспалы көпірдің күндізгі фотосуреті
newtab-wallpaper-sand-dunes = Ақ құмды төбелер
newtab-wallpaper-palm-trees = Алтын сағатта кокос пальмаларының сұлбасы
newtab-wallpaper-blue-flowers = Гүлдеп тұрған көк жапырақты гүлдердің жақын пландағы фотосуреті
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = <a data-l10n-name="webpage-link">{ $webpage_string }</a> ішіндегі <a data-l10n-name="name-link">{ $author_string }</a>  ұсынған фото
newtab-wallpaper-feature-highlight-header = Түстер шашырауын қолданып көріңіз
newtab-wallpaper-feature-highlight-content = Жаңа бетке тұсқағаздар арқылы жаңа көрініс беріңіз.
newtab-wallpaper-feature-highlight-button = Түсіндім
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Елемеу
    .aria-label = Қалқымалы терезені жабу
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Аспан
newtab-wallpaper-celestial-lunar-eclipse = Айдың тұтылуы
newtab-wallpaper-celestial-earth-night = Төменгі Жер орбитасынан түнгі сурет
newtab-wallpaper-celestial-starry-sky = Жұлдызды аспан
newtab-wallpaper-celestial-eclipse-time-lapse = Ай тұтылуының таймлапсы
newtab-wallpaper-celestial-black-hole = Қара құрдымы бар галактика суреті
newtab-wallpaper-celestial-river = Өзеннің жерсеріктік суреті

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = { $provider } ішінде болжамды қарау
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Демеушілік
newtab-weather-menu-change-location = Орналасуды ауыстыру
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Орналасуды іздеу
    .aria-label = Орналасуды іздеу
newtab-weather-menu-weather-display = Ауа райын көрсету
newtab-weather-todays-forecast = Бүгінгі ауа райы болжамы
newtab-weather-see-full-forecast = Толық ауа райы болжамын қарау
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Қарапайым
newtab-weather-menu-change-weather-display-simple = Қарапайым көрінісіне ауысу
newtab-weather-menu-weather-display-option-detailed = Толық ақпаратты
newtab-weather-menu-change-weather-display-detailed = Толық ақпаратты көрінісіне ауысу
newtab-weather-menu-temperature-units = Температураның өлшем бірліктері
newtab-weather-menu-temperature-option-fahrenheit = Фаренгейт
newtab-weather-menu-temperature-option-celsius = Цельсий
newtab-weather-menu-change-temperature-units-fahrenheit = Фаренгейтке ауысу
newtab-weather-menu-change-temperature-units-celsius = Цельсийге ауысу
newtab-weather-menu-hide-weather-v2 = Ауа райын жасыру
newtab-weather-menu-hide-weather = Жаңа бетте ауа райын жасыру
newtab-weather-menu-learn-more = Көбірек білу
newtab-weather-menu-detect-my-location = Менің орналасуымды анықтау
# This message is shown if user is working offline
newtab-weather-error-not-available = Ауа-райы деректері қазір қолжетімді емес.
newtab-weather-opt-in-see-weather = Орналасқан жеріңіздің ауа райын көргіңіз келе ме?
newtab-weather-opt-in-not-now =
    .label = Қазір емес
newtab-weather-opt-in-yes =
    .label = Иә
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Нью-Йорк
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = { $provider } ішінде болжамды қарау
    .aria-description = { $provider } ∙ Демеушілік

## Topic Labels

newtab-topic-label-business = Бизнес
newtab-topic-label-career = Мансап
newtab-topic-label-education = Білім алу
newtab-topic-label-arts = Ойын-сауық
newtab-topic-label-food = Тамақ
newtab-topic-label-health = Денсаулық
newtab-topic-label-hobbies = Ойын
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Ақша
newtab-topic-label-society-parenting = Тәрбие беру
newtab-topic-label-government = Саясат
newtab-topic-label-education-science = Ғылым
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Лайфхактар
newtab-topic-label-sports = Спорт
newtab-topic-label-tech = Техника
newtab-topic-label-travel = Саяхат
newtab-topic-label-home = Үй және бақша

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Таспаңызды дәл баптау үшін тақырыптарды таңдаңыз
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Екі немесе одан да көп тақырыпты таңдаңыз. Біздің сарапшы кураторлар сіздің қызығушылықтарыңызға бейімделген мақалаларға басымдық береді. Кез келген уақытта жаңартуға болады.
newtab-topic-selection-save-button = Сақтау
newtab-topic-selection-cancel-button = Бас тарту
newtab-topic-selection-button-maybe-later = Мүмкін, кейінірек
newtab-topic-selection-privacy-link = Деректерді қалай қорғайтынымызды және басқаратынымызды біліңіз
newtab-topic-selection-button-update-interests = Қызығушылықтарыңызды жаңартыңыз
newtab-topic-selection-button-pick-interests = Қызығушылықтарыңызды таңдаңыз

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Жазылу
newtab-section-following-button = Жазылғандар
newtab-section-unfollow-button = Жазылудан бас тарту
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Таспаңызды дәл баптаңыз
newtab-section-follow-highlight-subtitle = Өзіңізге ұнайтын нәрселерді көбірек көру үшін қызығушылықтарыңызға жазылыңыз.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Бұғаттау
newtab-section-blocked-button = Бұғатталған
newtab-section-unblock-button = Бұғаттаудан шығару

## Confirmation modal for blocking a section

newtab-section-cancel-button = Қазір емес
newtab-section-confirm-block-topic-p1 = Бұл тақырыпты шынымен блоктағыңыз келе ме?
newtab-section-confirm-block-topic-p2 = Блокталған тақырыптар сіздің таспаңызда енді көрсетілмейді.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = { $topic } блоктау

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Тақырыптар
newtab-section-manage-topics-button-v2 =
    .label = Темаларды басқару
newtab-section-mangage-topics-followed-topics = Жазылған
newtab-section-mangage-topics-followed-topics-empty-state = Сіз әлі ешқандай тақырыпқа жазылмадыңыз.
newtab-section-mangage-topics-blocked-topics = Бұғатталған
newtab-section-mangage-topics-blocked-topics-empty-state = Сіз әлі ешбір тақырыпты бұғаттаған жоқсыз.
newtab-custom-wallpaper-title = Жеке тұсқағаздар осында
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = { -brand-product-name } өз қалауыңызша баптау үшін жеке тұсқағазыңызды жүктеңіз немесе арнайы түс таңдаңыз.
newtab-custom-wallpaper-cta = Қолданып көру

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = { -brand-product-name } өз қалауыңызша баптау үшін тұсқағаз таңдаңыз
newtab-new-user-custom-wallpaper-subtitle = Арнайы тұсқағаздар мен түстердің көмегімен әрбір жаңа бетті өз үйіңіздей жайлы етіңіз.
newtab-new-user-custom-wallpaper-cta = Қазір қолданып көру

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Мобильді { -brand-product-name } жүктеп алу
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Интернетте қауіпсіз шолу үшін кодты сканерлеңіз.
newtab-download-mobile-highlight-body-variant-b = Беттерді, парольдерді және басқа да деректерді синхрондап, жұмысты үзілген жерінен жалғастырыңыз.
newtab-download-mobile-highlight-body-variant-c = { -brand-product-name } браузерін өзіңізбен бірге алып жүре алатыныңызды білдіңіз бе? Дәл сол браузер. Қалтаңызда.
newtab-download-mobile-highlight-image =
    .aria-label = Мобильді { -brand-product-name } жүктеп алу үшін QR коды

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Таңдаулыларыңыз әрқашан қол астында
newtab-shortcuts-highlight-subtitle = Таңдаулы сайттарыңызға бір рет басу арқылы кіру үшін жарлық қосыңыз.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Бұл туралы неге хабарлап отырсыз?
newtab-report-ads-reason-not-interested =
    .label = Маған бұл қызықты емес
newtab-report-ads-reason-inappropriate =
    .label = Бұл орынсыз
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Мен оны тым көп рет көрдім
newtab-report-content-wrong-category =
    .label = Қате санат
newtab-report-content-outdated =
    .label = Ескірген
newtab-report-content-inappropriate-offensive =
    .label = Орынсыз немесе қорлайтын
newtab-report-content-spam-misleading =
    .label = Спам немесе жаңылыстыру
newtab-report-content-requires-payment-subscription =
    .label = Төлем немесе жазылым қажет
newtab-report-content-requires-payment-subscription-learn-more = Көбірек білу
newtab-report-cancel = Бас тарту
newtab-report-submit = Жіберу
newtab-toast-thanks-for-reporting =
    .message = Бұл туралы хабарлағаныңыз үшін рахмет.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Мүмкіндіктер шексіз. Біреуін қосыңыз.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Жаңа
newtab-widget-lists-label-beta =
    .label = Бета
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Аяқталған ({ $number })
newtab-widget-task-list-menu-copy = Көшіріп алу
newtab-widget-lists-menu-edit = Тізім атауын түзету
newtab-widget-lists-menu-create = Жаңа тізімді жасау
newtab-widget-lists-menu-delete = Бұл тізімді өшіру
newtab-widget-lists-menu-copy = Тізімді алмасу буферіне көшіру
newtab-widget-lists-menu-hide = Барлық тізімдерді жасыру
newtab-widget-lists-menu-learn-more = Көбірек білу
newtab-widget-lists-input-add-an-item =
    .placeholder = Элементті қосу
newtab-widget-lists-input-error = Элемент қосу үшін мәтінді қосыңыз.
newtab-widget-lists-input-menu-open-link = Сілтемені ашу
newtab-widget-lists-input-menu-move-up = Жоғары жылжыту
newtab-widget-lists-input-menu-move-down = Төмен жылжыту
newtab-widget-lists-input-menu-delete = Өшіру
newtab-widget-lists-input-menu-edit = Түзету
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Жаңа тізімді жасау
newtab-widget-lists-name-label-default =
    .label = Тапсырмалар тізімі
newtab-widget-lists-name-placeholder-default =
    .placeholder = Тапсырмалар тізімі
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new =
    .placeholder = Жаңа тізім
newtab-widget-section-title = Виджеттер
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Виджеттерді жасыру
    .aria-label = Барлық виджеттерді жасыру
newtab-widget-section-maximize =
    .title = Виджеттерді жаю
    .aria-label = Барлық виджеттерді толық өлшеміне жаю
newtab-widget-section-minimize =
    .title = Виджеттерді ықшамдау
    .aria-label = Барлық виджеттерді ықшам өлшеміне дейін жинау

## Strings for timer productivity widget
## When the timer ends, a system notification may be shown. Depending on which mode the timer is in, that message would be shown

newtab-widget-timer-notification-title = Таймер
newtab-widget-timer-notification-focus = Фокустау уақыты аяқталды. Жақсы жұмыс. Үзіліс керек пе?
newtab-widget-timer-notification-break = Сіздің үзілісіңіз аяқталды. Фокустауға дайынсыз ба?
newtab-widget-timer-notification-warning = Хабарламалар сөндірулі
newtab-widget-timer-mode-focus =
    .label = Фокустау
newtab-widget-timer-mode-break =
    .label = Үзіліс
newtab-widget-timer-label-play =
    .label = Ойнату
newtab-widget-timer-label-pause =
    .label = Аялдату
newtab-widget-timer-reset =
    .title = Тастау
newtab-widget-timer-menu-notifications = Хабарламаларды сөндіру
newtab-widget-timer-menu-notifications-on = Хабарламаларды іске қосу
newtab-widget-timer-menu-hide = Таймерді жасыру
newtab-widget-timer-menu-learn-more = Көбірек білу
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Басты жаңалықтар
newtab-daily-briefing-card-menu-dismiss = Елемеу
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = { $minutes } минут бұрын жаңартылды
newtab-widget-message-title = Тізімдер мен кірістірілген таймер арқылы назарыңызды сақтаңыз
# to-dos stands for "things to do".
newtab-widget-message-copy = Жылдам еске салғыштардан күнделікті істер тізіміне дейін, зейін қою сессияларынан бой жазу үзілістеріне дейін — жұмыстан ауытқымай, уақытыңызды тиімді пайдаланыңыз.
newtab-promo-card-title = { -brand-product-name } қолдау
newtab-promo-card-body = Біздің демеушілеріміз жақсырақ интернет құру миссиямызға қолдау көрсетеді
newtab-promo-card-cta = Көбірек білу
newtab-promo-card-dismiss-button =
    .title = Елемеу
    .aria-label = Елемеу

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Елемеу
    .aria-label = Елемеу
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Бұл кеңістікті өзіңіздікі етіңіз
newtab-activation-window-message-customization-focus-message = Жаңа тұсқағаз таңдаңыз, таңдамалы сайттарыңызға сілтемелер қосыңыз және сізді қызықтыратын оқиғалардан хабардар болып отырыңыз.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Баптауды бастау
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Бұл кеңістік сіздің ережелеріңіз бойынша ойнайды
newtab-activation-window-message-values-focus-message = { -brand-product-name } көмегімен интернеттегі жұмысыңызды өзіңізге ыңғайлы стильде бастаңыз. { -brand-product-name } интерфейсін өзіңізге бейімдеп, оны бірегей етіңіз.
