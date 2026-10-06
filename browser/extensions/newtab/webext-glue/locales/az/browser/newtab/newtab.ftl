# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Yeni Vərəq
newtab-settings-button =
    .title = Yeni Vərəq səhifənizi fərdiləşdirin

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-new-tabs =
    .label = Yeni vərəqlər

## Firefox Home content

# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } sətir
           *[other] { $num } sətir
        }
home-restore-defaults-srd =
    .label = İlkin Seçənəkləri Bərpa et
    .accesskey = R
home-mode-choice-custom-srd =
    .label = Fərdi Ünvanlar…
home-mode-choice-blank-srd =
    .label = Boş Səhifə
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Sponsorlaşdırılmış Hekayələr
home-prefs-highlights-option-visited-pages-srd =
    .label = Baxılmış Səhifələr
home-prefs-highlights-options-bookmarks-srd =
    .label = Əlfəcinlər
home-prefs-highlights-option-most-recent-download-srd =
    .label = Son Endirmələr

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Axtar
    .aria-label = Axtar

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Axtarış mühərriyi əlavə et
newtab-topsites-edit-topsites-header = Qabaqcıl Saytları Dəyişdir
newtab-topsites-title-label = Başlıq
newtab-topsites-title-input =
    .placeholder = Başlıq daxil et
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Ünvanı yazın və ya yapışdırın
newtab-topsites-url-validation = Doğru ünvan tələb olunur
newtab-topsites-image-url-label = Fərdi şəkil ünvanı
newtab-topsites-use-image-link = Fərdi şəkil işlət…
newtab-topsites-image-validation = Şəkli yükləmək mümkün olmadı. Fərqli ünvan yoxlayın.

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Ləğv et
newtab-topsites-delete-history-button = Tarixçədən Sil
newtab-topsites-save-button = Saxla
newtab-topsites-preview-button = Ön baxış
newtab-topsites-add-button = Əlavə et

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Bu səhifənin bütün parçalarını tarixçənizdən silmək istədiyinizə əminsiniz?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Bu əməliyyat geri alına bilməz.

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Menyunu aç
    .aria-label = Menyunu aç
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Menyunu aç
    .aria-label = { $title } üçün kontekst menyusunu aç
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Bu saytı düzəlt
    .aria-label = Bu saytı düzəlt

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Redaktə et
newtab-menu-open-new-window = Yeni Pəncərədə Aç
newtab-menu-open-new-private-window = Yeni Məxfi Pəncərədə Aç
newtab-menu-dismiss = Rədd et
newtab-menu-pin = Bərkid
newtab-menu-unpin = Çıxart
newtab-menu-delete-history = Tarixçədən Sil
newtab-menu-save-to-pocket = { -pocket-brand-name }-ə Saxla
newtab-menu-delete-pocket = { -pocket-brand-name }-dən sil
newtab-menu-archive-pocket = { -pocket-brand-name }-də arxivləşdir

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Əlfəcini sil
# Bookmark is a verb here.
newtab-menu-bookmark = Əlfəcinlə

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Endirmə Ünvanını Köçür
newtab-menu-go-to-download-page = Endirmə səhifəsinə get
newtab-menu-remove-download = Tarixçədən Sil

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Finder-də Göstər
       *[other] Yerləşdiyi Qovluğu Aç
    }
newtab-menu-open-file = Faylı Aç

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Ziyarət edilib
newtab-label-bookmarked = Əlfəcinlənib
newtab-label-recommended = Populyar
newtab-label-saved = { -pocket-brand-name }-ə saxlandı
newtab-label-download = Endirildi

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Bölməni Sil
newtab-section-menu-collapse-section = Bölməni Daralt
newtab-section-menu-expand-section = Bölməni Genişlət
newtab-section-menu-manage-section = Bölməni İdarə et
newtab-section-menu-manage-webext = Uzantını idarə et
newtab-section-menu-add-topsite = Qabaqcıl Sayt əlavə et
newtab-section-menu-add-search-engine = Axtarış mühərriyi əlavə et
newtab-section-menu-move-up = Yuxarı daşı
newtab-section-menu-move-down = Aşağı daşı
newtab-section-menu-privacy-notice = Məxfilik Bildirişi

## Section Headers.

newtab-section-header-topsites = Qabaqcıl Saytlar
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = { $provider } məsləhət görür

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = İnternetdə gəzməyə başlayın, burada ziyarət edəcəyiniz və ya əlfəcinləyəcəyiniz məqalə, video və digər səhifələri göstərəcəyik.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Hamısını oxudunuz. Yeni { $provider } məqalələri üçün daha sonra təkrar yoxlayın. Gözləyə bilmirsiz? Məşhur mövzu seçərək internetdən daha çox gözəl məqalələr tapın.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Məşhur Mövzular:
newtab-pocket-more-recommendations = Daha Çox Tövsiyyələr
newtab-pocket-cta-button = { -pocket-brand-name } əldə edin
newtab-pocket-cta-text = Sevdiyiniz məqalələri { -pocket-brand-name }-də saxlayın və möhtəşəm yeni yazıları kəşf edin.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Uups, bu məzmunu yüklərkən nəsə səhv getdi.
newtab-error-fallback-refresh-link = Təkrar yoxlamaq üçün səhifəni yeniləyin.
