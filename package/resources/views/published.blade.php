@extends('layouts.librenmsv1')
@section('content')
<div class="container-fluid"><div class="panel panel-default"><div class="panel-heading"><h3 class="panel-title">MorMap maps</h3></div><div class="panel-body">
    @forelse ($maps as $map)
        <p><a href="{{ $map['url'] }}">{{ $map['name'] }}</a></p>
    @empty
        <p>No maps have been published yet.</p>
    @endforelse
</div></div></div>
@endsection
