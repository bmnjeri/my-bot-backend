const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3000;

// ==================== YOUR SUPABASE CREDENTIALS (only here, never in extension) ====================
const SUPABASE_URL = 'https://osvjixhymjbasfasprzz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdmppeGh5bWpiYXNmYXNwcnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTc0OTksImV4cCI6MjA4OTQ5MzQ5OX0.qs0rFF-Fl-j2x4YcgSC9-3_X0OcBiANzrbbvAPq4RlM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== THE MAIN CHECK FUNCTION ====================
async function isQueueValid(queueId) {
  // 1. Fetch the client record from Supabase
  const { data, error } = await supabase
    .from('client_access')
    .select('*')
    .eq('queue_id', queueId)
    .single();

  if (error || !data) {
    console.log(`❌ Queue ${queueId} not found in Supabase`);
    return false;
  }

  // 2. Check if active
  if (!data.is_active) {
    console.log(`❌ Queue ${queueId} is inactive`);
    return false;
  }

  // 3. Check if subscription not expired
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  if (today > data.expiry_date) {
    console.log(`❌ Queue ${queueId} subscription expired on ${data.expiry_date}`);
    return false;
  }

  console.log(`✅ Queue ${queueId} is valid (active until ${data.expiry_date})`);
  return true;
}

// ==================== THE WEB ENDPOINT ====================
app.get('/check', async (req, res) => {
  const queueId = req.query.queue_id;

  if (!queueId) {
    return res.status(400).json({ error: 'Missing queue_id parameter' });
  }

  const valid = await isQueueValid(queueId);
  res.json({ valid: valid });
});

// ==================== START THE SERVER ====================
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
  console.log(`👉 Example test URL: http://localhost:3000/check?queue_id=YOUR_QUEUE_ID_HERE`);
});