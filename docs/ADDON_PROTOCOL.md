# Add-on Protocol

## Supported Resources

- `catalog` — Browse content catalogs
- `meta` — Content metadata
- `stream` — Stream URLs
- `subtitles` — Subtitle tracks

## Manifest Format

```json
{
  "id": "addon-id",
  "name": "Addon Name",
  "version": "1.0.0",
  "description": "Optional description",
  "logo": "https://example.com/logo.png",
  "resources": ["catalog", "meta", "stream", "subtitles"],
  "types": ["movie", "series"],
  "catalogs": [
    { "type": "movie", "id": "top", "name": "Top Movies" }
  ]
}
```

## Required Fields

- `id` (string) — unique addon identifier
- `name` (string) — display name
- `version` (string) — semver version
- `resources` (array) — supported resource types
- `types` (array) — supported content types

## Optional Fields

- `description` (string)
- `logo` (string, URL)
- `background` (string, URL)
- `catalogs` (array of { type, id, name })

## Subtitles

Subtitles are returned by the `subtitles` resource:

```json
{ "subtitles": [{ "url": "https://example.com/en.vtt", "lang": "en" }] }
```

- URL must be HTTP/HTTPS.
- Format supported by the player: WebVTT (`.vtt`). Browser support for other formats (SRT, ASS) varies and is not guaranteed; convert to VTT for reliable display.
- If subtitles are unavailable, the API returns an empty array. The player shows an "Off" option.
- Subtitle load failures are non-fatal.

Subtitle addons are discovered independently from streaming addons:

- The playback endpoint iterates enabled user add-ons that declare the `subtitles` resource.
- Content ID is derived from the requested title / episode ID (`type:id`).
- The OpenSubtitles PRO add-on is registered with resource `subtitles` and language configuration `id: `en``, `title: `id``, `default: `true``. The base manifest URL embeds this add-on configuration, so the endpoint remains compatible with the Stremio protocol.
- Subtitle responses may carry a VTT or SRT payload. SRT payloads are normalised to WebVTT (`WEBVTT` header + converted cue timestamps).
- Returned subtitle URLs are validated before playback; internal/private hosts remain blocked.

## Validation Rules

1. Manifest must be valid JSON
2. All required fields must be present
3. `resources` must be an array of known types
4. `types` must be an array of strings
5. Unknown resource types generate warnings (not errors)
