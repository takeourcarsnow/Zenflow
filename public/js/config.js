// Supabase client config (safe to expose anon key if RLS policies are in place)
// See README for details on securing your database with RLS.
window.SUPABASE_CONFIG = {
  url: 'https://fiamdsxeoucpzbsmghdl.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpYW1kc3hlb3VjcHpic21naGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTI5MjAsImV4cCI6MjA3NDEyODkyMH0.i3-nkqgQAUA-seFW0eGLkpuc8Ia2UPrEQP16VXrfLpo',
  // Optional: schema and table names
  schema: 'public',
  table: 'boards'
};
