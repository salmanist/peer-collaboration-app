export function cleanSampleText(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/\s*\(Sample\)/gi, "")
    .replace(/\[Sample\]\s*/gi, "")
    .trim();
}
