export {};
declare global {
  interface Window {
    Utils: any;
    CryptoUtils: any;
    Storage: any;
    Notifications: any;
    RemoteStorage: any;
    SelectEnhancer: any;
    KanbanBoard: any;
    Passphrase: any;
    supabase?: any;
    __chartLoading?: Promise<void>;
    __zenCharts?: any;
  }
}
