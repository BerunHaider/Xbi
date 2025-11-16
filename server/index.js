const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const speakeasy = require('speakeasy');

const app = express();

// CORS configuration: restrict to allowed origins
const corsOptions = {
  origin: function (origin, callback) {
    const allowed = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://0.0.0.0:3000',
      'https://codespaces-react-g1w3.onrender.com',
      process.env.FRONTEND_URL || 'http://localhost:3000'
    ];
    
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/verify-totp
// body: { user_id: string, token: string }
app.post('/api/verify-totp', async (req, res) => {
  const { user_id, token } = req.body;
  
  // Input validation
  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id must be a non-empty string' });
  }
  if (!token || typeof token !== 'string' || !/^\d{6}$/.test(token)) {
    return res.status(400).json({ error: 'token must be a 6-digit string' });
  }

  try {
    // Verify environment
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const { data, error } = await supabase
      .from('user_2fa')
      .select('secret')
      .eq('user_id', user_id)
      .single();

    if (error) {
      console.error('DB error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (!data) {
      return res.status(404).json({ ok: false, message: '2FA not enabled for user' });
    }

    const secret = data.secret;
    if (!secret) {
      return res.status(500).json({ error: 'Secret not found' });
    }

    // Verify TOTP token with 30s window
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1 // ±30 seconds
    });

    return res.json({ ok: !!verified });
  } catch (err) {
    console.error('Verify TOTP error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`✓ TOTP server listening on port ${port}`);
  console.log(`✓ FRONTEND_URL: ${process.env.FRONTEND_URL || 'not set'}`);
  console.log(`✓ Health check: GET /health`);
});
