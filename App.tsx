
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { PresenceBar } from './components/PresenceBar';
import { ActionDock } from './components/ActionDock';
import { CameraModal } from './components/CameraModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ReactionPicker } from './components/ReactionPicker';
import { SharedDraft } from './components/SharedDraft';
import { IntelligenceBriefing } from './components/IntelligenceBriefing';
import { ReactionOverlay } from './components/ReactionOverlay';
import { ToastOverlay } from './components/ToastOverlay';
import { InnerMonologue } from './components/InnerMonologue';
import { TouchLayer } from './components/HeatmapOverlay';
import { AvatarEditor } from './components/AvatarEditor';
import { ConnectionStatusOverlay } from './components/ConnectionStatusOverlay';
import { Soundscape } from './components/Soundscape';
import { GuestProfileOverlay } from './components/GuestProfileOverlay';
import { ArrivalOverlay } from './components/ArrivalOverlay';
import { FlashMessage } from './components/FlashMessage';
import { WhisperOverlay } from './components/WhisperOverlay';
import { InsightCard } from './components/InsightCard';
import { motion, AnimatePresence } from 'framer-motion';

import { useSession } from './context/SessionContext';
import { SessionProvider } from './context/SessionContext';
import { useQuestionFlow } from './hooks/useQuestionFlow';
import { useAiActions } from './hooks/useAiActions';
import { useDeviceSensors } from './hooks/useDeviceSensors';
import { useAtmosphere } from './hooks/useAtmosphere';
import { useInnerMonologue } from './hooks/useInnerMonologue';
import { compressImage } from './utils/helpers';

import { PAGE_VARIANTS } from './constants';
import { useAssetPreloader } from './hooks/useAssetPreloader';

// Views — SetupView is eager (initial screen), rest are lazy-loaded
import { SetupView } from './components/views/SetupView';
import { SyncWaitScreen } from './components/views/SyncWaitScreen';

const OnboardingView = lazy(() => import('./components/views/OnboardingView').then(m => ({ default: m.OnboardingView })));
const HubView = lazy(() => import('./components/views/HubView').then(m => ({ default: m.HubView })));
const QuestionView = lazy(() => import('./components/views/QuestionView').then(m => ({ default: m.QuestionView })));
const RatingView = lazy(() => import('./components/views/RatingView').then(m => ({ default: m.RatingView })));
const ActivityView = lazy(() => import('./components/views/ActivityView').then(m => ({ default: m.ActivityView })));
const TwoTruthsView = lazy(() => import('./components/views/TwoTruthsView').then(m => ({ default: m.TwoTruthsView })));
const FinishSentenceView = lazy(() => import('./components/views/FinishSentenceView').then(m => ({ default: m.FinishSentenceView })));
const PlaylistView = lazy(() => import('./components/views/PlaylistView').then(m => ({ default: m.PlaylistView })));
const LoadingView = lazy(() => import('./components/views/LoadingView').then(m => ({ default: m.LoadingView })));

function AppContent() {
  const session = useSession();
  const { state: s, actions: a, narrativeState, narrativeActions } = session;

  const { qState: qs, qActions: qa } = useQuestionFlow(session);
  const { aiState: as, aiActions: aa } = useAiActions(session);

  const [sharedDraft, setSharedDraft] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraType, setCameraType] = useState<'drink' | 'selfie' | 'general'>('general');
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);
  const [whisperActive, setWhisperActive] = useState(false);
  
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Background-preload location images (non-blocking)
  useAssetPreloader();

  // Custom Hooks - Now passing dateContext for dynamic theming
  useAtmosphere(s.vibe, s.dateContext);
  
  useDeviceSensors({
    onPour: () => { if (a.handleDrinkAction()) qa.showFlash("Sip Detected 🥃"); },
    onGlanceBack: () => qa.showFlash("Lost you for a second there...", 3000),
    onWhisper: () => { if (s.isHost && s.isSynced) setWhisperActive(true); },
  });
  const monologue = useInnerMonologue(s.round, s.view, s.vibe);

  // Effect: Handle Shared Reactions (Text/Emoji or Images)
  useEffect(() => {
    if (s.latestReaction) {
        const { content, duration } = s.latestReaction;
        if (content.startsWith('http') || content.startsWith('data:image')) {
            // It's an image reaction
            setActiveReaction(content);
            if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
            reactionTimerRef.current = setTimeout(() => setActiveReaction(null), duration || 5000);
        } else {
            // It's a text/emoji flash
            qa.showFlash(content, duration || 2000);
        }
    }
    return () => {
        if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    };
  }, [s.latestReaction]);

  // Effect: Handle Connection Errors
  useEffect(() => {
    if (s.connectionError) {
        qa.showFlash(s.connectionError, 4000);
    }
  }, [s.connectionError]);

  // Handle incoming Toast Invites
  useEffect(() => {
    if (s.incomingToastRequest) {
        setToastOpen(true);
        a.clearToastRequest();
    }
  }, [s.incomingToastRequest, a]);

  // Handlers
  const handleCameraCapture = async (b: string) => {
    setCameraOpen(false);
    
    // 0. Compress Image before broadcasting
    const compressed = await compressImage(b, 0.6, 800);

    // 1. Immediately broadcast visual to partner (Ephemeral Share)
    const fullImage = `data:image/jpeg;base64,${compressed}`;
    a.triggerReaction(fullImage);

    // 2. Perform AI Analysis on the compressed image
    qa.showFlash("Analyzing visual data...");
    try {
        const r = await aa.processImage(compressed, cameraType);
        qa.showFlash(r.text);
        if (r.secretUnlocked) {
            // This syncs to partner because setPartnerPersona broadcasts
            a.setPartnerPersona(p => ({ 
                ...p, secrets: [...p.secrets, r.secretUnlocked!].slice(-5), 
                revealProgress: Math.min(100, p.revealProgress + 15) 
            }));
        }
    } catch (e) {
        qa.showFlash("Visual Analysis Failed");
    }
  };

  const handleReactionSelect = (url: string) => {
    // Now trigger shared reaction instead of local
    a.triggerReaction(url);
    setReactionPickerOpen(false);
  };

  const handleToastComplete = () => {
    setToastOpen(false);
    // Trigger Clink broadcasts visual clink. We also want the text flash to be shared.
    // handleDrinkAction broadcasts CLINK (overlay) and returns true if synced.
    // We can also explicitly broadcast the toast text.
    a.handleDrinkAction();
    a.triggerReaction("SYNCHRONIZED 🥂");
  };

  const handleAvatarModifier = async (modifier: string) => {
    setAvatarEditorOpen(false);
    qa.showFlash("Shifting Posture...");
    await a.injectVisualModifier(modifier);
  };

  const handleAvatarRegeneration = async (base64: string) => {
    // Close editor instantly so user sees the "Decrypting" spinner on avatar card
    setAvatarEditorOpen(false); 
    qa.showFlash("Rebuilding Digital Self...");
    
    // Compress profile photo too
    const compressed = await compressImage(base64, 0.6, 800);
    const desc = await a.regenerateAvatarFromPhoto(compressed);
    
    if (desc) {
       qa.showFlash(`Identity Updated: ${desc.slice(0, 30)}...`, 4000);
    } else {
       qa.showFlash("Scan Failed");
    }
  };
  
  // Wrapper for Scene Choices: Use synced choice for twists/standard, immediate for others
  const handleSceneChoice = (choiceId: string) => {
      // Logic: Update local state to trigger wait, then P2P handles the rest.
      // ActivityView handles the logic of WHEN to proceed.
      // Once ActivityView calls its onTwistComplete, we trigger actual AA logic.
      a.submitSceneChoice(choiceId);
  };
  
  const handleSceneFlowComplete = () => {
      // Apply impact from ALL participants' choices
      const allChoices = Object.values(s.sceneChoices) as string[];
      let exitToRating = false;

      allChoices.forEach(cid => {
          const shouldExit = aa.applyChoiceImpact(cid);
          if (shouldExit) exitToRating = true;
      });

      if (exitToRating) {
          a.setView('rating');
      } else {
          a.setView('hub');
      }
  };

  return (
    <div className="min-h-screen pb-40 overflow-x-hidden selection:bg-rose-500/30">
      <TouchLayer />
      
      {s.view !== 'setup' && s.isSynced && (
        <>
          <PresenceBar 
            onHome={() => a.setView('hub')} 
            onEditSelf={() => setAvatarEditorOpen(true)}
          />
          <Soundscape vibe={s.vibe} location={s.dateContext?.location} />
          <ReactionOverlay url={activeReaction} />
          <InnerMonologue text={monologue} />
          <ConnectionStatusOverlay
                isConnected={s.isConnected}
                isActive={true}
                onRetry={a.retryConnection}
                partnerName={a.getPartner()?.name}
                connectionStatus={s.connectionStatus}
          />
          
          <AnimatePresence>
            {a.getPartner()?.status === 'choosing' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 0.2, scale: 1.2 }} exit={{ opacity: 0, scale: 1.5 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-rose-950 rounded-full blur-[100px] pointer-events-none mix-blend-screen z-[-1]"
              />
            )}
            {s.clinkActive && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-amber-500 z-[200] pointer-events-none mix-blend-overlay"
              />
            )}
          </AnimatePresence>
        </>
      )}
      
      <main className="px-6 max-w-md mx-auto flex flex-col pt-24">
        {/* Flash Messages - Centralized in Session State */}
        <AnimatePresence>
            {(s.flashMessage) && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed top-24 left-0 right-0 z-[100] flex justify-center px-6 pointer-events-none">
                    <div className="bg-rose-600 text-white px-8 py-3.5 rounded-full text-[10px] tracking-widest uppercase shadow-2xl font-black">
                        {s.flashMessage}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <Suspense fallback={<LazyFallback />}>
          <AnimatePresence mode="wait">
            {s.view === 'setup' && (
                <SetupView onStart={a.startApp} />
            )}

            {/* Sync Blocking State for Guests — Clean loading, escape hatches appear after delay */}
            {(s.view as string) !== 'setup' && !s.isSynced && (
                 <SyncWaitScreen
                    onRetry={() => {
                        qa.showFlash("Retrying Connection...");
                        if (!s.isConnected) a.retryConnection();
                        else a.refreshSync();
                    }}
                    onCancel={() => a.clearSession()}
                    status={s.connectionStatus}
                    isConnected={s.isConnected}
                 />
            )}

            {s.view === 'onboarding' && s.isSynced && (
                <OnboardingView onComplete={a.completeOnboarding} />
            )}

            {s.view === 'hub' && s.isSynced && (
                <HubView
                    onOpenReactionPicker={() => setReactionPickerOpen(true)}
                />
            )}

            {s.view === 'question' && s.isSynced && (
                <QuestionView
                    selfId={a.getSelf()?.id}
                />
            )}

            {s.view === 'rating' && s.isSynced && (
                <RatingView
                    onFinalize={async (n) => { if(await aa.finalizeReport(n)) setReportOpen(true); }}
                    onCancel={() => a.setView('hub')}
                />
            )}

            {s.view === 'activity' && as.currentScene && s.isSynced && (
                <ActivityView
                    onTwistComplete={handleSceneFlowComplete}
                />
            )}

            {s.view === 'twoTruths' && as.twoTruthsData && s.isSynced && (
                <TwoTruthsView />
            )}

            {s.view === 'finishSentence' && as.finishSentenceData && s.isSynced && (
                <FinishSentenceView />
            )}

            {s.view === 'playlist' && as.playlistData && s.isSynced && (
                <PlaylistView />
            )}

            {s.view === 'loading' && s.isSynced && (
                <LoadingView />
            )}
          </AnimatePresence>
        </Suspense>
      </main>

      {/* Conditionally Render ActionDock - Hides in Setup or Syncing */}
      {s.view !== 'setup' && s.isSynced && (
          <ActionDock 
            onReact={(e) => a.triggerReaction(e)} 
            onCamera={() => { setCameraType('general'); setCameraOpen(true); }} 
            onSteamedGlass={() => a.setDraftOpen(true)}
            onToast={() => { setToastOpen(true); a.sendToastInvite(); }}
            onEndSession={() => setShowEndSessionConfirm(true)}
            disabled={!s.isConnected}
          />
      )}
      
      <CameraModal isOpen={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCameraCapture} instruction="Send Photo" />
      <SharedDraft isOpen={s.isDraftOpen} onClose={() => a.setDraftOpen(false)} value={sharedDraft} onChange={setSharedDraft} />
      <ReactionPicker isOpen={reactionPickerOpen} onClose={() => setReactionPickerOpen(false)} onSelect={handleReactionSelect} persona={s.userPersona} />
      <AvatarEditor 
          isOpen={avatarEditorOpen} 
          onClose={() => setAvatarEditorOpen(false)} 
          onSelect={handleAvatarModifier} 
          onPhotoSelect={handleAvatarRegeneration}
      />
      <IntelligenceBriefing report={as.intelligenceReport} isOpen={reportOpen} onClose={() => setReportOpen(false)} />
      <ToastOverlay isOpen={toastOpen} onClose={() => setToastOpen(false)} onClink={handleToastComplete} />

      {/* Guest profile enhancement — shown once after first sync */}
      {s.isSynced && !s.isHost && !s.guestProfileConfirmed && s.hasSeenArrivalOverlay && (
        <GuestProfileOverlay
          persona={s.userPersona}
          currentName={a.getSelf()?.name || 'Guest'}
          onConfirm={a.confirmGuestProfile}
        />
      )}

      {/* Cinematic arrival moment — when date connects */}
      <ArrivalOverlay
        event={s.arrivalEvent}
        dateContext={s.dateContext}
        onDismiss={a.clearArrivalEvent}
      />

      {/* Whisper mode — lean-in dare overlay (host only) */}
      <WhisperOverlay isActive={whisperActive} onDismiss={() => setWhisperActive(false)} />

      {/* Private AI insight — host only, after round 4 */}
      <InsightCard text={narrativeState.insightText} onDismiss={narrativeActions.clearInsight} />

      <ConfirmationModal 
        isOpen={showEndSessionConfirm} onClose={() => setShowEndSessionConfirm(false)} 
        onConfirm={() => {
            a.clearSession();
        }} 
        title="Seal Records?" 
        message="Terminate this session and purge all ephemeral drafts." confirmText="Purge" variant="danger" 
      />
    </div>
  );
}

const LazyFallback = () => (
  <div className="flex items-center justify-center py-24">
    <div className="relative">
      <div className="w-10 h-10 border-2 border-white/10 rounded-full" />
      <div className="absolute inset-0 border-t-2 border-rose-500 rounded-full animate-spin" />
    </div>
  </div>
);

export default function App() {
  return (
    <SessionProvider>
      <Suspense fallback={<LazyFallback />}>
        <AppContent />
      </Suspense>
    </SessionProvider>
  );
}
