# Security policy

## Reporting a vulnerability

Please do not open a public issue. Report the vulnerability privately with the [security advisory form](https://github.com/YoRab/react-paint-editor/security/advisories/new) of the repository, with the affected version, the steps to reproduce it and its impact.

Once a fix is released, the advisory is published with credit to the reporter, unless they prefer otherwise.

## Security model

- A drawing loaded from a source the application does not control (`loadData`, `loadFile`, the `shapes` of `useReactPaint`, a shared whiteboard) is untrusted.
- Remote pictures are fetched without the cookies nor the address of the page, and an image larger than 16384 pixels is refused. The `resolvePictureSrc` option is called with the absolute URL of each remote picture before it is fetched: return the URL to fetch, like the one of a proxy, or `null` to refuse the picture.
- The options given by the application are trusted. The `icon` of a tool is SVG markup rendered as HTML by the editor: it must never be built from what a user typed or loaded.
