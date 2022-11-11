# Obsidian S3

An [Obsidian](https://obsidian.md/) plugin for storage and retrieval of media attachments on S3 compatible services. 
## Getting started
- Clone this repo.
- `npm i` to install dependencies
- `npm run build` to compile to `main.js`
## Manually installing the plugin
- Copy over `main.js`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## Feature list
### Upload
- [x] Upload on paste.
- [x] Upload on drag-n-drop.
- [ ] Upload on adding attachments.
- [ ] Upload static html sites.
### Retrieval
- [x] Generate links for images.
- [x] Generate links for videos.
- [x] Generate links for audio.
- [ ] Generate links for static html.
- [ ] Returning download links for un-supported resource? (pdf, txt, ...).
### Helpers
- [ ] Command: delete un-used resources.
- [ ] Rename links on port/foldername changes.
- [ ] Retry counts and delays.
### Unplanned
- [ ] Command: upload existing compatible attachments.
- [ ] Parallel uploads. 
- [ ] Resource local caching (reduce egress on S3 and improve latency).
