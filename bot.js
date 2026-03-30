const db = require('./db');
const { sendMessage } = require('./whatsapp');

const STATES = {
  GREETING: 'greeting',
  MAIN_MENU: 'main_menu',
  COMPLAINT_TYPE: 'complaint_type',
  COMPLAINT_DETAILS: 'complaint_details',
  HUMAN_HANDOFF: 'human_handoff',
};

const GREETING_MSG = (name) => `👋 *Assalam u Alaikum${name ? ', ' + name : ''}!*\n\nWelcome to *Vcure* — Pakistan's trusted healthcare platform. 🏥\n\nHow can we help you today?`;

const MAIN_MENU = `Please choose an option:\n\n1️⃣  Book Appointment\n2️⃣  Register a Complaint\n3️⃣  Service Information\n4️⃣  Emergency Help\n5️⃣  Talk to Support Agent\n\nReply with the *number* or keyword.`;

const SERVICE_INFO = `📋 *Vcure Services*\n\n🩺 *Online Consultation* — Video/call with verified doctors\n🏠 *Home Visit* — Doctor visits your home\n🚨 *24/7 Urgent Care* — Emergency online care\n🏥 *In-Clinic Visit* — Book at a clinic near you\n💊 *Online Pharmacy* — Medicine delivery\n🧪 *Lab Tests* — Book lab tests at home\n\n👉 Visit: https://www.vcure.app`;

const BOOK_INFO = `📅 *Book an Appointment*\n\nYou can easily book through our website:\n👉 https://www.vcure.app/doctors\n\nSearch by:\n• Specialization\n• Doctor Name\n• Location\n\nNeed help? Reply *agent* to talk to a support agent.`;

const EMERGENCY = `🚨 *Emergency & Urgent Care*\n\nFor immediate medical help:\n👉 https://www.vcure.app/emergency\n\n🆘 *Call 115/1122* for life-threatening emergencies.`;

const COMPLAINT_MENU = `📝 *Register a Complaint*\n\nWhat type of complaint?\n\n1️⃣  Appointment Issue\n2️⃣  Doctor Conduct\n3️⃣  Payment / Billing\n4️⃣  App / Website Issue\n5️⃣  Other\n\nReply with the number.`;

const COMPLAINT_PROMPT = `Please *describe your complaint* in detail.\n\nInclude:\n• Appointment date/time (if applicable)\n• Doctor name (if applicable)\n• What went wrong\n\nWe will respond within *24 hours*. 🙏`;

const HANDOFF_MSG = `🙋 *Connecting you to a Support Agent*\n\nOur team will respond shortly.\n⏰ Mon–Sat: 9 AM – 9 PM\n⏰ Sunday: 10 AM – 6 PM\n\nPlease wait and keep this chat open. 🙏`;

const complaintTypes = { '1':'Appointment Issue','2':'Doctor Conduct','3':'Payment / Billing','4':'App / Website Issue','5':'Other' };

function getSession(phone) {
  const row = db.sessions.find(r => r.phone === phone);
  return row ? { state: row.state, context: row.context || {} } : { state: STATES.GREETING, context: {} };
}

function saveSession(phone, state, context = {}) {
  db.sessions.upsert(r => r.phone === phone, { phone, state, context, updated_at: new Date().toISOString() });
}

function getOrCreateConversation(phone, contactName) {
  let conv = db.conversations.find(r => r.phone === phone);
  if (!conv) {
    conv = db.conversations.insert({ phone, contact_name: contactName || phone, status: 'active', last_message_at: new Date().toISOString(), tags: null, is_read: 0 });
  } else {
    db.conversations.update(conv.id, { last_message_at: new Date().toISOString(), is_read: 0, ...(contactName && !conv.contact_name ? { contact_name: contactName } : {}) });
    conv = db.conversations.get(conv.id);
  }
  return conv;
}

function saveMessage(convId, phone, direction, content, waId) {
  db.messages.insert({ conversation_id: convId, phone, direction, content, wa_message_id: waId || null, timestamp: new Date().toISOString() });
}

function checkQuickReply(text) {
  const lower = text.toLowerCase().trim();
  for (const qr of db.quickReplies.filter(r => r.is_active === 1)) {
    if (lower.includes(qr.trigger_keyword.toLowerCase())) return qr.response_text;
  }
  return null;
}

async function sendAndSave(convId, phone, text) {
  await sendMessage(phone, text);
  saveMessage(convId, phone, 'outbound', text, null);
}

async function handleIncoming(phone, text, contactName, waMessageId) {
  const conv = getOrCreateConversation(phone, contactName);
  saveMessage(conv.id, phone, 'inbound', text, waMessageId);
  const session = getSession(phone);
  if (session.state === STATES.HUMAN_HANDOFF) return;
  if (session.state === STATES.MAIN_MENU) {
    const qr = checkQuickReply(text);
    if (qr) { await sendAndSave(conv.id, phone, qr); return; }
  }
  const input = text.trim().toLowerCase();
  switch (session.state) {
    case STATES.GREETING:
      await sendAndSave(conv.id, phone, GREETING_MSG(contactName));
      await sendAndSave(conv.id, phone, MAIN_MENU);
      saveSession(phone, STATES.MAIN_MENU);
      break;
    case STATES.MAIN_MENU:
      if (input==='1'||input.includes('book')||input.includes('appointment')) { await sendAndSave(conv.id,phone,BOOK_INFO); }
      else if (input==='2'||input.includes('complaint')) { await sendAndSave(conv.id,phone,COMPLAINT_MENU); saveSession(phone,STATES.COMPLAINT_TYPE); }
      else if (input==='3'||input.includes('service')||input.includes('info')) { await sendAndSave(conv.id,phone,SERVICE_INFO); }
      else if (input==='4'||input.includes('emergency')||input.includes('urgent')) { await sendAndSave(conv.id,phone,EMERGENCY); }
      else if (input==='5'||input.includes('agent')||input.includes('human')||input.includes('support')) {
        await sendAndSave(conv.id,phone,HANDOFF_MSG);
        saveSession(phone,STATES.HUMAN_HANDOFF);
        db.conversations.update(conv.id,{tags:'needs_agent',status:'pending'});
      } else if (['menu','hi','hello','start','hey','salam'].some(w=>input.includes(w))) { await sendAndSave(conv.id,phone,MAIN_MENU); }
      else { await sendAndSave(conv.id,phone,`Sorry, I didn't understand that. 😊\n\nReply *menu* to see all options, or type *agent* to talk to a human.`); }
      break;
    case STATES.COMPLAINT_TYPE: {
      const type = complaintTypes[input];
      if (type) { saveSession(phone,STATES.COMPLAINT_DETAILS,{complaintType:type}); await sendAndSave(conv.id,phone,COMPLAINT_PROMPT); }
      else { await sendAndSave(conv.id,phone,`Please reply with a number 1–5.\n\n${COMPLAINT_MENU}`); }
      break;
    }
    case STATES.COMPLAINT_DETAILS: {
      db.complaints.insert({ conversation_id:conv.id, phone, complaint_type:session.context.complaintType||'Other', description:text, status:'open', priority:'normal' });
      const ticketId = `VCR-${String(Date.now()).slice(-6)}`;
      await sendAndSave(conv.id,phone,`✅ *Complaint Registered!*\n\nTicket ID: *${ticketId}*\nType: ${session.context.complaintType}\n\nOur team will respond within *24 hours*.\n\nReply *menu* to go back.`);
      saveSession(phone,STATES.MAIN_MENU);
      break;
    }
    default:
      await sendAndSave(conv.id,phone,GREETING_MSG(contactName));
      await sendAndSave(conv.id,phone,MAIN_MENU);
      saveSession(phone,STATES.MAIN_MENU);
  }
}

async function sendAdminReply(phone, text, adminName) {
  const conv = getOrCreateConversation(phone, null);
  await sendMessage(phone, text);
  saveMessage(conv.id, phone, 'outbound', `[${adminName||'Support'}]: ${text}`, null);
  db.conversations.update(conv.id, { last_message_at: new Date().toISOString() });
}

module.exports = { handleIncoming, sendAdminReply };
