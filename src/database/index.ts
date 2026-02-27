import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import schema from './schema';
import migrations from './migrations';
import Transaction from './models/Transaction';
import Category from './models/Category';
import TransactionTemplate from './models/TransactionTemplate';
import AutoSubscription from './models/AutoSubscription';

const adapter = new SQLiteAdapter({
    schema,
    migrations,
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
