# R8 fallback rules for optional classes referenced by third-party libraries.
# These lines are derived from AGP-generated missing_rules.txt for release builds.
-dontwarn com.google.ar.sceneform.animation.AnimationEngine
-dontwarn com.google.ar.sceneform.animation.AnimationLibraryLoader
-dontwarn com.google.ar.sceneform.assets.Loader
-dontwarn com.google.ar.sceneform.assets.ModelData
-dontwarn com.google.devtools.build.android.desugar.runtime.ThrowableExtension
-dontwarn org.tensorflow.lite.gpu.GpuDelegateFactory$Options
