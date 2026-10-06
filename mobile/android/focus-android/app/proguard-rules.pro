
# We do not want to obfuscate - It's just painful to debug without the right mapping file.
# If we update this, we'll have to update our Sentry config to upload ProGuard mappings.
-dontobfuscate


##### Default proguard settings:

# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /Users/sebastian/Library/Android/sdk/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

####################################################################################################
# Android architecture components
####################################################################################################

-dontwarn org.mozilla.geckoview.**
-dontwarn mozilla.components.**

####################################################################################################
# Mozilla Application Services
####################################################################################################

-keep class mozilla.appservices.** { *; }

####################################################################################################
# REMOVE all Log messages except warnings and errors
####################################################################################################
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int d(...);
}
