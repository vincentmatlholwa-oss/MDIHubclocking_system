# MDIHub - Employee Attendance & Clocking System

Offline-first PWA with GPS geofencing for Mafikeng Digital Innovation Hub.

## Prerequisites by Platform

### All Platforms
- [Node.js](https://nodejs.org/) 18+ and npm
- Git

### macOS

```bash
# Install Node.js (if not installed)
brew install node

# Install Java 17+ (required for Android build)
brew install openjdk@17

# Set JAVA_HOME
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
source ~/.zshrc

# Install Android Studio (for APK build)
# Download from https://developer.android.com/studio
# Then set ANDROID_HOME:
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools' >> ~/.zshrc
source ~/.zshrc
```

### Windows

```powershell
# Install Node.js
# Download from https://nodejs.org/ or use winget:
winget install OpenJS.NodeJS

# Install Java 17+ (required for Android build)
# Download from https://adoptium.net/ (Temurin JDK 17)
# Set JAVA_HOME environment variable to e.g. C:\Program Files\Eclipse Adoptium\jdk-17.0.9.9-hotspot

# Install Android Studio (for APK build)
# Download from https://developer.android.com/studio
# Then set ANDROID_HOME:
#   System Variable: ANDROID_HOME = C:\Users\<USER>\AppData\Local\Android\Sdk
#   Add to PATH: %ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%ANDROID_HOME%\tools
```

### Linux (Ubuntu/Debian)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Java 17+ (required for Android build)
sudo apt install -y openjdk-17-jdk
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
source ~/.bashrc

# Install Android Studio (for APK build)
# Download from https://developer.android.com/studio
# Extract to ~/android-studio, then:
echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools' >> ~/.bashrc
source ~/.bashrc
```

## Install Project Dependencies

```bash
cd MDIHub\ V3
npm install
```

## Build Commands

| Command | Output |
|---|---|
| `npm run dev` | Start admin web dev server |
| `npm run dev:employee` | Start employee web dev server |
| `npm run build` | Build admin web app (`dist/`) |
| `npm run build:employee` | Build employee app (`dist/`) |
| `npm run preview` | Preview production build |
| `npm run server` | Start backend API server |

## Build Android APK

```bash
npm run build:employee
npx cap sync android
cd android && ./gradlew assembleDebug
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

## Build Admin Web App

```bash
npm run build
```

Output: `dist/` — deploy to any static hosting.

## Project Structure

```
MDIHub V3/
├── src/
│   ├── components/    # Navbar, ProtectedRoute, etc.
│   ├── contexts/      # AuthContext, AppContext
│   ├── pages/         # Login, Dashboard, Attendance, Leave, Admin, etc.
│   ├── services/      # db.js, location.js, sync.js, notifications.js
│   ├── App.jsx        # Routes & lazy loading
│   ├── main.jsx       # Entry point
│   └── index.css      # Theme & responsive styles
├── backend/           # Express API server
├── public/            # Static assets, icons, manifest
├── android/           # Capacitor Android project
├── vite.config.js     # Vite config with PWA & dual-build
├── capacitor.config.json
├── .env.admin         # Admin build env
└── .env.employee      # Employee build env
```

## Environment Variables

- `VITE_APP_MODE` — Set to `employee` for employee-only build (tree-shakes admin routes). Default (empty) = admin full app.

## Copyright

© Vincent Matlholwa
