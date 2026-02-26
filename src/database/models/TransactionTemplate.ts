import { Model } from '@nozbe/watermelondb';
import { text, field, readonly, date } from '@nozbe/watermelondb/decorators';
import type { TransactionType } from './Transaction';

export default class TransactionTemplate extends Model {
    static table = 'templates';

    @text('type') type!: TransactionType;
    @text('title') title!: string;
    @field('amount') amount!: number;
    @text('category_id') categoryId!: string;
    @text('notes') notes!: string;

    @readonly @date('created_at') createdAt!: number;
    @readonly @date('updated_at') updatedAt!: number;
}
