import { Alert } from 'react-native';
import * as DocumentPicker from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { database } from '../database';
import WatermelonTransaction from '../database/models/Transaction';
import WatermelonCategory from '../database/models/Category';
import WatermelonTransactionTemplate from '../database/models/TransactionTemplate';
import WatermelonAutoSubscription from '../database/models/AutoSubscription';
import { getItem, STORAGE_KEYS } from './storage';
import { AppSettings, AutoSubscription, Category, Transaction, TransactionTemplate } from '../context/ExpenseContext';

export interface AppBackupData {
    version: number;
    timestamp: string;
    settings: AppSettings | null;
    transactions: Omit<Transaction, 'id'>[];
    categories: Omit<Category, 'id'>[];
    templates: Omit<TransactionTemplate, 'id'>[];
    subscriptions: Omit<AutoSubscription, 'id'>[];
}

export const exportBackup = async () => {
    try {
        // 1. Gather Settings
        const settings = await getItem<AppSettings>(STORAGE_KEYS.SETTINGS);

        // 2. Gather Database Records
        const [txns, cats, tpls, subs] = await Promise.all([
            database.collections.get<WatermelonTransaction>('transactions').query().fetch(),
            database.collections.get<WatermelonCategory>('categories').query().fetch(),
            database.collections.get<WatermelonTransactionTemplate>('templates').query().fetch(),
            database.collections.get<WatermelonAutoSubscription>('subscriptions').query().fetch(),
        ]);

        // 3. Serialize Data
        const backupData: AppBackupData = {
            version: 1,
            timestamp: new Date().toISOString(),
            settings: settings,
            transactions: txns.map(t => ({
                type: t.type,
                title: t.title,
                amount: t.amount,
                categoryId: t.categoryId,
                date: t.date,
                notes: t.notes
            })),
            categories: cats.map(c => ({
                name: c.name,
                type: c.type,
                icon: c.icon
            })),
            templates: tpls.map(t => ({
                type: t.type,
                title: t.title,
                amount: t.amount,
                categoryId: t.categoryId,
                notes: t.notes
            })),
            subscriptions: subs.map(s => ({
                type: s.type,
                title: s.title,
                amount: s.amount,
                categoryId: s.categoryId,
                interval: s.interval,
                nextBillingDate: s.nextBillingDate,
                notes: s.notes,
                anchorDay: s.anchorDay,
                anchorMonth: s.anchorMonth
            }))
        };

        const jsonString = JSON.stringify(backupData, null, 2);

        // 4. Write to a temporary file
        const fileName = `ExpenseFriend_Backup_${new Date().getTime()}.json`;
        const path = `${RNFS.CachesDirectoryPath}/${fileName}`;

        await RNFS.writeFile(path, jsonString, 'utf8');

        // 5. Prompt User to Save/Share
        await Share.open({
            url: `file://${path}`,
            title: 'Export Expense Friend Backup',
            message: 'My Expense Friend App Backup',
            failOnCancel: false,
        });

    } catch (error) {
        console.error('Backup Export Error:', error);
        Alert.alert('Export Failed', 'There was an issue creating your backup file.');
    }
};

export const pickAndReadBackupFile = async (): Promise<AppBackupData | null> => {
    try {
        // 1. Pick the file
        const result = await DocumentPicker.pick({
            type: [DocumentPicker.types.json, DocumentPicker.types.allFiles],
            mode: 'open',
        });
        const file = result[0];

        // 2. Read the file
        let fileContent = '';
        if (file.uri.startsWith('content://')) {
            // Android content URI reading
            fileContent = await RNFS.readFile(file.uri, 'utf8');
        } else {
            // iOS or raw path
            const cleanUri = file.uri.replace('file://', '');
            fileContent = await RNFS.readFile(cleanUri, 'utf8');
        }

        // 3. Parse and Validate broadly
        const parsedData = JSON.parse(fileContent);
        if (!parsedData.version || !parsedData.transactions || !parsedData.categories) {
            throw new Error('Invalid backup file format');
        }

        return parsedData as AppBackupData;

    } catch (error) {
        if (DocumentPicker.isErrorWithCode(error) && error.code === DocumentPicker.errorCodes.OPERATION_CANCELED) {
            // User cancelled, not an error
            return null;
        }
        console.error('Backup Import Read Error:', error);
        Alert.alert('Import Failed', 'Could not read the backup file. Ensure it is a valid Expense Friend JSON backup.');
        return null;
    }
};
