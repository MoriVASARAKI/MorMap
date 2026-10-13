@extends('layouts.librenmsv1')
@section('content')
<style>.mormap-starting{visibility:hidden}</style>


<link rel="stylesheet" href="{{ route('mormap.asset', ['file'=>'chrome.css']) }}?v={{ $mormapVersion }}">

<link rel="stylesheet" href="{{ route('mormap.asset', ['file' => 'editor.css']) }}?v={{ $mormapVersion }}">
<link rel="stylesheet" href="{{ route('mormap.asset', ['file'=>'workspace.css']) }}?v={{ $mormapVersion }}">
<link rel="stylesheet" href="{{ route('mormap.asset', ['file'=>'workbench.css']) }}?v={{ $mormapVersion }}">
<div id="mormap" class="mormap-starting" data-shared="{{ route('mormap.home') }}" data-base="{{ $readOnly ? $viewerBase : route('mormap.home') }}" data-read-only="{{ $readOnly ? 'true' : 'false' }}" data-user="{{ $mormapUser ?? 'session' }}" data-csrf="{{ csrf_token() }}">
    @include('portmap::chrome', ['activeWorkspace'=>'logical', 'stateId'=>'mm-state'])
    <div class="mm-toolbar">
        @unless($readOnly)
        <div class="mm-tool-group" role="group" aria-label="Map"><span class="mm-group-label">Map</span><div class="mm-group-buttons">
            <select id="mm-maps" aria-label="Map"></select><button id="mm-new">New</button><button id="mm-rename" title="Rename map">Rename</button><button id="mm-delete-map" title="Delete map and published copy">Delete map</button><button id="mm-save" class="mm-primary">Save</button><button id="mm-reload">Reload</button>
            <button id="mm-publish" title="Publish the saved version to the LibreNMS Maps menu">Publish to Maps</button>
        </div></div>
        <div class="mm-tool-group" role="group" aria-label="Add"><span class="mm-group-label">Add</span><div class="mm-group-buttons">
            <button id="mm-add">Device</button><button data-mode="anchor" class="mm-point-tool" title="Add connection point" aria-label="Add connection point">X</button><button data-mode="cable">Cable</button>
        </div></div>
        <div class="mm-tool-group" role="group" aria-label="Edit"><span class="mm-group-label">Edit</span><div class="mm-group-buttons">
            <button data-mode="select" class="active">Select</button><button id="mm-painter" class="mm-format-painter" type="button" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2 9 9-7 7-9-9Z" fill="#f2b33d" stroke="currentColor" stroke-width="1.2"/><path d="m6 9 9 9-2 2-9-9Z" fill="#dae4ec" stroke="currentColor" stroke-width="1.2"/><path d="m6 13-4 6a2 2 0 0 0 3 3l6-4Z" fill="#5785a7" stroke="currentColor" stroke-width="1.2"/><path d="m14 5 5 5m-7-3 5 5" stroke="#fff" stroke-width="1.2"/></svg>Format Painter</button><button id="mm-undo">Undo</button><button id="mm-redo">Redo</button><button id="mm-delete">Delete</button>
        </div></div>
        @endunless
        <div class="mm-tool-group" role="group" aria-label="View"><span class="mm-group-label">View</span><div class="mm-group-buttons">
            @unless($readOnly)<button id="mm-size" title="Change map width and height">Page size: 1920 × 1080</button>@endunless
            <button id="mm-page">Fit page</button><button id="mm-fit">Fit content</button>
            @unless($readOnly)<button id="mm-view">Preview</button><button id="mm-grid" aria-pressed="true">Grid</button><button id="mm-snap" aria-pressed="true">Snap</button>@endunless
            <button id="mm-details" aria-expanded="false" aria-controls="mm-details-panel">Properties</button><button id="mm-help-button">Help</button>
    
    </div></div>
        <div class="mm-tool-group" role="group" aria-label="Output"><span class="mm-group-label">Output</span><div class="mm-group-buttons"><button id="mm-output">Print / Export</button></div></div>
    </div>
    <div id="mm-message" role="alert" hidden></div>
    <div class="mm-workspace">
        <div class="mm-canvas-wrap"><svg id="mm-canvas" xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" aria-label="Network map" tabindex="0"></svg>
            <div id="mm-empty">{{ $readOnly ? 'This map has no devices.' : 'Create a map, then add your first device image.' }}</div><div id="mm-zoom">100%</div>
        </div>
        <aside id="mm-details-panel"><div class="mm-panel-heading">PROPERTIES <button id="mm-details-close" aria-label="Collapse properties">›</button></div><div id="mm-inspector">Select a device, port or cable.</div></aside>
    </div>
    <footer class="mm-footer"><div class="mm-legend"><span class="mm-up">■ UP</span><span class="mm-down">■ DOWN</span><span class="mm-disabled">■ DISABLED / ADMIN DOWN</span><span class="mm-unknown">■ UNKNOWN</span></div>
        <span id="mm-status-time" role="status">Status: waiting</span><button id="mm-refresh" title="Read the latest polled device and port states">Refresh status</button>
    </footer>
    @unless($readOnly)
    <dialog id="mm-dialog"><form id="mm-form"><h3 id="mm-dialog-title" class="mm-dialog-handle"></h3><div id="mm-fields"></div><p id="mm-dialog-error" role="alert"></p><div class="mm-dialog-actions"><button type="button" id="mm-cancel">Cancel</button><button type="submit" class="mm-primary">Apply</button></div></form></dialog>
    @endunless
    <dialog id="mm-help"><h3 id="mm-help-title" class="mm-dialog-handle">MorMap</h3>
        @unless($readOnly)
        <p><b>Map:</b> save your work, then Publish to Maps to make a snapshot available in the LibreNMS Maps menu. Later edits stay in MorMap until you publish again.</p>
        <p><b>Add:</b> add a device image; use X to choose an existing interface or create an unmonitored manual connector. Each NIC needs its own port. Use Cable to connect two points.</p>
        <p><b>Format Painter:</b> select a source, click the brush, then click a matching target. Double-click the brush for multiple targets; Escape stops. Ctrl/Cmd+Shift+C copies and Ctrl/Cmd+Shift+V pastes formatting, including across workspaces in this tab. Cables, Info and equipment transfer their visual style. Save keeps the result; Undo reverses it. Format device edits image opacity and label styling.</p><p><b>Cable format and routing:</b> right-click a cable for Format Cable, Redraw route, Add bend here or Move segment. Click waypoints; Shift draws vertical first, Backspace undoes a waypoint, Enter finishes an existing route and Escape cancels. A new cable finishes at the destination port. Format Cable previews width, color, gradient, dashes, rounded corners, transparency and arrows.</p><p><b>Edit:</b> select and move a device or point. Resize an image with its corner handle. Select a cable and drag a segment handle. Right-click a round bend handle to remove that bend while keeping the cable connected. For right-angle cables, double-click a segment to add a detour; Alt + double-click its middle segment to remove it. Right-click a cable to choose Right-Angle, Straight or Curved Connector. Drag curve handles to adjust a curve. Use Info size to resize a pinned info label.</p>
        <p><b>Page size:</b> default 1920 × 1080. Save to retain a new size. Device and cable positions are preserved.</p>
        @endunless
        <p><b>Status:</b> the device halo shows its latest LibreNMS status. Small colored dots mark assigned ports and scale with the equipment and zoom. Hover a device for System Name and Resolved IP, a port for its state, or a cable for its endpoints.</p>
        <p><b>Navigation:</b> wheel to zoom; drag empty space to pan. Fit page shows the canvas; Fit content shows the equipment and routes. Properties is available for the selected item.</p>
        <p>Unplaced ports are listed in device Properties. Use Place to position a real port on its image. Ports can have multiple connections; MorMap warns about ambiguous paths and preserves the existing cables. Existing devices in Add Device reuses equipment from Physical, including patch panels. Cable colors are automatic unless overridden: green healthy, orange unverified/warning, red down. Grid shows alignment dots. Snap aligns equipment movement and resizing to the grid, and cable bends to nearby endpoints or the grid. Snap also aligns nearby port rows and columns; Alt allows free placement. Use Align points in Properties to preview row/column alignment. The controls are independent.</p><p>Device/port status refreshes every 30 seconds without moving cable paths. Drag dialog titles to move the windows. Enter applies forms; in multiline comments use Ctrl/Cmd+Enter. Manual ports are Unmonitored.</p>
        <p><b>Comments:</b> an amber marker indicates a comment. Click to read or collapse it. Drag the expanded card to move it, then save.</p><p><b>Workspace:</b> the last selected map is remembered separately in Logical and Physical. Save edits before switching workspaces. Panels collapse to edge tabs; use the minus button to minimize a dialog while keeping its form.</p>
        <div class="mm-dialog-actions"><button id="mm-help-close">Close</button></div>
    </dialog>
</div>
@include('portmap::output')
<script src="{{ route('mormap.asset', ['file'=>'topology.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file' => 'ui.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'workspace.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'comments.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file' => 'geometry.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'cable-style.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'cable-controls.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'selection.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'format-painter.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file' => 'display.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file' => 'port-details.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'port-mapping.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'physical-trace.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'infrastructure.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'topology-controls.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file' => 'editor.js']) }}?v={{ $mormapVersion }}" defer></script>
<link rel="stylesheet" href="{{ route('mormap.asset', ['file'=>'help.css']) }}?v={{ $mormapVersion }}">
<script src="{{ route('mormap.asset', ['file'=>'help-content.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'help.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'workbench.js']) }}?v={{ $mormapVersion }}" defer></script>
@endsection
