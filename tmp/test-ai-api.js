
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const API_KEY = env.PAXSENIX_API_KEY;

async function testApi(model, prompt, ratio) {
  const url = new URL(`https://api.paxsenix.org/ai-image/${model}`);
  url.searchParams.set('prompt', prompt);
  if (ratio) url.searchParams.set('ratio', ratio);
  
  console.log(`Testing URL: ${url.toString()}`);
  
  try {
    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    
    console.log(`Status: ${res.status} ${res.statusText}`);
    const contentType = res.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);
    
    if (contentType.includes('application/json')) {
      const data = await res.json();
      console.log('Response Body:', JSON.stringify(data, null, 2));
    } else {
      console.log('Response is binary/not JSON');
    }
  } catch (err) {
    console.error('Fetch Error:', err);
  }
}

const model = process.argv[2] || 'nano-banana';
const prompt = process.argv[3] || 'cat';
const ratio = process.argv[4] || '16:9';

testApi(model, prompt, ratio);
