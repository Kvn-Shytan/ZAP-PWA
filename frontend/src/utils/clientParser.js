// clientParser.js
// Utility to parse and handle Occasional Client names hidden in sales notes

export const parseClientName = (salesOrder) => {
  if (!salesOrder) return { name: '-', isOccasional: false, cleanNotes: '' };
  
  const clientName = salesOrder.client?.name || '';
  const notes = salesOrder.notes || '';
  
  if (clientName === 'Cliente Ocasional' && notes.startsWith('[OCASIONAL:')) {
    const match = notes.match(/^\[OCASIONAL:\s*([^\]]+)\]/);
    if (match && match[1]) {
      const cleanNotes = notes.replace(/^\[OCASIONAL:\s*[^\]]+\]\s*/, '');
      return { 
        name: match[1].trim(), 
        isOccasional: true,
        cleanNotes: cleanNotes
      };
    }
  }
  
  return { 
    name: clientName || 'Consumidor Final', 
    isOccasional: false,
    cleanNotes: notes
  };
};
