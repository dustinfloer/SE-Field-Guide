import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { PublishResult, SlidePickerModule } from '../types';

interface PreviewPaneProps {
  previewUrl: string;
  selectedSlide: number;
  slideCount: number;
  activeModule: SlidePickerModule | null;
  editable: boolean;
  status: string;
  error: string | null;
  publishResult: PublishResult | null;
  onPreviewEditRequest: (field?: string) => void;
}

export function PreviewPane({
  previewUrl,
  selectedSlide,
  slideCount,
  activeModule,
  editable,
  status,
  error,
  publishResult,
  onPreviewEditRequest
}: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const updateScale = () => {
      const rect = frame.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nextScale = Math.min(rect.width / 1920, rect.height / 1080);
      setPreviewScale(Number(nextScale.toFixed(4)));
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(frame);
    window.addEventListener('resize', updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !editable) return;

    let removeClickListener: (() => void) | null = null;

    function attachClickListener() {
      removeClickListener?.();
      removeClickListener = null;

      try {
        const doc = iframe?.contentDocument;
        if (!doc) return;

        const handleClick = (event: MouseEvent) => {
          const field = coverFieldFromPreviewTarget(event.target);
          onPreviewEditRequest(field || undefined);
          event.preventDefault();
          event.stopPropagation();
        };

        doc.addEventListener('click', handleClick, true);
        removeClickListener = () => doc.removeEventListener('click', handleClick, true);
      } catch {
        removeClickListener = null;
      }
    }

    attachClickListener();
    iframe.addEventListener('load', attachClickListener);

    return () => {
      iframe.removeEventListener('load', attachClickListener);
      removeClickListener?.();
    };
  }, [editable, onPreviewEditRequest, previewUrl]);

  return (
    <section className="preview-pane">
      <div className="preview-toolbar">
        <div className="preview-title-group">
          <span className="toolbar-label">Preview</span>
          <div className="preview-title-row">
            <strong>Slide {selectedSlide} of {slideCount}</strong>
            {activeModule && <span className="active-module-name">{activeModule.label}</span>}
          </div>
        </div>
        <div className="toolbar-status">
          {status && <span>{status}</span>}
          {publishResult && <span>Quick folder: {publishResult.relativeOutputDir}</span>}
          {error && <span className="error-text">{error}</span>}
        </div>
      </div>
      <div className="preview-stage">
        <div
          className="preview-frame"
          ref={frameRef}
        >
          <iframe
            ref={iframeRef}
            key={previewUrl}
            src={previewUrl}
            title="Deck preview"
            style={{ transform: `scale(${previewScale})` } as CSSProperties}
          />
          {editable && <div className="preview-edit-hint">Click text on the slide to edit it</div>}
        </div>
      </div>
    </section>
  );
}

function coverFieldFromPreviewTarget(target: EventTarget | null) {
  const targetElement = previewElementFromTarget(target);
  if (!targetElement) return null;

  if (targetElement.closest('.cover-title')) return 'title';
  if (targetElement.closest('.cover-sub')) return 'subtitle';
  if (targetElement.closest('.cover-eyebrow')) return 'eyebrow';
  if (targetElement.closest('.slide-title, .section-header-title')) return 'title';
  if (targetElement.closest('.slide-eyebrow')) return 'eyebrow';
  if (targetElement.closest('.slide-lede, .section-header-sub')) return 'lede';
  if (targetElement.closest('.feature-capabilities')) return 'feature_bullets';
  if (targetElement.closest('.feature-closing, .agentic-impact-callout')) return 'feature_closing';
  const recapLists = Array.from(targetElement.ownerDocument.querySelectorAll('.recap-list'));
  const recapList = targetElement.closest('.recap-list');
  if (recapList) {
    const recapIndex = recapLists.indexOf(recapList);
    if (recapIndex === 0) return 'discovery_confirmed';
    if (recapIndex === 1) return 'discovery_in_motion';
  }
  if (targetElement.closest('h1, h2')) return 'title';

  const metaItem = targetElement.closest('.cover-meta-item');
  if (!metaItem) return null;

  const label = metaItem.querySelector('.label')?.textContent?.trim().toLowerCase() || '';
  if (label === 'prepared for') return 'prepared_for';
  if (label === 'presented by') return 'presented_by';
  if (label === 'focus') return 'focus';

  return null;
}

function previewElementFromTarget(target: EventTarget | null) {
  if (!target) return null;

  const targetElement = target as Element;
  if (typeof targetElement.closest === 'function') return targetElement;

  const parentElement = (target as { parentElement?: Element | null }).parentElement;
  return parentElement && typeof parentElement.closest === 'function' ? parentElement : null;
}
