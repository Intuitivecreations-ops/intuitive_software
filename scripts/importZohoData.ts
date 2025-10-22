import { readFileSync } from 'fs';
import { join } from 'path';
import { importZohoExpenses, importZohoInvoices, importZohoRecurringExpenses } from '../src/utils/zohoImport';

async function main() {
  console.log('🚀 Starting Zoho data import...\n');

  try {
    const expensesCSV = readFileSync(join(__dirname, '../src/data/Expense Details.csv'), 'utf-8');
    console.log('📊 Importing expenses...');
    const expensesResult = await importZohoExpenses(expensesCSV);
    console.log(`✅ Expenses: ${expensesResult.success} imported successfully`);
    if (expensesResult.errors.length > 0) {
      console.log(`⚠️  Expenses errors: ${expensesResult.errors.length}`);
      console.log(expensesResult.errors);
    }
  } catch (error) {
    console.error('❌ Error importing expenses:', error);
  }

  try {
    const invoicesCSV = readFileSync(join(__dirname, '../src/data/Invoice.csv'), 'utf-8');
    console.log('\n📊 Importing invoices...');
    const invoicesResult = await importZohoInvoices(invoicesCSV);
    console.log(`✅ Invoices: ${invoicesResult.success} imported successfully`);
    if (invoicesResult.errors.length > 0) {
      console.log(`⚠️  Invoice errors: ${invoicesResult.errors.length}`);
      console.log(invoicesResult.errors);
    }
  } catch (error) {
    console.error('❌ Error importing invoices:', error);
  }

  try {
    const recurringCSV = readFileSync(join(__dirname, '../src/data/Recurring_Expense.csv'), 'utf-8');
    console.log('\n📊 Importing recurring expenses...');
    const recurringResult = await importZohoRecurringExpenses(recurringCSV);
    console.log(`✅ Recurring: ${recurringResult.success} imported successfully`);
    if (recurringResult.errors.length > 0) {
      console.log(`⚠️  Recurring errors: ${recurringResult.errors.length}`);
      console.log(recurringResult.errors);
    }
  } catch (error) {
    console.error('❌ Error importing recurring expenses:', error);
  }

  console.log('\n✨ Import complete!');
  process.exit(0);
}

main();
