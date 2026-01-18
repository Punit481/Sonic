# Sonic - SPEAK IT, LOG IT

**Focus on your form, not your phone.**

Sonic lets you log workouts just by speaking. No typing, no fumbling with your phone between sets - just talk naturally about your workout and let our AI handle the rest.

## 🎥 See Sonic in Action

[![Watch Sonic Demo](https://img.shields.io/badge/-Watch%20Demo-red?style=for-the-badge&logo=youtube)](https://youtu.be/IN2hwlfNtHA)

## How Sonic Works

**From voice to insight in seconds**

### Step 1: Speak Your Workout

Just talk naturally about your exercises, sets, and reps. No typing required.
_"I did bench press today, 3 sets of 8 reps at 185 pounds"_

### Step 2: Structured And Stored

Our AI instantly converts your speech into structured workout data and saves it securely.

### Step 3: Get Insights

View every metric and receive smart AI suggestions to improve your training.

---

### The Tech Behind the Magic

### Frontend (React + TypeScript)

```
client/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── InteractiveContinuousChart.tsx  # Flexible charting component
│   │   ├── SideBar.tsx      # Voice input interface
│   │   └── MainDash.tsx     # Dashboard overview
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuthSync.tsx  # Authentication state management
│   │   ├── useGenericChart.ts # Chart data processing
│   │   └── useSummary.ts    # Fitness metrics calculations
│   ├── stores/              # Zustand state management
│   │   ├── userStore.ts     # Global user state
│   │   └── types.ts         # TypeScript definitions
│   ├── lib/                 # Utility functions
│   │   ├── charts.ts        # Chart data transformations
│   │   └── summary.ts       # Fitness calculations
│   └── pages/               # Route components
```

### Backend (Node.js + Express + TypeScript)

```
server/
├── src/
│   ├── controllers/         # Request handlers
│   │   ├── voicelogController.ts # AI-powered voice processing
│   │   ├── logsController.ts     # Workout CRUD operations
│   │   └── metricsController.ts  # Body metrics management
│   ├── middleware/          # Express middleware
│   │   └── auth.ts          # Clerk authentication
│   ├── routes/              # API route definitions
│   │   ├── logs.ts
│   │   ├── metrics.ts
│   │   └── voicelog.ts
│   ├── lib/                 # Utilities
│   │   └── prisma.ts        # Database client
│   └── prisma/              # Database schema and migrations
```

## Getting Started

**Ready to ditch the notepad? Let's get you set up.**

### What You'll Need

- Node.js 18+ and npm (the basics)
- A PostgreSQL database (where your gains live)
- Clerk account (keeps things secure)
- Google AI Studio account (powers the voice magic)

### Set It Up in 5 Minutes

1. **Grab the code**

   ```bash
   git clone <repository-url>
   cd sonic
   ```

2. **Install the good stuff**

   ```bash
   # Backend dependencies
   cd server
   npm install

   # Frontend dependencies
   cd ../client
   npm install
   ```

3. **Add your secret keys**

   **Server (.env)**

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/sonic_db"
   CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."
   GEMINI_API_KEY="your_gemini_api_key"
   PORT=4000
   ```

   **Client (.env)**

   ```env
   VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
   ```

4. **Set up your database**

   ```bash
   cd server
   npx prisma generate
   npx prisma db push
   ```

5. **Fire it up!**

   ```bash
   # Start the backend (Terminal 1)
   cd server
   npm run dev

   # Start the frontend (Terminal 2)
   cd client
   npm run dev
   ```

That's it! Open your browser and start talking to your workout tracker. 🎉

### API Endpoints

#### Authentication Required

- `GET /api/logs` - Retrieve workout logs
- `POST /api/logs` - Create workout log
- `GET /api/metrics` - Retrieve body metrics
- `POST /api/metrics` - Create body metric
- `POST /api/voice-log` - Process voice input

## 🛠️ What's Under the Hood

**For the curious developers:**

### Frontend Stack

- **React 18** with TypeScript (modern & type-safe)
- **Zustand** for state management (simple & powerful)
- **Recharts** for beautiful visualizations
- **Tailwind CSS** for clean styling
- **Clerk React** for hassle-free auth
- **React Speech Recognition** for voice magic

### Backend Power

- **Node.js** with Express and TypeScript
- **Prisma** ORM with PostgreSQL (type-safe database ops)
- **Clerk** authentication middleware
- **Google Gemini AI** for understanding natural language
- **CORS** enabled for seamless frontend-backend communication

## Want to Contribute?

**Found a bug? Have a cool idea? I'd love your help!**

1. Fork this repo
2. Create your feature branch (`git checkout -b feature/awesome-feature`)
3. Make your changes and test them
4. Commit with a clear message (`git commit -m 'feat: add awesome feature'`)
5. Push to your branch (`git push origin feature/awesome-feature`)
6. Open a Pull Request and tell us what you built!

## License

This project is MIT licensed. Basically, do what you want with it.
