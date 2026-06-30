import { createClient } from '@supabase/supabase-js';

// Único cliente Supabase do lado do browser — usa a anon key pública
// (NEXT_PUBLIC_*). NUNCA a service role key (essa só existe em apps/api,
// doc 03 §9). Sessão persistida em localStorage pelo próprio SDK.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY não configurados.');
}

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);
