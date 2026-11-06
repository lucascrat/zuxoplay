import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { TrailerItem, ClientApp, ProgramItem, UserProfile, SystemLog } from '../types';
import { 
  INITIAL_CLIENTS, 
  INITIAL_TRAILERS, 
  INITIAL_APPS, 
  INITIAL_PROGRAM_GUIDE,
  INITIAL_SYSTEM_LOGS 
} from '../data/appData';

// --- SEED INITIAL DATA IF COLLECTIONS ARE EMPTY ---
export async function seedInitialFirestoreData() {
  try {
    // 1. Clients (Ensure real clients and official apps are always up to date)
    const clientsSnap = await getDocs(collection(db, 'clients'));
    if (clientsSnap.empty) {
      for (const client of INITIAL_CLIENTS) {
        await setDoc(doc(db, 'clients', client.id), client);
      }
    } else {
      // Sync real active clients with current expiration dates
      for (const client of INITIAL_CLIENTS) {
        await setDoc(doc(db, 'clients', client.id), client, { merge: true });
      }
    }

    // System Logs
    const logsSnap = await getDocs(collection(db, 'system_logs'));
    if (logsSnap.empty) {
      for (const log of INITIAL_SYSTEM_LOGS) {
        await setDoc(doc(db, 'system_logs', log.id), log);
      }
    }

    // 2. Trailers — upsert current list; remove old default IDs no longer in INITIAL_TRAILERS.
    // Admin-added trailers (not listed here) are intentionally preserved.
    const DEPRECATED_TRAILER_IDS = [
      'tr-avatar2', 'tr-strangerthings5', 'tr-houseofdragon',
      'tr-shogun', 'tr-johnwick4', 'tr-avengers-endgame',
      'tr-matrix', 'tr-interstellar', 'tr-multiverse',
    ];
    await Promise.all(DEPRECATED_TRAILER_IDS.map((id) =>
      deleteDoc(doc(db, 'trailers', id)).catch(() => {})
    ));
    for (const trailer of INITIAL_TRAILERS) {
      await setDoc(doc(db, 'trailers', trailer.id), trailer, { merge: true });
    }

    // 3. Apps - Official store catalog always fresh
    for (const app of INITIAL_APPS) {
      await setDoc(doc(db, 'apps', app.id), app, { merge: true });
    }

    // 4. Programs
    const progsSnap = await getDocs(collection(db, 'programs'));
    if (progsSnap.empty) {
      for (const prog of INITIAL_PROGRAM_GUIDE) {
        await setDoc(doc(db, 'programs', prog.id), prog);
      }
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
