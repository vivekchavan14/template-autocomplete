import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useState } from 'react';
import { 
  $getSelection, 
  $isRangeSelection, 
  $isTextNode,
  $createTextNode,
  COMMAND_PRIORITY_LOW, 
  KEY_DOWN_COMMAND 
} from 'lexical';
import SuggestionsDropdown from './SuggestionsDropdown';
import { $createAutocompletedEntryNode } from '../nodes/AutocompletedEntryNode';

// Hardcoded suggestions list
const SUGGESTIONS = [
  'world', 'work', 'wonder', 'word', 'workflow', 'workspace',
  'hello', 'help', 'heart', 'home', 'house', 'history',
  'javascript', 'java', 'json', 'jsx', 'journey',
  'react', 'redux', 'router', 'render', 'return',
  'typescript', 'test', 'template', 'theme', 'token'
];

// State to track if autocomplete is active
interface AutocompleteState {
  isActive: boolean;
  matchString: string;
  filteredSuggestions: string[];
  highlightedIndex: number;
  // Store replacement context to handle clicks properly
  replacementContext: {
    nodeKey: string;
    triggerStart: number;
    triggerEnd: number;
    fullText: string;
  } | null;
}

export default function AutocompletePlugin(): React.JSX.Element | null {
  // Get the editor instance from the Lexical composer context
  const [editor] = useLexicalComposerContext();
  const [autocompleteState, setAutocompleteState] = useState<AutocompleteState>({
    isActive: false,
    matchString: '',
    filteredSuggestions: [],
    highlightedIndex: 0,
    replacementContext: null
  });

  // Function to filter suggestions based on match string
  const filterSuggestions = (matchString: string): string[] => {
    if (matchString === '') {
      // Show all suggestions when match string is empty
      return SUGGESTIONS.slice(0, 8); // Limit to 8 for UI performance
    }
    
    // Filter suggestions that start with the match string (case-insensitive)
    const filtered = SUGGESTIONS.filter(suggestion => 
      suggestion.toLowerCase().startsWith(matchString.toLowerCase())
    );
    
    console.log('AutocompletePlugin: Filtered suggestions:', filtered);
    return filtered.slice(0, 8); // Limit to 8 suggestions
  };

  // Function to extract match string from current cursor position
  const extractMatchString = (): string | null => {
    let matchString: string | null = null;

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        return;
      }

      // Get the current text node
      const anchorNode = selection.anchor.getNode();
      
      if (!$isTextNode(anchorNode)) {
        return;
      }

      const textContent = anchorNode.getTextContent();
      const offset = selection.anchor.offset;
      
      console.log('AutocompletePlugin: Text content:', textContent);
      console.log('AutocompletePlugin: Cursor offset:', offset);

      // Look for <> pattern before cursor
      const textBeforeCursor = textContent.substring(0, offset);
      const triggerIndex = textBeforeCursor.lastIndexOf('<>');
      
      if (triggerIndex === -1) {
        console.log('AutocompletePlugin: No <> trigger found');
        return;
      }

      // Extract text from <> to cursor
      const potentialMatch = textContent.substring(triggerIndex + 2, offset);
      
      // Check if match string contains newlines (invalid)
      if (potentialMatch.includes('\n')) {
        console.log('AutocompletePlugin: Match string contains newline, invalid');
        return;
      }

      matchString = potentialMatch;
      console.log('AutocompletePlugin: Valid match string found:', `"${matchString}"`);
    });

    return matchString;
  };

  // Handle suggestion selection (click or keyboard)
  const handleSuggestionSelect = (suggestion: string, index: number) => {
    console.log('AutocompletePlugin: Selected suggestion:', suggestion, 'at index:', index);
    
    // Replace the match string with an AutocompletedEntryNode
    editor.update(() => {
      const selection = $getSelection();
      
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        console.log('AutocompletePlugin: Invalid selection for replacement');
        return;
      }

      // Get the current text node
      const anchorNode = selection.anchor.getNode();
      
      if (!$isTextNode(anchorNode)) {
        console.log('AutocompletePlugin: Not in a text node');
        return;
      }

      const textContent = anchorNode.getTextContent();
      const cursorOffset = selection.anchor.offset;
      
      console.log('AutocompletePlugin: Current text:', textContent);
      console.log('AutocompletePlugin: Cursor at:', cursorOffset);

      // Find the <> trigger position
      const textBeforeCursor = textContent.substring(0, cursorOffset);
      const triggerIndex = textBeforeCursor.lastIndexOf('<>');
      
      if (triggerIndex === -1) {
        console.log('AutocompletePlugin: Could not find <> trigger for replacement');
        return;
      }

      // Calculate what text to replace
      const triggerStart = triggerIndex; // Include the <> in replacement
      const triggerEnd = cursorOffset; // Up to current cursor
      const textToReplace = textContent.substring(triggerStart, triggerEnd);
      
      console.log('AutocompletePlugin: Replacing "' + textToReplace + '" with autocompleted entry "' + suggestion + '"');

      // Split the text node and insert the autocompleted entry
      const beforeTrigger = textContent.substring(0, triggerStart);
      const afterCursor = textContent.substring(triggerEnd);
      
      // Update the current node with text before the trigger
      anchorNode.setTextContent(beforeTrigger);
      
      // Create the autocompleted entry node
      const autocompletedEntry = $createAutocompletedEntryNode(suggestion);
      
      // Insert the autocompleted entry node after the current text node
      anchorNode.insertAfter(autocompletedEntry);
      
      // If there's text after the cursor, create a new text node for it
      if (afterCursor.length > 0) {
        const afterTextNode = $createTextNode(afterCursor);
        autocompletedEntry.insertAfter(afterTextNode);
        // Position cursor at the beginning of the after text
        afterTextNode.select(0, 0);
      } else {
        // Position cursor after the autocompleted entry
        autocompletedEntry.selectNext();
      }
      
      console.log('AutocompletePlugin: Created autocompleted entry node');
    });
    
    // Deactivate autocomplete
    setAutocompleteState({
      isActive: false,
      matchString: '',
      filteredSuggestions: [],
      highlightedIndex: 0,
      replacementContext: null
    });
  };

  // Handle mouse hover highlighting
  const handleHighlightChange = (index: number) => {
    setAutocompleteState(prevState => ({
      ...prevState,
      highlightedIndex: index
    }));
  };

  useEffect(() => {
    console.log('AutocompletePlugin: Plugin initialized');
    console.log('AutocompletePlugin: Autocomplete state:', autocompleteState);

    // Register a command listener for key down events
    const unregister = editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        // Handle keyboard navigation when autocomplete is active
        if (autocompleteState.isActive && autocompleteState.filteredSuggestions.length > 0) {
          console.log('AutocompletePlugin: Handling key during autocomplete:', event.key);
          
          switch (event.key) {
            case 'ArrowDown':
              event.preventDefault(); // Don't move cursor in editor
              setAutocompleteState(prevState => {
                const nextIndex = (prevState.highlightedIndex + 1) % prevState.filteredSuggestions.length;
                console.log('AutocompletePlugin: Moving to next suggestion:', nextIndex);
                return {
                  ...prevState,
                  highlightedIndex: nextIndex
                };
              });
              return true; // We handled this event
              
            case 'ArrowUp':
              event.preventDefault(); // Don't move cursor in editor
              setAutocompleteState(prevState => {
                const prevIndex = prevState.highlightedIndex === 0 
                  ? prevState.filteredSuggestions.length - 1 
                  : prevState.highlightedIndex - 1;
                console.log('AutocompletePlugin: Moving to previous suggestion:', prevIndex);
                return {
                  ...prevState,
                  highlightedIndex: prevIndex
                };
              });
              return true; // We handled this event
              
            case 'Enter':
            case 'Tab':
              event.preventDefault(); // Don't add newline or tab
              const selectedSuggestion = autocompleteState.filteredSuggestions[autocompleteState.highlightedIndex];
              console.log('AutocompletePlugin: Selecting suggestion via keyboard:', selectedSuggestion);
              handleSuggestionSelect(selectedSuggestion, autocompleteState.highlightedIndex);
              return true; // We handled this event
              
            case 'Escape':
              event.preventDefault();
              console.log('AutocompletePlugin: Closing autocomplete via Escape');
              setAutocompleteState({
                isActive: false,
                matchString: '',
                filteredSuggestions: [],
                highlightedIndex: 0,
                replacementContext: null
              });
              return true; // We handled this event
          }
        }

        // We need to check for autocomplete trigger AFTER the key is processed
        // So we use setTimeout to run after the key has been added to the editor
        setTimeout(() => {
          console.log('AutocompletePlugin: Checking for autocomplete trigger...');
          const matchString = extractMatchString();
          
          if (matchString !== null) {
            // We found a valid match string - start/update autocomplete
            const filteredSuggestions = filterSuggestions(matchString);
            console.log('AutocompletePlugin: Starting autocomplete with match:', `"${matchString}"`);
            console.log('AutocompletePlugin: Filtered suggestions:', filteredSuggestions);
            
            setAutocompleteState({
              isActive: true,
              matchString: matchString,
              filteredSuggestions: filteredSuggestions,
              highlightedIndex: 0, // Always highlight first suggestion
              replacementContext: null // We'll implement this later
            });
          } else {
            // No valid match string - deactivate autocomplete
            setAutocompleteState(prevState => {
              if (prevState.isActive) {
                console.log('AutocompletePlugin: Deactivating autocomplete');
                return {
                  isActive: false,
                  matchString: '',
                  filteredSuggestions: [],
                  highlightedIndex: 0,
                  replacementContext: null
                };
              }
              return prevState;
            });
          }
        }, 0);

        // Return false to let other plugins handle the event too (if we didn't handle it above)
        return false;
      },
      COMMAND_PRIORITY_LOW // Low priority so other plugins can handle first
    );

    // Cleanup function - unregister the command when component unmounts
    return unregister;
  }, [editor, autocompleteState]);

  // Render suggestions dropdown when autocomplete is active
  if (!autocompleteState.isActive || autocompleteState.filteredSuggestions.length === 0) {
    return null;
  }

  return (
    <SuggestionsDropdown
      suggestions={autocompleteState.filteredSuggestions}
      highlightedIndex={autocompleteState.highlightedIndex}
      onSuggestionClick={handleSuggestionSelect}
      onHighlightChange={handleHighlightChange}
      position={{ x: 100, y: 100 }} // Temporary fixed position
    />
  );
}
