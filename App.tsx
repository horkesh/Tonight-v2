
import React, { useState, useEffect, useRef } from 'react';
import { PresenceBar } from './components/PresenceBar';
import { ActionDock } from './components/ActionDock';
import { CameraModal } from './components/CameraModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ReactionPicker } from './components/ReactionPicker';
import { SharedDraft } from './components/SharedDraft';
import { Soundscape } from './components/Soundscape';
import { IntelligenceBriefing } from './components/IntelligenceBriefing';
import { ReactionOverlay } from './components/ReactionOverlay';
import { ToastOverlay } from './components/ToastOverlay';
import { InnerMonologue } from './components/InnerMonologue';
import { HeatmapOverlay } from './components/HeatmapOverlay';
import { AvatarEditor } from './components/AvatarEditor';
import { ConnectionStatusOverlay } from './components/ConnectionStatusOverlay';
import { motion, AnimatePresence } from 'framer-motion';

import { useSessionState } from './hooks/useSessionState';
import { useQuestionFlow } from './hooks/useQuestionFlow';
import { useAiActions } from './hooks/useAiActions';
import { useDeviceSensors } from './hooks/useDeviceSensors';
import { useAtmosphere } from './hooks/useAtmosphere';
import { useInnerMonologue } from './hooks/useInnerMonologue';

import { PAGE_VARIANTS } from './constants';

// Views
import { SetupView } from './components/views/SetupView';
import { OnboardingView } from './components/views/OnboardingView';
import { HubView } from './components/views/HubView';
import { QuestionView } from './components/views/QuestionView';
import { RatingView } from './components/views/RatingView';
import { ActivityView } from './components/views/ActivityView';
import { LoadingView } from './components/views/LoadingView';

// Helper for image compression
const compressImage = async (base64: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = `data:image/jpeg;base64,${base64}`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64); return; } // Fallback

      ctx.drawImage(img, 0, 0, width, height);
      // Compress to 60% quality JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = () => resolve(base64); // Fallback
  });
};

export default function App() {
  const session = useSessionState();
  const { state: s, actions: a } = session;
  
  const { qState: qs, qActions: qa } = useQuestionFlow(session);
  const { aiState: as, aiActions: aa } = useAiActions(session);

  const [sharedDraft, setSharedDraft] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraType, setCameraType] = useState<'drink' | 'selfie'>('drink');
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);
  
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Custom Hooks - Now passing dateContext for dynamic theming
  useAtmosphere(s.vibe, s.dateContext);
  
  useDeviceSensors({
    onPour: () => { if (a.handleDrinkAction()) qa.showFlash("Sip Detected 🥃"); },
    onGlanceBack: () => qa.showFlash("Lost you for a second there...", 3000)
  });
  const monologue = useInnerMonologue(s.round, s.view, s.vibe);

  // Effect: Handle Shared Reactions (Text/Emoji or Images)
  useEffect(() => {
    if (s.latestReaction) {
        const { content } = s.latestReaction;
        if (content.startsWith('http') || content.startsWith('data:image')) {
            // It's an image reaction
            setActiveReaction(content);
            if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
            reactionTimerRef.current = setTimeout(() => setActiveReaction(null), 5000);
        } else {
            // It's a text/emoji flash
            qa.showFlash(content, 2000);
        }
    }
    return () => {
        if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    };
  }, [s.latestReaction]);

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
    const compressed = await compressImage(b);

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
    const compressed = await compressImage(base64);
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
      // Find my choice
      const self = a.getSelf();
      const myChoiceId = self ? s.sceneChoices[self.id] : null;
      if (myChoiceId) {
          // Trigger the AI/Vibe updates
          aa.handleChoice(myChoiceId, qa.showFlash);
      } else {
          a.setView('hub');
      }
  };

  return (
    <div className="min-h-screen pb-40 overflow-x-hidden selection:bg-rose-500/30">
      <HeatmapOverlay />
      
      {s.view !== 'setup' && (
        <>
          <PresenceBar 
            users={s.users} 
            round={s.round} 
            onHome={() => a.setView('hub')} 
            onEditSelf={() => setAvatarEditorOpen(true)}
            isConnected={s.isConnected}
          />
          <Soundscape vibe={s.vibe} />
          <ReactionOverlay url={activeReaction} />
          <InnerMonologue text={monologue} />
          <ConnectionStatusOverlay isConnected={s.isConnected} isActive={s.view !== 'setup'} />
          
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
        {/* Flash Messages */}
        <AnimatePresence>
            {(qs.flashMessage) && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed top-24 left-0 right-0 z-[100] flex justify-center px-6 pointer-events-none">
                    <div className="bg-rose-600 text-white px-8 py-3.5 rounded-full text-[10px] tracking-widest uppercase shadow-2xl font-black">
                        {qs.flashMessage}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
            {s.view === 'setup' && (
                <SetupView onStart={a.startApp} />
            )}
            
            {/* Sync Blocking State for Guests */}
            {s.view !== 'setup' && !s.isSynced && (
                 <motion.div key="syncing" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center pt-32 gap-6">
                     <div className="relative">
                        <div className="w-16 h-16 border-2 border-white/10 rounded-full" />
                        <div className="absolute inset-0 border-t-2 border-rose-500 rounded-full animate-spin" />
                     </div>
                     <div className="text-center">
                         <h3 className="text-xl font-serif text-white">Authenticating</h3>
                         <p className="text-[10px] uppercase tracking-widest text-rose-500/80 font-black mt-2">Waiting for Host Transmission...</p>
                     </div>
                 </motion.div>
            )}

            {s.view === 'onboarding' && s.isSynced && (
                <OnboardingView onComplete={a.completeOnboarding} />
            )}

            {s.view === 'hub' && s.isSynced && (
                <HubView 
                    state={s} actions={a} qActions={qa} aiActions={aa} 
                    onOpenReactionPicker={() => setReactionPickerOpen(true)} 
                />
            )}

            {s.view === 'question' && s.isSynced && (
                <QuestionView 
                    state={s} actions={a} qState={qs} qActions={qa} 
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
                    scene={as.currentScene} 
                    drunkFactor={s.partnerPersona.drunkFactor}
                    onChoice={handleSceneChoice}
                    onSilentChoice={(id) => aa.handleSilentChoice(id, qa.showFlash)}
                    users={s.users}
                    sceneChoices={s.sceneChoices}
                    onTwistComplete={handleSceneFlowComplete}
                    isConnected={s.isConnected}
                    onSimulatePartner={a.simulatePartnerChoice}
                />
            )}

            {s.view === 'loading' && s.isSynced && (
                <LoadingView />
            )}
        </AnimatePresence>
      </main>

      <ActionDock 
        onReact={(e) => a.triggerReaction(e)} 
        onCamera={() => { setCameraType('drink'); setCameraOpen(true); }} 
        onPlotTwist={() => { qa.showFlash("Injecting Chaos..."); aa.handlePlotTwist(); }}
        onDraft={() => a.setDraftOpen(true)}
        onToast={() => { setToastOpen(true); a.sendToastInvite(); }}
        onEndSession={() => setShowEndSessionConfirm(true)}
        disabled={!s.isConnected}
      />
      
      <CameraModal isOpen={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCameraCapture} instruction="Exhibit Object" />
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
