import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  getDocsFromServer,
  query,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { isManualProgram } from './epgService';
import { TrailerItem, ClientApp, ProgramItem, UserProfile, SystemLog } from '../types';
import { 
  INITIAL_CLIENTS, 
  INITIAL_TRAILERS, 
  INITIAL_APPS, 
  INITIAL_SYSTEM_LOGS 
} from '../data/appData';

// --- SEED INITIAL DATA IF COLLECTIONS ARE EMPTY ---
// The existence checks use getDocsFromServer on purpose: with no connection plain getDocs answers from an
// empty local cache, which would make this seed write the sample data over real clients once back online.
export async function seedInitialFirestoreData() {
  try {
    // 1. Clients — only create the sample clients that are missing. Existing docs are never
    // overwritten, so access data, due dates and prices edited in the admin panel are kept.
    const clientsSnap = await getDocsFromServer(collection(db, 'clients'));
    const existingClientIds = new Set(clientsSnap.docs.map((d) => d.id));
    await Promise.all(
      INITIAL_CLIENTS.filter((c) => !existingClientIds.has(c.id)).map((c) =>
        setDoc(doc(db, 'clients', c.id), c)
      )
    );

    // System Logs
    const logsSnap = await getDocsFromServer(collection(db, 'system_logs'));
    if (logsSnap.empty) {
      for (const log of INITIAL_SYSTEM_LOGS) {
        await setDoc(doc(db, 'system_logs', log.id), log);
      }
    }

    // 2. Trailers — add catalog entries that are missing and remove retired default IDs.
    // Existing docs are left untouched so likes and admin edits survive; admin-added trailers are preserved.
    const DEPRECATED_TRAILER_IDS = [
      'tr-avatar2', 'tr-strangerthings5', 'tr-houseofdragon',
      'tr-shogun', 'tr-johnwick4', 'tr-avengers-endgame',
      'tr-matrix', 'tr-interstellar', 'tr-multiverse',
      'tr-superman-2025', 'tr-mi-final-reckoning', 'tr-jurassic-rebirth',
      'tr-fantastic-four', 'tr-thunderbolts', 'tr-gladiator2',
      'tr-tulsa-king-s2', 'tr-severance-s2', 'tr-white-lotus-s3',
      'tr-lastofus-s2', 'tr-houseofdragon-s2', 'tr-deadpool3', 'tr-dune2',
    ];
    const trailersSnap = await getDocsFromServer(collection(db, 'trailers'));
    const existingTrailerIds = new Set(trailersSnap.docs.map((d) => d.id));
    await Promise.all(
      DEPRECATED_TRAILER_IDS.filter((id) => existingTrailerIds.has(id)).map((id) =>
        deleteDoc(doc(db, 'trailers', id)).catch(() => {})
      )
    );
    await Promise.all(
      INITIAL_TRAILERS.filter((t) => !existingTrailerIds.has(t.id)).map((t) =>
        setDoc(doc(db, 'trailers', t.id), t)
      )
    );

    // 3. Apps - Official store catalog always fresh
    for (const app of INITIAL_APPS) {
      await setDoc(doc(db, 'apps', app.id), app, { merge: true });
    }

  } catch (err) {
    console.warn('Initial seed skipped or completed:', err);
  }
}

// --- CLIENTS REAL-TIME CRUD ---
export function subscribeClients(
  onData: (clients: UserProfile[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, 'clients');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        // Fallback or empty
        onData([]);
        return;
      }
      const list: UserProfile[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as UserProfile);
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, 'clients');
    }
  );
}

// Follows one client's own record, so the client site never needs the whole client list.
export function subscribeClientById(id: string, onData: (client: UserProfile) => void) {
  return onSnapshot(
    doc(db, 'clients', id),
    (snap) => {
      if (snap.exists()) onData({ ...snap.data(), id: snap.id } as UserProfile);
    },
    (error) => console.warn('[clients] não foi possível acompanhar o cadastro:', error.message)
  );
}

export async function saveClientToFirestore(client: UserProfile): Promise<void> {
  const path = `clients/${client.id}`;
  try {
    await setDoc(doc(db, 'clients', client.id), client);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteClientFromFirestore(id: string): Promise<void> {
  const path = `clients/${id}`;
  try {
    await deleteDoc(doc(db, 'clients', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- TRAILERS REAL-TIME CRUD ---
export function subscribeTrailers(
  onData: (trailers: TrailerItem[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, 'trailers');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onData([]);
        return;
      }
      const list: TrailerItem[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as TrailerItem);
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, 'trailers');
    }
  );
}

export async function saveTrailerToFirestore(trailer: TrailerItem): Promise<void> {
  const path = `trailers/${trailer.id}`;
  try {
    await setDoc(doc(db, 'trailers', trailer.id), trailer);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTrailerFromFirestore(id: string): Promise<void> {
  const path = `trailers/${id}`;
  try {
    await deleteDoc(doc(db, 'trailers', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- APPS REAL-TIME CRUD ---
export function subscribeApps(
  onData: (apps: ClientApp[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, 'apps');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onData([]);
        return;
      }
      const list: ClientApp[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as ClientApp);
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, 'apps');
    }
  );
}

export async function saveAppToFirestore(app: ClientApp): Promise<void> {
  const path = `apps/${app.id}`;
  try {
    await setDoc(doc(db, 'apps', app.id), app);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAppFromFirestore(id: string): Promise<void> {
  const path = `apps/${id}`;
  try {
    await deleteDoc(doc(db, 'apps', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- PROGRAMS REAL-TIME CRUD ---
export function subscribePrograms(
  onData: (programs: ProgramItem[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, 'programs');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onData([]);
        return;
      }
      const list: ProgramItem[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as ProgramItem);
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, 'programs');
    }
  );
}

// Events the admin added by hand for one day (the real TV schedule comes from the server).
export async function fetchManualPrograms(date: string): Promise<ProgramItem[]> {
  try {
    const snap = await getDocs(query(collection(db, 'programs'), where('date', '==', date)));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as ProgramItem)).filter(isManualProgram);
  } catch (err) {
    console.warn('[Grade] Não foi possível ler os eventos extras:', err);
    return [];
  }
}

export async function saveProgramToFirestore(prog: ProgramItem): Promise<void> {
  const path = `programs/${prog.id}`;
  try {
    await setDoc(doc(db, 'programs', prog.id), prog);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProgramFromFirestore(id: string): Promise<void> {
  const path = `programs/${id}`;
  try {
    await deleteDoc(doc(db, 'programs', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- SYSTEM LOGS REAL-TIME CRUD ---
export function subscribeSystemLogs(
  onData: (logs: SystemLog[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, 'system_logs');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onData([]);
        return;
      }
      const list: SystemLog[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as SystemLog);
      });
      // Sort newest first by timestamp
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, 'system_logs');
    }
  );
}

export async function saveSystemLogToFirestore(log: SystemLog): Promise<void> {
  const path = `system_logs/${log.id}`;
  try {
    await setDoc(doc(db, 'system_logs', log.id), log);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSystemLogFromFirestore(id: string): Promise<void> {
  const path = `system_logs/${id}`;
  try {
    await deleteDoc(doc(db, 'system_logs', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
