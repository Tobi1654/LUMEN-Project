const DATABASE_NAME = "lumen-photo-studio";

const DATABASE_VERSION = 1;

const PROJECT_STORE = "projects";

export function openLumenDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request  = indexedDB.open(
            DATABASE_NAME,
            DATABASE_VERSION
        );

        request.onupgradeneeded = () => {
            const database = request.result;

            if (!database.objectStoreNames.contains(PROJECT_STORE)) {
                database.createObjectStore(PROJECT_STORE, {
                    keyPath: "id",
                });
            }
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}