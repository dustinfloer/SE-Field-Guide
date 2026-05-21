import type { SlidePickerModule, StudioDeckData } from '../types';
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
  onPreviewSlide: (slide: number) => void;
  onPreviewModule: (module: SlidePickerModule) => void;
  onToggle: (module: SlidePickerModule) => void;
  onAdd: (module: SlidePickerModule) => void;
  onRefresh: (module: SlidePickerModule) => void;
}

export function DeckStructurePanel({
  deck,
  selectedSlide,
  pendingModuleId,
  onPreviewSlide,
  onPreviewModule,
  onToggle,
  onAdd,
  onRefresh
}: DeckStructurePanelProps) {
  const orderedModules = orderedDeckModules(deck.slide_picker.modules);
  const selectedModules = orderedModules.filter((module) => isComposerSelectedModule(module));
  const removedModules = orderedModules.filter((module) => !module.included && (module.present || module.source_slide_number || module.user_set || module.requirement !== 'optional'));
  const libraryModules = orderedLibraryModules(deck.slide_picker.modules.filter((module) => module.can_add && !module.present));
  const richLibraryModules = libraryModules.filter(isRichScaffold);
  const starterLibraryModules = libraryModules.filter((module) => !isRichScaffold(module));

  return (
    <section className="panel composer-panel">
      <div className="composer-title-row">
        <div>
          <PanelTitle label="Deck" />
          <p className="panel-subtitle">Slides are shown in presentation order. Add optional moments from the library below.</p>
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
            <span>Slides in deck</span>
            <strong>{deck.slideCount} slides</strong>
          </div>
          <small>Presentation order</small>
        </div>
        <div className="flow-list">
          {deck.slides.length ? (
            deck.slides.map((slide, index) => {
              const module = selectedModules.find((item) => item.target_slide_number === slide.number) || null;
              const previousModule = index > 0
                ? selectedModules.find((item) => item.target_slide_number === deck.slides[index - 1]?.number) || null
                : null;
              return (
                <div className="flow-item" key={`${slide.number}-${slide.manifest_slide_id || slide.id || slide.title}`}>
                  {shouldShowSlideSectionBreak(module, previousModule, index) && (
                    <div className="flow-section-label">{module?.section_label || slide.eyebrow || 'Other'}</div>
                  )}
                  <SlideCard
                    slide={slide}
                    module={module}
                    isActive={slide.number === selectedSlide}
                    isPending={module ? pendingModuleId === module.id : false}
                    onPreview={onPreviewSlide}
                    onToggle={onToggle}
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
            <span>Slide library</span>
            <strong>{libraryModules.length} available</strong>
          </div>
          <small>Add to deck</small>
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
        {!libraryModules.length && <div className="empty">Every registered slide option is already represented in this deck.</div>}
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
  isPending,
  onPreview,
  onToggle
}: {
  slide: StudioDeckData['slides'][number];
  module: SlidePickerModule | null;
  isActive: boolean;
  isPending: boolean;
  onPreview: (slide: number) => void;
  onToggle: (module: SlidePickerModule) => void;
}) {
  const positionLabel = `Slide ${String(slide.number).padStart(2, '0')}`;
  const section = module?.section_label || slide.eyebrow || '';
  const compactFlow = !isActive;

  return (
    <article
      className={`module-card slide-card flow-card ${compactFlow ? 'compact-card' : ''} ${module?.requirement || 'optional'} ${isActive ? 'active' : ''}`}
      onClick={() => onPreview(slide.number)}
    >
      <div className="module-top">
        <div>
          <div className="module-eyebrow">
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
