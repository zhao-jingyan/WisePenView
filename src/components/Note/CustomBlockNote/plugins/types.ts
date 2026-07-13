import type {
  BlockNoteEditor,
  BlockSchema,
  BlockSpecs,
  ExtensionFactoryInstance,
  InlineContentConfig,
  InlineContentSchema,
  InlineContentSpec,
  StyleSchema,
} from '@blocknote/core';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import type { EditorProps } from '@tiptap/pm/view';
import type { LucideIcon } from 'lucide-react';

import type { AiDiffDisplayMode } from '@/domains/Note';

export type NoteInlineContentSpecs = Record<string, InlineContentSpec<InlineContentConfig>>;

export type PluginEditor = BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>;

export type NoteCapabilityDeclaration =
  | { support: 'default' }
  | { support: 'custom' }
  | { support: 'inherited'; profile: string }
  | { support: 'unsupported'; reason: string };

export interface NoteContentCapabilityDeclarations {
  markdownImport: NoteCapabilityDeclaration;
  markdownExport: NoteCapabilityDeclaration;
  aiDiff: NoteCapabilityDeclaration;
  comments: NoteCapabilityDeclaration;
  projection: NoteCapabilityDeclaration;
  print: NoteCapabilityDeclaration;
}

export interface NoteBlockProjection {
  plainText?: (block: Record<string, unknown>, registry: NotePluginRegistry) => string;
  outlineLevel?: (block: Record<string, unknown>) => number | undefined;
}

export interface NoteInlineProjection {
  plainText: (inline: Record<string, unknown>, registry: NotePluginRegistry) => string;
}

export interface NoteMarkdownExportContext {
  aiDiffDisplayMode: AiDiffDisplayMode;
}

export interface NoteMarkdownExportProjection {
  project: (
    node: Record<string, unknown>,
    context: NoteMarkdownExportContext
  ) => Record<string, unknown> | null;
  /** 仅用于 BlockNote 默认 serializer 无法保真的叶子 block。 */
  renderMarkdown?: (node: Record<string, unknown>, context: NoteMarkdownExportContext) => string;
}

export interface NoteAiDiffGeneratedBlockInput {
  props: Record<string, unknown>;
  content: unknown;
  keyPrefix: string;
}

export interface NoteAiDiffGeneratedBlockProjection {
  props: Record<string, unknown>;
  content?: unknown;
}

export type NoteAiDiffAction = 'accept' | 'discard';

export interface NoteAiDiffTextValue {
  text: string;
  styles: Record<string, string>;
}

export interface NoteAiDiffTextAdapter {
  read: (inline: Record<string, unknown>) => NoteAiDiffTextValue | undefined;
  create: (value: NoteAiDiffTextValue) => Record<string, unknown>;
}

export interface NoteAiDiffGeneratedInlineContext {
  key: string;
  text: NoteAiDiffTextAdapter;
  normalizeInline: (
    inline: Record<string, unknown>,
    key: string
  ) => readonly Record<string, unknown>[] | null;
}

export interface NoteInlineAiDiff {
  isPresent: (inline: Record<string, unknown>) => boolean;
  isVisible: (inline: Record<string, unknown>, mode: AiDiffDisplayMode) => boolean;
  apply: (
    inline: Record<string, unknown>,
    action: NoteAiDiffAction
  ) => readonly Record<string, unknown>[] | undefined;
  normalizeGenerated?: (
    inline: Record<string, unknown>,
    context: NoteAiDiffGeneratedInlineContext
  ) => readonly Record<string, unknown>[] | null;
  generatedText?: NoteAiDiffTextAdapter;
}

export interface NoteInlineComments {
  canCreateDocumentThread: boolean;
}

export interface NotePrintContribution {
  styles: readonly string[];
}

export type NoteAiDiffBlockActionResult =
  | { kind: 'none' }
  | { kind: 'remove' }
  | {
      kind: 'update';
      props?: Record<string, unknown>;
      content?: unknown;
      removeWhenChildless?: boolean;
    };

export interface NoteBlockAiDiff {
  isPresent?: (block: Record<string, unknown>) => boolean;
  getFoldedChildrenAnchorId?: (
    block: Record<string, unknown>,
    mode: AiDiffDisplayMode,
    registry: NotePluginRegistry
  ) => string;
  normalizeGenerated: (
    input: NoteAiDiffGeneratedBlockInput,
    registry: NotePluginRegistry
  ) => NoteAiDiffGeneratedBlockProjection | null;
  applyAll: (
    block: Record<string, unknown>,
    action: NoteAiDiffAction,
    registry: NotePluginRegistry
  ) => NoteAiDiffBlockActionResult;
}

export type NoteMarkdownImportSegment =
  { type: 'text'; text: string } | { type: 'token'; value: string };

export interface NoteMarkdownImportContext {
  createToken: (value: string) => string;
  readExactToken: (text: string) => string | undefined;
  splitTokens: (text: string) => NoteMarkdownImportSegment[];
}

export interface NoteMarkdownBlockImport {
  prepare?: (markdown: string, context: NoteMarkdownImportContext) => string;
  restore: (
    block: Record<string, unknown>,
    context: NoteMarkdownImportContext
  ) => Record<string, unknown> | undefined;
}

export interface NoteMarkdownInlineImport {
  prepare?: (markdown: string, context: NoteMarkdownImportContext) => string;
  restore: (
    inline: Record<string, unknown>,
    context: NoteMarkdownImportContext
  ) => readonly Record<string, unknown>[] | undefined;
}

export interface NoteSideMenuAction {
  id: string;
  label: string;
  icon: LucideIcon;
  kind: 'command' | 'toggle';
  selected?: boolean;
}

export interface NoteSideMenuState {
  variant?: 'standard' | 'structured';
  attributes?: Readonly<Record<string, string | undefined>>;
  actions?: readonly NoteSideMenuAction[];
}

export interface NoteBlockSideMenu {
  icon?: LucideIcon;
  inspect?: (block: Record<string, unknown>) => NoteSideMenuState;
  apply?: (
    block: Record<string, unknown>,
    actionId: string
  ) => { type?: string; props?: Record<string, unknown>; content?: unknown } | null;
}

interface NotePluginNodeBase {
  id: string;
  dependencies?: readonly string[];
}

interface NoteContentPluginBase extends NotePluginNodeBase {
  type: string;
  capabilities: NoteContentCapabilityDeclarations;
  print?: NotePrintContribution;
  extensions?: (context: NotePluginRuntimeContext) => ExtensionFactoryInstance[];
  editorProps?: () => Partial<EditorProps>;
  slashMenu?: (ctx: { editor: PluginEditor }) => DefaultReactSuggestionItem[];
}

export interface NoteBlockPlugin extends NoteContentPluginBase {
  kind: 'block';
  spec: BlockSpecs[string];
  projection?: NoteBlockProjection;
  markdownImport?: NoteMarkdownBlockImport;
  markdownExport?: NoteMarkdownExportProjection;
  aiDiff?: NoteBlockAiDiff;
  sideMenu?: NoteBlockSideMenu;
}

export interface NoteInlinePlugin extends NoteContentPluginBase {
  kind: 'inline';
  spec: InlineContentSpec<InlineContentConfig>;
  projection?: NoteInlineProjection;
  markdownImport?: NoteMarkdownInlineImport;
  markdownExport?: NoteMarkdownExportProjection;
  aiDiff: NoteInlineAiDiff;
  comments: NoteInlineComments;
}

export interface NotePluginBundle extends NotePluginNodeBase {
  kind: 'bundle';
  children: readonly NotePluginNode[];
}

export type NoteContentPlugin = NoteBlockPlugin | NoteInlinePlugin;
export type NotePluginNode = NotePluginBundle | NoteContentPlugin;

export interface NoteRuntimeExtension extends NotePluginNodeBase {
  requiresAiDiffText?: boolean;
  print?: NotePrintContribution;
  extensions?: (context: NotePluginRuntimeContext) => ExtensionFactoryInstance[];
  editorProps?: () => Partial<EditorProps>;
}

export interface NotePluginRuntimeContext {
  registry: NotePluginRegistry;
}

export interface NotePluginRegistry {
  root: NotePluginBundle;
  contentPlugins: readonly NoteContentPlugin[];
  blockPlugins: ReadonlyMap<string, NoteBlockPlugin>;
  inlinePlugins: ReadonlyMap<string, NoteInlinePlugin>;
  aiDiffText?: NoteAiDiffTextAdapter;
  runtimeExtensions: readonly NoteRuntimeExtension[];
}
