# Taisa — Setup Guide

## Prerequisites
- Node.js v24+ (via nvm)
- Xcode (for iOS simulator)
- Expo Go app on your iPhone (or build a dev build)

## API Keys Required
1. **Anthropic API key** — for Claude (career coach AI)
2. **OpenAI API key** — for Whisper transcription

## First-Time Setup

### 1. Install dependencies
```bash
npm install --workspaces
```

### 2. Configure backend environment
```bash
cd backend
cp .env.example .env
```
Edit `backend/.env`:
```
PORT=3000
ANTHROPIC_API_KEY=sk-ant-...your key...
OPENAI_API_KEY=sk-...your key...
DB_PATH=./taisa.db
```

### 3. Configure mobile environment
```bash
cd mobile
cp .env.example .env
```
Edit `mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://YOUR_MAC_IP:3000/api/v1
```
> **Important:** Use your Mac's local IP (e.g. `192.168.1.5`), not `localhost`, so your phone can reach the backend over WiFi.
> Find it with: `ipconfig getifaddr en0`

### 4. Start the backend
```bash
npm run backend
```
You should see: `Taisa backend running on http://localhost:3000`

### 5. Start the mobile app
```bash
npm run mobile
```
Scan the QR code with Expo Go on your phone.

> **Note:** Your phone and Mac must be on the same WiFi network.

## Building a Dev Build (required for audio recording)
Expo Go doesn't support some native audio features. Build a development build:
```bash
cd mobile
npx expo install expo-dev-client
npx expo run:ios
```

## Project Structure
```
taisa/
├── mobile/          # React Native app (Expo)
│   ├── app/         # Expo Router screens
│   └── src/         # Components, hooks, services, stores
├── backend/         # Node.js + Express API
│   └── src/
│       ├── routes/           # API endpoints
│       ├── services/claude/  # AI agents
│       └── prompts/          # Claude system prompts
├── shared/          # TypeScript types shared across packages
└── docs/            # Product planning & design documents
```

## Key Decisions to Revisit
- Performance review file upload (PDF/Word) — currently paste-text only
- Cloud deployment (Railway/Render) when ready to use away from home WiFi
- iCloud backup for SQLite database
- Gmail/Calendar integration (future)
