/* ==========================================================================
   Supabase Auth Client Configuration for User Login
   ========================================================================== */

const SUPABASE_URL = 'https://jkcgutjknjykqasenwqq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_PtBOjVSdVe4eKPfBDE8y6g_RUGPzvG6';

// Initialize and export the Supabase JS client
export const supabase = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;
