<link rel="stylesheet" href="{{ route('mormap.asset', ['file'=>'output.css']) }}?v={{ $mormapVersion }}">
<dialog id="mo-dialog" class="mo-dialog" data-assets="{{ route('mormap.asset', ['file'=>'output.js']) }}" aria-labelledby="mo-title">
    <div class="mo-titlebar"><div><h3 id="mo-title">Print / Export</h3><p id="mo-map-name"></p></div><button id="mo-close" type="button" aria-label="Close">×</button></div>
    <div class="mo-layout"><form id="mo-form" class="mo-settings">
        <fieldset><legend>Drawing</legend>
            <label id="mo-scope-label">Locations<select id="mo-scope"><option value="current">Current location</option><option value="all">All locations</option></select></label>
            <label>Output area<select id="mo-area"><option value="page">Page</option><option value="content">All content</option><option value="view">Current view</option><option value="window">Window (coordinates)</option></select></label>
            <div id="mo-window" class="mo-grid" hidden><label>X<input id="mo-x" type="number" step="any"></label><label>Y<input id="mo-y" type="number" step="any"></label><label>Width<input id="mo-width" type="number" min="1" step="any"></label><label>Height<input id="mo-height" type="number" min="1" step="any"></label></div>
        </fieldset>
        <fieldset><legend>Paper</legend><div class="mo-grid">
            <label>Size<select id="mo-paper"><option>A4</option><option>A3</option><option>A2</option><option>A1</option><option>A0</option><option>A5</option><option>Letter</option><option>Legal</option><option>Tabloid</option><option>Custom</option></select></label>
            <label>Orientation<select id="mo-orientation"><option value="landscape">Landscape</option><option value="portrait">Portrait</option></select></label>
            <label class="mo-custom">Width (mm)<input id="mo-paper-width" type="number" min="50" max="2000" value="420"></label><label class="mo-custom">Height (mm)<input id="mo-paper-height" type="number" min="50" max="2000" value="297"></label>
            <label>Margin (mm)<input id="mo-margin" type="number" min="0" max="100" value="10" step="1"></label>
            <label>Scale<select id="mo-scale"><option value="fit">Fit to one sheet</option><option value="percent">Percentage (100% = 96 px/in)</option><option value="ratio">Drawing scale 1:N</option></select></label>
            <label class="mo-percent">Scale (%)<input id="mo-percent" type="number" min="1" max="10000" value="100"></label>
            <label class="mo-ratio">Denominator N<input id="mo-denominator" type="number" min="0.01" max="100000" value="100" step="any"></label>
            <label class="mo-ratio">One map unit represents<select id="mo-units"><option value="px">1 pixel (96 px/in)</option><option value="mm">1 mm</option><option value="cm">1 cm</option><option value="m">1 m</option></select></label>
        </div>
        <label class="mo-check"><input id="mo-tile" type="checkbox" checked> Tile across sheets when needed</label>
        <div class="mo-grid"><label>Overlap (mm)<input id="mo-overlap" type="number" min="0" max="50" value="5"></label><label class="mo-check"><input id="mo-center" type="checkbox" checked> Center drawing</label></div></fieldset>
        <fieldset><legend>Appearance</legend>
            <label>Colors<select id="mo-colors"><option value="color">Color</option><option value="gray">Grayscale</option></select></label>
            <div class="mo-grid"><label class="mo-check"><input id="mo-grid" type="checkbox"> Grid</label><label class="mo-check"><input id="mo-title-block" type="checkbox" checked> Title and sheet number</label><label class="mo-check"><input id="mo-crop" type="checkbox" checked> Tile cut marks</label><label class="mo-check"><input id="mo-comments" type="checkbox" checked> Comment appendix</label></div>
            <label>Image resolution<select id="mo-dpi"><option value="96">96 DPI</option><option value="150" selected>150 DPI</option><option value="300">300 DPI</option><option value="600">600 DPI</option></select></label>
        </fieldset>
    </form><section class="mo-preview-panel"><div class="mo-preview-heading"><strong>Preview</strong><span id="mo-summary"></span></div><div id="mo-preview"></div><p id="mo-note">Paper and scale apply to Print and PDF. SVG / PNG / JPEG use the selected drawing area.</p><p id="mo-error" role="alert" hidden></p><p id="mo-progress" role="status"></p></section></div>
    <footer class="mo-actions"><button id="mo-reset" type="button">Reset settings</button><div><select id="mo-format" aria-label="Export format"><option value="pdf">PDF · vector</option><option value="svg">SVG · vector</option><option value="png">PNG</option><option value="jpeg">JPEG</option><option value="json">MorMap JSON</option></select><button id="mo-export" type="button">Export</button><button id="mo-print" type="button" class="mo-primary">Print</button></div></footer>
</dialog>
<script src="{{ route('mormap.asset', ['file'=>'output-model.js']) }}?v={{ $mormapVersion }}" defer></script>
<script src="{{ route('mormap.asset', ['file'=>'output.js']) }}?v={{ $mormapVersion }}" defer></script>
