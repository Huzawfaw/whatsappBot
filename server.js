const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const webhookRouter = require('./routes/webhook');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/webhook', webhookRouter);
app.use('/api/admin', adminRouter);

// Admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Vcure WhatsApp Bot running on port ${PORT}`);
  console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
});
