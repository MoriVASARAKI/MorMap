@extends('layouts.librenmsv1')
@section('content')
<style>.mormap-starting{visibility:hidden}</style>


<link rel="stylesheet" href="{{ route('mormap.asset', ['file'=>'chrome.css']) }}?v={{ $mormapVersion }}">

<link rel="stylesheet" href="{{ route('mormap.asset', ['file' => 'editor.css']) }}?v={{ $mormapVersion }}">
<link rel="stylesheet" href="{{ route('mormap.asset', ['file' => 'physical.css']) }}?v={{ $mormapVersion }}">
<link rel="stylesheet" href="{{ route('mormap.asset', ['file'=>'workspace.css']) }}?v={{ $mormapVersion }}">
<link rel="stylesheet" href="{{ route('mormap.asset', ['file'=>'workbench.css']) }}?v={{ $mormapVersion }}">
<div id="mormap-physical" class="mormap-starting" data-base="{{ $readOnly ? $viewerBase : route('mormap.physical.home') }}" data-shared="{{ route('mormap.home') }}" data-read-only="{{ $readOnly ? 'true' : 'false' }}" data-user="{{ $mormapUser ?? 'session' }}" data-csrf="{{ csrf_token() }}">
    @include('portmap::chrome', ['activeWorkspace'=>'physical', 'stateId'=>'mp-state'])
    <div class="mp-toolbar">
        @unless($readOnly)
        <div class="mp-group" role="group" aria-label="Plan"><span>PLAN</span><div><select id="mp-plans" aria-label="Physical plan"></select><button id="mp-new">New</button><button id="mp-rename" title="Rename physical plan">Rename</button><button id="mp-delete-map" title="Delete physical plan and published copy">Delete plan</button><button id="mp-save" class="mp-primary">Save</button><button id="mp-reload">Reload</button><button id="mp-publish">Publish to Maps</button><button id="mp-unpublish" disabled title="Remove the published copy from Maps while keeping the editable plan">Unpublish</button></div></div>
        <div class="mp-group" role="group" aria-label="Add"><span>ADD</span><div><button id="mp-setup" title="Create a site, building, floor, ServerRoom and rack">Main Setup</button><button id="mp-location">Site</button><button id="mp-equipment">Device</button><button id="mp-component">Component</button><button data-mp-tool="anchor" title="Add connection point">X</button><button data-mp-tool="cable">Cable</button></div></div>
        <div class="mp-group" role="group" aria-label="Draw"><span>DRAW</span><div><button data-mp-tool="select" class="active" title="Select and move (V)">Select</button><button data-mp-tool="rectangle" title="Draw a rectangle">▭</button><button data-mp-tool="ellipse" title="Draw an ellipse">◯</button><button data-mp-tool="line" title="Draw a line">╱</button><button data-mp-tool="polygon" title="Click corners, then double-click or Enter to finish">⬡</button><button data-mp-tool="text" title="Place text">T</button></div></div>
        <div class="mp-group" role="group" aria-label="Edit"><span>EDIT</span><div><button id="mp-painter" class="mm-format-painter" type="button" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2 9 9-7 7-9-9Z" fill="#f2b33d" stroke="currentColor" stroke-width="1.2"/><path d="m6 9 9 9-2 2-9-9Z" fill="#dae4ec" stroke="currentColor" stroke-width="1.2"/><path d="m6 13-4 6a2 2 0 0 0 3 3l6-4Z" fill="#5785a7" stroke="currentColor" stroke-width="1.2"/><path d="m14 5 5 5m-7-3 5 5" stroke="#fff" stroke-width="1.2"/></svg>Format Painter</button><button id="mp-undo" title="Undo (Ctrl+Z)">Undo</button><button id="mp-redo" title="Redo (Ctrl+Shift+Z)">Redo</button><button id="mp-delete" title="Delete selection">Delete</button></div></div>
        @endunless
        <div class="mp-group" role="group" aria-label="View"><span>VIEW</span><div><button id="mp-cabling" aria-pressed="false" title="Show rack fronts together and connect exact ports">Cabling view</button><button id="mp-fit">Fit page</button><button id="mp-fit-content">Fit content</button><button id="mp-grid" aria-pressed="true">Grid</button>@unless($readOnly)<button id="mp-snap" aria-pressed="true">Snap</button><button id="mp-background" title="Import or edit a site, building, floor or server room background">Background</button><button id="mp-geography" title="Position locations using their stored latitude and longitude">Coordinates</button>@endunless<button id="mp-properties" aria-pressed="true">Properties</button><button id="mp-help">Help</button></div></div>

        <div class="mp-group" role="group" aria-label="Output"><span>OUTPUT</span><div><button id="mp-output">Print / Export</button></div></div>
    </div>
    <div class="mp-address"><button id="mp-up" title="Go up one level">↑</button><nav id="mp-breadcrumbs" aria-label="Physical location"></nav><span id="mp-level"></span></div>
    <div class="mp-workspace">
        <aside class="mp-explorer"><div class="mp-panel-title">LOCATIONS <button id="mp-collapse" title="Hide location explorer">‹</button></div><div id="mp-tree" role="tree" aria-label="Location hierarchy"></div><div class="mp-explorer-note">Open a location to design its interior.<br>Site → Building → Floor → ServerRoom → Rack</div></aside>
        <div class="mp-stage"><button id="mp-show-tree" title="Show location explorer" hidden>Locations ›</button><svg id="mp-canvas" xmlns="http://www.w3.org/2000/svg" tabindex="0" aria-label="Physical map"></svg><div id="mp-empty"></div><div class="mp-canvas-footer"><span id="mp-context"></span><span id="mp-zoom">100%</span></div></div>
        <aside id="mp-inspector"><div class="mp-panel-title">PROPERTIES <button id="mp-close-properties" title="Hide properties">×</button></div><div id="mp-properties-content"></div></aside>
    </div>
    <footer class="mp-footer"><span><i class="mp-led mp-up"></i> Up <i class="mp-led mp-down"></i> Down <i class="mp-led mp-admin"></i> Admin down <i class="mp-led mp-unknown"></i> Unknown</span><span id="mp-status">Status: waiting</span><button id="mp-refresh">Refresh status</button></footer>
    <div id="mp-message" hidden role="alert"></div>
    <dialog id="mp-dialog"><form id="mp-form"><h3 id="mp-dialog-title"></h3><div id="mp-dialog-content"></div><p id="mp-dialog-error" role="alert"></p><div class="mp-dialog-actions"><button type="button" id="mp-dialog-cancel">Cancel</button><button type="submit" class="mp-primary" id="mp-dialog-apply">Apply</button></div></form></dialog>
</div>
@include('portmap::output')
<script src="{{ route('mormap.asset', ['file'=>'topology.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file' => 'display.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file' => 'port-details.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file' => 'ui.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'workspace.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'comments.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'geometry.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'cable-style.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'cable-controls.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'selection.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'format-painter.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'port-mapping.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'physical-trace.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'infrastructure.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file' => 'physical-model.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'topology-controls.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'physical-cables.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'hierarchy-links.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'physical-path-ui.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'floor-background.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file' => 'physical.js']) }}?v={{ $mormapVersion }}" defer></script>
<link rel="stylesheet" href="{{ route('mormap.asset', ['file'=>'help.css']) }}?v={{ $mormapVersion }}">
<script src="{{ route('mormap.asset', ['file'=>'help-content.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'help.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'workbench.js']) }}?v={{ $mormapVersion }}" defer></script>
@endsection
