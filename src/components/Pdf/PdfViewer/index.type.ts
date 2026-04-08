export interface PdfViewerProps {
  resourceId: string;
  config?: Record<string, unknown>;
  className?: string;
  onLoadError?: (error: unknown) => void;
}
