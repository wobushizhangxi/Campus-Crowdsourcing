# Android APK Build

This project uses Capacitor to package the existing React frontend as an Android debug APK. The APK does not contain the Spring Boot backend or the MySQL database. It uses `VITE_API_BASE_URL` as the default backend URL, and the login screen can save a different server address later without rebuilding the APK.

## Database Location

Keep the database on the backend side:

- Local demo: MySQL runs on the same Windows machine as `campus-backend`.
- LAN demo: the phone connects to `http://<computer-lan-ip>:8080`; the backend connects to local MySQL.
- Public demo: the APK connects to an HTTPS domain or tunnel; the backend connects to MySQL on the server or a cloud database.

Do not put the main MySQL database inside the APK. Android local storage should only keep session tokens and light cache.

## Build

Build with an explicit backend URL reachable by the Android device:

```powershell
.\build-android.ps1 -ApiBaseUrl "http://172.27.9.22:8080"
```

For a public test:

```powershell
.\build-android.ps1 -ApiBaseUrl "https://your-public-backend.example.com"
```

The script outputs:

```text
release/CampusCrowdPlatform-android-debug.apk
```

After installing the APK, if the backend IP changes, edit the server address on the login screen and save it. The app clears the old login session after changing the address, so sign in again.

## Requirements

- JDK 17 or newer
- Node.js and npm
- Android SDK command-line tools or Android Studio
- Android SDK platform and build tools compatible with the generated Gradle project

If the Android SDK is installed outside the default location, set one of:

```powershell
$env:ANDROID_HOME="C:\Users\<you>\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
```
