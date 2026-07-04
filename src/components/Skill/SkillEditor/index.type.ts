export interface SkillEditorProps {
  content: string;
  fileName: string;
  readOnly?: boolean;
  onSave?: () => void;
  onChange?: (content: string) => void;
}
