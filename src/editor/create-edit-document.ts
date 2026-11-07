import { version } from "os";
import { EditDocument } from "../types/edit-document";
import { defaultAdjustments } from "./default-adjustments";

export function createEditDocument(
    photoID: string
): EditDocument{
    return{
        version: 1,
        photoID: photoID,
        adjustments: {...defaultAdjustments},
        updatedAt: new Date().toISOString(),
    };
}