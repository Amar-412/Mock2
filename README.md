# MERN Auth Backend

A production-ready Node.js / Express authentication backend with JWT access + refresh tokens, email OTP verification, and session management backed by MongoDB Atlas.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v24+ (ESM modules) |
| Framework | Express.js v5 |
| Database | MongoDB Atlas via Mongoose v9 |
| Auth | JWT (jsonwebtoken) + SHA-256 hashing |
| Email | Nodemailer + Gmail OAuth2 (XOAUTH2) |
| Dev Server | Nodemon |
| Env Config | dotenv v17 |
| Logging | Morgan (dev) |
| Cookies | cookie-parser |

## Folder Structure

```
Mern login and Auth complete/
├── server.js                   # Entry point — starts server & connects DB
├── package.json
├── .env                        # Environment variables (DO NOT commit)
├── .gitignore
└── src/
    ├── app.js                  # Express app setup (middleware + routes)
    ├── config/
    │   ├── config.js           # Validates & exports all env vars
    │   └── database.js         # MongoDB connection (Mongoose)
    ├── controllers/
    │   └── auth.controller.js  # All auth logic
    ├── models/
    │   ├── user.model.js       # User schema
    │   ├── session.model.js    # Session / refresh token schema
    │   └── otp.model.js        # OTP schema
    ├── routes/
    │   └── auth.routes.js      # Route definitions -> /api/auth/*
    ├── services/
    │   └── email.service.js    # Nodemailer transporter + sendEmail()
    └── utils/
        └── utils.js            # generateOtp(), getOtpHtml()
```

## Environment Variables

Create a `.env` file in the project root:

```env
# MongoDB Atlas connection string
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>

# Secret key for signing JWTs (use a long random string)
JWT_SECRET=your_super_secret_jwt_key

# Gmail OAuth2 credentials for Nodemailer
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REFRESH_TOKEN=your_google_oauth_refresh_token
GOOGLE_USER=youremail@gmail.com
```

### How to get Google OAuth credentials

1. Go to Google Cloud Console -> APIs & Services -> Enable Gmail API
2. Create OAuth 2.0 Client ID (Web app), add https://developers.google.com/oauthplayground as Redirect URI
3. Go to OAuth 2.0 Playground -> Settings -> use your own credentials
4. Authorize scope: https://mail.google.com/
5. Exchange auth code -> copy the Refresh Token

### Generate a strong JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Installation & Running

```bash
npm install
npm run dev
```

Server starts on http://localhost:3000

## API Reference

Base URL: `http://localhost:3000/api/auth`

---

### POST /register

Register a new user. Sends an OTP email for verification.

**Request Body**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "yourpassword"
}
```

**Response 201**
```json
{
  "message": "User registered successfully",
  "user": {
    "username": "john_doe",
    "email": "john@example.com",
    "verified": false
  }
}
```

Error `409` — Username or email already exists

---

### GET /verify-email

Verify email with OTP received in inbox.

**Request Body**
```json
{
  "email": "john@example.com",
  "otp": "482910"
}
```

**Response 200**
```json
{
  "message": "Email verified successfully",
  "user": {
    "username": "john_doe",
    "email": "john@example.com",
    "verified": true
  }
}
```

Error `400` — Invalid OTP

---

### POST /login

Authenticate a verified user. Returns an access token (15 min) and sets a refresh token in an httpOnly cookie (7 days).

**Request Body**
```json
{
  "email": "john@example.com",
  "password": "yourpassword"
}
```

**Response 200**
```json
{
  "message": "Logged in successfully",
  "user": {
    "username": "john_doe",
    "email": "john@example.com"
  },
  "accessToken": "<jwt_access_token>"
}
```

Errors: `401` Invalid credentials | `401` Email not verified

---

### GET /get-me

Get current authenticated user profile.

**Headers:** `Authorization: Bearer <access_token>`

**Response 200**
```json
{
  "message": "user fetched successfully",
  "user": {
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

Error `401` — Token not found or invalid

---

### GET /refresh-token

Rotate the refresh token and issue a new access token.

**Cookie required:** `refreshToken` (set automatically on login)

**Response 200**
```json
{
  "message": "Access token refreshed successfully",
  "accessToken": "<new_jwt_access_token>"
}
```

Error `401` — Refresh token not found / invalid / revoked

---

### GET /logout

Revoke the current session's refresh token and clear the cookie.

**Cookie required:** `refreshToken`

**Response 200**
```json
{
  "message": "Logged out successfully"
}
```

---

### GET /logout-all

Revoke ALL active sessions for the user (logout from every device).

**Cookie required:** `refreshToken`

**Response 200**
```json
{
  "message": "Logged out from all devices successfully"
}
```

---

## Database Models

### User (users collection)

| Field | Type | Notes |
|---|---|---|
| username | String | Required, unique |
| email | String | Required, unique |
| password | String | SHA-256 hashed |
| verified | Boolean | Default: false |

### Session (sessions collection)

| Field | Type | Notes |
|---|---|---|
| user | ObjectId | Ref to users |
| refreshTokenHash | String | SHA-256 hash of refresh token |
| ip | String | Client IP address |
| userAgent | String | Client browser/device |
| revoked | Boolean | Default: false |
| createdAt / updatedAt | Date | Auto-managed (timestamps) |

### OTP (otps collection)

| Field | Type | Notes |
|---|---|---|
| email | String | Target email address |
| user | ObjectId | Ref to users |
| otpHash | String | SHA-256 hash of 6-digit OTP |
| createdAt / updatedAt | Date | Auto-managed (timestamps) |

---

## Auth Flow

```
Register --> OTP Email sent --> Verify Email --> Login
                                                  |
                                        Access Token (15m) <- use in Authorization header
                                        Refresh Token (7d) <- stored in httpOnly cookie
                                                  |
                                        Expired? --> GET /refresh-token
                                        Logout   --> GET /logout
                                        All devs --> GET /logout-all
```

### Security Design

- **Passwords** — hashed with SHA-256 before storage (never stored as plain text)
- **OTPs** — 6-digit random codes, hashed with SHA-256 before storage
- **Refresh tokens** — only SHA-256 hashes are stored in DB (never the raw token)
- **Access tokens** — short-lived (15 min), passed via Authorization Bearer header
- **Refresh token cookie** — httpOnly, Secure, SameSite=Strict (7 days)

---

## NPM Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with nodemon auto-restart |

---

## Common Issues

### MONGO_URI is not defined
Your `.env` file is missing or not in the project root.

### invalid_grant: Bad Request (email error)
`GOOGLE_REFRESH_TOKEN` is missing, expired, or still a placeholder. Follow the OAuth Playground steps above to generate a fresh token.

### ERR_MODULE_NOT_FOUND
Run `npm install` — a dependency is missing from node_modules.

---

## License

ISC
