/**
 * Pure JavaScript JSON database — no native modules, works on any Node version.
 * Data is saved to vcure_bot_data/ folder as JSON files.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'vcure_bot_data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── File-based store ──────────────────────────────────────────────────────────

function loadStore(name) {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

function saveStore(name, data) {
  const file = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function nextId(rows) {
  return rows.length === 0 ? 1 : Math.max(...rows.map(r => r.id)) + 1;
}

function now() { return new Date().toISOString(); }

// ── Generic table class ───────────────────────────────────────────────────────

class Table {
  constructor(name) {
    this.name = name;
    this._rows = loadStore(name);
  }

  _save() { saveStore(this.name, this._rows); }

  all() { return [...this._rows]; }

  get(id) { return this._rows.find(r => r.id === Number(id)) || null; }

  find(predicate) { return this._rows.find(predicate) || null; }

  filter(predicate) { return this._rows.filter(predicate); }

  insert(obj) {
    const row = { id: nextId(this._rows), created_at: now(), ...obj };
    this._rows.push(row);
    this._save();
    return row;
  }

  update(id, fields) {
    const idx = this._rows.findIndex(r => r.id === Number(id));
    if (idx === -1) return null;
    this._rows[idx] = { ...this._rows[idx], ...fields };
    this._save();
    return this._rows[idx];
  }

  updateWhere(predicate, fields) {
    let count = 0;
    this._rows = this._rows.map(r => {
      if (predicate(r)) { count++; return { ...r, ...fields }; }
      return r;
    });
    if (count) this._save();
    return count;
  }

  upsert(predicate, fields) {
    const idx = this._rows.findIndex(predicate);
    if (idx === -1) {
      return this.insert(fields);
    } else {
      this._rows[idx] = { ...this._rows[idx], ...fields };
      this._save();
      return this._rows[idx];
    }
  }

  delete(id) {
    const before = this._rows.length;
    this._rows = this._rows.filter(r => r.id !== Number(id));
    if (this._rows.length !== before) this._save();
  }

  count(predicate) {
    return predicate ? this._rows.filter(predicate).length : this._rows.length;
  }
}

// ── Tables ────────────────────────────────────────────────────────────────────

const db = {
  conversations: new Table('conversations'),
  messages:      new Table('messages'),
  sessions:      new Table('sessions'),
  complaints:    new Table('complaints'),
  quickReplies:  new Table('quick_replies'),
  notes:         new Table('notes'),
};

// ── Seed default quick replies ────────────────────────────────────────────────

const defaults = [
  ['hours',    '🕐 *Vcure Support Hours*\nMonday–Saturday: 9 AM – 9 PM\nSunday: 10 AM – 6 PM\n\nFor emergencies, visit: https://www.vcure.app/emergency'],
  ['pricing',  '💰 *Vcure Consultation Fees*\nOnline Consultation: Starting from PKR 500\nIn-Clinic Visit: Varies by doctor\nHome Visit: Starting from PKR 1,500\n\nBook now: https://www.vcure.app/doctors'],
  ['location', '📍 *Vcure Service Areas*\nWe serve multiple cities across Pakistan.\nFind doctors near you: https://www.vcure.app/doctors'],
];

defaults.forEach(([kw, resp]) => {
  const exists = db.quickReplies.find(r => r.trigger_keyword === kw);
  if (!exists) db.quickReplies.insert({ trigger_keyword: kw, response_text: resp, is_active: 1 });
});

module.exports = db;
