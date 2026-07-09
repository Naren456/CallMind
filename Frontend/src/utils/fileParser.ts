// Helper to extract date/time from common call recording filenames
export function extractDateFromFilename(fileName: string): Date | null {
  try {
    // User's suggested split logic:
    // "Call recording Didi_260708_182315.m4a" -> split("_") -> ["Call recording Didi", "260708", "182315.m4a"]
    const parts = fileName.replace(/\.[^/.]+$/, "").split("_");
    
    if (parts.length >= 3) {
      const datePart = parts[parts.length - 2]; // "260708"
      const timePart = parts[parts.length - 1]; // "182315"
      
      if (datePart.length === 6 && timePart.length === 6 && !isNaN(Number(datePart))) {
        return new Date(
          2000 + parseInt(datePart.substring(0, 2)), // 26 -> 2026
          parseInt(datePart.substring(2, 4)) - 1,    // 07 -> 6 (July)
          parseInt(datePart.substring(4, 6)),        // 08
          parseInt(timePart.substring(0, 2)),        // 18
          parseInt(timePart.substring(2, 4)),        // 23
          parseInt(timePart.substring(4, 6))         // 15
        );
      }
    }
  } catch (e) {
    console.warn("Failed to parse date from filename:", fileName);
  }

  return null;
}

// Helper to extract the contact name or phone number from the filename
export function extractContactName(fileName: string): string {
  // Matches "Call recording [Name/Phone]_YYMMDD"
  const match = fileName.match(/(?:Call recording\s+)?(.+?)_\d{6}_\d{6}/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  // Fallback: just remove the file extension
  return fileName.replace(/\.[^/.]+$/, "").trim();
}
