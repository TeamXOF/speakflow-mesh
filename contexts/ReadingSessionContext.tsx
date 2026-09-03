'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export type FlowState = 'map' | 'checkpoint' | 'feedback' | 'rewards';
export type ChapterStatus = 'locked' | 'in_progress' | 'completed';

export interface Chapter {
  id: string;
  title: string;
  status: ChapterStatus;
  checkpointCount: number;
  completedCount: number;
}

export const DEMO_CHAPTERS: Chapter[] = [
  { id: "ch1", title: "The Brave Little Rabbit", status: "completed", checkpointCount: 5, completedCount: 5 },
  { id: "ch2", title: "Climbing the Mountain", status: "in_progress", checkpointCount: 5, completedCount: 2 },
  { id: "ch3", title: "Lost in the Forest", status: "locked", checkpointCount: 5, completedCount: 0 },
];

export const DEMO_CHECKPOINTS = [
  { checkpoint_id: "cp_1", target_text: "The brave little rabbit hopped through the meadow." },
  { checkpoint_id: "cp_2", target_text: "The little explorer climbed the steep mountain slowly." },
  { checkpoint_id: "cp_3", target_text: "She found a hidden path between the tall dark trees." },
  { checkpoint_id: "cp_4", target_text: "The golden key unlocked a chest full of sparkling gems." },
  { checkpoint_id: "cp_5", target_text: "All the forest animals gathered to celebrate together." },
];

interface ReadingSessionState {
  totalStars: number;
  chapters: Chapter[];
  currentChapterId: string | null;
  currentCheckpointIndex: number;
  flowState: FlowState;
  
  startChapter: (chapterId: string) => void;
  finishRecording: () => void;
  showRewards: () => void;
  continueAdventure: () => void;
  goBackToMap: () => void;
}

const ReadingSessionContext = createContext<ReadingSessionState | undefined>(undefined);

export function ReadingSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  
  const [totalStars, setTotalStars] = useState(285);
  const [chapters, setChapters] = useState<Chapter[]>(DEMO_CHAPTERS);
  
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState(0);
  const [flowState, setFlowState] = useState<FlowState>('map');

  const startChapter = (chapterId: string) => {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter || chapter.status === 'locked') return;
    
    setCurrentChapterId(chapterId);
    // Start at their current completed count. If already at 5, start over at 0 for replay.
    const startIdx = chapter.completedCount >= chapter.checkpointCount ? 0 : chapter.completedCount;
    setCurrentCheckpointIndex(startIdx);
    setFlowState('checkpoint');
    router.push(`/read/${chapterId}`);
  };

  const finishRecording = () => {
    setFlowState('feedback');
  };

  const showRewards = () => {
    setFlowState('rewards');
  };

  const continueAdventure = () => {
    if (!currentChapterId) return;
    
    const chapter = chapters.find(c => c.id === currentChapterId);
    if (!chapter) return;

    // Grant stars
    setTotalStars(prev => prev + 10);

    const nextIndex = currentCheckpointIndex + 1;
    
    // Update chapter progress
    let newlyCompleted = false;
    
    setChapters(prev => prev.map(ch => {
      if (ch.id === currentChapterId) {
        const newCompleted = Math.max(ch.completedCount, nextIndex);
        const isFinished = newCompleted >= ch.checkpointCount;
        if (isFinished && ch.status !== 'completed') newlyCompleted = true;
        return { 
          ...ch, 
          completedCount: newCompleted,
          status: isFinished ? 'completed' : 'in_progress'
        };
      }
      return ch;
    }));

    // Hack to unlock next chapter if we just completed ch2
    if (newlyCompleted && currentChapterId === 'ch2') {
      setChapters(prev => prev.map(ch => 
        ch.id === 'ch3' && ch.status === 'locked' ? { ...ch, status: 'in_progress' } : ch
      ));
    }

    if (nextIndex >= chapter.checkpointCount) {
      // Chapter complete, go back to map
      setCurrentChapterId(null);
      setFlowState('map');
      router.push('/read');
    } else {
      // Next checkpoint
      setCurrentCheckpointIndex(nextIndex);
      setFlowState('checkpoint');
    }
  };

  const goBackToMap = () => {
    setCurrentChapterId(null);
    setFlowState('map');
    router.push('/read');
  };

  return (
    <ReadingSessionContext.Provider value={{
      totalStars,
      chapters,
      currentChapterId,
      currentCheckpointIndex,
      flowState,
      startChapter,
      finishRecording,
      showRewards,
      continueAdventure,
      goBackToMap
    }}>
      {children}
    </ReadingSessionContext.Provider>
  );
}

export function useReadingSession() {
  const context = useContext(ReadingSessionContext);
  if (context === undefined) {
    throw new Error('useReadingSession must be used within a ReadingSessionProvider');
  }
  return context;
}
