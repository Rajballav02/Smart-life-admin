# 🧠 Smart Life Admin

**Write naturally. We organize the rest.**

A full-stack MERN application that turns free-form notes into organized Personal, Finance, and
Documents & Assets records automatically — no forms, no manual categorizing.

```
Smart Note → Auto Extraction → Separate Records → MongoDB → Life Hub
```

---

## 1. Project structure

```
smart-life-admin/
├── client/            React + Vite + Bootstrap 5 frontend
│   └── src/
│       ├── components/    RecordCard, SmartNoteInput, Sidebar, Navbar, charts...
│       ├── pages/          Landing, Login, Register, LifeHub, Personal, Finance,
│       │                   Documents, SmartNotes, Notifications, Profile, Settings
│       ├── layouts/        AppLayout (sidebar + mobile bottom nav)
│       ├── context/        AuthContext (JWT session)
│       ├── services/       api.js (axios client)
│       └── styles/         theme.css (premium custom theme over Bootstrap)
│
└── server/            Node.js + Express + MongoDB backend
    ├── models/            User, Note, Record, Notification (Mongoose)
    ├── controllers/       auth, note, record, finance, notification, dashboard
    ├── routes/            REST endpoints
    ├── middleware/        JWT auth guard, error handler
    ├── services/
    │   ├── smartParser.js       ← the core NLU/extraction engine
    │   ├── financeService.js    weekly / half-monthly / monthly analytics
    │   ├── reminderService.js   cron scheduler for due reminders
    │   ├── notificationService.js  dispatches in-app / alarm / SMS / email
    │   ├── smsService.js        SMS provider wrapper (mock mode by default)
    │   └── emailService.js      Nodemailer wrapper (mock mode by default)
    ├── server.js
    └── .env.example
```

---

## 2. Prerequisites

- Node.js 20+ (tested on Node 22; required by Vite 6 and React Router 7 — see §2b)
- MongoDB running locally, or a free MongoDB Atlas cluster
- npm

### 2b. A note on `npm audit`

The versions pinned in `package.json` were chosen to pass `npm audit` with **0
vulnerabilities** on both `client/` and `server/` as of this writing. If you still see
warnings after `npm i`, it's almost always one of these two harmless cases, not a real
risk:

- **New transitive deprecation notices** (e.g. `glob`, `scmp`) — these are warnings from
  a sub-dependency of a sub-dependency (usually pulled in by `jest` or `twilio`), not
  exploitable vulnerabilities. `npm audit` (not `npm outdated`) is the one that matters.
- **A brand-new advisory published after this build** — run `npm audit` and check the fix
  suggestion before blindly running `npm audit fix --force`: it sometimes suggests
  *downgrading* a package to a version with fewer dependencies rather than an actual
  newer fix (this happened with `nodemon`/`chokidar`/`braces` during development — see
  below). Always sanity-check what `--force` would actually install.

**What was fixed here, for reference:**
- `nodemailer` 6.x → `^10.0.15` (multiple SMTP/parsing advisories; `createTransport`/`sendMail` API unchanged, all tests still pass)
- `node-cron` 3.x → `^4.6.0` (dropped the vulnerable `uuid` sub-dependency entirely; now zero-dependency; `cron.schedule()` call signature unchanged)
- `twilio` → `^6.1.2` (latest patch)
- `vite` 5.x → `^6.4.3` and `@vitejs/plugin-react` → `^4.7.0` (fixes a moderate esbuild dev-server advisory; build output verified clean)
- `react-router-dom` 6.x → `^7.18.4` (fixes a moderate open-redirect/SSR-hydration advisory; this app only uses static, hardcoded routes so it was never exploitable here either way, but the fix was free and build-verified)
- **`nodemon` was removed entirely.** Its `chokidar` → `braces` dependency chain carries a
  high-severity advisory (GHSA-vfj7-8cjw-p6xm) with **no patched version published upstream
  yet** — npm's own suggested fix was to downgrade nodemon to a 2016-era `1.14.10`, which is
  not a real fix. Since nodemon is dev-only tooling, the real fix is to not depend on it:
  `npm run dev` now uses Node's built-in `--watch` flag (stable since Node 20, available
  since 18.11) instead, which has zero extra dependencies. If you prefer nodemon's extra
  features (ignoring specific paths, delay, etc.), you can still `npm i -D nodemon` yourself
  and swap the `dev` script back — just know it currently reintroduces that one advisory.

---

## 3. MongoDB setup

**Option A — Local MongoDB**

```bash
# Install MongoDB Community Edition, then:
mongod --dbpath /path/to/your/data/dir
```
Your connection string will be: `mongodb://127.0.0.1:27017/smart_life_admin`

**Option B — MongoDB Atlas (free tier, no local install)**

1. Create a free cluster at https://www.mongodb.com/atlas
2. Add your IP to the network access list (or allow `0.0.0.0/0` for local dev)
3. Create a database user and copy the connection string, e.g.:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/smart_life_admin`

---

## 4. Backend setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env`:

```env
PORT=5000
CLIENT_URL=http://localhost:5173

MONGODB_URI=mongodb://127.0.0.1:27017/smart_life_admin

JWT_SECRET=replace_this_with_a_long_random_secret
JWT_EXPIRES_IN=7d

# Leave these blank to run in mock/dev mode (no crash, just console logs)
SMS_PROVIDER=mock
SMS_API_KEY=
SMS_API_SECRET=
SMS_FROM_NUMBER=

EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=Smart Life Admin <no-reply@smartlifeadmin.app>
```

Start the backend:

```bash
npm run dev      # with nodemon (auto-restart)
# or
npm start        # plain node
```

You should see:
```
MongoDB connected
Smart Life Admin API running on port 5000
Reminder scheduler started
```

Health check: `GET http://localhost:5000/api/health`

---

## 5. Frontend setup

In a new terminal:

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` calls to
`http://localhost:5000` automatically (see `client/vite.config.js`), so no extra
configuration is needed for local development.

For a production build:

```bash
npm run build      # outputs to client/dist
npm run preview    # serve the production build locally
```

---

## 6. SMS setup — Alarm reminders on your phone

By default `SMS_PROVIDER=mock`, so reminders are logged to the server console
instead of actually sent — the app runs perfectly without any SMS account.

**Important:** in Settings, turning on **Alarm** for Personal or Documents & Assets
automatically sends that reminder as a real SMS to the user's registered phone number
(in addition to the in-app popup + sound), so it reaches them even if the app isn't open.
This is fully wired up with **Twilio** — you only need to add your own credentials.

To send real SMS via Twilio:

1. Create a free Twilio account at https://www.twilio.com and get a trial phone number.
2. From the Twilio Console, copy your **Account SID** and **Auth Token**.
3. Fill in `server/.env`:
   ```env
   SMS_PROVIDER=twilio
   SMS_API_KEY=your_twilio_account_sid
   SMS_API_SECRET=your_twilio_auth_token
   SMS_FROM_NUMBER=+1XXXXXXXXXX
   ```
4. In the app, go to **Profile** and add your phone number (with country code, e.g. `+91 98765 43210`).
5. Go to **Settings** and turn on **Alarm** (or **SMS**) for Personal and/or Documents & Assets.
6. When a reminder becomes due, the scheduler (`services/reminderService.js`, runs every
   minute) calls `services/smsService.js`, which uses the official `twilio` npm package
   to deliver the SMS. No code changes needed — it's a real integration, not a stub.

If credentials are missing or invalid, the app safely falls back to logging the message
to the console instead of crashing.

---

## 7. Email setup (optional)

By default, with `EMAIL_HOST` unset, reminder emails are logged to the console instead of sent.

To send real email via SMTP (e.g. Gmail, SendGrid SMTP, Mailgun SMTP):

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=Smart Life Admin <no-reply@smartlifeadmin.app>
```

> For Gmail, you'll need an **App Password** (not your normal password) with 2FA enabled.

---

## 8. Browser notifications

Go to **Settings → Enable browser notifications** inside the app, or the browser will
prompt automatically the first time an alarm-type reminder fires. If the browser blocks
autoplay audio, the UI will surface a message asking for a user interaction — it never crashes.

---

## 9. Demo / test instructions

1. Register a new account at `/register`.
2. On the **Life Hub**, type this into Smart Note and click **Organize it**:

   ```
   18 September ko electricity bill ₹1200 bharna hai. Friday ko 5 PM project meeting hai.
   20 October ko bike insurance expire hai. Aaj food pe ₹350 spend kiya.
   ```

3. Watch the "Understanding your note... → Finding important details... → Organizing your
   information..." sequence, then **4 separate cards** appear:
   - **Personal:** Project Meeting — Friday, 5:00 PM
   - **Finance:** Electricity Bill — ₹1,200, 18 September
   - **Finance:** Food — ₹350, Today
   - **Documents & Assets:** Bike Insurance — expiry 20 October
4. Visit **Personal**, **Finance**, and **Documents & Assets** to see each record filed
   under its own module, and the **Life Hub** stat tiles update automatically.
5. Try editing, completing, snoozing, pinning, and deleting a record.
6. Visit **Finance** and switch between Weekly / Half-Monthly / Monthly views to see the
   charts and savings calculation update.
7. Visit **Settings** to toggle SMS/Email/Alarm/In-App preferences per module (Finance has
   no reminder settings, by design — it's tracking & analysis only).
8. Try a note with no date (`Buy groceries.`) — it will show **"Not specified"** rather than
   guessing a date.
9. Try a recurring note (`Har Sunday grocery shopping karni hai.`) — it will be tagged
   as a **weekly recurring** personal task.
10. Click the **mic icon** inside the Smart Note box to dictate a note by voice instead of
    typing (Chrome/Edge only — uses the browser's built-in Web Speech API, no server or API
    key required). Use the **EN / HI** toggle above the box to switch recognition language;
    tap the mic again to stop, then hit **Organize it** as usual.
11. Click the **pencil (Edit)** icon on any record to open the edit form — change title,
    category, amount, date/time, priority, status, or the reminder offset (5 min / 1 hour /
    1 day / 7 days before, etc.). For Documents & Assets, you can also attach a file
    (image/PDF, under 3MB) directly on the record.
12. Open **Calendar** in the sidebar to see all dated Personal, Documents, and Finance items
    laid out on a month grid — click any day to see what's scheduled.
13. Open **Search** in the sidebar to find anything across all three modules at once, with
    module/status/priority filters.
14. When an Alarm-enabled reminder becomes due, a **prominent popup with a repeating tone**
    appears anywhere in the app (via `AlarmManager`), with **Stop Alarm** and **Snooze 15m**
    buttons — and, if Twilio is configured, the same reminder lands as an SMS on your phone.

---

## 10. Notes on the Smart Parser

`server/services/smartParser.js` is a fully offline, rule-based extraction engine (no
external AI API calls, so it works with zero internet access and zero API cost). It:

- Splits a note into clauses on punctuation and conjunctions (`and`, `aur`, commas, line breaks)
  while protecting comma-formatted amounts like `1,200`.
- Extracts dates (`today`, `tomorrow`/`kal`, weekday names, `18 September`, `20/10/2026`,
  `next week`, `next month`, month-only mentions like "December").
- Extracts times (`5 PM`, `10:30 AM`, `morning`/`evening`/etc.).
- Extracts amounts (`₹1,200`, `Rs 500`, `500 rupees`).
- Detects recurrence (`every Sunday`, `Har Sunday`, `monthly`, `weekly`, etc.) and sets a frequency.
- Routes each clause to **personal**, **finance**, or **documents** based on keyword and
  context signals (e.g. money + "spent"/"bill" → finance; "insurance"/"warranty" → documents).
- Computes priority automatically (high/medium/low) based on urgency and days-until-due,
  with manual override always available from the UI.
- Never guesses a date — if none is found, the record is saved with `dateLabel: "Not specified"`.

---

## 10b. Testing

**Automated tests (no database needed)** — run from `server/`:

```bash
npm test
```

23 tests covering the smart parser (the spec's demo scenario, missing dates, Hindi recurring,
amount formats, module routing), the SMS service (mock mode, phone normalisation, correct
Twilio call, error handling), and the API (health, validation, JWT protection).

**Full end-to-end smoke test (needs your MongoDB + running backend):**

```bash
# terminal 1
cd server && npm run dev
# terminal 2
cd server && npm run smoke
```

It registers a throwaway user, posts the final demo note, and checks: 4 separate records in
the right modules, "Not specified" for missing dates, Life Hub + Finance numbers, search,
edit/complete/delete persistence, and that one user can never read another user's records.

**Real SMS check (needs your Twilio credentials in `.env`):**

```bash
cd server && npm run test:sms -- +919876543210
```

> Note: the 3D visuals (Three.js) appear on the Landing, Login and Register pages only. They
> are deliberately not used inside the dashboard so usability stays first, as the spec asks.
> Three.js is lazy-loaded, so it does not slow down the logged-in app.

---

## 11. Security

- Passwords hashed with bcrypt, never stored in plain text.
- JWT-based auth on every protected route; all records are scoped to `req.user._id`.
- No secrets committed — `.env` is git-ignored, only `.env.example` is tracked.
- CORS restricted to `CLIENT_URL`.
- Mongoose schema validation on all writes.

---

## 12. What's mocked vs. real

| Feature | Status |
|---|---|
| Auth, JWT, bcrypt | Fully real |
| MongoDB models & CRUD | Fully real |
| Smart Note parsing | Fully real (rule-based, runs locally) |
| Finance analytics & charts | Fully real, computed from your MongoDB records |
| Reminder scheduler (cron) | Fully real — checks every minute |
| In-app notifications | Fully real, stored in MongoDB |
| SMS delivery | **Real via Twilio** once `SMS_PROVIDER=twilio` + credentials are set in `.env`; safe mock/console mode otherwise |
| Email delivery | Mock mode by default; real once SMTP is configured in `.env` |
| Browser alarm/notification | Real, via the Notification API + Web Audio API tone (needs user permission for sound/notifications) |
| Document attachments | Real — files are read client-side and stored as base64 on the record in MongoDB (under 3MB each) |
| Calendar & Search | Real — both read live from the same `Record` collection, no separate event storage |

Nothing in this app uses fake buttons, fake login, or static arrays as a data source —
every action goes through the real REST API into MongoDB.

## Per-page 4K backgrounds

Every page has its own background artwork that matches its label (Landing, Login, Register, Life Hub, Personal, Finance, Documents & Assets, Smart Notes, Calendar, Search, Notifications, Profile, Settings).

- Files live in `client/src/assets/backgrounds/` as WebP: `<page>-4k.webp` (3840x2160) and `<page>-hd.webp` (1920x1080).
- `PageBackground.jsx` renders a fixed layer behind the page; `AppLayout.jsx` picks the artwork from the current route.
- Large screens (>= 1500px wide) and hi-DPI screens (>= 900px, 2x) load the 4K image; smaller screens load the HD one, so phones never download 4K.
- These are original illustrations generated by `tools/generate_backgrounds.py`, not stock photographs. To regenerate or tweak them:
  ```bash
  pip install pillow numpy
  python3 tools/generate_backgrounds.py            # all pages
  python3 tools/generate_backgrounds.py finance    # one page
  ```
- To use your own photos instead, replace the matching `-4k.webp` / `-hd.webp` files (keep the names) and rebuild.

## Deploying (single service)

In production the Express server also serves the built React app, so you only host one thing.

1. Create a free MongoDB Atlas cluster and copy its connection string.
2. Push this folder to GitHub, then on Render choose **New > Blueprint** (it reads `render.yaml`).
3. Set `MONGODB_URI` (and the Twilio / SMTP values if you want real SMS and email).
4. Open the Render URL. Health check: `/api/health`.

Manual run on any server:
```bash
cd client && npm install && npm run build
cd ../server && npm install && NODE_ENV=production MONGODB_URI=... JWT_SECRET=... npm start
```

## Using it as a phone app

**Fastest: install it (PWA).** Deploy once (see "Deploying" above) so you have an `https://` address, then open it on your phone:
- **Android (Chrome):** menu > *Install app* (or tap the *Install* card inside the app).
- **iPhone (Safari):** Share > *Add to Home Screen*.

It opens full-screen with its own icon, caches the app shell so it loads instantly (and opens offline; your data still needs internet), and uses a bottom tab bar with a *More* sheet on small screens. The 3D scene is skipped on phones to keep things smooth.

**Real Android/iOS app (optional, via Capacitor).** The web app is already wrapped-ready:
```bash
cd client
cp .env.production.example .env.production   # set VITE_API_URL to your deployed server URL
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npm run build
npx cap add android            # and/or: npx cap add ios
npx cap sync
npx cap open android           # opens Android Studio; press Run, or Build > Build APK
```
`capacitor.config.json` is included. Building an APK needs Android Studio on your computer; iOS needs a Mac with Xcode.

## Authentication

- Log in with **email or phone number** + password; sessions last 30 days (`JWT_EXPIRES_IN`).
- Passwords: at least 8 characters with a letter and a number; stored hashed (bcrypt).
- **Forgot password:** 6-digit code (valid 15 min, 5 tries) sent by SMS and email. Without Twilio/SMTP configured it is printed in the server console (and shown on screen in development only).
- **Change password** and **Log out everywhere** are in Profile > Security; both invalidate other devices' sessions.
- Login/OTP endpoints are rate-limited; `helmet` security headers are on.

Create your own first account from the command line (password is never saved in a file):
```bash
cd server
npm run create-user -- --name "Your Name" --email you@example.com --phone 9876543210 --password "YourPass123"
```
(or just use the Register screen).

## Push notifications (reminders with the app closed)

1. `cd server && npm run vapid` and paste the three printed lines into `server/.env` (or your host's environment variables). Use your own keys; never share the private one.
2. Restart the server, open the app, go to **Settings > Push notifications > Turn on**, allow notifications, then press **Send test**.
3. Every reminder now also arrives as a phone notification (one per reminder, on every device you enabled). Tapping it opens the app. On iPhone this works only after you add the app to the Home Screen (iOS 16.4+). Push needs `https://` (localhost is fine for testing).

Without VAPID keys push is simply off; SMS, email and in-app alerts keep working. For an alarm that must reach you even with no data connection, keep **Alarm** on: it also sends an SMS.
