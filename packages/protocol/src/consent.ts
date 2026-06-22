import { z } from "zod";
import { DataClassSchema } from "./enums.js";



// ConsentProfile: partial record of DataClass → boolean
// Empty object {} is valid; non-boolean values for recognized keys are rejected
export const ConsentProfileSchema = z.record(DataClassSchema, z.boolean());

export type ConsentProfile = z.infer<typeof ConsentProfileSchema>;
