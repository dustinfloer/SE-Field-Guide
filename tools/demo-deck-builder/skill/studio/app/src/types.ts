export type RequirementLevel = 'required' | 'recommended' | 'optional';

export type ModuleStatus = 'present' | 'missing' | 'planned' | 'excluded' | string;

export interface StudioSlide {
  number: number;
  source_number?: number;
  manifest_slide_id?: string;
  id: string;
  classes: string[];
  speaker: string;
  eyebrow: string;
  title: string;
  word_count: number;
  fields?: Record<string, string>;
  editable?: boolean;
}

export interface StudioIssue {
  type: 'error' | 'warning' | 'info';
  text: string;
}

export interface InspectorFocusRequest {
  slideId: string;
  field?: string;
  nonce: number;
}

export interface StrategyGate {
  id?: string;
  label: string;
  required: boolean;
  passed: boolean;
  evidence?: string;
  fix?: string;
}

export interface StrategyPlan {
  strategy: {
    deck_type: string;
    has_b2b: boolean;
    has_dtc: boolean;
    pricing_required: boolean;
    [key: string]: unknown;
  };
  gates: StrategyGate[];
  present_patterns: string[];
}

export interface StudioLint {
  errors: string[];
  warnings: string[];
  info: string[];
  plan: StrategyPlan;
}

export interface StudioBrand {
  status: string;
  logo_embedded: boolean;
  logo_path?: string;
  accent?: string;
  accent_bright?: string;
  preset_id?: string;
  preset_label?: string;
  font_preset_id?: string;
  font_preset_label?: string;
  heading_font?: string;
  body_font?: string;
  motion_preset_id?: string;
  motion_preset_label?: string;
  merchant_preset?: {
    label?: string;
    accent?: string;
    accent_bright?: string;
    heading_font?: string;
    body_font?: string;
  };
}

export interface StudioMerchant {
  name?: string;
  slug?: string;
  industry?: string;
  business_model?: string;
  website?: string;
}

export interface StudioManifest {
  status: string;
  path: string | null;
  schema_version?: string;
  module_count: number;
  slide_count?: number;
  updated_at: string | null;
}

export interface PublishResult {
  outputPath: string;
  outputDir: string;
  relativeOutputPath: string;
  relativeOutputDir: string;
  filename: string;
  mode: string;
  manifestPath?: string | null;
  slideCount: number;
  warnings: string[];
  fieldGuideCopy?: {
    status: 'disabled' | 'skipped' | 'saved';
    outputPath?: string;
    outputDir?: string;
    relativeOutputPath?: string;
    relativeOutputDir?: string;
    filename?: string;
    targetSource?: string;
    message: string;
  };
  updated_at: string;
}

export interface SlidePickerModule {
  id: string;
  label: string;
  reason?: string;
  category?: string;
  section?: string;
  section_label?: string;
  slot?: string;
  slot_label?: string;
  flow_order?: number;
  requirement: RequirementLevel;
  included: boolean;
  user_set?: boolean;
  status: ModuleStatus;
  present: boolean;
  pattern_label: string;
  patterns: string[];
  can_add?: boolean;
  add_pattern?: string;
  can_refresh?: boolean;
  refresh_reason?: string;
  added_slide_id?: string;
  renderer_version?: number;
  current_renderer_version?: number;
  export_behavior?: string;
  scaffold_quality?: string;
  scaffold_note?: string;
  reference_path?: string;
  exclusion_note?: string;
  target_slide_number?: number | null;
  target_slide_title?: string;
  source_slide_number?: number | null;
  source_slide_title?: string;
}

export interface SlidePicker {
  updated_at?: string;
  modules: SlidePickerModule[];
  selected_count: number;
  selected_missing_count: number;
  excluded_required_count: number;
}

export interface StudioDeckData {
  htmlPath: string;
  configPath: string | null;
  manifestPath?: string | null;
  manifest?: StudioManifest;
  merchant?: StudioMerchant;
  title: string;
  slideCount: number;
  sourceSlideCount: number;
  slides: StudioSlide[];
  lint: StudioLint;
  plan: StrategyPlan;
  brand: StudioBrand;
  slide_picker: SlidePicker;
}
