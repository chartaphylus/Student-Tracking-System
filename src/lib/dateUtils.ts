/**
 * Returns the current date in YYYY-MM-DD format based on the user's local timezone.
 */
export function getLocalDateString(date: Date = new Date()): string {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
}

/**
 * Alternative simple version using en-CA locale which returns YYYY-MM-DD
 */
export function formatYYYYMMDD(date: Date = new Date()): string {
    // en-CA is one of the few locales that defaults to YYYY-MM-DD
    return date.toLocaleDateString('en-CA');
}

/**
 * Returns the current date and time in YYYY-MM-DDThh:mm format based on the user's local timezone.
 * Useful for datetime-local inputs.
 */
export function getLocalDateTimeString(date: Date = new Date()): string {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
}
