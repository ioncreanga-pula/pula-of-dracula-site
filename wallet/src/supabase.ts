import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fshacgavnzseligqsvwn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzaGFjZ2F2bnpzZWxpZ3FzdnduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MjU3MzAsImV4cCI6MjA5MTIwMTczMH0.QTCK2uz0kXVbOn0GO0KeqMFCzmVkbQI-6_TL2TqY-YA';

export let supabase: any;

try {
  if (supabaseUrl.startsWith('http')) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    console.warn("Supabase nu este configurat corect.");
    supabase = null;
  }
} catch (e) {
  console.error("Eroare la initializarea Supabase:", e);
  supabase = null;
}
