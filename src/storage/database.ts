import type { Project } from "../types/project";
import type { Collection } from "../types/collection";

const DATABASE_NAME = "lumen-photo-studio";

const DATABASE_VERSION = 3;

const PROJECT_STORE = "projects";
const COLLECTION_STORE = "collections";

export function openLumenDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request  = indexedDB.open(
            DATABASE_NAME,
            DATABASE_VERSION
        );

        request.onupgradeneeded = () => {
            const database = request.result;
            console.log("LUMEN Database upgrading to version:", database.version);

            if (!database.objectStoreNames.contains(PROJECT_STORE)) {
                database.createObjectStore(PROJECT_STORE, {
                    keyPath: "id",
                });
            }

            if (!database.objectStoreNames.contains(COLLECTION_STORE)) {
                database.createObjectStore(COLLECTION_STORE, {
                    keyPath: "id",
                });
            }
        };

        request.onsuccess = () => {
            const database = request.result;

            database.onversionchange = () => {
                database.close();
                console.log("LUMEN database connection closed for upgrade.");
            };

            resolve(database);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function saveProject(
    project: Project
    ): Promise<void> {
    const database = await openLumenDatabase();

    return new Promise((resolve, reject) => {
    const transaction = database.transaction(
        PROJECT_STORE,
        "readwrite"
        );

    const store = transaction.objectStore(PROJECT_STORE);

    store.put(project);

    transaction.oncomplete = () => {
        database.close();
        resolve();
        };

    transaction.onerror = () => {
        database.close();
        reject(transaction.error);
        };

    transaction.onabort = () => {
        database.close();
        reject(transaction.error);
        };
    });
}

export async function getProject(
    id: string
    ): Promise<Project | undefined> {
    const database = await openLumenDatabase();

    return new Promise((resolve, reject) => {
    const transaction = database.transaction(
        PROJECT_STORE,
        "readonly"
        );

    const store = transaction.objectStore(PROJECT_STORE);

    const request = store.get(id);

    request.onsuccess = () => {
        database.close();
        resolve(request.result as Project | undefined);
        };

    request.onerror = () => {
        database.close();
        reject(request.error);
        };
    });
}

export async function getAllProjects(): Promise<Project[]> {
    const database = await openLumenDatabase();

    return new Promise((resolve, reject) => {
    const transaction = database.transaction(
        PROJECT_STORE,
        "readonly"
        );

    const store = transaction.objectStore(PROJECT_STORE);

    const request = store.getAll();

    request.onsuccess = () => {
        database.close();
        resolve(request.result as Project[]);
        };

    request.onerror = () => {
        database.close();
        reject(request.error);
        };
    });
}

export async function deleteProject(id: string): Promise<void> {
    const db = await openLumenDatabase();

    return new Promise((resolve, reject) => {
    const transaction = db.transaction("projects", "readwrite");
    const store = transaction.objectStore("projects");

    store.delete(id);

    transaction.oncomplete = () => {
        resolve();
        };

    transaction.onerror = () => {
        reject(transaction.error);
        };

    transaction.onabort = () => {
        reject(transaction.error);
        };
    });
}

export async function deleteCollection(id: string): Promise<void> {
    const database = await openLumenDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(
        COLLECTION_STORE,
        "readwrite"
        );

        transaction.objectStore(COLLECTION_STORE).delete(id);

        transaction.oncomplete = () => {
        database.close();
        resolve();
        };

        transaction.onerror = () => {
        database.close();
        reject(transaction.error);
        };

        transaction.onabort = () => {
        database.close();
        reject(transaction.error);
        };
    });
}

export async function saveCollection(
    collection: Collection
    ): Promise<void> {
    const database = await openLumenDatabase();

    return new Promise((resolve, reject) => {
    const transaction = database.transaction(
        COLLECTION_STORE,
        "readwrite"
        );

    transaction.objectStore(COLLECTION_STORE).put(collection);

    transaction.oncomplete = () => {
        database.close();
        resolve();
    };  

transaction.onerror = () => {
        database.close();
        reject(transaction.error);
    };

transaction.onabort = () => {
        database.close();
        reject(transaction.error);
    };
    });
}

export async function getAllCollections(): Promise<Collection[]> {
    const database = await openLumenDatabase();

    return new Promise((resolve, reject) => {
    const transaction = database.transaction(
        COLLECTION_STORE,
        "readonly"
        );

    const request = transaction
        .objectStore(COLLECTION_STORE)
        .getAll();

    request.onsuccess = () => {
        database.close();
        resolve(request.result as Collection[]);
    };

    request.onerror = () => {
        database.close();
        reject(request.error);
    };
    });
}