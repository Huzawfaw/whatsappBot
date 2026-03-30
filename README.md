# 🏥 Vcure WhatsApp Bot + Admin Dashboard

A complete WhatsApp Business bot with a clean admin dashboard for **Vcure** healthcare platform.

---

## ✨ Features

### Bot Features
- 🤖 **Automated responses** for appointments, services, emergencies
- 📝 **Complaint registration** with ticket IDs
- 👤 **Human handoff** — escalate to a support agent
- ⚡ **Quick replies** — keyword-triggered auto-responses
- 🔄 **State machine** — tracks conversation context

### Admin Dashboard
- 💬 **All conversations** in real-time with chat view
- 🙋 **Needs Agent queue** — see who's waiting for human support
- 📝 **Complaints tracker** — manage and resolve complaints
- ⚡ **Quick Reply editor** — add/remove keyword triggers
- 📊 **Dashboard stats** — messages, active chats, complaints
- 📤 **Send messages** directly from dashboard
- 📌 **Notes** per conversation
- 🏷️ **Status tracking** — active/pending/resolved

---

## 🚀 Setup

### 1. Install Dependencies

```bash
cd vcure-whatsapp-bot
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_VERIFY_TOKEN=vcure_webhook_token_2024
PORT=3000
```

### 3. Get WhatsApp Credentials from Meta

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Open your App → **WhatsApp → API Setup**
3. Copy **Phone Number ID**
4. Generate a **Permanent Access Token** (System User with WhatsApp permission)

### 4. Start the Server

```bash
npm start
# or for development:
npm run dev
```

### 5. Expose to Internet (for Webhook)

Use **ngrok** for testing:
```bash
ngrok http 3000
```
Your webhook URL will be: `https://xxxx.ngrok.io/webhook`

For production, deploy on a server with a domain.

### 6. Configure Meta Webhook

In Meta Developer Console → WhatsApp → Configuration:
- **Webhook URL**: `https://your-domain.com/webhook`
- **Verify Token**: `vcure_webhook_token_2024`
- **Subscribe to**: `messages`

### 7. Access Admin Dashboard

Open: `http://localhost:3000/admin`

---

## 🤖 Bot Conversation Flow

```
User sends message
        ↓
   Greeting + Main Menu
        ↓
   ┌────┴────┐
   │ Options │
   └────┬────┘
   1. Book Appointment → Link to vcure.app/doctors
   2. Register Complaint → Type → Description → Ticket ID
   3. Service Info → List all Vcure services
   4. Emergency → Emergency link + alert
   5. Talk to Agent → Human handoff (bot goes silent)
```

When in **human handoff mode**:
- Bot stops auto-responding
- Conversation appears in **Needs Agent** queue
- Admin replies manually from dashboard
- Mark as resolved when done

---

## 📁 File Structure

```
vcure-whatsapp-bot/
├── server.js          # Express app entry point
├── bot.js             # Bot logic + state machine
├── db.js              # SQLite database setup
├── whatsapp.js        # WhatsApp API helper
├── routes/
│   ├── webhook.js     # Meta webhook handler
│   └── admin.js       # Admin API endpoints
├── public/
│   └── index.html     # Admin dashboard (single file)
├── .env.example       # Environment template
└── package.json
```

---

## 🌐 Deployment

### Deploy on Railway / Render / VPS

1. Push code to GitHub
2. Connect to Railway or Render
3. Set environment variables
4. Deploy — they give you a public URL automatically

### On a VPS (Ubuntu)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Start bot
pm2 start server.js --name vcure-bot
pm2 save
pm2 startup
```

---

## ⚡ Quick Reply Examples

Add these from the dashboard under **Quick Replies**:

| Keyword | Response |
|---------|----------|
| `timings` | Opening hours |
| `fee` | Consultation fee info |
| `doctor` | How to find doctors |
| `lab` | Lab test info |
| `pharmacy` | Medicine delivery info |

---

## 📞 Support

For help with the bot, contact your developer or check the [WhatsApp Business API docs](https://developers.facebook.com/docs/whatsapp).
