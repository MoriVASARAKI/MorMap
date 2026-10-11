@extends('layouts.librenmsv1')
@section('content')
<style>.mormap-starting{visibility:hidden}</style>
<link rel="stylesheet" href="{{ route('mormap.asset', ['file'=>'chrome.css']) }}?v={{ $mormapVersion }}">

<link rel="stylesheet" href="{{ route('mormap.asset',['file'=>'editor.css']) }}?v={{ $mormapVersion }}">
<link rel="stylesheet" href="{{ route('mormap.asset',['file'=>'library.css']) }}?v={{ $mormapVersion }}">
<link rel="stylesheet" href="{{ route('mormap.asset', ['file'=>'workspace.css']) }}?v={{ $mormapVersion }}">
<link rel="stylesheet" href="{{ route('mormap.asset', ['file'=>'workbench.css']) }}?v={{ $mormapVersion }}">
<div id="mormap" class="mm-library mormap-starting" data-base="{{ route('mormap.home') }}" data-user="{{ $mormapUser ?? 'session' }}" data-csrf="{{ csrf_token() }}">
@include('portmap::chrome', ['activeWorkspace'=>'library', 'stateId'=>''])
<div class="ml-heading"><div><h2>Asset library</h2><p>Import once. Use in every map. Define connection positions for reusable stencils.</p></div><button id="ml-import" class="mm-primary">Import image / SVG</button><input type="file" id="ml-file" accept=".svg,.png,.jpg,.jpeg,.webp,.json" hidden></div>
<div id="ml-message" role="status" hidden></div>
<div class="ml-layout">
<aside class="ml-browser"><div class="mm-search-row"><input id="ml-search" type="search" placeholder="Search images, vendors or systems" aria-label="Search assets"></div><div class="ml-filters" role="group" aria-label="Asset type"><button data-filter="all" class="active">All</button><button data-filter="image">Images</button><button data-filter="logo">Logos</button><button data-filter="stencil">Vectors</button></div><span id="ml-count"></span><div id="ml-assets" class="ml-grid"></div></aside>
<section class="ml-designer"><div class="ml-designer-head"><div><h3 id="ml-title">Choose an asset</h3><p id="ml-source">Your uploaded images, LibreNMS logos and MorMap vector stencils.</p></div><span id="ml-format"></span></div>
<div class="ml-actions" role="group" aria-label="Stencil editor"><button id="ml-point" title="Click on the preview to add a connection position">X Add position</button><button id="ml-remove">Remove position</button><button id="ml-align">Align points</button><button id="ml-snap" aria-pressed="true" title="Align with nearby positions while dragging. Hold Alt for free placement.">Snap</button><button id="ml-painter" class="mm-format-painter" type="button" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2 9 9-7 7-9-9Z" fill="#f2b33d" stroke="currentColor" stroke-width="1.2"/><path d="m6 9 9 9-2 2-9-9Z" fill="#dae4ec" stroke="currentColor" stroke-width="1.2"/><path d="m6 13-4 6a2 2 0 0 0 3 3l6-4Z" fill="#5785a7" stroke="currentColor" stroke-width="1.2"/><path d="m14 5 5 5m-7-3 5 5" stroke="#fff" stroke-width="1.2"/></svg>Format Painter</button><button id="ml-format-image" type="button">Format image</button><button id="ml-undo-format" type="button" title="Undo (up to 5 actions)">Undo</button><button id="ml-redo-format" type="button" title="Redo">Redo</button><button id="ml-save" class="mm-primary">Save stencil</button><button id="ml-replace-asset">Replace everywhere</button><button id="ml-delete-asset" class="mm-asset-danger">Delete asset</button><a id="ml-export" hidden>Export image + points</a></div>
<div class="ml-preview"><svg id="ml-canvas" viewBox="0 0 640 300" aria-label="Stencil preview" tabindex="0"></svg><p id="ml-empty">Select a vector stencil to inspect its port positions, or import your own image.</p></div>
<div class="ml-properties"><label>Asset name<input id="ml-name" maxlength="120"></label><div><b>Port positions</b><p>Labels can match LibreNMS interface names, such as Gi1/0/1. Drag a dot to position it.</p><div id="ml-ports"></div></div></div>
<div class="ml-note"><b>Vector workflow</b><p>Import a plain SVG or a MorMap stencil package. For a Visio .vss / .vssx stencil, place the desired shape on a drawing page and export that shape as SVG in Visio first. Add its connection positions here and reuse the saved stencil.</p><p>Real vendor logos are read from the LibreNMS installation. MorMap's built-in hardware stencils are generic vectors.</p></div>
</section></div>
<dialog id="ml-dialog"><form id="ml-form"><h3 id="ml-dialog-title"></h3><div id="ml-dialog-content"></div><p id="ml-dialog-error" role="alert"></p><div class="mm-dialog-actions"><button id="ml-dialog-cancel" type="button">Cancel</button><button id="ml-dialog-apply" type="submit" class="mm-primary">Apply</button></div></form></dialog>
</div>
<script src="{{ route('mormap.asset', ['file'=>'topology.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'geometry.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'cable-style.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'cable-controls.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'format-painter.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset',['file'=>'ui.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'workspace.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'comments.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset',['file'=>'library.js']) }}?v={{ $mormapVersion }}" defer></script>
<link rel="stylesheet" href="{{ route('mormap.asset', ['file'=>'help.css']) }}?v={{ $mormapVersion }}">
<script src="{{ route('mormap.asset', ['file'=>'help-content.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'help.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'workbench.js']) }}?v={{ $mormapVersion }}" defer></script>
@endsection
