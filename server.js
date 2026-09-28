const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const AGNES_API_KEY = process.env.AGNES_API_KEY;
const AGNES_BASE_URL = 'https://apihub.agnes-ai.com';
const AGNES_MODEL = 'agnes-video-2.5-flash';

app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'AI Video Generator API is running',
    version: '4.0',
    model: AGNES_MODEL,
    keySet: !!AGNES_API_KEY
  });
});

app.post('/api/generate-video', async (req, res) => {
  const { prompt, seconds, aspect_ratio } = req.body || {};
  if (!prompt) return res.status(400).json({ ok: false, error: 'Prompt is required' });

  try {
    console.log('[Agnes] Creating task:', prompt.substring(0, 60));
    const response = await fetch(`${AGNES_BASE_URL}/v1/videos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AGNES_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: AGNES_MODEL,
        prompt: prompt,
        seconds: seconds || '5',
        mode: 'text',
        size: '720P',
        aspect_ratio: aspect_ratio || '16:9'
      })
    });

    const data = await response.json();
    console.log('[Agnes] Response:', JSON.stringify(data).substring(0, 200));

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: (data.error && data.error.message) || data.error || 'Agnes API error'
      });
    }

    res.json({
      ok: true,
      video_id: data.video_id || data.id,
      task_id: data.task_id || data.id,
      status: data.status,
      model: data.model
    });
  } catch (err) {
    console.error('[Agnes] Error:', err.message);
    res.status(500).json({ ok: false, error: 'Server error: ' + err.message });
  }
});

app.get('/api/video-status/:videoId', async (req, res) => {
  const { videoId } = req.params;
  try {
    const response = await fetch(
      `${AGNES_BASE_URL}/agnesapi?video_id=${videoId}&model_name=${AGNES_MODEL}`,
      { headers: { 'Authorization': `Bearer ${AGNES_API_KEY}` } }
    );
    const data = await response.json();
    console.log('[Agnes] Status:', data.status, data.progress + '%');

    res.json({
      ok: true,
      status: data.status,
      progress: data.progress || 0,
      video_url: (data.metadata && data.metadata.url) || null,
      error: data.error || null
    });
  } catch (err) {
    console.error('[Agnes] Status error:', err.message);
    res.status(500).json({ ok: false, error: 'Status check failed: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Server] Agnes Key: ${AGNES_API_KEY ? 'SET' : 'MISSING!'}`);
});
