export function allVisibleSelected(selected: readonly string[], visible: readonly string[]): boolean {
  return visible.length > 0 && visible.every(id => selected.includes(id));
}

export function toggleVisibleSelection(selected: readonly string[], visible: readonly string[]): string[] {
  return allVisibleSelected(selected, visible)
    ? selected.filter(id => !visible.includes(id))
    : [...new Set([...selected, ...visible])];
}
