@if ($map)
    <div class="mormap-dashboard-widget" data-reload="false" style="width:100%;height:100%;min-height:180px">
        <iframe src="{{ $map['url'] }}?bare=yes&amp;mormap_embed=1" title="{{ $map['name'] }}" style="display:block;width:100%;height:100%;min-height:180px;border:0"></iframe>
    </div>
@else
    <div class="alert alert-info">
        @if ($mormap_map)
            The selected MorMap map is not published or is unavailable with your current permissions. A dashboard editor can select another accessible map in this widget's settings.
        @else
            Open this widget's settings and select a published MorMap map.
        @endif
    </div>
@endif
