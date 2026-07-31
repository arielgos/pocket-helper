import { StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n';

export function ChatHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{t('app.title')}</Text>
      <Text style={styles.subtitle}>{t('app.subtitle')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#6b7280',
  },
});
