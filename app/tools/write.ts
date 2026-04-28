import { promises as fs } from "fs";

/**
 * Write content to a file.
 * @param file_path - The path of the file to write to.
 * @param content - The content to write.
 */
export async function Write(file_path: string, content: string): Promise<void> {
  await fs.writeFile(file_path, content, "utf8");
}
