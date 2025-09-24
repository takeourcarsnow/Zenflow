(() => {
  const global = window as any;
  const debounce = (fn: (...args: any[]) => void, delay = 180) => {
    let t: any;
    return (...args: any[]) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  };
  const deepClone = (obj: any) => JSON.parse(JSON.stringify(obj));
  const escapeHTML = (str = '') => String(str).replace(/[&<>"'`=\/]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'} as any)[s]);
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const uuid = () => {
    if ((global.crypto as any)?.randomUUID) return `card-${(global.crypto as any).randomUUID()}`;
    return `card-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  };
  const initials = (name = '') => name.trim().split(/\s+/).map((n:any) => n[0]).join('').toUpperCase().slice(0,2) || 'U';
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(date); d.setHours(0,0,0,0);
    const diffDays = Math.round((d.getTime() - today.getTime()) / (1000*60*60*24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  const isOverdue = (date: string|Date) => { const today = new Date(); today.setHours(0,0,0,0); const d = new Date(date); d.setHours(0,0,0,0); return d < today; };
  const hashCode = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h<<5)-h) + s.charCodeAt(i) | 0; return h; };
  const avatarStyle = (seed?: string) => { if (!seed) return ''; const h = hashCode(seed); const hue = Math.abs(h % 360); return `background: linear-gradient(135deg, hsl(${hue},75%,55%), hsl(${(hue+40)%360},70%,50%));`; };
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\[/g,'\\[').replace(/\]/g,'\\]');
  (global as any).Utils = { debounce, deepClone, escapeHTML, priorityOrder, uuid, initials, formatDate, isOverdue, hashCode, avatarStyle, escapeRegExp };
})();
