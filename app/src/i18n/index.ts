import en from './en.json';

type Dictionary = typeof en;

const dictionary: Dictionary = en;

function resolvePath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (
      current !== null &&
      typeof current === 'object' &&
      segment in (current as Record<string, unknown>)
    ) {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, source);
}

export function t(key: string, variables?: Record<string, string>): string {
  const value = resolvePath(dictionary, key);

  if (typeof value !== 'string') {
    throw new Error(`Missing i18n key: ${key}`);
  }

  if (!variables) {
    return value;
  }

  return Object.entries(variables).reduce(
    (result, [name, replacement]) =>
      result.replace(new RegExp(`{{${name}}}`, 'g'), replacement),
    value
  );
}
