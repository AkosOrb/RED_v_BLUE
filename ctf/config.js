// CTF beállítások. Ha a Supabase mezők üresek, a játék helyi próbamódban fut:
// minden adat csak az adott böngészőben tárolódik.
// FIGYELEM: ide csak a nyilvános (publishable/anon) kulcs kerülhet, soha a service_role / secret kulcs.
// Ha a Supabase URL megváltozik, a ctf/index.html Content-Security-Policy connect-src részét is át kell írni.
window.CTF_CONFIG = {
  supabaseUrl: 'https://dpcemoeocpcvjwjutqfn.supabase.co',
  supabaseAnonKey: 'sb_publishable_kmOz3NrDQKioCSfUvfW5wQ_9EvzEUEr',  // a projekt nyilvános (publishable/anon) kulcsa
  // Csak helyi próbamódban: ezek a felhasználónevek látják az oktatói felületet.
  // Supabase módban az oktatói jogot az adatbázisban kell megadni (lásd supabase/schema.sql).
  localInstructors: ['oktato'],
};
