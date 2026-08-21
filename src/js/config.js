// Configuração do Supabase
// Substitua com suas credenciais do painel do Supabase

export const SUPABASE_CONFIG = {
  url: 'https://mtiazjswknjqylsfrnye.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10aWF6anN3a25qcXlsc2ZybnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTk5NTEsImV4cCI6MjA5OTM5NTk1MX0.z4182-7QnXv_d9Y9c8dqp5AZhPTzKZldYPWDEnzhjhQ',
  photosBucket: 'fotos'
};

// Verificação se as credenciais estão configuradas
export const isSupabaseConfigured = () => {
  return SUPABASE_CONFIG.url && 
         SUPABASE_CONFIG.url !== 'https://your-project.supabase.co' &&
         SUPABASE_CONFIG.anonKey && 
         SUPABASE_CONFIG.anonKey !== 'your-anon-key';
};

// Para pegar as credenciais:
// 1. Acesse https://supabase.com/dashboard
// 2. Selecione seu projeto "Pracinha"
// 3. Vá em Settings > API
// 4. Copie "Project URL" e coloque em url
// 5. Copie "anon public" key e coloque em anonKey
