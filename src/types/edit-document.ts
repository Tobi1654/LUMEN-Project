export interface Adjustments{
    exposure: number;
    contrast: number;
    highlights: number;
    shadows: number;
    saturation: number;
    warmth: number;
    whites: number;
    blacks: number;
    vibrance: number;
}

export interface EditDocument{
    version: number;
    photoID: string;
    adjustments: Adjustments;
    updatedAt: string;
}