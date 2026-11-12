import type { EditDocument } from "../types/edit-document";

export interface Snapshot {
    id: string;
    name: string;
    createdAt: string;
    document: EditDocument;
}

export function createSnapshot(
    document: EditDocument,
    name: string
): Snapshot {
    return{
        id: crypto.randomUUID(),
        name: name,
        createdAt: new Date().toISOString(),
        document: structuredClone(document),
    };
}