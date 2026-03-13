import React, { createContext, useContext, ReactNode } from 'react';
import { useSessionState } from '../hooks/useSessionState';
import { useQuestionFlow } from '../hooks/useQuestionFlow';
import { useAiActions } from '../hooks/useAiActions';
import { useNarrativeFlow } from '../hooks/useNarrativeFlow';

type SessionContextType = ReturnType<typeof useSessionState> & ReturnType<typeof useQuestionFlow> & ReturnType<typeof useAiActions> & ReturnType<typeof useNarrativeFlow>;

const SessionContext = createContext<SessionContextType | null>(null);

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const session = useSessionState();
  const qFlow = useQuestionFlow(session);
  const aiActions = useAiActions(session);
  const narrativeFlow = useNarrativeFlow(session);

  const value = {
    ...session,
    ...qFlow,
    ...aiActions,
    ...narrativeFlow
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
