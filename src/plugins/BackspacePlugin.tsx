import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_BACKSPACE_COMMAND,
} from 'lexical';
import { $isAutocompletedEntryNode } from '../nodes/AutocompletedEntryNode';

export default function BackspacePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Register backspace command handler with high priority
    const unregister = editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event: KeyboardEvent): boolean => {
        let handled = false;
        
        editor.update(() => {
          const selection = $getSelection();
          
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return false; // Let default behavior handle non-collapsed selections
          }

          const anchorNode = selection.anchor.getNode();
          const anchorOffset = selection.anchor.offset;
          
          console.log('BackspacePlugin: Backspace pressed, anchor node:', anchorNode.getType(), 'offset:', anchorOffset);

          // Check if we're at the start of a text node and the previous sibling is an autocompleted entry
          if (anchorOffset === 0) {
            const previousSibling = anchorNode.getPreviousSibling();
            console.log('BackspacePlugin: Previous sibling:', previousSibling?.getType());
            
            if ($isAutocompletedEntryNode(previousSibling)) {
              console.log('BackspacePlugin: Found autocompleted entry to remove:', previousSibling.getTextContent());
              
              // Remove the autocompleted entry node
              previousSibling.remove();
              // Keep cursor at current position (beginning of current text node)
              console.log('BackspacePlugin: Removed autocompleted entry');
              
              // Prevent default backspace behavior
              event.preventDefault();
              handled = true;
            }
          }

          // Check if the current node itself is an autocompleted entry
          if ($isAutocompletedEntryNode(anchorNode)) {
            console.log('BackspacePlugin: Cursor is inside autocompleted entry, removing it');
            
            // Get the next sibling to position cursor after removal
            const nextSibling = anchorNode.getNextSibling();
            const previousSibling = anchorNode.getPreviousSibling();
            
            anchorNode.remove();
            
            // Position cursor appropriately
            if (nextSibling) {
              nextSibling.selectStart();
            } else if (previousSibling) {
              // If no next sibling, try to position cursor at end of previous sibling
              previousSibling.selectEnd();
            }
            
            console.log('BackspacePlugin: Removed autocompleted entry that contained cursor');
            
            // Prevent default backspace behavior
            event.preventDefault();
            handled = true;
          }
        });
        
        return handled;
      },
      COMMAND_PRIORITY_HIGH // High priority to intercept before default backspace handling
    );

    return unregister;
  }, [editor]);

  return null;
}
