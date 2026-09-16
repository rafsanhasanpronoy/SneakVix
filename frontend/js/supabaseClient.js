// supabaseClient.js — direct browser uploads to Supabase Storage for the admin panel.
// Requires the Supabase JS SDK <script> tag to be loaded before this file.

const SUPABASE_URL = "https://gargfwngcvmoggilbvfl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdhcmdmd25nY3Ztb2dnaWxidmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTUzODMsImV4cCI6MjA5MTA3MTM4M30.71kk9KdUM8tMIgXS3c-_BQT8n5HoAtctvvXSpjblZOo"; // Project Settings → API → "anon public"
const SUPABASE_BUCKET = "sneaker";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

 
async function uploadProductImage(file) {
  const ext = file.name.split(".").pop();
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(SUPABASE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabaseClient.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
