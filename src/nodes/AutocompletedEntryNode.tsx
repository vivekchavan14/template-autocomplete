import {
  $applyNodeReplacement,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
  TextNode,
} from 'lexical';

export interface SerializedAutocompletedEntryNode extends Spread<
  {
    text: string;
  },
  SerializedLexicalNode
> {}

export class AutocompletedEntryNode extends TextNode {
  static getType(): string {
    return 'autocompleted-entry';
  }

  static clone(node: AutocompletedEntryNode): AutocompletedEntryNode {
    return new AutocompletedEntryNode(node.__text, node.__key);
  }

  constructor(text: string, key?: NodeKey) {
    super(text, key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    // Style the autocompleted entry with a distinct appearance
    dom.className = 'autocompleted-entry';
    dom.style.cssText = `
      background-color: #007acc;
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      margin: 0 2px;
      font-size: 0.9em;
      font-weight: 500;
      display: inline-block;
      user-select: none;
      cursor: default;
    `;
    // Make it non-editable
    dom.setAttribute('contenteditable', 'false');
    return dom;
  }

  updateDOM(
    prevNode: AutocompletedEntryNode,
    dom: HTMLElement,
  ): boolean {
    // Return false if the text is the same, true if it changed
    return prevNode.__text !== this.__text;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (node: Node) => ({
        conversion: convertAutocompletedEntryElement,
        priority: 1,
      }),
    };
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const { element } = super.exportDOM(editor);
    if (element && element instanceof HTMLElement) {
      element.className = 'autocompleted-entry';
    }
    return { element };
  }

  static importJSON(serializedNode: SerializedAutocompletedEntryNode): AutocompletedEntryNode {
    const { text } = serializedNode;
    return $createAutocompletedEntryNode(text);
  }

  exportJSON(): SerializedAutocompletedEntryNode {
    return {
      ...super.exportJSON(),
      text: this.getTextContent(),
      type: 'autocompleted-entry',
    };
  }

  // Override canInsertTextBefore to prevent editing
  canInsertTextBefore(): boolean {
    return false;
  }

  // Override canInsertTextAfter to prevent editing
  canInsertTextAfter(): boolean {
    return false;
  }

  // Make the node atomic (treated as a single unit)
  isToken(): boolean {
    return true;
  }

  // This node should be treated as a single unit for selection
  isSegmented(): boolean {
    return false;
  }
}

function convertAutocompletedEntryElement(domNode: Node): DOMConversionOutput {
  const node = domNode as HTMLElement;
  if (node.classList.contains('autocompleted-entry')) {
    return {
      node: $createAutocompletedEntryNode(node.textContent || ''),
    };
  }
  return null;
}

export function $createAutocompletedEntryNode(text: string): AutocompletedEntryNode {
  return $applyNodeReplacement(new AutocompletedEntryNode(text));
}

export function $isAutocompletedEntryNode(
  node: LexicalNode | null | undefined,
): node is AutocompletedEntryNode {
  return node instanceof AutocompletedEntryNode;
}
