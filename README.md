# Admin Dashboard — Management & Chat Frontend

Full-featured admin panel with real-time chat. User/company/department management, 1:1 and group messaging, support queue management, compliance monitoring, and activity logging.

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** (dark mode support)
- **Zustand** (state management)
- **Socket.IO Client** (dual socket — NestJS + FastAPI)
- **React Query** (server state)
- **Lucide React** (icons)

## Quick Start

```bash
npm install

# Create .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_CHAT_API_URL=http://localhost:8006
NEXT_PUBLIC_CHAT_SOCKET_URL=http://localhost:8006
EOF

npm run dev -- -p 3001
```

## Pages & Route Permissions

| Route | Page | Roles |
|-------|------|-------|
| `/login` | Login | Public |
| `/dashboard` | Dashboard home | All authenticated |
| `/dashboard/companies` | Company management | super_admin |
| `/dashboard/departments` | Department management | super_admin, company_admin |
| `/dashboard/users` | User management | super_admin, company_admin, manager |
| `/dashboard/roles` | Role management | super_admin |
| `/dashboard/activity-logs` | Activity logs | super_admin, company_admin |
| `/dashboard/active-sessions` | Session monitor | super_admin, company_admin |
| `/dashboard/settings` | User settings | All |
| `/dashboard/compliance` | Compliance monitoring | All |
| `/dashboard/support` | Support queue | super_admin, company_admin, manager, user |

## Features

### Management

- **User CRUD** — Create, update, delete, assign roles (scoped by caller's role)
- **Company CRUD** — super_admin only
- **Department CRUD** — Company-scoped
- **Role Management** — Primary + secondary roles
- **Activity Logs** — View forbidden access audit trail
- **Dark Mode** — Toggle with localStorage persistence

### Chat — 1:1 Direct Messaging

- Real-time send/receive via WebSocket
- Message status: Sending → Sent → Delivered → Read (tick indicators)
- Typing indicators with debounce
- Offline message delivery on reconnect
- Delete for self or delete for everyone (time-windowed)
- Encryption indicator on encrypted messages
- Optimistic sending (tempId → realId)

### Chat — Group Messaging

- Create groups with name, members, avatar
- Admin: rename, change avatar, add/remove members
- Members: send messages, leave (designate new admin)
- Per-member delivery and read receipts
- Message info modal (delivered-to, read-by, pending)
- WhatsApp-style system messages (added, removed, left, admin changed)

### Chat — @Mentions

- Type `@` for autocomplete dropdown
- `@all` to mention all group members
- Highlighted rendering with self-mention accent
- Position-based data: `{userId, displayName, position, length}`

### Chat — Attachments & Voice

- Images, videos, documents — preview before send
- Voice notes — in-browser recording, waveform visualization, playback
- File size validation (client + server)

### Support Queue Management

- **Three-tab view:** Waiting (amber), Active (green), Resolved (gray)
- **Actions:** Accept (waiting), Resolve (active)
- **Customer info panel:** Name, email, phone, online status, conversation history
- **Notifications:** Sound + browser alerts on new queue items
- **Search/filter** by customer name or email

### Compliance Monitoring

- View scoped user lists within officer's policy
- Read decrypted messages (access audited server-side)
- Audit trail visibility

## Dual Socket Architecture

| Socket | Target | Purpose |
|--------|--------|---------|
| Main Socket | NestJS (:3001) | Notifications, auth events |
| Chat Socket | FastAPI (:8006) | All messaging, typing, presence |

## State Stores (Zustand)

| Store | Key State |
|-------|-----------|
| Auth | user, isAuthenticated, primaryRole |
| Chat | conversations, messages, activeConversation |
| Group Chat | groups, messages, activeGroup, typingUsers |
| Notification | notifications, unreadCount |
| UI | openOverlayCount |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Production server |
| `npm run lint` | ESLint |

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | NestJS core API URL | `http://localhost:3000` |
| `NEXT_PUBLIC_SOCKET_URL` | NestJS WebSocket URL | `http://localhost:3001` |
| `NEXT_PUBLIC_CHAT_API_URL` | FastAPI chat backend URL | `http://localhost:8006` |
| `NEXT_PUBLIC_CHAT_SOCKET_URL` | FastAPI chat WebSocket URL | `http://localhost:8006` |

### Development

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_CHAT_API_URL=http://localhost:8006
NEXT_PUBLIC_CHAT_SOCKET_URL=http://localhost:8006
```

### Production Deployment

`NEXT_PUBLIC_` variables are **baked into the JavaScript bundle at build time** — they are not read at runtime. You must set them **before** running `npm run build`.

**Option A — .env.local file on the server:**

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
NEXT_PUBLIC_CHAT_API_URL=https://chat-api.yourdomain.com
NEXT_PUBLIC_CHAT_SOCKET_URL=https://chat-api.yourdomain.com
EOF

npm run build
npm start
```

**Option B — System environment variables:**

```bash
export NEXT_PUBLIC_API_URL=https://api.yourdomain.com
export NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
export NEXT_PUBLIC_CHAT_API_URL=https://chat-api.yourdomain.com
export NEXT_PUBLIC_CHAT_SOCKET_URL=https://chat-api.yourdomain.com

npm run build
npm start
```

> **Important:** If you change any `NEXT_PUBLIC_` variable, you must **rebuild** (`npm run build`) for the change to take effect.

## Related Projects

| Project | Purpose |
|---------|---------|
| [nest-postgres-db-first-cookie-based](../nest-postgres-db-first-cookie-based) | Core API (auth, users, companies) |
| [fastapi-chat](../fastapi-chat) | Chat microservice (messages, groups, support) |
| [support-chat-widget](../support-chat-widget) | Customer chat widget |
