import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
import { extractAiDiffProtocolVisibleText } from '../runtime/aiDiff/protocol';
import type {
  NoteAiDiffAction,
  NoteBlockAiDiff,
  NoteInlineAiDiff,
  NoteMarkdownExportProjection,
} from '../types';

type AiGeneratedInline =
  | { type: 'AI-Create'; text?: unknown }
  | { type: 'AI-Delete'; text?: unknown }
  | {
      type: 'AI-Edit';
      old_text?: unknown;
      new_text?: unknown;
      text_old?: unknown;
      text_new?: unknown;
    };

type MathAiDiffActionResult =
  { kind: 'none' } | { kind: 'remove' } | { kind: 'update'; props: Record<string, unknown> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function propsOf(content: Record<string, unknown>): Record<string, unknown> {
  return isRecord(content.props) ? content.props : content;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function stringProp(content: Record<string, unknown>, key: string): string {
  return stringValue(propsOf(content)[key]);
}

function isAiGeneratedInline(value: unknown): value is AiGeneratedInline {
  if (!isRecord(value)) return false;
  return value.type === 'AI-Create' || value.type === 'AI-Delete' || value.type === 'AI-Edit';
}

function readGeneratedEdit(value: Extract<AiGeneratedInline, { type: 'AI-Edit' }>) {
  return {
    origin: stringValue(value.old_text) || stringValue(value.text_old),
    replace: stringValue(value.new_text) || stringValue(value.text_new),
  };
}

function normalizeMathProps(
  props: Record<string, unknown>,
  content: unknown,
  keyPrefix: string
): Record<string, unknown> | null {
  if (!Array.isArray(content)) {
    return { ...props, expression: stringValue(props.expression) };
  }
  const generated = content.find(isAiGeneratedInline);
  if (!generated) return { ...props, expression: stringValue(props.expression) };

  const key = `${keyPrefix}:math`;
  if (generated.type === 'AI-Create') {
    const expression = stringValue(generated.text);
    return {
      ...props,
      expression,
      aiDiffType: 'create',
      aiDiffKey: key,
      aiDiffOrigin: '',
      aiDiffReplace: expression,
    };
  }
  if (generated.type === 'AI-Delete') {
    const expression = stringValue(generated.text);
    return {
      ...props,
      expression,
      aiDiffType: 'delete',
      aiDiffKey: key,
      aiDiffOrigin: expression,
      aiDiffReplace: '',
    };
  }

  const { origin, replace } = readGeneratedEdit(generated);
  return {
    ...props,
    expression: replace || origin,
    aiDiffType: 'edit',
    aiDiffKey: key,
    aiDiffOrigin: origin,
    aiDiffReplace: replace,
  };
}

function hasMathAiDiff(content: Record<string, unknown>): boolean {
  return ['edit', 'create', 'delete'].includes(stringProp(content, 'aiDiffType'));
}

function normalizedInlineMath(inline: Record<string, unknown>) {
  const props = propsOf(inline);
  return {
    type: inline.type,
    props: {
      ...props,
      expression: stringValue(props.expression),
      autoOpenEdit: Boolean(props.autoOpenEdit),
    },
  };
}

function changedInlineMath(
  inline: Record<string, unknown>,
  type: 'edit' | 'create' | 'delete',
  origin: string,
  replace: string
) {
  const normalized = normalizedInlineMath(inline);
  return {
    ...normalized,
    props: {
      ...normalized.props,
      expression: replace || origin,
      aiDiffType: type,
      aiDiffOrigin: origin,
      aiDiffReplace: replace,
    },
  };
}

export function applyMathAiDiffAction(
  props: unknown,
  action: NoteAiDiffAction
): MathAiDiffActionResult {
  if (!isRecord(props)) return { kind: 'none' };
  const type = stringValue(props.aiDiffType);
  if (!['edit', 'create', 'delete'].includes(type)) return { kind: 'none' };

  const cleared = {
    ...props,
    aiDiffType: '',
    aiDiffKey: '',
    aiDiffOrigin: '',
    aiDiffReplace: '',
  };
  const origin = stringValue(props.aiDiffOrigin);
  const replace = stringValue(props.aiDiffReplace);
  if (type === 'create') {
    return action === 'discard'
      ? { kind: 'remove' }
      : { kind: 'update', props: { ...cleared, expression: replace } };
  }
  if (type === 'delete') {
    return action === 'accept'
      ? { kind: 'remove' }
      : { kind: 'update', props: { ...cleared, expression: origin } };
  }
  return {
    kind: 'update',
    props: { ...cleared, expression: action === 'accept' ? replace : origin },
  };
}

export const mathBlockAiDiff: NoteBlockAiDiff = {
  isPresent: hasMathAiDiff,
  normalizeProtocol({ props, content, aiContent, hasExplicitAiContent }, registry) {
    if (hasMathAiDiff(props)) {
      return { props: { ...props, expression: stringValue(props.expression) }, content: [] };
    }
    const origin =
      extractAiDiffProtocolVisibleText(content, registry) || stringValue(props.expression);
    const replace =
      extractAiDiffProtocolVisibleText(aiContent, registry) ||
      (!hasExplicitAiContent ? stringValue(props.expression) : '');
    if (origin === replace) return { props: { ...props, expression: origin }, content: [] };
    if (!origin && replace) {
      return {
        props,
        content: [{ type: 'AI-Create', text: replace, styles: {} }],
      };
    }
    if (origin && !replace) {
      return {
        props,
        content: [{ type: 'AI-Delete', text: origin, styles: {} }],
      };
    }
    return {
      props,
      content: [{ type: 'AI-Edit', old_text: origin, new_text: replace, styles: {} }],
    };
  },
  normalizeGenerated({ props, content, keyPrefix }) {
    const normalized = normalizeMathProps(props, content, keyPrefix);
    return normalized ? { props: normalized } : null;
  },
  applyAll(block, action) {
    return applyMathAiDiffAction(block.props, action);
  },
};

export const inlineMathAiDiff: NoteInlineAiDiff = {
  isPresent: hasMathAiDiff,
  isVisible(inline, mode) {
    const expression = stringProp(inline, 'expression');
    const type = stringProp(inline, 'aiDiffType');
    const origin = stringProp(inline, 'aiDiffOrigin');
    const replace = stringProp(inline, 'aiDiffReplace');
    if (type === 'edit') {
      if (mode === AI_DIFF_DISPLAY_MODE.OLD_ONLY) return origin !== '';
      if (mode === AI_DIFF_DISPLAY_MODE.NEW_ONLY) return replace !== '';
      return origin !== '' || replace !== '';
    }
    if (type === 'create') return mode !== AI_DIFF_DISPLAY_MODE.OLD_ONLY && replace !== '';
    if (type === 'delete') return mode !== AI_DIFF_DISPLAY_MODE.NEW_ONLY && origin !== '';
    return expression !== '';
  },
  apply(inline, action) {
    const result = applyMathAiDiffAction(propsOf(inline), action);
    if (result.kind === 'none') return undefined;
    if (result.kind === 'remove') return [];
    return [{ ...inline, props: result.props }];
  },
  normalizeGenerated(inline, context) {
    const props = propsOf(inline);
    const type = stringProp(inline, 'aiDiffType');
    const origin = stringProp(inline, 'aiDiffOrigin');
    const replace = stringProp(inline, 'aiDiffReplace');
    const expression =
      stringProp(inline, 'expression') ||
      (type === 'create' ? replace : type === 'delete' ? origin : replace || origin);
    return [
      {
        type: inline.type,
        props: {
          ...props,
          expression,
          autoOpenEdit: Boolean(props.autoOpenEdit),
          aiDiffType: type,
          aiDiffKey: stringProp(inline, 'aiDiffKey') || context.key,
          aiDiffOrigin: origin,
          aiDiffReplace: replace,
        },
      },
    ];
  },
  protocol: {
    kind: 'atom',
    normalize: normalizedInlineMath,
    visibleText: (inline) => stringProp(inline, 'expression'),
    plain: (inline) => [normalizedInlineMath(inline)],
    create: (inline) => {
      const expression = stringProp(inline, 'expression');
      return [changedInlineMath(inline, 'create', '', expression)];
    },
    delete: (inline) => {
      const expression = stringProp(inline, 'expression');
      return [changedInlineMath(inline, 'delete', expression, '')];
    },
    edit: (origin, replace) => [
      changedInlineMath(
        replace,
        'edit',
        stringProp(origin, 'expression'),
        stringProp(replace, 'expression')
      ),
    ],
  },
};

export const mathAiDiffMarkdownExport: NoteMarkdownExportProjection = {
  project(node, context) {
    const action =
      context.aiDiffDisplayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY
        ? 'accept'
        : context.aiDiffDisplayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY
          ? 'discard'
          : null;
    if (!action) return node;
    const result = applyMathAiDiffAction(node.props, action);
    if (result.kind === 'remove') return null;
    if (result.kind === 'update') return { ...node, props: result.props };
    return node;
  },
};
