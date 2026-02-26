import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import schema from './schema';
import Transaction from './models/Transaction';
import Category from './models/Category';
import TransactionTemplate from './models/TransactionTemplate';
import AutoSubscription from './models/AutoSubscription';

const adapter = new SQLiteAdapter({
    schema,
    // (You might want to pass an migrations object if you add one later)
    // migrations,
    jsi: false, /* Set to false to ensure stable Android build without NDK hassle */
    onSetUpError: (error) => {
        console.error('Database failed to load', error);
    },
});

export const database = new Database({
    adapter,
    modelClasses: [
        Transaction,
        Category,
        TransactionTemplate,
        AutoSubscription,
    ],
});
