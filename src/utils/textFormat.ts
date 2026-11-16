import type { ChangeEvent } from 'react';

/**
 * Capitalizes the first alphabetical character of the text (sentence case),
 * keeping leading whitespace intact and preserving existing uppercase letters.
 */
export function capitalizeFirstLetter(value: string): string {
  if (!value) return value;
  return value.replace(
    /^(\s*)([a-z\u00C0-\u024F])/,
    (_, ws: string, ch: string) => `${ws}${ch.toUpperCase()}`
  );
}

/**
 * Capitalizes the initial letter of every word (title case) while preserving
 * existing uppercase acronyms or letters typed by the user.
 */
export function capitalizeEachWord(value: string): string {
  if (!value) return value;
  return value.replace(
    /(^|[\s(/\-])([a-z\u00C0-\u024F])/g,
    (_, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`
  );
}

/**
 * Applies a capitalization formatter inside a controlled React input onChange
 * while preserving the user's caret position when characters are transformed.
 */
export function handleCapitalizedInputChange(
  e: ChangeEvent<HTMLInputElement>,
  formatter: (val: string) => string,
  onChange: (formatted: string) => void
): void {
  const input = e.target;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const formatted = formatter(input.value);
  onChange(formatted);

  if (formatted !== input.value && start !== null && end !== null) {
    window.requestAnimationFrame(() => {
      try {
        input.setSelectionRange(start, end);
      } catch {
        // Ignore selection errors on unsupported input states
      }
    });
  }
}
