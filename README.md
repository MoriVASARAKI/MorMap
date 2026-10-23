# MorMap 1.1.2

MorMap is a LibreNMS plugin for logical network diagrams, physical location plans and reusable device images.

## Install

Run the following command as the `librenms` user from your LibreNMS installation directory, normally `/opt/librenms`:

```bash
lnms plugin:add morivasaraki/mormap
```

The release tag for this package is `v1.1.2`. Upload the archive contents to the repository root so `composer.json` is at the top level, then create the tag. The command above installs this version after Packagist has indexed that tag.

Requirements: a working LibreNMS installation with its Composer plugin system, PHP 8.2 or later within PHP 8.x, and the PHP DOM and Fileinfo extensions. Composer resolves the required `librenms/plugin-interfaces` dependency. Open **MorMap** from the LibreNMS menu after installation.

If MorMap was previously disabled, enable its existing internal plugin identifier:

```bash
lnms plugin:enable portmap
```

## Local installation before publishing

The same package can be installed through `lnms` before a GitHub tag or Packagist release exists. Register its extracted directory as a Composer path repository for the **librenms** user, then use the normal plugin command. This is a local package source, not a fully offline LibreNMS installation; Composer may still need network access for dependencies.

Save drafts and close MorMap tabs. Back up `storage/app/mormap`, `composer.json`, `composer.lock`, and `composer.plugins.json` (if present). Keep the local source directory until switching back to the public release.

For example, upload the ZIP to `/tmp/mormap-1.1.2.zip`. As root, extract it into a new directory readable by `librenms`:

```bash
unzip /tmp/mormap-1.1.2.zip -d /opt/mormap-1.1.2
su - librenms
```

As **librenms**:

```bash
cd /opt/librenms
php scripts/composer_wrapper.php config --global repositories.mormap-local '{"type":"path","url":"/opt/mormap-1.1.2","options":{"symlink":false,"versions":{"morivasaraki/mormap":"1.1.2"}}}'
lnms plugin:add morivasaraki/mormap '^1.1.2'
php scripts/composer_wrapper.php show morivasaraki/mormap
```

The final command must report **1.1.2**. Reopen MorMap and check **Help** for **1.1.2**. The paths above are examples; the archive does not need to be uploaded to `/root`. Extract the package once without mixing files from older releases. `composer.json` must be directly inside `/opt/mormap-1.1.2`.

After the **v1.1.2** tag has been published and indexed by Packagist, switch back to the public repository as **librenms**:

```bash
cd /opt/librenms
php scripts/composer_wrapper.php config --global --unset repositories.mormap-local
lnms plugin:add morivasaraki/mormap '^1.1.2'
```

Check the installation output and `composer.lock` before removing the extracted directory: MorMap should now use a GitHub distribution rather than a local path. A global path repository takes precedence over Packagist while configured. Existing custom repositories for MorMap must also be reviewed if Composer selects an unexpected source.

References: [LibreNMS maintainer's local plugin example](https://github.com/murrant/librenms-example-plugin), [Composer path repositories and explicit local versions](https://getcomposer.org/doc/05-repositories.md#path).

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

Use the **MorMap** widget for MorMap publications. LibreNMS’s **Custom Map** widget lists its own native maps. Drafts appear in the MorMap selector after publishing. Authenticated non-admin users can view published maps subject to their LibreNMS device permissions and dashboard access; publishing does not grant anonymous access. Dashboard widgets show the live map without toolbars, side panels, zoom badges, footers or notification bars and automatically fit the content when resized. Opening a published map directly retains its normal controls. Device and port monitoring and hover details remain active in both views.

## Viewing permissions

Administrators retain all editing tools. Other authenticated users open MorMap's published-map list from the menu and can view permitted Logical and Physical publications, including dashboard embeds. LibreNMS users with global read access can view all published maps. A restricted user must have LibreNMS permission to view every monitored device placed on the map; a map containing no monitored devices requires global read or administrator access. VM guest details and remote equipment are filtered by device permissions. Unpublished physical placement metadata is not exposed to readers.

Dashboard access follows LibreNMS's dashboard policy. Widget settings require permission to update that dashboard. Publishing never enables anonymous access or gives readers permission to edit a draft.

## Data and upgrades

MorMap stores maps, uploaded images, physical plans and infrastructure records under `storage/app/mormap` in the LibreNMS installation. Back up this directory and your LibreNMS Composer configuration and lock files before upgrading. Save drafts and close open MorMap editor tabs before replacing the installed version.

Version 1.1.2 remains compatible with maps from 1.0.0–1.1.1, including route-cache recovery and menu error protection. The public package name is `morivasaraki/mormap`; the internal plugin identifier remains `portmap`, and existing `/plugin/mormap` URLs and storage paths are retained.

When upgrading from 0.9.8 or earlier, the first infrastructure load separates Logical and Physical connections into schema 2 and retains the original graph in `infrastructure/graph-before-topology-v2.json`. Restoring a pre-0.9.9 release requires its matching pre-upgrade data backup. An existing custom Composer path repository may continue to select its local package; migrate that repository configuration before switching such an installation to the public package.

## License

MorMap is licensed under the [MIT License](LICENSE). Bundled libraries and fonts retain their own notices in [package/third-party](package/third-party/README.md).

Concept, design and development: **Morteza VASARAKI** — [GitHub](https://github.com/MoriVASARAKI).

Official reference: [LibreNMS plugin packages](https://docs.librenms.org/Extensions/Plugin-System/).

## 1.1.2 changes

- Fix the Add Device form excluding a known Stack's own first-member interfaces when it initially opens in Standalone mode. The form now restores the known Stack presentation; interfaces assigned to other members remain separate.
- Display binding rows in Asset Library point order, including newly added points. Overlay saved port IDs and manual coordinates instead of replacing the Asset's point list with an older device profile.
- Preserve current bindings when reopening Bind image ports in Logical and Physical. An optional image-scoped slot identity keeps newly saved bindings associated with their Asset points, including after labels or coordinates change. Legacy maps remain supported; ambiguous old positions are retained without guessing or deleting them.
- Keep explicit Unbound selections and manual assignments when Reload ports succeeds. Failed requests retain the displayed inventory. Missing saved port IDs are identified as unavailable and restored when that same ID returns; they are not silently mapped to another interface.
- Distinguish raw LibreNMS inventory counts from interfaces available after Stack filtering. Fill by interface order uses eligible inventory and remains unavailable when there are no eligible interfaces. Hardware / all-interface scope, natural name order, SNMP index order, duplicate-port checks and existing topology rules are retained.
- Align the visible version and Help version at 1.1.2. No map data reset, cable deletion, layout redesign, VM behavior change or permission change is part of this release.

## 1.1.0 changes

- Restore **Unpublish** in Logical, with publication revision checks and Undo/Redo. Removing a publication preserves its editable draft and shared connections. Route-cache recovery includes the new action.
- Allow authenticated non-admin viewing through the MorMap menu, published maps and dashboard widget, using LibreNMS device and dashboard permissions. Drafts, library management and configuration remain administrative.
- Removing a Physical connection point, equipment placement or location from a view preserves shared cables. Explicit cable deletion and Disconnect still disconnect the selected relationship.
- Undo/Redo of shared infrastructure changes and Unpublish preserves the current draft geometry and pending edits instead of reloading an older saved layout.
- Temporarily disable interaction during map loading to prevent a delayed Reload response from overwriting newly accepted edits.
- Save independent positions for free-standing equipment in each Physical Cabling context. Moving it there preserves its normal location coordinates; default placement remains unchanged.
- Physical **Fit content** includes manual cable detours, information boxes, labels and backgrounds.
- Permit unrelated edits to a map containing a previously saved interface that LibreNMS deleted or reassigned. Retain its drawing and inventory warning. New invalid bindings or connections remain rejected.
- Retain existing VM eligibility, Show VMs, OS icons, cable advisories, topology separation, manual routes, layouts and the fifty-action Undo history. Non-admin cross-plan location links open permitted published Physical plans.

## 1.0.9 changes

- **Show VMs** in a hypervisor’s right-click menu now expands or collapses its guest group directly on the map, retaining its saved position, size and guest selection. It does not open the configuration panel.
- The same action is available in Logical and Physical editors, published maps and LibreNMS dashboard widgets. In published maps and widgets, toggles are temporary and do not modify drafts or published data. Dashboard fitting includes expanded groups.
- Host and guest selection now checks both LibreNMS OS classification and device type. Devices must be classified as servers without a conflicting non-server type; switches and other incompatible devices cannot be assigned as hosts, VMs or containers. The picker explains unavailable choices, and the server validates every assignment before saving the batch. Server classification permits manual membership; it does not automatically discover whether a server is virtual or which host owns it.
- Previously saved incompatible assignments are retained with **Review VM assignments** warnings. Use **Unlink** to remove a wrong membership, or assign a valid guest to its correct hypervisor. Undo remains available. An invalid switch assignment no longer makes the switch a recognized hypervisor.
- A recognized host without assigned guests displays an empty group. Existing OS icons, assignment controls, manual positioning, cables and other menus are retained.

## 1.0.8 changes

- Add **Show VMs** at the top of a hypervisor’s right-click menu in Logical and Physical. A host is recognized by existing MorMap guest assignments or LibreNMS virtualization discovery; a normal Linux/Windows OS or a device name alone does not make it a hypervisor.
- Show LibreNMS OS icons before guest names in the guest list and map groups, including Linux distribution and custom device icons resolved by LibreNMS. Existing group controls, monitoring status, membership, cables and saved layouts are retained.

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
