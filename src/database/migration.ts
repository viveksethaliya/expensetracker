import { database } from './index';
import { getItem, setItem, STORAGE_KEYS } from '../utils/storage';
import { DEFAULT_CATEGORIES } from '../context/ExpenseContext'; // or similar defaults
import Transaction from './models/Transaction';
import Category from './models/Category';
import TransactionTemplate from './models/TransactionTemplate';
import AutoSubscription from './models/AutoSubscription';

const MIGRATED_KEY = '@watermelondb_migrated_v1';

export async function migrateFromAsyncStorage() {
    try {
        const hasMigrated = await getItem<boolean>(MIGRATED_KEY) || false;
        if (hasMigrated) return;

        console.log('Migrating data from AsyncStorage to WatermelonDB...');

        // Fetch old data
        const oldTransactions = await getItem<any[]>(STORAGE_KEYS.TRANSACTIONS) || [];
        const oldCategories = await getItem<any[]>(STORAGE_KEYS.CATEGORIES) || DEFAULT_CATEGORIES;
        const oldTemplates = await getItem<any[]>(STORAGE_KEYS.TEMPLATES) || [];
        const oldSubscriptions = await getItem<any[]>(STORAGE_KEYS.SUBSCRIPTIONS) || [];

        // Prepare WatermelonDB batches
        const recordsToCreate: any[] = [];

        // Categories
        for (const cat of oldCategories) {
            recordsToCreate.push(
                database.collections.get<Category>('categories').prepareCreate(record => {
                    record._raw.id = cat.id; // Preserve IDs for relationships
                    record.name = cat.name;
                    record.type = cat.type;
                    record.icon = cat.icon;
                })
            );
        }

        // Transactions
        for (const t of oldTransactions) {
            recordsToCreate.push(
                database.collections.get<Transaction>('transactions').prepareCreate(record => {
                    record._raw.id = t.id;
                    record.type = t.type;
                    record.title = t.title;
                    record.amount = t.amount;
                    record.categoryId = t.categoryId;
                    record.date = t.date;
                    record.notes = t.notes || '';
                })
            );
        }

        // Templates
        for (const t of oldTemplates) {
            recordsToCreate.push(
                database.collections.get<TransactionTemplate>('templates').prepareCreate(record => {
                    record._raw.id = t.id;
                    record.type = t.type;
                    record.title = t.title;
                    record.amount = t.amount;
                    record.categoryId = t.categoryId;
                    record.notes = t.notes || '';
                })
            );
        }

        // Subscriptions
        for (const sub of oldSubscriptions) {
            recordsToCreate.push(
                database.collections.get<AutoSubscription>('subscriptions').prepareCreate(record => {
                    record._raw.id = sub.id;
                    record.type = sub.type;
                    record.title = sub.title;
                    record.amount = sub.amount;
                    record.categoryId = sub.categoryId;
                    record.interval = sub.interval;
                    record.nextBillingDate = sub.nextBillingDate;
                    record.notes = sub.notes || '';
                    record.anchorDay = sub.anchorDay || null;
                    record.anchorMonth = sub.anchorMonth || null;
                })
            );
        }

        // Execute Batch
        await database.write(async () => {
            await database.batch(...recordsToCreate);
        });

        // Mark as migrated
        await setItem(MIGRATED_KEY, true);
        console.log('Migration to WatermelonDB complete.');

    } catch (e) {
        console.error('Migration failed:', e);
    }
}
