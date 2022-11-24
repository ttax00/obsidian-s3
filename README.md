# Obsidian S3

![GitHub](https://img.shields.io/github/license/TechTheAwesome/obsidian-s3?style=for-the-badge)
![GitHub Workflow Status](https://img.shields.io/github/workflow/status/techtheawesome/obsidian-s3/Typescript?style=for-the-badge)
[![wakatime](https://wakatime.com/badge/user/4312729e-bc28-4bc0-9074-161a64a7ad20/project/83a03e69-c8e0-49a9-ac01-a80c5ef7c96f.svg?style=for-the-badge)](https://wakatime.com/badge/user/4312729e-bc28-4bc0-9074-161a64a7ad20/project/83a03e69-c8e0-49a9-ac01-a80c5ef7c96f)

An [Obsidian](https://obsidian.md/) plugin for storage and retrieval of media attachments on S3 compatible services. 

![](assets/welcome.gif)
## Getting started
- Clone this repo.
- `npm i` to install dependencies
- `npm run build` to compile to `main.js`
## Manually installing the plugin
- Copy over `main.js`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## Feature list
Supported files (limited by files allowed to be linked by Obsidian): 
- images (.ico, .png, .jpg, .gif).
- videos (.mp4).
- audio (.mp3, .wav).
### Upload
- [x] Upload on paste.
- [x] Upload on drag-n-drop.
- [ ] Upload on adding attachments.

### Retrieval
- [x] Generate links for images.
- [x] Generate links for videos.
- [x] Generate links for audio.
- [ ] Returning download links for un-supported resource? (pdf, txt, ...).
### Helpers/Misc
- [x] Command: delete un-used resources.
- [x] Command: Show bucket size
- [ ] Rename links on port/foldername changes.

### Unplanned
- [ ] Command: upload existing compatible attachments.
- [ ] Parallel uploads. 
- [ ] Retry counts and delays.
- [ ] Upload static html sites.
- [ ] Generate links for static html.
- [ ] Resource local caching (may increase incompatibility with mobile).

## Many thanks
Inspiration taken from:
- [obsidian-paste-png-to-jpeg](https://github.com/musug/obsidian-paste-png-to-jpeg)
- [Obsidian Imgur Plugin](https://github.com/gavvvr/obsidian-imgur-plugin)
- [Obsidian Static File Server](https://github.com/elias-sundqvist/obsidian-static-file-server)

