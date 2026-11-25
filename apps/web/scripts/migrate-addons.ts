import { prisma } from "../lib/db";
import { encryptUrl, decryptUrl, isGcmFormat } from "../lib/addon-crypto";

async function migrate() {
  const addons = await prisma.userAddon.findMany();
  let count = 0;

  for (const addon of addons) {
    if (isGcmFormat(addon.manifestUrlEncrypted)) continue;

    try {
      const url = decryptUrl(addon.manifestUrlEncrypted);
      const encrypted = encryptUrl(url);
      
      await prisma.userAddon.update({
        where: { id: addon.id },
        data: { manifestUrlEncrypted: encrypted },
      });
      
      count++;
    } catch (err) {
      console.error(`Failed to migrate addon ${addon.id}:`, err);
    }
  }

  console.log(`Migrated ${count} add-ons to GCM format.`);
}

migrate().catch(console.error).finally(() => prisma.$disconnect());
