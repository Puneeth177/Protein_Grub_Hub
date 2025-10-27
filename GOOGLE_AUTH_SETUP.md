Google Sign-In Setup

This project supports Sign in / Sign up using Google Identity Services (GIS). Follow these steps to enable it locally:

1. Go to Google Cloud Console and create an OAuth 2.0 Client ID (Application type: Web application).
2. Add your local origin (for example `http://localhost:4200`) as an authorized origin in the credentials.
3. Copy the Client ID and set it in `frontend/src/environments/environment.ts` as `googleClientId`.
4. Set the same Client ID in your server environment as `GOOGLE_CLIENT_ID` so the backend can verify tokens.

Backend installation and run (from project root):

```powershell
cd "c:\Users\K R Sudarshan\Desktop\PGH\Protein_Grub_Hub"
npm install
node server.js
```

Frontend (from frontend folder):

```powershell
cd frontend
npm install
npm run start
# or use Angular CLI: ng serve
```

Visit `/login` to see the Google Sign-In button.

Notes:
- The app will exchange the Google ID token with the backend at `/api/auth/google` which verifies the token and returns your app's JWT.
- Keep `GOOGLE_CLIENT_ID` and `JWT_SECRET` in environment variables for production.
