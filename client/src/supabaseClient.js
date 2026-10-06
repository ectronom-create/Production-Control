import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jmlpesgvewubbtsetkov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbHBlc2d2ZXd1YmJ0c2V0a292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MTM0MzUsImV4cCI6MjEwNjE4OTQzNX0.lnIuMq8v0Y5xG_dMzzJojk-CI5pj_WbWOrqXn93xupk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
