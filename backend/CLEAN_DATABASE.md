# Database Cleaning Script

This script allows you to completely clear all data from your MongoDB database collections while keeping the collections themselves intact.

## Usage

### Safe Mode (Preview)
To see what will be deleted without actually deleting:
```bash
npm run clean-db
```

This will show you all collections and their document counts, but won't delete anything.

### Force Mode (Actual Deletion)
To actually clean the database:
```bash
npm run clean-db:force
```

Or directly:
```bash
node src/scripts/cleanDatabase.js --force
```

## What Gets Deleted

The script will clear ALL documents from all collections in your database, including:
- Users
- Products
- Inventory
- Orders
- Reviews
- Promotions
- AuditLogs
- Any other collections

**Note:** The collections themselves remain intact, only the data inside them is removed.

## ⚠️ Warning

**This action is IRREVERSIBLE!** All data will be permanently deleted. Make sure you have backups if needed.

## Use Cases

- Resetting development environment
- Clearing test data
- Starting fresh with a clean database
- Preparing for new data imports

## Safety Features

- Requires `--force` flag to actually delete data
- Shows preview of what will be deleted
- Displays collection names and document counts
- Confirms successful deletion
- Keeps collection structure intact

## Environment Requirements

Make sure your `.env` file has the correct `MONGODB_URI` configured.
