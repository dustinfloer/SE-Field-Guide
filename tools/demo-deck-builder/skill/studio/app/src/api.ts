import type { PublishResult, StudioDeckData } from './types';

const configuredBaseUrl = import.meta.env.VITE_DEMO_DECK_STUDIO_API_URL || '';
const API_BASE_URL = configuredBaseUrl.replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  });
  const body = await response.json();
  if (!response.ok || body.error) {
    throw new Error(body.error || `Request failed with ${response.status}`);
  }
  return body as T;
}

export function deckPreviewUrl(slide: number, version?: string): string {
  const params = new URLSearchParams();
  params.set('slide', String(Math.max(1, slide)));
  if (version) params.set('v', version);
  return `${API_BASE_URL}/deck?${params.toString()}`;
}

export function fetchDeck(): Promise<StudioDeckData> {
  return request<StudioDeckData>('/api/deck');
}

export function setSlidePickerDecision(id: string, included: boolean): Promise<StudioDeckData> {
  return request<StudioDeckData>('/api/slide-picker', {
    method: 'POST',
    body: JSON.stringify({ id, included })
  });
}

export function addPatternFromLibrary(id: string, pattern?: string): Promise<StudioDeckData> {
  return request<StudioDeckData>('/api/pattern-library/add', {
    method: 'POST',
    body: JSON.stringify({ id, pattern })
  });
}

export function refreshPatternModule(id: string, pattern?: string): Promise<StudioDeckData> {
  return request<StudioDeckData>('/api/pattern-library/refresh', {
    method: 'POST',
    body: JSON.stringify({ id, pattern })
  });
}

export function updateSlideFields(id: string, fields: Record<string, string>): Promise<StudioDeckData> {
  return request<StudioDeckData>('/api/slides/update', {
    method: 'POST',
    body: JSON.stringify({ id, fields })
  });
}

export function updateThemePreset(theme: {
  id: string;
  label: string;
  accent: string;
  accent_bright: string;
  heading_font?: string;
}): Promise<StudioDeckData> {
  return request<StudioDeckData>('/api/theme/update', {
    method: 'POST',
    body: JSON.stringify({
      preset_id: theme.id,
      preset_label: theme.label,
      accent: theme.accent,
      accent_bright: theme.accent_bright,
      heading_font: theme.heading_font || 'Inter'
    })
  });
}

export function publishDeck(options: { fieldGuideCopy?: boolean } = {}): Promise<PublishResult> {
  return request<PublishResult>('/api/publish', {
    method: 'POST',
    body: JSON.stringify(options)
  });
}
