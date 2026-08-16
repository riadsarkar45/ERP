export const evaluateQtyExpression = (expr: string) => {
    if (expr === undefined || expr === null) return null;
    const sanitized = String(expr).trim();
    if (sanitized === '') return null;
    if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) return null;

    try {
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${sanitized});`)();
        return typeof result === 'number' && Number.isFinite(result) ? result : null;
    } catch {
        return null;
    }
};