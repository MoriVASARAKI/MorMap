@if (\Illuminate\Support\Facades\Route::has('mormap.home')
    && \Illuminate\Support\Facades\Route::has('mormap.asset')
    && \Illuminate\Support\Facades\Route::has('mormap.published'))
<a href="{{ route('mormap.home') }}">
    <img src="{{ route('mormap.asset', ['file'=>'mormap-logo.svg']) }}" alt="MorMap" style="width:112px;height:37px;object-fit:contain">
</a>
<script id="mormap-navigation-data" type="application/json">@json($mormapLinks)</script>
<script src="{{ route('mormap.asset', ['file' => 'navigation.js']) }}?v={{ \PortMap\LibreNMS\PortMapServiceProvider::VERSION }}" data-logo-url="{{ route('mormap.asset', ['file'=>'mormap-logo.svg']) }}" data-published-url="{{ route('mormap.published') }}" defer></script>
@endif
