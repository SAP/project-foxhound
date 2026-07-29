
/*
 * Copyright 2012 Mozilla Foundation
 *
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

#include "src/ports/SkFontHost_FreeType_common.h"

#include "src/core/SkAdvancedTypefaceMetrics.h"
#include "src/core/SkFDot6.h"
#include "include/core/SkFontMetrics.h"
#include "include/core/SkFontTypes.h"
#include "include/core/SkPath.h"
#include "include/core/SkPathBuilder.h"
#include "include/core/SkStream.h"
#include "src/core/SkScalerContext.h"
#include "src/core/SkTypefaceCache.h"

#include <cfloat>
#include <cmath>
#include <memory>

#include <ft2build.h>
#include FT_FREETYPE_H
#include FT_OUTLINE_H
#include FT_TRUETYPE_TABLES_H
#include FT_TYPE1_TABLES_H

#ifdef FT_FONT_FORMATS_H
#include FT_FONT_FORMATS_H
#else
#include FT_XFREE86_H
#endif

// for FT_GlyphSlot_Embolden
#ifdef FT_SYNTHESIS_H
#include FT_SYNTHESIS_H
#endif

// for FT_Library_SetLcdFilter
#ifdef FT_LCD_FILTER_H
#include FT_LCD_FILTER_H
#else
typedef enum FT_LcdFilter_
{
    FT_LCD_FILTER_NONE    = 0,
    FT_LCD_FILTER_DEFAULT = 1,
    FT_LCD_FILTER_LIGHT   = 2,
    FT_LCD_FILTER_LEGACY  = 16,
} FT_LcdFilter;
#endif

// If compiling with FreeType before 2.5.0
#ifndef FT_LOAD_COLOR
#    define FT_LOAD_COLOR ( 1L << 20 )
#    define FT_PIXEL_MODE_BGRA 7
#endif

// If compiling with FreeType before 2.12.0
#ifndef FT_FACE_FLAG_SVG
// We need the format tag so that we can switch on it and handle a possibly-
// newer version of the library at runtime.
static constexpr FT_UInt32 FT_IMAGE_TAG(FT_GLYPH_FORMAT_SVG, 'S', 'V', 'G', ' ');
#endif

#ifndef SK_CAN_USE_DLOPEN
#define SK_CAN_USE_DLOPEN 1
#endif
#if SK_CAN_USE_DLOPEN
#include <dlfcn.h>
#endif

#ifndef SK_FONTHOST_CAIRO_STANDALONE
#define SK_FONTHOST_CAIRO_STANDALONE 1
#endif

static bool gFontHintingEnabled = true;
static FT_Error (*gSetLcdFilter)(FT_Library, FT_LcdFilter) = nullptr;

extern "C"
{
    void mozilla_LockFTLibrary(FT_Library aLibrary);
    void mozilla_UnlockFTLibrary(FT_Library aLibrary);
    void mozilla_AddRefSharedFTFace(void* aContext);
    void mozilla_ReleaseSharedFTFace(void* aContext, void* aOwner);
    void mozilla_ForgetSharedFTFaceLockOwner(void* aContext, void* aOwner);
    int mozilla_LockSharedFTFace(void* aContext, void* aOwner);
    void mozilla_UnlockSharedFTFace(void* aContext);
    FT_Error mozilla_LoadFTGlyph(FT_Face aFace, uint32_t aGlyphIndex, int32_t aFlags);
    void mozilla_glyphslot_embolden_less(FT_GlyphSlot slot);
}

void SkInitCairoFT(bool fontHintingEnabled)
{
    gFontHintingEnabled = fontHintingEnabled;
#if SK_CAN_USE_DLOPEN
    gSetLcdFilter = (FT_Error (*)(FT_Library, FT_LcdFilter))dlsym(RTLD_DEFAULT, "FT_Library_SetLcdFilter");
#else
    gSetLcdFilter = &FT_Library_SetLcdFilter;
#endif
    // FT_Library_SetLcdFilter may be provided but have no effect if FreeType
    // is built without FT_CONFIG_OPTION_SUBPIXEL_RENDERING.
    if (gSetLcdFilter &&
        gSetLcdFilter(nullptr, FT_LCD_FILTER_NONE) == FT_Err_Unimplemented_Feature) {
        gSetLcdFilter = nullptr;
    }
}

class SkScalerContext_CairoFT : public SkScalerContext {
public:
    SkScalerContext_CairoFT(SkTypeface& typeface,
                            const SkScalerContextEffects& effects,
                            const SkDescriptor* desc, FT_Face face,
                            void* faceContext, FT_LcdFilter lcdFilter);

    virtual ~SkScalerContext_CairoFT() {
        mozilla_ForgetSharedFTFaceLockOwner(fFTFaceContext, this);
    }

    bool isValid() const { return fFTFaceContext != nullptr; }

    void Lock() {
        if (!mozilla_LockSharedFTFace(fFTFaceContext, this)) {
            FT_Set_Transform(fFTFace, fHaveShape ? &fShapeMatrixFT : nullptr, nullptr);
            FT_Set_Char_Size(fFTFace, FT_F26Dot6(fScaleX * 64.0f + 0.5f),
                             FT_F26Dot6(fScaleY * 64.0f + 0.5f), 0, 0);
        }
    }

    void Unlock() { mozilla_UnlockSharedFTFace(fFTFaceContext); }

protected:
    GlyphMetrics generateMetrics(const SkGlyph& glyph, SkArenaAlloc* arena) override;
    void generateImage(const SkGlyph& glyph, void* imageBuffer) override;
    std::optional<GeneratedPath> generatePath(const SkGlyph& glyph) override;
    void generateFontMetrics(SkFontMetrics* metrics) override;

private:
    bool computeShapeMatrix(const SkMatrix& m);
    bool prepareGlyph(FT_GlyphSlot glyph);

    SkScalerContextFTUtils fUtils;
    FT_Face fFTFace;
    void* fFTFaceContext;
    FT_Int32 fLoadGlyphFlags;
    FT_LcdFilter fLcdFilter;
    SkScalar fScaleX;
    SkScalar fScaleY;
    SkMatrix fShapeMatrix;
    FT_Matrix fShapeMatrixFT;
    bool fHaveShape;
};

class AutoLockFTFace {
public:
    AutoLockFTFace(SkScalerContext_CairoFT* scalerContext)
        : fScalerContext(scalerContext) {
        fScalerContext->Lock();
    }

    ~AutoLockFTFace() { fScalerContext->Unlock(); }

private:
    SkScalerContext_CairoFT* fScalerContext;
};

static bool isLCD(const SkScalerContextRec& rec) {
    return SkMask::kLCD16_Format == rec.fMaskFormat;
}

static bool bothZero(SkScalar a, SkScalar b) {
    return 0 == a && 0 == b;
}

// returns false if there is any non-90-rotation or skew
static bool isAxisAligned(const SkScalerContextRec& rec) {
    return 0 == rec.fPreSkewX &&
           (bothZero(rec.fPost2x2[0][1], rec.fPost2x2[1][0]) ||
            bothZero(rec.fPost2x2[0][0], rec.fPost2x2[1][1]));
}

// Ported from SkFontHost_FreeType
static bool canEmbed(FT_Face face) {
    FT_UShort fsType = FT_Get_FSType_Flags(face);
    return (fsType & (FT_FSTYPE_RESTRICTED_LICENSE_EMBEDDING |
                      FT_FSTYPE_BITMAP_EMBEDDING_ONLY)) == 0;
}

static bool canSubset(FT_Face face) {
    FT_UShort fsType = FT_Get_FSType_Flags(face);
    return (fsType & FT_FSTYPE_NO_SUBSETTING) == 0;
}

class SkCairoFTTypeface : public SkTypeface {
public:
    std::unique_ptr<SkStreamAsset> onOpenStream(int* ttcIndex) const override {
        *ttcIndex = fFTFace->face_index & 0xFFFF;
        if (fFTFace->stream->base) {
            return SkMemoryStream::MakeCopy(fFTFace->stream->base, fFTFace->stream->size);
        }
        const char* filename = (const char*)fFTFace->stream->pathname.pointer;
        if (filename) {
            return SkStreamAsset::MakeFromFile(filename);
        }
        return nullptr;
    }

    std::unique_ptr<SkAdvancedTypefaceMetrics> onGetAdvancedMetrics() const override
    {
        mozilla_LockSharedFTFace(fFTFaceContext, nullptr);
        FT_Face face = fFTFace;
        auto info = std::make_unique<SkAdvancedTypefaceMetrics>();
        info->fPostScriptName = FT_Get_Postscript_Name(face);
        info ->fType = [&]() {
            // https://freetype.org/freetype2/docs/reference/ft2-font_formats.html
            const char* format = FT_Get_X11_Font_Format(fFTFace);
            if (!strcmp(format, "TrueType")) {
                return SkAdvancedTypefaceMetrics::kTrueType_Font;
            }
            if (!strcmp(format, "Type 1")) {
                return SkAdvancedTypefaceMetrics::kType1_Font;
            }
            if (!strcmp(format, "CID Type 1")) {
                return SkAdvancedTypefaceMetrics::kType1CID_Font;
            }
            if (!strcmp(format, "CFF")) {
                return SkAdvancedTypefaceMetrics::kCFF_Font;
            }
            return SkAdvancedTypefaceMetrics::kOther_Font;
        }();
        if (FT_HAS_MULTIPLE_MASTERS(face)) {
            info->fFlags |= SkAdvancedTypefaceMetrics::kVariable_FontFlag;
        }
        if (!canEmbed(face)) {
            info->fFlags |= SkAdvancedTypefaceMetrics::kNotEmbeddable_FontFlag;
        }
        if (!canSubset(face)) {
            info->fFlags |= SkAdvancedTypefaceMetrics::kNotSubsettable_FontFlag;
        }

        info->fStyle = (SkAdvancedTypefaceMetrics::StyleFlags)0;
        if (FT_IS_FIXED_WIDTH(face)) {
            info->fStyle |= SkAdvancedTypefaceMetrics::kFixedPitch_Style;
        }
        if (face->style_flags & FT_STYLE_FLAG_ITALIC) {
            info->fStyle |= SkAdvancedTypefaceMetrics::kItalic_Style;
        }

        PS_FontInfoRec psFontInfo;
        TT_Postscript* postTable;
        if (FT_Get_PS_Font_Info(face, &psFontInfo) == 0) {
            info->fItalicAngle = psFontInfo.italic_angle;
        } else if ((postTable = (TT_Postscript*)FT_Get_Sfnt_Table(face, ft_sfnt_post)) != nullptr) {
            info->fItalicAngle = SkFixedFloorToInt(postTable->italicAngle);
        } else {
            info->fItalicAngle = 0;
        }

        info->fAscent = face->ascender;
        info->fDescent = face->descender;

        TT_PCLT* pcltTable;
        TT_OS2* os2Table;
        if ((pcltTable = (TT_PCLT*)FT_Get_Sfnt_Table(face, ft_sfnt_pclt)) != nullptr) {
            info->fCapHeight = pcltTable->CapHeight;
            uint8_t serif_style = pcltTable->SerifStyle & 0x3F;
            if (2 <= serif_style && serif_style <= 6) {
                info->fStyle |= SkAdvancedTypefaceMetrics::kSerif_Style;
            } else if (9 <= serif_style && serif_style <= 12) {
                info->fStyle |= SkAdvancedTypefaceMetrics::kScript_Style;
            }
        } else if (((os2Table = (TT_OS2*)FT_Get_Sfnt_Table(face, ft_sfnt_os2)) != nullptr) &&
                   // sCapHeight is available only when version 2 or later.
                   os2Table->version != 0xFFFF &&
                   os2Table->version >= 2)
        {
            info->fCapHeight = os2Table->sCapHeight;
        }
        info->fBBox = SkIRect::MakeLTRB(face->bbox.xMin, face->bbox.yMax,
                                        face->bbox.xMax, face->bbox.yMin);
        mozilla_UnlockSharedFTFace(fFTFaceContext);
        return info;
    }

    std::unique_ptr<SkScalerContext> onCreateScalerContext(const SkScalerContextEffects& effects, const SkDescriptor* desc) const override
    {
        SkScalerContext_CairoFT* ctx = new SkScalerContext_CairoFT(
            *const_cast<SkCairoFTTypeface*>(this), effects, desc,
            fFTFace, fFTFaceContext, fLcdFilter);
        std::unique_ptr<SkScalerContext> result(ctx);
        if (!ctx->isValid()) {
            return nullptr;
        }
        return result;
    }

    void onFilterRec(SkScalerContextRec* rec) const override
    {
        // rotated text looks bad with hinting, so we disable it as needed
        if (!gFontHintingEnabled || !isAxisAligned(*rec)) {
            rec->setHinting(SkFontHinting::kNone);
        }

#ifndef SK_GAMMA_APPLY_TO_A8
        if (!isLCD(*rec)) {
            rec->ignorePreBlend();
        }
#endif
    }

    void onGetFontDescriptor(SkFontDescriptor*, bool*) const override
    {
        SkDEBUGCODE(SkDebugf("SkCairoFTTypeface::onGetFontDescriptor unimplemented\n"));
    }

    void onCharsToGlyphs(SkSpan<const SkUnichar> chars, SkSpan<SkGlyphID> glyphs) const override
    {
        mozilla_LockSharedFTFace(fFTFaceContext, nullptr);
        for (int i = 0; i < chars.size(); ++i) {
            glyphs[i] = SkToU16(FT_Get_Char_Index(fFTFace, chars[i]));
        }
        mozilla_UnlockSharedFTFace(fFTFaceContext);
    }

    int onCountGlyphs() const override
    {
        return fFTFace->num_glyphs;
    }

    int onGetUPEM() const override
    {
        return fFTFace->units_per_EM;
    }

    SkTypeface::LocalizedStrings* onCreateFamilyNameIterator() const override
    {
        return nullptr;
    }

    void onGetFamilyName(SkString* familyName) const override
    {
        familyName->reset();
    }

    bool onGetPostScriptName(SkString*) const override {
        return false;
    }

    bool onGlyphMaskNeedsCurrentColor() const override {
        return false;
    }

    int onGetTableTags(SkSpan<SkFontTableTag> tags) const override
    {
        mozilla_LockSharedFTFace(fFTFaceContext, nullptr);
        FT_ULong tableCount = 0;
        FT_Error error = FT_Sfnt_Table_Info(fFTFace, 0, nullptr, &tableCount);
        if (!error) {
            const size_t count = std::min<size_t>(tableCount, tags.size());
            for (size_t i = 0; i < count; ++i) {
                FT_ULong tag, length;
                if (FT_Sfnt_Table_Info(fFTFace, i, &tag, &length)) {
                    tableCount = 0;
                    break;
                }
                tags[i] = static_cast<SkFontTableTag>(tag);
            }
        }
        mozilla_UnlockSharedFTFace(fFTFaceContext);
        return error ? 0 : tableCount;
    }

    size_t onGetTableData(SkFontTableTag tag, size_t offset, size_t length, void* data) const override
    {
        mozilla_LockSharedFTFace(fFTFaceContext, nullptr);
        FT_ULong tableLength = 0;
        FT_Error error = FT_Load_Sfnt_Table(fFTFace, tag, 0, nullptr, &tableLength);
        size_t result = 0;
        if (!error && offset <= tableLength) {
            FT_ULong size = std::min((FT_ULong)length, tableLength - (FT_ULong)offset);
            if (data) {
                error = FT_Load_Sfnt_Table(fFTFace, tag, offset,
                                           reinterpret_cast<FT_Byte*>(data), &size);
            }
            if (!error) {
                result = size;
            }
        }
        mozilla_UnlockSharedFTFace(fFTFaceContext);
        return result;
    }

    void getPostScriptGlyphNames(SkString*) const override {}

    void getGlyphToUnicodeMap(SkSpan<SkUnichar> dstArray) const override
    {
        mozilla_LockSharedFTFace(fFTFaceContext, nullptr);
        const size_t numGlyphs = std::min(dstArray.size(), (size_t)fFTFace->num_glyphs);
        if (numGlyphs > 0) {
            sk_bzero(dstArray.data(), dstArray.size_bytes());
            FT_UInt glyphIndex;
            SkUnichar charCode = FT_Get_First_Char(fFTFace, &glyphIndex);
            while (glyphIndex) {
                if (glyphIndex < numGlyphs && dstArray[glyphIndex] == 0) {
                    dstArray[glyphIndex] = charCode;
                }
                charCode = FT_Get_Next_Char(fFTFace, charCode, &glyphIndex);
            }
        }
        mozilla_UnlockSharedFTFace(fFTFaceContext);
    }

    int onGetVariationDesignPosition(SkSpan<SkFontArguments::VariationPosition::Coordinate>) const override
    {
        return 0;
    }

    int onGetVariationDesignParameters(SkSpan<SkFontParameters::Variation::Axis> parameters) const override
    {
        return 0;
    }

    sk_sp<SkTypeface> onMakeClone(const SkFontArguments& args) const override {
        return sk_ref_sp(this);
    }

    SkCairoFTTypeface(FT_Face face, void* faceContext, FT_LcdFilter lcdFilter)
        : SkTypeface(SkFontStyle::Normal())
        , fFTFace(face)
        , fFTFaceContext(faceContext)
        , fLcdFilter(lcdFilter)
    {
        mozilla_AddRefSharedFTFace(fFTFaceContext);
    }

    void* GetFTFaceContext() const { return fFTFaceContext; }

    bool hasColorGlyphs() const override
    {
        // Check if the font has scalable outlines. If not, then avoid trying
        // to render it as a path.
        if (fFTFace) {
            return !FT_IS_SCALABLE(fFTFace);
        }
        return false;
    }

private:
    ~SkCairoFTTypeface()
    {
        mozilla_ReleaseSharedFTFace(fFTFaceContext, nullptr);
    }

    FT_Face            fFTFace;
    void*              fFTFaceContext;
    FT_LcdFilter       fLcdFilter;
};

static bool FindByFTFaceContext(SkTypeface* typeface, void* context) {
    return static_cast<SkCairoFTTypeface*>(typeface)->GetFTFaceContext() == context;
}

SkTypeface* SkCreateTypefaceFromCairoFTFont(FT_Face face, void* faceContext,
                                            uint8_t lcdFilter)
{
    sk_sp<SkTypeface> typeface =
        SkTypefaceCache::FindByProcAndRef(FindByFTFaceContext, faceContext);
    if (!typeface) {
        typeface = sk_make_sp<SkCairoFTTypeface>(face, faceContext,
                                                 (FT_LcdFilter)lcdFilter);
        SkTypefaceCache::Add(typeface);
    }

    return typeface.release();
}

SkScalerContext_CairoFT::SkScalerContext_CairoFT(
    SkTypeface& typeface, const SkScalerContextEffects& effects,
    const SkDescriptor* desc, FT_Face face, void* faceContext,
    FT_LcdFilter lcdFilter)
    : SkScalerContext(typeface, effects, desc)
    , fFTFace(face)
    , fFTFaceContext(faceContext)
    , fLcdFilter(lcdFilter)
{
    SkMatrix matrix = fRec.getSingleMatrix();

    computeShapeMatrix(matrix);

    FT_Int32 loadFlags = FT_LOAD_DEFAULT;

    if (SkMask::kBW_Format == fRec.fMaskFormat) {
        if (fRec.getHinting() == SkFontHinting::kNone) {
            loadFlags |= FT_LOAD_NO_HINTING;
        } else {
            loadFlags = FT_LOAD_TARGET_MONO;
        }
        loadFlags |= FT_LOAD_MONOCHROME;
    } else {
        switch (fRec.getHinting()) {
        case SkFontHinting::kNone:
            loadFlags |= FT_LOAD_NO_HINTING;
            break;
        case SkFontHinting::kSlight:
            loadFlags = FT_LOAD_TARGET_LIGHT;  // This implies FORCE_AUTOHINT
            break;
        case SkFontHinting::kNormal:
            if (fRec.fFlags & SkScalerContext::kForceAutohinting_Flag) {
                loadFlags |= FT_LOAD_FORCE_AUTOHINT;
            }
            break;
        case SkFontHinting::kFull:
            if (isLCD(fRec)) {
                if (fRec.fFlags & SkScalerContext::kLCD_Vertical_Flag) {
                    loadFlags = FT_LOAD_TARGET_LCD_V;
                } else {
                    loadFlags = FT_LOAD_TARGET_LCD;
                }
            }
            if (fRec.fFlags & SkScalerContext::kForceAutohinting_Flag) {
                loadFlags |= FT_LOAD_FORCE_AUTOHINT;
            }
            break;
        default:
            SkDebugf("---------- UNKNOWN hinting %d\n", (int)fRec.getHinting());
            break;
        }
    }

    // Disable autohinting when asked to disable hinting, except for "tricky" fonts.
    if (!gFontHintingEnabled) {
        if (fFTFace && !(fFTFace->face_flags & FT_FACE_FLAG_TRICKY)) {
            loadFlags |= FT_LOAD_NO_AUTOHINT;
        }
    }

    if ((fRec.fFlags & SkScalerContext::kEmbeddedBitmapText_Flag) == 0) {
        loadFlags |= FT_LOAD_NO_BITMAP;
    }

    // Always using FT_LOAD_IGNORE_GLOBAL_ADVANCE_WIDTH to get correct
    // advances, as fontconfig and cairo do.
    // See http://code.google.com/p/skia/issues/detail?id=222.
    loadFlags |= FT_LOAD_IGNORE_GLOBAL_ADVANCE_WIDTH;

    loadFlags |= FT_LOAD_COLOR;

    fLoadGlyphFlags = loadFlags;

    fUtils.init(fRec.fForegroundColor, (SkScalerContext::Flags)fRec.fFlags);
}

bool SkScalerContext_CairoFT::computeShapeMatrix(const SkMatrix& m)
{
    // Compute a shape matrix compatible with Cairo's _compute_transform.
    // Finds major/minor scales and uses them to normalize the transform.
    double scaleX = m.getScaleX();
    double skewX = m.getSkewX();
    double skewY = m.getSkewY();
    double scaleY = m.getScaleY();
    double det = scaleX * scaleY - skewY * skewX;
    if (!std::isfinite(det)) {
        fScaleX = fRec.fTextSize * fRec.fPreScaleX;
        fScaleY = fRec.fTextSize;
        fHaveShape = false;
        return false;
    }
    double major = det != 0.0 ? hypot(scaleX, skewY) : 0.0;
    double minor = major != 0.0 ? fabs(det) / major : 0.0;
    // Limit scales to be above 1pt.
    major = std::max(major, 1.0);
    minor = std::max(minor, 1.0);

    // If the font is not scalable, then choose the best available size.
    if (fFTFace && !FT_IS_SCALABLE(fFTFace)) {
        double bestDist = DBL_MAX;
        FT_Int bestSize = -1;
        for (FT_Int i = 0; i < fFTFace->num_fixed_sizes; i++) {
            // Distance is positive if strike is larger than desired size,
            // or negative if smaller. If previously a found smaller strike,
            // then prefer a larger strike. Otherwise, minimize distance.
            double dist = fFTFace->available_sizes[i].y_ppem / 64.0 - minor;
            if (bestDist < 0 ? dist >= bestDist : fabs(dist) <= bestDist) {
                bestDist = dist;
                bestSize = i;
            }
        }
        if (bestSize < 0) {
            fScaleX = fRec.fTextSize * fRec.fPreScaleX;
            fScaleY = fRec.fTextSize;
            fHaveShape = false;
            return false;
        }
        major = fFTFace->available_sizes[bestSize].x_ppem / 64.0;
        minor = fFTFace->available_sizes[bestSize].y_ppem / 64.0;
        fHaveShape = true;
    } else {
        fHaveShape = !m.isScaleTranslate() || scaleX < 0.0 || scaleY < 0.0;
    }

    fScaleX = SkDoubleToScalar(major);
    fScaleY = SkDoubleToScalar(minor);

    if (fHaveShape) {
        // Normalize the transform and convert to fixed-point.
        fShapeMatrix = m;
        fShapeMatrix.preScale(SkDoubleToScalar(1.0 / major), SkDoubleToScalar(1.0 / minor));

        fShapeMatrixFT.xx = SkScalarToFixed(fShapeMatrix.getScaleX());
        fShapeMatrixFT.yx = SkScalarToFixed(-fShapeMatrix.getSkewY());
        fShapeMatrixFT.xy = SkScalarToFixed(-fShapeMatrix.getSkewX());
        fShapeMatrixFT.yy = SkScalarToFixed(fShapeMatrix.getScaleY());
    }
    return true;
}

bool SkScalerContext_CairoFT::prepareGlyph(FT_GlyphSlot glyph)
{
    bool modified = false;
    if (fRec.fFlags & SkScalerContext::kEmbolden_Flag) {
        // Not FT_GlyphSlot_Embolden because we want a less extreme effect.
        mozilla_glyphslot_embolden_less(glyph);
        modified = true;
    }
    return modified;
}

SkScalerContext::GlyphMetrics SkScalerContext_CairoFT::generateMetrics(const SkGlyph& glyph, SkArenaAlloc* arena)
{
    GlyphMetrics mx(glyph.maskFormat());

    AutoLockFTFace faceLock(this);

    FT_Error err = mozilla_LoadFTGlyph(fFTFace, glyph.getGlyphID(), fLoadGlyphFlags);
    if (err != 0) {
        return mx;
    }

    prepareGlyph(fFTFace->glyph);

    mx.advance.fX = SkFDot6ToFloat(fFTFace->glyph->advance.x);
    mx.advance.fY = -SkFDot6ToFloat(fFTFace->glyph->advance.y);

    SkIRect bounds;
    switch (fFTFace->glyph->format) {
    case FT_GLYPH_FORMAT_OUTLINE:
        if (!fFTFace->glyph->outline.n_contours) {
            return mx;
        }

        FT_BBox bbox;
        FT_Outline_Get_CBox(&fFTFace->glyph->outline, &bbox);
        if (this->isSubpixel()) {
            int dx = SkFixedToFDot6(glyph.getSubXFixed());
            int dy = SkFixedToFDot6(glyph.getSubYFixed());
            bbox.xMin += dx;
            bbox.yMin -= dy;
            bbox.xMax += dx;
            bbox.yMax -= dy;
        }
        bbox.xMin &= ~63;
        bbox.yMin &= ~63;
        bbox.xMax = (bbox.xMax + 63) & ~63;
        bbox.yMax = (bbox.yMax + 63) & ~63;
        bounds = SkIRect::MakeLTRB(SkFDot6Floor(bbox.xMin),
                                   -SkFDot6Floor(bbox.yMax),
                                   SkFDot6Floor(bbox.xMax),
                                   -SkFDot6Floor(bbox.yMin));

        if (isLCD(fRec)) {
            // In FreeType < 2.8.1, LCD filtering, if explicitly used, may
            // add padding to the glyph. When not used, there is no padding.
            // As of 2.8.1, LCD filtering is now always supported and may
            // add padding even if an LCD filter is not explicitly set.
            // Regardless, if no LCD filtering is used, or if LCD filtering
            // doesn't add padding, it is safe to modify the glyph's bounds
            // here. generateGlyphImage will detect if the mask is smaller
            // than the bounds and clip things appropriately.
            if (fRec.fFlags & kLCD_Vertical_Flag) {
                bounds.outset(0, 1);
            } else {
                bounds.outset(1, 0);
            }
        }
        break;
    case FT_GLYPH_FORMAT_BITMAP:
        mx.neverRequestPath = true;

        if (fFTFace->glyph->bitmap.pixel_mode == FT_PIXEL_MODE_BGRA) {
            mx.maskFormat = SkMask::kARGB32_Format;
        } else if (isLCD(fRec)) {
            mx.maskFormat = SkMask::kA8_Format;
        }

        if (fHaveShape) {
            // Ensure filtering is preserved when the bitmap is transformed.
            // Otherwise, the result will look horrifically aliased.
            if (mx.maskFormat == SkMask::kBW_Format) {
                mx.maskFormat = SkMask::kA8_Format;
            }

            // Apply the shape matrix to the glyph's bounding box.
            SkRect srcRect = SkRect::MakeXYWH(
                SkIntToScalar(fFTFace->glyph->bitmap_left),
                -SkIntToScalar(fFTFace->glyph->bitmap_top),
                SkIntToScalar(fFTFace->glyph->bitmap.width),
                SkIntToScalar(fFTFace->glyph->bitmap.rows));
            SkRect destRect;
            fShapeMatrix.mapRect(&destRect, srcRect);
            SkIRect glyphRect = destRect.roundOut();
            bounds = SkIRect::MakeXYWH(SkScalarRoundToInt(destRect.fLeft),
                                       SkScalarRoundToInt(destRect.fTop),
                                       glyphRect.width(),
                                       glyphRect.height());
        } else {
            bounds = SkIRect::MakeXYWH(fFTFace->glyph->bitmap_left,
                                       -fFTFace->glyph->bitmap_top,
                                       fFTFace->glyph->bitmap.width,
                                       fFTFace->glyph->bitmap.rows);
        }
        break;
    case FT_GLYPH_FORMAT_SVG:
        // We don't support getting glyph bounds for SVG, but at least the advance
        // should be correctly returned, and we don't want to fire an assertion.
        break;
    default:
        SkDEBUGFAIL("unknown glyph format");
        return mx;
    }

    if (SkIRect::MakeXYWH(SHRT_MIN, SHRT_MIN, USHRT_MAX, USHRT_MAX).contains(bounds)) {
      mx.bounds = SkRect::Make(bounds);
    }

    return mx;
}

void SkScalerContext_CairoFT::generateImage(const SkGlyph& glyph, void* imageBuffer)
{
    AutoLockFTFace faceLock(this);

    FT_Error err = mozilla_LoadFTGlyph(fFTFace, glyph.getGlyphID(), fLoadGlyphFlags);

    if (err != 0) {
        sk_bzero(imageBuffer, glyph.imageSize());
        return;
    }

    prepareGlyph(fFTFace->glyph);

    bool useLcdFilter =
        fFTFace->glyph->format == FT_GLYPH_FORMAT_OUTLINE &&
        glyph.maskFormat() == SkMask::kLCD16_Format &&
        gSetLcdFilter;
    if (useLcdFilter) {
        mozilla_LockFTLibrary(fFTFace->glyph->library);
        gSetLcdFilter(fFTFace->glyph->library, fLcdFilter);
    }

    SkMatrix matrix;
    if (fFTFace->glyph->format == FT_GLYPH_FORMAT_BITMAP &&
        fHaveShape) {
        matrix = fShapeMatrix;
    } else {
        matrix.setIdentity();
    }
    fUtils.generateGlyphImage(fFTFace, glyph, imageBuffer, matrix, fPreBlend);

    if (useLcdFilter) {
        gSetLcdFilter(fFTFace->glyph->library, FT_LCD_FILTER_NONE);
        mozilla_UnlockFTLibrary(fFTFace->glyph->library);
    }
}

std::optional<SkScalerContext::GeneratedPath> SkScalerContext_CairoFT::generatePath(const SkGlyph& glyph)
{
    AutoLockFTFace faceLock(this);

    SkGlyphID glyphID = glyph.getGlyphID();

    uint32_t flags = fLoadGlyphFlags;
    flags |= FT_LOAD_NO_BITMAP; // ignore embedded bitmaps so we're sure to get the outline
    flags &= ~FT_LOAD_RENDER;   // don't scan convert (we just want the outline)

    FT_Error err = mozilla_LoadFTGlyph(fFTFace, glyphID, flags);

    if (err != 0) {
        return {};
    }

    bool modified = prepareGlyph(fFTFace->glyph);

    SkPathBuilder builder;
    if (!fUtils.generateGlyphPath(fFTFace, &builder)) {
      return {};
    }
    return {{builder.detach(), modified}};
}

void SkScalerContext_CairoFT::generateFontMetrics(SkFontMetrics* metrics)
{
    if (metrics) {
        sk_bzero(metrics, sizeof(SkFontMetrics));
    }
}
