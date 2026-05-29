import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addPatternFromLibrary,
  deckPreviewUrl,
  fetchDeck,
  publishDeck,
  refreshPatternModule,
  reorderSlides,
  setSlidePickerDecision,
  updateSlideFields,
  updateThemePreset
} from './api';
import { DeckStructurePanel } from './components/DeckStructurePanel';
import { DeckHealthPanel, SlideInspectorPanel } from './components/InspectorPanel';
import { PreviewPane } from './components/PreviewPane';
import { StudioLogo } from './components/StudioLogo';
import { FatalError, Stat } from './components/common';
import type { InspectorFocusRequest, PublishResult, SlidePickerModule, SlideReorderItem, StudioDeckData, StudioIssue } from './types';
import { clampSlide, editableSlideId, isEditableSlide } from './utils/studio';

export default function App() {
  const [deck, setDeck] = useState<StudioDeckData | null>(null);
  const [selectedSlide, setSelectedSlide] = useState(1);
  const [pendingModuleId, setPendingModuleId] = useState<string | null>(null);
  const [isReorderingSlides, setIsReorderingSlides] = useState(false);
  const [savingSlideId, setSavingSlideId] = useState<string | null>(null);
  const [savingThemeId, setSavingThemeId] = useState<string | null>(null);
  const [inspectorFocusRequest, setInspectorFocusRequest] = useState<InspectorFocusRequest | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveFieldGuideCopy, setSaveFieldGuideCopy] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDeck()
      .then((data) => {
        setDeck(data);
        setSelectedSlide((slide) => clampSlide(slide, data.slideCount));
      })
      .catch((loadError: Error) => setError(loadError.message));
  }, []);

  const issues = useMemo<StudioIssue[]>(() => {
    if (!deck) return [];
    return [
      ...deck.lint.errors.map((text) => ({ type: 'error' as const, text })),
      ...deck.lint.warnings.map((text) => ({ type: 'warning' as const, text })),
      ...deck.lint.info.map((text) => ({ type: 'info' as const, text }))
    ];
  }, [deck]);

  const previewUrl = useMemo(() => {
    return deckPreviewUrl(selectedSlide, deck?.manifest?.updated_at || deck?.slide_picker?.updated_at || '');
  }, [deck?.manifest?.updated_at, deck?.slide_picker?.updated_at, selectedSlide]);

  const activeModule = useMemo(() => {
    if (!deck) return null;
    return deck.slide_picker.modules.find((module) => module.target_slide_number === selectedSlide) || null;
  }, [deck, selectedSlide]);

  const activeSlide = useMemo(() => {
    if (!deck) return null;
    return deck.slides.find((slide) => slide.number === selectedSlide) || null;
  }, [deck, selectedSlide]);

  const activeSlideEditable = isEditableSlide(activeSlide);

  async function toggleModule(module: SlidePickerModule) {
    setPendingModuleId(module.id);
    setStatus('Saving');
    setError(null);
    try {
      const nextDeck = await setSlidePickerDecision(module.id, !module.included);
      setDeck(nextDeck);
      const nextModule = nextDeck.slide_picker.modules.find((item) => item.id === module.id);
      if (!module.included && nextModule?.target_slide_number) {
        setSelectedSlide(clampSlide(nextModule.target_slide_number, nextDeck.slideCount));
      } else {
        setSelectedSlide((slide) => clampSlide(slide, nextDeck.slideCount));
      }
      setStatus('Saved');
    } catch (saveError) {
      setError((saveError as Error).message);
      setStatus('Save failed');
    } finally {
      setPendingModuleId(null);
    }
  }

  async function addModule(module: SlidePickerModule) {
    setPendingModuleId(module.id);
    setStatus('Adding');
    setError(null);
    try {
      const nextDeck = await addPatternFromLibrary(module.id, module.add_pattern);
      setDeck(nextDeck);
      const nextModule = nextDeck.slide_picker.modules.find((item) => item.id === module.id);
      setSelectedSlide(clampSlide(nextModule?.target_slide_number || nextDeck.slideCount, nextDeck.slideCount));
      setStatus('Added');
    } catch (addError) {
      setError((addError as Error).message);
      setStatus('Add failed');
    } finally {
      setPendingModuleId(null);
    }
  }

  async function refreshModule(module: SlidePickerModule) {
    setPendingModuleId(module.id);
    setStatus('Refreshing');
    setError(null);
    try {
      const nextDeck = await refreshPatternModule(module.id, module.add_pattern || module.patterns[0]);
      setDeck(nextDeck);
      const nextModule = nextDeck.slide_picker.modules.find((item) => item.id === module.id);
      setSelectedSlide(clampSlide(nextModule?.target_slide_number || selectedSlide, nextDeck.slideCount));
      setStatus('Refreshed');
    } catch (refreshError) {
      setError((refreshError as Error).message);
      setStatus('Refresh failed');
    } finally {
      setPendingModuleId(null);
    }
  }

  async function reorderDeckSlides(slides: SlideReorderItem[]) {
    const previousSlideId = activeSlide ? slideStableId(activeSlide) : '';
    setIsReorderingSlides(true);
    setStatus('Reordering slides');
    setError(null);
    try {
      const nextDeck = await reorderSlides(slides);
      setDeck(nextDeck);
      const nextSelected = previousSlideId
        ? nextDeck.slides.find((slide) => slideStableId(slide) === previousSlideId)?.number
        : null;
      setSelectedSlide(clampSlide(nextSelected || selectedSlide, nextDeck.slideCount));
      setStatus('Slide order updated');
    } catch (reorderError) {
      setError((reorderError as Error).message);
      setStatus('Reorder failed');
      throw reorderError;
    } finally {
      setIsReorderingSlides(false);
    }
  }

  async function publishCurrentDeck() {
    setIsPublishing(true);
    setPublishResult(null);
    setStatus('Publishing deck');
    setError(null);
    try {
      const result = await publishDeck({ fieldGuideCopy: saveFieldGuideCopy });
      setPublishResult(result);
      setStatus(`Published ${result.relativeOutputPath}`);
    } catch (publishError) {
      setError((publishError as Error).message);
      setStatus('Publish failed');
    } finally {
      setIsPublishing(false);
    }
  }

  const saveSlideFields = useCallback(async (slideId: string, fields: Record<string, string>) => {
    setSavingSlideId(slideId);
    setStatus('Updating preview');
    setError(null);
    try {
      const nextDeck = await updateSlideFields(slideId, fields);
      setDeck(nextDeck);
      setSelectedSlide((slide) => clampSlide(slide, nextDeck.slideCount));
      setStatus('Preview updated');
    } catch (saveError) {
      setError((saveError as Error).message);
      setStatus('Save failed');
      throw saveError;
    } finally {
      setSavingSlideId(null);
    }
  }, []);

  const saveThemePreset = useCallback(async (theme: {
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
  }) => {
    setSavingThemeId(theme.action_id || theme.id);
    setStatus('Updating theme');
    setError(null);
    try {
      const nextDeck = await updateThemePreset(theme);
      setDeck(nextDeck);
      setSelectedSlide((slide) => clampSlide(slide, nextDeck.slideCount));
      setStatus(`Theme set to ${theme.action_label || theme.label}`);
    } catch (saveError) {
      setError((saveError as Error).message);
      setStatus('Theme update failed');
      throw saveError;
    } finally {
      setSavingThemeId(null);
    }
  }, []);

  const focusInspectorEditor = useCallback((field?: string) => {
    if (!activeSlide || !isEditableSlide(activeSlide)) {
      setStatus('This slide does not have editable fields yet.');
      return;
    }

    setInspectorFocusRequest({
      slideId: editableSlideId(activeSlide),
      field,
      nonce: Date.now()
    });
    setStatus(field ? `Editing ${inspectorFieldLabel(field)}` : 'Editing slide content');
  }, [activeSlide]);

  function selectPreviewSlide(slide: number) {
    setSelectedSlide(clampSlide(slide, deck?.slideCount || 1));
    setStatus('');
    setError(null);
  }

  function previewModule(module: SlidePickerModule) {
    const targetSlide = module.target_slide_number || 0;
    const sourceSlide = module.source_slide_number || 0;

    if (targetSlide) {
      selectPreviewSlide(targetSlide);
      if (module.target_slide_title) setStatus(`Previewing ${module.target_slide_title}`);
      return;
    }

    if (sourceSlide) {
      setStatus('That slide is hidden from the deck. Turn it back on to preview it.');
      return;
    }

    if (!module.present) {
      setStatus(`${module.label} is selected for the story, but it has not been created as a slide yet.`);
      return;
    }

    setStatus(`${module.label} does not have a preview target yet.`);
  }

  if (error && !deck) return <FatalError message={error} />;
  if (!deck) return <div className="loading">Loading Demo Deck Studio...</div>;

  return (
    <div className="studio-shell">
      <header className="topbar">
        <div className="title-block">
          <StudioLogo />
          <div className="title-copy">
            <span className="app-label">Demo Deck Studio</span>
            <h1>{deck.title}</h1>
          </div>
        </div>
        <div className="topbar-stats">
          <Stat label="Slides" value={deck.slideCount} />
          <Stat label="Warnings" value={deck.lint.warnings.length} tone="warn" />
          <Stat label="Errors" value={deck.lint.errors.length} tone="danger" />
          <a className="open-link" href={previewUrl} target="_blank" rel="noreferrer">
            Preview Deck
          </a>
          <div className="publish-actions">
            <label className="toggle-row compact-toggle">
              <input
                type="checkbox"
                checked={saveFieldGuideCopy}
                onChange={(event) => setSaveFieldGuideCopy(event.target.checked)}
              />
              <span>Field Guide copy</span>
            </label>
            <button className="open-link publish-button" type="button" disabled={isPublishing} onClick={publishCurrentDeck}>
              {isPublishing ? 'Publishing' : 'Publish'}
            </button>
          </div>
        </div>
      </header>

      <main className="workspace">
        <aside className="left-rail">
          <DeckStructurePanel
            deck={deck}
            selectedSlide={selectedSlide}
            pendingModuleId={pendingModuleId}
            isReordering={isReorderingSlides}
            onPreviewSlide={selectPreviewSlide}
            onPreviewModule={previewModule}
            onToggle={toggleModule}
            onAdd={addModule}
            onRefresh={refreshModule}
            onReorderSlides={reorderDeckSlides}
          />
        </aside>

        <PreviewPane
          previewUrl={previewUrl}
          selectedSlide={selectedSlide}
          slideCount={deck.slideCount}
          activeModule={activeModule}
          editable={activeSlideEditable}
          status={status}
          error={error}
          publishResult={publishResult}
          onPreviewEditRequest={focusInspectorEditor}
        />

        <aside className="right-rail">
          <SlideInspectorPanel
            deck={deck}
            activeSlide={activeSlide}
            activeModule={activeModule}
            pendingModuleId={pendingModuleId}
            savingSlideId={savingSlideId}
            savingThemeId={savingThemeId}
            focusRequest={inspectorFocusRequest}
            onToggle={toggleModule}
            onAdd={addModule}
            onRefresh={refreshModule}
            onSaveSlideFields={saveSlideFields}
            onSaveThemePreset={saveThemePreset}
          />
          <DeckHealthPanel deck={deck} issues={issues} />
        </aside>
      </main>
    </div>
  );
}

function slideStableId(slide: StudioDeckData['slides'][number]) {
  return slide.manifest_slide_id || slide.id || String(slide.source_number || slide.number);
}

function inspectorFieldLabel(field: string) {
  const labels: Record<string, string> = {
    eyebrow: 'eyebrow',
    title: 'title',
    subtitle: 'subtitle',
    lede: 'lede',
    prepared_for: 'prepared for',
    presented_by: 'presented by',
    focus: 'focus',
    discovery_confirmed: 'confirmed requirements',
    discovery_in_motion: "what's in motion",
    feature_bullets: 'capability bullets',
    feature_closing: 'closing callout',
    speaker: 'speaker'
  };
  return labels[field] || 'slide content';
}
