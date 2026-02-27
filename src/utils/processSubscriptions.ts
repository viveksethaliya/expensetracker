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

        const transactionsCollection = database.collections.get<Transaction>('transactions');
        const batchOperations: any[] = [];

        for (const sub of allSubs) {
            let currentBilling = new Date(sub.nextBillingDate);
            let subUpdated = false;

            // Catch-up loop: generate a transaction for every missed interval
            while (currentBilling.getTime() <= now.getTime()) {
                // 1. Prepare to create the transaction
                batchOperations.push(
                    transactionsCollection.prepareCreate(record => {
                        record.type = sub.type;
                        record.title = sub.title;
                        record.amount = sub.amount;
                        record.categoryId = sub.categoryId;
                        // Use the historical billing date for the transaction, not 'now'
                        record.date = currentBilling.toISOString();
                        record.notes = sub.notes ? `[Auto] ${sub.notes}` : '[Auto-Subscription]';
                    })
                );

                // 2. Advance the billing date for the next iteration
                currentBilling = advanceDate(currentBilling, sub.interval, sub.anchorDay, sub.anchorMonth);
                subUpdated = true;
                processedCount++;

                // Safety valve: prevent infinite loops in case of corrupt old dates
                if (processedCount > 500) break;
            }

            // 3. Prepare to update the subscription's nextBillingDate if it advanced
            if (subUpdated) {
                batchOperations.push(
                    sub.prepareUpdate(record => {
                        record.nextBillingDate = currentBilling.toISOString();
                    })
                );
            }
        }

        // Execute all collected operations in a single fast batch
        if (batchOperations.length > 0) {
            await database.write(async () => {
                await database.batch(...batchOperations);
            });
        }

        if (__DEV__ && processedCount > 0) {
            console.log(`[processSubscriptions] Created ${processedCount} transactions from due subscriptions.`);
        }
    } catch (error) {
        console.error('[processSubscriptions] Failed:', error);
    }

    return processedCount;
}
