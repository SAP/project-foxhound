/* -*- Mode: C++; tab-width: 20; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef CoreTextFontList_H
#define CoreTextFontList_H

#include <CoreFoundation/CoreFoundation.h>

#include "gfxPlatformFontList.h"
#include "gfxPlatformMac.h"

#include "mozilla/FontPropertyTypes.h"
#include "mozilla/gfx/UnscaledFontMac.h"
#include "mozilla/LookAndFeel.h"
#include "mozilla/MemoryReporting.h"

#include "nsRefPtrHashtable.h"
#include "nsTArray.h"
#include "nsUnicharUtils.h"

// Abstract base class for Core Text/Core Graphics-based platform font list,
// which is subclassed to create specific macOS and iOS variants.

// A single member of a font family (i.e. a single face, such as Times Italic).
class CTFontEntry final : public gfxFontEntry {
 public:
  friend class CoreTextFontList;
  friend class gfxMacPlatformFontList;
  friend class gfxMacFont;

  CTFontEntry(const nsACString& aPostscriptName, WeightRange aWeight,
              bool aIsStandardFace = false, double aSizeHint = 0.0);

  // for use with data fonts
  CTFontEntry(const nsACString& aPostscriptName, CGFontRef aFontRef,
              WeightRange aWeight, StretchRange aStretch,
              SlantStyleRange aStyle, bool aIsDataUserFont, bool aIsLocal);

  virtual ~CTFontEntry() { ::CGFontRelease(mFontRef); }

  gfxFontEntry* Clone() const override;

  // Return a non-owning reference to our CGFont; caller must not release it.
  // This will cause the fontEntry to create & retain a CGFont for the life
  // of the entry.
  // Note that in the case of a broken font, this could return null.
  CGFontRef GetFontRef();

  // Return a new reference to our CGFont. Caller is responsible to release
  // this reference.
  // (If the entry has a cached CGFont, this just bumps its refcount and
  // returns it; if not, the instance returned will be owned solely by the
  // caller.)
  // Note that in the case of a broken font, this could return null.
  CGFontRef CreateOrCopyFontRef() MOZ_REQUIRES_SHARED(mLock);

  // override gfxFontEntry table access function to bypass table cache,
  // use CGFontRef API to get direct access to system font data
  hb_blob_t* GetFontTable(uint32_t aTag) override;

  void AddSizeOfIncludingThis(mozilla::MallocSizeOf aMallocSizeOf,
                              FontListSizes* aSizes) const override;

  nsresult ReadCMAP(FontInfoData* aFontInfoData = nullptr) override;

  bool RequiresAATLayout() const { return mRequiresAAT; }

  bool HasVariations() override;
  void GetVariationAxes(
      nsTArray<gfxFontVariationAxis>& aVariationAxes) override;
  void GetVariationInstances(
      nsTArray<gfxFontVariationInstance>& aInstances) override;

  bool IsCFF();

  bool SupportsOpenTypeFeature(Script aScript, uint32_t aFeatureTag) override;

 protected:
  gfxFont* CreateFontInstance(const gfxFontStyle* aFontStyle) override;

  bool HasFontTable(uint32_t aTableTag) override;

  static void DestroyBlobFunc(void* aUserData);

  CGFontRef mFontRef MOZ_GUARDED_BY(mLock);  // owning reference

  const double mSizeHint;

  bool mFontRefInitialized MOZ_GUARDED_BY(mLock);

  mozilla::Atomic<bool> mRequiresAAT;
  mozilla::Atomic<bool> mIsCFF;
  mozilla::Atomic<bool> mIsCFFInitialized;
  mozilla::Atomic<bool> mHasVariations;
  mozilla::Atomic<bool> mHasVariationsInitialized;
  mozilla::Atomic<bool> mHasAATSmallCaps;
  mozilla::Atomic<bool> mHasAATSmallCapsInitialized;

  // To work around Core Text's mishandling of the default value for 'opsz',
  // we need to record whether the font has an a optical size axis, what its
  // range and default values are, and a usable close-to-default alternative.
  // (See bug 1457417 for details.)
  // These fields are used by gfxMacFont, but stored in the font entry so
  // that only a single font instance needs to inspect the available
  // variations.
  gfxFontVariationAxis mOpszAxis MOZ_GUARDED_BY(mLock);
  float mAdjustedDefaultOpsz MOZ_GUARDED_BY(mLock);

  nsTHashtable<nsUint32HashKey> mAvailableTables MOZ_GUARDED_BY(mLock);

  mozilla::ThreadSafeWeakPtr<mozilla::gfx::UnscaledFontMac> mUnscaledFont;
};

class CTFontFamily : public gfxFontFamily {
 public:
  CTFontFamily(const nsACString& aName, FontVisibility aVisibility)
      : gfxFontFamily(aName, aVisibility) {}

  virtual ~CTFontFamily() = default;

  void LocalizedName(nsACString& aLocalizedName) override;

  void FindStyleVariationsLocked(FontInfoData* aFontInfoData = nullptr)
      MOZ_REQUIRES(mLock) override;

 protected:
  void AddFace(CTFontDescriptorRef aFace) MOZ_REQUIRES(mLock);
};

class CoreTextFontList : public gfxPlatformFontList {
  using FontFamilyListEntry = mozilla::dom::SystemFontListEntry;

 public:
  gfxFontFamily* CreateFontFamily(const nsACString& aName,
                                  FontVisibility aVisibility) const override;

  static int32_t AppleWeightToCSSWeight(int32_t aAppleWeight);

  gfxFontEntry* LookupLocalFont(nsPresContext* aPresContext,
                                const nsACString& aFontName,
                                WeightRange aWeightForEntry,
                                StretchRange aStretchForEntry,
                                SlantStyleRange aStyleForEntry) override;

  gfxFontEntry* MakePlatformFont(const nsACString& aFontName,
                                 WeightRange aWeightForEntry,
                                 StretchRange aStretchForEntry,
                                 SlantStyleRange aStyleForEntry,
                                 const uint8_t* aFontData,
                                 uint32_t aLength) override;

  bool FindAndAddFamiliesLocked(
      nsPresContext* aPresContext, mozilla::StyleGenericFontFamily aGeneric,
      const nsACString& aFamily, nsTArray<FamilyAndGeneric>* aOutput,
      FindFamiliesFlags aFlags, gfxFontStyle* aStyle = nullptr,
      nsAtom* aLanguage = nullptr, gfxFloat aDevToCssSize = 1.0)
      MOZ_REQUIRES(mLock) override;

  // Values for the entryType field in FontFamilyListEntry records passed
  // from chrome to content process.
  enum FontFamilyEntryType {
    kStandardFontFamily = 0,  // a standard installed font family
    kSystemFontFamily = 1,    // name of 'system' font
  };
  void ReadSystemFontList(mozilla::dom::SystemFontList*);

 protected:
  CoreTextFontList();
  virtual ~CoreTextFontList();

  // initialize font lists
  nsresult InitFontListForPlatform() MOZ_REQUIRES(mLock) override;
  void InitSharedFontListForPlatform() MOZ_REQUIRES(mLock) override;

  // handle commonly used fonts for which the name table should be loaded at
  // startup
  void PreloadNamesList() MOZ_REQUIRES(mLock);

  // initialize system fonts
  virtual void InitSystemFontNames() = 0;

  // Hooks for the macOS-specific "single face family" hack (Osaka-mono).
  virtual void InitSingleFaceList() {}
  virtual void InitAliasesForSingleFaceList() {}

  virtual bool DeprecatedFamilyIsAvailable(const nsACString& aName) {
    return false;
  }

  virtual FontVisibility GetVisibilityForFamily(const nsACString& aName) const {
    return FontVisibility::Unknown;
  }

  // helper function to lookup in both hidden system fonts and normal fonts
  gfxFontFamily* FindSystemFontFamily(const nsACString& aFamily)
      MOZ_REQUIRES(mLock);

  static void RegisteredFontsChangedNotificationCallback(
      CFNotificationCenterRef center, void* observer, CFStringRef name,
      const void* object, CFDictionaryRef userInfo);

  // attempt to use platform-specific fallback for the given character
  // return null if no usable result found
  gfxFontEntry* PlatformGlobalFontFallback(nsPresContext* aPresContext,
                                           const uint32_t aCh,
                                           Script aRunScript,
                                           const gfxFontStyle* aMatchStyle,
                                           FontFamily& aMatchedFamily)
      MOZ_REQUIRES(mLock) override;

  bool UsesSystemFallback() override { return true; }

  already_AddRefed<FontInfoData> CreateFontInfoData() override;

  // Add the specified family to mFontFamilies.
  void AddFamily(CFStringRef aFamily) MOZ_REQUIRES(mLock);

  void AddFamily(const nsACString& aFamilyName, FontVisibility aVisibility)
      MOZ_REQUIRES(mLock);

  static void ActivateFontsFromDir(
      const nsACString& aDir,
      nsTHashSet<nsCStringHashKey>* aLoadedFamilies = nullptr);

  gfxFontEntry* CreateFontEntry(
      mozilla::fontlist::Face* aFace,
      const mozilla::fontlist::Family* aFamily) override;

  void GetFacesInitDataForFamily(
      const mozilla::fontlist::Family* aFamily,
      nsTArray<mozilla::fontlist::Face::InitData>& aFaces,
      bool aLoadCmaps) const override;

  static void AddFaceInitData(
      CTFontDescriptorRef aFontDesc,
      nsTArray<mozilla::fontlist::Face::InitData>& aFaces, bool aLoadCmaps);

  void ReadFaceNamesForFamily(mozilla::fontlist::Family* aFamily,
                              bool aNeedFullnamePostscriptNames)
      MOZ_REQUIRES(mLock) override;

#ifdef MOZ_BUNDLED_FONTS
  void ActivateBundledFonts();
#endif

  // default font for use with system-wide font fallback
  CTFontRef mDefaultFont;

  // Font family that -apple-system maps to
  nsCString mSystemFontFamilyName;

  nsTArray<nsCString> mPreloadFonts;

#ifdef MOZ_BUNDLED_FONTS
  nsTHashSet<nsCStringHashKey> mBundledFamilies;
#endif
};

#endif /* CoreTextFontList_H */
