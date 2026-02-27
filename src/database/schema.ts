import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
    version: 1,
    tables: [
        tableSchema({
            name: 'transactions',
            columns: [
                { name: 'type', type: 'string', isIndexed: true },
                { name: 'title', type: 'string' },
                { name: 'amount', type: 'number' },
                { name: 'category_id', type: 'string', isIndexed: true },
                { name: 'date', type: 'string', isIndexed: true }, // ISO-8601 string
                { name: 'notes', type: 'string', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'categories',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'type', type: 'string', isIndexed: true }, // 'income' or 'expense'
                { name: 'icon', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'templates',
            columns: [
                { name: 'type', type: 'string' },
                { name: 'title', type: 'string' },
                { name: 'amount', type: 'number' },
                { name: 'category_id', type: 'string', isIndexed: true },
                { name: 'notes', type: 'string', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'subscriptions',
            columns: [
                { name: 'type', type: 'string' },
                { name: 'title', type: 'string' },
                { name: 'amount', type: 'number' },
                { name: 'category_id', type: 'string', isIndexed: true },
                { name: 'interval', type: 'string' },
                { name: 'next_billing_date', type: 'string' }, // ISO-8601 string
                { name: 'notes', type: 'string', isOptional: true },
                { name: 'anchor_day', type: 'number', isOptional: true },
                { name: 'anchor_month', type: 'number', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
    ],
});
