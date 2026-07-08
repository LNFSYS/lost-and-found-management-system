# FPTU Lost & Found Mobile

Expo React Native mobile app for the FPTU Lost & Found System.

## Stack

- Expo React Native
- TypeScript
- Secure token storage with `expo-secure-store`
- Camera/gallery image picking with `expo-image-picker`
- Socket.IO client for claim chat

Flutter is a separate mobile stack and is not mixed into this Expo app. If the team needs Flutter later, create a separate `apps/mobile-flutter` project.

## Run

From the repo root:

```bash
npm install
npm run dev:api
npm run dev:mobile
```

Set the API URL when testing on a physical phone:

```bash
$env:EXPO_PUBLIC_API_URL="http://YOUR_LAN_IP:3001/api"
npm run dev:mobile
```

Android emulator default fallback:

```text
http://10.0.2.2:3001/api
```

## Implemented Mobile Flows

- Login and register with OTP.
- Secure token storage.
- Public LOST/FOUND board with search, type filter, sort.
- Create LOST/FOUND post.
- Upload post images from camera or gallery.
- Post detail with media, tags, matches, claims.
- My posts.
- Match suggestions and match feedback labels.
- Submit claim and upload evidence image from camera or gallery.
- View claim verification confidence.
- Create and view return appointments.
- Handover point list.
- Notifications and mark as read.
- Profile, activity, reputation.
- Staff/Admin overview, warehouse list, report list.
- Claim chat over Socket.IO by claim ID.

## Notes

- Mobile uses the same Node.js API as the web MVP.
- Custom AI training, native push notifications, offline retry queues and device farm testing remain separate hardening work.
