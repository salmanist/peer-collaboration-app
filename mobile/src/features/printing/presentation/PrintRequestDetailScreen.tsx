import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";

import { useSessionStore } from "../../../core/auth/session";
import { Badge, Button, Card, ScreenContainer, TextField, colors, font, spacing, typography } from "../../../core/ui";
import {
  acceptPrintRequest,
  cancelPrintRequest,
  completePrintRequest,
  getPrintRequest,
  ratePrintRequest,
  rejectPrintRequest,
  releasePrintRequest,
  type PrintRequest,
} from "../data/printingApi";
import { Stars, describeSettings, printStyles, statusTone } from "./printUi";

export default function PrintRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSessionStore((s) => s.user);
  const [request, setRequest] = useState<PrintRequest | null>(null);
  const [collectionNote, setCollectionNote] = useState("");
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRequest(await getPrintRequest(Number(id)));
    } catch {
      setError("Couldn't load this print request.");
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const run = async (action: () => Promise<PrintRequest>) => {
    setError(null);
    setIsBusy(true);
    try {
      setRequest(await action());
    } catch (err: any) {
      const detail = err?.response?.data;
      setError(typeof detail?.detail === "string" ? detail.detail : "That didn't work. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  if (!request) {
    return (
      <ScreenContainer center back="/(app)/printing">
        {error ? <Text style={printStyles.error}>{error}</Text> : <ActivityIndicator color={colors.primary} />}
      </ScreenContainer>
    );
  }

  const isRequester = request.requester.id === user?.id;
  const isPrinter = request.printer?.id === user?.id;
  const isTarget = request.target_printer?.id === user?.id;
  const tone = statusTone[request.status];

  return (
    <ScreenContainer scroll back="/(app)/printing">
      <Card contentStyle={styles.card}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>{request.document_name}</Text>
          <Badge label={tone.label} tone={tone.tone} />
        </View>
        <Text style={styles.settings}>{describeSettings(request)}</Text>
        <Text style={styles.meta}>Requested by {request.requester.full_name || request.requester.email}</Text>
        {request.target_printer && request.status === "open" && (
          <Text style={styles.meta}>Sent to {request.target_printer.full_name || request.target_printer.email}</Text>
        )}
        {request.printer && <Text style={styles.meta}>Printing: {request.printer.full_name || request.printer.email}</Text>}
        {request.status === "done" && request.collection_note ? (
          <Text style={styles.collect}>Collect: {request.collection_note}</Text>
        ) : null}

        <Button label="Open document" variant="ghost" onPress={() => Linking.openURL(request.document)} />

        {error && <Text style={printStyles.error}>{error}</Text>}

        {request.status === "open" && !isRequester && (
          <Button label="Accept and print" onPress={() => run(() => acceptPrintRequest(request.id))} loading={isBusy} />
        )}
        {request.status === "open" && isTarget && (
          <Button label="Reject" variant="ghost" onPress={() => run(() => rejectPrintRequest(request.id))} disabled={isBusy} />
        )}
        {request.status === "open" && isRequester && (
          <Button label="Cancel request" variant="ghost" onPress={() => run(() => cancelPrintRequest(request.id))} loading={isBusy} />
        )}
        {request.status === "accepted" && isPrinter && (
          <>
            <TextField
              label="Collection note (optional)"
              placeholder="e.g. Library desk, ask for Sam"
              value={collectionNote}
              onChangeText={setCollectionNote}
            />
            <Button label="Submit document" onPress={() => run(() => completePrintRequest(request.id, collectionNote.trim()))} loading={isBusy} />
            <Button label="Release job" variant="ghost" onPress={() => run(() => releasePrintRequest(request.id))} disabled={isBusy} />
          </>
        )}
      </Card>

      {request.status === "done" && isRequester && request.printer && (
        <Card contentStyle={styles.card}>
          {request.rating ? (
            <>
              <Text style={styles.sectionTitle}>Your rating</Text>
              <Stars score={request.rating.score} />
              {request.rating.comment ? <Text style={styles.settings}>{request.rating.comment}</Text> : null}
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Rate {request.printer.full_name || "your printer"}</Text>
              <Stars score={score} onChange={setScore} />
              <TextField label="Comment (optional)" placeholder="How did it go?" value={comment} onChangeText={setComment} />
              <Button
                label="Submit rating"
                onPress={() => run(() => ratePrintRequest(request.id, score, comment.trim()))}
                loading={isBusy}
                disabled={score === 0}
              />
            </>
          )}
        </Card>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  title: { flex: 1, fontSize: typography.size.lg, fontFamily: font.serif, color: colors.ink },
  sectionTitle: { fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink },
  settings: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textSecondary },
  meta: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textMuted },
  collect: { fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.success },
});
