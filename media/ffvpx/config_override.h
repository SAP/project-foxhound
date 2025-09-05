// This file contains overrides for config.h, that can be platform-specific.

#undef CONFIG_FFT
#undef CONFIG_RDFT
#define CONFIG_FFT 1
#define CONFIG_RDFT 1

// override '#define EXTERN_ASM _' in config_generic.h to allow building with
// gcc on arm
#if defined(__GNUC__) && defined(__arm__)
#undef EXTERN_ASM
#define EXTERN_ASM
#endif

/**
 * Linux Hardware Video Decoding
 **/
#undef CONFIG_VAAPI
#undef CONFIG_VAAPI_1
#undef CONFIG_VP8_VAAPI_HWACCEL
#undef CONFIG_VP9_VAAPI_HWACCEL
#undef CONFIG_AV1_VAAPI_HWACCEL

#if defined(MOZ_WIDGET_GTK) && !defined(MOZ_FFVPX_AUDIOONLY)
#define CONFIG_VAAPI 1
#define CONFIG_VAAPI_1 1
#define CONFIG_VP8_VAAPI_HWACCEL 1
#define CONFIG_VP9_VAAPI_HWACCEL 1
#define CONFIG_AV1_VAAPI_HWACCEL 1
#else
#define CONFIG_VAAPI 0
#define CONFIG_VAAPI_1 0
#define CONFIG_VP8_VAAPI_HWACCEL 0
#define CONFIG_VP9_VAAPI_HWACCEL 0
#define CONFIG_AV1_VAAPI_HWACCEL 0
#endif

/**
 * Windows Hardware Video Decoding
 **/
#undef CONFIG_D3D11VA
#undef CONFIG_VP9_D3D11VA_HWACCEL
#undef CONFIG_VP9_D3D11VA2_HWACCEL
#undef CONFIG_AV1_D3D11VA_HWACCEL
#undef CONFIG_AV1_D3D11VA2_HWACCEL

#if defined (XP_WIN) && !defined(MOZ_FFVPX_AUDIOONLY)
  #define CONFIG_D3D11VA 1
  #define CONFIG_VP9_D3D11VA_HWACCEL 1
  #define CONFIG_VP9_D3D11VA2_HWACCEL 1
  #define CONFIG_AV1_D3D11VA_HWACCEL 1
  #define CONFIG_AV1_D3D11VA2_HWACCEL 1
#else
  #define CONFIG_D3D11VA 0
  #define CONFIG_VP9_D3D11VA_HWACCEL 0
  #define CONFIG_VP9_D3D11VA2_HWACCEL 0
  #define CONFIG_AV1_D3D11VA_HWACCEL 0
  #define CONFIG_AV1_D3D11VA2_HWACCEL 0
#endif

/**
 * BSD / Solaris
 **/
#if defined(XP_OPENBSD) || defined(XP_NETBSD) || defined(XP_FREEBSD) || defined(XP_SOLARIS)
  #undef HAVE_GETAUXVAL
  #define HAVE_GETAUXVAL 0
#endif
