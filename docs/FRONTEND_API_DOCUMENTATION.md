# Frontend API Integration Documentation

This document describes the actual, implemented backend APIs for the Ecolympics platform. It is generated directly from the Node.js + Express + MongoDB backend source code to provide accurate integration instructions for the frontend.

---

## 1. Backend Overview

- **Technology:** Node.js, Express, MongoDB (Mongoose), Socket.IO
- **Base URL:** `http://localhost:3000` (or production URL)
- **API Prefix:** `/api`
- **Authentication:** JWT Bearer tokens and HTTP-only cookies (for refresh tokens).
- **Available Roles:** `ADMIN`, `STUDENT`, `EVALUATOR`
- **Storage:** Local File System (`/storage`) is used for all media/evidence. No external cloud providers are used. Access is strictly authorized via backend APIs to prevent path traversal.
- **Real-Time:** Socket.IO is used exclusively for the Team Group Chat feature.

---

## 2. Authentication

All authentication endpoints are prefixed with `/api/auth`.

### Register
- **Method:** `POST`
- **URL:** `/api/auth/register`
- **Auth Required:** No
- **Request Body (JSON):**
  ```json
  {
    "username": "studentA",
    "email": "a@example.com",
    "password": "strongpassword"
  }
  ```
- **Success Response (201):** Returns the user profile and triggers OTP email.

### Login
- **Method:** `POST`
- **URL:** `/api/auth/login`
- **Auth Required:** No
- **Request Body (JSON):**
  ```json
  {
    "email": "a@example.com",
    "password": "strongpassword"
  }
  ```
- **Success Response (200):**
  ```json
  {
    "message": "Logged in successfully",
    "user": { "username": "studentA", "email": "a@example.com" },
    "accessToken": "eyJhbG..."
  }
  ```
  *(Also sets `refreshToken` in an HTTP-only cookie)*

### Get Current User
- **Method:** `GET`
- **URL:** `/api/auth/get-me`
- **Auth Required:** Yes (Access Token in `Authorization: Bearer <token>`)
- **Success Response (200):** Returns user details.

### Refresh Token
- **Method:** `GET`
- **URL:** `/api/auth/refresh-token`
- **Auth Required:** Yes (via `refreshToken` cookie)
- **Success Response (200):** Returns new `accessToken` and sets new `refreshToken` cookie.

### Logout
- **Method:** `GET`
- **URL:** `/api/auth/logout`
- **Auth Required:** Yes (via `refreshToken` cookie)
- **Success Response (200):** Clears the `refreshToken` cookie.

### Logout All Devices
- **Method:** `GET`
- **URL:** `/api/auth/logout-all`
- **Auth Required:** Yes (via `refreshToken` cookie)
- **Success Response (200):** Invalidates all active sessions for the user.

### Verify Email
- **Method:** `GET` (Wait, actually implemented as `POST` internally but route is `GET /api/auth/verify-email` with a body? Note: Current implementation maps `authRouter.get("/verify-email")` but controller expects `req.body` with `{ otp, email }`. Frontend must send these.)

---

## 3. Admin APIs

All admin routes are prefixed with `/api/admin`.
**Auth Required:** Yes (Role: `ADMIN`)

### Colleges
- `POST /api/admin/colleges` - Create a college (`name`, `code`, `location`)
- `GET /api/admin/colleges` - List all colleges
- `GET /api/admin/colleges/:id` - Get college details
- `PATCH /api/admin/colleges/:id` - Update a college

### Events
- `POST /api/admin/events` - Create an event. Requires `name`, `startDate`, `endDate`, optional `description`, `participatingColleges` (array of IDs), `teamConfig` (`{ minMembers, maxMembers }`), `evaluatorConfig`
- `GET /api/admin/events` - List all events
- `GET /api/admin/events/:id` - Get event details
- `PATCH /api/admin/events/:id` - Update an event
- `DELETE /api/admin/events/:id` - Delete an event

### Evaluators
- `POST /api/admin/evaluators` - Create an evaluator (`username`, `email`, `password`, `phone`, `collegeId`)
- `GET /api/admin/evaluators` - List all evaluators (excludes passwords, populates college)
- `GET /api/admin/evaluators/:id` - Get evaluator details
- `PATCH /api/admin/evaluators/:id` - Update evaluator details

### Event Evaluator Assignments
- `POST /api/admin/events/:eventId/evaluators` - Assign evaluator to event (`evaluatorId`, `isActive`)
- `GET /api/admin/events/:eventId/evaluators` - List evaluators assigned to the event
- `PATCH /api/admin/events/:eventId/evaluators/:evaluatorId` - Toggle `isActive` status
- `DELETE /api/admin/events/:eventId/evaluators/:evaluatorId` - Remove assignment

### Tasks
- `POST /api/admin/events/:eventId/tasks` - Create a task (`title`, `description`, `instructions`, `startDate`, `deadline`, `maxScore`, `evidenceRequirements`, `evaluationMetrics`, `impactMetrics`)
- `GET /api/admin/events/:eventId/tasks` - List tasks for an event
- `GET /api/admin/tasks/:id` - Get task details
- `PATCH /api/admin/tasks/:id` - Update a task
- `DELETE /api/admin/tasks/:id` - Delete a task

### Teams & Submissions
- `GET /api/admin/events/:eventId/teams` - List all teams in an event
- `GET /api/admin/teams/:id` - Get team details
- `GET /api/admin/events/:eventId/submissions` - List all submissions for an event
- `GET /api/admin/submissions/:id` - Get submission details
- `GET /api/submission/admin/submissions/:submissionId/evidence/:fileId` - (Route from `submissionRouter`) Get evidence file

### Analytics & Dashboard
- `GET /api/admin/dashboard` - Get overall stats (`totalTeams`, `totalStudents`, `totalEvaluators`, `totalEvents`)
- `GET /api/admin/events/:eventId/leaderboard` - Get event leaderboard
- `GET /api/admin/events/:eventId/analytics` - Get specific event analytics
- `GET /api/admin/analytics/historical` - Get analytics summary for all events

---

## 4. Evaluator APIs

All evaluator routes are prefixed with `/api/evaluator`.
**Auth Required:** Yes (Role: `EVALUATOR`)

### Dashboard & Evaluations
- `GET /api/evaluator/dashboard` - Returns `{ totalAssigned, completed, pending, items }` based on assigned evaluations.
- `GET /api/evaluator/evaluations` - List all assigned evaluations.
- `GET /api/evaluator/evaluations/:id` - Get specific evaluation details (forbidden if not assigned to the evaluator).
- `PATCH /api/evaluator/evaluations/:id` - Draft/update an evaluation (`criteria` array).
- `POST /api/evaluator/evaluations/:id/submit` - Finalize evaluation. 
  - **Scoring Behavior:** The frontend submits the `criteria` array (each criterion has `name`, `score`, `maxScore`, `comment`). **`totalScore` is automatically calculated and validated by the backend** based on the task's `maxScore`. The backend explicitly prevents evaluators from evaluating teams from their own college.

### Evidence Access
- `GET /api/evaluator/submissions/:submissionId/evidence/:fileName` - Get evidence file for a submission (only authorized if the evaluator is explicitly assigned to this submission).

---

## 5. Student APIs

All student routes are prefixed with `/api/student`.
**Auth Required:** Yes (Role: `STUDENT`)

### Teams
- `POST /api/student/teams` - Create a team (`name`, `eventId`). The creator automatically becomes `CAPTAIN`.
- `POST /api/student/teams/invite` - Invite a user to a team (`teamId`, `userId`). Only the captain can invite.
- `POST /api/student/invitations/:invitationId/accept` - Accept a team invitation. Fails if team is full.
- `POST /api/student/teams/:teamId/register` - Formally register the team for the event (validates min/max members config).

### Submissions
- `POST /api/student/events/:eventId/tasks/:taskId/submissions` - Submit a task. `multipart/form-data` with `files` (up to 10). Note: Triggers automatic assignment to an evaluator in the backend.
- `POST /api/student/events/:eventId/tasks/:taskId/submissions/:submissionId/evidence` - Upload additional evidence to an existing submission.

---

## 6. TEAM CHAT APIs

The Team Group Chat is scoped precisely to the `Event + Team` level.
All routes are prefixed with `/api/chat`.
**Auth Required:** Yes (Valid Session + User must be a verified `TeamMembership` member of the team, or an `ADMIN`).

### Get Messages
- **Method:** `GET`
- **URL:** `/api/chat/teams/:teamId/messages`
- **Query Params:** `?page=1&limit=50` (Defaults to page 1, 50 messages per page).
- **Behavior:** Returns paginated messages sorted oldest-to-newest for UI rendering.

### Send Message / Media
- **Method:** `POST`
- **URL:** `/api/chat/teams/:teamId/messages`
- **Request Format:** 
  - For `TEXT`: JSON `{ "type": "TEXT", "message": "Hello" }` OR `multipart/form-data`
  - For `IMAGE` / `VIDEO`: `multipart/form-data`
    - `type`: `"IMAGE"` or `"VIDEO"`
    - `message`: (Optional caption)
    - `file`: The actual file payload (Max 20MB)
- **Behavior:** Saves the metadata to MongoDB, saves the file to local `/storage/chat/`, and **automatically broadcasts `new_message` via Socket.IO** to all connected clients in the team's room.

### Get Media
- **Method:** `GET`
- **URL:** `/api/chat/messages/:messageId/media`
- **Behavior:** Retrieves the secure local file. The frontend should use this authorized endpoint in `src` attributes by appending the Bearer token (or fetching as blob) rather than direct file paths.

---

## 7. SOCKET.IO API

Socket.IO handles real-time delivery of messages. Media files are sent via REST, but the *notification* of the media arrives via Socket.IO.

### Connection
The frontend connects to the root namespace using the JWT access token.
```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: {
    token: localStorage.getItem('accessToken')
  }
});
```

### Events

#### `join_team_chat`
- **Direction:** Frontend → Backend
- **Payload:** `{ teamId: "65f..." }`
- **Behavior:** Backend verifies `TeamMembership` and places the socket in the isolated room `event_<eventId>_team_<teamId>`.

#### `leave_team_chat`
- **Direction:** Frontend → Backend
- **Behavior:** Removes the socket from the active team room.

#### `send_message`
- **Direction:** Frontend → Backend
- **Payload:** `{ type: "TEXT", message: "Hello world!" }`
- **Behavior:** Only accepts `TEXT`. For media, use the REST `POST` endpoint.

#### `new_message`
- **Direction:** Backend → Frontend
- **Payload:** Full `ChatMessage` JSON object.
- **Behavior:** Fired whenever a new message (text or media) is sent by anyone in the room.

#### `error`
- **Direction:** Backend → Frontend
- **Payload:** `{ message: "Error details..." }`
- **Behavior:** Emitted when operations (like joining an unauthorized room) fail.

---

## 8. Authentication Examples

### Axios Interceptor Example
```javascript
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### Fetch Image Example (For Chat Media)
```javascript
async function fetchChatImage(messageId) {
  const res = await fetch(`/api/chat/messages/${messageId}/media`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
  });
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
```

---

## 9. Error Handling

Centralized standard error structure returned by Express:
```json
{
  "success": false,
  "message": "Human readable error description"
}
```

| Status | Meaning | Example Scenario |
| ------ | ------- | ------- |
| 400 | Bad Request | Missing required fields, validation failures, invalid event config. |
| 401 | Unauthorized | Missing or expired JWT, invalid credentials, unverified email. |
| 403 | Forbidden | Accessing another team's chat, evaluator grading wrong team. |
| 404 | Not Found | Entity (Event, Team, Message, File) does not exist in DB. |
| 409 | Conflict | User already registered, User already in a team, Team is full. |
| 500 | Server Error | Internal exceptions, filesystem write failures. |

---

## 10. Data Models Relevant to Frontend

### Event
- `_id`, `name`, `description`, `status`
- `startDate`, `endDate`
- `participatingColleges`: `[College IDs]`
- `teamConfig`: `{ minMembers, maxMembers }`

### Team
- `_id`, `eventId`, `collegeId`, `captainId`
- `name`, `status` (`RECRUITING`, `REGISTERED`)

### Evaluation
- `_id`, `submissionId`, `taskId`, `teamId`, `evaluatorId`
- `criteria`: `[{ name, score, maxScore, comment }]`
- `totalScore`, `feedback`, `status`

### ChatMessage
- `_id`, `eventId`, `teamId`, `senderId`
- `type`: `TEXT | IMAGE | VIDEO`
- `message`: (Text content or caption)
- `file`: `{ filename, mimeType, size }` (Only if media)
- `createdAt`

---

## 11. Chat Frontend Integration Flow

1. **Login:** Obtain JWT `accessToken`.
2. **Load Team:** Fetch the student's active team using `GET /api/admin/teams/:id` or user profile.
3. **Open Chat:** Render chat UI.
4. **Fetch History:** Call `GET /api/chat/teams/:teamId/messages?page=1`.
5. **Connect Socket:** Initialize `socket = io(...)` with the JWT.
6. **Join Room:** `socket.emit('join_team_chat', { teamId })`.
7. **Listen:** `socket.on('new_message', (msg) => appendToUI(msg))`.
8. **Send Text:** `socket.emit('send_message', { type: 'TEXT', message: 'Hi' })`.
9. **Send Media:** Use `multipart/form-data` against `POST /api/chat/teams/:teamId/messages`.
10. **Render Media:** Fetch images via `GET /api/chat/messages/:messageId/media` with Auth headers and generate a Blob URL.
11. **Cleanup:** `socket.emit('leave_team_chat')` when unmounting.

---

## 12. Media Upload Flow (Chat & Submissions)

**Frontend:**
Use standard `FormData`.
```javascript
const formData = new FormData();
formData.append('type', 'IMAGE');
formData.append('file', fileInput.files[0]);
axios.post('/api/chat/teams/...', formData);
```

**Backend Process:**
- Verifies TeamMembership.
- Uses `multer` memory storage.
- Allocates a secure path in `/storage/chat/`.
- Saves file using `fs/promises`.
- Stores metadata in MongoDB.
- Broadcasts the new message to Socket.IO room.

*Do not store raw paths in the frontend. Always use the `/media` endpoint.*

---

## 13. Frontend API Client Recommendation

Suggested structure for a clean React/Vue integration:
```text
src/
├── api/
│   ├── axios.js       # Interceptor setup
│   ├── auth.js        # login, register, getMe
│   ├── admin.js       # event creation, analytics
│   ├── evaluator.js   # fetch evaluations, submit scores
│   ├── student.js     # team creation, task submissions
│   └── chat.js        # getMessages, postMedia, getMediaBlob
│
├── socket/
│   └── chatSocket.js  # socket singleton, join/leave wrappers
│
└── components/
    └── Chat/
        ├── ChatWindow.jsx
        └── ChatBubble.jsx
```

---

## 14. API Quick Reference

| Method | Endpoint | Role | Purpose |
| ------ | -------- | ---- | ------- |
| POST   | `/api/auth/login` | Any | Login |
| GET    | `/api/auth/refresh-token` | Any | Refresh JWT |
| GET    | `/api/chat/teams/:teamId/messages` | STU/ADM | Get chat history |
| POST   | `/api/chat/teams/:teamId/messages` | STU/ADM | Upload media / text |
| GET    | `/api/chat/messages/:messageId/media` | STU/ADM | Secure media access |
| POST   | `/api/student/teams` | STUDENT | Create team |
| POST   | `/api/student/events/:eventId/tasks/:taskId/submissions` | STUDENT | Submit task |
| GET    | `/api/evaluator/dashboard` | EVALUATOR | Get grading stats |
| POST   | `/api/evaluator/evaluations/:id/submit` | EVALUATOR | Save scores |
| GET    | `/api/admin/events/:eventId/analytics` | ADMIN | Event statistics |
| GET    | `/api/admin/events/:eventId/leaderboard`| ADMIN | Current scores |
