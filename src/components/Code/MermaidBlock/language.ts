import { normalizeCodeLanguage } from '@/utils/codeHighlight';

export function isMermaidLanguage(language: string | undefined): boolean {
  return normalizeCodeLanguage(language) === 'mermaid';
}
