import { rm, readdir } from "node:fs/promises";
import { join } from "node:path";

const standaloneDir = join(process.cwd(), ".next", "standalone");

async function removeEnvFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return;
    }
    throw error;
  }

  await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await removeEnvFiles(path);
        return;
      }

      if (entry.isFile() && (entry.name === ".env" || entry.name.startsWith(".env."))) {
        await rm(path, { force: true });
      }
    })
  );
}

await removeEnvFiles(standaloneDir);
