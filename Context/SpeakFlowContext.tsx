'use client';
import React, { createContext, useContext } from 'react';

const SpeakFlowContext = createContext({});

export function SpeakFlowProvider({ children }: { children: React.ReactNode }) {
  return (
    <SpeakFlowContext.Provider value={{}}>
      {children}
    </SpeakFlowContext.Provider>
  );
}

export function useSpeakFlow() {
  return useContext(SpeakFlowContext);
}
