export interface UploadZoneProps {
  file?: File | null;
  files?: File[];
  multiple?: boolean;
  disabled?: boolean;
  accept?: string;
  label?: string;
  description?: string;
  onFileChange?: (file: File | null) => void;
  onFilesChange?: (files: File[]) => void;
  getFileProgress?: (file: File, index: number) => number | undefined;
}
