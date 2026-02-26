import { Model } from '@nozbe/watermelondb';
import { text, field, readonly, date } from '@nozbe/watermelondb/decorators';
import type { TransactionType } from './Transaction';

export type SubscriptionInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

export default class AutoSubscription extends Model {
    static table = 'subscriptions';

    @text('type') type!: TransactionType;
    @text('title') title!: string;
    @field('amount') amount!: number;
    @text('category_id') categoryId!: string;
    @text('interval') interval!: SubscriptionInterval;
    @text('next_billing_date') nextBillingDate!: string;
    @text('notes') notes!: string;
    @field('anchor_day') anchorDay!: number | null;
    @field('anchor_month') anchorMonth!: number | null;

    @readonly @date('created_at') createdAt!: number;
    @readonly @date('updated_at') updatedAt!: number;
}
