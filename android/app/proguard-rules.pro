# ═══════════════════════════════════════════════════════════════
# ProGuard / R8 rules for StartupsFriend Expense Tracker
# ═══════════════════════════════════════════════════════════════

# ── Global ─────────────────────────────────────────────────────
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# ── SoLoader (loads all .so native libs — MUST be kept) ───────
-keep class com.facebook.soloader.** { *; }
-dontwarn com.facebook.soloader.**

# ── Hermes JS Engine ──────────────────────────────────────────
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.hermes.intl.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.hermes.**

# ── React Native Core ─────────────────────────────────────────
# Bridge & modules (loaded dynamically via reflection)
-keep class com.facebook.react.** { *; }
-keep class * implements com.facebook.react.bridge.NativeModule { *; }
-keep class * implements com.facebook.react.bridge.JavaScriptModule { *; }
-keep class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }
-keepclassmembers,includedescriptorclasses class * { native <methods>; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>; }

# TurboModules (New Architecture — required for RN 0.84+)
-keep,includedescriptorclasses class com.facebook.react.bridge.** { *; }
-keep,includedescriptorclasses class com.facebook.react.turbomodule.core.** { *; }
-keep,includedescriptorclasses class com.facebook.react.internal.turbomodule.core.** { *; }
-keep class com.facebook.react.defaults.** { *; }

# DoNotStrip annotations
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * { @com.facebook.proguard.annotations.DoNotStrip *; }
-keep @com.facebook.proguard.annotations.DoNotStripAny class * { *; }
-keep @com.facebook.jni.annotations.DoNotStrip class *
-keepclassmembers class * { @com.facebook.jni.annotations.DoNotStrip *; }
-keep @com.facebook.jni.annotations.DoNotStripAny class * { *; }

# Yoga layout engine
-keep,allowobfuscation @interface com.facebook.yoga.annotations.DoNotStrip
-keep @com.facebook.yoga.annotations.DoNotStrip class *
-keepclassmembers class * { @com.facebook.yoga.annotations.DoNotStrip *; }

# Fresco image library
-keep public class com.facebook.imageutils.** { public *; }

-dontwarn com.facebook.react.**

# ── Notifee (Notifications) ───────────────────────────────────
-keep class io.invertase.notifee.** { *; }
-keep class app.notifee.core.** { *; }
-keepclassmembers class * extends androidx.work.ListenableWorker {
    public <init>(android.content.Context,androidx.work.WorkerParameters);
}
# EventBus used by Notifee
-keepclassmembers class * { @org.greenrobot.eventbus.Subscribe <methods>; }
-keep enum org.greenrobot.eventbus.ThreadMode { *; }
-keepclassmembers class * extends org.greenrobot.eventbus.util.ThrowableFailureEvent {
    <init>(java.lang.Throwable);
}

# ── Async Storage ─────────────────────────────────────────────
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ── React Navigation (react-native-screens, safe-area) ───────
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }

# ── React Native SVG ──────────────────────────────────────────
-keep class com.horcrux.svg.** { *; }

# ── OkHttp / Okio ────────────────────────────────────────────
-dontwarn okio.**
-dontwarn okhttp3.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase
-keep class sun.misc.Unsafe { *; }
-dontwarn java.nio.file.*
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement

# ── Kotlin ────────────────────────────────────────────────────
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
-keepclassmembers class **$WhenMappings { <fields>; }

# ── AndroidX ──────────────────────────────────────────────────
-keep @interface androidx.annotation.Keep
-keep @androidx.annotation.Keep class *
-keepclasseswithmembers class * { @androidx.annotation.Keep <fields>; }
-keepclasseswithmembers class * { @androidx.annotation.Keep <methods>; }

# ── Enums ─────────────────────────────────────────────────────
-keepclassmembers class * extends java.lang.Enum {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ── Serializable ──────────────────────────────────────────────
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}
