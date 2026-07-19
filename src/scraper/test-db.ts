import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manual env parser
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseKey.length);

const cleanedUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '');
console.log('Cleaned URL:', cleanedUrl);

const supabase = createClient(cleanedUrl, supabaseKey);

async function test() {
  try {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Database error:', error);
    } else {
      console.log('✅ Connection successful!');
      console.log('Rows found:', data?.length);
      console.log('Sample data:', data);
    }
  } catch (err) {
    console.error('❌ Connection exception:', err);
  }
}

test();
