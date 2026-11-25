# Player Stream Security

## Direct playback policy

- Web player receives the stream URL from the playback API.
- Client validates the initial URL: must parse as URL, protocol must be `http:` or `https:`.
- Subtitle URLs are validated the same way (HTTP/HTTPS only); subtitle tracks are optional and failures are non-fatal.
- MP4 uses a direct `<video>` source. No `crossOrigin` attribute on MP4 because many sample MP4 hosts do not send CORS headers; native playback does not need CORS.
- HLS uses native support when available; otherwise `hls.js` loads the manifest and segments via dynamic import. HLS playback sets `crossOrigin="anonymous"` because `hls.js` needs readable segment responses.

## Redirects

Browsers follow HTTP redirects automatically. Client-side protocol validation only covers the first URL; it does **not** validate intermediate or final redirect targets.

Server-side SSRF protection (`lib/ssrf-guard.ts` / `safeFetch`) applies to addon discovery requests made by the server. It does **not** apply to browser media requests.

## Proxy evaluation

A server-side streaming proxy would allow validating every redirect, but it must:

- forward `Range` requests for MP4 seeking,
- rewrite HLS playlists and serve segments without loading whole videos into memory,
- relay subtitle files with correct CORS headers.

Given these requirements, direct playback with strict initial URL policy is used. Risk: a compromised addon can return a URL that redirects to an internal address reachable from the user's browser. Mitigate by only installing trusted addons; a validated streaming proxy can be added later if this threat model is unacceptable.

## Sensitive data

Stream and subtitle URLs are never written to logs by client code.
