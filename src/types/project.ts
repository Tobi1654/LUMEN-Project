import type { EditDocument } from "./edit-document";
import type { Snapshot } from "../editor/snapshots";

export interface Project {
    id: string;
    fileName: string;
    image: Blob;
    thumbnail: Blob;
    editDocument: EditDocument;
    snapshots: Snapshot[];
    updatedAt: string;
}