/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef _NS_DEVICECONTEXT_H_
#define _NS_DEVICECONTEXT_H_

#include <stdint.h>                   // for uint32_t
#include <sys/types.h>                // for int32_t
#include "gfxTypes.h"                 // for gfxFloat
#include "gfxFont.h"                  // for gfxFont::Orientation
#include "mozilla/Assertions.h"       // for MOZ_ASSERT_HELPER2
#include "mozilla/RefPtr.h"           // for RefPtr
#include "nsCOMPtr.h"                 // for nsCOMPtr
#include "nsCoord.h"                  // for nscoord
#include "nsError.h"                  // for nsresult
#include "nsISupports.h"              // for NS_INLINE_DECL_REFCOUNTING
#include "nsMathUtils.h"              // for NS_round
#include "nscore.h"                   // for char16_t, nsAString
#include "mozilla/AppUnits.h"         // for AppUnits
#include "nsFontMetrics.h"            // for nsFontMetrics::Params
#include "mozilla/gfx/Point.h"        // for IntSize
#include "mozilla/gfx/PrintTarget.h"  // for PrintTarget::PageDoneCallback
#include "mozilla/gfx/PrintPromise.h"

class gfxContext;
class gfxTextPerfMetrics;
class gfxUserFontSet;
struct nsFont;
class nsAtom;
class nsIDeviceContextSpec;
class nsIScreen;
class nsIScreenManager;
class nsIWidget;
struct nsRect;

namespace mozilla {
namespace dom {
enum class ScreenColorGamut : uint8_t;
}  // namespace dom
namespace hal {
enum class ScreenOrientation : uint32_t;
}  // namespace hal
namespace widget {
class Screen;
}  // namespace widget
}  // namespace mozilla

class nsDeviceContext final {
 public:
  using IntSize = mozilla::gfx::IntSize;
  using PrintTarget = mozilla::gfx::PrintTarget;

  nsDeviceContext();

  NS_INLINE_DECL_REFCOUNTING(nsDeviceContext)

  /**
   * Initialize the device context from a widget
   * @param aWidget a widget to initialize the device context from
   */
  void Init(nsIWidget* aWidget);

  /**
   * Initialize the device context from a device context spec
   * @param aDevSpec the specification of the printing device
   * @return error status
   */
  nsresult InitForPrinting(nsIDeviceContextSpec* aDevSpec);

  /**
   * Create a rendering context and initialize it.  Only call this
   * method on device contexts that were initialized for printing.
   *
   * @return the new rendering context (guaranteed to be non-null)
   */
  mozilla::UniquePtr<gfxContext> CreateRenderingContext();

  /**
   * Create a reference rendering context and initialize it.  Only call this
   * method on device contexts that were initialized for printing.
   *
   * @return the new rendering context.
   */
  mozilla::UniquePtr<gfxContext> CreateReferenceRenderingContext();

  /**
   * Gets the number of app units in one device pixel; this number
   * is usually a factor of AppUnitsPerCSSPixel(), although that is
   * not guaranteed.
   */
  int32_t AppUnitsPerDevPixel() const { return mAppUnitsPerDevPixel; }

  /**
   * Convert device pixels which is used for gfx/thebes to nearest
   * (rounded) app units
   */
  nscoord GfxUnitsToAppUnits(gfxFloat aGfxUnits) const {
    return nscoord(NS_round(aGfxUnits * AppUnitsPerDevPixel()));
  }

  /**
   * Convert app units to device pixels which is used for gfx/thebes.
   */
  gfxFloat AppUnitsToGfxUnits(nscoord aAppUnits) const {
    return gfxFloat(aAppUnits) / AppUnitsPerDevPixel();
  }

  /**
   * Gets the number of app units in one physical inch; this is the
   * device's DPI times AppUnitsPerDevPixel().
   */
  int32_t AppUnitsPerPhysicalInch() const { return mAppUnitsPerPhysicalInch; }

  /**
   * Get the ratio of app units to dev pixels that would be used at unit
   * (100%) full zoom.
   */
  int32_t AppUnitsPerDevPixelAtUnitFullZoom() const {
    return mAppUnitsPerDevPixelAtUnitFullZoom;
  }

  /**
   * Get the ratio of app units to dev pixels that would be used in a top-level
   * chrome page such as browser.xhtml.
   */
  int32_t AppUnitsPerDevPixelInTopLevelChromePage() const;

  /**
   * Return the bit depth of the device.
   */
  uint32_t GetDepth();

  /**
   * Return the color gamut of the device.
   */
  mozilla::dom::ScreenColorGamut GetColorGamut();

  /**
   * Return the orientation type of the device.
   * If not screen device, return primary screen's value
   */
  mozilla::hal::ScreenOrientation GetScreenOrientationType();

  /**
   * Return the orientation angle of the device.
   * If not screen device, return primary screen's value
   */
  uint16_t GetScreenOrientationAngle();

  /**
   * Get the status of HDR support of the associated screen.
   */
  bool GetScreenIsHDR();

  /**
   * Get the size of the displayable area of the output device
   * in app units.
   * @param aWidth out parameter for width
   * @param aHeight out parameter for height
   * @return error status
   */
  nsresult GetDeviceSurfaceDimensions(nscoord& aWidth, nscoord& aHeight);

  /**
   * Get the size of the content area of the output device in app
   * units.  This corresponds on a screen device, for instance, to
   * the entire screen.
   * @param aRect out parameter for full rect. Position (x,y) will
   *              be (0,0) or relative to the primary monitor if
   *              this is not the primary.
   * @return error status
   */
  nsresult GetRect(nsRect& aRect);

  /**
   * Get the size of the content area of the output device in app
   * units.  This corresponds on a screen device, for instance, to
   * the area reported by GetDeviceSurfaceDimensions, minus the
   * taskbar (Windows) or menubar (Macintosh).
   * @param aRect out parameter for client rect. Position (x,y) will
   *              be (0,0) adjusted for any upper/left non-client
   *              space if present or relative to the primary
   *              monitor if this is not the primary.
   * @return error status
   */
  nsresult GetClientRect(nsRect& aRect);

  /**
   * Returns true if we're currently between BeginDocument() and
   * EndDocument() calls.
   */
  bool IsCurrentlyPrintingDocument() const { return mIsCurrentlyPrintingDoc; }

  /**
   * Inform the output device that output of a document is beginning
   * Used for print related device contexts. Must be matched 1:1 with
   * EndDocument() or AbortDocument().
   *
   * @param aTitle - title of Document
   * @param aPrintToFileName - name of file to print to, if empty then don't
   *                           print to file
   * @param aStartPage - starting page number (must be greater than zero)
   * @param aEndPage - ending page number (must be less than or
   * equal to number of pages)
   *
   * @return error status
   */
  nsresult BeginDocument(const nsAString& aTitle,
                         const nsAString& aPrintToFileName, int32_t aStartPage,
                         int32_t aEndPage);

  /**
   * Inform the output device that output of a document is ending.
   * Used for print related device contexts. Must be matched 1:1 with
   * BeginDocument()
   * @return Promise that can be chained once the operation is complete.
   */
  RefPtr<mozilla::gfx::PrintEndDocumentPromise> EndDocument();

  /**
   * Inform the output device that output of a document is being aborted.
   * Must be matched 1:1 with BeginDocument()
   * @return error status
   */
  nsresult AbortDocument();

  /**
   * Inform the output device that output of a page is beginning
   * Used for print related device contexts. Must be matched 1:1 with
   * EndPage() and within a BeginDocument()/EndDocument() pair.
   *
   * @param aSizeInPoints - The physical dimensions of the page in points.
   *                        Currently only supported (used) by print-to-PDF
   *                        print targets, and then only to switch the
   *                        orientation for a specific page (arbitrary page
   *                        sizes are not supported by the Core Graphics print-
   *                        to-PDF APIs, for example).
   *
   * @return error status
   */
  nsresult BeginPage(const IntSize& aSizeInPoints);

  /**
   * Inform the output device that output of a page is ending
   * Used for print related device contexts. Must be matched 1:1 with
   * BeginPage() and within a BeginDocument()/EndDocument() pair.
   * @return error status
   */
  nsresult EndPage();

  /**
   * Check to see if the DPI has changed, or impose a new DPI scale value.
   * @return whether there was actually a change in the DPI (whether
   *         AppUnitsPerDevPixel() or AppUnitsPerPhysicalInch()
   *         changed)
   */
  bool CheckDPIChange();

  /**
   * Set the full zoom factor: all lengths are multiplied by this factor
   * when we convert them to device pixels. Returns whether the ratio of
   * app units to dev pixels changed because of the zoom factor.
   */
  bool SetFullZoom(float aScale);

  /**
   * Returns the page full zoom factor applied.
   */
  float GetFullZoom() const { return mFullZoom; }

  /**
   * True if this device context was created for printing.
   */
  bool IsPrinterContext() const { return !!mPrintTarget; }

  mozilla::DesktopToLayoutDeviceScale GetDesktopToDeviceScale();

 private:
  // Private destructor, to discourage deletion outside of Release():
  ~nsDeviceContext();

  /**
   * Implementation shared by CreateRenderingContext and
   * CreateReferenceRenderingContext.
   */
  mozilla::UniquePtr<gfxContext> CreateRenderingContextCommon(
      bool aWantReferenceContext);

  void SetDPI();
  void ComputeClientRectUsingScreen(nsRect* outRect);
  void ComputeFullAreaUsingScreen(nsRect* outRect);
  already_AddRefed<mozilla::widget::Screen> FindScreen();

  // Return false if the surface is not right
  bool CalcPrintingSize();
  void UpdateAppUnitsForFullZoom();

  nscoord mWidth;
  nscoord mHeight;
  int32_t mAppUnitsPerDevPixel;
  int32_t mAppUnitsPerDevPixelAtUnitFullZoom;
  int32_t mAppUnitsPerPhysicalInch;
  float mFullZoom;
  float mPrintingScale;
  gfxPoint mPrintingTranslate;

  nsCOMPtr<nsIWidget> mWidget;
  nsCOMPtr<nsIDeviceContextSpec> mDeviceContextSpec;
  RefPtr<PrintTarget> mPrintTarget;
  bool mIsCurrentlyPrintingDoc;
  bool mIsInitialized = false;
};

#endif /* _NS_DEVICECONTEXT_H_ */
