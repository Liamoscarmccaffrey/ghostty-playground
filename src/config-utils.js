export function idToConfigKey(id) {
  return id.replace(/([A-Z])/g, '-$1').toLowerCase();
}

export function scrollbackBytesToLines(bytes) {
  if (!Number.isFinite(bytes)) return undefined;
  return Math.max(0, Math.ceil(bytes / 1000));
}

export function mergeConfigText(baseText, { text, replacedKeys }) {
  const keys = new Set(replacedKeys);
  if (keys.size === 0) return baseText;

  const keptLines = baseText.split('\n').filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return true;
    const equals = trimmed.indexOf('=');
    if (equals === -1) return true;
    return !keys.has(trimmed.slice(0, equals).trim());
  });
  const replacementLines = text.split('\n').filter(line => line.trim());

  while (keptLines.length > 0 && keptLines[keptLines.length - 1] === '') {
    keptLines.pop();
  }
  if (replacementLines.length > 0 && keptLines.length > 0) keptLines.push('');
  keptLines.push(...replacementLines);

  return keptLines.join('\n') + '\n';
}
