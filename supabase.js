// Supabase client setup. Only the project URL and the public "anon" key belong here.
// NEVER put the service_role key in frontend code.
const SUPABASE_URL = "https://zkfttegqozkkldvdsxio.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprZnR0ZWdxb3pra2xkdmRzeGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNzI3NzgsImV4cCI6MjEwNjY0ODc3OH0.7z0lhQ16_0Z63jk_0zp8jNZdvKLxgXXD1EDOFRjxTVs";

// `window.supabase` comes from the CDN script loaded in index.html.
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
