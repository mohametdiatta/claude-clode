import { promises as fs } from "fs";

/**
 * Read and return the contents of a file.
 * @param file_path - The path to the file to read.
 * @returns The file content as a string.
 */
export async function Read(file_path: string): Promise<string> {
  return await fs.readFile(file_path, "utf8");
}
