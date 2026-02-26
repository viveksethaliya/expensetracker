# StartupsFriend Expense Tracker

A React Native app for tracking income, expenses, categories, recurring subscriptions, templates, and summary reports.

## Core Features
- Add, edit, and delete income/expense transactions
- Custom categories for income and expense types
- Transaction templates for quick entry
- Recurring subscriptions with automatic transaction generation
- Reports screen with totals and trends
- Daily reminder notifications
- Local persistence using AsyncStorage

## Prerequisites
- Node.js 22.11.0 or newer
- JDK 17
- Android Studio (SDK + emulator)
- React Native Android environment setup

## Local Setup
```bash
npm install
```

## Run in Development
```bash
npm start
npm run android
```

## Quality Checks
```bash
npm run lint
npm test -- --watchAll=false
```

## Android Release Build (APK)
1. Create `android/keystore.properties` with your release keystore values:
```properties
RELEASE_STORE_FILE=my-release-key.keystore
RELEASE_STORE_PASSWORD=your_store_password
RELEASE_KEY_ALIAS=your_key_alias
RELEASE_KEY_PASSWORD=your_key_password
```
2. Place the keystore file in `android/app/` (or update the path in `keystore.properties`).
3. Build release APK:
```bash
cd android
./gradlew clean assembleRelease
```
4. Output APK path:
`android/app/build/outputs/apk/release/app-release.apk`

## Install Release APK
```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

If install fails, uninstall older app variants with different signatures or package IDs first.

## Package and App Name
- Android package: `com.startupsfriend.expense_tracker`
- Display name: `StartupsFriend Expense Tracker`
