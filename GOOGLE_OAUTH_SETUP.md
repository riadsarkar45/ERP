# Google OAuth Setup Guide

## 🔧 Setup Google OAuth (Optional)

To enable Google login, follow these steps:

### 1. Create Google OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen
6. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
   - `http://localhost:5174/auth/callback`

### 2. Update Environment Variables

Add to `server/.env`:
```env
GOOGLE_CLIENT_ID="your-actual-google-client-id"
GOOGLE_CLIENT_SECRET="your-actual-google-client-secret"
```

### 3. Install Additional Dependencies

```bash
cd server
npm install passport passport-google-oauth20 express-session
```

### 4. Current Status

- ✅ JWT Token: 64-byte secret configured
- ✅ Email Authentication: Working
- ✅ Combined Login/Register: Single page
- ⏳ Google OAuth: Ready for setup (currently shows info message)

### 5. Test Current System

1. Visit: http://localhost:5174
2. Try email registration/login
3. Google button shows "coming soon" message
4. All existing dashboard features work with authentication

The system is fully functional with email authentication. Google OAuth can be added later when you have the credentials.