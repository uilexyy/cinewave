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

## Validation Rules

1. Manifest must be valid JSON
2. All required fields must be present
3. `resources` must be an array of known types
4. `types` must be an array of strings
5. Unknown resource types generate warnings (not errors)
