/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOZILLA_GFX_GL_COLORSPACES_H_
#define MOZILLA_GFX_GL_COLORSPACES_H_

// Reference: https://hackmd.io/0wkiLmP7RWOFjcD13M870A

// We are going to be doing so, so many transforms, so descriptive labels are
// critical.

// Colorspace background info: https://hackmd.io/0wkiLmP7RWOFjcD13M870A

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <functional>
#include <optional>
#include <vector>

#include "AutoMappable.h"
#include "mozilla/Assertions.h"
#include "mozilla/Attributes.h"
#include "mozilla/Span.h"

#ifdef DEBUG
#  define ASSERT(EXPR)    \
    do {                  \
      if (!(EXPR)) {      \
        __builtin_trap(); \
      }                   \
    } while (false)
#else
#  define ASSERT(EXPR) (void)(EXPR)
#endif

struct _qcms_profile;
typedef struct _qcms_profile qcms_profile;

namespace mozilla::color {

// -

struct YuvLumaCoeffs final {
  float r = 0.2126;
  float g = 0.7152;
  float b = 0.0722;

  auto Members() const { return std::tie(r, g, b); }
  MOZ_MIXIN_DERIVE_CMP_OPS_BY_MEMBERS(YuvLumaCoeffs)

  static constexpr auto Rec709() { return YuvLumaCoeffs(); }

  static constexpr auto Rec2020() {
    return YuvLumaCoeffs{
        .r = 0.2627,
        .g = 0.6780,
        .b = 0.0593,
    };
  }

  static constexpr auto Gbr() { return YuvLumaCoeffs{.r = 0, .g = 1, .b = 0}; }
};

struct PiecewiseGammaDesc final {
  // tf = { k * linear                   | linear < b
  //      { a * pow(linear, 1/g) - (1-a) | linear >= b

  // Default to Srgb
  float a = 1.055;
  float b = 0.04045 / 12.92;
  float g = 2.4;
  float k = 12.92;

  auto Members() const { return std::tie(a, b, g, k); }
  MOZ_MIXIN_DERIVE_CMP_OPS_BY_MEMBERS(PiecewiseGammaDesc)

  static constexpr auto Srgb() { return PiecewiseGammaDesc(); }
  static constexpr auto DisplayP3() { return Srgb(); }

  static constexpr auto Rec709() {
    return PiecewiseGammaDesc{
        .a = 1.099,
        .b = 0.018,
        .g = 1.0 / 0.45,  // ~2.222
        .k = 4.5,
    };
  }
  // FYI: static constexpr auto Rec2020_10bit() { return Rec709(); }
  static constexpr auto Rec2020_12bit() {
    return PiecewiseGammaDesc{
        .a = 1.0993,
        .b = 0.0181,
        .g = 1.0 / 0.45,  // ~2.222
        .k = 4.5,
    };
  }
};

struct YcbcrDesc final {
  float y0 = 16 / 255.0;
  float y1 = 235 / 255.0;
  float u0 = 128 / 255.0;
  float uPlusHalf = 240 / 255.0;

  auto Members() const { return std::tie(y0, y1, u0, uPlusHalf); }
  MOZ_MIXIN_DERIVE_CMP_OPS_BY_MEMBERS(YcbcrDesc)

  static constexpr auto Narrow8() {  // AKA limited/studio/tv
    return YcbcrDesc();
  }
  static constexpr auto Full8() {  // AKA pc
    return YcbcrDesc{
        .y0 = 0 / 255.0,
        .y1 = 255 / 255.0,
        .u0 = 128 / 255.0,
        .uPlusHalf = 254 / 255.0,
    };
  }
  static constexpr auto Float() {  // Best for a LUT
    return YcbcrDesc{.y0 = 0.0, .y1 = 1.0, .u0 = 0.5, .uPlusHalf = 1.0};
  }
};

struct Chromaticities final {
  float rx = 0.640;
  float ry = 0.330;
  float gx = 0.300;
  float gy = 0.600;
  float bx = 0.150;
  float by = 0.060;
  // D65:
  static constexpr float wx = 0.3127;
  static constexpr float wy = 0.3290;

  auto Members() const { return std::tie(rx, ry, gx, gy, bx, by); }
  MOZ_MIXIN_DERIVE_CMP_OPS_BY_MEMBERS(Chromaticities)

  // -

  static constexpr auto Rec709() {  // AKA limited/studio/tv
    return Chromaticities();
  }
  static constexpr auto Srgb() { return Rec709(); }

  static constexpr auto Rec601_625_Pal() {
    auto ret = Rec709();
    ret.gx = 0.290;
    return ret;
  }
  static constexpr auto Rec601_525_Ntsc() {
    return Chromaticities{
        .rx = 0.630,
        .ry = 0.340,  // r
        .gx = 0.310,
        .gy = 0.595,  // g
        .bx = 0.155,
        .by = 0.070,  // b
    };
  }
  static constexpr auto Rec2020() {
    return Chromaticities{
        .rx = 0.708,
        .ry = 0.292,  // r
        .gx = 0.170,
        .gy = 0.797,  // g
        .bx = 0.131,
        .by = 0.046,  // b
    };
  }
  static constexpr auto DisplayP3() {
    return Chromaticities{
        .rx = 0.680,
        .ry = 0.320,  // r
        .gx = 0.265,
        .gy = 0.690,  // g
        .bx = 0.150,
        .by = 0.060,  // b
    };
  }
};

// -

struct YuvDesc final {
  YuvLumaCoeffs yCoeffs;
  YcbcrDesc ycbcr;

  auto Members() const { return std::tie(yCoeffs, ycbcr); }
  MOZ_MIXIN_DERIVE_CMP_OPS_BY_MEMBERS(YuvDesc)
};

struct ColorspaceDesc final {
  Chromaticities chrom;
  std::optional<PiecewiseGammaDesc> tf;
  std::optional<YuvDesc> yuv;

  auto Members() const { return std::tie(chrom, tf, yuv); }
  MOZ_MIXIN_DERIVE_CMP_OPS_BY_MEMBERS(ColorspaceDesc)
};

// -

}  // namespace mozilla::color

#define _(X)  \
  template <> \
  struct std::hash<X> : mozilla::StdHashMembers<X> {};

_(mozilla::color::YuvLumaCoeffs)
_(mozilla::color::PiecewiseGammaDesc)
_(mozilla::color::YcbcrDesc)
_(mozilla::color::Chromaticities)
_(mozilla::color::YuvDesc)
_(mozilla::color::ColorspaceDesc)

#undef _

namespace mozilla::color {

// -

template <class TT, int NN>
struct avec final {
  using T = TT;
  static constexpr auto N = NN;

  std::array<T, N> data = {};

  // -

  constexpr avec() = default;
  constexpr avec(const avec&) = default;

  constexpr avec(const avec<T, N - 1>& v, T a) {
    for (int i = 0; i < N - 1; i++) {
      data[i] = v[i];
    }
    data[N - 1] = a;
  }
  constexpr avec(const avec<T, N - 2>& v, T a, T b) {
    for (int i = 0; i < N - 2; i++) {
      data[i] = v[i];
    }
    data[N - 2] = a;
    data[N - 1] = b;
  }

  MOZ_IMPLICIT constexpr avec(const std::array<T, N>& data) {
    this->data = data;
  }

  explicit constexpr avec(const T v) {
    for (int i = 0; i < N; i++) {
      data[i] = v;
    }
  }

  template <class T2, int N2>
  explicit constexpr avec(const avec<T2, N2>& v) {
    const auto n = std::min(N, N2);
    for (int i = 0; i < n; i++) {
      data[i] = static_cast<T>(v[i]);
    }
  }

  // -

  const auto& operator[](const size_t n) const { return data[n]; }
  auto& operator[](const size_t n) { return data[n]; }

  template <int i>
  constexpr auto get() const {
    return (i < N) ? data[i] : 0;
  }
  constexpr auto x() const { return get<0>(); }
  constexpr auto y() const { return get<1>(); }
  constexpr auto z() const { return get<2>(); }
  constexpr auto w() const { return get<3>(); }

  constexpr auto xyz() const { return vec3({x(), y(), z()}); }

  template <int i>
  void set(const T v) {
    if (i < N) {
      data[i] = v;
    }
  }
  void x(const T v) { set<0>(v); }
  void y(const T v) { set<1>(v); }
  void z(const T v) { set<2>(v); }
  void w(const T v) { set<3>(v); }

  // -

#define _(OP)                                           \
  friend avec operator OP(const avec a, const avec b) { \
    avec c;                                             \
    for (int i = 0; i < N; i++) {                       \
      c[i] = a[i] OP b[i];                              \
    }                                                   \
    return c;                                           \
  }                                                     \
  friend avec operator OP(const avec a, const T b) {    \
    avec c;                                             \
    for (int i = 0; i < N; i++) {                       \
      c[i] = a[i] OP b;                                 \
    }                                                   \
    return c;                                           \
  }                                                     \
  friend avec operator OP(const T a, const avec b) {    \
    avec c;                                             \
    for (int i = 0; i < N; i++) {                       \
      c[i] = a OP b[i];                                 \
    }                                                   \
    return c;                                           \
  }
  _(+)
  _(-)
  _(*)
  _(/)
#undef _

  friend bool operator==(const avec a, const avec b) {
    bool eq = true;
    for (int i = 0; i < N; i++) {
      eq &= (a[i] == b[i]);
    }
    return eq;
  }
};
using vec2 = avec<float, 2>;
using vec3 = avec<float, 3>;
using vec4 = avec<float, 4>;
using ivec3 = avec<int32_t, 3>;
using ivec4 = avec<int32_t, 4>;

template <class T, int N>
T dot(const avec<T, N>& a, const avec<T, N>& b) {
  const auto c = a * b;
  T ret = 0;
  for (int i = 0; i < N; i++) {
    ret += c[i];
  }
  return ret;
}

template <class V>
V mix(const V& zero, const V& one, const float val) {
  return zero * (1 - val) + one * val;
}

template <class T, int N>
auto min(const avec<T, N>& a, const avec<T, N>& b) {
  auto ret = avec<T, N>{};
  for (int i = 0; i < ret.N; i++) {
    ret[i] = std::min(a[i], b[i]);
  }
  return ret;
}

template <class T, int N>
auto max(const avec<T, N>& a, const avec<T, N>& b) {
  auto ret = avec<T, N>{};
  for (int i = 0; i < ret.N; i++) {
    ret[i] = std::max(a[i], b[i]);
  }
  return ret;
}

template <class T, int N>
auto clamp(const avec<T, N>& v, const avec<T, N>& lo, const avec<T, N>& hi) {
  return max(lo, min(v, hi));
}

template <class T, int N>
auto floor(const avec<T, N>& a) {
  auto ret = avec<T, N>{};
  for (int i = 0; i < ret.N; i++) {
    ret[i] = floorf(a[i]);
  }
  return ret;
}

template <class T, int N>
auto round(const avec<T, N>& a) {
  auto ret = avec<T, N>{};
  for (int i = 0; i < ret.N; i++) {
    ret[i] = roundf(a[i]);
  }
  return ret;
}

template <class T, int N>
auto abs(const avec<T, N>& a) {
  auto ret = avec<T, N>{};
  for (int i = 0; i < ret.N; i++) {
    ret[i] = std::abs(a[i]);
  }
  return ret;
}

// -

template <int Y_Rows, int X_Cols>
struct mat final {
  static constexpr int y_rows = Y_Rows;
  static constexpr int x_cols = X_Cols;

  static constexpr auto Identity() {
    auto ret = mat{};
    for (int i = 0; i < std::min(x_cols, y_rows); i++) {
      ret.at(i, i) = 1;
    }
    return ret;
  }
  static constexpr auto Scale(const avec<float, std::min(x_cols, y_rows)>& v) {
    auto ret = mat{};
    for (int i = 0; i < v.N; i++) {
      ret.at(i, i) = v[i];
    }
    return ret;
  }

  std::array<avec<float, X_Cols>, Y_Rows> rows = {};  // row-major

  // -

  constexpr mat() = default;

  explicit constexpr mat(const std::array<avec<float, X_Cols>, Y_Rows>& rows) {
    this->rows = rows;
  }

  template <int Y_Rows2, int X_Cols2>
  explicit constexpr mat(const mat<Y_Rows2, X_Cols2>& m) {
    *this = Identity();
    for (int x = 0; x < std::min(X_Cols, X_Cols2); x++) {
      for (int y = 0; y < std::min(Y_Rows, Y_Rows2); y++) {
        at(x, y) = m.at(x, y);
      }
    }
  }

  constexpr bool operator==(const mat& rhs) const {
    return this->rows == rhs.rows;
  }
  constexpr bool operator!=(const mat& rhs) const { return !(*this == rhs); }

  const auto& at(const int x, const int y) const { return rows.at(y)[x]; }
  auto& at(const int x, const int y) { return rows.at(y)[x]; }

  friend auto operator*(const mat& a, const avec<float, X_Cols>& b_colvec) {
    avec<float, Y_Rows> c_colvec;
    for (int i = 0; i < y_rows; i++) {
      c_colvec[i] = dot(a.rows.at(i), b_colvec);
    }
    return c_colvec;
  }

  friend auto operator*(const mat& a, const float b) {
    mat c;
    for (int x = 0; x < x_cols; x++) {
      for (int y = 0; y < y_rows; y++) {
        c.at(x, y) = a.at(x, y) * b;
      }
    }
    return c;
  }
  friend auto operator/(const mat& a, const float b) { return a * (1 / b); }

  template <int BCols, int BRows = X_Cols>
  friend auto operator*(const mat& a, const mat<BRows, BCols>& b) {
    const auto bt = transpose(b);
    const auto& b_cols = bt.rows;

    mat<Y_Rows, BCols> c;
    for (int x = 0; x < BCols; x++) {
      for (int y = 0; y < Y_Rows; y++) {
        c.at(x, y) = dot(a.rows.at(y), b_cols.at(x));
      }
    }
    return c;
  }

  // For e.g. similarity evaluation
  friend auto operator-(const mat& a, const mat& b) {
    mat c;
    for (int y = 0; y < y_rows; y++) {
      c.rows[y] = a.rows[y] - b.rows[y];
    }
    return c;
  }
};

template <class M>
inline float dotDifference(const M& a, const M& b) {
  const auto c = a - b;
  const auto d = c * avec<float, M::x_cols>(1);
  const auto d2 = dot(d, d);
  return d2;
}
template <class M>
inline bool approx(const M& a, const M& b, const float eps = 0.0001) {
  const auto errSquared = dotDifference(a, b);
  return errSquared <= (eps * eps);
}

using mat3 = mat<3, 3>;
using mat4 = mat<4, 4>;

inline float determinant(const mat<1, 1>& m) { return m.at(0, 0); }
template <class T>
float determinant(const T& m) {
  static_assert(T::x_cols == T::y_rows);

  float ret = 0;
  for (int i = 0; i < T::x_cols; i++) {
    const auto cofact = cofactor(m, i, 0);
    ret += m.at(i, 0) * cofact;
  }
  return ret;
}

// -

template <class T>
float cofactor(const T& m, const int x_col, const int y_row) {
  ASSERT(0 <= x_col && x_col < T::x_cols);
  ASSERT(0 <= y_row && y_row < T::y_rows);

  auto cofactor = minor_val(m, x_col, y_row);
  if ((x_col + y_row) % 2 == 1) {
    cofactor *= -1;
  }
  return cofactor;
}

// -

// Unfortunately, can't call this `minor(...)` because there is
// `#define minor(dev) gnu_dev_minor (dev)`
// in /usr/include/x86_64-linux-gnu/sys/sysmacros.h:62
template <class T>
float minor_val(const T& a, const int skip_x, const int skip_y) {
  ASSERT(0 <= skip_x && skip_x < T::x_cols);
  ASSERT(0 <= skip_y && skip_y < T::y_rows);

  // A minor matrix is a matrix without its x_col and y_row.
  mat<T::y_rows - 1, T::x_cols - 1> b;

  int x_skips = 0;
  for (int ax = 0; ax < T::x_cols; ax++) {
    if (ax == skip_x) {
      x_skips = 1;
      continue;
    }

    int y_skips = 0;
    for (int ay = 0; ay < T::y_rows; ay++) {
      if (ay == skip_y) {
        y_skips = 1;
        continue;
      }

      b.at(ax - x_skips, ay - y_skips) = a.at(ax, ay);
    }
  }

  const auto minor = determinant(b);
  return minor;
}

// -

/// The matrix of cofactors.
template <class T>
auto comatrix(const T& a) {
  auto b = T{};
  for (int x = 0; x < T::x_cols; x++) {
    for (int y = 0; y < T::y_rows; y++) {
      b.at(x, y) = cofactor(a, x, y);
    }
  }
  return b;
}

// -

template <class T>
auto transpose(const T& a) {
  auto b = mat<T::x_cols, T::y_rows>{};
  for (int x = 0; x < T::x_cols; x++) {
    for (int y = 0; y < T::y_rows; y++) {
      b.at(y, x) = a.at(x, y);
    }
  }
  return b;
}

// -

template <class T>
inline T inverse(const T& a) {
  const auto det = determinant(a);
  const auto comat = comatrix(a);
  const auto adjugate = transpose(comat);
  const auto inv = adjugate / det;
  return inv;
}

// -

template <class F>
void ForEachIntWithin(const ivec3 size, const F& f) {
  ivec3 p;
  for (p.z(0); p.z() < size.z(); p.z(p.z() + 1)) {
    for (p.y(0); p.y() < size.y(); p.y(p.y() + 1)) {
      for (p.x(0); p.x() < size.x(); p.x(p.x() + 1)) {
        f(p);
      }
    }
  }
}
template <class F>
void ForEachSampleWithin(const ivec3 size, const F& f) {
  const auto div = vec3(size - 1);
  ForEachIntWithin(size, [&](const ivec3& isrc) {
    const auto fsrc = vec3(isrc) / div;
    f(fsrc);
  });
}

// -

struct Lut3 final {
  ivec3 size;
  std::vector<vec3> data;

  // -

  static Lut3 Create(const ivec3 size) {
    Lut3 lut;
    lut.size = size;
    lut.data.resize(size.x() * size.y() * size.z());
    return lut;
  }

  // -

  /// p: [0, N-1] (clamps)
  size_t Index(ivec3 p) const {
    const auto scales = ivec3({1, size.x(), size.x() * size.y()});
    p = max(ivec3(0), min(p, size - 1));  // clamp
    return dot(p, scales);
  }

  // -

  template <class F>
  void SetMap(const F& dstFromSrc01) {
    ForEachIntWithin(size, [&](const ivec3 p) {
      const auto i = Index(p);
      const auto src01 = vec3(p) / vec3(size - 1);
      const auto dstVal = dstFromSrc01(src01);
      data.at(i) = dstVal;
    });
  }

  // -

  /// p: [0, N-1] (clamps)
  vec3 Fetch(ivec3 p) const {
    const auto i = Index(p);
    return data.at(i);
  }

  /// in01: [0.0, 1.0] (clamps)
  vec3 Sample(vec3 in01) const;
};

// -

/**
Naively, it would be ideal to map directly from ycbcr to rgb,
but headroom and footroom are problematic: For e.g. narrow-range-8-bit,
our naive LUT would start at absolute y=0/255. However, values only start
at y=16/255, and depending on where your first LUT sample is, you might get
very poor approximations for y=16/255.
Further, even for full-range-8-bit, y=-0.5 is encoded as 1/255. U and v
aren't *as* important as y, but we should try be accurate for the min and
max values. Additionally, it would be embarassing to get whites/greys wrong,
so preserving u=0.0 should also be a goal.
Finally, when using non-linear transfer functions, the linear approximation of a
point between two samples will be fairly inaccurate.
We preserve min and max by choosing our input range such that min and max are
the endpoints of their LUT axis.
We preserve accuracy (at and around) mid by choosing odd sizes for dimentions.

But also, the LUT is surprisingly robust, so check if the simple version works
before adding complexity!
**/

struct ColorspaceTransform final {
  ColorspaceDesc srcSpace;
  ColorspaceDesc dstSpace;
  mat4 srcRgbTfFromSrc;
  std::optional<PiecewiseGammaDesc> srcTf;
  mat3 dstRgbLinFromSrcRgbLin;
  std::optional<PiecewiseGammaDesc> dstTf;
  mat4 dstFromDstRgbTf;

  static ColorspaceTransform Create(const ColorspaceDesc& src,
                                    const ColorspaceDesc& dst);

  // -

  vec3 DstFromSrc(vec3 src) const;

  std::optional<mat4> ToMat4() const;

  Lut3 ToLut3(const ivec3 size) const;
  Lut3 ToLut3() const {
    auto defaultSize = ivec3({31, 31, 15});  // Order of importance: G, R, B
    if (srcSpace.yuv) {
      defaultSize = ivec3({31, 15, 31});  // Y, Cb, Cr
    }
    return ToLut3(defaultSize);
  }
};

// -

struct RgbTransferTables {
  std::vector<float> r;
  std::vector<float> g;
  std::vector<float> b;
};
float GuessGamma(const std::vector<float>& vals, float exp_guess = 1.0);

static constexpr auto D65 = vec2{{0.3127, 0.3290}};
static constexpr auto D50 = vec2{{0.34567, 0.35850}};
mat3 XyzAFromXyzB_BradfordLinear(const vec2 xyA, const vec2 xyB);

// -

struct ColorProfileDesc {
  // ICC profiles are phrased as PCS-from-encoded (PCS is CIEXYZ-D50)
  // However, all of our colorspaces are D65, so let's normalize to that,
  // even though it's a reversible transform.
  color::mat4 rgbFromYcbcr = color::mat4::Identity();
  RgbTransferTables linearFromTf;
  color::mat3 xyzd65FromLinearRgb = color::mat3::Identity();

  static ColorProfileDesc From(const ColorspaceDesc&);
  static ColorProfileDesc From(const qcms_profile&);
};

template <class C>
inline float SampleOutByIn(const C& outByIn, const float in) {
  switch (outByIn.size()) {
    case 0:
      return in;
    case 1:
      return outByIn.at(0);
  }
  MOZ_ASSERT(outByIn.size() >= 2);

  // Estimate based on nearest (first) derivative:
  // Find the nearest point to `in` in `outByIn`.
  const auto inId = in * (outByIn.size() - 1);
  const auto inId0F = std::clamp(floorf(inId), 0.f, float(outByIn.size() - 2));
  const auto inId0 = size_t(inId0F);
  const auto out0 = outByIn.at(inId0 + 0);
  const auto out1 = outByIn.at(inId0 + 1);
  const auto d_inId0 = float(1);
  const auto d_out0 = out1 - out0;
  const auto d_inId = inId - inId0;

  const auto out = out0 + (d_out0 / d_inId0) * d_inId;
  // printf("SampleOutByIn(%f)->%f\n", in, out);
  return out;
}

template <class C>
inline float SampleInByOut(const C& outByIn, const float out) {
  MOZ_ASSERT(outByIn.size() >= 2);
  const auto begin = outByIn.begin();

  const auto out0_itr = std::lower_bound(begin + 1, outByIn.end() - 1, out) - 1;

  const auto in0 = float(out0_itr - begin) / (outByIn.size() - 1);
  const auto out0 = *out0_itr;
  const auto d_in = float(1) / (outByIn.size() - 1);
  const auto d_out = *(out0_itr + 1) - *out0_itr;

  // printf("%f + (%f / %f) * (%f - %f)\n", in0, d_in, d_out, out, out0);
  const auto in = in0 + (d_in / d_out) * (out - out0);
  // printf("SampleInByOut(%f)->%f\n", out, in);
  return in;
}

template <class C, class FnLessEqualT = std::less_equal<typename C::value_type>>
inline bool IsMonotonic(const C& vals, const FnLessEqualT& LessEqual = {}) {
  bool ok = true;
  const auto begin = vals.begin();
  for (size_t i = 1; i < vals.size(); i++) {
    const auto itr = begin + i;
    ok &= LessEqual(*(itr - 1), *itr);
    // Assert(true, [&]() {
    //     return prints("[%zu]->%f <= [%zu]->%f", i-1, *(itr-1), i, *itr);
    // });
  }
  return ok;
}

template <class T, class I>
inline std::optional<I> SeekNeq(const T& ref, const I first, const I last) {
  const auto inc = (last - first) > 0 ? 1 : -1;
  auto itr = first;
  while (true) {
    if (*itr != ref) return itr;
    if (itr == last) return {};
    itr += inc;
  }
}

template <class T>
struct TwoPoints {
  struct {
    T x;
    T y;
  } p0;
  struct {
    T x;
    T y;
  } p1;

  T y(const T x) const {
    const auto dx = p1.x - p0.x;
    const auto dy = p1.y - p0.y;
    return p0.y + dy / dx * (x - p0.x);
  }
};

/// Fills `vals` with `x:[0..vals.size()-1] => line.y(x)`.
template <class T>
static void LinearFill(T& vals, const TwoPoints<float>& line) {
  float x = -1;
  for (auto& val : vals) {
    x += 1;
    val = line.y(x);
  }
}

// -

inline void DequantizeMonotonic(const Span<float> vals) {
  MOZ_ASSERT(IsMonotonic(vals));

  const auto first = vals.begin();
  const auto end = vals.end();
  if (first == end) return;
  const auto last = end - 1;
  if (first == last) return;

  // Three monotonic cases:
  // 1. [0,0,0,0]
  // 2. [0,0,1,1]
  // 3. [0,1,1,2]

  const auto body_first = SeekNeq(*first, first, last);
  if (!body_first) {
    // E.g. [0,0,0,0]
    return;
  }

  const auto body_last = SeekNeq(*last, last, *body_first);
  if (!body_last) {
    // E.g. [0,0,1,1]
    // This isn't the most accurate, but close enough.
    // print("#2: %s", to_str(vals).c_str());
    LinearFill(vals, {
                         {0, *first},
                         {float(vals.size() - 1), *last},
                     });
    // print(" -> %s\n", to_str(vals).c_str());
    return;
  }

  // E.g. [0,1,1,2]
  //         ^^^ body
  // => f(0.5)->0.5, f(2.5)->1.5
  // => f(x) = f(x0) + (x-x0) * (f(x1) - f(x0)) / (x1-x0)
  // => f(x) = f(x0) + (x-x0) * dfdx

  const auto head_end = *body_first;
  const auto head = vals.subspan(0, head_end - vals.begin());
  const auto tail_begin = *body_last + 1;
  const auto tail = vals.subspan(tail_begin - vals.begin());
  // print("head tail: %s %s\n",
  //     to_str(head).c_str(),
  //     to_str(tail).c_str());

  // const auto body = vals->subspan(head.size(), vals->size()-tail.size());
  auto next_part_first = head_end;
  while (next_part_first != tail_begin) {
    const auto part_first = next_part_first;
    // print("part_first: %f\n", *part_first);
    next_part_first = *SeekNeq(*part_first, part_first, tail_begin);
    // print("next_part_first: %f\n", *next_part_first);
    const auto part =
        Span<float>{part_first, size_t(next_part_first - part_first)};
    // print("part: %s\n", to_str(part).c_str());
    const auto prev_part_last = part_first - 1;
    const auto part_last = next_part_first - 1;
    const auto line = TwoPoints<float>{
        {-0.5, (*prev_part_last + *part_first) / 2},
        {part.size() - 0.5f, (*part_last + *next_part_first) / 2},
    };
    LinearFill(part, line);
  }

  static constexpr bool INFER_HEAD_TAIL_FROM_BODY_EDGE = false;
  // Basically ignore contents of head and tail, and infer from edges of body.
  // print("3: %s\n", to_str(vals).c_str());
  if (!IsMonotonic(head, std::less<float>{})) {
    if (!INFER_HEAD_TAIL_FROM_BODY_EDGE) {
      LinearFill(head,
                 {
                     {0, *head.begin()},
                     {head.size() - 0.5f, (*(head.end() - 1) + *head_end) / 2},
                 });
    } else {
      LinearFill(head, {
                           {head.size() + 0.0f, *head_end},
                           {head.size() + 1.0f, *(head_end + 1)},
                       });
    }
  }
  if (!IsMonotonic(tail, std::less<float>{})) {
    if (!INFER_HEAD_TAIL_FROM_BODY_EDGE) {
      LinearFill(tail, {
                           {-0.5, (*(tail_begin - 1) + *tail.begin()) / 2},
                           {tail.size() - 1.0f, *(tail.end() - 1)},
                       });
    } else {
      LinearFill(tail, {
                           {-2.0f, *(tail_begin - 2)},
                           {-1.0f, *(tail_begin - 1)},
                       });
    }
  }
  // print("3: %s\n", to_str(vals).c_str());
  MOZ_ASSERT(IsMonotonic(vals, std::less<float>{}));

  // Rescale, because we tend to lose range.
  static constexpr bool RESCALE = false;
  if (RESCALE) {
    const auto firstv = *first;
    const auto lastv = *last;
    for (auto& val : vals) {
      val = (val - firstv) / (lastv - firstv);
    }
  }
  // print("4: %s\n", to_str(vals).c_str());
}

template <class In, class Out>
static void InvertLut(const In& lut, Out* const out_invertedLut) {
  MOZ_ASSERT(IsMonotonic(lut));
  auto plut = &lut;
  auto vec = std::vector<float>{};
  if (!IsMonotonic(lut, std::less<float>{})) {
    // print("Not strictly monotonic...\n");
    vec.assign(lut.begin(), lut.end());
    DequantizeMonotonic(vec);
    plut = &vec;
    // print("  Now strictly monotonic: %i: %s\n",
    //   int(IsMonotonic(*plut, std::less<float>{})), to_str(*plut).c_str());
    MOZ_ASSERT(IsMonotonic(*plut, std::less<float>{}));
  }
  MOZ_ASSERT(plut->size() >= 2);

  auto& ret = *out_invertedLut;
  for (size_t i_out = 0; i_out < ret.size(); i_out++) {
    const auto f_out = i_out / float(ret.size() - 1);
    const auto f_in = SampleInByOut(*plut, f_out);
    ret[i_out] = f_in;
  }

  MOZ_ASSERT(IsMonotonic(ret));
  MOZ_ASSERT(IsMonotonic(ret, std::less<float>{}));
}

// -

struct ColorProfileConversionDesc {
  // ICC profiles are phrased as PCS-from-encoded (PCS is CIEXYZ-D50)
  color::mat4 srcRgbFromSrcYuv = color::mat4::Identity();
  RgbTransferTables srcLinearFromSrcTf;
  color::mat3 dstLinearFromSrcLinear = color::mat3::Identity();
  RgbTransferTables dstTfFromDstLinear;

  struct FromDesc {
    ColorProfileDesc src;
    ColorProfileDesc dst;
  };
  static ColorProfileConversionDesc From(const FromDesc&);

  vec3 DstFromSrc(const vec3 src) const {
    const auto srcRgb = vec3(srcRgbFromSrcYuv * vec4(src, 1));
    const auto srcLinear = vec3{{
        SampleOutByIn(srcLinearFromSrcTf.r, srcRgb.x()),
        SampleOutByIn(srcLinearFromSrcTf.g, srcRgb.y()),
        SampleOutByIn(srcLinearFromSrcTf.b, srcRgb.z()),
    }};
    const auto dstLinear = dstLinearFromSrcLinear * srcLinear;
    const auto dstRgb = vec3{{
        SampleOutByIn(dstTfFromDstLinear.r, dstLinear.x()),
        SampleOutByIn(dstTfFromDstLinear.g, dstLinear.y()),
        SampleOutByIn(dstTfFromDstLinear.b, dstLinear.z()),
    }};
    return dstRgb;
  }
};

}  // namespace mozilla::color

#undef ASSERT

#endif  // MOZILLA_GFX_GL_COLORSPACES_H_
