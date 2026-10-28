// CTF beállítások. Ha a Supabase mezők üresek, a játék helyi próbamódban fut:
// minden adat csak az adott böngészőben tárolódik.
window.CTF_CONFIG = {
  supabaseUrl: 'https://dpcemoeocpcvjwjutqfn.supabase.co',
  supabaseAnonKey: 'sb_publishable_kmOz3NrDQKioCSfUvfW5wQ_9EvzEUEr',  // a projekt nyilvános (publishable/anon) kulcsa
  // Csak helyi próbamódban: ezek a felhasználónevek látják az oktatói felületet.
  // Supabase módban az oktatói jogot az adatbázisban kell megadni (lásd supabase/schema.sql).
  localInstructors: ['oktato'],
};
