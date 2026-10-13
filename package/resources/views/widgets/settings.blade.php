@extends('widgets.settings.base')

@section('form')
    <div class="form-group">
        <label for="mormap-title-{{ $id }}" class="control-label">{{ __('Widget title') }}</label>
        <input type="text" class="form-control" name="title" id="mormap-title-{{ $id }}" maxlength="120" value="{{ $title }}" placeholder="MorMap">
    </div>
    <div class="form-group">
        <label for="mormap-map-{{ $id }}" class="control-label">MorMap</label>
        <select class="form-control" name="mormap_map" id="mormap-map-{{ $id }}" required>
            <option value="">{{ __('Select Map') }}</option>
            @foreach ($maps as $published)
                <option value="{{ $published['key'] }}" @selected($map && $published['key'] === $map['key'])>{{ $published['name'] }}</option>
            @endforeach
        </select>
        @if (!$maps)
            <p class="help-block">No maps have been published yet. Open MorMap, then Save and Publish a Logical or Physical map.</p>
        @elseif ($mormap_map && !$map)
            <p class="help-block">The previously selected map is no longer published. Select another map.</p>
        @endif
    </div>
@endsection
