import type { Request, Response } from "express";
import { getSchemaMetadata } from "../db/schema.js";

export async function schemaHandler(_req: Request, res: Response): Promise<void> {
  try {
    const schema = await getSchemaMetadata();
    res.json(schema);
  } catch (error) {
    console.error("Failed to fetch schema metadata", error);
    res.status(500).json({ message: "Unable to load schema metadata" });
  }
}

