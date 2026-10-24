import { StyleSheet, View, type TextStyle } from "react-native";

import { Text } from "../../../core/ui/AppText";
import { colors } from "../../../core/ui/theme";

// ponytail: tiny Markdown subset (bullets, numbers, **bold**, *italic*) instead of a library; extend if answers need more.
const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*(\d+)[.)]\s+(.*)$/;
const INLINE = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

function renderInline(text: string, baseStyle: TextStyle) {
  return text.split(INLINE).filter(Boolean).map((part, index) => {
    if (part.startsWith("***") && part.endsWith("***") && part.length > 6) {
      return <Text key={index} style={[baseStyle, styles.bold, styles.italic]}>{part.slice(3, -3)}</Text>;
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <Text key={index} style={[baseStyle, styles.bold]}>{part.slice(2, -2)}</Text>;
    }
    if ((part.startsWith("*") && part.endsWith("*") && part.length > 2) || (part.startsWith("_") && part.endsWith("_") && part.length > 2)) {
      return <Text key={index} style={[baseStyle, styles.italic]}>{part.slice(1, -1)}</Text>;
    }
    return <Text key={index} style={baseStyle}>{part}</Text>;
  });
}

export default function FormattedAnswer({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/^#{1,6}\s+(.*)$/, "**$1**"));
  return (
    <View style={styles.wrap}>
      {lines.map((line, index) => {
        if (!line.trim()) return null;
        const bullet = line.match(BULLET);
        const numbered = line.match(NUMBERED);
        if (bullet || numbered) {
          return (
            <View key={index} style={styles.listRow}>
              <Text style={styles.marker}>{bullet ? "•" : `${numbered![1]}.`}</Text>
              <Text style={[styles.base, styles.listText]}>{renderInline(bullet ? bullet[1] : numbered![2], styles.base)}</Text>
            </View>
          );
        }
        return <Text key={index} style={styles.base}>{renderInline(line, styles.base)}</Text>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  base: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: "500" },
  bold: { fontWeight: "800" },
  italic: { fontStyle: "italic" },
  listRow: { flexDirection: "row", gap: 8, paddingLeft: 2 },
  marker: { color: colors.primary, fontSize: 14, lineHeight: 20, fontWeight: "800", minWidth: 14 },
  listText: { flex: 1 },
});
