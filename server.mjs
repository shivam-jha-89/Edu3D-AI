// HoloLearn AI - Zero-dependency server with static hosting & AI Tutor endpoint
// Run: node server.mjs [port] -> http://localhost:5173
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));

// Load .env if present
const envPath = join(ROOT, '.env');
if (existsSync(envPath)) {
  try {
    const envContent = readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch (err) {
    console.warn('[HoloLearn] Could not parse .env file:', err.message);
  }
}

const PORT = Number(process.argv[2] || process.env.PORT || 5173);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.task': 'application/octet-stream',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

async function handleAITutor(body) {
  const { model = '', component = '', question = '', level = 'intermediate', metadata = {} } = body;
  const apiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  if (!apiKey && !openAiKey) {
    return {
      ok: true,
      available: false,
      message: 'AI TUTOR UNAVAILABLE - Add an AI provider key to enable interactive explanations.',
      answer: 'AI TUTOR UNAVAILABLE - Add an AI provider key to enable interactive explanations.',
      model,
      component,
      level,
      provider: 'offline',
    };
  }

  const systemPrompt = `You are Holo Tutor, a futuristic, inspiring, and scientifically precise educational AI for HoloLearn AI ("Touch Knowledge. Explore Reality.").
Students interact with you while exploring 3D interactive models and GPU particle simulations using hand gestures.
Your goal is to provide clear, structured, and engaging educational explanations tailored to the student's level.

Target Educational Level: ${level.toUpperCase()}
- Beginner: Use clear concepts, intuitive real-world analogies, and accessible vocabulary (elementary/middle school).
- Intermediate: Use standard scientific/engineering terminology, cause-and-effect relationships, and functional mechanisms (high school/undergrad).
- Advanced: Detail precise anatomical, biochemical, physiological, or thermodynamic mechanisms, formulas if relevant, and clinical/engineering significance (advanced/professional).

Format Guidelines:
- Keep the response concise and readable in a holographic HUD side panel (under 120 words).
- Highlight key terms with clear explanations.
- End with one thought-provoking follow-up question or observation to encourage deeper exploration.`;

  const userPrompt = `Current Model: "${model || 'Interactive Model'}"
${component ? `Selected Component: "${component}"` : 'No specific component selected.'}
${metadata.info ? `Component Overview: "${metadata.info}"` : ''}

Student Question: "${question || 'Explain what this is and how it works.'}"`;

  try {
    if (apiKey) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 350,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[HoloLearn AI Tutor Error]', response.status, errorText);
        return {
          available: false,
          message: `AI Tutor service error (${response.status}). Please check API key status and quotas.`,
          error: errorText,
        };
      }

      const data = await response.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
      return {
        available: true,
        answer,
        model,
        component,
        level,
      };
    } else if (openAiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 350,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          available: false,
          message: `AI Tutor service error (${response.status}).`,
          error: errorText,
        };
      }

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content || 'No response generated.';
      return {
        available: true,
        answer,
        model,
        component,
        level,
      };
    }
  } catch (err) {
    console.error('[HoloLearn AI Tutor Fetch Exception]', err);
    return {
      available: false,
      message: 'AI Tutor network error. Please verify your internet connection and API key.',
      error: err.message,
    };
  }
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');

    // API: AI Tutor endpoint
    if (url.pathname === '/api/tutor' && req.method === 'POST') {
      let raw = '';
      req.on('data', (chunk) => { raw += chunk; });
      req.on('end', async () => {
        try {
          const body = JSON.parse(raw || '{}');
          const result = await handleAITutor(body);
          res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ available: false, message: 'Invalid JSON payload' }));
        }
      });
      return;
    }

    // API: System status
    if (url.pathname === '/api/status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({
        ok: true,
        app: 'HoloLearn AI',
        product: 'HoloLearn AI',
        status: 'online',
        version: '2.0.0',
        catalogSize: 33,
        aiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY),
      }));
      return;
    }

    // Static file serving
    let path = normalize(join(ROOT, decodeURIComponent(url.pathname)));
    if (!path.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
    if ((await stat(path).catch(() => null))?.isDirectory()) path = join(path, 'index.html');
    const body = await readFile(path);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(path).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
  }
}).listen(PORT, () => console.log(`HoloLearn AI running at http://localhost:${PORT}`));
