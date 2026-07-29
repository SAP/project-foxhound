/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SVGFragmentIdentifier.h"

#include "SVGAnimatedTransformList.h"
#include "mozilla/MediaFragmentURIParser.h"
#include "mozilla/SVGOuterSVGFrame.h"
#include "mozilla/dom/SVGSVGElement.h"
#include "mozilla/dom/SVGViewElement.h"
#include "nsCharSeparatedTokenizer.h"

namespace mozilla {

using namespace dom;

static bool IsMatchingParameter(const nsAString& aString,
                                const nsAString& aParameterName) {
  // The first two tests ensure aString.Length() > aParameterName.Length()
  // so it's then safe to do the third test
  return StringBeginsWith(aString, aParameterName) && aString.Last() == ')' &&
         aString.CharAt(aParameterName.Length()) == '(';
}

// Handles setting/clearing the root's mSVGView pointer.
class MOZ_RAII AutoFragmentHandler {
 public:
  explicit AutoFragmentHandler(SVGSVGElement* aRoot) : mRoot(aRoot) {}

  ~AutoFragmentHandler() {
    if (!mValid) {
      mStartTime = Nothing();
      mEndTime = Nothing();
      mCurrentViewID = VoidString();
      mSVGView = nullptr;
    }
    if (mStartTime) {
      mRoot->SetCurrentTime(mStartTime.value());
    }
    if (mEndTime) {
      mRoot->PauseAnimationsAt(mEndTime.value());
    }
    if (mCurrentViewID.IsVoid()) {
      mRoot->SetViewSpec(std::move(mSVGView));
    } else {
      mRoot->SetCurrentView(mCurrentViewID);
    }
    if (nsIFrame* f = mRoot->GetPrimaryFrame()) {
      if (SVGOuterSVGFrame* osf = do_QueryFrame(f)) {
        osf->MaybeSendIntrinsicSizeAndRatioToEmbedder();
      }
    }
  }

  bool StopProcessing() const {
    // If we're an svgView()-style fragment identifier, return true so the
    // caller knows it doesn't need to match any :target pseudo elements
    return mValid && mViewSpecProcessed;
  }

  void CreateSVGView(bool aFromViewSpec) {
    if (!mSVGView) {
      mSVGView = std::make_unique<SVGView>();
    }
    if (aFromViewSpec) {
      mViewSpecProcessed = true;
    }
  }

  void SetCurrentViewID(const nsAString& aCurrentViewID) {
    mCurrentViewID = aCurrentViewID;
    mValid = true;
  }

  bool SetViewBox(const gfx::Rect& aRect) {
    mValid = mCurrentViewID.IsVoid() && !mViewSpecProcessed;
    if (mValid) {
      CreateSVGView(false);
      SVGViewBox viewBox(aRect.x, aRect.y, aRect.width, aRect.height);
      mSVGView->mViewBox.SetBaseValue(viewBox, mRoot, false);
    }
    mMediaFragmentProcessed = true;
    return mValid;
  }

  bool SetStartAndEndTime(Maybe<float> aStartTime, Maybe<float> aEndTime) {
    if (!mMediaFragmentProcessed) {
      mValid = true;
      mMediaFragmentProcessed = true;
    }
    if (mValid) {
      mStartTime = aStartTime;
      mEndTime = aEndTime;
    }
    return mValid;
  }

  bool ProcessViewSpecAttr(const nsAString& aToken, const nsAString& aParams) {
    MOZ_ASSERT(mSVGView, "CreateSVGView should have been called");

    // SVGViewAttributes may occur in any order, but each type may only occur
    // at most one time in a correctly formed SVGViewSpec.
    // If we encounter any attribute more than once or get any syntax errors
    // we're going to return false and cancel any changes.

    if (IsMatchingParameter(aToken, u"viewBox"_ns)) {
      if (mSVGView->mViewBox.IsExplicitlySet() ||
          NS_FAILED(
              mSVGView->mViewBox.SetBaseValueString(aParams, mRoot, false))) {
        return false;
      }
    } else if (IsMatchingParameter(aToken, u"preserveAspectRatio"_ns)) {
      if (mSVGView->mPreserveAspectRatio.IsExplicitlySet() ||
          NS_FAILED(mSVGView->mPreserveAspectRatio.SetBaseValueString(
              aParams, mRoot, false))) {
        return false;
      }
    } else if (IsMatchingParameter(aToken, u"transform"_ns)) {
      if (mSVGView->mTransforms) {
        return false;
      }
      mSVGView->mTransforms = std::make_unique<SVGAnimatedTransformList>();
      if (NS_FAILED(
              mSVGView->mTransforms->SetBaseValueString(aParams, mRoot))) {
        return false;
      }
    } else if (IsMatchingParameter(aToken, u"zoomAndPan"_ns)) {
      if (mSVGView->mZoomAndPan.IsExplicitlySet()) {
        return false;
      }
      nsAtom* valAtom = NS_GetStaticAtom(aParams);
      if (!valAtom || !mSVGView->mZoomAndPan.SetBaseValueAtom(valAtom, mRoot)) {
        return false;
      }
    } else {
      return false;
    }
    return true;
  }

  SVGSVGElement* RootElement() const { return mRoot; }

  void SetValid(bool aValid = true) { mValid = aValid; }

 private:
  RefPtr<SVGSVGElement> mRoot;
  nsString mCurrentViewID = VoidString();
  std::unique_ptr<SVGView> mSVGView;
  Maybe<float> mStartTime, mEndTime;
  bool mViewSpecProcessed = false;
  bool mMediaFragmentProcessed = false;
  bool mValid = false;
};

static bool ProcessCurrentView(Document* aDocument, const nsAString& aID,
                               AutoFragmentHandler& aViewHandler) {
  if (!SVGViewElement::FromNodeOrNull(aDocument->GetElementById(aID))) {
    return false;
  }
  aViewHandler.SetCurrentViewID(aID);
  return true;
}

static bool ProcessSVGViewSpec(const nsAString& aViewSpec,
                               AutoFragmentHandler& aViewHandler) {
  if (!IsMatchingParameter(aViewSpec, u"svgView"_ns)) {
    return false;
  }

  // Each token is a SVGViewAttribute
  int32_t bracketPos = aViewSpec.FindChar('(');
  uint32_t lengthOfViewSpec = aViewSpec.Length() - bracketPos - 2;
  nsCharSeparatedTokenizerTemplate<NS_TokenizerIgnoreNothing> tokenizer(
      Substring(aViewSpec, bracketPos + 1, lengthOfViewSpec), ';');

  if (!tokenizer.hasMoreTokens()) {
    return false;
  }
  aViewHandler.CreateSVGView(true);

  do {
    nsAutoString token(tokenizer.nextToken());

    bracketPos = token.FindChar('(');
    if (bracketPos < 1 || token.Last() != ')') {
      // invalid SVGViewAttribute syntax
      return false;
    }

    const nsAString& params =
        Substring(token, bracketPos + 1, token.Length() - bracketPos - 2);

    if (!aViewHandler.ProcessViewSpecAttr(token, params)) {
      return false;
    }

  } while (tokenizer.hasMoreTokens());

  aViewHandler.SetValid();
  return true;
}

static bool ProcessMediaFragment(const nsAString& aMediaFragment,
                                 AutoFragmentHandler& aViewHandler) {
  NS_ConvertUTF16toUTF8 mediaFragment(aMediaFragment);
  MediaFragmentURIParser parser(mediaFragment);

  SVGSVGElement* root = aViewHandler.RootElement();

  Maybe<float> startTime, endTime;
  if (parser.HasStartTime()) {
    startTime = Some(parser.GetStartTime());
  }
  if (parser.HasEndTime()) {
    endTime = Some(parser.GetEndTime());
  }
  if (startTime || endTime) {
    MOZ_ASSERT(!parser.HasClip(), "Clip should be a separate parameter");
    return aViewHandler.SetStartAndEndTime(startTime, endTime);
  }
  if (parser.HasClip()) {
    gfx::Rect rect = IntRectToRect(parser.GetClip());
    gfx::Size size = root->GetIntrinsicSizeWithFallback();
    if (parser.GetClipUnit() == eClipUnit_Percent) {
      rect.Scale(size.width / 100.0f, size.height / 100.0f);
    }
    if (rect.XMost() > size.width) {
      rect.width = size.width - rect.x;
    }
    if (rect.YMost() > size.height) {
      rect.height = size.height - rect.y;
    }
    if (!rect.IsEmpty()) {
      return aViewHandler.SetViewBox(rect);
    }
  }

  aViewHandler.SetValid(false);
  return false;
}

static bool ProcessFirstParameter(Document* aDocument,
                                  const nsAString& aParameter,
                                  AutoFragmentHandler& aViewHandler) {
  if (ProcessCurrentView(aDocument, aParameter, aViewHandler)) {
    return true;
  }
  if (ProcessSVGViewSpec(aParameter, aViewHandler)) {
    return true;
  }
  if (ProcessMediaFragment(aParameter, aViewHandler)) {
    return true;
  }
  return false;
}

bool SVGFragmentIdentifier::ProcessFragmentIdentifier(
    Document* aDocument, const nsAString& aAnchorName) {
  MOZ_ASSERT(aDocument->GetSVGRootElement(), "expecting an SVG root element");

  nsCharSeparatedTokenizerTemplate<NS_TokenizerIgnoreNothing> specTokenizer(
      aAnchorName, '&');
  if (!specTokenizer.hasMoreTokens()) {
    return false;
  }
  nsAutoString parameter(specTokenizer.nextToken());

  RefPtr rootElement = SVGSVGElement::FromNode(aDocument->GetRootElement());
  AutoFragmentHandler fragmentHandler(rootElement);

  if (!ProcessFirstParameter(aDocument, parameter, fragmentHandler)) {
    return false;
  }
  while (specTokenizer.hasMoreTokens()) {
    parameter = specTokenizer.nextToken();
    ProcessMediaFragment(parameter, fragmentHandler);
  }
  return fragmentHandler.StopProcessing();
}

}  // namespace mozilla
