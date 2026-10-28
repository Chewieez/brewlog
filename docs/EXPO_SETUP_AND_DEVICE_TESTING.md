# Mobile Architecture: Local Expo Setup and Real Device Testing

**Purpose:** Plain-language overview of our local build setup, device testing workflow, and where EAS fits in.  
**Audience:** Team leads, product managers, and developers.  

---

## 1. The 30-Second Summary

* **Our Framework:** We use Expo and React Native to build for both iOS and Android from one TypeScript codebase.
* **Our App Shell:** We use a custom development build (`expo-dev-client`) that includes our specific native dependencies (like custom keyboard controls and secure storage).
* **Our Build Process (Local):** We build the app locally on our Macs using `expo run:ios` and `expo run:android`. We do not rely on cloud services to compile code for local development.
* **Our Testing Flow:** We plug in a physical phone (or connect over Wi-Fi), install the build once directly from our Mac, and then develop wirelessly with instant live reloads.
* **Where EAS Fits:** EAS is optional cloud infrastructure reserved for packaging store releases or sharing test builds with people who do not have a Mac.

---

## 2. Our Local Setup (In Plain English)

* **Single Codebase, Native Result:** We write screens and logic once in TypeScript. It compiles directly into real iOS and Android components.
* **Automatic Native Project Generation:** Instead of manually maintaining brittle Xcode and Android Studio projects, Expo generates them cleanly on demand (`npx expo prebuild`) using our configuration file (`app.json`).
* **Direct Local Compilation:** Your Mac compiles the native code directly using local Xcode and Android SDK tools. There are no cloud build queues or wait times.

---

## 3. How We Test on Real Devices

Testing on an actual iPhone or Android device does not require uploading anything to the cloud:

### Step 1: Install onto the Device Once
1. Connect the phone to the Mac with a USB cable (or enable wireless debugging on Android / network developer mode on iOS).
2. Run the local build command:
   * **iOS:** `npm run ios` (or `npx expo run:ios --device`)
   * **Android:** `npm run android` (or `npx expo run:android --device`)
3. The Mac compiles the native app and installs it directly onto the connected phone.
* *Note: You only need to rerun this command when you add or change a native library.*

### Step 2: Develop and Test Wirelessly
1. Start the local development server: `npm run start` (or `npx expo start`).
2. Open the installed app on the phone. It connects to your Mac over local Wi-Fi.
3. Every time you save a file on your laptop, the app on your phone updates in under a second (Fast Refresh).

---

## 4. What is EAS, and When Do We Use It?

EAS (Expo Application Services) is a companion cloud platform from Expo. It is **not** part of our daily local build loop, but serves specific purposes when needed:

* **EAS Build (Cloud):** Useful if a team member without a Mac needs an iOS build, or to generate automated release packages in CI/CD without tying up a laptop.
* **EAS Update:** Allows pushing emergency JavaScript bug fixes directly to user devices over the air without waiting for App Store approval.
* **EAS Submit:** Automatically uploads finalized production binaries to Apple TestFlight and Google Play.
