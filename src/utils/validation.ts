// ── Validation result type ──────────────────────────────────────
export interface ValidationResult {
    valid: boolean;
    message: string;
}

const ok: ValidationResult = { valid: true, message: '' };

// ── Field validators ────────────────────────────────────────────

/** Amount must be a positive finite number. */
export function validateAmount(value: string): ValidationResult {
    if (!value || value.trim() === '') {
        return { valid: false, message: 'Amount is required.' };
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
        return { valid: false, message: 'Amount must be a valid number.' };
    }
    if (num <= 0) {
        return { valid: false, message: 'Amount must be greater than zero.' };
    }
    if (!isFinite(num)) {
        return { valid: false, message: 'Amount must be a finite number.' };
    }
    return ok;
}

/** Title / description must not be empty. */
export function validateTitle(value: string): ValidationResult {
    if (!value || value.trim() === '') {
        return { valid: false, message: 'Title is required.' };
    }
    if (value.trim().length > 100) {
        return { valid: false, message: 'Title must be 100 characters or fewer.' };
    }
    return ok;
}

/** Date string must parse to a valid Date that is not in the future. */
export function validateDate(value: string | Date): ValidationResult {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) {
        return { valid: false, message: 'Please enter a valid date.' };
    }
    // Allow up to end of today (in local time)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    if (date >= tomorrow) {
        return { valid: false, message: 'Date cannot be in the future.' };
    }
    return ok;
}

/** Category ID must not be empty. */
export function validateCategory(categoryId: string): ValidationResult {
    if (!categoryId || categoryId.trim() === '') {
        return { valid: false, message: 'Please select a category.' };
    }
    return ok;
}

// ── Aggregate validator ─────────────────────────────────────────

export interface TransactionInput {
    title: string;
    amount: string;
    date: string | Date;
    categoryId: string;
}

/**
 * Validate all fields of a transaction at once.
 * Returns the first error found, or a success result.
 */
export function validateTransaction(input: TransactionInput): ValidationResult {
    const checks = [
        validateTitle(input.title),
        validateAmount(input.amount),
        validateDate(input.date),
        validateCategory(input.categoryId),
    ];
    return checks.find((c) => !c.valid) ?? ok;
}
