import { safeFetch, isBlockedHost } from "./ssrf-guard";
import { encryptUrl, decryptUrl } from "./addon-crypto";

export { encryptUrl, decryptUrl };

export interface AddonManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  logo?: string;
  background?: string;
  resources?: Array<string | { name: string; types?: string[]; idPrefixes?: string[] }>;
  types?: string[];
  catalogs?: { type: string; id: string; name?: string }[];
}

export interface AddonValidationResult {
  valid: boolean;
  manifest?: AddonManifest;
  errors: string[];
  warnings: string[];
}

const REQUIRED_MANIFEST_FIELDS = ["id", "name", "version"];

export function validateManifest(raw: unknown): AddonValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let manifest: AddonManifest | undefined;

  if (typeof raw !== "object" || raw === null) {
    return { valid: false, errors: ["Manifest must be a JSON object"], warnings };
  }

  const obj = raw as Record<string, unknown>;

  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (!(field in obj)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (typeof obj.id !== "string" || !obj.id) errors.push("id must be a non-empty string");
  if (typeof obj.name !== "string" || !obj.name) errors.push("name must be a non-empty string");
  if (typeof obj.version !== "string") errors.push("version must be a string");
  if (obj.resources && !Array.isArray(obj.resources)) errors.push("resources must be an array");
  if (obj.types && !Array.isArray(obj.types)) errors.push("types must be an array");

  if (errors.length === 0 && obj.resources) {
    manifest = {
      id: obj.id as string,
      name: obj.name as string,
      version: obj.version as string,
      description: typeof obj.description === "string" ? obj.description : undefined,
      logo: typeof obj.logo === "string" ? obj.logo : undefined,
      background: typeof obj.background === "string" ? obj.background : undefined,
      resources: obj.resources as AddonManifest["resources"],
      types: obj.types as string[],
      catalogs: Array.isArray(obj.catalogs) ? (obj.catalogs as AddonManifest["catalogs"]) : undefined,
    };

    const validResources = ["catalog", "meta", "stream", "subtitles"];
    for (const r of manifest.resources ?? []) {
      const name = typeof r === "string" ? r : r.name;
      if (!validResources.includes(name)) {
        warnings.push(`Unknown resource type: ${name}`);
      }
    }
  }

  return { valid: errors.length === 0, manifest, errors, warnings };
}

export async function fetchManifest(manifestUrl: string): Promise<AddonValidationResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(manifestUrl);
  } catch {
    return { valid: false, errors: ["Invalid URL"], warnings: [] };
  }

  if (isBlockedHost(parsedUrl.hostname)) {
    return { valid: false, errors: ["Blocked host"], warnings: [] };
  }

  const result = await safeFetch(manifestUrl);
  if (!result.ok) {
    return { valid: false, errors: [result.error || `HTTP ${result.status}`], warnings: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.body);
  } catch {
    return { valid: false, errors: ["Invalid JSON response"], warnings: [] };
  }

  return validateManifest(parsed);
}
