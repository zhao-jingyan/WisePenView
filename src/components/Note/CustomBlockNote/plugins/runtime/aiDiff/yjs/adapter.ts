import * as Y from 'yjs';

const ROOT_GROUP_NODE = 'blockGroup';
const BLOCK_CONTAINER_NODE = 'blockContainer';
const AI_CONTENT_NODE = 'AI-content';
export const AI_CONTENT_STORE_MAP = 'ai-content-store';
export const AI_DIFF_NORMALIZATION_ORIGIN = Symbol('ai-diff-normalization');

export function isAiDiffNormalizationLeader(
  localClientId: number,
  awarenessClientIds: Iterable<number>
): boolean {
  let leaderClientId = localClientId;
  for (const clientId of awarenessClientIds) {
    leaderClientId = Math.min(leaderClientId, clientId);
  }
  return localClientId === leaderClientId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isYXmlElement(value: unknown): value is Y.XmlElement {
  return value instanceof Y.XmlElement;
}

function isYXmlText(value: unknown): value is Y.XmlText {
  return value instanceof Y.XmlText;
}

function readStyles(attributes: Record<string, unknown>): Record<string, string> {
  const styles: Record<string, string> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'link') continue;
    if (isRecord(value) && typeof value.stringValue === 'string') {
      styles[key] = value.stringValue;
    } else if (typeof value === 'string') {
      styles[key] = value;
    }
  }
  return styles;
}

function readYTextContent(textNode: Y.XmlText): Record<string, unknown>[] {
  const output: Record<string, unknown>[] = [];
  for (const delta of textNode.toDelta()) {
    if (typeof delta.insert !== 'string' || !delta.insert) continue;
    const attributes = isRecord(delta.attributes) ? delta.attributes : {};
    const styles = readStyles(attributes);
    const link = isRecord(attributes.link) ? attributes.link : null;
    if (!link) {
      output.push({ type: 'text', text: delta.insert, styles });
      continue;
    }

    const href = typeof link.href === 'string' ? link.href : '';
    const previous = output[output.length - 1];
    if (previous?.type === 'link' && previous.href === href && Array.isArray(previous.content)) {
      previous.content.push({ type: 'text', text: delta.insert, styles });
    } else {
      output.push({
        type: 'link',
        href,
        content: [{ type: 'text', text: delta.insert, styles }],
      });
    }
  }
  return output;
}

function readYInlineContent(element: Y.XmlElement): Record<string, unknown>[] {
  const output: Record<string, unknown>[] = [];
  for (const child of element.toArray()) {
    if (isYXmlText(child)) {
      output.push(...readYTextContent(child));
    } else if (isYXmlElement(child) && child.nodeName !== AI_CONTENT_NODE) {
      output.push({ type: child.nodeName, props: { ...child.getAttributes() } });
    }
  }
  return output;
}

function readYBlockGroup(group: Y.XmlElement, store: Y.Map<unknown>): Record<string, unknown>[] {
  const output: Record<string, unknown>[] = [];
  for (const child of group.toArray()) {
    if (!isYXmlElement(child) || child.nodeName !== BLOCK_CONTAINER_NODE) continue;
    const block = readYBlockContainer(child, store);
    if (block) output.push(block);
  }
  return output;
}

function readYBlockContainer(
  container: Y.XmlElement,
  store: Y.Map<unknown>
): Record<string, unknown> | null {
  const children = container.toArray();
  const blockElement = children.find(
    (child): child is Y.XmlElement => isYXmlElement(child) && child.nodeName !== ROOT_GROUP_NODE
  );
  if (!blockElement) return null;
  const childGroup = children.find(
    (child): child is Y.XmlElement => isYXmlElement(child) && child.nodeName === ROOT_GROUP_NODE
  );
  const inlineAiContent = blockElement
    .toArray()
    .find(
      (child): child is Y.XmlElement => isYXmlElement(child) && child.nodeName === AI_CONTENT_NODE
    );
  const id = String(container.getAttribute('id') ?? '');
  const storedAiContent = store.get(id);
  const block: Record<string, unknown> = {
    id,
    type: blockElement.nodeName,
    props: { ...blockElement.getAttributes() },
    content: readYInlineContent(blockElement),
    children: childGroup ? readYBlockGroup(childGroup, store) : [],
  };
  if (Array.isArray(storedAiContent)) {
    block[AI_CONTENT_NODE] = storedAiContent;
  } else if (inlineAiContent) {
    block[AI_CONTENT_NODE] = readYInlineContent(inlineAiContent);
  }
  return block;
}

function collectAiContentBlocks(
  blocks: readonly Record<string, unknown>[]
): Record<string, unknown>[] {
  const output: Record<string, unknown>[] = [];
  for (const block of blocks) {
    if (Object.prototype.hasOwnProperty.call(block, AI_CONTENT_NODE)) output.push(block);
    if (Array.isArray(block.children)) {
      output.push(...collectAiContentBlocks(block.children.filter(isRecord)));
    }
  }
  return output;
}

export function readAiContentProtoBlocks(
  doc: Y.Doc,
  fragment: Y.XmlFragment
): Record<string, unknown>[] {
  const root = fragment
    .toArray()
    .find(
      (child): child is Y.XmlElement => isYXmlElement(child) && child.nodeName === ROOT_GROUP_NODE
    );
  if (!root) return [];
  return collectAiContentBlocks(readYBlockGroup(root, doc.getMap(AI_CONTENT_STORE_MAP)));
}

function findBlockContainer(group: Y.XmlElement, id: string): Y.XmlElement | null {
  for (const child of group.toArray()) {
    if (!isYXmlElement(child) || child.nodeName !== BLOCK_CONTAINER_NODE) continue;
    if (String(child.getAttribute('id') ?? '') === id) return child;
    const nestedGroup = child
      .toArray()
      .find(
        (nested): nested is Y.XmlElement =>
          isYXmlElement(nested) && nested.nodeName === ROOT_GROUP_NODE
      );
    const nestedMatch = nestedGroup ? findBlockContainer(nestedGroup, id) : null;
    if (nestedMatch) return nestedMatch;
  }
  return null;
}

function setYAttributes(element: Y.XmlElement, attributes: Record<string, unknown>): void {
  for (const key of Object.keys(element.getAttributes())) {
    if (!Object.prototype.hasOwnProperty.call(attributes, key)) element.removeAttribute(key);
  }
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) element.setAttribute(key, value as string);
  }
}

function toYTextAttributes(styles: Record<string, unknown>): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(styles)) {
    if (value === undefined || value === false) continue;
    attributes[key] =
      value === true ? {} : typeof value === 'string' ? { stringValue: value } : value;
  }
  return attributes;
}

function createYInlineNode(item: unknown): Y.XmlElement | Y.XmlText | null {
  if (!isRecord(item) || typeof item.type !== 'string') return null;
  if (item.type === 'text') {
    const textNode = new Y.XmlText();
    textNode.insert(
      0,
      typeof item.text === 'string' ? item.text : '',
      toYTextAttributes(isRecord(item.styles) ? item.styles : {})
    );
    return textNode;
  }
  if (item.type === 'link') {
    const textNode = new Y.XmlText();
    const link = {
      href: typeof item.href === 'string' ? item.href : '',
      target: '_blank',
      rel: 'noopener noreferrer nofollow',
      class: null,
      title: null,
    };
    let offset = 0;
    for (const child of Array.isArray(item.content) ? item.content : []) {
      if (!isRecord(child) || typeof child.text !== 'string' || !child.text) continue;
      textNode.insert(offset, child.text, {
        ...toYTextAttributes(isRecord(child.styles) ? child.styles : {}),
        link,
      });
      offset += child.text.length;
    }
    return textNode;
  }
  const element = new Y.XmlElement(item.type);
  setYAttributes(element, isRecord(item.props) ? item.props : {});
  return element;
}

export function writeMappedBlock(
  fragment: Y.XmlFragment,
  blockId: string,
  mappedBlock: Record<string, unknown>
): boolean {
  const root = fragment
    .toArray()
    .find(
      (child): child is Y.XmlElement => isYXmlElement(child) && child.nodeName === ROOT_GROUP_NODE
    );
  const container = root ? findBlockContainer(root, blockId) : null;
  if (!container) return false;
  const blockElement = container
    .toArray()
    .find(
      (child): child is Y.XmlElement => isYXmlElement(child) && child.nodeName !== ROOT_GROUP_NODE
    );
  if (!blockElement) return false;

  setYAttributes(blockElement, isRecord(mappedBlock.props) ? mappedBlock.props : {});
  if (blockElement.length > 0) blockElement.delete(0, blockElement.length);
  const content = Array.isArray(mappedBlock.content) ? mappedBlock.content : [];
  const nextChildren = content
    .map(createYInlineNode)
    .filter((child): child is Y.XmlElement | Y.XmlText => child !== null);
  if (nextChildren.length > 0) blockElement.insert(0, nextChildren);
  return true;
}

export function removeAiContentPayloads(
  doc: Y.Doc,
  fragment: Y.XmlFragment,
  blockIds: ReadonlySet<string>
): boolean {
  const root = fragment
    .toArray()
    .find(
      (child): child is Y.XmlElement => isYXmlElement(child) && child.nodeName === ROOT_GROUP_NODE
    );
  const store = doc.getMap(AI_CONTENT_STORE_MAP);
  let changed = false;
  for (const blockId of blockIds) {
    const container = root ? findBlockContainer(root, blockId) : null;
    const blockElement = container
      ?.toArray()
      .find(
        (child): child is Y.XmlElement => isYXmlElement(child) && child.nodeName !== ROOT_GROUP_NODE
      );
    const aiContentIndex = blockElement
      ?.toArray()
      .findIndex((child) => isYXmlElement(child) && child.nodeName === AI_CONTENT_NODE);
    if (blockElement && aiContentIndex !== undefined && aiContentIndex >= 0) {
      blockElement.delete(aiContentIndex, 1);
      changed = true;
    }
    if (store.has(blockId)) {
      store.delete(blockId);
      changed = true;
    }
  }
  return changed;
}
