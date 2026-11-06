# 🎰 Fighters Token Spin

A standalone, provably fair web application for high-stakes token draws, casino-style reel animations, and live synchronized streaming for members.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **PostgreSQL (Supabase/Neon)** via **Prisma**.

---

## 🌟 Features

### 1. 🛡️ Protected Admin Dashboard (`/admin`)
- **Server-Side Session Authentication**: Protected via encrypted JWT HttpOnly cookies with `jose`.
- **TOTP 2-Factor Authentication (RFC 6238)**: Integrates with Google Authenticator, 1Password, or Authy.
- **Round Creator**:
  - Configurable token ranges (e.g. `1` to `80`).
  - Exclusion filter for already booked/claimed tokens (supports lists `5, 12` and ranges `20-25`).
  - Multi-winner drawing support (picks without replacement).
  - Test Round mode: allows simulation, resets, and re-running before official live spins.
  - Live eligible numbers calculation & preview before spinning.
- **Master Spin Trigger**: Decides results server-side using CSPRNG prior to initiating animation.
- **Round History & CSV Export**: Detailed audit trail of past draws with 1-click CSV download.
- **Security Audit Logs**: Immutable recording of logins, round events, spin commits, and IP addresses.

### 2. ⚡ Live Public Spin Arena (`/spin/[roundId]`)
- **Real-Time Synchronized Broadcast**: Powered by Server-Sent Events (SSE), ensuring every viewer sees the spin start, tick, and land at the exact same millisecond.
- **Provably Fair Commitments**: Displays the round status, range, exclusion count, and SHA-256 commit hash.
- **Multi-Winner Presentation**: Highlights primary winner and lists sequential winner rankings.

### 3. 🎲 Provably Fair Spin Engine
1. **CSPRNG Selection**: Uses Node.js `crypto.randomInt` (cryptographically secure pseudo-random number generator) ensuring uniform distribution and zero predictability.
2. **Commitment Scheme**: Pre-commits to `sha256(roundId + ":" + seed + ":" + winners.join(","))`.
3. **Public Verification (`/verify`)**: Anyone can inspect past rounds, view revealed seeds, and re-verify the hash integrity.

### 4. 🎰 Casino-Style Reel Animation
- 3D perspective slot machine reel with ease-out cubic deceleration (`1 - (1 - t)^3`).
- Lands **exactly** on the server-decided number.
- Synthesized Web Audio API sound effects (tick clatter + jackpot victory fanfare) with no external asset dependencies.
- Sound is **off by default** with a persistent mute toggle button.
- Smooth mobile responsiveness and **`prefers-reduced-motion`** accessibility support (switches to a high-contrast fade pulse).

---

## 🚀 Quickstart & Local Setup

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd draw
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update your `.env` with your PostgreSQL database URL (e.g., Supabase or Neon):
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres?schema=public"
SESSION_SECRET="your-32-character-random-session-secret-string"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Push Database Schema & Generate Prisma Client
```bash
npx prisma db push
npx prisma generate
```

### 4. Seed Demo Admin & Sample Round
```bash
npm run seed
```

This creates the default demo administrator:
- **Email**: `admin@fighterstoken.com`
- **Password**: `AdminPassword123!`
- **TOTP 2FA Secret**: `JBSWY3DPEHPK3PXP`
*(Add this secret code to Google Authenticator / Authy or your authenticator app of choice)*

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the homepage, or [http://localhost:3000/admin](http://localhost:3000/admin) to log in.

---

## 🗄️ Database Schema

- **`Admin`**: Stores administrative credentials, hashed passwords (bcrypt), TOTP secret, and 2FA status.
- **`Round`**: Manages spin configurations, token ranges, statuses (`WAITING`, `SPINNING`, `COMPLETED`), start times, duration, seeds, and commit hashes.
- **`RoundExclusion`**: Relational table tracking excluded tokens for each round.
- **`Winner`**: Records drawn numbers, order (1st, 2nd, etc.), and timestamp.
- **`SpinLog`**: Tamper-proof audit logs of all spin executions with client IPs and commit hashes.
- **`AuditLog`**: System-wide administrative action logs.

---

## 🧪 Running Unit Tests

The test suite covers:
1. Sequential eligible token list generation and exclusion handling.
2. No-repeat winner selection from eligible pools.
3. Cryptographic SHA-256 commit hash generation, verification, and tamper detection.
4. Input bounds and range validation (Zod & engine level).

Execute tests with Vitest:
```bash
npm test
```

---

## 🚢 Deploying to Vercel

### Step 1: Set up PostgreSQL on Supabase or Neon
1. Create a free PostgreSQL database on [Supabase](https://supabase.com) or [Neon](https://neon.tech).
2. Copy the Connection Pooling URL (Port 6543 for Supabase with `?pgbouncer=true`, or standard Neon connection string).

### Step 2: Push Database Schema
From your local terminal with the remote connection string:
```bash
DATABASE_URL="postgresql://..." npx prisma db push
DATABASE_URL="postgresql://..." npm run seed
```

### Step 3: Deploy via Vercel CLI or Web Console
1. **Using Vercel CLI**:
   ```bash
   npx vercel
   ```
2. Configure the environment variables in the Vercel Dashboard (**Settings > Environment Variables**):
   - `DATABASE_URL`: Your production PostgreSQL URL.
   - `SESSION_SECRET`: A secure 32+ character random secret string.
   - `NEXT_PUBLIC_APP_URL`: Your Vercel deployment URL (e.g. `https://fighters-token-spin.vercel.app`).
3. Deploy to production:
   ```bash
   npx vercel --prod
   ```

---

## 🔒 Security Best Practices Implemented
- **CSPRNG**: Never uses `Math.random()`; strictly uses Node `crypto.randomInt`.
- **Pre-Commitment**: Winning numbers are hashed before animation starts, proving the outcome was decided upfront without manipulation.
- **Server-Side Session Validation**: All administrative mutations verify the signed HttpOnly cookie.
- **Rate-Limiting & Mutex Locks**: Spin endpoints feature concurrency locks preventing duplicate spins and rapid-fire replay attacks.
- **Input Sanitization**: Strict Zod schemas guard every route against negative ranges, invalid exclusions, or malformed payloads.
