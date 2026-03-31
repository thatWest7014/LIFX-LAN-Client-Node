# LIFX LAN Client: Changelog
---
## 1.0.0: Initial commit/release
> Initial package release and commit of all existing files.
## 1.0.1: URL Fixes
> Updated the URL within package.json under 'repository' to conform to the NPM syntax.
## 1.0.2: Renamed Package
> Renamed the package from `lifx-lan` to `@west7014/lifx-lan` to prevent any issues with NPM.
## 1.0.3: Updated License
> Changed the license within 'readme.md' from MIT to MPL-2.0 to resolve the two licenses issue.
## 1.0.4: Added Changelog
> Added this changelog file to record changes in a more readable manner compared to Git history.
## 1.0.5: Security, IDE, & Readme Changes
> Pinned Axios at 1.14.0 instead of >=1.0.0 to keep a newer version while avoiding Axios 1.14.1. Index.d.ts was changed to include a reference for Node.js. And the Readme was updated to display the socket badge of supply chain vulnerabilties.
## 1.0.6: Axios security change
> Updated Axios to be at 1.14.0 or higher without install 1.14.1 due to the security events that occured late last night.
## 1.0.7: (Correctly) Pinned Axios to 1.14.0
> Pinned axios correctly this time to 1.14.0 to avoid potential security risks that come with 1.14.1 and potentially future releases for the time being. The pin will be adjusted when I can reasonably confirm that they have control over their NPM account again.
## 1.0.8: Workflows and Security changes
> Added a GitHub workflow to publish to NPM alongside GitHub Immutable releases.
## 1.0.9: Workflow + CI Test Changes
> Added test.js alongside a test command in the package to resolve CI test issues. Also updates the Workflow from Nova 22 to Node 24.
## 1.0.10: Workflow changes
> Added a package-lock.json file to fix workflow issues alongside a .gitignore to ignore the node_modules directory.
## 1.0.11
> Added the 'readme' key to the package.json file to point to the README.md file. Hopefully this resolves the issue of the NPM page not showing the README and stating that there is no such file.
## 1.0.12
> Changes from 1.0.11 were rolled into this since I forgot to update the package file for the release and NPM did not like me trying to write another version 1.0.10.