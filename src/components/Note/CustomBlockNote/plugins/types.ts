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
  normalizeGenerated: (
    input: NoteAiDiffGeneratedBlockInput
  ) => NoteAiDiffGeneratedBlockProjection | null;
  applyAll: (
    block: Record<string, unknown>,
    action: NoteAiDiffAction
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

interface NotePluginNodeBase {
  id: string;
  dependencies?: readonly string[];
}

interface NoteContentPluginBase extends NotePluginNodeBase {
  type: string;
  capabilities: NoteContentCapabilityDeclarations;
  extensions?: () => ExtensionFactoryInstance[];
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
}

export interface NoteInlinePlugin extends NoteContentPluginBase {
  kind: 'inline';
  spec: InlineContentSpec<InlineContentConfig>;
  projection?: NoteInlineProjection;
  markdownImport?: NoteMarkdownInlineImport;
  markdownExport?: NoteMarkdownExportProjection;
}

export interface NotePluginBundle extends NotePluginNodeBase {
  kind: 'bundle';
  children: readonly NotePluginNode[];
}

export type NoteContentPlugin = NoteBlockPlugin | NoteInlinePlugin;
export type NotePluginNode = NotePluginBundle | NoteContentPlugin;

export interface NoteRuntimeExtension extends NotePluginNodeBase {
  extensions?: () => ExtensionFactoryInstance[];
  editorProps?: () => Partial<EditorProps>;
}

export interface NotePluginRegistry {
  root: NotePluginBundle;
  contentPlugins: readonly NoteContentPlugin[];
  blockPlugins: ReadonlyMap<string, NoteBlockPlugin>;
  inlinePlugins: ReadonlyMap<string, NoteInlinePlugin>;
  runtimeExtensions: readonly NoteRuntimeExtension[];
}
