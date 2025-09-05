import React from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
} from "react-native";
import { useTheme } from "@/components/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "@/hooks/useI18n";

type Props = {
  visible: boolean;
  onResponse: (likesApp: boolean) => void;
  onDismiss: () => void;
};

export function ReviewPromptModal({ visible, onResponse, onDismiss }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n('common');

  const handleYes = () => {
    onResponse(true);
  };

  const handleNo = () => {
    onResponse(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modal,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            {t('review.title', 'Gefällt dir die App?')}
          </Text>
          <Text style={[styles.message, { color: colors.text }]}>
            {t('review.message', 'Wir würden uns freuen, wenn du uns ein Review gibst!')}
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleYes}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>
                {t('review.yes', 'Ja, gerne!')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { borderColor: colors.primary, borderWidth: 1 }]}
              onPress={handleNo}
            >
              <Text style={[styles.buttonText, { color: colors.primary }]}>
                {t('review.no', 'Nein, danke')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    margin: 20,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
