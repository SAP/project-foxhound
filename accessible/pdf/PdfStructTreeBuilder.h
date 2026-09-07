/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef PdfStructTreeBuilder_h_
#define PdfStructTreeBuilder_h_

#include "mozilla/HashTable.h"
#include "mozilla/MozPromise.h"
#include "mozilla/PairHash.h"
#include "nsTHashSet.h"

class nsIFrame;
namespace SkPDF {
struct StructureElementNode;
}

namespace mozilla {
namespace dom {
class BrowsingContext;
}

namespace a11y {
class Accessible;

/**
 * Uses the Gecko accessibility tree to build a PDF structure tree that can be
 * used with Skia's SkPDF backend.
 * The functionality provided here needs to be accessed from several places in
 * the layout, graphics, printing, PDF and accessibility code. Rather than
 * propagating an instance through all of these modules, we maintain a registry
 * of instances associated with BrowsingContexts. Static methods are used to
 * access or act on the appropriate instance.
 */
class PdfStructTreeBuilder {
 public:
  /**
   * Initialize for a document. This must first be called for the top document
   * being built, followed by any nested OOP iframes.
   */
  static void Init(dom::BrowsingContext* aBrowsingContext);

  static PdfStructTreeBuilder* Get(uint64_t aBrowsingContextId);

  /**
   * Indicate that building is finished for this document. This only needs to be
   * called for the top document. This destroys the instance associated with the
   * document.
   */
  static void Done(uint64_t aBrowsingContextId);

  /**
   * SkPDF uses global int ids, but Gecko accessibility uses document specific
   * uint64_t ids. Get the SkPDF id for a given Gecko Accessible identifier.
   */
  static int GetPdfId(uint64_t aBrowsingContextId, uint64_t aAccId);

  using GlobalAccessibleId = std::pair<uint64_t, uint64_t>;
  /**
   * Get information suitable for identifying an Accessible via
   * DrawTarget::AccessibleId.
   */
  static GlobalAccessibleId GetAccId(nsIFrame* aFrame);

  using ReadyPromise = MozPromise<Ok, Ok, true>;
  /**
   * Return a promise which is resolved when this builder is ready.
   * BuildStructTree should not be called before this promise resolves.
   */
  already_AddRefed<ReadyPromise> GetReadyPromise() {
    RefPtr<ReadyPromise> promise = mReadyPromise;
    return promise.forget();
  }

  /**
   * Build the PDF structure tree!
   */
  bool BuildStructTree(SkPDF::StructureElementNode& aRoot);

 private:
  explicit PdfStructTreeBuilder(uint64_t aBrowsingContextId);
  void InitInternal(dom::BrowsingContext* aBrowsingContext);
  int GeneratePdfId(Accessible* aAcc);
  void BuildStructSubtree(Accessible* aAcc, SkPDF::StructureElementNode& aPdf);
  int GetPdfIdInternal(uint64_t aBrowsingContextId, uint64_t aAccId) const;

  // We can't take a reference to an Accessible, so we store the BrowsingContext
  // id instead and get the document Accessible from the BrowsingContext.
  uint64_t mRootBrowsingContextId;
  // The number of out-of-process iframes we are waiting for.
  size_t mPendingOopIframes = 0;
  // Tracks BrowserParents to which we've sent RequestDocAccessibleForPrint,
  // to avoid sending it more than once to the same BrowserParent.
  nsTHashSet<uint64_t> mRequestedBrowserParentIds;
  RefPtr<ReadyPromise::Private> mReadyPromise;
  int mLastPdfId = 0;
  // Maps {browsingContextId, accessibleId} to SkPDF id.
  mozilla::HashMap<GlobalAccessibleId, int, PairHasher<uint64_t, uint64_t>>
      mAccToPdf;

  // Needed so nsTArray::EmplaceBack can access our private constructor.
  friend class nsTArrayElementTraits<mozilla::a11y::PdfStructTreeBuilder>;
};

}  // namespace a11y
}  // namespace mozilla

#endif
