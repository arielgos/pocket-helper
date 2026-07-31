import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n';

type ChatStatusBannerProps = {
  loading: boolean;
  loadingMessage?: string | null;
  validationMessage?: string | null;
  errorMessage?: string | null;
};

export function ChatStatusBanner({
  loading,
  loadingMessage,
  validationMessage,
  errorMessage,
}: ChatStatusBannerProps) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          {loadingMessage ?? t('labels.loadingMessages')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.bannerContainer}>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {validationMessage ? (
        <Text style={styles.validationInfo}>{validationMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    paddingTop: 8,
  },
  error: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 10,
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    borderRadius: 8,
  },
  validationInfo: {
    marginHorizontal: 12,
    marginTop: 8,
    color: '#1d4ed8',
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#374151',
  },
});
