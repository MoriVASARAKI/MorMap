# MorMap 1.0.7

MorMap is a LibreNMS plugin for logical network diagrams, physical location plans and reusable device images.

## Install

Run the following command as the `librenms` user from your LibreNMS installation directory, normally `/opt/librenms`:

```bash
lnms plugin:add morivasaraki/mormap
```

MorMap is available on Packagist. The release tag for this version is `v1.0.7`.

Requirements: a working LibreNMS installation with its Composer plugin system, PHP 8.2 or later within PHP 8.x, and the PHP DOM and Fileinfo extensions. Composer resolves the required `librenms/plugin-interfaces` dependency. Open **MorMap** from the LibreNMS menu after installation.

If MorMap was previously disabled, enable its existing internal plugin identifier:

```bash
lnms plugin:enable portmap
```

## Workspaces

- **Logical:** create network diagrams, bind image connection points to device ports, draw cables, inspect discovered port details and publish maps.
- **Physical:** organize sites, buildings, floors, server rooms and racks; place equipment; document active and passive cabling; and trace paths through patch panels and outlets. Import background plans at Site, Building, Floor and ServerRoom levels.
- **Asset Library:** manage reusable device images, stencils and connection points.

Logical and Physical share device and port identities while keeping their connections separate. Save drafts, publish maps and export drawings using the controls inside MorMap. Undo retains the last fifty actions in Logical, Physical and Asset Library workspace sessions; reloading the page starts a new history.

Use **Help** or **F1** for the complete English and French guides included in the application. Help and export assets are bundled locally.

## Dashboard maps

1. Save and Publish a Logical or Physical map in MorMap.
2. Open a LibreNMS dashboard you can edit, then choose **Add Widget → MorMap**.
3. Open the new widget’s settings (pencil icon), select the published map and Save.

Use the **MorMap** widget for MorMap publications. LibreNMS’s **Custom Map** widget lists its own native maps. Drafts appear in the MorMap selector after publishing. MorMap’s existing administrator and dashboard access permissions apply; publishing does not grant anonymous access. Dashboard widgets show the live map without toolbars, side panels, zoom badges, footers or notification bars and automatically fit the content when resized. Opening a published map directly retains its normal controls. Device and port monitoring and hover details remain active in both views.

## Data and upgrades

MorMap stores maps, uploaded images, physical plans and infrastructure records under `storage/app/mormap` in the LibreNMS installation. Back up this directory and your LibreNMS Composer configuration and lock files before upgrading. Save drafts and close open MorMap editor tabs before replacing the installed version.

Version 1.0.7 remains compatible with maps from 1.0.0–1.0.6, including route-cache recovery and menu error protection. The public package name is `morivasaraki/mormap`; the internal plugin identifier remains `portmap`, and existing `/plugin/mormap` URLs and storage paths are retained.

When upgrading from 0.9.8 or earlier, the first infrastructure load separates Logical and Physical connections into schema 2 and retains the original graph in `infrastructure/graph-before-topology-v2.json`. Restoring a pre-0.9.9 release requires its matching pre-upgrade data backup. An existing custom Composer path repository may continue to select its local package; migrate that repository configuration before switching such an installation to the public package.

## License

MorMap is licensed under the [MIT License](LICENSE). Bundled libraries and fonts retain their own notices in [package/third-party](package/third-party/README.md).

Concept, design and development: **Morteza VASARAKI** — [GitHub](https://github.com/MoriVASARAKI).

Official reference: [LibreNMS plugin packages](https://docs.librenms.org/Extensions/Plugin-System/).

## 1.0.7 changes

- Associate existing LibreNMS devices with a hypervisor as VMs or containers in Logical and Physical. Choose a device, open **Properties → Virtual machines / containers → Assign LibreNMS devices**, select the guests, then apply. VMID is optional and entered manually. No hypervisor API or additional credentials are required.
- The host badge opens a searchable guest list with VM/CT filters, OS, IP and current LibreNMS monitoring status. Up/Down describes monitoring reachability, not the guest power state. Missing inventory is shown as unavailable and its membership is retained for review.
- Select guests and choose **Show selected on map**. Drag the group header or resize its lower-right corner. Several groups can be open. Save retains positions per map, hypervisor and Physical location/view. Collapse/expand and refresh preserve placement; dotted membership lines are independent of cables.
- Assignments are shared between workspaces and saved immediately with Undo/Redo. Unlink removes membership, preserving the LibreNMS device, map placements and connections. Reassigning shows the previous host and explicitly moves the selected guest. Map group layout uses normal Save, Undo and Publish. Published viewers can inspect and temporarily expand/collapse without writing changes.
- Visible cable strokes, white outlines and dotted membership lines scale with zoom, eliminating oversized cable outlines when zooming out. Invisible cable selection targets retain their usable screen width. Cable routes, formatting values and topology rules are retained.
- Add route-cache recovery for the new guest API. Existing map files without guest groups load unchanged; new membership data is stored under `storage/app/mormap/virtualization/guests.json`.

## 1.0.6 changes

- Restore the Locations tree in standalone published Physical plans. Use the tree, breadcrumbs or double-click a location to enter its interior. Double-click also works when the Pan hand tool is selected; dragging still pans. Dashboard widgets retain their existing compact presentation.
- Add **Unpublish** beside Publish in the Physical editor. Select the saved plan and click Unpublish to remove its published snapshot from the Maps menu and publication selector while retaining the editable draft and all connections. Undo restores the publication; Publish can create it again. Widgets using that publication will need it republished or another map selected.
- Keep publication revision checks and administrator permissions, and recover route caches from earlier releases for the new action. Other tools, connectivity rules, data formats and Logical views are unchanged.

## 1.0.5 changes

- Preserve LibreNMS widget translations by removing MorMap's premature registration of the host `widgets` translation group. MorMap provides its own widget title through its controller.
- Apply the uncluttered dashboard presentation to embedded published Logical and Physical maps. Normal editor and standalone viewer layouts are unchanged.
- Verify stored connection endpoints against the LibreNMS inventory on map/infrastructure reads and status refreshes. Connections to confirmed deleted or reassigned interfaces with no remaining placement in any saved map are moved to disconnected records, so stale records no longer occupy an active port or return from an old published snapshot.
- Retain a complete graph backup before each inventory correction under `storage/app/mormap/infrastructure/graph-before-inventory-<revision>.json`. Saved map files, routes, images and valid off-map connections are preserved. Equal device names, monitoring outages and disabled/down states never trigger deletion or automatic ID reassignment. A removed interface still placed in a saved map keeps its drawing and shows an inventory warning for review.
- Keep engineering advisories, topology separation, explicit disconnection and Undo/Redo. Invalid identities and malformed data remain subject to validation.

## 1.0.4 changes

- Allow additional connections on occupied ports in Logical, Physical, remote links and links across locations. Existing cables and their manual routes are retained.
- Show nonblocking warnings for ambiguous connectivity, physical continuity loops and stack-role mismatches, including after Save and reload.
- Allow Save, Undo and Redo with multiple connections per port. Explicit Disconnect still targets the selected cable.
- Keep connected Front / Rear terminations selectable. Reusing an exact endpoint pair selects or retains its existing connection and details.
- Preserve the current appearance, fifty-action history, published views and native dashboard widget.

## 1.0.3 changes

- Add a native MorMap dashboard widget with a published Logical / Physical map selector, using LibreNMS’s own widget settings storage and access checks.
- Recover route caches that predate the dashboard widget.
- Restore published-view Pan, Fit, Properties and Print / Export controls; hide the top brand/Help strip and left device/location list.
- Remove the standalone large MorMap logo from the LibreNMS Maps dropdown; retain a small inline icon beside each map name. Logos elsewhere are unchanged.
- Increase Undo/Redo to 50 actions in all three workspaces, including port and cable drags and deletion actions.
- Update Help and dashboard instructions and size embedded maps to the widget.

## 1.0.2 changes

- Release connections when their last saved cable drawing is removed with a device or port. Keep connections still drawn in another saved map.
- Explicitly deleting a cable or using Disconnect removes its shared connection across maps in the same topology when saved. Undo and Save restore it. Logical and Physical connections remain independent.
- Expose a manual logical disconnect action for pre-existing connections without a visible cable. Save the map to complete disconnection.
- Increase Logical and Physical Undo/Redo to 20 entries, including physical port and cable drags.
- Show a small MorMap icon beside published maps and present maps without editing chrome.
- Provide an iframe snippet for the LibreNMS Notes dashboard widget, with selected text for manual copying when clipboard access is unavailable or denied.
- Keep route-cache recovery and guarded menu rendering for the `mormap.home` route.
- Update the Help version and English/French history instructions.
