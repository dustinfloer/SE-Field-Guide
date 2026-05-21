import type { SlidePickerModule, StudioDeckData } from '../types';

export function clampSlide(slide: number, count: number) {
  return Math.max(1, Math.min(slide || 1, count || 1));
}

export function isCoverEditableSlide(slide: StudioDeckData['slides'][number]) {
  return Boolean(slide.manifest_slide_id === 'cover' || slide.id === 'cover' || slide.classes.includes('cover'));
}

export function isEditableSlide(slide: StudioDeckData['slides'][number] | null) {
  return Boolean(slide?.editable || (slide && isCoverEditableSlide(slide)));
}

export function editableSlideId(slide: StudioDeckData['slides'][number]) {
  return slide.manifest_slide_id || slide.id || String(slide.source_number || slide.number);
}

export function coverFieldsForSlide(slide: StudioDeckData['slides'][number]) {
  const fields = slide.fields || {};
  return {
    eyebrow: slideFieldValue(fields, 'eyebrow', slide.eyebrow || ''),
    title: slideFieldValue(fields, 'title', slide.title || ''),
    subtitle: slideFieldValue(fields, 'subtitle', ''),
    prepared_for: slideFieldValue(fields, 'prepared_for', ''),
    presented_by: slideFieldValue(fields, 'presented_by', ''),
    focus: slideFieldValue(fields, 'focus', '')
  };
}

export function genericFieldsForSlide(slide: StudioDeckData['slides'][number]) {
  const fields = slide.fields || {};
  const values: Record<string, string> = {
    eyebrow: slideFieldValue(fields, 'eyebrow', slide.eyebrow || ''),
    title: slideFieldValue(fields, 'title', slide.title || '')
  };

  for (const key of BODY_FIELD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) values[key] = fields[key] || '';
  }

  return values;
}

export const BODY_FIELD_KEYS = [
  'lede',
  'discovery_confirmed',
  'discovery_in_motion',
  'feature_bullets',
  'feature_closing'
];

export function contentFieldKeysForSlide(slide: StudioDeckData['slides'][number]) {
  const fields = slide.fields || {};
  return [
    'eyebrow',
    'title',
    ...BODY_FIELD_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(fields, key))
  ];
}

export function speakerForSlide(slide: StudioDeckData['slides'][number]) {
  return slideFieldValue(slide.fields || {}, 'speaker', slide.speaker || '');
}

export function stableFieldSnapshot(fields: Record<string, string>) {
  return JSON.stringify(Object.keys(fields).sort().map((key) => [key, fields[key] || '']));
}

export function statusClass(module: SlidePickerModule) {
  if (module.present) return 'ok';
  if (module.status === 'missing') return 'danger';
  if (module.status === 'planned') return 'warn';
  return '';
}

export function modulePreviewNote(module: SlidePickerModule, sourceSlide: number) {
  if (module.target_slide_number) return '';
  if (sourceSlide) return 'Hidden from the deck. Turn it back on to preview.';
  if (!module.present && module.can_add) return 'Add this slide option before it can preview.';
  if (!module.present) return 'Selected for the story, but this slide still needs to be created.';
  return 'No preview target has been mapped for this slide option yet.';
}

export function orderedDeckModules(modules: SlidePickerModule[]) {
  return modules
    .map((module, index) => ({ module, index }))
    .sort((left, right) => moduleDeckSortKey(left.module, left.index) - moduleDeckSortKey(right.module, right.index))
    .map(({ module }) => module);
}

export function orderedLibraryModules(modules: SlidePickerModule[]) {
  return [...modules].sort((left, right) => {
    const quality = qualityRank(left) - qualityRank(right);
    if (quality !== 0) return quality;
    const category = categoryRank(left.category) - categoryRank(right.category);
    if (category !== 0) return category;
    return left.label.localeCompare(right.label);
  });
}

export function isRichScaffold(module: SlidePickerModule) {
  return ['full-reference', 'rich-scaffold'].includes(module.scaffold_quality || '');
}

export function modulePositionLabel(module: SlidePickerModule) {
  if (module.target_slide_number) return `Slide ${String(module.target_slide_number).padStart(2, '0')}`;
  if (module.source_slide_number) return `Source ${String(module.source_slide_number).padStart(2, '0')}`;
  if (module.scaffold_quality === 'post-demo') return 'Post-demo';
  return module.present ? 'Mapped' : 'Not generated';
}

export function scaffoldLabel(module: SlidePickerModule) {
  if (module.scaffold_quality === 'full-reference') return 'Ready-made';
  if (module.scaffold_quality === 'rich-scaffold') return 'Ready-made';
  if (module.scaffold_quality === 'post-demo') return 'Post-demo';
  if (module.scaffold_quality === 'internal') return 'Internal';
  return 'Template';
}

export function scaffoldNote(module: SlidePickerModule) {
  if (module.scaffold_quality === 'full-reference') return 'Ready-made slide available. Add it, then review merchant copy before sharing.';
  if (isRichScaffold(module)) return 'Ready-made slide available. Review copy and merchant details before sharing.';
  if (module.scaffold_quality === 'post-demo') return 'Use after the live demo, once call notes are reviewed.';
  if (module.scaffold_quality === 'internal') return 'Internal review slide. Keep hidden for merchant-safe sharing unless intentionally polished.';
  return 'Draft slide available. Review copy and evidence before merchant sharing.';
}

export function moduleStatusLabel(module: SlidePickerModule) {
  if (module.included && module.target_slide_number) return 'in deck';
  if (!module.included && (module.present || module.source_slide_number)) return 'hidden';
  if (module.can_add && !module.present) return 'ready to add';
  if (module.status === 'planned') return 'planned';
  if (module.status === 'missing') return 'needs work';
  return module.present ? 'available' : module.status;
}

export function moduleRequirementLabel(module: SlidePickerModule) {
  if (module.requirement === 'required') return 'recommended';
  if (module.requirement === 'recommended') return 'suggested';
  return 'optional';
}

export function shouldShowSectionBreak(modules: SlidePickerModule[], module: SlidePickerModule, index: number) {
  if (index === 0) return true;
  return (modules[index - 1]?.section_label || '') !== (module.section_label || '');
}

export function isComposerSelectedModule(module: SlidePickerModule) {
  if (!module.included) return false;
  if (module.target_slide_number) return true;
  return !module.present;
}

function slideFieldValue(fields: Record<string, string>, key: string, fallback: string) {
  return Object.prototype.hasOwnProperty.call(fields, key) ? fields[key] : fallback;
}

function moduleDeckSortKey(module: SlidePickerModule, index: number) {
  if (module.target_slide_number) return module.target_slide_number;
  if (module.source_slide_number) return module.source_slide_number + 0.25;
  if (module.requirement === 'required') return 8000 + index;
  if (module.requirement === 'recommended') return 9000 + index;
  return 10000 + index;
}

function qualityRank(module: SlidePickerModule) {
  if (isRichScaffold(module)) return 0;
  if (module.scaffold_quality === 'post-demo') return 2;
  if (module.scaffold_quality === 'internal') return 3;
  return 1;
}

function categoryRank(category = '') {
  const order = ['simulation', 'demo', 'proof', 'platform', 'bridge', 'summary', 'close', 'follow-up', 'structure', 'opening'];
  const index = order.indexOf(category);
  return index === -1 ? 99 : index;
}
