# ProGuard rules for consumers of this library.

# Mockito's @DoNotMock annotation is used in production code to signal test behavior.
# Since Mockito is a 'compileOnly' dependency, R8 fails to find the class during
# minification. We tell R8 to ignore this missing reference as it is not needed at runtime.
-dontwarn org.mockito.DoNotMock
-keep class org.mockito.DoNotMock
