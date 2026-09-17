# Sahla4Eco Mobile App — Agent Rules

## CRITICAL: No App Updates Without Permission

NEVER run `eas build`, `eas update`, `expo publish`, or any command that
deploys or publishes the mobile app without explicit permission from the
user. This includes:

- `eas build` (builds new APK/IPA)
- `eas update` (OTA updates)
- `expo publish` (legacy OTA)
- Pushing to app stores (Google Play, App Store)
- Any CI/CD pipeline that auto-builds the app

Always ask first. The user must approve every release.

## Code Conventions

- Expo SDK 54, React Native 0.81
- TypeScript
- Keep the app BASIC — two purposes only:
  1. See and confirm orders quickly
  2. Receive notifications about new orders / status changes
- Do NOT duplicate platform functionality (analytics, marketing, billing)
- Headers use the surface/card background with dark text and a hairline bottom border (Facebook/Instagram style). No solid blue header blocks, no gradients.
- Arabic UI text (RTL)
