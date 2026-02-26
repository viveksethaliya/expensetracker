import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export type TransactionType = 'income' | 'expense';

export default class Transaction extends Model {
    static table = 'transactions';

    @text('type') type!: TransactionType;
    @text('title') title!: string;
    @field('amount') amount!: number;
    @text('category_id') categoryId!: string;
    @text('date') date!: string;
    @text('notes') notes!: string;

    @readonly @date('created_at') createdAt!: number;
    @readonly @date('updated_at') updatedAt!: number;
}
