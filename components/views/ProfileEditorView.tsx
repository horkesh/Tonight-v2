import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PAGE_VARIANTS } from '../../constants';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { CheckboxGrid } from '../ui/CheckboxGrid';
import { analyzeUserPhotoForAvatar, generateAbstractAvatar } from '../../services/geminiService';
import { compressImage } from '../../utils/helpers';
import { deriveZodiac, ZODIAC_ICONS } from '../../utils/astrology';
import { saveProfile } from '../../utils/profileStorage';
import type {
  PartnerProfile,
  LoveLanguage,
  PersonalityTrait,
  Interest,
  ImpressionFactor,
  PhysicalComfort,
  PlayStyle,
  RelationshipHistory,
  ChildrenStatus,
  LivingSituation,
  JobFeeling,
} from '../../types/profiles';

interface ProfileEditorViewProps {
  profile?: PartnerProfile; // edit mode if provided
  onSave: (profile: PartnerProfile) => void;
  onCancel: () => void;
}

const LOVE_LANGUAGES: { value: LoveLanguage; label: string; icon: string }[] = [
  { value: 'words_of_affirmation', label: 'Words', icon: '💬' },
  { value: 'acts_of_service', label: 'Acts', icon: '🤲' },
  { value: 'receiving_gifts', label: 'Gifts', icon: '🎁' },
  { value: 'quality_time', label: 'Time', icon: '⏳' },
  { value: 'physical_touch', label: 'Touch', icon: '🤝' },
];

const PERSONALITY_OPTIONS: { value: PersonalityTrait; label: string }[] = [
  { value: 'adventurous', label: 'Adventurous' },
  { value: 'intellectual', label: 'Intellectual' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'witty', label: 'Witty' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'spontaneous', label: 'Spontaneous' },
  { value: 'nurturing', label: 'Nurturing' },
  { value: 'competitive', label: 'Competitive' },
  { value: 'artistic', label: 'Artistic' },
  { value: 'spiritual', label: 'Spiritual' },
  { value: 'rebellious', label: 'Rebellious' },
  { value: 'stoic', label: 'Stoic' },
];

const INTEREST_OPTIONS: { value: Interest; label: string }[] = [
  { value: 'travel', label: 'Travel' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'music', label: 'Music' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'reading', label: 'Reading' },
  { value: 'art', label: 'Art' },
  { value: 'film', label: 'Film' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'nature', label: 'Nature' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'tech', label: 'Tech' },
  { value: 'writing', label: 'Writing' },
  { value: 'dance', label: 'Dance' },
  { value: 'photography', label: 'Photo' },
  { value: 'wine', label: 'Wine' },
  { value: 'spirituality', label: 'Spirit' },
  { value: 'psychology', label: 'Psych' },
  { value: 'politics', label: 'Politics' },
  { value: 'entrepreneurship', label: 'Business' },
];

const IMPRESSION_OPTIONS: { value: ImpressionFactor; label: string }[] = [
  { value: 'humor', label: 'Humor' },
  { value: 'intelligence', label: 'Intelligence' },
  { value: 'confidence', label: 'Confidence' },
  { value: 'vulnerability', label: 'Vulnerability' },
  { value: 'ambition', label: 'Ambition' },
  { value: 'style', label: 'Style' },
  { value: 'kindness', label: 'Kindness' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'passion', label: 'Passion' },
  { value: 'cultural_knowledge', label: 'Culture' },
];

function createEmptyProfile(): PartnerProfile {
  return {
    id: `profile-${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    name: '',
    photo: null,
    pronouns: null,
    nationality: null,
    languages: [],
    city: null,
    birthday: null,
    zodiac: null,
    relationshipHistory: null,
    children: null,
    livingSituation: null,
    religion: null,
    job: null,
    jobFeeling: null,
    aspiration: null,
    primaryLoveLanguage: null,
    secondaryLoveLanguage: null,
    personalityTraits: [],
    interests: [],
    drink: null,
    dreamDestination: null,
    lovedPlace: null,
    definingMedia: null,
    catchPhrase: null,
    friendNickname: null,
    impressionFactors: [],
    physicalComfort: null,
    playStyle: null,
    aiAppearance: null,
    aiTraits: [],
    aiEstimatedAge: null,
    aiGender: null,
  };
}

export const ProfileEditorView: React.FC<ProfileEditorViewProps> = ({
  profile: existingProfile,
  onSave,
  onCancel,
}) => {
  const [p, setP] = useState<PartnerProfile>(existingProfile || createEmptyProfile());
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof PartnerProfile>(key: K, value: PartnerProfile[K]) => {
    setP((prev) => ({ ...prev, [key]: value }));
  };

  // Birthday → zodiac auto-derive
  useEffect(() => {
    if (p.birthday) {
      const zodiac = deriveZodiac(p.birthday);
      setP((prev) => {
        if (prev.zodiac?.sign === zodiac?.sign) return prev;
        return { ...prev, zodiac };
      });
    }
  }, [p.birthday]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const compressed = await compressImage(base64, 0.5, 400);
      update('photo', compressed);

      // AI analysis
      const raw = compressed.includes(',') ? compressed.split(',')[1] : compressed;
      const { appearance, traits, estimatedAge, gender } = await analyzeUserPhotoForAvatar(raw);

      // Generate avatar (stored as photo if no existing)
      const avatarUrl = await generateAbstractAvatar(traits, 15, appearance);

      setP((prev) => ({
        ...prev,
        photo: avatarUrl || compressed,
        aiAppearance: appearance,
        aiTraits: traits,
        aiEstimatedAge: estimatedAge,
        aiGender: gender,
      }));
    } catch (err) {
      console.error('Photo processing failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    setError(null);
    if (!p.name.trim()) {
      setError('Name is required');
      return;
    }
    const saved = { ...p, updatedAt: Date.now() };
    if (!saveProfile(saved)) {
      setError('Storage full — try deleting old profiles or photos');
      return;
    }
    onSave(saved);
  };

  const radioSelect = <T extends string>(
    options: { value: T; label: string }[],
    current: T | null,
    onSelect: (v: T | null) => void
  ) => (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(current === opt.value ? null : opt.value)}
          className={`px-3 py-2 rounded-xl text-[9px] uppercase tracking-widest font-bold border transition-all ${
            current === opt.value
              ? 'bg-rose-600/30 border-rose-500/50 text-rose-300'
              : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const loveLangSelect = (isPrimary: boolean) => {
    const current = isPrimary ? p.primaryLoveLanguage : p.secondaryLoveLanguage;
    return (
      <div className="flex flex-wrap gap-2">
        {LOVE_LANGUAGES.map((ll) => {
          const isOtherSelected = isPrimary
            ? p.secondaryLoveLanguage === ll.value
            : p.primaryLoveLanguage === ll.value;
          return (
            <button
              key={ll.value}
              type="button"
              disabled={isOtherSelected}
              onClick={() =>
                update(
                  isPrimary ? 'primaryLoveLanguage' : 'secondaryLoveLanguage',
                  current === ll.value ? null : ll.value
                )
              }
              className={`px-3 py-2.5 rounded-xl text-[9px] uppercase tracking-widest font-bold border transition-all ${
                current === ll.value
                  ? 'bg-rose-600/30 border-rose-500/50 text-rose-300'
                  : isOtherSelected
                  ? 'opacity-30 cursor-not-allowed bg-white/5 border-white/10 text-white/50'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
              }`}
            >
              <span className="block text-base mb-1">{ll.icon}</span>
              {ll.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full flex flex-col gap-4 pb-8"
    >
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onCancel}
          className="text-[9px] uppercase tracking-widest text-white/30 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-xl font-serif italic text-white">
          {existingProfile ? 'Edit Profile' : 'New Profile'}
        </h2>
        <div className="w-12" />
      </div>

      {/* Photo + Name (always visible) */}
      <div className="flex flex-col items-center gap-4 mb-2">
        <div
          className="relative group cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <div className="w-28 h-28 rounded-full border-2 border-white/10 bg-white/5 overflow-hidden flex items-center justify-center hover:border-rose-500 transition-colors shadow-2xl">
            {isProcessing && (
              <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[8px] uppercase tracking-widest text-rose-500 animate-pulse">
                  Scanning...
                </span>
              </div>
            )}
            {p.photo ? (
              <img src={p.photo} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="flex flex-col items-center opacity-30 group-hover:opacity-100 transition-opacity">
                <span className="text-3xl mb-1">📷</span>
                <span className="text-[7px] uppercase tracking-widest">Add Photo</span>
              </div>
            )}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handlePhotoUpload}
        />
        <input
          value={p.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Her Name"
          className="w-full bg-transparent border-b border-white/20 p-2 text-center text-3xl font-serif focus:outline-none focus:border-rose-500 transition-colors placeholder:text-white/10"
        />
      </div>

      {/* Section 1: Identity */}
      <CollapsibleSection title="Identity" icon="🪪" defaultOpen>
        <div className="space-y-3">
          <input
            value={p.pronouns || ''}
            onChange={(e) => update('pronouns', e.target.value || null)}
            placeholder="Pronouns (she/her)"
            className="w-full bg-white/5 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-rose-500 placeholder:text-white/15"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={p.nationality || ''}
              onChange={(e) => update('nationality', e.target.value || null)}
              placeholder="Nationality"
              className="w-full bg-white/5 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-rose-500 placeholder:text-white/15"
            />
            <input
              value={p.city || ''}
              onChange={(e) => update('city', e.target.value || null)}
              placeholder="City"
              className="w-full bg-white/5 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-rose-500 placeholder:text-white/15"
            />
          </div>
          <input
            value={p.languages.join(', ')}
            onChange={(e) =>
              update(
                'languages',
                e.target.value
                  .split(',')
                  .map((l) => l.trim())
                  .filter(Boolean)
              )
            }
            placeholder="Languages (comma-separated)"
            className="w-full bg-white/5 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-rose-500 placeholder:text-white/15"
          />
        </div>
      </CollapsibleSection>

      {/* Section 2: Birthday & Stars */}
      <CollapsibleSection
        title="Birthday & Stars"
        icon="✨"
        defaultOpen
        badge={p.zodiac ? `${ZODIAC_ICONS[p.zodiac.sign] || ''} ${p.zodiac.sign}` : undefined}
      >
        <div className="space-y-3">
          <input
            type="date"
            value={p.birthday || ''}
            onChange={(e) => update('birthday', e.target.value || null)}
            className="w-full bg-white/5 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-rose-500"
          />
          {p.zodiac && (
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
              <span className="text-3xl">{ZODIAC_ICONS[p.zodiac.sign]}</span>
              <div>
                <span className="text-white font-serif capitalize">{p.zodiac.sign}</span>
                <span className="text-[9px] text-white/40 uppercase tracking-widest ml-2">
                  {p.zodiac.element} sign
                </span>
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Section 3: Life Situation */}
      <CollapsibleSection title="Life Situation" icon="🏡">
        <div className="space-y-4">
          <div>
            <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-2">
              Relationship History
            </span>
            {radioSelect<RelationshipHistory>(
              [
                { value: 'single_long_time', label: 'Single (long)' },
                { value: 'recently_single', label: 'Recently Single' },
                { value: 'dating_around', label: 'Dating Around' },
                { value: 'in_relationship', label: 'In Relationship' },
                { value: 'married', label: 'Married' },
                { value: 'complicated', label: 'Complicated' },
                { value: 'prefer_not_say', label: 'Unknown' },
              ],
              p.relationshipHistory,
              (v) => update('relationshipHistory', v)
            )}
          </div>
          <div>
            <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-2">
              Children
            </span>
            {radioSelect<ChildrenStatus>(
              [
                { value: 'none', label: 'None' },
                { value: 'has_children', label: 'Has Kids' },
                { value: 'prefer_not_say', label: 'Unknown' },
              ],
              p.children,
              (v) => update('children', v)
            )}
          </div>
          <div>
            <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-2">
              Living Situation
            </span>
            {radioSelect<LivingSituation>(
              [
                { value: 'alone', label: 'Alone' },
                { value: 'roommates', label: 'Roommates' },
                { value: 'family', label: 'Family' },
                { value: 'prefer_not_say', label: 'Unknown' },
              ],
              p.livingSituation,
              (v) => update('livingSituation', v)
            )}
          </div>
          <input
            value={p.religion || ''}
            onChange={(e) => update('religion', e.target.value || null)}
            placeholder="Religion / Spirituality"
            className="w-full bg-white/5 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-rose-500 placeholder:text-white/15"
          />
        </div>
      </CollapsibleSection>

      {/* Section 4: Career & Ambition */}
      <CollapsibleSection title="Career & Ambition" icon="💼">
        <div className="space-y-3">
          <input
            value={p.job || ''}
            onChange={(e) => update('job', e.target.value || null)}
            placeholder="What she does"
            className="w-full bg-white/5 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-rose-500 placeholder:text-white/15"
          />
          <div>
            <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-2">
              How she feels about it
            </span>
            {radioSelect<JobFeeling>(
              [
                { value: 'loves_it', label: 'Loves It' },
                { value: 'its_fine', label: "It's Fine" },
                { value: 'hates_it', label: 'Hates It' },
                { value: 'between_jobs', label: 'Between' },
                { value: 'prefer_not_say', label: 'Unknown' },
              ],
              p.jobFeeling,
              (v) => update('jobFeeling', v)
            )}
          </div>
          <input
            value={p.aspiration || ''}
            onChange={(e) => update('aspiration', e.target.value || null)}
            placeholder="Her dream / aspiration"
            className="w-full bg-white/5 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-rose-500 placeholder:text-white/15"
          />
        </div>
      </CollapsibleSection>

      {/* Section 5: Love Language */}
      <CollapsibleSection title="Love Language" icon="💕">
        <div className="space-y-4">
          <div>
            <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-2">
              Primary
            </span>
            {loveLangSelect(true)}
          </div>
          <div>
            <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-2">
              Secondary
            </span>
            {loveLangSelect(false)}
          </div>
        </div>
      </CollapsibleSection>

      {/* Section 6: Personality */}
      <CollapsibleSection
        title="Personality"
        icon="🧠"
        badge={p.personalityTraits.length > 0 ? `${p.personalityTraits.length}` : undefined}
      >
        <CheckboxGrid
          options={PERSONALITY_OPTIONS}
          selected={p.personalityTraits}
          onChange={(v) => update('personalityTraits', v)}
          columns={3}
        />
      </CollapsibleSection>

      {/* Section 7: Interests */}
      <CollapsibleSection
        title="Interests"
        icon="🎯"
        badge={p.interests.length > 0 ? `${p.interests.length}` : undefined}
      >
        <CheckboxGrid
          options={INTEREST_OPTIONS}
          selected={p.interests}
          onChange={(v) => update('interests', v)}
          columns={3}
        />
      </CollapsibleSection>

      {/* Section 8: Signature Details */}
      <CollapsibleSection title="Signature Details" icon="🔑">
        <div className="space-y-3">
          <input
            value={p.drink || ''}
            onChange={(e) => update('drink', e.target.value || null)}
            placeholder="Her go-to drink"
            className="w-full bg-white/5 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-rose-500 placeholder:text-white/15"
          />
          <input
            value={p.dreamDestination || ''}
            onChange={(e) => update('dreamDestination', e.target.value || null)}
            placeholder="Dream destination"
            className="w-full bg-white/5 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-rose-500 placeholder:text-white/15"
          />
          <input
            value={p.lovedPlace || ''}
            onChange={(e) => update('lovedPlace', e.target.value || null)}
            placeholder="Place she loves"
            className="w-full bg-white/5 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-rose-500 placeholder:text-white/15"
          />
          <input
            value={p.definingMedia || ''}
            onChange={(e) => update('definingMedia', e.target.value || null)}
            placeholder="Defining book / movie / song"
            className="w-full bg-white/5 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-rose-500 placeholder:text-white/15"
          />
          <input
            value={p.catchPhrase || ''}
            onChange={(e) => update('catchPhrase', e.target.value || null)}
            placeholder="Her catch phrase"
            className="w-full bg-white/5 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-rose-500 placeholder:text-white/15"
          />
          <input
            value={p.friendNickname || ''}
            onChange={(e) => update('friendNickname', e.target.value || null)}
            placeholder="What friends call her"
            className="w-full bg-white/5 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-rose-500 placeholder:text-white/15"
          />
        </div>
      </CollapsibleSection>

      {/* Section 9: What Impresses */}
      <CollapsibleSection title="What Impresses Her" icon="✨" badge="Max 3">
        <CheckboxGrid
          options={IMPRESSION_OPTIONS}
          selected={p.impressionFactors}
          onChange={(v) => update('impressionFactors', v)}
          max={3}
          columns={2}
        />
      </CollapsibleSection>

      {/* Section 10: Comfort & Play */}
      <CollapsibleSection title="Comfort & Play" icon="🎲">
        <div className="space-y-4">
          <div>
            <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-2">
              Physical Comfort
            </span>
            {radioSelect<PhysicalComfort>(
              [
                { value: 'no_touch', label: 'No Touch' },
                { value: 'light_touch', label: 'Light' },
                { value: 'affectionate', label: 'Affectionate' },
                { value: 'very_physical', label: 'Very Physical' },
              ],
              p.physicalComfort,
              (v) => update('physicalComfort', v)
            )}
          </div>
          <div>
            <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-2">
              Play Style
            </span>
            {radioSelect<PlayStyle>(
              [
                { value: 'shy', label: 'Shy' },
                { value: 'flirty', label: 'Flirty' },
                { value: 'bold', label: 'Bold' },
                { value: 'chaotic', label: 'Chaotic' },
              ],
              p.playStyle,
              (v) => update('playStyle', v)
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Save button */}
      {error && (
        <div className="mt-2 px-4 py-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-xs text-center">
          {error}
        </div>
      )}
      <button
        disabled={!p.name.trim()}
        onClick={handleSave}
        className="mt-4 w-full py-5 bg-rose-600 rounded-full text-[11px] uppercase tracking-[0.4em] font-black text-white hover:bg-rose-500 disabled:opacity-20 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(225,29,72,0.4)] transition-all"
      >
        {existingProfile ? 'Update Profile' : 'Save Profile'}
      </button>
    </motion.div>
  );
};
