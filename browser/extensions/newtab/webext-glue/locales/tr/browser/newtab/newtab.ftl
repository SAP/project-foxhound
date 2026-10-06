# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Yeni Sekme
newtab-settings-button =
    .title = Yeni Sekme sayfanızı özelleştirin
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Bu sayfayı özelleştir
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Özelleştir
newtab-customize-panel-label =
    .label = Özelleştir
newtab-personalize-settings-icon-label =
    .title = Yeni sekmeyi kişiselleştir
    .aria-label = Ayarlar
newtab-settings-dialog-label =
    .aria-label = Ayarlar
newtab-personalize-icon-label =
    .title = Yeni sekmeyi kişiselleştir
    .aria-label = Yeni sekmeyi kişiselleştir
newtab-personalize-dialog-label =
    .aria-label = Kişiselleştir
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Kapat
    .aria-label = Kapat

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Giriş sayfası
home-homepage-new-windows =
    .label = Yeni pencereler
home-homepage-new-tabs =
    .label = Yeni sekmeler
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Belirli bir site seç

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Web sitesi adres(ler)i
home-custom-homepage-address =
    .placeholder = Adres yazın
home-custom-homepage-address-button =
    .label = Adres ekle
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Henüz hiç site eklenmedi.
home-custom-homepage-delete-address-button =
    .aria-label = Adresi sil
    .title = Adresi sil
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Bununla değiştir:
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Şu anda açık olan sayfalar
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Yer imleri…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Arama
home-prefs-stories-header2 =
    .label = Haberler
    .description = { -brand-product-name } ailesinin seçtiği harika içerikler
home-prefs-widgets-header =
    .label = Araçlar
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Listeler
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Sayaç
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Spor
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Saat
home-prefs-mission-message2 =
    .message = Sponsorlarımız daha iyi bir web inşa etme misyonumuzu destekliyor.
home-prefs-manage-topics-link2 =
    .label = Konuları yönet
home-prefs-choose-wallpaper-link2 =
    .label = Duvar kâğıdı seç
home-prefs-firefox-logo-header =
    .label = { -brand-short-name } logosu
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Bu özellikleri kullanmak için yeni sekme veya yeni pencere ayarınızı { -firefox-home-brand-name } olarak değiştirmelisiniz.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } satır
           *[other] { $num } satır
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Uzantı ({ $extension })
home-restore-defaults-srd =
    .label = Varsayılanları geri yükle
    .accesskey = R
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (Varsayılan)
home-mode-choice-custom-srd =
    .label = Özel adresler…
home-mode-choice-blank-srd =
    .label = Boş sayfa
home-prefs-shortcuts-header-srd =
    .label = Kısayollar
home-prefs-shortcuts-select =
    .aria-label = Kısayollar
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Sponsorlu kısayollar
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Sponsorlu haberler
home-prefs-highlights-option-visited-pages-srd =
    .label = Ziyaret ettiğim sayfalar
home-prefs-highlights-options-bookmarks-srd =
    .label = Yer imleri
home-prefs-highlights-option-most-recent-download-srd =
    .label = Son indirme
home-prefs-recent-activity-header-srd =
    .label = Son etkinlikler
home-prefs-recent-activity-select =
    .aria-label = Son etkinlikler
home-prefs-weather-header-srd =
    .label = Hava durumu
home-prefs-support-firefox-header-srd =
    .label = { -brand-product-name } tarayıcısını destekleyin
home-prefs-mission-message-learn-more-link-srd = Nasıl mı?

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Ara
    .aria-label = Ara
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = { $engine } ile arama yapın veya adres yazın
newtab-search-box-handoff-text-no-engine = Arama yapın veya adres yazın
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = { $engine } ile arama yapın veya adres yazın
    .title = { $engine } ile arama yapın veya adres yazın
    .aria-label = { $engine } ile arama yapın veya adres yazın
newtab-search-box-handoff-input-no-engine =
    .placeholder = Arama yapın veya adres yazın
    .title = Arama yapın veya adres yazın
    .aria-label = Arama yapın veya adres yazın
newtab-search-box-text = Web’de ara
newtab-search-box-input =
    .placeholder = Web’de ara
    .aria-label = Web’de ara

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Arama motoru ekle
newtab-topsites-add-shortcut-header = Yeni kısayol
newtab-topsites-edit-topsites-header = Sık kullanılan siteyi düzenle
newtab-topsites-edit-shortcut-header = Kısayolu düzenle
newtab-topsites-add-shortcut-label = Kısayol ekle
newtab-topsites-add-shortcut-title =
    .title = Kısayol ekle
    .aria-label = Kısayol ekle
newtab-topsites-title-label = Başlık
newtab-topsites-title-input =
    .placeholder = Başlık yazın
newtab-topsites-url-label = Adres
newtab-topsites-url-input =
    .placeholder = Adres yazın veya yapıştırın
newtab-topsites-url-validation = Geçerli bir adres gerekli
newtab-topsites-image-url-label = Özel resim adresi
newtab-topsites-use-image-link = Özel resim kullan…
newtab-topsites-image-validation = Resim yüklenemedi. Başka bir adres deneyin.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Metni temizle

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Vazgeç
newtab-topsites-delete-history-button = Geçmişten sil
newtab-topsites-save-button = Kaydet
newtab-topsites-preview-button = Ön izleme yap
newtab-topsites-add-button = Ekle

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Bu sayfanın tüm kayıtlarını geçmişinizden silmek istediğinizden emin misiniz?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Bu işlem geri alınamaz.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Sponsorlu

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (sabitlendi)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Menüyü aç
    .aria-label = Menüyü aç
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Kaldır
    .aria-label = Kaldır
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Menüyü aç
    .aria-label = { $title } sağ tıklama menüsünü aç
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Bu siteyi düzenle
    .aria-label = Bu siteyi düzenle

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Düzenle
newtab-menu-open-new-window = Yeni pencerede aç
newtab-menu-open-new-private-window = Yeni gizli pencerede aç
newtab-menu-dismiss = Kapat
newtab-menu-pin = Sabitle
newtab-menu-unpin = Sabitleneni kaldır
newtab-menu-delete-history = Geçmişten sil
newtab-menu-save-to-pocket = { -pocket-brand-name }’a kaydet
newtab-menu-delete-pocket = { -pocket-brand-name }’tan sil
newtab-menu-archive-pocket = { -pocket-brand-name }’ta arşivle
newtab-menu-show-privacy-info = Sponsorlarımız ve gizliliğiniz
newtab-menu-about-fakespot = { -fakespot-brand-name } hakkında
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Raporla
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Engelle
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Takibi bırak
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Daha fazla bilgi al
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Konuyu takip etmeyi bırak

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Sponsorlu içerikleri yönet
newtab-menu-our-sponsors-and-your-privacy = Sponsorlarımız ve gizliliğiniz
newtab-menu-report-this-ad = Bu reklamı rapor et

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Tamam
newtab-privacy-modal-button-manage = Sponsorlu içerik ayarlarını yönet
newtab-privacy-modal-header = Gizliliğiniz bizim için önemli.
newtab-privacy-modal-paragraph-2 = İlginizi çekebilecek yazıların yanı sıra seçkin sponsorlarımızdan gelen bazı içerikleri de gösteriyoruz. Gezinti verileriniz <strong>asla bilgisayarınızdaki { -brand-product-name } kurulumunun dışına çıkmıyor</strong>: Hangi sitelere girdiğinizi ne biz görüyoruz ne de sponsorlarımız.
newtab-privacy-modal-link = Yeni sekmede gizliliğinizi nasıl koruduğumuzu öğrenin

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Yer imini sil
# Bookmark is a verb here.
newtab-menu-bookmark = Yer imlerine ekle

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = İndirme bağlantısını kopyala
newtab-menu-go-to-download-page = İndirme sayfasına git
newtab-menu-remove-download = Geçmişten kaldır

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Finder’da göster
       *[other] Bulunduğu klasörü aç
    }
newtab-menu-open-file = Dosyayı aç

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Ziyaret etmiştiniz
newtab-label-bookmarked = Yer imlerinizde
newtab-label-removed-bookmark = Yer imi silindi
newtab-label-recommended = Popüler
newtab-label-saved = { -pocket-brand-name }’a kaydedildi
newtab-label-download = İndirildi
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Sponsorlu
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = { $sponsor } sponsorluğunda
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } dk
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Sponsorlu

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Bölümü kaldır
newtab-section-menu-collapse-section = Bölümü daralt
newtab-section-menu-expand-section = Bölümü genişlet
newtab-section-menu-manage-section = Bölümü yönet
newtab-section-menu-manage-webext = Uzantıyı yönet
newtab-section-menu-add-topsite = Sık kullanılan site ekle
newtab-section-menu-add-search-engine = Arama motoru ekle
newtab-section-menu-move-up = Yukarı taşı
newtab-section-menu-move-down = Aşağı taşı
newtab-section-menu-privacy-notice = Gizlilik bildirimi

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Bölümü daralt
newtab-section-expand-section-label =
    .aria-label = Bölümü genişlet

## Section Headers.

newtab-section-header-topsites = Sık Kullanılan Siteler
newtab-section-header-recent-activity = Son etkinlikler
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = { $provider } öneriyor
newtab-section-header-stories = Merak uyandıran makaleler
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Bugün sizin için seçtiklerimiz

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Gezinmeye başlayın. Son zamanlarda baktığınız veya yer imlerinize eklediğiniz bazı güzel makaleleri, videoları ve diğer sayfaları burada göstereceğiz.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Hepsini bitirdiniz. Yeni { $provider } yazıları için yine gelin. Beklemek istemiyor musunuz? İlginç yazılara ulaşmak için popüler konulardan birini seçebilirsiniz.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Hepsini bitirdiniz. Yeni yazılar için daha sonra yine gelin. Beklemek istemiyor musunuz? İlginç yazılara ulaşmak için popüler konulardan birini seçebilirsiniz.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Hepsini bitirdiniz!
newtab-discovery-empty-section-topstories-content = Daha fazla yazı için daha sonra yine gelin.
newtab-discovery-empty-section-topstories-try-again-button = Tekrar dene
newtab-discovery-empty-section-topstories-loading = Yükleniyor…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Hata! Bu bölüm tam olarak yüklenemedi.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Popüler konular:
newtab-pocket-new-topics-title = Daha fazla içeriğe ne dersiniz? { -pocket-brand-name }’taki popüler konulara göz atın
newtab-pocket-more-recommendations = Daha fazla öneri
newtab-pocket-learn-more = Daha fazla bilgi al
newtab-pocket-cta-button = { -pocket-brand-name }’ı edinin
newtab-pocket-cta-text = Sevdiğiniz yazıları { -pocket-brand-name }’a kaydedin, aklınızı okumaya değer şeylerle doldurun.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name }, { -brand-product-name } ailesinin bir parçasıdır
newtab-pocket-save = Kaydet
newtab-pocket-saved = Kaydedildi

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Bunun gibi daha fazla
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Bana göre değil
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Teşekkürler. Geri bildiriminiz akışınızı geliştirmemize yardımcı olacak.
newtab-toast-dismiss-button =
    .title = Kapat
    .aria-label = Kapat

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Web’deki en iyi içerikleri keşfedin
newtab-pocket-onboarding-cta = { -pocket-brand-name }, çeşitli yayınları tarayarak en bilgilendirici, ilham verici ve güvenilir içerikleri doğrudan { -brand-product-name } tarayıcınıza getiriyor.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Bu içerik yüklenirken bir hata oluştu.
newtab-error-fallback-refresh-link = Yeniden denemek için sayfayı tazeleyin.

## Customization Menu

newtab-custom-shortcuts-title = Kısayollar
newtab-custom-shortcuts-subtitle = Kaydettiğiniz veya ziyaret ettiğiniz siteler
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Kısayollar
    .description = Kaydettiğiniz veya ziyaret ettiğiniz siteler
newtab-custom-shortcuts-nova =
    .label = Kısayollar
newtab-custom-row-description =
    .description = Satır sayısı
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } satır
           *[other] { $num } satır
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } satır
       *[other] { $num } satır
    }
newtab-custom-sponsored-sites = Sponsorlu kısayollar
newtab-custom-pocket-title = { -pocket-brand-name } önerileri
newtab-custom-pocket-subtitle = { -brand-product-name } ailesinin bir parçası olan { -pocket-brand-name }’ın seçtiği harika içerikler
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Önerilen makaleler
    .description = { -brand-product-name } ailesinin seçtiği harika içerikler
newtab-recommended-stories-toggle =
    .label = Önerilen makaleler
newtab-custom-stories-personalized-toggle =
    .label = Haberler
newtab-custom-stories-personalized-checkbox-label = Etkinliğinize göre kişiselleştirilmiş haberler
newtab-custom-pocket-sponsored = Sponsorlu haberler
newtab-custom-pocket-show-recent-saves = Son kaydedilenleri göster
newtab-custom-recent-title = Son etkinlikler
newtab-custom-recent-subtitle = Son kullanılan siteler ve içeriklerden bir seçki
newtab-custom-weather-toggle =
    .label = Hava durumu
    .description = Bugünkü hava durumu tahmini
newtab-custom-widget-weather-toggle =
    .label = Hava durumu
newtab-custom-widget-lists-toggle =
    .label = Listeler
newtab-custom-widget-timer-toggle =
    .label = Sayaç
newtab-custom-widget-sports-toggle =
    .label = Dünya Kupası
newtab-custom-widget-clock-toggle =
    .label = Saat
newtab-custom-widget-sports-toggle2 =
    .label = Spor
newtab-custom-widget-section-title = Araçlar
newtab-custom-widget-section-toggle =
    .label = Araçlar
newtab-widget-manage-title = Araçlar
newtab-widget-manage-widget-button =
    .label = Araçları yönet
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Kapat
    .aria-label = Menüyü kapat
newtab-custom-close-button = Kapat
newtab-custom-settings = Diğer ayarları yönet

## New Tab Wallpapers

newtab-wallpaper-title = Duvar kâğıtları
newtab-wallpaper-reset = Varsayılana sıfırla
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Resim yükle
newtab-wallpaper-add-an-image = Resim ekle
newtab-wallpaper-custom-color = Renk seç
newtab-wallpaper-toggle-title =
    .label = Duvar kâğıtları
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Bu resim, izin verilen { $file_size } MB boyut sınırını aşıyor. Lütfen daha küçük bir dosya yüklemeyi deneyin.
newtab-wallpaper-error-upload-file-type = Dosyanızı yükleyemedik. Lütfen bir resim dosyasıyla yeniden deneyin.
newtab-wallpaper-error-file-type = Dosyanızı yükleyemedik. Lütfen farklı bir dosya türüyle tekrar deneyin.
newtab-wallpaper-light-red-panda = Kızıl panda
newtab-wallpaper-light-mountain = Beyaz dağ
newtab-wallpaper-light-sky = Mor ve pembe bulutlu gökyüzü
newtab-wallpaper-light-color = Mavi, pembe ve sarı şekiller
newtab-wallpaper-light-landscape = Mavi sisli dağ manzarası
newtab-wallpaper-light-beach = Palmiye ağaçlı sahil
newtab-wallpaper-dark-aurora = Aurora Borealis
newtab-wallpaper-dark-color = Kırmızı ve mavi şekiller
newtab-wallpaper-dark-panda = Ormanda saklanan kızıl panda
newtab-wallpaper-dark-sky = Gece gökyüzüyle şehir manzarası
newtab-wallpaper-dark-mountain = Manzaralı dağ
newtab-wallpaper-dark-city = Mor şehir manzarası
newtab-wallpaper-dark-fox-anniversary = Bir ormanın yakınında kaldırımda bir tilki
newtab-wallpaper-light-fox-anniversary = Sisli bir dağ manzarasıyla çimenli bir alanda bir tilki

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Düz renkler
newtab-wallpaper-colors = Renkler
newtab-wallpaper-blue = Mavi
newtab-wallpaper-light-blue = Açık mavi
newtab-wallpaper-light-purple = Açık mor
newtab-wallpaper-light-green = Açık yeşil
newtab-wallpaper-green = Yeşil
newtab-wallpaper-beige = Bej
newtab-wallpaper-yellow = Sarı
newtab-wallpaper-orange = Turuncu
newtab-wallpaper-pink = Pembe
newtab-wallpaper-light-pink = Açık pembe
newtab-wallpaper-red = Kırmızı
newtab-wallpaper-dark-blue = Koyu mavi
newtab-wallpaper-dark-purple = Koyu mor
newtab-wallpaper-dark-green = Koyu yeşil
newtab-wallpaper-brown = Kahverengi

## Abstract

newtab-wallpaper-category-title-abstract = Soyut
newtab-wallpaper-abstract-green = Yeşil şekiller
newtab-wallpaper-abstract-blue = Mavi şekiller
newtab-wallpaper-abstract-purple = Mor şekiller
newtab-wallpaper-abstract-orange = Turuncu şekiller
newtab-wallpaper-gradient-orange = Turuncu ve pembe renk geçişi
newtab-wallpaper-abstract-blue-purple = Mavi ve mor şekiller
newtab-wallpaper-abstract-white-curves = Gölgeli kıvrımlı beyaz
newtab-wallpaper-abstract-purple-green = Mor ve yeşil ışık geçişi
newtab-wallpaper-abstract-blue-purple-waves = Mavi ve mor dalgalı şekiller
newtab-wallpaper-abstract-black-waves = Siyah dalgalı şekiller

## Firefox

newtab-wallpaper-category-title-photographs = Fotoğraflar
newtab-wallpaper-beach-at-sunrise = Gün doğumunda sahil
newtab-wallpaper-beach-at-sunset = Gün batımında sahil
newtab-wallpaper-storm-sky = Fırtınalı gökyüzü
newtab-wallpaper-sky-with-pink-clouds = Pembe bulutlarla kaplı gökyüzü
newtab-wallpaper-red-panda-yawns-in-a-tree = Ağaçta esneyen kızıl panda
newtab-wallpaper-white-mountains = Beyaz dağlar
newtab-wallpaper-hot-air-balloons = Gündüz vakti çeşitli renklerde sıcak hava balonları
newtab-wallpaper-starry-canyon = Mavi yıldızlı gece
newtab-wallpaper-suspension-bridge = Gündüz vakti gri asma köprü fotoğrafı
newtab-wallpaper-sand-dunes = Beyaz kumullar
newtab-wallpaper-palm-trees = Tan vaktinde hindistancevizi ağaçlarının silueti
newtab-wallpaper-blue-flowers = Açmış mavi renkli çiçeklerin yakın plan fotoğrafı
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Fotoğraf: <a data-l10n-name="name-link">{ $author_string }</a> / <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Farklı renkleri deneyin
newtab-wallpaper-feature-highlight-content = Duvar kâğıtlarıyla yeni sekme sayfanıza yeni bir görünüm kazandırın.
newtab-wallpaper-feature-highlight-button = Anladım
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Kapat
    .aria-label = Açılır pencereyi kapat
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Göksel
newtab-wallpaper-celestial-lunar-eclipse = Ay tutulması
newtab-wallpaper-celestial-earth-night = Alçak Dünya yörüngesinden gece fotoğrafı
newtab-wallpaper-celestial-starry-sky = Yıldızlı gökyüzü
newtab-wallpaper-celestial-eclipse-time-lapse = Zaman atlamalı ay tutulması
newtab-wallpaper-celestial-black-hole = Karadelik galaksisi illüstrasyonu
newtab-wallpaper-celestial-river = Nehrin uydu görüntüsü

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = { $provider } tahminlerine bak
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Sponsorlu
newtab-weather-menu-change-location = Konumu değiştir
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Konum ara
    .aria-label = Konum ara
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Şu anki konumu kullan
newtab-weather-menu-weather-display = Hava durumu göstergesi
newtab-weather-todays-forecast = Bugünkü hava durumu
newtab-weather-see-full-forecast = Tüm hava durumunu göster
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Basit
newtab-weather-menu-change-weather-display-simple = Basit görünüme geç
newtab-weather-menu-weather-display-option-detailed = Ayrıntılı
newtab-weather-menu-change-weather-display-detailed = Ayrıntılı görünüme geç
newtab-weather-menu-temperature-units = Sıcaklık birimi
newtab-weather-menu-temperature-option-fahrenheit = Fahrenhayt
newtab-weather-menu-temperature-option-celsius = Celcius
newtab-weather-menu-change-temperature-units-fahrenheit = Fahrenhayta geç
newtab-weather-menu-change-temperature-units-celsius = Celsius’a geç
newtab-weather-menu-hide-weather = Yeni sekmede hava durumunu gizle
newtab-weather-menu-learn-more = Daha fazla bilgi al
newtab-weather-menu-detect-my-location = Konumumu tespit et
# This message is shown if user is working offline
newtab-weather-error-not-available = Hava durumu verileri şu anda mevcut değil.
newtab-weather-opt-in-see-weather = Bulunduğunuz yerin hava durumunu görmek ister misiniz?
newtab-weather-opt-in-not-now =
    .label = Şimdi değil
newtab-weather-opt-in-yes =
    .label = Evet
newtab-weather-opt-in-headline = Hava durumu tahmininizi görün
newtab-weather-opt-in-use-location =
    .label = Konumu kullan
newtab-weather-opt-in-choose-location = Konum seç
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York City
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Yüksek
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Düşük
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = { $provider } tahminlerine bak
    .aria-description = { $provider } ∙ Sponsorlu

## Topic Labels

newtab-topic-label-business = İş
newtab-topic-label-career = Kariyer
newtab-topic-label-education = Eğitim
newtab-topic-label-arts = Eğlence
newtab-topic-label-food = Yemek
newtab-topic-label-health = Sağlık
newtab-topic-label-hobbies = Oyun
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Para
newtab-topic-label-society-parenting = Ebeveynlik
newtab-topic-label-government = Politika
newtab-topic-label-education-science = Bilim
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Kişisel Gelişim
newtab-topic-label-sports = Spor
newtab-topic-label-tech = Teknoloji
newtab-topic-label-travel = Seyahat
newtab-topic-label-home = Ev ve bahçe

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Akışınızı iyileştirmek için konuları seçin
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = En az iki konu seçin. Küratörlerimiz ilgi alanlarınıza uyan makalelere öncelik verir. Seçtiğiniz konuları istediğiniz zaman güncelleyebilirsiniz.
newtab-topic-selection-save-button = Kaydet
newtab-topic-selection-cancel-button = Vazgeç
newtab-topic-selection-button-maybe-later = Daha sonra
newtab-topic-selection-privacy-link = Verileri nasıl koruduğumuzu ve yönettiğimizi öğrenin
newtab-topic-selection-button-update-interests = İlgi alanlarınızı güncelleyin
newtab-topic-selection-button-pick-interests = İlgi alanlarınızı seçin

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Takip et
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = { $topic } konusunu takip et
newtab-section-following-button = Takip ediliyor
newtab-section-unfollow-button = Takibi bırak
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Takip ediliyor: { $topic } konusunu takip etmeyi bırak
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Akışınıza ince ayar yapın
newtab-section-follow-highlight-subtitle = Beğendiğiniz diğer içerikleri görmek için ilgi alanlarınızı takip edin.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Engelle
newtab-section-blocked-button = Engellendi
newtab-section-unblock-button = Engeli kaldırın
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = { $topic } konusunu takip et
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = { $topic } konusunu takip etmeyi bırak
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = { $topic } konusunu engelle
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = { $topic } konusunun engelini kaldır

## Confirmation modal for blocking a section

newtab-section-cancel-button = Şimdi değil
newtab-section-confirm-block-topic-p1 = Bu konuyu engellemek istediğinizden emin misiniz?
newtab-section-confirm-block-topic-p2 = Engellenen konular artık akışınızda görünmeyecektir.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = { $topic } konusunu engelle
newtab-section-block-cancel-button = Vazgeç

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Konular
newtab-section-manage-topics-button-v2 =
    .label = Konuları yönet
newtab-section-mangage-topics-followed-topics = Takip ediliyor
newtab-section-mangage-topics-followed-topics-empty-state = Henüz hiçbir konuyu takip etmiyorsunuz.
newtab-section-mangage-topics-blocked-topics = Engellendi
newtab-section-mangage-topics-blocked-topics-empty-state = Henüz hiçbir konuyu engellemediniz.
newtab-custom-wallpaper-title = Artık kendi duvar kâğıtlarınızı kullanabilirsiniz
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = { -brand-product-name } tarayıcınızı kişiselleştirmek için kendi duvar kâğıdınızı yükleyin veya istediğiniz rengi seçin.
newtab-custom-wallpaper-cta = Deneyin

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = { -brand-product-name } tarayıcınızı kişiselleştirmek için bir duvar kâğıdı seçin
newtab-new-user-custom-wallpaper-subtitle = Özel duvar kağıtları ve renklerle her yeni sekmede evinizdeymiş gibi hissedin.
newtab-new-user-custom-wallpaper-cta = Hemen deneyin

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Yepyeni duvar kâğıtları hazır
newtab-wallpaper-feature-highlight-subtitle = En sevdiğiniz duvar kâğıdını seçin, her sekmede kendinizi evinizde hissedin.
newtab-wallpaper-feature-highlight-cta = Duvar kâğıdı seç

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Mobil cihazlar için { -brand-product-name }’u indirin
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Her yerde güvenle gezinmek için kodu okutun.
newtab-download-mobile-highlight-body-variant-b = Sekmelerinizi, parolalarınızı ve diğer verilerinizi eşitleyerek kaldığınız yerden devam edin.
newtab-download-mobile-highlight-body-variant-c = { -brand-product-name } tarayıcınızı yanınızda taşıyabileceğinizi biliyor muydunuz? Aynı tarayıcı artık cebinizde.
newtab-download-mobile-highlight-image =
    .aria-label = Mobil cihazlar için { -brand-product-name }’u indirebileceğiniz QR kodu

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Favorileri siteleriniz parmaklarınızın ucunda
newtab-shortcuts-highlight-subtitle = Sevdiğiniz siteleri bir tık kadar yakınınızda tutmak için kısayol ekleyebilirsiniz.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Bunu neden rapor ediyorsunuz?
newtab-report-ads-reason-not-interested =
    .label = İlgimi çekmiyor
newtab-report-ads-reason-inappropriate =
    .label = Uygunsuz içerik
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Çok fazla gördüm
newtab-report-content-wrong-category =
    .label = Yanlış kategori
newtab-report-content-outdated =
    .label = Güncel değil
newtab-report-content-inappropriate-offensive =
    .label = Uygunsuz veya saldırgan
newtab-report-content-spam-misleading =
    .label = Spam veya yanıltıcı
newtab-report-content-requires-payment-subscription =
    .label = Ödeme veya abonelik gerektirir
newtab-report-content-requires-payment-subscription-learn-more = Daha fazla bilgi alın
newtab-report-cancel = Vazgeç
newtab-report-submit = Gönder
newtab-toast-thanks-for-reporting =
    .message = Raporunuz için teşekkür ederiz.
newtab-toast-widgets-hidden =
    .message = Araçları istediğiniz zaman geri eklemek için kalem simgesine tıklayın.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = { $topic } konusunu takip etmeye başladınız.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = { $topic } konusunu artık takip etmiyorsunuz.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Artık { $topic } konusuyla ilgili haberleri görmeyeceksiniz.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Aklınızda ne var? Bir görev ekleyin.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Yeni
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Tamamlandı ({ $number })
newtab-widget-lists-celebration-headline = İyi iş
newtab-widget-lists-celebration-subhead = Hepsi tamamlandı
newtab-widget-task-list-menu-copy = Kopyala
newtab-widget-lists-menu-edit = Liste adını düzenle
newtab-widget-lists-menu-edit2 =
    .aria-label = Liste adını düzenle
newtab-widget-lists-menu-create = Yeni liste oluştur
newtab-widget-lists-menu-delete = Bu listeyi sil
newtab-widget-lists-menu-copy = Listeyi panoya kopyala
newtab-widget-lists-menu-learn-more = Daha fazla bilgi al
newtab-widget-lists-button-add-item = Görev ekle
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Görev ekle
    .aria-label = Görev ekle
newtab-widget-lists-input-error = Görev eklemek için lütfen metin yazın.
newtab-widget-lists-input-menu-open-link = Bağlantıyı aç
newtab-widget-lists-input-menu-move-up = Yukarı taşı
newtab-widget-lists-input-menu-move-down = Aşağı taşı
newtab-widget-lists-input-menu-delete = Sil
newtab-widget-lists-input-menu-edit = Düzenle
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Maddeyi düzenle
newtab-widget-lists-edit-clear =
    .aria-label = Vazgeç
    .title = Vazgeç
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Yeni liste oluştur
newtab-widget-lists-name-label-default =
    .label = Görev listesi
newtab-widget-lists-name-label-checklist =
    .label = Görev listesi
newtab-widget-lists-name-placeholder-default =
    .placeholder = Görev listesi
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Görev listesi
    .aria-label = Liste adını düzenle
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Yeni liste
    .aria-label = Liste adını düzenle
newtab-widget-section-title = Araçlar
newtab-widget-menu-hide = Aracı gizle
newtab-widget-menu-change-size = Boyutu değiştir
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Taşı
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Sol
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Sağ
newtab-widget-size-small = Küçük
newtab-widget-size-medium = Orta
newtab-widget-size-large = Büyük
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Araçları gizle
    .aria-label = Tüm araçları gizle
newtab-widget-section-maximize =
    .title = Araçları genişlet
    .aria-label = Tüm araçları tam boyuta genişlet
newtab-widget-section-minimize =
    .title = Araçları küçült
    .aria-label = Tüm araçları kompakt boyuta küçült
newtab-widget-section-menu-button =
    .title = Araçlar menüsü
    .aria-label = Araçlar menüsünü aç
newtab-widget-add-widgets-button =
    .aria-label = Araç ekle
    .title = Araç ekle
newtab-widget-section-menu-manage = Araçları yönet
newtab-widget-section-menu-hide-all = Araçları gizle
newtab-widget-section-menu-learn-more = Daha fazla bilgi al
newtab-widget-section-feedback = Ne düşündüğünüzü bize anlatın
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Daha fazla araç göster
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Daha az araç göster
newtab-widget-lists-name-default = Görev listesi

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Sayaç
newtab-widget-timer-notification-focus = Odaklanma süresi bitti. İyi iş çıkardınız. Ara vermek ister misiniz?
newtab-widget-timer-notification-break = Molanız bitti. Odaklanmaya hazır mısınız?
newtab-widget-timer-notification-warning = Bildirimler kapalı
newtab-widget-timer-mode-focus =
    .label = Odaklan
newtab-widget-timer-mode-break =
    .label = Mola ver
newtab-widget-timer-label-play =
    .label = Başlat
newtab-widget-timer-label-pause =
    .label = Duraklat
newtab-widget-timer-reset =
    .title = Sıfırla
newtab-widget-timer-menu-notifications = Bildirimleri kapat
newtab-widget-timer-menu-notifications-on = Bildirimleri aç
newtab-widget-timer-menu-learn-more = Daha fazla bilgi al
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Öne çıkan başlıklar
newtab-daily-briefing-card-menu-dismiss = Kapat
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = { $minutes } dk. önce güncellendi
newtab-widget-message-title = Listeler ve sayaçla işinize daha iyi odaklanın
# to-dos stands for "things to do".
newtab-widget-message-copy = Küçük anımsatıcılar ve günlük görev listeleriyle, odaklanma oturumları ve molalarla zamanınızı daha iyi yönetin.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Odaklanma, hava durumu ve daha fazlası tek noktada
newtab-widget-message-focus-forecasts-body = { -brand-product-name } araçlarıyla gününüz daha akıcı olsun. İster hava durumunu kontrol edin, ister işinize odaklanın, ister dünya saatlerini takip edin.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = { -brand-product-name } tarayıcınızı kişiselleştirin
newtab-promo-card-body-addons = Koleksiyonumuzdan bir duvar kâğıdı seçin veya kendi duvar kâğıdınızı oluşturun.
newtab-promo-card-cta-addons = Hemen deneyin
newtab-promo-card-title = { -brand-product-name } tarayıcısını destekleyin
newtab-promo-card-body = Sponsorlarımız daha iyi bir web inşa etme misyonumuzu destekliyor
newtab-promo-card-cta = Daha fazla bilgi alın
newtab-promo-card-dismiss-button =
    .title = Kapat
    .aria-label = Kapat

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] { $minutes } dakikalık sayaç başlat
           *[other] { $minutes } dakikalık sayaç başlat
        }
newtab-widget-timer-pause-aria =
    .aria-label = Sayacı duraklat
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } dakika
           *[other] { $minutes } dakika
        }
newtab-widget-timer-decrease-min =
    .title = 1 dakika azalt
newtab-widget-timer-increase-min =
    .title = 1 dakika artır
newtab-widget-timer-mode-group =
    .aria-label = Sayaç modu
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Odaklan
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Mola ver
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Sayacı gizle
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = İyi iş çıkardınız
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Molanız sona erdi
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Molaya mı ihtiyacınız var?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Odaklanmaya hazır mısınız?

##

newtab-sports-widget-menu-follow-teams = Takımları takip et
newtab-sports-widget-menu-view-schedule = Takvime bak
newtab-sports-widget-menu-view-upcoming = Yaklaşanlara bak
newtab-sports-widget-menu-view-results = Sonuçlara bak
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Önemli tarihler
newtab-sports-widget-menu-learn-more = Daha fazla bilgi al
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Dünya Kupası’nı takip edin
newtab-sports-widget-get-updates = Canlı maç bilgilerini ve gelişmeleri kaçırmayın.
newtab-sports-widget-view-schedule =
    .label = Takvime bak
newtab-sports-widget-follow-teams =
    .label = Takımları takip et
newtab-sports-widget-view-matches =
    .label = Maçları göster
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] İstediğiniz { $number } takımı takip edin
       *[other] İstediğiniz { $number } takımı takip edin
    }
newtab-sports-widget-choose-wallpaper =
    .label = Duvar kâğıdı seç
newtab-sports-widget-skip = Atla
newtab-sports-widget-search-country =
    .placeholder = Ülke ara
    .aria-label = Ülke ara
newtab-sports-widget-cancel = Vazgeç
newtab-sports-widget-back-button =
    .aria-label = Geri
newtab-sports-widget-done-button =
    .label = Tamam
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (elendi)
newtab-sports-widget-view-all =
    .label = Tümünü göster
newtab-sports-widget-show-less =
    .label = Daha az göster
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Yalnızca takip edilen takımlar
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = İzle
    .title = Canlı izle
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Canlı izle
    .title = Canlı izle
newtab-sports-widget-watch-dialog-close =
    .aria-label = Kapat
    .title = Kapat
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Ücretsiz
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Ücretsiz deneme
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Ücretsiz ve ücretli
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Ücretli
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Yalnızca belirli maçlar
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Bölgenizde mevcut
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Diğer bölgeler
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Videoyu aç
    .title = Videoyu aç
newtab-sports-widget-group-stage = Grup maçı
newtab-sports-widget-group-a = A Grubu
newtab-sports-widget-group-b = B Grubu
newtab-sports-widget-group-c = C Grubu
newtab-sports-widget-group-d = D Grubu
newtab-sports-widget-group-e = E Grubu
newtab-sports-widget-group-f = F Grubu
newtab-sports-widget-group-g = G Grubu
newtab-sports-widget-group-h = H Grubu
newtab-sports-widget-group-i = I Grubu
newtab-sports-widget-group-j = J Grubu
newtab-sports-widget-group-k = K Grubu
newtab-sports-widget-group-l = L Grubu
newtab-sports-widget-round-32 = Son 32 turu
newtab-sports-widget-round-16 = Son 16 turu
newtab-sports-widget-quarter-finals = Çeyrek finaller
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = CANLI
newtab-custom-widget-live-refresh =
    .title = Skorları yenile
    .aria-label = Skorları yenile
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Önemli tarihler
newtab-sports-widget-upcoming = Yaklaşan
# Used for a match currently ongoing
newtab-sports-widget-now = Şimdi
newtab-sports-widget-results = Sonuçlar
newtab-sports-widget-semi-finals = Yarı finaller
newtab-sports-widget-bronze-finals = Üçüncülük maçı
# Final is the final match for 1st place.
newtab-sports-widget-final = Final
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Gecikmeli
newtab-sports-widget-postponed = Ertelendi
newtab-sports-widget-suspended = Askıya alındı
newtab-sports-widget-cancelled = İptal edildi
newtab-sports-widget-information = Maç bilgileri
newtab-sports-widget-no-live-data = Canlı maç verileri şu anda güncellenmiyor
newtab-sports-widget-view-results-link = Sonuçlara bak
newtab-sports-widget-third-place = Üçüncü
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = İkinci
newtab-sports-widget-champions = Şampiyon
newtab-sports-widget-world-cup-champions = 2026 Dünya Kupası Şampiyonu
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Maç sonu
newtab-sports-widget-match-halftime = Devre arası
newtab-sports-widget-match-extra-time = Uzatmalar
newtab-sports-widget-match-penalties = Penaltılar
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = -
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Yaklaşan maç bilgileri için beklemede kalın

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Önceki
    .title = Önceki
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Sonraki
    .title = Sonraki
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Canlı maç { $index }/{ $total }
    .title = Canlı maç { $index }/{ $total }

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
    .aria-label = { $homeTeam }, { $homeScore } - { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) - { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Canlı: { $homeTeam }, { $homeScore } - { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } - { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } - { $awayTeam }, gecikmeli
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } - { $awayTeam }, ertelendi
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } - { $awayTeam }, ara verildi
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } - { $awayTeam }, iptal edildi

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosna Hersek
newtab-sports-widget-team-name-label-civ =
    .label = Fildişi Sahili
newtab-sports-widget-team-name-label-cod =
    .label = Kongo D.C.
newtab-sports-widget-team-name-label-eng =
    .label = İngiltere
newtab-sports-widget-team-name-label-sco =
    .label = İskoçya
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Belli değil

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Dünya Kupası’na yeni duvar kâğıtlarıyla başlayın
newtab-sports-widget-message-wallpapers-body = Maçların heyecanını tarayıcınıza taşıyın.
newtab-sports-widget-message-wallpapers-cta = Duvar kâğıdı seçin
newtab-sports-widget-message-add-widgets-cta =
    .label = Araç ekleyin
newtab-sports-widget-message-day-in-play-title = { -brand-product-name } araçlarıyla gününüze keyif katın
newtab-sports-widget-message-day-in-play-body = Dünya Kupası’nı takip edin, işinize odaklanın, dünya saatlerini takip edin ve daha fazlasını yapın.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Araçları keşfedin

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Kapat
    .aria-label = Kapat
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Bu alanı özelleştirin
newtab-activation-window-message-customization-focus-message = Yeni bir duvar kâğıdı seçin, sevdiğiniz sitelerin kısayollarını ekleyin ve ilginizi çeken makalelerden haberdar olun.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Özelleştirmeye başla
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Burası sizin yeriniz
newtab-activation-window-message-values-focus-message = { -brand-product-name } internette istediğiniz gibi gezinmenizi ve güne daha kişisel bir şekilde başlamanızı sağlar. { -brand-product-name } tarayıcınızı özelleştirin.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Saati gizle
newtab-clock-widget-menu-learn-more = Daha fazla bilgi al
newtab-clock-widget-menu-edit = Saatleri düzenle
newtab-clock-widget-menu-switch-to-12h = 12 saatlik biçime geç
newtab-clock-widget-menu-switch-to-24h = 24 saatlik biçime geç
newtab-clock-widget-label-your-clocks = Saatleriniz
newtab-clock-widget-search-location-input =
    .label = Konum
    .placeholder = Şehir ara
    .aria-label = Şehir ara
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Ad (isteğe bağlı)
    .placeholder = Ad ekle
    .aria-label = Ad (isteğe bağlı)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Yeni saat ekle
    .aria-label = Yeni saat ekle
newtab-clock-widget-button-add-clock = Ekle
newtab-clock-widget-button-cancel = Vazgeç
newtab-clock-widget-button-back =
    .title = Geri
    .aria-label = Geri
newtab-clock-widget-button-edit-clock =
    .title = Saati düzenle
    .aria-label = Saati düzenle
newtab-clock-widget-button-save = Kaydet
newtab-clock-widget-button-remove-clock =
    .title = Saati sil
    .aria-label = Saati sil
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
    .aria-label = { $city }, takma adı: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Saat ekle
newtab-clock-widget-edit-clock-form =
    .aria-label = Saati düzenle
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Arama sonuçları
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Eşleşme bulunamadı
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Saat menüsünü aç
    .aria-label = Saat menüsünü aç
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Ad: { $nickname }
