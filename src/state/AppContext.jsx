import { createContext, useContext, useMemo, useState } from 'react';
import { clients as seedClients, documents as seedDocuments } from '../data/mock-data.js';

// Minimal stub. Actions and localStorage persistence arrive in Phase 1.
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [clients] = useState(seedClients);
  const [documents] = useState(seedDocuments);
  const [activeClientId, setActiveClientId] = useState(seedClients[0].id);

  const value = useMemo(
    () => ({
      clients,
      documents,
      activeClientId,
      activeClient: clients.find((c) => c.id === activeClientId),
      switchClient: setActiveClientId,
    }),
    [clients, documents, activeClientId]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
