# MorMap 1.0.2

MorMap is a LibreNMS plugin for logical network diagrams, physical location plans and reusable device images.

## Install

Run the following command as the `librenms` user from your LibreNMS installation directory, normally `/opt/librenms`:

```bash
lnms plugin:add morivasaraki/mormap
```

MorMap is available on Packagist. The release tag for this version is `v1.0.2`.

Requirements: a working LibreNMS installation with its Composer plugin system, PHP 8.2 or later within PHP 8.x, and the PHP DOM and Fileinfo extensions. Composer resolves the required `librenms/plugin-interfaces` dependency. Open **MorMap** from the LibreNMS menu after installation.

If MorMap was previously disabled, enable its existing internal plugin identifier:

```bash
lnms plugin:enable portmap
```

## Workspaces

- **Logical:** create network diagrams, bind image connection points to device ports, draw cables, inspect discovered port details and publish maps.
- **Physical:** organize sites, buildings, floors, server rooms and racks; place equipment; document active and passive cabling; and trace paths through patch panels and outlets. Import background plans at Site, Building, Floor and ServerRoom levels.
- **Asset Library:** manage reusable device images, stencils and connection points.

Logical and Physical share device and port identities while keeping their connections separate. Save drafts, publish maps and export drawings using the controls inside MorMap. Undo retains the last twenty actions in Logical and Physical workspace sessions; reloading the page starts a new history.

Use **Help** or **F1** for the complete English and French guides included in the application. Help and export assets are bundled locally.

## Data and upgrades

MorMap stores maps, uploaded images, physical plans and infrastructure records under `storage/app/mormap` in the LibreNMS installation. Back up this directory and your LibreNMS Composer configuration and lock files before upgrading. Save drafts and close open MorMap editor tabs before replacing the installed version.

Version 1.0.2 preserves the data format of 1.0.0 and 1.0.1, including route-cache recovery and menu error protection. The public package name is `morivasaraki/mormap`; the internal plugin identifier remains `portmap`, and existing `/plugin/mormap` URLs and storage paths are retained.

When upgrading from 0.9.8 or earlier, the first infrastructure load separates Logical and Physical connections into schema 2 and retains the original graph in `infrastructure/graph-before-topology-v2.json`. Restoring a pre-0.9.9 release requires its matching pre-upgrade data backup. An existing custom Composer path repository may continue to select its local package; migrate that repository configuration before switching such an installation to the public package.

## License

MorMap is licensed under the [MIT License](LICENSE). Bundled libraries and fonts retain their own notices in [package/third-party](package/third-party/README.md).

Concept, design and development: **Morteza VASARAKI** — [GitHub](https://github.com/MoriVASARAKI).

Official reference: [LibreNMS plugin packages](https://docs.librenms.org/Extensions/Plugin-System/).

## 1.0.2 changes

- Release connections when their last saved cable drawing is removed with a device or port. Keep connections still drawn in another saved map.
- Explicitly deleting a cable or using Disconnect removes its shared connection across maps in the same topology when saved. Undo and Save restore it. Logical and Physical connections remain independent.
- Expose a manual logical disconnect action for pre-existing connections without a visible cable. Save the map to complete disconnection.
- Increase Logical and Physical Undo/Redo to 20 entries, including physical port and cable drags.
- Show a small MorMap icon beside published maps and present maps without editing chrome.
- Provide an iframe snippet for the LibreNMS Notes dashboard widget, with selected text for manual copying when clipboard access is unavailable or denied.
- Keep route-cache recovery and guarded menu rendering for the `mormap.home` route.
- Update the Help version and English/French history instructions.
