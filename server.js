const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== HMAC SECRET (from environment variable) ==========
const SECRET = process.env.HMAC_SECRET;
if (!SECRET) {
  console.error('FATAL: HMAC_SECRET environment variable is not set.');
  process.exit(1);
}

// CORS middleware (allows any origin)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const SUPABASE_URL = 'https://osvjixhymjbasfasprzz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdmppeGh5bWpiYXNmYXNwcnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTc0OTksImV4cCI6MjA4OTQ5MzQ5OX0.qs0rFF-Fl-j2x4YcgSC9-3_X0OcBiANzrbbvAPq4RlM';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== FocusForward: check by queue_id ==========
async function isQueueValid(queueId) {
  const { data, error } = await supabase
    .from('client_access')
    .select('*')
    .eq('queue_id', queueId)
    .single();
  if (error || !data) return false;
  if (!data.is_active) return false;
  const today = new Date().toISOString().split('T')[0];
  if (today > data.expiry_date) return false;
  return true;
}

// ========== Verbit: check by email ==========
async function isEmailValid(email) {
  const { data, error } = await supabase
    .from('verbit_clients')
    .select('*')
    .eq('email', email)
    .single();
  if (error || !data) return false;
  if (!data.is_active) return false;
  const today = new Date().toISOString().split('T')[0];
  if (today < data.subscription_start || today > data.subscription_end) return false;
  return true;
}

// HMAC signature helper
function sign(data) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('hex');
}

// ========== Endpoint for FocusForward (queue ID) ==========
app.get('/check', async (req, res) => {
  const queueId = req.query.queue_id;
  if (!queueId) return res.status(400).json({ error: 'Missing queue_id' });

  const valid = await isQueueValid(queueId);
  const timestamp = Date.now();
  const dataToSign = `${queueId}:${valid}:${timestamp}`;
  const signature = sign(dataToSign);

  res.json({ valid, timestamp, signature });
});

// ========== New endpoint for Verbit (email) ==========
app.get('/check-verbit', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'Missing email' });

  const valid = await isEmailValid(email);
  const timestamp = Date.now();
  const dataToSign = `${email}:${valid}:${timestamp}`;
  const signature = sign(dataToSign);

  res.json({ valid, timestamp, signature });
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));