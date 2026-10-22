/** Flatten nested API validation errors without coercing objects into text. */
export function errorMessage(data: unknown, fallback: string): string {
  const messages: string[] = [];
  function collect(value: unknown, path: string) {
    if (typeof value === "string" && value.trim()) {
      messages.push(path ? `${path}: ${value}` : value);
    } else if (Array.isArray(value)) {
      value.forEach(item => collect(item, path));
    } else if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, item]) => {
        const label = ["detail", "non_field_errors", "message"].includes(key) ? "" : key.replaceAll("_", " ");
        collect(item, [path, label].filter(Boolean).join(" "));
      });
    }
  }
  collect(data, "");
  return [...new Set(messages)].join("\n") || fallback;
}
