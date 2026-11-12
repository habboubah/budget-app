# R8 rules for Spartopf (release builds; minifyEnabled true in build.gradle).
# The point is the mapping file Play uses to de-obfuscate crash and ANR reports,
# so the app's own and the Capacitor code is kept whole: the bridge and the plugins
# are found by reflection and called from JavaScript. Unused library code is still removed.

# Keep line numbers in stack traces; hide the real source file names.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Capacitor bridge and runtime.
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }

# Plugins (registered and called by name from the web layer).
-keep class com.capacitorjs.plugins.** { *; }
-keep class com.aparajita.capacitor.** { *; }

# The app's own native code (MainActivity, SpartopfSharedPlugin).
-keep class com.habboubah.spartopf.** { *; }

# Methods the WebView calls from JavaScript.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Cordova compatibility layer used by Capacitor.
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**
