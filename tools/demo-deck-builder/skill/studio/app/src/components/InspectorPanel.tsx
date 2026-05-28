import { useEffect, useRef, useState } from 'react';
import type { InspectorFocusRequest, SlidePickerModule, StudioDeckData, StudioIssue } from '../types';
import { ChecksPanel, LabelValue, PanelTitle, ThemeToken } from './common';
import {
  coverFieldsForSlide,
  contentFieldKeysForSlide,
  editableSlideId,
  genericFieldsForSlide,
  isCoverEditableSlide,
  isEditableSlide,
  moduleStatusLabel,
  scaffoldLabel,
  speakerForSlide,
  stableFieldSnapshot
} from '../utils/studio';

interface SlideInspectorPanelProps {
  deck: StudioDeckData;
  activeSlide: StudioDeckData['slides'][number] | null;
  activeModule: SlidePickerModule | null;
  pendingModuleId: string | null;
  savingSlideId: string | null;
  savingThemeId: string | null;
  focusRequest: InspectorFocusRequest | null;
  onToggle: (module: SlidePickerModule) => void;
  onAdd: (module: SlidePickerModule) => void;
  onRefresh: (module: SlidePickerModule) => void;
  onSaveSlideFields: (slideId: string, fields: Record<string, string>) => Promise<void>;
  onSaveThemePreset: (theme: ThemePreset) => Promise<void>;
}

export function SlideInspectorPanel({
  deck,
  activeSlide,
  activeModule,
  pendingModuleId,
  savingSlideId,
  savingThemeId,
  focusRequest,
  onToggle,
  onAdd,
  onRefresh,
  onSaveSlideFields,
  onSaveThemePreset
}: SlideInspectorPanelProps) {
  const pending = Boolean(activeModule && pendingModuleId === activeModule.id);
  const coverEditable = Boolean(activeSlide && isCoverEditableSlide(activeSlide));
  const genericEditable = Boolean(activeSlide && !coverEditable && isEditableSlide(activeSlide));
  const slideSaveId = activeSlide ? editableSlideId(activeSlide) : '';
  const savingSlide = Boolean(slideSaveId && savingSlideId === slideSaveId);

  return (
    <section className="panel inspector-panel">
      <PanelTitle label="Inspector" />

      <div className="inspector-group">
        <div className="inspector-heading">
          <span>Slide</span>
          <strong>{activeSlide ? `Slide ${String(activeSlide.number).padStart(2, '0')}` : 'None'}</strong>
        </div>
        {activeSlide ? (
          <div className="inspector-stack">
            <LabelValue label="Title" value={activeSlide.title || 'Untitled'} />
            <LabelValue label="Speaker" value={activeSlide.speaker || 'not set'} tone={activeSlide.speaker ? '' : 'warn'} />
            <LabelValue label="Position" value={`Slide ${String(activeSlide.number).padStart(2, '0')} of ${deck.slideCount}`} />
            <LabelValue label="Words" value={String(activeSlide.word_count || 0)} />
          </div>
        ) : (
          <div className="empty">Select a slide from the deck structure.</div>
        )}
      </div>

      {activeSlide && (
        <SpeakerEditor
          activeSlide={activeSlide}
          isSaving={savingSlide}
          onSave={(fields) => onSaveSlideFields(slideSaveId, fields)}
        />
      )}

      {activeSlide && coverEditable && (
        <CoverContentEditor
          activeSlide={activeSlide}
          focusRequest={focusRequest}
          isSaving={savingSlide}
          onSave={(fields) => onSaveSlideFields(slideSaveId, fields)}
        />
      )}

      {activeSlide && genericEditable && (
        <GenericContentEditor
          activeSlide={activeSlide}
          focusRequest={focusRequest}
          isSaving={savingSlide}
          onSave={(fields) => onSaveSlideFields(slideSaveId, fields)}
        />
      )}

      <div className="inspector-group">
        <div className="inspector-heading">
          <span>Slide setup</span>
          <strong>{activeModule?.label || 'Unmapped'}</strong>
        </div>
        {activeModule ? (
          <>
            <div className="inspector-stack">
              <LabelValue label="Section" value={activeModule.section_label || 'Other'} />
              <LabelValue label="Slide type" value={activeModule.pattern_label || 'none'} />
              <LabelValue label="Status" value={moduleStatusLabel(activeModule)} tone={activeModule.included ? 'ok' : 'warn'} />
              <LabelValue label="Readiness" value={scaffoldLabel(activeModule)} />
            </div>
            <div className="inspector-actions">
              <button
                className="inspector-button"
                type="button"
                disabled={pending}
                onClick={() => onToggle(activeModule)}
              >
                {activeModule.included ? 'Remove from deck' : 'Restore to deck'}
              </button>
              {activeModule.can_add && (
                <button
                  className="inspector-button"
                  type="button"
                disabled={pending}
                onClick={() => onAdd(activeModule)}
              >
                  Add to deck
                </button>
              )}
              {activeModule.can_refresh && (
                <button
                  className="inspector-button warn"
                  type="button"
                  disabled={pending}
                  onClick={() => onRefresh(activeModule)}
                >
                  Refresh renderer
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="empty">No slide option is mapped to this preview slide.</div>
        )}
      </div>

      <div className="inspector-group">
        <div className="inspector-heading">
          <span>Theme</span>
          <strong>{deck.brand.preset_label || deck.brand.status}</strong>
        </div>
        <ThemePresetPicker
          brand={deck.brand}
          merchantName={deck.merchant?.name}
          savingThemeId={savingThemeId}
          onSaveThemePreset={onSaveThemePreset}
        />
        <div className="theme-token-grid">
          <ThemeToken label="Accent" value={deck.brand.accent || 'not set'} color={deck.brand.accent} />
          <ThemeToken label="Bright" value={deck.brand.accent_bright || 'not set'} color={deck.brand.accent_bright} />
          <LabelValue label="Heading" value={deck.brand.heading_font || 'not set'} />
          <LabelValue label="Body" value={deck.brand.body_font || deck.brand.heading_font || 'not set'} />
          <LabelValue label="Motion" value={deck.brand.motion_preset_label || deck.brand.motion_preset_id || 'standard'} />
          <LabelValue label="Logo" value={deck.brand.logo_embedded ? 'embedded' : deck.brand.logo_path || 'missing'} tone={deck.brand.logo_embedded ? 'ok' : 'warn'} />
        </div>
      </div>
    </section>
  );
}

interface ThemePreset {
  id: string;
  label: string;
  action_id?: string;
  action_label?: string;
  accent: string;
  accent_bright: string;
  font_preset_id?: string;
  font_preset_label?: string;
  heading_font?: string;
  body_font?: string;
  motion_preset_id?: string;
  motion_preset_label?: string;
  kind?: 'merchant' | 'library';
}

interface FontPreset {
  id: string;
  label: string;
  heading_font: string;
  body_font: string;
  note: string;
}

interface MotionPreset {
  id: string;
  label: string;
  note: string;
}

const TEXT_AUTOSAVE_DELAY_MS = 1200;

const SHARED_COLOR_PRESETS: ThemePreset[] = [
  { id: 'shopify-teal', label: 'Shopify Teal', accent: '#14a098', accent_bright: '#1cc7bd' },
  { id: 'commerce-blue', label: 'Commerce Blue', accent: '#3977d6', accent_bright: '#8fb7ff' },
  { id: 'field-green', label: 'Field Green', accent: '#39a36f', accent_bright: '#86e0af' },
  { id: 'launch-gold', label: 'Launch Gold', accent: '#b88922', accent_bright: '#f2c86b' },
  { id: 'ai-coral', label: 'AI Coral', accent: '#d97757', accent_bright: '#ffb089' },
  { id: 'executive-slate', label: 'Executive Slate', accent: '#7d92b8', accent_bright: '#bdd0f2' }
];

const FONT_PRESETS: FontPreset[] = [
  { id: 'inter', label: 'Inter', heading_font: 'Inter', body_font: 'Inter', note: 'Default studio deck' },
  { id: 'ibm-plex', label: 'IBM Plex Sans', heading_font: 'IBM Plex Sans', body_font: 'IBM Plex Sans', note: 'Enterprise briefing' },
  { id: 'space-grotesk', label: 'Space Grotesk', heading_font: 'Space Grotesk', body_font: 'Inter', note: 'Product-forward' },
  { id: 'manrope', label: 'Manrope', heading_font: 'Manrope', body_font: 'Manrope', note: 'Retail polish' },
  { id: 'work-sans', label: 'Work Sans', heading_font: 'Work Sans', body_font: 'Work Sans', note: 'Operational clarity' }
];

const MOTION_PRESETS: MotionPreset[] = [
  { id: 'standard', label: 'Standard', note: 'Balanced reveal and ambient motion' },
  { id: 'calm', label: 'Calm', note: 'Softer backgrounds and slower pulses' },
  { id: 'cinematic', label: 'Cinematic', note: 'Higher-energy motion for live demos' },
  { id: 'still', label: 'Still', note: 'Static mode for PDF-first review' }
];

function ThemePresetPicker({
  brand,
  merchantName,
  savingThemeId,
  onSaveThemePreset
}: {
  brand: StudioDeckData['brand'];
  merchantName?: string;
  savingThemeId: string | null;
  onSaveThemePreset: (theme: ThemePreset) => Promise<void>;
}) {
  const merchantPreset = merchantThemePreset(brand, merchantName);
  const presets = merchantPreset ? [merchantPreset, ...SHARED_COLOR_PRESETS] : SHARED_COLOR_PRESETS;
  const activeColorId = activeThemePresetId(brand, merchantPreset);
  const activeFont = activeFontPreset(brand);
  const activeMotion = activeMotionPreset(brand);

  function saveColorPreset(preset: ThemePreset) {
    return onSaveThemePreset(themeUpdateFromBrand(brand, merchantPreset, {
      id: preset.id,
      label: preset.label,
      action_id: preset.id,
      action_label: preset.label,
      accent: preset.accent,
      accent_bright: preset.accent_bright
    }));
  }

  function saveFontPreset(preset: FontPreset) {
    return onSaveThemePreset(themeUpdateFromBrand(brand, merchantPreset, {
      action_id: fontSaveId(preset),
      action_label: preset.label,
      font_preset_id: preset.id,
      font_preset_label: preset.label,
      heading_font: preset.heading_font,
      body_font: preset.body_font
    }));
  }

  function saveMotionPreset(preset: MotionPreset) {
    return onSaveThemePreset(themeUpdateFromBrand(brand, merchantPreset, {
      action_id: motionSaveId(preset),
      action_label: preset.label,
      motion_preset_id: preset.id,
      motion_preset_label: preset.label
    }));
  }

  return (
    <div className="theme-preset-panel">
      <div className="theme-preset-copy">
        <span>Style libraries</span>
        <small>Controlled color, type, and motion choices. Updates preview and publish/PDF output.</small>
      </div>
      <div className="theme-library">
        <div className="theme-library-heading">
          <span>Color scheme</span>
          <strong>{activeColorId ? colorLabelForId(activeColorId, presets) : 'Custom'}</strong>
        </div>
      <div className="theme-preset-grid">
        {presets.map((preset) => {
          const active = activeColorId === preset.id;
          const saving = savingThemeId === preset.id;
          return (
            <button
              className={`theme-preset ${active ? 'active' : ''} ${preset.kind === 'merchant' ? 'merchant' : ''}`}
              type="button"
              key={preset.id}
              disabled={Boolean(savingThemeId)}
              aria-pressed={active}
              onClick={() => saveColorPreset(preset)}
            >
              <span className="theme-preset-swatches">
                <i style={{ backgroundColor: preset.accent }} />
                <i style={{ backgroundColor: preset.accent_bright }} />
              </span>
              <span className="theme-preset-label">
                <strong>{saving ? 'Saving...' : preset.label}</strong>
                {preset.kind === 'merchant' && <small>Current deck</small>}
              </span>
            </button>
          );
        })}
      </div>
      </div>

      <div className="theme-library">
        <div className="theme-library-heading">
          <span>Font</span>
          <strong>{activeFont.label}</strong>
        </div>
        <div className="theme-option-grid">
          {FONT_PRESETS.map((preset) => {
            const active = activeFont.id === preset.id;
            const saving = savingThemeId === fontSaveId(preset);
            return (
              <button
                className={`theme-option font-option ${active ? 'active' : ''}`}
                type="button"
                key={preset.id}
                disabled={Boolean(savingThemeId)}
                aria-pressed={active}
                onClick={() => saveFontPreset(preset)}
              >
                <span className="font-sample" style={{ fontFamily: preset.heading_font }}>{saving ? '...' : 'Aa'}</span>
                <span>
                  <strong>{preset.label}</strong>
                  <small>{preset.note}</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="theme-library">
        <div className="theme-library-heading">
          <span>Motion</span>
          <strong>{activeMotion.label}</strong>
        </div>
        <div className="theme-option-grid motion-grid">
          {MOTION_PRESETS.map((preset) => {
            const active = activeMotion.id === preset.id;
            const saving = savingThemeId === motionSaveId(preset);
            return (
              <button
                className={`theme-option motion-option ${active ? 'active' : ''}`}
                type="button"
                key={preset.id}
                disabled={Boolean(savingThemeId)}
                aria-pressed={active}
                onClick={() => saveMotionPreset(preset)}
              >
                <span className={`motion-sample ${preset.id}`} aria-hidden="true"><i /><i /><i /></span>
                <span>
                  <strong>{saving ? 'Saving...' : preset.label}</strong>
                  <small>{preset.note}</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function merchantThemePreset(brand: StudioDeckData['brand'], merchantName?: string): ThemePreset | null {
  const source = brand.merchant_preset || {};
  const accent = source.accent || brand.accent || '';
  const accentBright = source.accent_bright || brand.accent_bright || '';
  if (!accent || !accentBright) return null;

  return {
    id: 'merchant-brand',
    label: source.label || `${merchantName || 'Merchant'} Brand`,
    accent,
    accent_bright: accentBright,
    heading_font: source.heading_font || brand.heading_font || 'Inter',
    body_font: source.body_font || brand.body_font || 'Inter',
    kind: 'merchant'
  };
}

function activeThemePresetId(brand: StudioDeckData['brand'], merchantPreset: ThemePreset | null) {
  if (brand.preset_id && SHARED_COLOR_PRESETS.some((preset) => preset.id === brand.preset_id)) {
    return brand.preset_id;
  }

  if (merchantPreset && colorsMatch(brand.accent, merchantPreset.accent) && colorsMatch(brand.accent_bright, merchantPreset.accent_bright)) {
    return merchantPreset.id;
  }

  return presetIdForColors(brand.accent, brand.accent_bright);
}

function presetIdForColors(accent = '', bright = '') {
  const accentKey = accent.toLowerCase();
  const brightKey = bright.toLowerCase();
  return SHARED_COLOR_PRESETS.find((preset) => preset.accent.toLowerCase() === accentKey && preset.accent_bright.toLowerCase() === brightKey)?.id || '';
}

function colorsMatch(a = '', b = '') {
  return a.toLowerCase() === b.toLowerCase();
}

function colorLabelForId(id: string, presets: ThemePreset[]) {
  return presets.find((preset) => preset.id === id)?.label || 'Custom';
}

function activeFontPreset(brand: StudioDeckData['brand']): FontPreset {
  const id = brand.font_preset_id || '';
  if (id) {
    const match = FONT_PRESETS.find((preset) => preset.id === id);
    if (match) return match;
  }

  const heading = (brand.heading_font || '').toLowerCase();
  const body = (brand.body_font || '').toLowerCase();
  return FONT_PRESETS.find((preset) => {
    return preset.heading_font.toLowerCase() === heading &&
      (!body || preset.body_font.toLowerCase() === body);
  }) || FONT_PRESETS[0];
}

function activeMotionPreset(brand: StudioDeckData['brand']): MotionPreset {
  return MOTION_PRESETS.find((preset) => preset.id === brand.motion_preset_id) || MOTION_PRESETS[0];
}

function themeUpdateFromBrand(
  brand: StudioDeckData['brand'],
  merchantPreset: ThemePreset | null,
  patch: Partial<ThemePreset>
): ThemePreset {
  const activeColorId = activeThemePresetId(brand, merchantPreset);
  const activeColor = [...(merchantPreset ? [merchantPreset] : []), ...SHARED_COLOR_PRESETS].find((preset) => preset.id === activeColorId);
  const activeFont = activeFontPreset(brand);
  const activeMotion = activeMotionPreset(brand);
  const fallbackColor = activeColor || SHARED_COLOR_PRESETS[0];

  return {
    id: brand.preset_id || fallbackColor.id,
    label: brand.preset_label || fallbackColor.label,
    accent: brand.accent || fallbackColor.accent,
    accent_bright: brand.accent_bright || fallbackColor.accent_bright,
    font_preset_id: activeFont.id,
    font_preset_label: activeFont.label,
    heading_font: activeFont.heading_font,
    body_font: activeFont.body_font,
    motion_preset_id: activeMotion.id,
    motion_preset_label: activeMotion.label,
    ...patch
  };
}

function fontSaveId(preset: FontPreset) {
  return `font:${preset.id}`;
}

function motionSaveId(preset: MotionPreset) {
  return `motion:${preset.id}`;
}

function SpeakerEditor({
  activeSlide,
  isSaving,
  onSave
}: {
  activeSlide: StudioDeckData['slides'][number];
  isSaving: boolean;
  onSave: (fields: Record<string, string>) => Promise<void>;
}) {
  const slideIdentity = activeSlide.manifest_slide_id || activeSlide.id || String(activeSlide.number);
  const [speaker, setSpeaker] = useState(() => speakerForSlide(activeSlide));
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'error'>('saved');
  const latestValue = useRef(speaker);
  const lastSavedValue = useRef(speaker);

  useEffect(() => {
    const nextSpeaker = speakerForSlide(activeSlide);
    setSpeaker(nextSpeaker);
    latestValue.current = nextSpeaker;
    lastSavedValue.current = nextSpeaker;
    setSaveState('saved');
  }, [slideIdentity]);

  const hasPendingChanges = speaker !== lastSavedValue.current;

  useEffect(() => {
    latestValue.current = speaker;
    if (!hasPendingChanges) return;

    setSaveState('pending');
    const timeout = window.setTimeout(() => {
      const valueToSave = speaker;
      onSave({ speaker })
        .then(() => {
          if (latestValue.current === valueToSave) {
            lastSavedValue.current = valueToSave;
            setSaveState('saved');
          }
        })
        .catch(() => {
          if (latestValue.current === valueToSave) setSaveState('error');
        });
    }, TEXT_AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [hasPendingChanges, onSave, speaker]);

  const autosaveLabel = isSaving
    ? 'Updating preview...'
    : saveState === 'error'
      ? 'Speaker save failed'
      : hasPendingChanges
        ? 'Speaker save pending'
        : 'Speaker saved';

  return (
    <div className="inspector-group speaker-group">
      <div className="inspector-heading">
        <span>Speaker</span>
        <strong>Talk track owner</strong>
      </div>
      <div className={`autosave-status compact ${saveState === 'error' ? 'error' : hasPendingChanges || isSaving ? 'pending' : 'saved'}`}>
        <span>{autosaveLabel}</span>
        <small>Updates this slide's presenter label.</small>
      </div>
      <div className="field-stack">
        <TextField fieldKey="speaker" label="Speaker name" value={speaker} maxLength={80} onChange={setSpeaker} />
      </div>
    </div>
  );
}

function CoverContentEditor({
  activeSlide,
  focusRequest,
  isSaving,
  onSave
}: {
  activeSlide: StudioDeckData['slides'][number];
  focusRequest: InspectorFocusRequest | null;
  isSaving: boolean;
  onSave: (fields: Record<string, string>) => Promise<void>;
}) {
  const slideIdentity = activeSlide.manifest_slide_id || activeSlide.id || String(activeSlide.number);
  const groupRef = useRef<HTMLDivElement | null>(null);
  const [fields, setFields] = useState<Record<string, string>>(() => coverFieldsForSlide(activeSlide));
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'blocked' | 'error'>('saved');
  const latestSnapshot = useRef(stableFieldSnapshot(fields));
  const lastSavedSnapshot = useRef(stableFieldSnapshot(fields));

  useEffect(() => {
    const nextFields = coverFieldsForSlide(activeSlide);
    const snapshot = stableFieldSnapshot(nextFields);
    setFields(nextFields);
    latestSnapshot.current = snapshot;
    lastSavedSnapshot.current = snapshot;
    setSaveState('saved');
  }, [slideIdentity]);

  const fieldSnapshot = stableFieldSnapshot(fields);
  const hasPendingChanges = fieldSnapshot !== lastSavedSnapshot.current;

  useEffect(() => {
    if (!focusRequest || focusRequest.slideId !== slideIdentity) return;

    window.requestAnimationFrame(() => {
      const requestedField = focusRequest.field && COVER_FIELD_KEYS.includes(focusRequest.field)
        ? focusRequest.field
        : 'title';
      const input = groupRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-editor-field="${requestedField}"]`);
      if (!input) return;

      input.focus();
      const cursorPosition = input.value.length;
      input.setSelectionRange(cursorPosition, cursorPosition);
      input.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
  }, [focusRequest, slideIdentity]);

  useEffect(() => {
    latestSnapshot.current = fieldSnapshot;
    if (!hasPendingChanges) return;
    if (!fields.title.trim()) {
      setSaveState('blocked');
      return;
    }

    setSaveState('pending');
    const timeout = window.setTimeout(() => {
      const snapshotToSave = fieldSnapshot;
      onSave(fields)
        .then(() => {
          if (latestSnapshot.current === snapshotToSave) {
            lastSavedSnapshot.current = snapshotToSave;
            setSaveState('saved');
          }
        })
        .catch(() => {
          if (latestSnapshot.current === snapshotToSave) setSaveState('error');
        });
    }, TEXT_AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [fieldSnapshot, fields, hasPendingChanges, onSave]);

  function setField(key: string, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  const autosaveLabel = isSaving
    ? 'Updating preview...'
    : saveState === 'error'
      ? 'Autosave failed'
      : saveState === 'blocked'
        ? 'Title required'
        : hasPendingChanges
          ? 'Autosave pending'
          : 'Saved to manifest';

  return (
    <div className="inspector-group edit-group" ref={groupRef}>
      <div className="inspector-heading">
        <span>Cover Copy</span>
        <strong>Autosave</strong>
      </div>
      <div className={`autosave-status ${saveState === 'error' || saveState === 'blocked' ? 'error' : hasPendingChanges || isSaving ? 'pending' : 'saved'}`}>
        <span>{autosaveLabel}</span>
        <small>Saves after you pause typing.</small>
      </div>
      <div className="field-stack">
        <TextField fieldKey="eyebrow" label="Eyebrow" value={fields.eyebrow} maxLength={90} onChange={(value) => setField('eyebrow', value)} />
        <TextField fieldKey="title" label="Title" value={fields.title} maxLength={150} onChange={(value) => setField('title', value)} />
        <TextAreaField fieldKey="subtitle" label="Subtitle" value={fields.subtitle} maxLength={320} rows={4} onChange={(value) => setField('subtitle', value)} />
        <TextField fieldKey="prepared_for" label="Prepared For" value={fields.prepared_for} maxLength={160} onChange={(value) => setField('prepared_for', value)} />
        <TextField fieldKey="presented_by" label="Presented By" value={fields.presented_by} maxLength={160} onChange={(value) => setField('presented_by', value)} />
        <TextField fieldKey="focus" label="Focus" value={fields.focus} maxLength={160} onChange={(value) => setField('focus', value)} />
      </div>
    </div>
  );
}

const COVER_FIELD_KEYS = ['eyebrow', 'title', 'subtitle', 'prepared_for', 'presented_by', 'focus'];

function GenericContentEditor({
  activeSlide,
  focusRequest,
  isSaving,
  onSave
}: {
  activeSlide: StudioDeckData['slides'][number];
  focusRequest: InspectorFocusRequest | null;
  isSaving: boolean;
  onSave: (fields: Record<string, string>) => Promise<void>;
}) {
  const slideIdentity = activeSlide.manifest_slide_id || activeSlide.id || String(activeSlide.number);
  const groupRef = useRef<HTMLDivElement | null>(null);
  const [fields, setFields] = useState<Record<string, string>>(() => genericFieldsForSlide(activeSlide));
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'blocked' | 'error'>('saved');
  const latestSnapshot = useRef(stableFieldSnapshot(fields));
  const lastSavedSnapshot = useRef(stableFieldSnapshot(fields));

  useEffect(() => {
    const nextFields = genericFieldsForSlide(activeSlide);
    const snapshot = stableFieldSnapshot(nextFields);
    setFields(nextFields);
    latestSnapshot.current = snapshot;
    lastSavedSnapshot.current = snapshot;
    setSaveState('saved');
  }, [slideIdentity]);

  const fieldSnapshot = stableFieldSnapshot(fields);
  const hasPendingChanges = fieldSnapshot !== lastSavedSnapshot.current;

  useEffect(() => {
    if (!focusRequest || focusRequest.slideId !== slideIdentity) return;

    window.requestAnimationFrame(() => {
      const requestedField = focusRequest.field && GENERIC_FIELD_KEYS.includes(focusRequest.field)
        ? focusRequest.field
        : 'title';
      const input = groupRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-editor-field="${requestedField}"]`);
      if (!input) return;

      input.focus();
      const cursorPosition = input.value.length;
      input.setSelectionRange(cursorPosition, cursorPosition);
      input.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
  }, [focusRequest, slideIdentity]);

  useEffect(() => {
    latestSnapshot.current = fieldSnapshot;
    if (!hasPendingChanges) return;
    if (!fields.title.trim()) {
      setSaveState('blocked');
      return;
    }

    setSaveState('pending');
    const timeout = window.setTimeout(() => {
      const snapshotToSave = fieldSnapshot;
      onSave(fields)
        .then(() => {
          if (latestSnapshot.current === snapshotToSave) {
            lastSavedSnapshot.current = snapshotToSave;
            setSaveState('saved');
          }
        })
        .catch(() => {
          if (latestSnapshot.current === snapshotToSave) setSaveState('error');
        });
    }, TEXT_AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [fieldSnapshot, fields, hasPendingChanges, onSave]);

  function setField(key: string, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  const autosaveLabel = isSaving
    ? 'Updating preview...'
    : saveState === 'error'
      ? 'Autosave failed'
      : saveState === 'blocked'
        ? 'Title required'
        : hasPendingChanges
          ? 'Autosave pending'
          : 'Saved to manifest';

  return (
    <div className="inspector-group edit-group" ref={groupRef}>
      <div className="inspector-heading">
        <span>Slide Copy</span>
        <strong>Autosave</strong>
      </div>
      <div className={`autosave-status ${saveState === 'error' || saveState === 'blocked' ? 'error' : hasPendingChanges || isSaving ? 'pending' : 'saved'}`}>
        <span>{autosaveLabel}</span>
        <small>Saves after you pause typing.</small>
      </div>
      <div className="field-stack">
        {contentFieldKeysForSlide(activeSlide).map((fieldKey) => (
          <ContentField
            key={fieldKey}
            fieldKey={fieldKey}
            value={fields[fieldKey] || ''}
            onChange={(value) => setField(fieldKey, value)}
          />
        ))}
      </div>
    </div>
  );
}

const GENERIC_FIELD_KEYS = ['eyebrow', 'title', 'lede', 'discovery_confirmed', 'discovery_in_motion', 'feature_bullets', 'feature_closing'];

function ContentField({
  fieldKey,
  value,
  onChange
}: {
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const definition = CONTENT_FIELD_DEFINITIONS[fieldKey] || {
    label: fieldKey,
    maxLength: 180,
    kind: 'input' as const
  };

  if (definition.kind === 'textarea') {
    return (
      <TextAreaField
        fieldKey={fieldKey}
        label={definition.label}
        value={value}
        maxLength={definition.maxLength}
        rows={definition.rows || 4}
        helper={definition.helper}
        onChange={onChange}
      />
    );
  }

  return (
    <TextField
      fieldKey={fieldKey}
      label={definition.label}
      value={value}
      maxLength={definition.maxLength}
      onChange={onChange}
    />
  );
}

const CONTENT_FIELD_DEFINITIONS: Record<string, { label: string; maxLength: number; kind: 'input' | 'textarea'; rows?: number; helper?: string }> = {
  eyebrow: { label: 'Eyebrow', maxLength: 90, kind: 'input' },
  title: { label: 'Title', maxLength: 180, kind: 'input' },
  lede: { label: 'Lede', maxLength: 320, kind: 'textarea', rows: 3 },
  discovery_confirmed: { label: 'Confirmed Requirements', maxLength: 1300, kind: 'textarea', rows: 6, helper: 'One bullet per line.' },
  discovery_in_motion: { label: "What's In Motion", maxLength: 1300, kind: 'textarea', rows: 6, helper: 'One bullet per line.' },
  feature_bullets: { label: 'Capability Bullets', maxLength: 1400, kind: 'textarea', rows: 6, helper: 'One bullet per line. Use “Label — detail” to keep bold labels.' },
  feature_closing: { label: 'Closing Callout', maxLength: 240, kind: 'textarea', rows: 3 }
};

function TextField({
  fieldKey,
  label,
  value,
  maxLength,
  onChange
}: {
  fieldKey: string;
  label: string;
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field-row">
      <span>{label}</span>
      <input data-editor-field={fieldKey} value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextAreaField({
  fieldKey,
  label,
  value,
  maxLength,
  rows,
  helper,
  onChange
}: {
  fieldKey: string;
  label: string;
  value: string;
  maxLength: number;
  rows: number;
  helper?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field-row">
      <span>{label}</span>
      <textarea data-editor-field={fieldKey} value={value} maxLength={maxLength} rows={rows} onChange={(event) => onChange(event.target.value)} />
      {helper && <small>{helper}</small>}
    </label>
  );
}

export function DeckHealthPanel({ deck, issues }: { deck: StudioDeckData; issues: StudioIssue[] }) {
  const missing = deck.plan.gates.filter((gate) => gate.required && !gate.passed).length;
  return (
    <section className="panel health-panel">
      <PanelTitle label="Readiness" />
      <div className="health-grid">
        <LabelValue label="Strategy" value={`${deck.plan.strategy.deck_type} · ${missing} gaps`} tone={missing ? 'warn' : 'ok'} />
        <LabelValue label="Manifest" value={deck.manifest?.status === 'active' ? `${deck.manifest.module_count} slide options` : 'config fallback'} tone={deck.manifest?.status === 'active' ? 'ok' : 'warn'} />
        <LabelValue label="Brand" value={deck.brand.status} tone={deck.brand.logo_embedded ? 'ok' : 'warn'} />
        <LabelValue label="Checks" value={`${issues.length} findings`} tone={deck.lint.errors.length ? 'danger' : deck.lint.warnings.length ? 'warn' : 'ok'} />
      </div>

      <details className="health-details">
        <summary>Readiness checks</summary>
        <div className="gate-list">
          {deck.plan.gates.map((gate) => (
            <div className={`gate ${gate.passed ? 'pass' : gate.required ? 'missing' : 'review'}`} key={gate.id || gate.label}>
              <strong>{gate.label}</strong>
              <span>{gate.passed ? gate.evidence : gate.fix}</span>
            </div>
          ))}
        </div>
      </details>

      <details className="health-details">
        <summary>Brand</summary>
        <div className="brand-grid">
          <LabelValue label="Logo" value={deck.brand.status} tone={deck.brand.logo_embedded ? 'ok' : 'warn'} />
          <LabelValue label="Accent" value={deck.brand.accent || 'not set'} />
          <LabelValue label="File" value={deck.brand.logo_path || 'none'} />
        </div>
      </details>

      <details className="health-details">
        <summary>Lint findings</summary>
        <ChecksPanel issues={issues} />
      </details>
    </section>
  );
}
