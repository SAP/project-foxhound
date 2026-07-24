/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Object that can be used to serialize selections, ranges, or nodes
 * to strings in a gazillion different ways.
 */

#include <utility>

#include "mozilla/Encoding.h"
#include "mozilla/IntegerRange.h"
#include "mozilla/Maybe.h"
#include "mozilla/RangeBoundary.h"
#include "mozilla/Result.h"
#include "mozilla/ScopeExit.h"
#include "mozilla/StringBuffer.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/dom/AbstractRange.h"
#include "mozilla/dom/Comment.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/DocumentType.h"
#include "mozilla/dom/Element.h"
#include "mozilla/dom/HTMLBRElement.h"
#include "mozilla/dom/ProcessingInstruction.h"
#include "mozilla/dom/Selection.h"
#include "mozilla/dom/ShadowRoot.h"
#include "mozilla/dom/Text.h"
#include "nsCOMPtr.h"
#include "nsCRT.h"
#include "nsComponentManagerUtils.h"
#include "nsContentUtils.h"
#include "nsElementTable.h"
#include "nsGkAtoms.h"
#include "nsHTMLDocument.h"
#include "nsIContent.h"
#include "nsIContentInlines.h"
#include "nsIContentSerializer.h"
#include "nsIDocumentEncoder.h"
#include "nsIFrame.h"
#include "nsINode.h"
#include "nsIOutputStream.h"
#include "nsIScriptContext.h"
#include "nsIScriptGlobalObject.h"
#include "nsISupports.h"
#include "nsITransferable.h"
#include "nsLayoutUtils.h"
#include "nsMimeTypes.h"
#include "nsRange.h"
#include "nsReadableUtils.h"
#include "nsTArray.h"
#include "nsUnicharUtils.h"
#include "nscore.h"

using namespace mozilla;
using namespace mozilla::dom;

enum nsRangeIterationDirection { kDirectionOut = -1, kDirectionIn = 1 };

class TextStreamer {
 public:
  /**
   * @param aStream Will be kept alive by the TextStreamer.
   * @param aUnicodeEncoder Needs to be non-nullptr.
   */
  TextStreamer(nsIOutputStream& aStream, UniquePtr<Encoder> aUnicodeEncoder,
               bool aIsPlainText, nsAString& aOutputBuffer);

  /**
   * String will be truncated if it is written to stream.
   */
  nsresult FlushIfStringLongEnough();

  /**
   * String will be truncated.
   */
  nsresult ForceFlush();

 private:
  const static uint32_t kMaxLengthBeforeFlush = 1024;

  const static uint32_t kEncoderBufferSizeInBytes = 4096;

  nsresult EncodeAndWrite();

  nsresult EncodeAndWriteAndTruncate();

  const nsCOMPtr<nsIOutputStream> mStream;
  const UniquePtr<Encoder> mUnicodeEncoder;
  const bool mIsPlainText;
  nsAString& mOutputBuffer;
};

TextStreamer::TextStreamer(nsIOutputStream& aStream,
                           UniquePtr<Encoder> aUnicodeEncoder,
                           bool aIsPlainText, nsAString& aOutputBuffer)
    : mStream{&aStream},
      mUnicodeEncoder(std::move(aUnicodeEncoder)),
      mIsPlainText(aIsPlainText),
      mOutputBuffer(aOutputBuffer) {
  MOZ_ASSERT(mUnicodeEncoder);
}

nsresult TextStreamer::FlushIfStringLongEnough() {
  nsresult rv = NS_OK;

  if (mOutputBuffer.Length() > kMaxLengthBeforeFlush) {
    rv = EncodeAndWriteAndTruncate();
  }

  return rv;
}

nsresult TextStreamer::ForceFlush() { return EncodeAndWriteAndTruncate(); }

nsresult TextStreamer::EncodeAndWrite() {
  if (mOutputBuffer.IsEmpty()) {
    return NS_OK;
  }

  uint8_t buffer[kEncoderBufferSizeInBytes];
  auto src = Span(mOutputBuffer);
  auto bufferSpan = Span(buffer);
  // Reserve space for terminator
  auto dst = bufferSpan.To(bufferSpan.Length() - 1);
  for (;;) {
    uint32_t result;
    size_t read;
    size_t written;
    if (mIsPlainText) {
      std::tie(result, read, written) =
          mUnicodeEncoder->EncodeFromUTF16WithoutReplacement(src, dst, false);
      if (result != kInputEmpty && result != kOutputFull) {
        // There's always room for one byte in the case of
        // an unmappable character, because otherwise
        // we'd have gotten `kOutputFull`.
        dst[written++] = '?';
      }
    } else {
      std::tie(result, read, written, std::ignore) =
          mUnicodeEncoder->EncodeFromUTF16(src, dst, false);
    }
    src = src.From(read);
    // Sadly, we still have test cases that implement nsIOutputStream in JS, so
    // the buffer needs to be zero-terminated for XPConnect to do its thing.
    // See bug 170416.
    bufferSpan[written] = 0;
    uint32_t streamWritten;
    nsresult rv = mStream->Write(reinterpret_cast<char*>(dst.Elements()),
                                 written, &streamWritten);
    if (NS_FAILED(rv)) {
      return rv;
    }
    if (result == kInputEmpty) {
      return NS_OK;
    }
  }
}

nsresult TextStreamer::EncodeAndWriteAndTruncate() {
  const nsresult rv = EncodeAndWrite();
  mOutputBuffer.Truncate();
  return rv;
}

/**
 * The scope may be limited to either a selection, range, or node.
 */
class EncodingScope {
 public:
  /**
   * @return true, iff the scope is limited to a selection, range or node.
   */
  bool IsLimited() const;

  RefPtr<Selection> mSelection;
  RefPtr<nsRange> mRange;
  nsCOMPtr<nsINode> mNode;
  bool mNodeIsContainer = false;
};

bool EncodingScope::IsLimited() const { return mSelection || mRange || mNode; }

struct RangeBoundariesInclusiveAncestorsAndOffsets {
  /**
   * https://dom.spec.whatwg.org/#concept-tree-inclusive-ancestor.
   */
  using InclusiveAncestors = AutoTArray<nsIContent*, 8>;

  /**
   * https://dom.spec.whatwg.org/#concept-tree-inclusive-ancestor.
   */
  using InclusiveAncestorsOffsets = AutoTArray<Maybe<uint32_t>, 8>;

  // The first node is the range's boundary node, the following ones the
  // ancestors.
  InclusiveAncestors mInclusiveAncestorsOfStart;
  // The first offset represents where at the boundary node the range starts.
  // Each other offset is the index of the child relative to its parent.
  InclusiveAncestorsOffsets mInclusiveAncestorsOffsetsOfStart;

  // The first node is the range's boundary node, the following one the
  // ancestors.
  InclusiveAncestors mInclusiveAncestorsOfEnd;
  // The first offset represents where at the boundary node the range ends.
  // Each other offset is the index of the child relative to its parent.
  InclusiveAncestorsOffsets mInclusiveAncestorsOffsetsOfEnd;
};

struct ContextInfoDepth {
  uint32_t mStart = 0;
  uint32_t mEnd = 0;
};

class nsDocumentEncoder : public nsIDocumentEncoder {
 protected:
  class RangeNodeContext {
   public:
    virtual ~RangeNodeContext() = default;

    virtual bool IncludeInContext(nsINode& aNode) const { return false; }

    virtual int32_t GetImmediateContextCount(
        const nsTArray<nsINode*>& aAncestorArray) const {
      return -1;
    }
  };

 public:
  nsDocumentEncoder();

 protected:
  /**
   * @param aRangeNodeContext has to be non-null.
   */
  explicit nsDocumentEncoder(UniquePtr<RangeNodeContext> aRangeNodeContext);

 public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_CLASS(nsDocumentEncoder)
  NS_DECL_NSIDOCUMENTENCODER

 protected:
  virtual ~nsDocumentEncoder();

  void Initialize(bool aClearCachedSerializer = true,
                  AllowRangeCrossShadowBoundary aAllowCrossShadowBoundary =
                      AllowRangeCrossShadowBoundary::No);

  /**
   * @param aMaxLength As described at
   * `nsIDocumentEncodder.encodeToStringWithMaxLength`.
   */
  nsresult SerializeDependingOnScope(uint32_t aMaxLength);

  nsresult SerializeSelection();

  nsresult SerializeNode();

  /**
   * @param aMaxLength As described at
   * `nsIDocumentEncodder.encodeToStringWithMaxLength`.
   */
  nsresult SerializeWholeDocument(uint32_t aMaxLength);

  /**
   * @param aFlags multiple of the flags defined in nsIDocumentEncoder.idl.o
   */
  static bool IsInvisibleNodeAndShouldBeSkipped(const nsINode& aNode,
                                                const uint32_t aFlags) {
    if (aFlags & SkipInvisibleContent) {
      // Treat the visibility of the ShadowRoot as if it were
      // the host content.
      //
      // FIXME(emilio): I suspect instead of this a bunch of the GetParent()
      // calls here should be doing GetFlattenedTreeParent, then this condition
      // should be unreachable...
      const nsINode* node{&aNode};
      if (const ShadowRoot* shadowRoot = ShadowRoot::FromNode(node)) {
        node = shadowRoot->GetHost();
      }

      if (node->IsContent()) {
        nsIFrame* frame = node->AsContent()->GetPrimaryFrame();
        if (!frame) {
          if (node->IsElement() && node->AsElement()->IsDisplayContents()) {
            return false;
          }
          if (node->IsText()) {
            // We have already checked that our parent is visible.
            //
            // FIXME(emilio): Text not assigned to a <slot> in Shadow DOM should
            // probably return false...
            return false;
          }
          if (node->IsHTMLElement(nsGkAtoms::rp)) {
            // Ruby parentheses are part of ruby structure, hence
            // shouldn't be stripped out even if it is not displayed.
            return false;
          }
          return true;
        }
        if (node->IsText() &&
            (!frame->StyleVisibility()->IsVisible() ||
             frame->IsHiddenByContentVisibilityOnAnyAncestor())) {
          return true;
        }
      }
    }
    return false;
  }

  void ReleaseDocumentReferenceAndInitialize(bool aClearCachedSerializer);

  class MOZ_STACK_CLASS AutoReleaseDocumentIfNeeded final {
   public:
    explicit AutoReleaseDocumentIfNeeded(nsDocumentEncoder* aEncoder)
        : mEncoder(aEncoder) {}

    ~AutoReleaseDocumentIfNeeded() {
      if (mEncoder->mFlags & RequiresReinitAfterOutput) {
        const bool clearCachedSerializer = false;
        mEncoder->ReleaseDocumentReferenceAndInitialize(clearCachedSerializer);
      }
    }

   private:
    nsDocumentEncoder* mEncoder;
  };

  nsCOMPtr<Document> mDocument;
  EncodingScope mEncodingScope;
  nsCOMPtr<nsIContentSerializer> mSerializer;

  Maybe<TextStreamer> mTextStreamer;
  nsCOMPtr<nsIDocumentEncoderNodeFixup> mNodeFixup;

  nsString mMimeType;
  const Encoding* mEncoding;
  // Multiple of the flags defined in nsIDocumentEncoder.idl.
  uint32_t mFlags;
  uint32_t mWrapColumn;
  // Whether the serializer cares about being notified to scan elements to
  // keep track of whether they are preformatted.  This stores the out
  // argument of nsIContentSerializer::Init().
  bool mNeedsPreformatScanning;
  bool mIsCopying;  // Set to true only while copying
  RefPtr<StringBuffer> mCachedBuffer;

  class NodeSerializer {
   public:
    /**
     * @param aFlags multiple of the flags defined in nsIDocumentEncoder.idl.
     */
    NodeSerializer(const bool& aNeedsPreformatScanning,
                   const nsCOMPtr<nsIContentSerializer>& aSerializer,
                   const uint32_t& aFlags,
                   const nsCOMPtr<nsIDocumentEncoderNodeFixup>& aNodeFixup,
                   Maybe<TextStreamer>& aTextStreamer)
        : mNeedsPreformatScanning{aNeedsPreformatScanning},
          mSerializer{aSerializer},
          mFlags{aFlags},
          mNodeFixup{aNodeFixup},
          mTextStreamer{aTextStreamer} {}

    nsresult SerializeNodeStart(nsINode& aOriginalNode, int32_t aStartOffset,
                                int32_t aEndOffset,
                                nsINode* aFixupNode = nullptr) const;

    enum class SerializeRoot { eYes, eNo };

    nsresult SerializeToStringRecursive(nsINode* aNode,
                                        SerializeRoot aSerializeRoot,
                                        uint32_t aMaxLength = 0) const;

    nsresult SerializeNodeEnd(nsINode& aOriginalNode,
                              nsINode* aFixupNode = nullptr) const;

    [[nodiscard]] nsresult SerializeTextNode(nsINode& aNode,
                                             int32_t aStartOffset,
                                             int32_t aEndOffset) const;

    nsresult SerializeToStringIterative(nsINode* aNode) const;

   private:
    const bool& mNeedsPreformatScanning;
    const nsCOMPtr<nsIContentSerializer>& mSerializer;
    // Multiple of the flags defined in nsIDocumentEncoder.idl.
    const uint32_t& mFlags;
    const nsCOMPtr<nsIDocumentEncoderNodeFixup>& mNodeFixup;
    Maybe<TextStreamer>& mTextStreamer;
  };

  NodeSerializer mNodeSerializer;

  const UniquePtr<RangeNodeContext> mRangeNodeContext;

  struct RangeContextSerializer final {
    RangeContextSerializer(const RangeNodeContext& aRangeNodeContext,
                           const NodeSerializer& aNodeSerializer)
        : mDisableContextSerialize{false},
          mRangeNodeContext{aRangeNodeContext},
          mNodeSerializer{aNodeSerializer} {}

    nsresult SerializeRangeContextStart(
        const nsTArray<nsINode*>& aAncestorArray);
    nsresult SerializeRangeContextEnd();

    // Used when context has already been serialized for
    // table cell selections (where parent is <tr>)
    bool mDisableContextSerialize;
    AutoTArray<AutoTArray<nsINode*, 8>, 8> mRangeContexts;

    const RangeNodeContext& mRangeNodeContext;

   private:
    const NodeSerializer& mNodeSerializer;
  };

  RangeContextSerializer mRangeContextSerializer;

  struct RangeSerializer {
    // @param aFlags multiple of the flags defined in nsIDocumentEncoder.idl.
    RangeSerializer(const uint32_t& aFlags,
                    const NodeSerializer& aNodeSerializer,
                    RangeContextSerializer& aRangeContextSerializer)
        : mStartRootIndex{0},
          mEndRootIndex{0},
          mHaltRangeHint{false},
          mFlags{aFlags},
          mNodeSerializer{aNodeSerializer},
          mRangeContextSerializer{aRangeContextSerializer} {}

    void Initialize(AllowRangeCrossShadowBoundary aAllowCrossShadowBoundary);

    /**
     * @param aDepth the distance (number of `GetParent` calls) from aNode to
     *               aRange's closest common inclusive ancestor.
     */
    nsresult SerializeRangeNodes(const nsRange* aRange, nsINode* aNode,
                                 int32_t aDepth);

    /**
     * Serialize aContent's children from aStartOffset to aEndOffset.
     *
     * @param aDepth the distance (number of `GetParent` calls) from aContent to
     *               aRange's closest common inclusive ancestor.
     */
    [[nodiscard]] nsresult SerializeChildrenOfContent(nsIContent& aContent,
                                                      uint32_t aStartOffset,
                                                      uint32_t aEndOffset,
                                                      const nsRange* aRange,
                                                      int32_t aDepth);

    nsresult SerializeRangeToString(const nsRange* aRange);

    /**
     * https://dom.spec.whatwg.org/#concept-tree-inclusive-ancestor.
     */
    nsCOMPtr<nsINode> mClosestCommonInclusiveAncestorOfRange;

    /**
     * https://dom.spec.whatwg.org/#concept-tree-inclusive-ancestor.
     */
    AutoTArray<nsINode*, 8> mCommonInclusiveAncestors;

    ContextInfoDepth mContextInfoDepth;

   private:
    struct StartAndEndContent {
      nsCOMPtr<nsIContent> mStart;
      nsCOMPtr<nsIContent> mEnd;
    };

    StartAndEndContent GetStartAndEndContentForRecursionLevel(
        int32_t aDepth) const;

    bool HasInvisibleParentAndShouldBeSkipped(nsINode& aNode) const;

    nsresult SerializeNodePartiallyContainedInRange(
        nsIContent& aContent, const StartAndEndContent& aStartAndEndContent,
        const nsRange& aRange, int32_t aDepth);

    nsresult SerializeTextNode(nsIContent& aContent,
                               const StartAndEndContent& aStartAndEndContent,
                               const nsRange& aRange) const;

    RangeBoundariesInclusiveAncestorsAndOffsets
        mRangeBoundariesInclusiveAncestorsAndOffsets;
    int32_t mStartRootIndex;
    int32_t mEndRootIndex;
    bool mHaltRangeHint;

    // Multiple of the flags defined in nsIDocumentEncoder.idl.
    const uint32_t& mFlags;

    const NodeSerializer& mNodeSerializer;
    RangeContextSerializer& mRangeContextSerializer;

    AllowRangeCrossShadowBoundary mAllowCrossShadowBoundary =
        AllowRangeCrossShadowBoundary::No;
  };

  RangeSerializer mRangeSerializer;
};

void nsDocumentEncoder::RangeSerializer::Initialize(
    AllowRangeCrossShadowBoundary aAllowCrossShadowBoundary) {
  mContextInfoDepth = {};
  mStartRootIndex = 0;
  mEndRootIndex = 0;
  mHaltRangeHint = false;
  mClosestCommonInclusiveAncestorOfRange = nullptr;
  mRangeBoundariesInclusiveAncestorsAndOffsets = {};
  mAllowCrossShadowBoundary = aAllowCrossShadowBoundary;
}

NS_IMPL_CYCLE_COLLECTING_ADDREF(nsDocumentEncoder)
NS_IMPL_CYCLE_COLLECTING_RELEASE_WITH_LAST_RELEASE(
    nsDocumentEncoder, ReleaseDocumentReferenceAndInitialize(true))

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(nsDocumentEncoder)
  NS_INTERFACE_MAP_ENTRY(nsIDocumentEncoder)
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

NS_IMPL_CYCLE_COLLECTION(
    nsDocumentEncoder, mDocument, mEncodingScope.mSelection,
    mEncodingScope.mRange, mEncodingScope.mNode, mSerializer,
    mRangeSerializer.mClosestCommonInclusiveAncestorOfRange)

nsDocumentEncoder::nsDocumentEncoder(
    UniquePtr<RangeNodeContext> aRangeNodeContext)
    : mEncoding(nullptr),
      mIsCopying(false),
      mCachedBuffer(nullptr),
      mNodeSerializer(mNeedsPreformatScanning, mSerializer, mFlags, mNodeFixup,
                      mTextStreamer),
      mRangeNodeContext(std::move(aRangeNodeContext)),
      mRangeContextSerializer(*mRangeNodeContext, mNodeSerializer),
      mRangeSerializer(mFlags, mNodeSerializer, mRangeContextSerializer) {
  MOZ_ASSERT(mRangeNodeContext);

  Initialize();
  mMimeType.AssignLiteral("text/plain");
}

nsDocumentEncoder::nsDocumentEncoder()
    : nsDocumentEncoder(MakeUnique<RangeNodeContext>()) {}

void nsDocumentEncoder::Initialize(
    bool aClearCachedSerializer,
    AllowRangeCrossShadowBoundary aAllowCrossShadowBoundary) {
  mFlags = 0;
  mWrapColumn = 72;
  mRangeSerializer.Initialize(aAllowCrossShadowBoundary);
  mNeedsPreformatScanning = false;
  mRangeContextSerializer.mDisableContextSerialize = false;
  mEncodingScope = {};
  mNodeFixup = nullptr;
  if (aClearCachedSerializer) {
    mSerializer = nullptr;
  }
}

static bool ParentIsTR(nsIContent* aContent) {
  mozilla::dom::Element* parent = aContent->GetParentElement();
  if (!parent) {
    return false;
  }
  return parent->IsHTMLElement(nsGkAtoms::tr);
}

static AllowRangeCrossShadowBoundary GetAllowRangeCrossShadowBoundary(
    const uint32_t aFlags) {
  return (aFlags & nsIDocumentEncoder::AllowCrossShadowBoundary)
             ? AllowRangeCrossShadowBoundary::Yes
             : AllowRangeCrossShadowBoundary::No;
}

nsresult nsDocumentEncoder::SerializeDependingOnScope(uint32_t aMaxLength) {
  nsresult rv = NS_OK;
  if (mEncodingScope.mSelection) {
    rv = SerializeSelection();
  } else if (nsRange* range = mEncodingScope.mRange) {
    rv = mRangeSerializer.SerializeRangeToString(range);
  } else if (mEncodingScope.mNode) {
    rv = SerializeNode();
  } else {
    rv = SerializeWholeDocument(aMaxLength);
  }

  mEncodingScope = {};

  return rv;
}

nsresult nsDocumentEncoder::SerializeSelection() {
  NS_ENSURE_TRUE(mEncodingScope.mSelection, NS_ERROR_FAILURE);

  nsresult rv = NS_OK;
  const Selection* selection = mEncodingScope.mSelection;
  nsCOMPtr<nsINode> node;
  nsCOMPtr<nsINode> prevNode;
  uint32_t firstRangeStartDepth = 0;
  const uint32_t rangeCount = selection->RangeCount();
  for (const uint32_t i : IntegerRange(rangeCount)) {
    MOZ_ASSERT(selection->RangeCount() == rangeCount);
    RefPtr<const nsRange> range = selection->GetRangeAt(i);

    // Bug 236546: newlines not added when copying table cells into clipboard
    // Each selected cell shows up as a range containing a row with a single
    // cell get the row, compare it to previous row and emit </tr><tr> as
    // needed Bug 137450: Problem copying/pasting a table from a web page to
    // Excel. Each separate block of <tr></tr> produced above will be wrapped
    // by the immediate context. This assumes that you can't select cells that
    // are multiple selections from two tables simultaneously.
    node = ShadowDOMSelectionHelpers::GetStartContainer(
        range, GetAllowRangeCrossShadowBoundary(mFlags));
    NS_ENSURE_TRUE(node, NS_ERROR_FAILURE);
    if (node != prevNode) {
      if (prevNode) {
        rv = mNodeSerializer.SerializeNodeEnd(*prevNode);
        NS_ENSURE_SUCCESS(rv, rv);
      }
      nsCOMPtr<nsIContent> content = nsIContent::FromNodeOrNull(node);
      if (content && content->IsHTMLElement(nsGkAtoms::tr) &&
          !ParentIsTR(content)) {
        if (!prevNode) {
          // Went from a non-<tr> to a <tr>
          mRangeSerializer.mCommonInclusiveAncestors.Clear();
          nsContentUtils::GetInclusiveAncestors(
              node->GetParentNode(),
              mRangeSerializer.mCommonInclusiveAncestors);
          rv = mRangeContextSerializer.SerializeRangeContextStart(
              mRangeSerializer.mCommonInclusiveAncestors);
          NS_ENSURE_SUCCESS(rv, rv);
          // Don't let SerializeRangeToString serialize the context again
          mRangeContextSerializer.mDisableContextSerialize = true;
        }

        rv = mNodeSerializer.SerializeNodeStart(*node, 0, -1);
        NS_ENSURE_SUCCESS(rv, rv);
        prevNode = node;
      } else if (prevNode) {
        // Went from a <tr> to a non-<tr>
        mRangeContextSerializer.mDisableContextSerialize = false;

        // `mCommonInclusiveAncestors` is used in `EncodeToStringWithContext`
        // too. Update it here to mimic the old behavior.
        mRangeSerializer.mCommonInclusiveAncestors.Clear();
        nsContentUtils::GetInclusiveAncestors(
            prevNode->GetParentNode(),
            mRangeSerializer.mCommonInclusiveAncestors);

        rv = mRangeContextSerializer.SerializeRangeContextEnd();
        NS_ENSURE_SUCCESS(rv, rv);
        prevNode = nullptr;
      }
    }

    rv = mRangeSerializer.SerializeRangeToString(range);
    NS_ENSURE_SUCCESS(rv, rv);
    if (i == 0) {
      firstRangeStartDepth = mRangeSerializer.mContextInfoDepth.mStart;
    }
  }
  mRangeSerializer.mContextInfoDepth.mStart = firstRangeStartDepth;

  if (prevNode) {
    rv = mNodeSerializer.SerializeNodeEnd(*prevNode);
    NS_ENSURE_SUCCESS(rv, rv);
    mRangeContextSerializer.mDisableContextSerialize = false;

    // `mCommonInclusiveAncestors` is used in `EncodeToStringWithContext`
    // too. Update it here to mimic the old behavior.
    mRangeSerializer.mCommonInclusiveAncestors.Clear();
    nsContentUtils::GetInclusiveAncestors(
        prevNode->GetParentNode(), mRangeSerializer.mCommonInclusiveAncestors);

    rv = mRangeContextSerializer.SerializeRangeContextEnd();
    NS_ENSURE_SUCCESS(rv, rv);
  }

  // Just to be safe
  mRangeContextSerializer.mDisableContextSerialize = false;

  return rv;
}

nsresult nsDocumentEncoder::SerializeNode() {
  NS_ENSURE_TRUE(mEncodingScope.mNode, NS_ERROR_FAILURE);

  nsresult rv = NS_OK;
  nsINode* node = mEncodingScope.mNode;
  const bool nodeIsContainer = mEncodingScope.mNodeIsContainer;
  if (!mNodeFixup && !(mFlags & SkipInvisibleContent) && !mTextStreamer &&
      nodeIsContainer) {
    rv = mNodeSerializer.SerializeToStringIterative(node);
  } else {
    rv = mNodeSerializer.SerializeToStringRecursive(
        node, nodeIsContainer ? NodeSerializer::SerializeRoot::eNo
                              : NodeSerializer::SerializeRoot::eYes);
  }

  return rv;
}

nsresult nsDocumentEncoder::SerializeWholeDocument(uint32_t aMaxLength) {
  NS_ENSURE_FALSE(mEncodingScope.mSelection, NS_ERROR_FAILURE);
  NS_ENSURE_FALSE(mEncodingScope.mRange, NS_ERROR_FAILURE);
  NS_ENSURE_FALSE(mEncodingScope.mNode, NS_ERROR_FAILURE);

  nsresult rv = mSerializer->AppendDocumentStart(mDocument);
  NS_ENSURE_SUCCESS(rv, rv);

  rv = mNodeSerializer.SerializeToStringRecursive(
      mDocument, NodeSerializer::SerializeRoot::eYes, aMaxLength);
  return rv;
}

nsDocumentEncoder::~nsDocumentEncoder() = default;

NS_IMETHODIMP
nsDocumentEncoder::Init(Document* aDocument, const nsAString& aMimeType,
                        uint32_t aFlags) {
  if (!aDocument) {
    return NS_ERROR_INVALID_ARG;
  }

  Initialize(!mMimeType.Equals(aMimeType),
             GetAllowRangeCrossShadowBoundary(aFlags));

  mDocument = aDocument;

  mMimeType = aMimeType;

  mFlags = aFlags;
  mIsCopying = false;

  return NS_OK;
}

NS_IMETHODIMP
nsDocumentEncoder::SetWrapColumn(uint32_t aWC) {
  mWrapColumn = aWC;
  return NS_OK;
}

NS_IMETHODIMP
nsDocumentEncoder::SetSelection(Selection* aSelection) {
  mEncodingScope.mSelection = aSelection;
  return NS_OK;
}

NS_IMETHODIMP
nsDocumentEncoder::SetRange(nsRange* aRange) {
  mEncodingScope.mRange = aRange;
  return NS_OK;
}

NS_IMETHODIMP
nsDocumentEncoder::SetNode(nsINode* aNode) {
  mEncodingScope.mNodeIsContainer = false;
  mEncodingScope.mNode = aNode;
  return NS_OK;
}

NS_IMETHODIMP
nsDocumentEncoder::SetContainerNode(nsINode* aContainer) {
  mEncodingScope.mNodeIsContainer = true;
  mEncodingScope.mNode = aContainer;
  return NS_OK;
}

NS_IMETHODIMP
nsDocumentEncoder::SetCharset(const nsACString& aCharset) {
  const Encoding* encoding = Encoding::ForLabel(aCharset);
  if (!encoding) {
    return NS_ERROR_UCONV_NOCONV;
  }
  mEncoding = encoding->OutputEncoding();
  return NS_OK;
}

NS_IMETHODIMP
nsDocumentEncoder::GetMimeType(nsAString& aMimeType) {
  aMimeType = mMimeType;
  return NS_OK;
}

class FixupNodeDeterminer {
 public:
  FixupNodeDeterminer(nsIDocumentEncoderNodeFixup* aNodeFixup,
                      nsINode* aFixupNode, nsINode& aOriginalNode)
      : mIsSerializationOfFixupChildrenNeeded{false},
        mNodeFixup(aNodeFixup),
        mOriginalNode(aOriginalNode) {
    if (mNodeFixup) {
      if (aFixupNode) {
        mFixupNode = aFixupNode;
      } else {
        mNodeFixup->FixupNode(&mOriginalNode,
                              &mIsSerializationOfFixupChildrenNeeded,
                              getter_AddRefs(mFixupNode));
      }
    }
  }

  bool IsSerializationOfFixupChildrenNeeded() const {
    return mIsSerializationOfFixupChildrenNeeded;
  }

  /**
   * @return The fixup node, if available, otherwise the original node. The
   * former is kept alive by this object.
   */
  nsINode& GetFixupNodeFallBackToOriginalNode() const {
    return mFixupNode ? *mFixupNode : mOriginalNode;
  }

 private:
  bool mIsSerializationOfFixupChildrenNeeded;
  nsIDocumentEncoderNodeFixup* mNodeFixup;
  nsCOMPtr<nsINode> mFixupNode;
  nsINode& mOriginalNode;
};

nsresult nsDocumentEncoder::NodeSerializer::SerializeNodeStart(
    nsINode& aOriginalNode, int32_t aStartOffset, int32_t aEndOffset,
    nsINode* aFixupNode) const {
  if (mNeedsPreformatScanning) {
    if (aOriginalNode.IsElement()) {
      mSerializer->ScanElementForPreformat(aOriginalNode.AsElement());
    } else if (aOriginalNode.IsText()) {
      const nsCOMPtr<nsINode> parent = aOriginalNode.GetParent();
      if (parent && parent->IsElement()) {
        mSerializer->ScanElementForPreformat(parent->AsElement());
      }
    }
  }

  if (IsInvisibleNodeAndShouldBeSkipped(aOriginalNode, mFlags)) {
    return NS_OK;
  }

  FixupNodeDeterminer fixupNodeDeterminer{mNodeFixup, aFixupNode,
                                          aOriginalNode};
  nsINode* node = &fixupNodeDeterminer.GetFixupNodeFallBackToOriginalNode();

  nsresult rv = NS_OK;

  if (node->IsElement()) {
    if ((mFlags & (nsIDocumentEncoder::OutputPreformatted |
                   nsIDocumentEncoder::OutputDropInvisibleBreak)) &&
        nsLayoutUtils::IsInvisibleBreak(node)) {
      return rv;
    }
    rv = mSerializer->AppendElementStart(node->AsElement(),
                                         aOriginalNode.AsElement());
    return rv;
  }

  switch (node->NodeType()) {
    case nsINode::TEXT_NODE: {
      rv = mSerializer->AppendText(node->AsText(), aStartOffset, aEndOffset);
      break;
    }
    case nsINode::CDATA_SECTION_NODE: {
      rv = mSerializer->AppendCDATASection(node->AsText(), aStartOffset,
                                           aEndOffset);
      break;
    }
    case nsINode::PROCESSING_INSTRUCTION_NODE: {
      rv = mSerializer->AppendProcessingInstruction(
          static_cast<ProcessingInstruction*>(node), aStartOffset, aEndOffset);
      break;
    }
    case nsINode::COMMENT_NODE: {
      rv = mSerializer->AppendComment(static_cast<Comment*>(node), aStartOffset,
                                      aEndOffset);
      break;
    }
    case nsINode::DOCUMENT_TYPE_NODE: {
      rv = mSerializer->AppendDoctype(static_cast<DocumentType*>(node));
      break;
    }
  }

  return rv;
}

nsresult nsDocumentEncoder::NodeSerializer::SerializeNodeEnd(
    nsINode& aOriginalNode, nsINode* aFixupNode) const {
  if (mNeedsPreformatScanning) {
    if (aOriginalNode.IsElement()) {
      mSerializer->ForgetElementForPreformat(aOriginalNode.AsElement());
    } else if (aOriginalNode.IsText()) {
      const nsCOMPtr<nsINode> parent = aOriginalNode.GetParent();
      if (parent && parent->IsElement()) {
        mSerializer->ForgetElementForPreformat(parent->AsElement());
      }
    }
  }

  if (IsInvisibleNodeAndShouldBeSkipped(aOriginalNode, mFlags)) {
    return NS_OK;
  }

  nsresult rv = NS_OK;

  FixupNodeDeterminer fixupNodeDeterminer{mNodeFixup, aFixupNode,
                                          aOriginalNode};
  nsINode* node = &fixupNodeDeterminer.GetFixupNodeFallBackToOriginalNode();

  if (node->IsElement()) {
    rv = mSerializer->AppendElementEnd(node->AsElement(),
                                       aOriginalNode.AsElement());
  }

  return rv;
}

nsresult nsDocumentEncoder::NodeSerializer::SerializeToStringRecursive(
    nsINode* aNode, SerializeRoot aSerializeRoot, uint32_t aMaxLength) const {
  uint32_t outputLength{0};
  nsresult rv = mSerializer->GetOutputLength(outputLength);
  NS_ENSURE_SUCCESS(rv, rv);

  if (aMaxLength > 0 && outputLength >= aMaxLength) {
    return NS_OK;
  }

  NS_ENSURE_TRUE(aNode, NS_ERROR_NULL_POINTER);

  if (IsInvisibleNodeAndShouldBeSkipped(*aNode, mFlags)) {
    return NS_OK;
  }

  FixupNodeDeterminer fixupNodeDeterminer{mNodeFixup, nullptr, *aNode};
  nsINode* maybeFixedNode =
      &fixupNodeDeterminer.GetFixupNodeFallBackToOriginalNode();

  if (mFlags & SkipInvisibleContent) {
    if (aNode->IsContent()) {
      if (nsIFrame* frame = aNode->AsContent()->GetPrimaryFrame()) {
        if (!frame->IsSelectable()) {
          aSerializeRoot = SerializeRoot::eNo;
        }
      }
    }
  }

  if (aSerializeRoot == SerializeRoot::eYes) {
    int32_t endOffset = -1;
    if (aMaxLength > 0) {
      MOZ_ASSERT(aMaxLength >= outputLength);
      endOffset = aMaxLength - outputLength;
    }
    rv = SerializeNodeStart(*aNode, 0, endOffset, maybeFixedNode);
    NS_ENSURE_SUCCESS(rv, rv);
  }

  ShadowRoot* shadowRoot = ShadowDOMSelectionHelpers::GetShadowRoot(
      aNode, GetAllowRangeCrossShadowBoundary(mFlags));

  if (shadowRoot) {
    MOZ_ASSERT(StaticPrefs::dom_shadowdom_selection_across_boundary_enabled());
    // Serialize the ShadowRoot first when the entire node needs to be
    // serialized.
    SerializeToStringRecursive(shadowRoot, aSerializeRoot, aMaxLength);
  }

  nsINode* node = fixupNodeDeterminer.IsSerializationOfFixupChildrenNeeded()
                      ? maybeFixedNode
                      : aNode;

  int32_t counter = -1;

  const bool allowCrossShadowBoundary =
      GetAllowRangeCrossShadowBoundary(mFlags) ==
      AllowRangeCrossShadowBoundary::Yes;
  auto GetNextNode = [&counter, node, allowCrossShadowBoundary](
                         nsINode* aCurrentNode) -> nsINode* {
    ++counter;
    if (allowCrossShadowBoundary) {
      if (const auto* slot = HTMLSlotElement::FromNode(node)) {
        auto assigned = slot->AssignedNodes();
        if (size_t(counter) < assigned.Length()) {
          return assigned[counter];
        }
        return nullptr;
      }
    }

    if (counter == 0) {
      return node->GetFirstChildOfTemplateOrNode();
    }
    // counter isn't really used for non-slot cases.
    return aCurrentNode->GetNextSibling();
  };

  if (!shadowRoot) {
    // We only iterate light DOM children of aNode if it isn't a shadow host
    // since it doesn't make sense to iterate them this way. Slotted contents
    // has been handled by serializing the <slot> element.
    for (nsINode* child = GetNextNode(nullptr); child;
         child = GetNextNode(child)) {
      rv = SerializeToStringRecursive(child, SerializeRoot::eYes, aMaxLength);
      NS_ENSURE_SUCCESS(rv, rv);
    }
  }

  if (aSerializeRoot == SerializeRoot::eYes) {
    rv = SerializeNodeEnd(*aNode, maybeFixedNode);
    NS_ENSURE_SUCCESS(rv, rv);
  }

  if (mTextStreamer) {
    rv = mTextStreamer->FlushIfStringLongEnough();
  }

  return rv;
}

nsresult nsDocumentEncoder::NodeSerializer::SerializeToStringIterative(
    nsINode* aNode) const {
  nsresult rv;

  nsINode* node = aNode->GetFirstChildOfTemplateOrNode();
  while (node) {
    nsINode* current = node;
    rv = SerializeNodeStart(*current, 0, -1, current);
    NS_ENSURE_SUCCESS(rv, rv);
    node = current->GetFirstChildOfTemplateOrNode();
    while (!node && current && current != aNode) {
      rv = SerializeNodeEnd(*current);
      NS_ENSURE_SUCCESS(rv, rv);
      // Check if we have siblings.
      node = current->GetNextSibling();
      if (!node) {
        // Perhaps parent node has siblings.
        current = current->GetParentNode();

        // Handle template element. If the parent is a template's content,
        // then adjust the parent to be the template element.
        if (current && current != aNode && current->IsDocumentFragment()) {
          nsIContent* host = current->AsDocumentFragment()->GetHost();
          if (host && host->IsHTMLElement(nsGkAtoms::_template)) {
            current = host;
          }
        }
      }
    }
  }

  return NS_OK;
}

static bool IsTextNode(nsINode* aNode) { return aNode && aNode->IsText(); }

nsresult nsDocumentEncoder::NodeSerializer::SerializeTextNode(
    nsINode& aNode, int32_t aStartOffset, int32_t aEndOffset) const {
  MOZ_ASSERT(IsTextNode(&aNode));

  nsresult rv = SerializeNodeStart(aNode, aStartOffset, aEndOffset);
  NS_ENSURE_SUCCESS(rv, rv);
  rv = SerializeNodeEnd(aNode);
  NS_ENSURE_SUCCESS(rv, rv);
  return rv;
}

nsDocumentEncoder::RangeSerializer::StartAndEndContent
nsDocumentEncoder::RangeSerializer::GetStartAndEndContentForRecursionLevel(
    const int32_t aDepth) const {
  StartAndEndContent result;

  const auto& inclusiveAncestorsOfStart =
      mRangeBoundariesInclusiveAncestorsAndOffsets.mInclusiveAncestorsOfStart;
  const auto& inclusiveAncestorsOfEnd =
      mRangeBoundariesInclusiveAncestorsAndOffsets.mInclusiveAncestorsOfEnd;
  int32_t start = mStartRootIndex - aDepth;
  if (start >= 0 && (uint32_t)start <= inclusiveAncestorsOfStart.Length()) {
    result.mStart = inclusiveAncestorsOfStart[start];
  }

  int32_t end = mEndRootIndex - aDepth;
  if (end >= 0 && (uint32_t)end <= inclusiveAncestorsOfEnd.Length()) {
    result.mEnd = inclusiveAncestorsOfEnd[end];
  }

  return result;
}

nsresult nsDocumentEncoder::RangeSerializer::SerializeTextNode(
    nsIContent& aContent, const StartAndEndContent& aStartAndEndContent,
    const nsRange& aRange) const {
  const int32_t startOffset = (aStartAndEndContent.mStart == &aContent)
                                  ? ShadowDOMSelectionHelpers::StartOffset(
                                        &aRange, mAllowCrossShadowBoundary)
                                  : 0;
  const int32_t endOffset = (aStartAndEndContent.mEnd == &aContent)
                                ? ShadowDOMSelectionHelpers::EndOffset(
                                      &aRange, mAllowCrossShadowBoundary)
                                : -1;
  return mNodeSerializer.SerializeTextNode(aContent, startOffset, endOffset);
}

nsresult nsDocumentEncoder::RangeSerializer::SerializeRangeNodes(
    const nsRange* const aRange, nsINode* const aNode, const int32_t aDepth) {
  MOZ_ASSERT(aDepth >= 0);
  MOZ_ASSERT(aRange);

  nsCOMPtr<nsIContent> content = nsIContent::FromNodeOrNull(aNode);
  NS_ENSURE_TRUE(content, NS_ERROR_FAILURE);

  if (nsDocumentEncoder::IsInvisibleNodeAndShouldBeSkipped(*aNode, mFlags)) {
    return NS_OK;
  }

  nsresult rv = NS_OK;

  StartAndEndContent startAndEndContent =
      GetStartAndEndContentForRecursionLevel(aDepth);

  if (startAndEndContent.mStart != content &&
      startAndEndContent.mEnd != content) {
    // node is completely contained in range.  Serialize the whole subtree
    // rooted by this node.
    rv = mNodeSerializer.SerializeToStringRecursive(
        aNode, NodeSerializer::SerializeRoot::eYes);
    NS_ENSURE_SUCCESS(rv, rv);
  } else {
    rv = SerializeNodePartiallyContainedInRange(*content, startAndEndContent,
                                                *aRange, aDepth);
    if (NS_WARN_IF(NS_FAILED(rv))) {
      return rv;
    }
  }
  return NS_OK;
}

nsresult
nsDocumentEncoder::RangeSerializer::SerializeNodePartiallyContainedInRange(
    nsIContent& aContent, const StartAndEndContent& aStartAndEndContent,
    const nsRange& aRange, const int32_t aDepth) {
  // due to implementation it is impossible for text node to be both start and
  // end of range.  We would have handled that case without getting here.
  // XXXsmaug What does this all mean?
  if (IsTextNode(&aContent)) {
    nsresult rv = SerializeTextNode(aContent, aStartAndEndContent, aRange);
    NS_ENSURE_SUCCESS(rv, rv);
  } else {
    if (&aContent != mClosestCommonInclusiveAncestorOfRange) {
      if (mRangeContextSerializer.mRangeNodeContext.IncludeInContext(
              aContent)) {
        // halt the incrementing of mContextInfoDepth.  This
        // is so paste client will include this node in paste.
        mHaltRangeHint = true;
      }
      if ((aStartAndEndContent.mStart == &aContent) && !mHaltRangeHint) {
        ++mContextInfoDepth.mStart;
      }
      if ((aStartAndEndContent.mEnd == &aContent) && !mHaltRangeHint) {
        ++mContextInfoDepth.mEnd;
      }

      // serialize the start of this node
      nsresult rv = mNodeSerializer.SerializeNodeStart(aContent, 0, -1);
      NS_ENSURE_SUCCESS(rv, rv);
    }

    const auto& inclusiveAncestorsOffsetsOfStart =
        mRangeBoundariesInclusiveAncestorsAndOffsets
            .mInclusiveAncestorsOffsetsOfStart;
    const auto& inclusiveAncestorsOffsetsOfEnd =
        mRangeBoundariesInclusiveAncestorsAndOffsets
            .mInclusiveAncestorsOffsetsOfEnd;
    // do some calculations that will tell us which children of this
    // node are in the range.
    Maybe<uint32_t> startOffset = Some(0);
    Maybe<uint32_t> endOffset;
    if (aStartAndEndContent.mStart == &aContent && mStartRootIndex >= aDepth) {
      startOffset = inclusiveAncestorsOffsetsOfStart[mStartRootIndex - aDepth];
    }
    if (aStartAndEndContent.mEnd == &aContent && mEndRootIndex >= aDepth) {
      endOffset = inclusiveAncestorsOffsetsOfEnd[mEndRootIndex - aDepth];
    }
    // generated aContent will cause offset values of Nothing to be returned.
    if (startOffset.isNothing()) {
      startOffset = Some(0);
    }
    if (endOffset.isNothing()) {
      endOffset = Some(aContent.GetChildCount());

      if (mAllowCrossShadowBoundary == AllowRangeCrossShadowBoundary::Yes) {
        if (const auto* slot = HTMLSlotElement::FromNode(aContent)) {
          const auto& assignedNodes = slot->AssignedNodes();
          if (!assignedNodes.IsEmpty()) {
            endOffset = Some(assignedNodes.Length());
          }
        }
      }
    } else {
      // if we are at the "tip" of the selection, endOffset is fine.
      // otherwise, we need to add one.  This is because of the semantics
      // of the offset list created by GetInclusiveAncestorsAndOffsets().  The
      // intermediate points on the list use the endOffset of the
      // location of the ancestor, rather than just past it.  So we need
      // to add one here in order to include it in the children we serialize.
      const nsINode* endContainer = ShadowDOMSelectionHelpers::GetEndContainer(
          &aRange, mAllowCrossShadowBoundary);
      if (&aContent != endContainer) {
        MOZ_ASSERT(*endOffset != UINT32_MAX);
        endOffset.ref()++;
      }
    }

    MOZ_ASSERT(endOffset.isSome());
    nsresult rv = SerializeChildrenOfContent(aContent, *startOffset, *endOffset,
                                             &aRange, aDepth);
    NS_ENSURE_SUCCESS(rv, rv);

    // serialize the end of this node
    if (&aContent != mClosestCommonInclusiveAncestorOfRange) {
      nsresult rv = mNodeSerializer.SerializeNodeEnd(aContent);
      NS_ENSURE_SUCCESS(rv, rv);
    }
  }

  return NS_OK;
}

static nsINode* GetChildAtInFlatTreeForSelection(const nsINode& aNode,
                                                 const uint32_t aIndex) {
  if (ShadowRoot* shadowRoot = aNode.GetShadowRoot()) {
    if (shadowRoot->IsUAWidget()) {
      return aNode.GetChildAt_Deprecated(aIndex);
    }
  }
  return aNode.GetChildAtInFlatTree(aIndex);
}

nsresult nsDocumentEncoder::RangeSerializer::SerializeChildrenOfContent(
    nsIContent& aContent, uint32_t aStartOffset, uint32_t aEndOffset,
    const nsRange* aRange, int32_t aDepth) {
  ShadowRoot* shadowRoot = ShadowDOMSelectionHelpers::GetShadowRoot(
      &aContent, mAllowCrossShadowBoundary);
  if (shadowRoot) {
    // Serialize the ShadowRoot when the entire node needs to be serialized.
    // Return early to skip light DOM children.
    SerializeRangeNodes(aRange, shadowRoot, aDepth + 1);
    return NS_OK;
  }

  if (!aEndOffset) {
    return NS_OK;
  }

  nsINode* childAsNode =
      mAllowCrossShadowBoundary == AllowRangeCrossShadowBoundary::Yes
          ? GetChildAtInFlatTreeForSelection(aContent, aStartOffset)
          : aContent.GetChildAt_Deprecated(aStartOffset);

  MOZ_ASSERT_IF(childAsNode, childAsNode->IsContent());

  auto GetNextSibling = [this, &aContent](
                            nsINode* aCurrentNode,
                            uint32_t aCurrentIndex) -> nsIContent* {
    if (mAllowCrossShadowBoundary == AllowRangeCrossShadowBoundary::Yes) {
      if (const auto* slot = HTMLSlotElement::FromNode(&aContent)) {
        auto assigned = slot->AssignedNodes();
        if (++aCurrentIndex < assigned.Length()) {
          return nsIContent::FromNode(assigned[aCurrentIndex]);
        }
        return nullptr;
      }
    }

    return aCurrentNode->GetNextSibling();
  };

  for (size_t j = aStartOffset; childAsNode && j < aEndOffset; ++j) {
    nsresult rv{NS_OK};
    const bool isFirstOrLastNodeToSerialize =
        j == aStartOffset || j == aEndOffset - 1;
    if (isFirstOrLastNodeToSerialize) {
      rv = SerializeRangeNodes(aRange, childAsNode, aDepth + 1);
    } else {
      rv = mNodeSerializer.SerializeToStringRecursive(
          childAsNode, NodeSerializer::SerializeRoot::eYes);
    }

    if (NS_FAILED(rv)) {
      return rv;
    }

    childAsNode = GetNextSibling(childAsNode, j);
  }

  return NS_OK;
}

nsresult nsDocumentEncoder::RangeContextSerializer::SerializeRangeContextStart(
    const nsTArray<nsINode*>& aAncestorArray) {
  if (mDisableContextSerialize) {
    return NS_OK;
  }

  AutoTArray<nsINode*, 8>* serializedContext = mRangeContexts.AppendElement();

  int32_t i = aAncestorArray.Length(), j;
  nsresult rv = NS_OK;

  // currently only for table-related elements; see Bug 137450
  j = mRangeNodeContext.GetImmediateContextCount(aAncestorArray);

  while (i > 0) {
    nsINode* node = aAncestorArray.ElementAt(--i);
    if (!node) break;

    // Either a general inclusion or as immediate context
    if (mRangeNodeContext.IncludeInContext(*node) || i < j) {
      rv = mNodeSerializer.SerializeNodeStart(*node, 0, -1);
      serializedContext->AppendElement(node);
      if (NS_FAILED(rv)) break;
    }
  }

  return rv;
}

nsresult nsDocumentEncoder::RangeContextSerializer::SerializeRangeContextEnd() {
  if (mDisableContextSerialize) {
    return NS_OK;
  }

  MOZ_RELEASE_ASSERT(!mRangeContexts.IsEmpty(),
                     "Tried to end context without starting one.");
  AutoTArray<nsINode*, 8>& serializedContext = mRangeContexts.LastElement();

  nsresult rv = NS_OK;
  for (nsINode* node : Reversed(serializedContext)) {
    rv = mNodeSerializer.SerializeNodeEnd(*node);

    if (NS_FAILED(rv)) break;
  }

  mRangeContexts.RemoveLastElement();
  return rv;
}

bool nsDocumentEncoder::RangeSerializer::HasInvisibleParentAndShouldBeSkipped(
    nsINode& aNode) const {
  if (!(mFlags & SkipInvisibleContent)) {
    return false;
  }

  // Check that the parent is visible if we don't a frame.
  // IsInvisibleNodeAndShouldBeSkipped() will do it when there's a frame.
  nsCOMPtr<nsIContent> content = nsIContent::FromNode(aNode);
  if (content && !content->GetPrimaryFrame()) {
    nsIContent* parent = content->GetParent();
    return !parent || IsInvisibleNodeAndShouldBeSkipped(*parent, mFlags);
  }

  return false;
}

nsresult nsDocumentEncoder::RangeSerializer::SerializeRangeToString(
    const nsRange* aRange) {
  if (!aRange ||
      (aRange->Collapsed() &&
       (mAllowCrossShadowBoundary == AllowRangeCrossShadowBoundary::No ||
        !aRange->MayCrossShadowBoundary()))) {
    return NS_OK;
  }

  // Consider a case where the boundary of the selection is ShadowRoot (ie, the
  // first child of ShadowRoot is selected, so ShadowRoot is the container hence
  // the boundary), allowing GetClosestCommonInclusiveAncestor to cross the
  // boundary can return the host element as the container.
  // SerializeRangeContextStart doesn't support this case.
  mClosestCommonInclusiveAncestorOfRange =
      aRange->GetClosestCommonInclusiveAncestor(mAllowCrossShadowBoundary);

  if (!mClosestCommonInclusiveAncestorOfRange) {
    return NS_OK;
  }

  nsINode* startContainer = ShadowDOMSelectionHelpers::GetStartContainer(
      aRange, mAllowCrossShadowBoundary);
  NS_ENSURE_TRUE(startContainer, NS_ERROR_FAILURE);
  const int32_t startOffset =
      ShadowDOMSelectionHelpers::StartOffset(aRange, mAllowCrossShadowBoundary);

  nsINode* endContainer = ShadowDOMSelectionHelpers::GetEndContainer(
      aRange, mAllowCrossShadowBoundary);
  NS_ENSURE_TRUE(endContainer, NS_ERROR_FAILURE);
  const int32_t endOffset =
      ShadowDOMSelectionHelpers::EndOffset(aRange, mAllowCrossShadowBoundary);

  mContextInfoDepth = {};
  mCommonInclusiveAncestors.Clear();

  mRangeBoundariesInclusiveAncestorsAndOffsets = {};
  auto& inclusiveAncestorsOfStart =
      mRangeBoundariesInclusiveAncestorsAndOffsets.mInclusiveAncestorsOfStart;
  auto& inclusiveAncestorsOffsetsOfStart =
      mRangeBoundariesInclusiveAncestorsAndOffsets
          .mInclusiveAncestorsOffsetsOfStart;
  auto& inclusiveAncestorsOfEnd =
      mRangeBoundariesInclusiveAncestorsAndOffsets.mInclusiveAncestorsOfEnd;
  auto& inclusiveAncestorsOffsetsOfEnd =
      mRangeBoundariesInclusiveAncestorsAndOffsets
          .mInclusiveAncestorsOffsetsOfEnd;

  nsContentUtils::GetInclusiveAncestors(mClosestCommonInclusiveAncestorOfRange,
                                        mCommonInclusiveAncestors);
  if (mAllowCrossShadowBoundary == AllowRangeCrossShadowBoundary::Yes) {
    nsContentUtils::GetFlattenedTreeAncestorsAndOffsets(
        startContainer, startOffset, inclusiveAncestorsOfStart,
        inclusiveAncestorsOffsetsOfStart);
    nsContentUtils::GetFlattenedTreeAncestorsAndOffsets(
        endContainer, endOffset, inclusiveAncestorsOfEnd,
        inclusiveAncestorsOffsetsOfEnd);
  } else {
    nsContentUtils::GetInclusiveAncestorsAndOffsets(
        startContainer, startOffset, inclusiveAncestorsOfStart,
        inclusiveAncestorsOffsetsOfStart);
    nsContentUtils::GetInclusiveAncestorsAndOffsets(
        endContainer, endOffset, inclusiveAncestorsOfEnd,
        inclusiveAncestorsOffsetsOfEnd);
  }

  nsCOMPtr<nsIContent> commonContent =
      nsIContent::FromNodeOrNull(mClosestCommonInclusiveAncestorOfRange);
  mStartRootIndex = inclusiveAncestorsOfStart.IndexOf(commonContent);
  mEndRootIndex = inclusiveAncestorsOfEnd.IndexOf(commonContent);

  nsresult rv = NS_OK;

  rv = mRangeContextSerializer.SerializeRangeContextStart(
      mCommonInclusiveAncestors);
  NS_ENSURE_SUCCESS(rv, rv);

  if (startContainer == endContainer && IsTextNode(startContainer)) {
    if (HasInvisibleParentAndShouldBeSkipped(*startContainer)) {
      return NS_OK;
    }
    rv = mNodeSerializer.SerializeTextNode(*startContainer, startOffset,
                                           endOffset);
    NS_ENSURE_SUCCESS(rv, rv);
  } else {
    rv = SerializeRangeNodes(aRange, mClosestCommonInclusiveAncestorOfRange, 0);
    NS_ENSURE_SUCCESS(rv, rv);
  }
  rv = mRangeContextSerializer.SerializeRangeContextEnd();
  NS_ENSURE_SUCCESS(rv, rv);

  return rv;
}

void nsDocumentEncoder::ReleaseDocumentReferenceAndInitialize(
    bool aClearCachedSerializer) {
  mDocument = nullptr;

  Initialize(aClearCachedSerializer);
}

NS_IMETHODIMP
nsDocumentEncoder::EncodeToString(nsAString& aOutputString) {
  return EncodeToStringWithMaxLength(0, aOutputString);
}

NS_IMETHODIMP
nsDocumentEncoder::EncodeToStringWithMaxLength(uint32_t aMaxLength,
                                               nsAString& aOutputString) {
  MOZ_ASSERT(mRangeContextSerializer.mRangeContexts.IsEmpty(),
             "Re-entrant call to nsDocumentEncoder.");
  auto rangeContextGuard =
      MakeScopeExit([&] { mRangeContextSerializer.mRangeContexts.Clear(); });

  if (!mDocument) return NS_ERROR_NOT_INITIALIZED;

  AutoReleaseDocumentIfNeeded autoReleaseDocument(this);

  aOutputString.Truncate();

  nsString output;
  static const size_t kStringBufferSizeInBytes = 2048;
  if (!mCachedBuffer) {
    mCachedBuffer = StringBuffer::Alloc(kStringBufferSizeInBytes);
    if (NS_WARN_IF(!mCachedBuffer)) {
      return NS_ERROR_OUT_OF_MEMORY;
    }
  }
  NS_ASSERTION(
      !mCachedBuffer->IsReadonly(),
      "nsIDocumentEncoder shouldn't keep reference to non-readonly buffer!");
  static_cast<char16_t*>(mCachedBuffer->Data())[0] = char16_t(0);
  output.Assign(mCachedBuffer.forget(), 0);

  if (!mSerializer) {
    nsAutoCString progId(NS_CONTENTSERIALIZER_CONTRACTID_PREFIX);
    AppendUTF16toUTF8(mMimeType, progId);

    mSerializer = do_CreateInstance(progId.get());
    NS_ENSURE_TRUE(mSerializer, NS_ERROR_NOT_IMPLEMENTED);
  }

  nsresult rv = NS_OK;

  bool rewriteEncodingDeclaration =
      !mEncodingScope.IsLimited() &&
      !(mFlags & OutputDontRewriteEncodingDeclaration);
  mSerializer->Init(mFlags, mWrapColumn, mEncoding, mIsCopying,
                    rewriteEncodingDeclaration, &mNeedsPreformatScanning,
                    output);

  rv = SerializeDependingOnScope(aMaxLength);
  NS_ENSURE_SUCCESS(rv, rv);

  rv = mSerializer->FlushAndFinish();

  // We have to be careful how we set aOutputString, because we don't
  // want it to end up sharing mCachedBuffer if we plan to reuse it.
  bool setOutput = false;
  MOZ_ASSERT(!mCachedBuffer);
  // Try to cache the buffer.
  if (StringBuffer* outputBuffer = output.GetStringBuffer()) {
    if (outputBuffer->StorageSize() == kStringBufferSizeInBytes &&
        !outputBuffer->IsReadonly()) {
      mCachedBuffer = outputBuffer;
    } else if (NS_SUCCEEDED(rv)) {
      aOutputString.Assign(outputBuffer, output.Length());
      setOutput = true;
    }
  }

  if (!setOutput && NS_SUCCEEDED(rv)) {
    aOutputString.Append(output.get(), output.Length());
  }

  // Foxhound: Propagate Taint
  aOutputString.AssignTaint(output.Taint());
  
  return rv;
}

NS_IMETHODIMP
nsDocumentEncoder::EncodeToStream(nsIOutputStream* aStream) {
  MOZ_ASSERT(mRangeContextSerializer.mRangeContexts.IsEmpty(),
             "Re-entrant call to nsDocumentEncoder.");
  auto rangeContextGuard =
      MakeScopeExit([&] { mRangeContextSerializer.mRangeContexts.Clear(); });
  NS_ENSURE_ARG_POINTER(aStream);

  nsresult rv = NS_OK;

  if (!mDocument) return NS_ERROR_NOT_INITIALIZED;

  if (!mEncoding) {
    return NS_ERROR_UCONV_NOCONV;
  }

  nsAutoString buf;
  const bool isPlainText = mMimeType.LowerCaseEqualsLiteral(kTextMime);
  mTextStreamer.emplace(*aStream, mEncoding->NewEncoder(), isPlainText, buf);

  rv = EncodeToString(buf);

  // Force a flush of the last chunk of data.
  rv = mTextStreamer->ForceFlush();
  NS_ENSURE_SUCCESS(rv, rv);

  mTextStreamer.reset();

  return rv;
}

NS_IMETHODIMP
nsDocumentEncoder::EncodeToStringWithContext(nsAString& aContextString,
                                             nsAString& aInfoString,
                                             nsAString& aEncodedString) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
nsDocumentEncoder::SetNodeFixup(nsIDocumentEncoderNodeFixup* aFixup) {
  mNodeFixup = aFixup;
  return NS_OK;
}

bool do_getDocumentTypeSupportedForEncoding(const char* aContentType) {
  if (!nsCRT::strcmp(aContentType, TEXT_XML) ||
      !nsCRT::strcmp(aContentType, APPLICATION_XML) ||
      !nsCRT::strcmp(aContentType, APPLICATION_XHTML_XML) ||
      !nsCRT::strcmp(aContentType, IMAGE_SVG_XML) ||
      !nsCRT::strcmp(aContentType, TEXT_HTML) ||
      !nsCRT::strcmp(aContentType, TEXT_PLAIN)) {
    return true;
  }
  return false;
}

already_AddRefed<nsIDocumentEncoder> do_createDocumentEncoder(
    const char* aContentType) {
  if (do_getDocumentTypeSupportedForEncoding(aContentType)) {
    return do_AddRef(new nsDocumentEncoder);
  }
  return nullptr;
}

class nsHTMLCopyEncoder final : public nsDocumentEncoder {
 private:
  class RangeNodeContext final : public nsDocumentEncoder::RangeNodeContext {
    bool IncludeInContext(nsINode& aNode) const final;

    int32_t GetImmediateContextCount(
        const nsTArray<nsINode*>& aAncestorArray) const final;
  };

 public:
  nsHTMLCopyEncoder();
  ~nsHTMLCopyEncoder();

  NS_IMETHOD Init(Document* aDocument, const nsAString& aMimeType,
                  uint32_t aFlags) override;

  // overridden methods from nsDocumentEncoder
  MOZ_CAN_RUN_SCRIPT_BOUNDARY
  NS_IMETHOD SetSelection(Selection* aSelection) override;
  NS_IMETHOD EncodeToStringWithContext(nsAString& aContextString,
                                       nsAString& aInfoString,
                                       nsAString& aEncodedString) override;
  NS_IMETHOD EncodeToString(nsAString& aOutputString) override;

 protected:
  [[nodiscard]] TreeKind GetTreeKind() const {
    return mFlags & nsIDocumentEncoder::AllowCrossShadowBoundary
               ? TreeKind::Flat
               : TreeKind::DOM;
  }
  nsresult PromoteRange(nsRange* inRange);
  struct MOZ_STACK_CLASS RangeInNode {
    [[nodiscard]] RawRangeBoundary StartRef() const {
      return RawRangeBoundary(mContainer, mStartOffset,
                              // Do not compute previous sibling of the child at
                              // mStartOffset immediately.
                              RangeBoundarySetBy::Offset, mTreeKind);
    }
    [[nodiscard]] RawRangeBoundary EndRef() const {
      return RawRangeBoundary(mContainer, mEndOffset,
                              // Do not compute previous sibling of the child at
                              // mEndOffset immediately.
                              RangeBoundarySetBy::Offset, mTreeKind);
    }

    [[nodiscard]] nsINode* GetParentNode() const {
      MOZ_ASSERT(mContainer);
      return mTreeKind == TreeKind::Flat
                 ? mContainer->GetFlattenedTreeParentNodeForSelection()
                 : mContainer->GetParentNode();
    }

    nsINode* mContainer = nullptr;
    uint32_t mStartOffset = 0;
    uint32_t mEndOffset = 0;
    const TreeKind mTreeKind;
  };
  Result<RangeInNode, nsresult> PromoteAncestorChain(
      const RangeInNode& aRangeInNode) const;

  /**
   * Return a promoted start point which may be extended to a point at an
   * ancestor element or error.  This climbs up the flattened tree if
   * aPoint.GetTreeKind() is TreeKind::Flat.
   *
   * @param aPoint      Must be set to a valid point.
   * @param aCommon     This is used as an ancestor limiter when climbing up the
   *                    tree.
   * @return            If it's not an error, the boundary is always set.
   */
  Result<RawRangeBoundary, nsresult> GetPromotedStartPoint(
      const RawRangeBoundary& aPoint, const nsINode* const aCommon) const;

  /**
   * Return a promoted end point which may be extended to a point after an
   * ancestor element or error.  This climbs up the flattened tree if
   * aPoint.GetTreeKind() is TreeKind::Flat.
   *
   * @param aPoint      Must be set to a valid point.
   * @param aCommon     This is used as an ancestor limiter when climbing up the
   *                    tree.
   * @return            If it's not an error, the boundary is always set.
   */
  Result<RawRangeBoundary, nsresult> GetPromotedEndPoint(
      const RawRangeBoundary& aPoint, const nsINode* const aCommon) const;

  /**
   * Return a parent point of aPoint, i.e., a point referring the container node
   * of aPoint.  If the container is a root of a generated content, this returns
   * unset boundary instead of an error.
   *
   * @param aPoint      Must be set to a valid point.
   * @return            Even if it's not an error, the boundary may be unset if
   *                    aPoint's container is a root node of generated content.
   */
  static Result<RawRangeBoundary, nsresult> GetParentPoint(
      const RawRangeBoundary& aPoint);

  [[nodiscard]] static Maybe<uint32_t> ComputeIndexOfContent(
      const nsINode* aParent, const nsIContent* aChild, TreeKind aTreeKind);
  static bool IsMozBR(Element* aNode);
  bool IsRoot(nsINode* aNode, TreeKind aKind) const;

  /**
   * Return true if the child node at the offset of aPoint does not follow a
   * meaningful child in the container.  This checks the flattened tree siblings
   * if aPoint.GetTreeKind() is TreeKind::Flat.
   *
   * @param aPoint      Must refers a child node, i.e., must not point the end
   *                    of the container.
   */
  static bool ChildIsFirstNode(const RawRangeBoundary& aPoint);

  /**
   * Return true if the child node at the offset of aPoint is not followed by a
   * meaningful child in the container.  This checks the flattened tree siblings
   * if aPoint.GetTreeKind() is TreeKind::Flat.
   *
   * @param aPoint      Must refers a child node, i.e., must not point the end
   *                    of the container.
   */
  static bool ChildIsLastNode(const RawRangeBoundary& aPoint);

  bool mIsTextWidget{false};
};

nsHTMLCopyEncoder::nsHTMLCopyEncoder()
    : nsDocumentEncoder{MakeUnique<nsHTMLCopyEncoder::RangeNodeContext>()} {}

nsHTMLCopyEncoder::~nsHTMLCopyEncoder() = default;

NS_IMETHODIMP
nsHTMLCopyEncoder::Init(Document* aDocument, const nsAString& aMimeType,
                        uint32_t aFlags) {
  if (!aDocument) return NS_ERROR_INVALID_ARG;

  mIsTextWidget = false;
  Initialize(true, GetAllowRangeCrossShadowBoundary(aFlags));

  mIsCopying = true;
  mDocument = aDocument;

  // nsHTMLCopyEncoder only accepts "text/plain" or "text/html" MIME types, and
  // the initial MIME type may change after setting the selection.
  MOZ_ASSERT(aMimeType.EqualsLiteral(kTextMime) ||
             aMimeType.EqualsLiteral(kHTMLMime));
  if (aMimeType.EqualsLiteral(kTextMime)) {
    mMimeType.AssignLiteral(kTextMime);
  } else {
    mMimeType.AssignLiteral(kHTMLMime);
  }

  // Make all links absolute when copying
  // (see related bugs #57296, #41924, #58646, #32768)
  mFlags = aFlags | OutputAbsoluteLinks;

  if (!mDocument->IsScriptEnabled()) mFlags |= OutputNoScriptContent;

  return NS_OK;
}

NS_IMETHODIMP
nsHTMLCopyEncoder::SetSelection(Selection* aSelection) {
  // check for text widgets: we need to recognize these so that
  // we don't tweak the selection to be outside of the magic
  // div that ender-lite text widgets are embedded in.

  if (!aSelection) return NS_ERROR_NULL_POINTER;

  const uint32_t rangeCount = aSelection->RangeCount();

  // if selection is uninitialized return
  if (!rangeCount) {
    return NS_ERROR_FAILURE;
  }

  // we'll just use the common parent of the first range.  Implicit assumption
  // here that multi-range selections are table cell selections, in which case
  // the common parent is somewhere in the table and we don't really care where.
  //
  // FIXME(emilio, bug 1455894): This assumption is already wrong, and will
  // probably be more wrong in a Shadow DOM world...
  //
  // We should be able to write this as "Find the common ancestor of the
  // selection, then go through the flattened tree and serialize the selected
  // nodes", effectively serializing the composed tree.
  RefPtr<nsRange> range = aSelection->GetRangeAt(0);
  nsINode* commonParent = range->GetClosestCommonInclusiveAncestor();

  for (nsCOMPtr<nsIContent> selContent(
           nsIContent::FromNodeOrNull(commonParent));
       selContent; selContent = selContent->GetParent()) {
    // checking for selection inside a plaintext form widget
    if (selContent->IsAnyOfHTMLElements(nsGkAtoms::input,
                                        nsGkAtoms::textarea)) {
      mIsTextWidget = true;
      break;
    }
  }

  // normalize selection if we are not in a widget
  if (mIsTextWidget) {
    mEncodingScope.mSelection = aSelection;
    mMimeType.AssignLiteral("text/plain");
    return NS_OK;
  }

  // XXX We should try to get rid of the Selection object here.
  // XXX bug 1245883

  // also consider ourselves in a text widget if we can't find an html document
  // XXX: nsCopySupport relies on the MIME type not being updated immediately
  // here, so it can apply different encoding for XHTML documents.
  if (!(mDocument && mDocument->IsHTMLDocument())) {
    mIsTextWidget = true;
    mEncodingScope.mSelection = aSelection;
    // mMimeType is set to text/plain when encoding starts.
    return NS_OK;
  }

  // there's no Clone() for selection! fix...
  // nsresult rv = aSelection->Clone(getter_AddRefs(mSelection);
  // NS_ENSURE_SUCCESS(rv, rv);
  mEncodingScope.mSelection = new Selection(SelectionType::eNormal, nullptr);

  // loop thru the ranges in the selection
  for (const uint32_t rangeIdx : IntegerRange(rangeCount)) {
    MOZ_ASSERT(aSelection->RangeCount() == rangeCount);
    range = aSelection->GetRangeAt(rangeIdx);
    NS_ENSURE_TRUE(range, NS_ERROR_FAILURE);
    RefPtr<nsRange> myRange = range->CloneRange();
    MOZ_ASSERT(myRange);

    // adjust range to include any ancestors who's children are entirely
    // selected
    nsresult rv = PromoteRange(myRange);
    NS_ENSURE_SUCCESS(rv, rv);

    ErrorResult result;
    RefPtr<Selection> selection(mEncodingScope.mSelection);
    RefPtr<Document> document(mDocument);
    selection->AddRangeAndSelectFramesAndNotifyListenersInternal(
        *myRange, document, result);
    rv = result.StealNSResult();
    NS_ENSURE_SUCCESS(rv, rv);
  }

  return NS_OK;
}

NS_IMETHODIMP
nsHTMLCopyEncoder::EncodeToString(nsAString& aOutputString) {
  if (mIsTextWidget) {
    mMimeType.AssignLiteral("text/plain");
  }
  return nsDocumentEncoder::EncodeToString(aOutputString);
}

NS_IMETHODIMP
nsHTMLCopyEncoder::EncodeToStringWithContext(nsAString& aContextString,
                                             nsAString& aInfoString,
                                             nsAString& aEncodedString) {
  nsresult rv = EncodeToString(aEncodedString);
  NS_ENSURE_SUCCESS(rv, rv);

  // do not encode any context info or range hints if we are in a text widget.
  if (mIsTextWidget) return NS_OK;

  // now encode common ancestors into aContextString.  Note that the common
  // ancestors will be for the last range in the selection in the case of
  // multirange selections. encoding ancestors every range in a multirange
  // selection in a way that could be understood by the paste code would be a
  // lot more work to do.  As a practical matter, selections are single range,
  // and the ones that aren't are table cell selections where all the cells are
  // in the same table.

  mSerializer->Init(mFlags, mWrapColumn, mEncoding, mIsCopying, false,
                    &mNeedsPreformatScanning, aContextString);

  // leaf of ancestors might be text node.  If so discard it.
  int32_t count = mRangeSerializer.mCommonInclusiveAncestors.Length();
  int32_t i;
  nsCOMPtr<nsINode> node;
  if (count > 0) {
    node = mRangeSerializer.mCommonInclusiveAncestors.ElementAt(0);
  }

  if (node && IsTextNode(node)) {
    mRangeSerializer.mCommonInclusiveAncestors.RemoveElementAt(0);
    if (mRangeSerializer.mContextInfoDepth.mStart) {
      --mRangeSerializer.mContextInfoDepth.mStart;
    }
    if (mRangeSerializer.mContextInfoDepth.mEnd) {
      --mRangeSerializer.mContextInfoDepth.mEnd;
    }
    count--;
  }

  i = count;
  while (i > 0) {
    node = mRangeSerializer.mCommonInclusiveAncestors.ElementAt(--i);
    rv = mNodeSerializer.SerializeNodeStart(*node, 0, -1);
    NS_ENSURE_SUCCESS(rv, rv);
  }
  // i = 0; guaranteed by above
  while (i < count) {
    node = mRangeSerializer.mCommonInclusiveAncestors.ElementAt(i++);
    rv = mNodeSerializer.SerializeNodeEnd(*node);
    NS_ENSURE_SUCCESS(rv, rv);
  }

  mSerializer->Finish();

  // encode range info : the start and end depth of the selection, where the
  // depth is distance down in the parent hierarchy.  Later we will need to add
  // leading/trailing whitespace info to this.
  nsAutoString infoString;
  infoString.AppendInt(mRangeSerializer.mContextInfoDepth.mStart);
  infoString.Append(char16_t(','));
  infoString.AppendInt(mRangeSerializer.mContextInfoDepth.mEnd);
  aInfoString = infoString;

  return rv;
}

bool nsHTMLCopyEncoder::RangeNodeContext::IncludeInContext(
    nsINode& aNode) const {
  const nsIContent* const content = nsIContent::FromNodeOrNull(&aNode);
  if (!content) {
    return false;
  }

  // If it's an inline editing host, we should not treat it gives a context to
  // avoid to duplicate its style.
  if (content->IsEditingHost()) {
    return false;
  }

  return content->IsAnyOfHTMLElements(
      nsGkAtoms::b, nsGkAtoms::i, nsGkAtoms::u, nsGkAtoms::a, nsGkAtoms::tt,
      nsGkAtoms::s, nsGkAtoms::big, nsGkAtoms::small, nsGkAtoms::strike,
      nsGkAtoms::em, nsGkAtoms::strong, nsGkAtoms::dfn, nsGkAtoms::code,
      nsGkAtoms::cite, nsGkAtoms::var, nsGkAtoms::abbr, nsGkAtoms::font,
      nsGkAtoms::script, nsGkAtoms::span, nsGkAtoms::pre, nsGkAtoms::h1,
      nsGkAtoms::h2, nsGkAtoms::h3, nsGkAtoms::h4, nsGkAtoms::h5,
      nsGkAtoms::h6);
}

nsresult nsHTMLCopyEncoder::PromoteRange(nsRange* inRange) {
  if (!inRange->IsPositioned()) {
    return NS_ERROR_UNEXPECTED;
  }
  const RawRangeBoundary startRef = [&]() -> RawRangeBoundary {
    const auto& ref = inRange->MayCrossShadowBoundaryStartRef();
    // XXX If GetTreeKind() returns TreeKind::DOM but ref.GetTreeKind() returns
    // TreeKind::Flat, what should we do?  The result may cross the shadow DOM
    // boundaries even though the our user do not want that.
    if (GetTreeKind() == TreeKind::Flat && ref.GetTreeKind() == TreeKind::DOM) {
      return ref.AsRaw().AsRangeBoundaryInFlatTree(
          inRange->Collapsed() ? RangeBoundaryFor::Collapsed
                               : RangeBoundaryFor::Start);
    }
    return ref.AsRaw();
  }();
  const RawRangeBoundary endRef = [&]() -> RawRangeBoundary {
    const auto& ref = inRange->MayCrossShadowBoundaryEndRef();
    if (GetTreeKind() == TreeKind::Flat && ref.GetTreeKind() == TreeKind::DOM) {
      return ref.AsRaw().AsRangeBoundaryInFlatTree(
          inRange->Collapsed() ? RangeBoundaryFor::Collapsed
                               : RangeBoundaryFor::End);
    }
    return ref.AsRaw();
  }();
  MOZ_ASSERT(startRef.GetTreeKind() == endRef.GetTreeKind());
  const nsINode* const commonAncestor =
      inRange->GetClosestCommonInclusiveAncestor(
          AllowRangeCrossShadowBoundary::Yes);
  MOZ_ASSERT(commonAncestor);

  // examine range endpoints.
  Result<RawRangeBoundary, nsresult> promotedStartPointOrError =
      GetPromotedStartPoint(startRef, commonAncestor);
  if (NS_WARN_IF(promotedStartPointOrError.isErr())) {
    return NS_ERROR_FAILURE;
  }
  Result<RawRangeBoundary, nsresult> promotedEndPointOrError =
      GetPromotedEndPoint(endRef, commonAncestor);
  if (NS_WARN_IF(promotedEndPointOrError.isErr())) {
    return NS_ERROR_FAILURE;
  }

  RawRangeBoundary promotedStartPoint = promotedStartPointOrError.unwrap();
  MOZ_ASSERT(promotedStartPoint.IsSet());
  RawRangeBoundary promotedEndPoint = promotedEndPointOrError.unwrap();
  MOZ_ASSERT(promotedEndPoint.IsSet());

  // if both range endpoints are at the common ancestor, check for possible
  // inclusion of ancestors
  using OffsetFilter = RawRangeBoundary::OffsetFilter;
  if (StaticPrefs::dom_serializer_includeCommonAncestor_enabled() &&
      promotedStartPoint.GetContainer() == commonAncestor &&
      promotedEndPoint.GetContainer() == commonAncestor) {
    MOZ_ASSERT(promotedStartPoint.GetTreeKind() ==
               promotedEndPoint.GetTreeKind());
    Result<RangeInNode, nsresult> promotedRangeOrError =
        PromoteAncestorChain(RangeInNode{
            promotedStartPoint.GetContainer(),
            *promotedStartPoint.Offset(OffsetFilter::kValidOrInvalidOffsets),
            *promotedEndPoint.Offset(OffsetFilter::kValidOrInvalidOffsets),
            promotedStartPoint.GetTreeKind()});
    if (MOZ_UNLIKELY(promotedRangeOrError.isErr())) {
      return promotedRangeOrError.propagateErr();
    }
    const RangeInNode promotedRange = promotedRangeOrError.unwrap();
    promotedStartPoint = promotedRange.StartRef();
    promotedEndPoint = promotedRange.EndRef();
  }

  // set the range to the new values
  ErrorResult err;
  inRange->SetStart(promotedStartPoint.AsRangeBoundaryInDOMTree(), err,
                    GetAllowRangeCrossShadowBoundary(mFlags));
  if (NS_WARN_IF(err.Failed())) {
    return err.StealNSResult();
  }
  inRange->SetEnd(RawRangeBoundary(promotedEndPoint.AsRangeBoundaryInDOMTree()),
                  err, GetAllowRangeCrossShadowBoundary(mFlags));
  if (NS_WARN_IF(err.Failed())) {
    return err.StealNSResult();
  }
  return NS_OK;
}

// PromoteAncestorChain will promote a range represented by aRangeInNode.
// The promotion is different from that found in GetPromoted(Start|End)Point: it
// will only promote one endpoint if it can promote the other.  Thus,
// RangeInNode has only one nsINode* member, mContainer.
Result<nsHTMLCopyEncoder::RangeInNode, nsresult>
nsHTMLCopyEncoder::PromoteAncestorChain(const RangeInNode& aRangeInNode) const {
  MOZ_ASSERT(aRangeInNode.mContainer);
  using OffsetFilter = RawRangeBoundary::OffsetFilter;
  RangeInNode rangeInNode = aRangeInNode;
  while (true) {
    nsINode* const parentNode = rangeInNode.GetParentNode();
    if (MOZ_UNLIKELY(!parentNode)) {
      break;
    }
    // passing parent as last param to GetPromotedStartPoint() allows it to
    // promote only one level up the hierarchy.
    Result<RawRangeBoundary, nsresult> promotedStartPointOrError =
        GetPromotedStartPoint(rangeInNode.StartRef(), parentNode);
    if (NS_WARN_IF(promotedStartPointOrError.isErr())) {
      return Err(NS_ERROR_FAILURE);
    }
    // then we make the same attempt with the endpoint
    Result<RawRangeBoundary, nsresult> promotedEndPointOrError =
        GetPromotedEndPoint(rangeInNode.EndRef(), parentNode);
    if (NS_WARN_IF(promotedEndPointOrError.isErr())) {
      return Err(NS_ERROR_FAILURE);
    }
    const RawRangeBoundary promotedStartPoint =
        promotedStartPointOrError.unwrap();
    MOZ_ASSERT(promotedStartPoint.IsSet());
    const RawRangeBoundary promotedEndPoint = promotedEndPointOrError.unwrap();
    MOZ_ASSERT(promotedEndPoint.IsSet());
    // if both endpoints were promoted one level and isEditable is the same as
    // the original node, keep looping - otherwise we are done.
    if (promotedStartPoint.GetContainer() != parentNode ||
        promotedEndPoint.GetContainer() != parentNode ||
        parentNode->IsEditable() != aRangeInNode.mContainer->IsEditable()) {
      break;
    }
    rangeInNode.mContainer = parentNode;
    rangeInNode.mStartOffset =
        *promotedStartPoint.Offset(OffsetFilter::kValidOrInvalidOffsets);
    rangeInNode.mEndOffset =
        *promotedEndPoint.Offset(OffsetFilter::kValidOrInvalidOffsets);
  }
  return rangeInNode;
}

Result<RawRangeBoundary, nsresult> nsHTMLCopyEncoder::GetPromotedStartPoint(
    const RawRangeBoundary& aPoint, const nsINode* const aCommon) const {
  MOZ_ASSERT(aPoint.IsSet());

  using OffsetFilter = RawRangeBoundary::OffsetFilter;

  // default values
  if (aCommon == aPoint.GetContainer() ||
      IsRoot(aPoint.GetContainer(), aPoint.GetTreeKind())) {
    return aPoint;
  }

  RawRangeBoundary point(aPoint.GetTreeKind());
  bool resetPromotion = false;

  // some special casing for text nodes
  if (auto* const nodeAsText = Text::FromNode(aPoint.GetContainer())) {
    // if not at beginning of text node, we are done
    if (!aPoint.IsStartOfContainer()) {
      // unless everything before us in just whitespace.  NOTE: we need a more
      // general solution that truly detects all cases of non-significant
      // whitesace with no false alarms.
      if (!nodeAsText->TextStartsWithOnlyWhitespace(
              *aPoint.Offset(OffsetFilter::kValidOrInvalidOffsets))) {
        return aPoint;
      }
      resetPromotion = true;
    }
    // If it points the start of a `Text`, we want to extend the start boundary
    // to the parent element.
    Result<RawRangeBoundary, nsresult> parentPointOrError =
        GetParentPoint(aPoint);
    if (NS_WARN_IF(parentPointOrError.isErr())) {
      return parentPointOrError.propagateErr();
    }
    point = parentPointOrError.unwrap();
    if (MOZ_UNLIKELY(!point.IsSet())) {
      NS_WARNING(fmt::format("aPoint={}", aPoint).c_str());
      MOZ_ASSERT_UNREACHABLE(
          "Selection shouldn't start/end in generated content nor content "
          "being removed");
      return aPoint;
    }
    if (point.GetContainer() == aCommon) {
      return aPoint;
    }
  } else {
    // If aPoint points a child node, try to climbing up the tree from the
    // point.
    // XXX: Should we only start from the container of aPoint when it points to
    // start of the container and the container has no children? Currently we
    // start from the container even when aPoint is invalid, which seems wrong.
    if (aPoint.GetContainer()->HasChildNodes() && !aPoint.IsEndOfContainer()) {
      if (aPoint.GetContainer() == aCommon) {
        return aPoint;
      }
      point = aPoint;
    }
    // Otherwise, aPoint points the end of the container (including when the
    // container has no child), we can climbing up the tree from its parent.
    else {
      Result<RawRangeBoundary, nsresult> parentPointOrError =
          GetParentPoint(aPoint);
      if (NS_WARN_IF(parentPointOrError.isErr())) {
        return parentPointOrError.propagateErr();
      }
      point = parentPointOrError.unwrap();
      if (MOZ_UNLIKELY(!point.IsSet())) {
        NS_WARNING(fmt::format("aPoint={}", aPoint).c_str());
        MOZ_ASSERT_UNREACHABLE(
            "Selection shouldn't start/end in generated content nor content "
            "being removed");
        return aPoint;
      }
    }
  }
  NS_WARNING_ASSERTION(
      point.GetChildAtOffset(),
      nsFmtCString(
          FMT_STRING("Not pointing a child node:\npoint={}\naPoint={}\n"),
          point, aPoint)
          .get());
  MOZ_ASSERT(point.GetChildAtOffset());

  // finding the real start for this point.  look up the tree for as long as
  // we are the first node in the container, and as long as we haven't hit the
  // body node.
  if (aPoint.GetContainer() != point.GetChildAtOffset() &&
      IsRoot(point.GetChildAtOffset(), point.GetTreeKind())) {
    return aPoint;
  }

  while (point.GetContainer() != aCommon &&
         !IsRoot(point.GetContainer(), point.GetTreeKind()) &&
         ChildIsFirstNode(point)) {
    if (resetPromotion) {
      nsIContent* const parentContent =
          nsIContent::FromNodeOrNull(point.GetContainer());
      if (parentContent && parentContent->IsHTMLElement() &&
          nsHTMLElement::IsBlock(
              nsHTMLTags::AtomTagToId(parentContent->NodeInfo()->NameAtom()))) {
        resetPromotion = false;
      }
    }
    Result<RawRangeBoundary, nsresult> parentPointOrError =
        GetParentPoint(point);
    if (MOZ_UNLIKELY(parentPointOrError.isErr())) {
      return parentPointOrError.propagateErr();
    }
    if (MOZ_UNLIKELY(!parentPointOrError.inspect().IsSet())) {
      NS_WARNING(fmt::format("aPoint={}", aPoint).c_str());
      MOZ_ASSERT_UNREACHABLE(
          "Selection shouldn't start/end in generated content nor content "
          "being removed");
      return Err(NS_ERROR_FAILURE);
    }
    point = parentPointOrError.unwrap();
  }

  return resetPromotion ? aPoint : point;
}

Result<RawRangeBoundary, nsresult> nsHTMLCopyEncoder::GetPromotedEndPoint(
    const RawRangeBoundary& aPoint, const nsINode* const aCommon) const {
  MOZ_ASSERT(aPoint.IsSet());

  using OffsetFilter = RawRangeBoundary::OffsetFilter;

  // default values
  if (aCommon == aPoint.GetContainer() ||
      IsRoot(aPoint.GetContainer(), aPoint.GetTreeKind())) {
    return aPoint;
  }

  RawRangeBoundary point(aPoint.GetTreeKind());
  bool resetPromotion = false;

  // some special casing for text nodes
  if (auto* const nodeAsText = Text::FromNode(aPoint.GetContainer())) {
    // if not at end of text node, we are done
    if (!aPoint.IsEndOfContainer()) {
      // unless everything after us in just whitespace.  NOTE: we need a more
      // general solution that truly detects all cases of non-significant
      // whitespace with no false alarms.
      if (!nodeAsText->TextEndsWithOnlyWhitespace(
              *aPoint.Offset(OffsetFilter::kValidOrInvalidOffsets))) {
        return aPoint;
      }
      resetPromotion = true;
    }
    // If it points the end of a `Text`, we want to extend the end boundary
    // to the parent element.
    Result<RawRangeBoundary, nsresult> parentPointOrError =
        GetParentPoint(aPoint);
    if (NS_WARN_IF(parentPointOrError.isErr())) {
      return parentPointOrError.propagateErr();
    }
    point = parentPointOrError.unwrap();
    if (MOZ_UNLIKELY(!point.IsSet())) {
      NS_WARNING(fmt::format("aPoint={}", aPoint).c_str());
      MOZ_ASSERT_UNREACHABLE(
          "Selection shouldn't start/end in generated content nor content "
          "being removed");
      return aPoint;
    }
    if (point.GetContainer() == aCommon) {
      return aPoint;
    }
  } else {
    if (aPoint.GetContainer()->HasChildNodes()) {
      if (aPoint.GetContainer() == aCommon) {
        return aPoint;
      }
      // If aPoint points the first child of the container, we can climb up the
      // tree from aPoint.
      if (aPoint.IsStartOfContainer()) {
        point = aPoint;
      }
      // If aPoint points a non-first child of the container, we should climb up
      // the tree from the previous sibling of the pointing child.
      else {
        nsIContent* const previousSibling =
            aPoint.GetPreviousSiblingOfChildAtOffset();
        if (NS_WARN_IF(!previousSibling)) {
          return Err(NS_ERROR_FAILURE);
        }
        point =
            RawRangeBoundary::FromChild(*previousSibling, aPoint.GetTreeKind());
      }
    }
    // If the container of aPoint has no child node, we can climb up the tree
    // from its parent point.
    else {
      Result<RawRangeBoundary, nsresult> parentPointOrError =
          GetParentPoint(aPoint);
      if (NS_WARN_IF(parentPointOrError.isErr())) {
        return RawRangeBoundary(aPoint.GetTreeKind());
      }
      point = parentPointOrError.unwrap();
      if (MOZ_UNLIKELY(!point.IsSet())) {
        NS_WARNING(fmt::format("aPoint={}", aPoint).c_str());
        MOZ_ASSERT_UNREACHABLE(
            "Selection shouldn't start/end in generated content nor content "
            "being removed");
        return aPoint;
      }
    }
  }
  NS_WARNING_ASSERTION(
      point.GetChildAtOffset(),
      nsFmtCString(
          FMT_STRING("Not pointing a child node:\npoint={}\naPoint={}\n"),
          point, aPoint)
          .get());
  MOZ_ASSERT(point.GetChildAtOffset());

  // finding the real end for this point.  look up the tree for as long as we
  // are the last node in the container, and as long as we haven't hit the
  // body node.
  if (aPoint.GetContainer() != point.GetChildAtOffset() &&
      IsRoot(point.GetChildAtOffset(), point.GetTreeKind())) {
    return aPoint;
  }

  while (point.GetContainer() != aCommon &&
         !IsRoot(point.GetContainer(), point.GetTreeKind()) &&
         ChildIsLastNode(point)) {
    if (resetPromotion) {
      nsIContent* const parentContent =
          nsIContent::FromNodeOrNull(point.GetContainer());
      if (parentContent && parentContent->IsHTMLElement() &&
          nsHTMLElement::IsBlock(
              nsHTMLTags::AtomTagToId(parentContent->NodeInfo()->NameAtom()))) {
        resetPromotion = false;
      }
    }

    Result<RawRangeBoundary, nsresult> parentPointOrError =
        GetParentPoint(point);
    if (MOZ_UNLIKELY(parentPointOrError.isErr())) {
      return parentPointOrError.propagateErr();
    }

    if (MOZ_UNLIKELY(!parentPointOrError.inspect().IsSet())) {
      NS_WARNING(fmt::format("aPoint={}", aPoint).c_str());
      MOZ_ASSERT_UNREACHABLE(
          "Selection shouldn't start/end in generated content nor content "
          "being removed");
      return Err(NS_ERROR_FAILURE);
    }
    point = parentPointOrError.unwrap();
  }

  if (resetPromotion) {
    return aPoint;
  }
  // We want to be AFTER the node.
  nsIContent* const childAtOffset = point.GetChildAtOffset();
  return childAtOffset
             ? RawRangeBoundary::After(*childAtOffset, point.GetTreeKind())
             : RawRangeBoundary::EndOfParent(*point.GetContainer(),
                                             RangeBoundarySetBy::Ref,
                                             point.GetTreeKind());
}

bool nsHTMLCopyEncoder::IsMozBR(Element* aElement) {
  HTMLBRElement* brElement = HTMLBRElement::FromNodeOrNull(aElement);
  return brElement && brElement->IsPaddingForEmptyLastLine();
}

// static
Maybe<uint32_t> nsHTMLCopyEncoder::ComputeIndexOfContent(
    const nsINode* aParent, const nsIContent* aChild, TreeKind aTreeKind) {
  MOZ_ASSERT(aParent);
  MOZ_ASSERT(aChild);

  if (aTreeKind == TreeKind::DOM) {
    return aParent->ComputeIndexOf(aChild);
  }
  // If the parent of the container has a shadow root which is for <use> or a
  // UI widget, we shouldn't treat it as a shadow host.
  if (aParent->GetShadowRoot() && !aParent->GetShadowRootForSelection()) {
    return aParent->ComputeIndexOf(aChild);
  }
  return aParent->ComputeFlatTreeIndexOf(aChild);
}

Result<RawRangeBoundary, nsresult> nsHTMLCopyEncoder::GetParentPoint(
    const RawRangeBoundary& aPoint) {
  MOZ_ASSERT(aPoint.IsSet());

  nsIContent* const containerContent =
      nsIContent::FromNodeOrNull(aPoint.GetContainer());
  if (MOZ_UNLIKELY(!containerContent)) {
    return Err(NS_ERROR_NULL_POINTER);
  }

  // If the container is a ShadowRoot, GetFlattenedTreeParentNodeForSelection()
  // returns nullptr. However, we want to keep handling in the host.
  if (aPoint.GetTreeKind() == TreeKind::Flat) {
    if (ShadowRoot* const shadowRoot = ShadowRoot::FromNode(containerContent)) {
      Element* const host = shadowRoot->GetHost();
      if (MOZ_UNLIKELY(!host)) {
        return Err(NS_ERROR_NULL_POINTER);
      }
      // Return the point of the host element. Then, the caller can check
      // whether the host element is the first/last meaningful node in its
      // parent.
      RawRangeBoundary atHost =
          RawRangeBoundary::FromChild(*host, aPoint.GetTreeKind());
      if (MOZ_UNLIKELY(!atHost.IsSet())) {
        // The host element may not be a part of the flattened tree, i.e., its
        // parent node is another shadow host and not assigned to any <slot>.
        return Err(NS_ERROR_NULL_POINTER);
      }
      return std::move(atHost);
    }
  }

  nsINode* const containerParentNode =
      aPoint.GetTreeKind() == TreeKind::Flat
          ? containerContent->GetFlattenedTreeParentNodeForSelection()
          : containerContent->GetParentNode();
  if (MOZ_UNLIKELY(!containerParentNode)) {
    return Err(NS_ERROR_NULL_POINTER);
  }

  const Maybe<uint32_t> indexOfContainer = ComputeIndexOfContent(
      containerParentNode, containerContent, aPoint.GetTreeKind());
  if (MOZ_UNLIKELY(indexOfContainer.isNothing())) {
    return RawRangeBoundary(aPoint.GetTreeKind());
  }
  return RawRangeBoundary(
      containerParentNode, *indexOfContainer,
      // Do not compute the previous sibling of the child immediately because it
      // may not be cheap if we're handling in the flat tree.
      RangeBoundarySetBy::Offset, aPoint.GetTreeKind());
}

bool nsHTMLCopyEncoder::IsRoot(nsINode* aNode, TreeKind aKind) const {
  nsCOMPtr<nsIContent> content = nsIContent::FromNodeOrNull(aNode);
  if (!content) {
    return false;
  }

  if (mIsTextWidget) {
    return content->IsHTMLElement(nsGkAtoms::div);
  }

  if (aKind == TreeKind::Flat) {
    // If we're handling the flattened tree and aNode is a ShadowRoot,
    // GetParentPoint() for a point whose container is aNode will return the
    // point at the host. However, if the host is not a part of the flattened
    // tree, it will return an error instead. In this case, if we didn't reach
    // the ShadowRoot, we succeeded promoting the range. Therefore, we should
    // treat the ShadowRoot as a root.
    if (const ShadowRoot* const shadowRoot = ShadowRoot::FromNode(*content)) {
      if (MOZ_UNLIKELY(shadowRoot->IsUAWidget())) {
        // Special case for the fallback content of <slot> in the non-content
        // shadow. E.g., the default summary of <details>.
        return true;
      }
      const Element* const host = shadowRoot->GetHost();
      if (NS_WARN_IF(!host)) {
        return true;
      }
      const nsINode* const flattenedTreeParentNode =
          host->GetFlattenedTreeParentNodeForSelection();
      if (MOZ_UNLIKELY(!flattenedTreeParentNode)) {
        return true;
      }
    }
  }

  // XXX(sefeng): This is some old code from 2006, so I can't
  // promise my comment is correct. However, I think these elements
  // are considered to be `Root` because if we keep going up
  // in nsHTMLCopyEncoder::GetPromoted(Start|End)Point, we would lose the
  // correct representation of the point, so we have to stop at
  // these nodes.

  // nsGkAtoms::slot is here because we'd lose the index
  // of the slotted element if we keep going up as
  // `nsHTMLCopyEncoder::GetNodeLocation` would promote the
  // offset to be index of the <slot> that is relative to
  // the <slot>'s parent.
  return content->IsAnyOfHTMLElements(nsGkAtoms::body, nsGkAtoms::td,
                                      nsGkAtoms::th, nsGkAtoms::slot);
}

bool nsHTMLCopyEncoder::ChildIsFirstNode(const RawRangeBoundary& aPoint) {
  MOZ_ASSERT(aPoint.GetChildAtOffset());

  // need to check if any nodes before us are really visible.
  // Mike wrote something for me along these lines in nsSelectionController,
  // but I don't think it's ready for use yet - revisit.
  // HACK: for now, simply consider all whitespace text nodes to be
  // invisible formatting nodes.

  const auto ChildIsSignificant = [](nsIContent& aContent) {
    return !aContent.TextIsOnlyWhitespace();
  };
  if (aPoint.GetTreeKind() == TreeKind::Flat) {
    if (const HTMLSlotElement* slot =
            HTMLSlotElement::FromNode(aPoint.GetContainer())) {
      const auto assignedNodes = slot->AssignedNodes();
      if (!assignedNodes.IsEmpty()) {
        for (const uint32_t offset : Reversed(IntegerRange(*aPoint.Offset(
                 RawRangeBoundary::OffsetFilter::kValidOrInvalidOffsets)))) {
          nsIContent* const sibling =
              nsIContent::FromNode(assignedNodes[offset]);
          if (sibling && ChildIsSignificant(*sibling)) {
            return false;
          }
        }
        return true;
      }
    }
  }
  for (nsIContent* sibling = aPoint.GetPreviousSiblingOfChildAtOffset();
       sibling; sibling = sibling->GetPreviousSibling()) {
    if (ChildIsSignificant(*sibling)) {
      return false;
    }
  }
  return true;
}

bool nsHTMLCopyEncoder::ChildIsLastNode(const RawRangeBoundary& aPoint) {
  MOZ_ASSERT(aPoint.GetChildAtOffset());

  // need to check if any nodes after us are really visible.
  // Mike wrote something for me along these lines in nsSelectionController,
  // but I don't think it's ready for use yet - revisit.
  // HACK: for now, simply consider all whitespace text nodes to be
  // invisible formatting nodes.

  const auto ChildIsSignificant = [](nsIContent& aContent) {
    if (aContent.IsElement() && IsMozBR(aContent.AsElement())) {
      // we ignore trailing moz BRs.
      return false;
    }
    return !aContent.TextIsOnlyWhitespace();
  };
  if (aPoint.GetTreeKind() == TreeKind::Flat) {
    if (const HTMLSlotElement* slot =
            HTMLSlotElement::FromNode(aPoint.GetContainer())) {
      const auto assignedNodes = slot->AssignedNodes();
      if (!assignedNodes.IsEmpty()) {
        const uint32_t length = assignedNodes.Length();
        const uint32_t nextOffset =
            *aPoint.Offset(
                RawRangeBoundary::OffsetFilter::kValidOrInvalidOffsets) +
            1;
        if (nextOffset >= length) {
          return true;
        }
        for (const uint32_t offset :
             IntegerRange(nextOffset, assignedNodes.Length())) {
          nsIContent* const sibling =
              nsIContent::FromNode(assignedNodes[offset]);
          if (sibling && ChildIsSignificant(*sibling)) {
            return false;
          }
        }
        return true;
      }
    }
  }
  for (nsIContent* sibling = aPoint.GetNextSiblingOfChildAtOffset(); sibling;
       sibling = sibling->GetNextSibling()) {
    if (ChildIsSignificant(*sibling)) {
      return false;
    }
  }
  return true;
}

already_AddRefed<nsIDocumentEncoder> do_createHTMLCopyEncoder() {
  return do_AddRef(new nsHTMLCopyEncoder);
}

int32_t nsHTMLCopyEncoder::RangeNodeContext::GetImmediateContextCount(
    const nsTArray<nsINode*>& aAncestorArray) const {
  int32_t i = aAncestorArray.Length(), j = 0;
  while (j < i) {
    nsINode* node = aAncestorArray.ElementAt(j);
    if (!node) {
      break;
    }
    nsCOMPtr<nsIContent> content(nsIContent::FromNodeOrNull(node));
    if (!content || !content->IsAnyOfHTMLElements(
                        nsGkAtoms::tr, nsGkAtoms::thead, nsGkAtoms::tbody,
                        nsGkAtoms::tfoot, nsGkAtoms::table)) {
      break;
    }
    ++j;
  }
  return j;
}
