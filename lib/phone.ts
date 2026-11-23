const easternArabicDigits: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

export function normalizePhone(input: string): string | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  // 1. Replace Eastern Arabic numerals with Latin digits
  let cleaned = input.replace(/[٠-٩]/g, (digit) => easternArabicDigits[digit] || digit);

  // 2. Remove common formatting characters (spaces, dashes, dots, parentheses, slashes)
  cleaned = cleaned.replace(/[\s\-\.\(\)\/]/g, "");

  // 3. Handle international prefixes for Algeria (+213 or 00213)
  if (cleaned.startsWith("+213")) {
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("00213")) {
    cleaned = "0" + cleaned.slice(5);
  } else if (cleaned.startsWith("213") && cleaned.length === 12) {
    cleaned = "0" + cleaned.slice(3);
  }

  // 4. Validate Algerian mobile format: 05, 06, or 07 followed by exactly 8 digits
  const algerianMobileRegex = /^0[567]\d{8}$/;
  if (!algerianMobileRegex.test(cleaned)) {
    return null;
  }

  return cleaned;
}
