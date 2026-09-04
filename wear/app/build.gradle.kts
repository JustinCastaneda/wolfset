plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "app.wolfset.wear"
    // Wear Compose Material 3 (EdgeButton) builds against Compose 1.9, which wants 35+.
    compileSdk = 36

    defaultConfig {
        // MUST equal the phone app's applicationId (mobile/app.json → android.package): the
        // Wearable Data Layer only routes between watch/phone apps that share the package
        // name AND the signing certificate. See docs/hr-protocol.md.
        applicationId = "app.wolfset"
        minSdk = 30
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // Live HR sampling (ExerciseClient + batching override — docs/spike-findings.md)
    implementation("androidx.health:health-services-client:1.0.0-rc02")
    // Wearable Data Layer transport to the phone
    implementation("com.google.android.gms:play-services-wearable:18.2.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.9.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-guava:1.9.0")

    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.10.0")
    implementation("androidx.wear:wear:1.3.0")
    implementation("androidx.wear:wear-ongoing:1.0.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    // Wear OS Material 3: the EdgeButton for bottom-anchored buttons (docs/figma-inventory.md §3)
    implementation("androidx.wear.compose:compose-material3:1.6.2")
    implementation("androidx.wear.compose:compose-foundation:1.6.2")
    implementation("androidx.compose.ui:ui:1.9.0")
    implementation("androidx.compose.foundation:foundation:1.9.0")

    testImplementation("junit:junit:4.13.2")
}
