import { Model } from '@nozbe/watermelondb';
import { text, readonly, date } from '@nozbe/watermelondb/decorators';
import type { TransactionType } from './Transaction';

export default class Category extends Model {
    static table = 'categories';

    @text('name') name!: string;
    @text('type') type!: TransactionType;
    @text('icon') icon!: string;

    @readonly @date('created_at') createdAt!: number;
    @readonly @date('updated_at') updatedAt!: number;
}
