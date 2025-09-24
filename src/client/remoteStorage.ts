(() => {
  const global = window as any;
  const state: any = { client: null, user: null, ready: false, schema: 'public', table: 'boards', passphrase: null };
  function isReady() { return !!state.client && state.ready; }
  function isLoggedIn() { return !!state.user; }
  function init(client: any, options: any = {}) {
    state.client = client || (global as any).supabase;
    state.schema = options.schema || state.schema;
    state.table = options.table || state.table;
    state.ready = !!state.client;
    if (!state.client) return;
    state.client.auth.getUser().then(({ data }: any) => { state.user = data?.user || null; });
    state.client.auth.onAuthStateChange((_event: any, session: any) => { state.user = session?.user || null; });
  }
  function setPassphrase(pass: any) { state.passphrase = (pass && String(pass)) || null; }
  function hasPassphrase() { return !!state.passphrase; }
  async function signUp(email: string, password: string) { if (!state.client) throw new Error('Supabase not initialized'); const { data, error } = await state.client.auth.signUp({ email, password }); if (error) throw error; return data; }
  async function signIn(email: string, password: string) { if (!state.client) throw new Error('Supabase not initialized'); const { data, error } = await state.client.auth.signInWithPassword({ email, password }); if (error) throw error; return data; }
  async function signOut() { if (!state.client) return; await state.client.auth.signOut(); }
  async function loadData() {
    if (!state.client || !state.user) return null;
    const q = state.client.schema(state.schema).from(state.table).select('data').eq('user_id', state.user.id).maybeSingle();
    const { data, error } = await q;
    if (error) throw error;
    if (!data) return null;
    try {
      const blob = data.data;
      if (blob && blob.enc === true && blob.payload) {
        if (!state.passphrase) throw new Error('Passphrase required to decrypt');
        const decrypted = await (window as any).CryptoUtils.decryptJSON(blob.payload, state.passphrase);
        return { data: decrypted };
      }
  if (!state.passphrase) throw new Error('Cloud data is not encrypted. Set a passphrase to migrate and unlock it.');
  if (!(window as any).CryptoUtils?.encryptJSON) throw new Error('Crypto not available');
  const cipher = await (window as any).CryptoUtils.encryptJSON(blob, state.passphrase);
      const toStore = { enc: true, payload: cipher };
      const payload = { user_id: state.user.id, data: toStore, updated_at: new Date().toISOString() };
      try { await state.client.schema(state.schema).from(state.table).upsert(payload, { onConflict: 'user_id' }).select('user_id').single(); } catch (e) { console.warn('Failed to migrate remote data to encrypted format', e); }
      return { data: blob };
    } catch (e) { throw e; }
  }
  async function saveData(boards: any) {
    if (!state.client || !state.user) return null;
  if (!state.passphrase || !(window as any).CryptoUtils?.encryptJSON) throw new Error('Encryption passphrase required');
  const cipher = await (window as any).CryptoUtils.encryptJSON(boards, state.passphrase);
    const toStore = { enc: true, payload: cipher };
    const payload = { user_id: state.user.id, data: toStore, updated_at: new Date().toISOString() };
    const { data, error } = await state.client.schema(state.schema).from(state.table).upsert(payload, { onConflict: 'user_id' }).select('user_id').single();
    if (error) throw error; return data;
  }
  (window as any).RemoteStorage = { init, isReady, isLoggedIn, signUp, signIn, signOut, loadData, saveData, setPassphrase, hasPassphrase };
})();
