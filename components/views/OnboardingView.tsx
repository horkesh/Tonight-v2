
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PAGE_VARIANTS } from '../../constants';

interface OnboardingViewProps {
  onComplete: (age: string, height: string, style: string) => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [style, setStyle] = useState('');

  const nextStep = () => setStep(prev => prev + 1);

  const handleSubmit = () => {
    onComplete(age, height, style);
  };

  const steps = [
    {
      id: 'age',
      label: 'Years',
      question: "How many years have you lived?",
      input: (
        <input 
          type="number" 
          autoFocus
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="w-full bg-transparent border-b border-white/20 text-center text-6xl font-serif text-white focus:outline-none focus:border-rose-500 transition-colors pb-4"
          placeholder="25"
        />
      ),
      isValid: age.length > 0
    },
    {
      id: 'height',
      label: 'Stature',
      question: "How do you stand in the world?",
      input: (
        <input 
          type="text" 
          autoFocus
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          className="w-full bg-transparent border-b border-white/20 text-center text-4xl font-serif text-white focus:outline-none focus:border-rose-500 transition-colors pb-4"
          placeholder="5'10 / 178cm"
        />
      ),
      isValid: height.length > 1
    },
    {
      id: 'style',
      label: 'Aesthetic',
      question: "How do you present yourself to the darkness?",
      input: (
        <textarea 
          autoFocus
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="w-full bg-white/5 rounded-2xl border border-white/10 p-6 text-xl font-serif italic text-white focus:outline-none focus:border-rose-500 transition-colors min-h-[160px] resize-none"
          placeholder="e.g. Sharp suit, messy hair, elegant red dress, tattoos..."
        />
      ),
      isValid: style.length > 3
    }
  ];

  const currentStep = steps[step];

  return (
    <motion.div 
      key="onboarding" 
      variants={PAGE_VARIANTS} 
      initial="initial" 
      animate="animate" 
      exit="exit" 
      className="flex flex-col items-center justify-center min-h-[70vh] px-8 text-center"
    >
        <div className="w-full max-w-sm">
            <span className="text-[9px] text-rose-500 uppercase tracking-[0.5em] font-black block mb-12">
                Identity Sequence {step + 1}/{steps.length}
            </span>

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col gap-10"
                >
                    <h2 className="text-3xl font-serif text-white leading-tight">
                        {currentStep.question}
                    </h2>
                    
                    <div>
                        {currentStep.input}
                    </div>
                </motion.div>
            </AnimatePresence>

            <div className="mt-20 flex justify-center">
                <button
                    onClick={step === steps.length - 1 ? handleSubmit : nextStep}
                    disabled={!currentStep.isValid}
                    className="px-10 py-4 bg-white/10 border border-white/10 rounded-full text-[10px] uppercase tracking-[0.3em] font-black hover:bg-rose-600 hover:border-rose-500 transition-all disabled:opacity-20 disabled:pointer-events-none"
                >
                    {step === steps.length - 1 ? "Manifest Identity" : "Next"}
                </button>
            </div>
        </div>
    </motion.div>
  );
};
