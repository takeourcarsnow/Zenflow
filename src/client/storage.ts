(() => {
  const global = window as any;
  const DATA_KEY = 'ZenBoardData';
  const PREFS_KEY = 'ZenBoardPrefs_v1';
  const PASS_KEY = 'ZenBoard_passphrase';

  function getPassphrase() { const pass = localStorage.getItem(PASS_KEY); return pass && String(pass); }

  const saveData = async (boards: any) => {
    const pass = getPassphrase();
    console.log('Storage.saveData called, pass present?', !!pass);
    if (!pass) throw new Error('Encryption passphrase required');
    if (!global.CryptoUtils?.encryptJSON) throw new Error('Crypto not available');
    const cipher = await global.CryptoUtils.encryptJSON(boards, pass);
    const toStore = { enc: true, payload: cipher };
    localStorage.setItem(DATA_KEY, JSON.stringify(toStore));
  };

  const loadData = async () => {
    const saved = localStorage.getItem(DATA_KEY);
    console.log('Storage.loadData called, saved present?', !!saved);
    if (!saved) return null;
    let parsed: any;
    try { parsed = JSON.parse(saved); } catch { return null; }
    if (parsed && parsed.enc === true && parsed.payload) {
      const pass = getPassphrase();
      console.log('Storage.loadData detected encrypted payload, pass present?', !!pass);
      if (!pass) throw new Error('Passphrase required to decrypt local data');
      if (!global.CryptoUtils?.decryptJSON) throw new Error('Crypto not available');
      const data = await global.CryptoUtils.decryptJSON(parsed.payload, pass);
      return data;
    }
    const pass = getPassphrase();
    console.log('Storage.loadData detected plaintext saved, will encrypt; pass present?', !!pass);
    if (!pass) throw new Error('Passphrase required to encrypt existing local data');
    if (!global.CryptoUtils?.encryptJSON) throw new Error('Crypto not available');
    const cipher = await global.CryptoUtils.encryptJSON(parsed, pass);
    const toStore = { enc: true, payload: cipher };
    localStorage.setItem(DATA_KEY, JSON.stringify(toStore));
    return parsed;
  };

  const savePrefs = (prefs: any) => localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  const loadPrefs = () => { const saved = localStorage.getItem(PREFS_KEY); return saved ? JSON.parse(saved) : null; };

  (window as any).Storage = { DATA_KEY, PREFS_KEY, saveData, loadData, savePrefs, loadPrefs };
})();
