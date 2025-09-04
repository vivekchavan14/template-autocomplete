interface SuggestionsDropdownProps {
  suggestions: string[];
  highlightedIndex: number;
  onSuggestionClick: (suggestion: string, index: number) => void;
  onHighlightChange?: (index: number) => void;
  position?: { x: number; y: number };
}

export default function SuggestionsDropdown({ 
  suggestions, 
  highlightedIndex, 
  onSuggestionClick,
  onHighlightChange,
  position = { x: 0, y: 0 }
}: SuggestionsDropdownProps): React.JSX.Element | null {
  
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div 
      className="autocomplete-suggestions-dropdown"
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1000,
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        maxHeight: '200px',
        overflowY: 'auto',
        minWidth: '150px'
      }}
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={suggestion}
          className={`autocomplete-suggestion-item ${index === highlightedIndex ? 'highlighted' : ''}`}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            backgroundColor: index === highlightedIndex ? '#007acc' : 'transparent',
            color: index === highlightedIndex ? 'white' : '#333',
            borderBottom: index === suggestions.length - 1 ? 'none' : '1px solid #eee',
            fontSize: '14px',
            fontFamily: 'inherit'
          }}
          onClick={() => onSuggestionClick(suggestion, index)}
          onMouseEnter={() => {
            if (onHighlightChange) {
              onHighlightChange(index);
            }
            console.log('SuggestionsDropdown: Mouse entered suggestion:', suggestion);
          }}
        >
          {suggestion}
        </div>
      ))}
    </div>
  );
}
