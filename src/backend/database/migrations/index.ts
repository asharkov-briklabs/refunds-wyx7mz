import * as initialMigration from './scripts/20230501_initial';
import addRefundIndices from './scripts/20230515_add_refund_indices';
import { getDb } from '../connection';
import { logger } from '../../common/utils/logger';
import mongoose from 'mongoose';  // mongoose ^6.0.0

/**
 * Interface defining the structure of a migration object
 */
export interface Migration {
  version: string;
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

/**
 * Interface defining an applied migration record as stored in the database
 */
interface AppliedMigration {
  version: string;
  name: string;
  appliedAt: Date;
}

/**
 * Interface defining the status of a migration
 */
export interface MigrationStatus {
  version: string;
  name: string;
  applied: boolean;
  appliedAt?: Date;
}

// Collection name for storing migration metadata
const MIGRATION_COLLECTION = '_migrations';

// Array of all available migrations in order
export const MIGRATIONS: Migration[] = [
  { 
    version: '20230501', 
    name: 'initial', 
    up: initialMigration.up, 
    down: initialMigration.down 
  },
  { 
    version: '20230515', 
    name: 'add_refund_indices', 
    up: addRefundIndices.up, 
    down: addRefundIndices.down 
  }
];

/**
 * Creates the migrations collection if it doesn't exist
 */
export async function createMigrationsCollection(): Promise<void> {
  const db = await getDb();
  const collections = await db.listCollections({ name: MIGRATION_COLLECTION }).toArray();
  
  if (collections.length === 0) {
    logger.info(`Creating ${MIGRATION_COLLECTION} collection`);
    await db.createCollection(MIGRATION_COLLECTION);
    await db.collection(MIGRATION_COLLECTION).createIndex({ version: 1 }, { unique: true });
    logger.info(`Successfully created ${MIGRATION_COLLECTION} collection with index`);
  }
}

/**
 * Gets a list of migrations that have already been applied
 */
export async function getAppliedMigrations(): Promise<AppliedMigration[]> {
  const db = await getDb();
  return db.collection(MIGRATION_COLLECTION)
    .find({})
    .sort({ appliedAt: 1 })
    .toArray() as Promise<AppliedMigration[]>;
}

/**
 * Runs all migrations in sequence that haven't been applied yet
 */
export async function runMigrations(): Promise<void> {
  logger.info('Starting database migrations process');
  
  // Create migrations collection if it doesn't exist
  await createMigrationsCollection();
  
  // Get list of applied migrations
  const appliedMigrations = await getAppliedMigrations();
  const appliedVersions = appliedMigrations.map(m => m.version);
  
  // Find pending migrations
  const pendingMigrations = MIGRATIONS.filter(m => !appliedVersions.includes(m.version));
  
  if (pendingMigrations.length === 0) {
    logger.info('No pending migrations found. Database is up to date.');
    return;
  }
  
  logger.info(`Found ${pendingMigrations.length} pending migration(s) to apply`);
  
  // Run each pending migration
  const db = await getDb();
  for (const migration of pendingMigrations) {
    try {
      logger.info(`Running migration: ${migration.version} - ${migration.name}`);
      await migration.up();
      
      // Record successful migration
      await db.collection(MIGRATION_COLLECTION).insertOne({
        version: migration.version,
        name: migration.name,
        appliedAt: new Date()
      });
      
      logger.info(`Successfully applied migration: ${migration.version} - ${migration.name}`);
    } catch (error) {
      logger.error(`Failed to apply migration: ${migration.version} - ${migration.name}`, { error });
      throw error;
    }
  }
  
  logger.info('Database migrations completed successfully');
}

/**
 * Runs only the most recent migration if it hasn't been applied yet
 */
export async function runLatestMigration(): Promise<void> {
  logger.info('Running latest database migration only');
  
  // Create migrations collection if it doesn't exist
  await createMigrationsCollection();
  
  // Get list of applied migrations
  const appliedMigrations = await getAppliedMigrations();
  const appliedVersions = appliedMigrations.map(m => m.version);
  
  // Get the latest migration
  const latestMigration = MIGRATIONS[MIGRATIONS.length - 1];
  
  // Check if latest migration has already been applied
  if (appliedVersions.includes(latestMigration.version)) {
    logger.info(`Latest migration ${latestMigration.version} - ${latestMigration.name} already applied`);
    return;
  }
  
  // Run the latest migration
  const db = await getDb();
  try {
    logger.info(`Running latest migration: ${latestMigration.version} - ${latestMigration.name}`);
    await latestMigration.up();
    
    // Record successful migration
    await db.collection(MIGRATION_COLLECTION).insertOne({
      version: latestMigration.version,
      name: latestMigration.name,
      appliedAt: new Date()
    });
    
    logger.info(`Successfully applied latest migration: ${latestMigration.version} - ${latestMigration.name}`);
  } catch (error) {
    logger.error(`Failed to apply latest migration: ${latestMigration.version} - ${latestMigration.name}`, { error });
    throw error;
  }
}

/**
 * Runs a specific migration by its version name
 */
export async function runMigrationByName(version: string): Promise<void> {
  logger.info(`Running specific migration: ${version}`);
  
  // Create migrations collection if it doesn't exist
  await createMigrationsCollection();
  
  // Find the requested migration
  const migration = MIGRATIONS.find(m => m.version === version);
  if (!migration) {
    const errorMsg = `Migration ${version} not found`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  // Check if migration has already been applied
  const db = await getDb();
  const existingMigration = await db.collection(MIGRATION_COLLECTION).findOne({ version });
  
  if (existingMigration) {
    logger.info(`Migration ${version} - ${migration.name} already applied on ${new Date(existingMigration.appliedAt).toISOString()}`);
    return;
  }
  
  // Run the migration
  try {
    logger.info(`Running migration: ${version} - ${migration.name}`);
    await migration.up();
    
    // Record successful migration
    await db.collection(MIGRATION_COLLECTION).insertOne({
      version: migration.version,
      name: migration.name,
      appliedAt: new Date()
    });
    
    logger.info(`Successfully applied migration: ${version} - ${migration.name}`);
  } catch (error) {
    logger.error(`Failed to apply migration: ${version} - ${migration.name}`, { error });
    throw error;
  }
}

/**
 * Rolls back the most recently applied migration
 */
export async function rollbackMigration(): Promise<void> {
  logger.info('Rolling back most recent migration');
  
  // Get list of applied migrations
  const appliedMigrations = await getAppliedMigrations();
  
  if (appliedMigrations.length === 0) {
    logger.info('No migrations to roll back');
    return;
  }
  
  // Get the most recently applied migration
  const lastAppliedMigration = appliedMigrations[appliedMigrations.length - 1];
  
  // Find the migration in our list
  const migration = MIGRATIONS.find(m => m.version === lastAppliedMigration.version);
  
  if (!migration) {
    const errorMsg = `Cannot find migration definition for version ${lastAppliedMigration.version}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  // Roll back the migration
  const db = await getDb();
  try {
    logger.info(`Rolling back migration: ${migration.version} - ${migration.name}`);
    await migration.down();
    
    // Remove the migration record
    await db.collection(MIGRATION_COLLECTION).deleteOne({ version: migration.version });
    
    logger.info(`Successfully rolled back migration: ${migration.version} - ${migration.name}`);
  } catch (error) {
    logger.error(`Failed to roll back migration: ${migration.version} - ${migration.name}`, { error });
    throw error;
  }
}

/**
 * Rolls back a specific migration by its version name
 */
export async function rollbackMigrationByName(version: string): Promise<void> {
  logger.info(`Rolling back specific migration: ${version}`);
  
  // Get list of applied migrations
  const appliedMigrations = await getAppliedMigrations();
  const isApplied = appliedMigrations.some(m => m.version === version);
  
  if (!isApplied) {
    const errorMsg = `Migration ${version} is not applied, cannot roll back`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  // Find the migration in our list
  const migration = MIGRATIONS.find(m => m.version === version);
  
  if (!migration) {
    const errorMsg = `Cannot find migration definition for version ${version}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  // Roll back the migration
  const db = await getDb();
  try {
    logger.info(`Rolling back migration: ${version} - ${migration.name}`);
    await migration.down();
    
    // Remove the migration record
    await db.collection(MIGRATION_COLLECTION).deleteOne({ version });
    
    logger.info(`Successfully rolled back migration: ${version} - ${migration.name}`);
  } catch (error) {
    logger.error(`Failed to roll back migration: ${version} - ${migration.name}`, { error });
    throw error;
  }
}

/**
 * Gets the status of all migrations showing which have been applied
 */
export async function getMigrationStatus(): Promise<MigrationStatus[]> {
  // Create migrations collection if it doesn't exist
  await createMigrationsCollection();
  
  // Get list of applied migrations
  const appliedMigrations = await getAppliedMigrations();
  const appliedVersionsMap = new Map<string, Date>();
  
  appliedMigrations.forEach(m => {
    appliedVersionsMap.set(m.version, m.appliedAt);
  });
  
  // Build status for all migrations
  return MIGRATIONS.map(migration => ({
    version: migration.version,
    name: migration.name,
    applied: appliedVersionsMap.has(migration.version),
    appliedAt: appliedVersionsMap.get(migration.version)
  }));
}