import { openDB } from 'idb';
import { submissionApi } from '../api/submission.api';

const DB_NAME = 'yuwa_ecolympics_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_submissions';

// Initialize IndexedDB
export async function getOfflineDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'clientSubmissionId',
        });
        store.createIndex('status', 'syncStatus');
        store.createIndex('createdAt', 'createdAt');
      }
    },
  });
}

// Save an offline submission to IndexedDB
export async function saveOfflineSubmission(submissionData) {
  const db = await getOfflineDB();
  const clientSubmissionId = submissionData.clientSubmissionId || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  const record = {
    ...submissionData,
    clientSubmissionId,
    syncStatus: 'pending', // 'pending' | 'syncing' | 'synced' | 'failed'
    createdAt: new Date().toISOString(),
    error: null,
  };

  await db.put(STORE_NAME, record);
  return record;
}

// Get all offline submissions
export async function getOfflineSubmissions() {
  const db = await getOfflineDB();
  return db.getAll(STORE_NAME);
}

// Get pending offline count
export async function getPendingOfflineCount() {
  const db = await getOfflineDB();
  const all = await db.getAll(STORE_NAME);
  return all.filter((item) => item.syncStatus === 'pending' || item.syncStatus === 'failed').length;
}

// Trigger synchronization of pending offline submissions with backend /api/submissions/sync
export async function syncPendingSubmissions() {
  const db = await getOfflineDB();
  const all = await db.getAll(STORE_NAME);
  const pending = all.filter((item) => item.syncStatus === 'pending' || item.syncStatus === 'failed');

  if (pending.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  // Mark all as syncing
  for (const item of pending) {
    item.syncStatus = 'syncing';
    await db.put(STORE_NAME, item);
  }

  try {
    const payload = pending.map((sub) => ({
      clientSubmissionId: sub.clientSubmissionId,
      teamId: sub.teamId,
      challengeId: sub.challengeId,
      eventId: sub.eventId,
      title: sub.title,
      summary: sub.summary,
      quantitativeMetrics: sub.quantitativeMetrics || {},
      qualitativeData: sub.qualitativeData || {},
      submittedAt: sub.createdAt,
    }));

    const result = await submissionApi.syncOfflineSubmissions(payload);
    
    // Process backend sync response
    // Remove successfully synced items from IndexedDB
    for (const item of pending) {
      await db.delete(STORE_NAME, item.clientSubmissionId);
    }

    return { syncedCount: pending.length, failedCount: 0, result };
  } catch (err) {
    // Mark as failed
    for (const item of pending) {
      item.syncStatus = 'failed';
      item.error = err.message;
      await db.put(STORE_NAME, item);
    }
    throw err;
  }
}
