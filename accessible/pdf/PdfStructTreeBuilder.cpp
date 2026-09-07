/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/a11y/DocAccessible.h"
#include "mozilla/a11y/DocAccessibleParent.h"
#include "mozilla/a11y/PdfStructTreeBuilder.h"
#include "mozilla/a11y/TableCellAccessible.h"
#include "mozilla/ClearOnShutdown.h"
#include "mozilla/dom/BrowserParent.h"
#include "mozilla/dom/CanonicalBrowsingContext.h"
#include "mozilla/StaticPrefs_accessibility.h"
#include "mozilla/StaticPtr.h"
#include "skia/include/docs/SkPDFDocument.h"

namespace mozilla::a11y {

static void AccNameToPdfAlt(Accessible* aAcc,
                            SkPDF::StructureElementNode& aPdf) {
  nsAutoString name;
  aAcc->Name(name);
  if (!name.IsEmpty()) {
    aPdf.fAlt = SkString(NS_ConvertUTF16toUTF8(name).get());
  }
}

// We use an array rather than a map for two reasons:
// 1. There aren't likely to be many of these alive at once.
// 2. Some functions need to find a builder associated with a descendant
// BrowsingContext, not just the root.
// If this turns out to be a problem, we could include ids for the root
// BrowsingContext and any descendant BrowsingContexts in the map.
static StaticAutoPtr<nsTArray<PdfStructTreeBuilder>> sBuilders;

/* static */
void PdfStructTreeBuilder::Init(dom::BrowsingContext* aBrowsingContext) {
  if (!StaticPrefs::accessibility_tagged_pdf_output_enabled()) {
    return;
  }
  if (!sBuilders) {
    sBuilders = new nsTArray<PdfStructTreeBuilder>();
    if (NS_IsMainThread()) {
      ClearOnShutdown(&sBuilders);
    }
  }
  for (PdfStructTreeBuilder& builder : *sBuilders) {
    for (dom::BrowsingContext* ancestor = aBrowsingContext->GetParent();
         ancestor; ancestor = ancestor->GetParent()) {
      if (ancestor->Id() == builder.mRootBrowsingContextId) {
        // This is an OOP iframe associated with an existing builder.
        builder.InitInternal(aBrowsingContext);
        return;
      }
    }
  }
  // This is a new document being printed.
  auto builder = sBuilders->EmplaceBack(aBrowsingContext->Id());
  builder->InitInternal(aBrowsingContext);
}

/* static */
PdfStructTreeBuilder* PdfStructTreeBuilder::Get(uint64_t aBrowsingContextId) {
  if (!sBuilders) {
    return nullptr;
  }
  for (PdfStructTreeBuilder& builder : *sBuilders) {
    if (builder.mRootBrowsingContextId == aBrowsingContextId) {
      return &builder;
    }
  }
  return nullptr;
}

/* static */
void PdfStructTreeBuilder::Done(uint64_t aBrowsingContextId) {
  if (!sBuilders) {
    return;
  }
  for (size_t i = 0; i < sBuilders->Length(); ++i) {
    if ((*sBuilders)[i].mRootBrowsingContextId == aBrowsingContextId) {
      sBuilders->RemoveElementAt(i);
      break;
    }
  }
}

/* static */
int PdfStructTreeBuilder::GetPdfId(uint64_t aBrowsingContextId,
                                   uint64_t aAccId) {
  if (!sBuilders) {
    return 0;
  }
  // aBrowsingContextId might be a descendant BrowsingContext. Rather than
  // walking the BrowsingContext ancestry for each builder, we just ask each
  // builder whether it contains this id, since there won't be many builders.
  for (const PdfStructTreeBuilder& builder : *sBuilders) {
    if (int pdfId = builder.GetPdfIdInternal(aBrowsingContextId, aAccId)) {
      return pdfId;
    }
  }
  return 0;
}

/* static */
PdfStructTreeBuilder::GlobalAccessibleId PdfStructTreeBuilder::GetAccId(
    nsIFrame* aFrame) {
  if (!StaticPrefs::accessibility_tagged_pdf_output_enabled()) {
    return {};
  }
  nsIContent* content = aFrame->GetContent();
  if (!content) {
    return {};
  }
  dom::Document* doc = content->OwnerDoc();
  // This should only ever be called for a document being printed and those are
  // always static documents.
  MOZ_ASSERT(doc->IsStaticDocument());
  DocAccessible* docAcc = GetExistingDocAccessible(doc);
  if (!docAcc) {
    return {};
  }
  Accessible* acc = docAcc->GetAccessible(content);
  if (!acc) {
    return {};
  }
  dom::BrowsingContext* bc = doc->GetBrowsingContext();
  if (!bc) {
    return {};
  }
  return {bc->Id(), acc->ID()};
}

PdfStructTreeBuilder::PdfStructTreeBuilder(uint64_t aBrowsingContextId)
    : mRootBrowsingContextId(aBrowsingContextId) {
  mReadyPromise = new ReadyPromise::Private(__func__);
}

void PdfStructTreeBuilder::InitInternal(
    dom::BrowsingContext* aBrowsingContext) {
  if (aBrowsingContext->Id() != mRootBrowsingContextId) {
    // We've just received the document for an out-of-process iframe.
    MOZ_ASSERT(mPendingOopIframes > 0);
    --mPendingOopIframes;
  }
  dom::CanonicalBrowsingContext* cbc = aBrowsingContext->Canonical();
  if (dom::BrowserParent* bp = cbc->GetBrowserParent()) {
    // Request the accessibility tree for each descendant out-of-process
    // iframe. While all of the direct children should be reachable, some of the
    // deeper descendants might not be yet, so we also traverse the descendants
    // for each OOP iframe when InitInternal is called for it , skipping any
    // that have already been requested. We could instead walk only the direct
    // children, but walking descendants means we benefit from greater
    // parallelism in the case that deeper descendants *are* already reachable.
    bp->VisitAllDescendants([this](dom::BrowserParent* descBp) {
      if (mRequestedBrowserParentIds.EnsureInserted(descBp->GetTabId())) {
        MOZ_ASSERT(!descBp->GetTopLevelDocAccessible());
        (void)descBp->SendRequestDocAccessibleForPrint();
        ++mPendingOopIframes;
      }
    });
  }
  // XXX support out-of-process iframes inside a parent process document.
  if (mPendingOopIframes == 0) {
    // Once we've received all pending out-of-process iframes, we are ready to
    // build the PDF struct tree.
    mReadyPromise->Resolve(mozilla::Ok(), __func__);
  }
}

bool PdfStructTreeBuilder::BuildStructTree(SkPDF::StructureElementNode& aRoot) {
  RefPtr bc = dom::CanonicalBrowsingContext::Get(mRootBrowsingContextId);
  if (!bc) {
    return false;
  }
  Accessible* rootAcc = nullptr;
  if (bc->IsInProcess()) {
    if (dom::Document* doc = bc->GetDocument()) {
      rootAcc = GetExistingDocAccessible(doc);
    }
  } else {
    rootAcc = DocAccessibleParent::GetFrom(bc);
  }
  if (!rootAcc) {
    return false;
  }
  BuildStructSubtree(rootAcc, aRoot);
  return true;
}

int PdfStructTreeBuilder::GeneratePdfId(Accessible* aAcc) {
  uint64_t bcId = 0;
  if (RemoteAccessible* remoteAcc = aAcc->AsRemote()) {
    bcId = remoteAcc->Document()->GetBrowsingContext()->Id();
  } else {
    bcId =
        aAcc->AsLocal()->Document()->DocumentNode()->GetBrowsingContext()->Id();
  }
  // This can be called more than once for the same Accessible; e.g. when
  // referencing table cell headers. It should always return the same id for the
  // same Accessible.
  GlobalAccessibleId key = {bcId, aAcc->ID()};
  auto entry = mAccToPdf.lookupForAdd(key);
  if (!entry) {
    // We haven't seen this Accessible before. Generate a new PDF id.
    MOZ_ALWAYS_TRUE(mAccToPdf.add(entry, key, ++mLastPdfId));
  }
  return entry->value();
}

void PdfStructTreeBuilder::BuildStructSubtree(
    Accessible* aAcc, SkPDF::StructureElementNode& aPdf) {
  aPdf.fNodeId = GeneratePdfId(aAcc);
  switch (aAcc->Role()) {
    case roles::ARTICLE:
      aPdf.fTypeString = "Art";
      break;
    case roles::BLOCKQUOTE:
      aPdf.fTypeString = "BlockQuote";
      break;
    case roles::CAPTION:
      aPdf.fTypeString = "Caption";
      break;
    case roles::CELL:
    case roles::GRID_CELL: {
      aPdf.fTypeString = "TD";
      TableCellAccessible* cell = aAcc->AsTableCell();
      if (!cell) {
        break;
      }
      nsTArray<Accessible*> accHeaders;
      cell->ColHeaderCells(&accHeaders);
      cell->RowHeaderCells(&accHeaders);
      std::vector<int> pdfHeaders;
      pdfHeaders.reserve(accHeaders.Length());
      for (Accessible* accHeader : accHeaders) {
        pdfHeaders.push_back(GeneratePdfId(accHeader));
      }
      aPdf.fAttributes.appendNodeIdArray("Table", "Headers", pdfHeaders);
      break;
    }
    case roles::CODE:
      aPdf.fTypeString = "Code";
      break;
    case roles::COLUMNHEADER:
      aPdf.fTypeString = "TH";
      aPdf.fAttributes.appendName("Table", "Scope", "Column");
      break;
    case roles::DOCUMENT:
      aPdf.fTypeString = "Document";
      break;
    case roles::EMPHASIS:
      aPdf.fTypeString = "Em";
      break;
    case roles::GRID:
    case roles::TABLE:
    case roles::TREE_TABLE:
      aPdf.fTypeString = "Table";
      break;
    case roles::GROUPING:
      aPdf.fTypeString = "Div";
      break;
    case roles::GRAPHIC:
      aPdf.fTypeString = "Figure";
      AccNameToPdfAlt(aAcc, aPdf);
      // XXX We should ideally expose a BBox attribute, but how do we calculate
      // this?
      break;
    case roles::HEADING: {
      // For the PDF outline, SkPDF can accumulate text from headings itself,
      // but it requires that glyph runs include text, whereas we provide glyph
      // indexes when drawing. Rather than plumbing the text through to the draw
      // target, we instead explicitly provide the heading name as alt text
      // here, since it's readily available.
      AccNameToPdfAlt(aAcc, aPdf);
      aPdf.fExposeAlt = false;
      int32_t level = aAcc->GroupPosition().level;
      // PDF has H1 through H6.
      if (1 <= level && level <= 6) {
        nsAutoCString type;
        type.AppendPrintf("H%d", level);
        aPdf.fTypeString = SkString(type.get());
        break;
      }
      // Otherwise, use the generic H.
      aPdf.fTypeString = "H";
      break;
    }
    case roles::LANDMARK:
      if (aAcc->LandmarkRole() == nsGkAtoms::complementary) {
        aPdf.fTypeString = "Aside";
      }
      break;
    case roles::LINK:
      aPdf.fTypeString = "Link";
      break;
    case roles::LIST:
      aPdf.fTypeString = "L";
      break;
    case roles::LISTITEM:
      aPdf.fTypeString = "LI";
      break;
    case roles::LISTITEM_MARKER:
      aPdf.fTypeString = "Lbl";
      break;
    case roles::PARAGRAPH:
      aPdf.fTypeString = "P";
      break;
    case roles::ROW:
      aPdf.fTypeString = "TR";
      break;
    case roles::ROWHEADER:
      aPdf.fTypeString = "TH";
      aPdf.fAttributes.appendName("Table", "Scope", "Row");
      break;
    case roles::STRONG:
      aPdf.fTypeString = "Strong";
      break;
    default:
      aPdf.fTypeString = "NonStruct";
  }
  if (TableCellAccessible* cell = aAcc->AsTableCell()) {
    uint32_t rowSpan = cell->RowExtent();
    if (rowSpan > 1) {
      aPdf.fAttributes.appendInt("Table", "RowSpan", static_cast<int>(rowSpan));
    }
    uint32_t colSpan = cell->ColExtent();
    if (colSpan > 1) {
      aPdf.fAttributes.appendInt("Table", "ColSpan", static_cast<int>(colSpan));
    }
  }

  uint32_t count = aAcc->ChildCount();
  aPdf.fChildVector.resize(count);
  for (uint32_t c = 0; c < count; ++c) {
    aPdf.fChildVector[c] = std::make_unique<SkPDF::StructureElementNode>();
    BuildStructSubtree(aAcc->ChildAt(c), *aPdf.fChildVector[c]);
  }
}

int PdfStructTreeBuilder::GetPdfIdInternal(uint64_t aBrowsingContextId,
                                           uint64_t aAccId) const {
  if (aBrowsingContextId == 0) {
    // This indicates that the following drawing instructions are not associated
    // with anything in the struct tree; e.g. page headers and footers.
    MOZ_ASSERT(aAccId == 0);
    return 0;
  }
  if (auto entry = mAccToPdf.lookup({aBrowsingContextId, aAccId})) {
    return entry->value();
  }
  MOZ_ASSERT_UNREACHABLE(
      "Display list contains Accessible id which isn't in the map!");
  return 0;
}

}  // namespace mozilla::a11y
