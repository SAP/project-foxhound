# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Yañı İlmek
newtab-settings-button =
    .title = Yañı İlmek saifeñizni Özelleştiriñiz

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Qıdır
    .aria-label = Qıdır

## Top Sites - General form dialog.

newtab-topsites-edit-topsites-header = Üst Saytnı Tahrir Et
newtab-topsites-title-label = Serlevha
newtab-topsites-title-input =
    .placeholder = Bir serlevha kirset
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Bir URL tuşlañız yaki yapıştırıñız
newtab-topsites-image-url-label = Özel Suret URL'si
newtab-topsites-use-image-link = Özel bir suret qullan…

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Vazgeç
newtab-topsites-delete-history-button = Keçmişten sil
newtab-topsites-save-button = Saqla
newtab-topsites-preview-button = Ögbaqış
newtab-topsites-add-button = Ekle

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Bu saifeniñ her danesini keçmişiñizden silmege istegeniñizden eminsiñizmi?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Bu amel keri yapılalmaz.

## Context Menu - Action Tooltips.

# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Bu saytnı tahrir et
    .aria-label = Bu saytnı tahrir et

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Tahrir Et
newtab-menu-open-new-window = Yañı Bir Pencerede Aç
newtab-menu-open-new-private-window = Yañı bir Hususiy Pencerede Aç
newtab-menu-dismiss = Sav
newtab-menu-pin = Tüyre
newtab-menu-unpin = Tüyrelmegen yap
newtab-menu-delete-history = Keçmişten sil
newtab-menu-save-to-pocket = { -pocket-brand-name }'ke Saqla
newtab-menu-delete-pocket = { -pocket-brand-name }’ten sil
newtab-menu-archive-pocket = { -pocket-brand-name }’te arhivle

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Saifeimini Çetleştir
# Bookmark is a verb here.
newtab-menu-bookmark = Saifeimi

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Endirme İlişimini Kopiyala
newtab-menu-go-to-download-page = Endirme Saifesine Bar
newtab-menu-remove-download = Keçmişten Çetleştir

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Tapıcıda Köster
       *[other] İhtiva Etken Cilbentni Aç
    }
newtab-menu-open-file = Dosyeni Aç

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Ziyaret etilgen
newtab-label-bookmarked = Saifeimlengen
newtab-label-recommended = Trendli
newtab-label-saved = { -pocket-brand-name }'ke saqlanğan
newtab-label-download = Endirilgen

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Kesimni Çetleştir
newtab-section-menu-collapse-section = Kesimni Eştir
newtab-section-menu-expand-section = Kesimni Cayıldır
newtab-section-menu-manage-section = Kesimni İdare Et
newtab-section-menu-add-topsite = Zirvedeki Sayt Ekle
newtab-section-menu-move-up = Yuqarı Avuştır
newtab-section-menu-move-down = Aşağı Avuştır
newtab-section-menu-privacy-notice = Hususiyat Tebliği

## Section Headers.

newtab-section-header-topsites = Zirvedeki Saytlar
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = { $provider } tevsiyeli

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Popülâr Mevzular:
