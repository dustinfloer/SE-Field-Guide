import { useMemo, useState } from 'react';
import type { SlidePickerModule, SlideReorderItem, StudioDeckData } from '../types';
import { PanelTitle, Stat } from './common';
import {
  isComposerSelectedModule,
  isRichScaffold,
  moduleRequirementLabel,
  modulePositionLabel,
  modulePreviewNote,
  moduleStatusLabel,
  orderedDeckModules,
  orderedLibraryModules,
  scaffoldLabel,
  scaffoldNote,
  statusClass
} from '../utils/studio';

interface DeckStructurePanelProps {
  deck: StudioDeckData;
  selectedSlide: number;
  pendingModuleId: string | null;
  isReordering: boolean;
  onPreviewSlide: (slide: number) => void;
  onPreviewModule: (module: SlidePickerModule) => void;
  onToggle: (module: SlidePickerModule) => void;
  onAdd: (module: SlidePickerModule) => void;
  onRefresh: (module: SlidePickerModule) => void;
  onReorderSlides: (slides: SlideReorderItem[]) => Promise<void>;
}

export function DeckStructurePanel({
  deck,
  selectedSlide,
  pendingModuleId,
  isReordering,
  onPreviewSlide,
  onPreviewModule,
  onToggle,
  onAdd,
  onRefresh,
  onReorderSlides
}: DeckStructurePanelProps) {
  const [dragSlideId, setDragSlideId] = useState('');
  const [dropSlideId, setDropSlideId] = useState('');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'ready' | 'ai' | 'proof' | 'follow-up'>('all');
  const orderedModules = orderedDeckModules(deck.slide_picker.modules);
  const selectedModules = orderedModules.filter((module) => isComposerSelectedModule(module));
  const removedModules = orderedModules.filter((module) => !module.included && (module.present || module.source_slide_number || module.user_set || module.requirement !== 'optional'));
  const libraryModules = orderedLibraryModules(deck.slide_picker.modules.filter((module) => module.can_add && !module.present));
  const filteredLibraryModules = useMemo(() => {
    return libraryModules.filter((module) => {
      return moduleMatchesLibraryQuery(module, libraryQuery) && moduleMatchesLibraryFilter(module, libraryFilter);
    });
  }, [libraryFilter, libraryModules, libraryQuery]);
  const richLibraryModules = filteredLibraryModules.filter(isRichScaffold);
  const starterLibraryModules = filteredLibraryModules.filter((module) => !isRichScaffold(module));
  const visibleSlideIds = deck.slides.map(slideStableId);

  function reorderSlide(dragId: string, targetId: string) {
    if (!dragId || !targetId || dragId === targetId || isReordering) return;
    const from = visibleSlideIds.indexOf(dragId);
    const to = visibleSlideIds.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const nextSlides = [...deck.slides];
    const [moved] = nextSlides.splice(from, 1);
    nextSlides.splice(to, 0, moved);
    onReorderSlides(nextSlides.map((slide) => ({
      id: slideStableId(slide),
      source_number: slide.source_number || slide.number
    }))).catch(() => {
      setDragSlideId('');
      setDropSlideId('');
    });
  }

  return (
    <section className="panel composer-panel">
      <div className="composer-title-row">
        <div>
          <PanelTitle label="Deck" />
          <p className="panel-subtitle">Drag slides to reorder. Search Add slide for Sidekick, pricing, proof, and other reusable moments.</p>
        </div>
      </div>

      <div className="picker-summary">
        <Stat label="Slides" value={deck.slideCount} />
        <Stat label="Addable" value={libraryModules.length} />
        <Stat label="Hidden" value={removedModules.length} />
      </div>

      <div className="structure-section selected-section">
        <div className="section-heading">
          <div>
            <span>Deck slides</span>
            <strong>{deck.slideCount} slides</strong>
          </div>
          <small>{isReordering ? 'Saving order' : 'Drag to reorder'}</small>
        </div>
        <div className="flow-list">
          {deck.slides.length ? (
            deck.slides.map((slide, index) => {
              const module = selectedModules.find((item) => item.target_slide_number === slide.number) || null;
              const previousModule = index > 0
                ? selectedModules.find((item) => item.target_slide_number === deck.slides[index - 1]?.number) || null
                : null;
              const slideId = slideStableId(slide);
              return (
                <div
                  className={`flow-item ${dropSlideId === slideId && dragSlideId !== slideId ? 'drop-target' : ''}`}
                  key={`${slideId}-${slide.title}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (dragSlideId && dragSlideId !== slideId) setDropSlideId(slideId);
                  }}
                  onDragLeave={() => {
                    if (dropSlideId === slideId) setDropSlideId('');
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    reorderSlide(dragSlideId, slideId);
                    setDragSlideId('');
                    setDropSlideId('');
                  }}
                >
                  {shouldShowSlideSectionBreak(module, previousModule, index) && (
                    <div className="flow-section-label">{module?.section_label || slide.eyebrow || 'Other'}</div>
                  )}
                  <SlideCard
                    slide={slide}
                    module={module}
                    isActive={slide.number === selectedSlide}
                    isDragging={dragSlideId === slideId}
                    canDrag={!isReordering}
                    isPending={module ? pendingModuleId === module.id : false}
                    onPreview={onPreviewSlide}
                    onToggle={onToggle}
                    onDragStart={() => setDragSlideId(slideId)}
                    onDragEnd={() => {
                      setDragSlideId('');
                      setDropSlideId('');
                    }}
                  />
                </div>
              );
            })
          ) : (
            <div className="empty">No slides are selected.</div>
          )}
        </div>
      </div>

      <div className="structure-section module-library-section">
        <div className="section-heading">
          <div>
            <span>Add slide</span>
            <strong>{filteredLibraryModules.length} of {libraryModules.length} available</strong>
          </div>
          <small>Search library</small>
        </div>
        <div className="library-tools">
          <label className="library-search">
            <span>Search slides</span>
            <input
              value={libraryQuery}
              placeholder="Search Sidekick, pricing, proof..."
              onChange={(event) => setLibraryQuery(event.target.value)}
            />
          </label>
          <div className="library-filters" aria-label="Slide library filters">
            {LIBRARY_FILTERS.map((filter) => (
              <button
                key={filter.id}
                className={libraryFilter === filter.id ? 'active' : ''}
                type="button"
                onClick={() => setLibraryFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        {richLibraryModules.length > 0 && (
          <div className="library-group">
            <div className="library-label">Ready-made moments</div>
            {richLibraryModules.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                variant="library"
                isActive={module.target_slide_number === selectedSlide}
                isPending={pendingModuleId === module.id}
                onPreview={onPreviewModule}
                onToggle={onToggle}
                onAdd={onAdd}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        )}
        {starterLibraryModules.length > 0 && (
          <details className="library-more structure-drawer">
            <summary>
              <span>More slide options</span>
              <strong>{starterLibraryModules.length}</strong>
            </summary>
            <div className="library-group">
              {starterLibraryModules.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  variant="library"
                  isActive={module.target_slide_number === selectedSlide}
                  isPending={pendingModuleId === module.id}
                  onPreview={onPreviewModule}
                  onToggle={onToggle}
                  onAdd={onAdd}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          </details>
        )}
        {!filteredLibraryModules.length && (
          <div className="empty">
            {libraryModules.length
              ? 'No slides match that search. Try Sidekick, Agentic, pricing, case study, or proof.'
              : 'Every registered slide option is already represented in this deck.'}
          </div>
        )}
      </div>

      {removedModules.length > 0 && (
        <details className="removed-details structure-drawer">
          <summary>
            <span>Hidden from deck</span>
            <strong>{removedModules.length}</strong>
          </summary>
          <div className="library-group">
            {removedModules.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                variant="removed"
                isActive={module.target_slide_number === selectedSlide}
                isPending={pendingModuleId === module.id}
                onPreview={onPreviewModule}
                onToggle={onToggle}
                onAdd={onAdd}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

const LIBRARY_FILTERS: { id: 'all' | 'ready' | 'ai' | 'proof' | 'follow-up'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ready', label: 'Ready' },
  { id: 'ai', label: 'AI' },
  { id: 'proof', label: 'Proof' },
  { id: 'follow-up', label: 'Follow-up' }
];

function slideStableId(slide: StudioDeckData['slides'][number]) {
  return slide.manifest_slide_id || slide.id || String(slide.source_number || slide.number);
}

function moduleSearchText(module: SlidePickerModule) {
  return [
    module.id,
    module.label,
    module.reason,
    module.category,
    module.section,
    module.section_label,
    module.slot,
    module.slot_label,
    module.pattern_label,
    Array.isArray(module.patterns) ? module.patterns.join(' ') : '',
    module.scaffold_quality,
    module.scaffold_note,
    module.reference_path
  ].filter(Boolean).join(' ').toLowerCase();
}

function moduleMatchesLibraryQuery(module: SlidePickerModule, query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = moduleSearchText(module);
  return terms.every((term) => haystack.includes(term));
}

function moduleMatchesLibraryFilter(module: SlidePickerModule, filter: 'all' | 'ready' | 'ai' | 'proof' | 'follow-up') {
  if (filter === 'all') return true;
  if (filter === 'ready') return isRichScaffold(module);
  const text = moduleSearchText(module);
  if (filter === 'ai') return /\b(ai|agentic|sidekick|chatgpt|claude|gemini)\b/.test(text);
  if (filter === 'proof') return /\b(proof|case|customer|peer|source|evidence)\b/.test(text);
  if (filter === 'follow-up') return /\b(follow|fast-follow|post-demo|recap|question)\b/.test(text);
  return true;
}

function shouldShowSlideSectionBreak(module: SlidePickerModule | null, previousModule: SlidePickerModule | null, index: number) {
  if (index === 0) return true;
  const section = module?.section_label || '';
  const previousSection = previousModule?.section_label || '';
  return Boolean(section && section !== previousSection);
}

function SlideCard({
  slide,
  module,
  isActive,
  isDragging,
  canDrag,
  isPending,
  onPreview,
  onToggle,
  onDragStart,
  onDragEnd
}: {
  slide: StudioDeckData['slides'][number];
  module: SlidePickerModule | null;
  isActive: boolean;
  isDragging: boolean;
  canDrag: boolean;
  isPending: boolean;
  onPreview: (slide: number) => void;
  onToggle: (module: SlidePickerModule) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const positionLabel = `Slide ${String(slide.number).padStart(2, '0')}`;
  const section = module?.section_label || slide.eyebrow || '';
  const compactFlow = !isActive;

  return (
    <article
      className={`module-card slide-card flow-card ${compactFlow ? 'compact-card' : ''} ${module?.requirement || 'optional'} ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
      draggable={canDrag}
      onClick={() => onPreview(slide.number)}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', slideStableId(slide));
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="module-top">
        <div>
          <div className="module-eyebrow">
            <span className="drag-handle" aria-hidden="true">::</span>
            <span className="position-badge">{positionLabel}</span>
            {section && <span>{section}</span>}
          </div>
          <strong>{slide.title || 'Untitled slide'}</strong>
          {!compactFlow && module?.label && <p>{module.label}</p>}
        </div>
        {module && (
          <button
            className="toggle slide-toggle"
            type="button"
            aria-label={`Remove ${slide.title || module.label} from deck`}
            aria-pressed={module.included}
            disabled={isPending}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(module);
            }}
          >
            <span />
          </button>
        )}
      </div>
      {compactFlow ? (
        <div className="compact-meta">
          {slide.speaker && <span>{slide.speaker}</span>}
          {slide.editable && <span className="ok">editable</span>}
        </div>
      ) : (
        <div className="chips">
          {section && <span>{section}</span>}
          {module && <span>{moduleRequirementLabel(module)}</span>}
          {slide.speaker && <span>{slide.speaker}</span>}
          {slide.editable && <span className="ok">editable</span>}
        </div>
      )}
    </article>
  );
}

interface ModuleCardProps {
  module: SlidePickerModule;
  variant: 'flow' | 'library' | 'removed';
  isActive: boolean;
  isPending: boolean;
  onPreview: (module: SlidePickerModule) => void;
  onToggle: (module: SlidePickerModule) => void;
  onAdd: (module: SlidePickerModule) => void;
  onRefresh: (module: SlidePickerModule) => void;
}

function ModuleCard({
  module,
  variant,
  isActive,
  isPending,
  onPreview,
  onToggle,
  onAdd,
  onRefresh
}: ModuleCardProps) {
  const targetSlide = module.target_slide_number || 0;
  const sourceSlide = module.source_slide_number || 0;
  const hasPreview = targetSlide > 0;
  const previewNote = modulePreviewNote(module, sourceSlide);
  const showToggle = variant !== 'library' || module.present;
  const positionLabel = variant === 'library' ? scaffoldLabel(module) : modulePositionLabel(module);
  const qualityNote = module.can_refresh
    ? module.refresh_reason || 'This slide option was added with an older renderer. Refresh it before merchant sharing.'
    : variant === 'library'
      ? scaffoldNote(module)
      : module.exclusion_note || '';
  const compactFlow = variant === 'flow' && !isActive;
  const showDetails = !compactFlow;

  return (
    <article
      className={`module-card ${variant}-card ${compactFlow ? 'compact-card' : ''} ${module.requirement} ${module.included ? '' : 'excluded'} ${hasPreview ? '' : 'no-preview'} ${isActive ? 'active' : ''} ${isRichScaffold(module) ? 'rich-scaffold' : ''}`}
      onClick={() => {
        onPreview(module);
      }}
    >
      <div className="module-top">
        <div>
          <div className="module-eyebrow">
            <span className="position-badge">{positionLabel}</span>
            <span>{module.section_label || module.category || module.requirement}</span>
            {module.slot_label && <span>{module.slot_label}</span>}
          </div>
          <strong>{module.label}</strong>
          {showDetails && <p>{module.reason || module.pattern_label}</p>}
        </div>
        {showToggle && (
          <button
            className="toggle"
            type="button"
            aria-label={module.included ? `Remove ${module.label}` : `Restore ${module.label}`}
            aria-pressed={module.included}
            disabled={isPending}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(module);
            }}
          >
            <span />
          </button>
        )}
      </div>
      {showDetails ? (
        <div className="chips">
          <span>{moduleRequirementLabel(module)}</span>
          <span className={statusClass(module)}>{moduleStatusLabel(module)}</span>
          {targetSlide > 0 && <span>slide {String(targetSlide).padStart(2, '0')}</span>}
          {!targetSlide && sourceSlide > 0 && <span>hidden slide</span>}
          {!targetSlide && !sourceSlide && !module.present && <span className="warn">needs build</span>}
          {module.user_set && <span>customized</span>}
          {module.reference_path && <span>reference</span>}
        </div>
      ) : (
        <div className="compact-meta">
          <span className={statusClass(module)}>{moduleStatusLabel(module)}</span>
          <span>{moduleRequirementLabel(module)}</span>
        </div>
      )}
      {showDetails && qualityNote && <p className={`module-note strong-note ${!module.included ? 'exclusion-note' : ''}`}>{qualityNote}</p>}
      {showDetails && previewNote && <p className="module-note">{previewNote}</p>}
      {module.can_add && (
        <button
          className="add-button"
          type="button"
          disabled={isPending}
          onClick={(event) => {
            event.stopPropagation();
            onAdd(module);
          }}
        >
          Add to deck
        </button>
      )}
      {module.can_refresh && (
        <button
          className="refresh-button"
          type="button"
          disabled={isPending}
          onClick={(event) => {
            event.stopPropagation();
            onRefresh(module);
          }}
        >
          Refresh to current renderer
        </button>
      )}
    </article>
  );
}
