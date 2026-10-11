<header class="mm-chrome" aria-label="MorMap header">
    @unless($readOnly ?? false)<nav class="mm-chrome-tabs" aria-label="Workspace">
        <a href="{{ route('mormap.home') }}" class="{{ $activeWorkspace === 'logical' ? 'active' : '' }}" @if($activeWorkspace === 'logical') aria-current="page" @endif>Logical</a>
        <a href="{{ route('mormap.physical.home') }}" class="{{ $activeWorkspace === 'physical' ? 'active' : '' }}" @if($activeWorkspace === 'physical') aria-current="page" @endif>Physical</a>
        <a href="{{ route('mormap.library.home') }}" class="{{ $activeWorkspace === 'library' ? 'active' : '' }}" @if($activeWorkspace === 'library') aria-current="page" @endif>Asset library</a>
    </nav>@endunless
    @if(!empty($stateId))<span id="{{ $stateId }}" class="mm-chrome-state" role="status">Loading…</span>@endif
    <a class="mm-chrome-brand" href="{{ route('mormap.home') }}" aria-label="MorMap"><img src="{{ route('mormap.asset', ['file'=>'mormap-logo.svg']) }}" alt="MorMap"><span>{{ $mormapVersion }}</span></a>
</header>
