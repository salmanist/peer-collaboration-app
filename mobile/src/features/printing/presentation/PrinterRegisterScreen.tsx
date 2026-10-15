import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { Button, Card, ScreenContainer, TextField, spacing } from "../../../core/ui";
import { deleteMyPrinterProfile, getMyPrinterProfile, saveMyPrinterProfile } from "../data/printingApi";
import { SwitchRow, printStyles } from "./printUi";

export default function PrinterRegisterScreen() {
  const [isPrinter, setIsPrinter] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const [supportsColor, setSupportsColor] = useState(false);
  const [supportsDoubleSided, setSupportsDoubleSided] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getMyPrinterProfile()
        .then((profile) => {
          setIsPrinter(!!profile);
          setIsLoaded(true);
          if (profile) {
            setLocationNote(profile.location_note);
            setSupportsColor(profile.supports_color);
            setSupportsDoubleSided(profile.supports_double_sided);
          }
        })
        .catch(() => setError("Couldn't load your printer settings."));
    }, []),
  );

  const handleSave = async () => {
    setError(null);
    setIsBusy(true);
    try {
      await saveMyPrinterProfile({
        location_note: locationNote.trim(),
        supports_color: supportsColor,
        supports_double_sided: supportsDoubleSided,
      });
      router.replace("/(app)/printing");
    } catch (err: any) {
      const detail = err?.response?.data;
      setError(typeof detail === "object" ? Object.values(detail).flat().join(" ") : "Couldn't save your printer settings.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleStop = async () => {
    setError(null);
    setIsBusy(true);
    try {
      await deleteMyPrinterProfile();
      router.replace("/(app)/printing");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Couldn't stop being a printer. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <ScreenContainer scroll back="/(app)/printing">
      <Text style={[printStyles.title, styles.title]}>{!isLoaded ? " " : isPrinter ? "Printer settings" : "Register as printer"}</Text>
      <Text style={[printStyles.subtitle, styles.title]}>
        Other students will see your name, department and these details, and can send print requests to you.
      </Text>

      <Card contentStyle={styles.card}>
        <TextField label="Where do you print or hand over?" placeholder="e.g. Library, Hostel B" value={locationNote} onChangeText={setLocationNote} />
        <SwitchRow label="Colour printing" hint="Turn on if your printer can print in colour." value={supportsColor} onChange={setSupportsColor} />
        <SwitchRow label="Double-sided" hint="Turn on if your printer can print on both sides." value={supportsDoubleSided} onChange={setSupportsDoubleSided} />

        {error && <Text style={printStyles.error}>{error}</Text>}

        <Button label={isPrinter ? "Save changes" : "Register as printer"} onPress={handleSave} loading={isBusy} />
        {isPrinter && <Button label="Stop being a printer" variant="ghost" onPress={handleStop} disabled={isBusy} />}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.md },
  card: { gap: spacing.lg },
});
