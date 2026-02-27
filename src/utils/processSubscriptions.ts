/**
 * processSubscriptions.ts
 *
 * Queries the WatermelonDB `subscriptions` table for any subscription whose
 * `nextBillingDate` is at or before the current time, creates a matching
 * transaction for each, and then advances `nextBillingDate` to the next
 * occurrence based on the subscription's interval.
 */
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';
import AutoSubscription from '../database/models/AutoSubscription';
import Transaction from '../database/models/Transaction';

// ── Date helpers ────────────────────────────────────────────────

const getDaysInMonth = (year: number, month: number): number =>
    new Date(year, month + 1, 0).getDate();

const clampDay = (year: number, month: number, day: number): number =>
    Math.min(Math.max(day, 1), getDaysInMonth(year, month));

/**
 * Given a subscription, compute its next billing date after `current`.
 */
function advanceDate(current: Date, interval: string, anchorDay: number | null, anchorMonth: number | null): Date {
    const next = new Date(current);
    next.setHours(12, 0, 0, 0);

    switch (interval) {
        case 'daily':
            next.setDate(next.getDate() + 1);
            break;

        case 'weekly':
            next.setDate(next.getDate() + 7);
            break;

        case 'monthly': {
            const targetDay = anchorDay ?? current.getDate();
            let m = next.getMonth() + 1;
            let y = next.getFullYear();
            if (m > 11) { m = 0; y += 1; }
            const day = clampDay(y, m, targetDay);
            next.setFullYear(y, m, day);
            break;
        }

        case 'yearly': {
            const targetMonth = anchorMonth ?? current.getMonth();
            const targetDayY = anchorDay ?? 1;
            let y = next.getFullYear() + 1;
            const day = clampDay(y, targetMonth, targetDayY);
            next.setFullYear(y, targetMonth, day);
            break;
        }

        default:
            // Fallback: advance by 30 days
            next.setDate(next.getDate() + 30);
    }

    return next;
}

// ── Main processor ──────────────────────────────────────────────

export async function processSubscriptions(): Promise<number> {
    const now = new Date();
    let processedCount = 0;

    try {
        // Fetch all subscriptions (we filter in JS because nextBillingDate is an ISO string)
        const allSubs = await database.collections
            .get<AutoSubscription>('subscriptions')
            .query()
            .fetch();

        // Filter to only those that are due (nextBillingDate <= now)
        const dueSubs = allSubs.filter(sub => {
            const billingDate = new Date(sub.nextBillingDate);
            return billingDate.getTime() <= now.getTime();
        });

        if (dueSubs.length === 0) return 0;

        await database.write(async () => {
            for (const sub of dueSubs) {
                // 1. Create the transaction
                await database.collections.get<Transaction>('transactions').create(record => {
                    record.type = sub.type;
                    record.title = sub.title;
                    record.amount = sub.amount;
                    record.categoryId = sub.categoryId;
                    record.date = now.toISOString();
                    record.notes = sub.notes ? `[Auto] ${sub.notes}` : '[Auto-Subscription]';
                });

                // 2. Advance the subscription's nextBillingDate
                const currentBilling = new Date(sub.nextBillingDate);
                const nextBilling = advanceDate(currentBilling, sub.interval, sub.anchorDay, sub.anchorMonth);

                await sub.update(record => {
                    record.nextBillingDate = nextBilling.toISOString();
                });

                processedCount++;
            }
        });

        if (__DEV__) console.log(`[processSubscriptions] Created ${processedCount} transactions from due subscriptions.`);
    } catch (error) {
        console.error('[processSubscriptions] Failed:', error);
    }

    return processedCount;
}
