/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include <android/log.h>
#include <cstddef>
#include <cstdint>
#include <jni.h>
#include <optional>

#define LOG(level, message, ...)                                        \
  __android_log_print(ANDROID_LOG_##level, "NativeCrashTools", message, \
                      __VA_ARGS__)

namespace {

// The base of a utf16-encoded string, used for Java string interop.
struct Utf16String {
  const uint16_t* chars;
  size_t len;
};

// The upload function signature used in crashtools_crashping_init.
// This corresponds to the `UploadFn` type in `export/lib.rs`.
typedef int32_t (*crashtools_upload_fn)(const Utf16String& url,
                                        const uint8_t* body, size_t body_len,
                                        const Utf16String (*headers)[2],
                                        size_t headers_len);

// External symbols from `./export/lib.rs`
extern "C" {
void crashtools_init(void);
int32_t crashtools_upload_exception(bool non_fatal, const Utf16String& message);
extern const int32_t CRASHTOOLS_UPLOAD_FATAL_ERROR;
Utf16String crashtools_crashping_init(const Utf16String& data_dir,
                                      const Utf16String& app_id,
                                      const Utf16String* build_id,
                                      const Utf16String* display_version,
                                      crashtools_upload_fn upload_fn);
Utf16String crashtools_analyze_minidump(const Utf16String& minidump_path,
                                        const Utf16String& extras_path,
                                        bool all_threads);
void crashtools_free_string(Utf16String result);

void crashtools_send_ping(const Utf16String& extras);
void crashtools_test_metric_values_before_next_send(
    void (*cb)(void* obj, const Utf16String& json), void (*drop)(void* obj),
    void* obj);
}

// Create a Java string from a utf16-encoded string.
jstring createJString(JNIEnv* env, const Utf16String& s) {
  return env->NewString(s.chars, s.len);
}

// A utf16-encoded string local to Java.
struct LocalString : Utf16String {
  LocalString(JNIEnv* env, jstring str) : env(env), str(str) {
    chars = env->GetStringChars(str, nullptr);
    len = env->GetStringLength(str);
  }

  ~LocalString() { env->ReleaseStringChars(str, chars); }

  LocalString(const LocalString&) = delete;
  LocalString& operator=(const LocalString&) = delete;

  JNIEnv* env;
  jstring str;
};

// A utf16-encoded string from Rust ("foreign" to Java), taking ownership of
// the data.
struct ForeignString : Utf16String {
  explicit ForeignString(Utf16String s) : Utf16String(s) {}
  ~ForeignString() { crashtools_free_string(*this); }

  ForeignString(const ForeignString&) = delete;
  ForeignString& operator=(const ForeignString&) = delete;

  explicit operator bool() const { return chars != nullptr; }

  jstring to_jstring(JNIEnv* env) const { return createJString(env, *this); }
};

JavaVM* jvm;
jclass nativeCrashToolsClass;

// Create a JNIEnv local to the current thread, attaching the JVM if necessary.
//
// When destructed, the JVM will be detached if it wasn't originally attached.
class LocalJNIEnv {
  JNIEnv* env;
  bool detached;

 public:
  LocalJNIEnv() {
    auto status = jvm->GetEnv((void**)&env, JNI_VERSION_1_6);
    detached = status == JNI_EDETACHED;
    if (detached) {
      status = jvm->AttachCurrentThread(&env, NULL);
    }
    if (status != JNI_OK) {
      LOG(FATAL, "failed to get JNI env: error code %d", status);
    }
  }

  ~LocalJNIEnv() {
    if (detached) {
      // Check for an exception and log it.
      if (env != nullptr) {
        jthrowable exc = env->ExceptionOccurred();
        env->ExceptionClear();

        if (exc != nullptr) {
#define LOG_PENDING_EXCEPTION(message) \
  LOG(FATAL, "pending exception in thread: %s", message)
          auto excClass = env->GetObjectClass(exc);
          auto toStringMethodID =
              env->GetMethodID(excClass, "toString", "()Ljava/lang/String;");

          if (toStringMethodID == nullptr) {
            LOG_PENDING_EXCEPTION(
                "(failed to get toString() method for exception)");
            env->ExceptionClear();
          } else {
            jstring excString =
                (jstring)env->CallObjectMethod(exc, toStringMethodID);
            if (excString != nullptr) {
              auto excChars = env->GetStringUTFChars(excString, nullptr);
              if (excChars != nullptr) {
                // We are optimistic that the string doesn't contain the edge
                // cases of the Java modified utf8, however if it does we'll
                // just end up with some garbled output.
                LOG_PENDING_EXCEPTION(excChars);
                env->ReleaseStringUTFChars(excString, excChars);
              } else {
                LOG_PENDING_EXCEPTION(
                    "(failed to get exception string characters)");
              }
            } else {
              LOG_PENDING_EXCEPTION("(exception toString() returned null)");
            }
          }
#undef LOG_PENDING_EXCEPTION
        }
      }
      jvm->DetachCurrentThread();
    }
  }

  JNIEnv* operator->() const { return env; }

  operator JNIEnv*() const { return env; }

  explicit operator bool() const { return env != nullptr; }
};

void throw_java_exception(JNIEnv* env, const char* class_name,
                          const char* message) {
  __android_log_print(ANDROID_LOG_DEBUG, "NativeCrashTools",
                      "throwing Java exception %s: %s", class_name, message);
  auto clazz = env->FindClass(class_name);
  if (clazz == nullptr) {
    return;
  }
  if (env->ThrowNew(clazz, message) != 0) {
    __android_log_print(
        ANDROID_LOG_FATAL, "NativeCrashTools",
        "failed to throw Java exception with class %s and message %s",
        class_name, message);
  }
}

#define THROW_JAVA(class_name, message)             \
  do {                                              \
    throw_java_exception(env, class_name, message); \
    return;                                         \
  } while (false)

// The upload function called from the Rust code. This will call the static
// NativeCrashTools.postRequest() method.
//
// This returns the HTTP status code from sending the ping, or forwards the
// crashtools_upload_exception return value.
int32_t upload_fn(const Utf16String& url, const uint8_t* body, size_t body_len,
                  const Utf16String (*headers)[2], size_t headers_len) {
#define UPLOAD_ASSERT(val)                            \
  do {                                                \
    if (!(val)) return CRASHTOOLS_UPLOAD_FATAL_ERROR; \
  } while (false)
  LocalJNIEnv env;
  UPLOAD_ASSERT(env);

  // Create Java values to pass to the static Java method.
  auto urlStr = createJString(env, url);
  UPLOAD_ASSERT(urlStr);

  auto bodyArr = env->NewByteArray(body_len);
  // For some reason the JNI docs don't indicate that `NewByteArray` will throw
  // an `OutOfMemoryError` on failure (like many other allocating functions
  // do), however it undoubtedly does (and e.g. openJDK source code shows it
  // does).
  UPLOAD_ASSERT(bodyArr);
  env->SetByteArrayRegion(bodyArr, 0, body_len, (const jbyte*)body);
  // We don't need to check for `SetByteArrayRegion` throwing an exception, we
  // are guaranteed to be in the region.

  // Create a LinkedHashMap for the headers.
  auto mapClass = env->FindClass("java/util/LinkedHashMap");
  UPLOAD_ASSERT(mapClass);
  auto classConstructorID = env->GetMethodID(mapClass, "<init>", "(I)V");
  UPLOAD_ASSERT(classConstructorID);
  auto headersMap = env->NewObject(mapClass, classConstructorID, headers_len);
  UPLOAD_ASSERT(headersMap);
  auto mapPutMethodID = env->GetMethodID(
      mapClass, "put",
      "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;");
  UPLOAD_ASSERT(mapPutMethodID);

  for (size_t i = 0; i < headers_len; i++) {
    auto key = createJString(env, headers[i][0]);
    UPLOAD_ASSERT(key);
    auto value = createJString(env, headers[i][1]);
    UPLOAD_ASSERT(value);
    env->CallObjectMethod(headersMap, mapPutMethodID, key, value);
    UPLOAD_ASSERT(!env->ExceptionCheck());
  }

  // Call the static postRequest method.
  auto postRequestMethodID =
      env->GetStaticMethodID(nativeCrashToolsClass, "postRequest",
                             "(Ljava/lang/String;[BLjava/util/Map;)I");
  UPLOAD_ASSERT(postRequestMethodID);
  jint ret = env->CallStaticIntMethod(
      nativeCrashToolsClass, postRequestMethodID, urlStr, bodyArr, headersMap);

  // If any exception occurred in the called method, catch it and change the
  // return value appropriately.
  {
    jthrowable exc = env->ExceptionOccurred();
    env->ExceptionClear();

    if (exc != nullptr) {
      auto isNonFatal = false;

      // Assume IOExceptions are some sort of network error that may not be
      // permanent.
      {
        auto ioExceptionClass = env->FindClass("java/io/IOException");
        // Clear exception in case FindClass fails.
        env->ExceptionClear();
        isNonFatal =
            ioExceptionClass && env->IsInstanceOf(exc, ioExceptionClass);
      }

      // Pass the exception message to the handler.
      auto excClass = env->GetObjectClass(exc);
      auto toStringMethodID =
          env->GetMethodID(excClass, "toString", "()Ljava/lang/String;");
      UPLOAD_ASSERT(toStringMethodID);
      jstring excString = (jstring)env->CallObjectMethod(exc, toStringMethodID);
      UPLOAD_ASSERT(!env->ExceptionCheck());

      LocalString excLocalString(env, excString);
      return crashtools_upload_exception(isNonFatal, excLocalString);
    }
  }

  return ret;
#undef UPLOAD_ASSERT
}

#define KOTLIN_CLOSURE_CLASS "kotlin/jvm/functions/Function1"

// Call a Kotlin closure with the given String argument.
void call_closure(void* obj, const Utf16String& value) {
  LocalJNIEnv env;
  if (!env) return;
  auto kotlinFunction1Class = env->FindClass(KOTLIN_CLOSURE_CLASS);
  // We require the callback to be a kotlin closure when we store it, so no
  // need to check the result of `FindClass` nor check with `IsInstanceOf`.
  auto invokeMethod = env->GetMethodID(
      kotlinFunction1Class, "invoke", "(Ljava/lang/Object;)Ljava/lang/Object;");
  if (!invokeMethod) return;
  auto arg = createJString(env, value);
  if (!arg) return;
  env->CallObjectMethod(static_cast<jobject>(obj), invokeMethod, arg);
}

// Drop a Java callback (the function drops any globally-refed object).
void drop_closure(void* obj) {
  LocalJNIEnv env;
  if (!env) return;
  env->DeleteGlobalRef(static_cast<jobject>(obj));
}

}  // namespace

extern "C" {
// Static init when the library is first loaded. We store the jvm to be able to
// attach to threads later.
JNIEXPORT jint JNI_OnLoad(JavaVM* vm, void*) {
  crashtools_init();
  jvm = vm;
  return JNI_VERSION_1_6;
}

// The init Java static method which configures the data path and build id.
JNIEXPORT void Java_mozilla_components_lib_crash_NativeCrashTools_nativeInit(
    JNIEnv* env, jclass clazz, jstring data_path, jstring app_id,
    jstring build_id, jstring display_version) {
  LocalString data_str(env, data_path);
  LocalString app_id_str(env, app_id);

  // Store the NativeCrashTools class for use in callbacks.
  nativeCrashToolsClass = (jclass)env->NewGlobalRef(clazz);
  if (nativeCrashToolsClass == nullptr) {
    THROW_JAVA("java/lang/OutOfMemoryError",
               "failed to create a NativeCrashTools global ref");
  }

  std::optional<LocalString> build_id_str;
  if (build_id != nullptr) {
    build_id_str.emplace(env, build_id);
  }

  std::optional<LocalString> display_version_str;
  if (display_version != nullptr) {
    display_version_str.emplace(env, build_id);
  }

  if (auto result = ForeignString(crashtools_crashping_init(
          data_str, app_id_str, build_id_str ? &*build_id_str : nullptr,
          display_version_str ? &*display_version_str : nullptr, upload_fn))) {
    auto result_jstring = result.to_jstring(env);
    const char* utf8Chars = nullptr;
    if (!result_jstring ||
        !(utf8Chars = env->GetStringUTFChars(result_jstring, nullptr))) {
      env->ExceptionClear();
      THROW_JAVA("java/io/IOException",
                 "failed to initialize crashping library (and failed to get "
                 "related error string)");
    }
    throw_java_exception(env, "java/io/IOException", utf8Chars);
    env->ReleaseStringUTFChars(result_jstring, utf8Chars);
    return;
  }
}

JNIEXPORT jstring JNICALL
Java_mozilla_components_lib_crash_NativeCrashTools_nativeAnalyzeMinidump(
    JNIEnv* env, jobject obj, jstring minidump_path, jstring extras_path,
    jboolean all_threads) {
  LocalString minidump_str(env, minidump_path);
  LocalString extras_str(env, extras_path);
  if (auto error = ForeignString(
          crashtools_analyze_minidump(minidump_str, extras_str, all_threads))) {
    return error.to_jstring(env);
  }
  return nullptr;
}

JNIEXPORT void JNICALL
Java_mozilla_components_lib_crash_NativeCrashTools_nativeSendPing(
    JNIEnv* env, jobject obj, jstring extras) {
  LocalString extras_str(env, extras);
  crashtools_send_ping(extras_str);
}

JNIEXPORT void JNICALL
Java_mozilla_components_lib_crash_NativeCrashTools_nativeTestMetricValuesBeforeNextSend(
    JNIEnv* env, jobject obj, jobject cb) {
  // Add a global reference to the callback object. We pass ownership to the
  // Rust code, which will call `drop_closure` when appropriate to release the
  // reference.
  if (cb == nullptr) {
    THROW_JAVA("java/lang/IllegalArgumentException",
               "callback must not be null");
  }
  auto kotlinFunction1Class = env->FindClass(KOTLIN_CLOSURE_CLASS);
  if (!kotlinFunction1Class) return;
  if (!env->IsInstanceOf(cb, kotlinFunction1Class)) {
    THROW_JAVA("java/lang/IllegalArgumentException",
               "callback must be a Kotlin closure taking one argument");
  }

  cb = env->NewGlobalRef(cb);
  if (cb == nullptr) {
    THROW_JAVA("java/lang/OutOfMemoryError",
               "failed to create a global ref of the callback argument");
  }
  crashtools_test_metric_values_before_next_send(call_closure, drop_closure,
                                                 cb);
}
}
