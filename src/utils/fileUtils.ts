export const parseMetadataFromFilename = (filename: string) => {
  const baseName = filename.split('.').slice(0, -1).join('.') || filename;
  
  let parsedDate = 'Unknown Date';
  let parsedTime: string | null = null;
  let phoneNumber: string | null = null;

  // Extract phone number: look for + followed by 7-15 digits, OR standalone 10-15 digits
  const phoneRegex = /(?:\+?\d{10,15})/;
  const phoneMatch = baseName.match(phoneRegex);
  if (phoneMatch) {
    // Avoid false positives with timestamps
    if (!(phoneMatch[0].startsWith('20') && phoneMatch[0].length >= 14)) {
       phoneNumber = phoneMatch[0];
    }
  }

  // Handle specific format: Name_YYMMDD_HHMMSS
  const underscoreParts = baseName.split('_');
  if (underscoreParts.length >= 3) {
    const datePart = underscoreParts[underscoreParts.length - 2];
    const timePart = underscoreParts[underscoreParts.length - 1];
    
    if (datePart.length === 6 && timePart.length === 6 && /^\d+$/.test(datePart) && /^\d+$/.test(timePart)) {
      // Parse YYMMDD
      const yy = datePart.substring(0, 2);
      const mm = datePart.substring(2, 4);
      const dd = datePart.substring(4, 6);
      
      const date = new Date(`20${yy}-${mm}-${dd}`);
      if (!isNaN(date.getTime())) {
        parsedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      
      // Parse HHMMSS
      const hrNum = parseInt(timePart.substring(0, 2), 10);
      const minStr = timePart.substring(2, 4);
      if (hrNum >= 0 && hrNum <= 23) {
         const ampm = hrNum >= 12 ? 'PM' : 'AM';
         const hr12 = hrNum % 12 || 12;
         parsedTime = `${hr12}:${minStr} ${ampm}`;
      }
    }
    // Also handle YYYYMMDD_HHMMSS
    else if (datePart.length === 8 && timePart.length === 6 && /^\d+$/.test(datePart) && /^\d+$/.test(timePart)) {
      const yyyy = datePart.substring(0, 4);
      const mm = datePart.substring(4, 6);
      const dd = datePart.substring(6, 8);
      
      const date = new Date(`${yyyy}-${mm}-${dd}`);
      if (!isNaN(date.getTime())) {
        parsedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      
      const hrNum = parseInt(timePart.substring(0, 2), 10);
      const minStr = timePart.substring(2, 4);
      if (hrNum >= 0 && hrNum <= 23) {
         const ampm = hrNum >= 12 ? 'PM' : 'AM';
         const hr12 = hrNum % 12 || 12;
         parsedTime = `${hr12}:${minStr} ${ampm}`;
      }
    }
  }

  // Fallback heuristic parsing if the specific format above didn't work
  if (parsedDate === 'Unknown Date') {
    const parts = baseName.split(/[_ \-\(\)\@]+/);
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (/^\d+$/.test(part)) {
        if (part.length >= 8 && part.startsWith('20')) {
          const year = part.substring(0, 4);
          const month = part.substring(4, 6);
          const day = part.substring(6, 8);
          
          const monthNum = parseInt(month, 10);
          const dayNum = parseInt(day, 10);
          
          if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
            const date = new Date(`${year}-${month}-${day}`);
            if (!isNaN(date.getTime())) {
              parsedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              
              // Extract time if available in the same string
              if (part.length >= 12) {
                const hrNum = parseInt(part.substring(8, 10), 10);
                const minStr = part.substring(10, 12);
                if (hrNum >= 0 && hrNum <= 23) {
                   const ampm = hrNum >= 12 ? 'PM' : 'AM';
                   const hr12 = hrNum % 12 || 12;
                   parsedTime = `${hr12}:${minStr} ${ampm}`;
                }
              }
            }
          }
        } 
        else if (part.length === 6) {
          const yearStr = part.substring(0, 2);
          const monthStr = part.substring(2, 4);
          const dayStr = part.substring(4, 6);
          
          const monthNum = parseInt(monthStr, 10);
          const dayNum = parseInt(dayStr, 10);
          
          if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
            const date = new Date(`20${yearStr}-${monthStr}-${dayStr}`);
            if (!isNaN(date.getTime())) {
              parsedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              
              // Look ahead to next part for time (HHMMSS)
              if (i + 1 < parts.length && parts[i + 1].length === 6 && /^\d+$/.test(parts[i + 1])) {
                 const timePart = parts[i + 1];
                 const hrNum = parseInt(timePart.substring(0, 2), 10);
                 const minStr = timePart.substring(2, 4);
                 if (hrNum >= 0 && hrNum <= 23) {
                   const ampm = hrNum >= 12 ? 'PM' : 'AM';
                   const hr12 = hrNum % 12 || 12;
                   parsedTime = `${hr12}:${minStr} ${ampm}`;
                 }
              }
            }
          }
        }
      }
    }
  }

  // Fallback for contact name if phone number wasn't found
  if (!phoneNumber) {
    const firstPart = underscoreParts[0].trim();
    // If the name starts with "Call recording " or similar, clean it up
    let cleanName = firstPart.replace(/^call recording\s+/i, '').trim();
    if (cleanName && cleanName.length > 2 && isNaN(Number(cleanName))) {
      phoneNumber = cleanName;
    } else {
      const parts = baseName.split(/[_ \-\(\)\@]+/);
      if (parts.length > 1) {
        const potentialName = parts[0];
        if (isNaN(Number(potentialName)) && potentialName.length > 2 && !potentialName.toLowerCase().includes('call')) {
          phoneNumber = potentialName;
        }
      }
    }
  }

  return { parsedDate, parsedTime, phoneNumber };
};

export const groupFilesByDate = <T extends { parsedDate?: string, name: string }>(files: T[]) => {
  const groups: Record<string, T[]> = {};
  
  files.forEach(file => {
    const date = file.parsedDate || parseMetadataFromFilename(file.name).parsedDate;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(file);
  });
  
  return Object.keys(groups)
    .sort((a, b) => {
        if (a === 'Unknown Date') return 1;
        if (b === 'Unknown Date') return -1;
        return new Date(b).getTime() - new Date(a).getTime(); // Sort dates descending
    })
    .map(date => ({
      title: date,
      data: groups[date]
    }));
};
