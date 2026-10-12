@extends('layouts.librenmsv1')
@section('content')
<div class="container-fluid"><p>To display a published map on a LibreNMS dashboard, add a <strong>Notes</strong> widget, then paste the copied iframe HTML. Your LibreNMS session permissions still apply.</p><div class="panel panel-default"><div class="panel-heading"><h3 class="panel-title">MorMap maps</h3></div><div class="panel-body">
    @forelse ($maps as $map)
        <div class="well well-sm" style="margin-bottom:10px">
            <a href="{{ $map['url'] }}">{{ $map['name'] }}</a>
            <button type="button" class="btn btn-xs btn-default pull-right" data-mormap-copy-embed data-url="{{ $map['url'] }}">Copy dashboard embed</button>
            <div class="mormap-embed-fallback" hidden style="clear:both;padding-top:10px">
                <label style="display:block">Dashboard embed HTML
                    <textarea class="form-control" rows="3" readonly aria-label="Dashboard embed HTML"></textarea>
                </label>
            </div>
            <small class="mormap-embed-status" role="status" aria-live="polite" style="display:block;clear:both"></small>
        </div>
    @empty
        <p>No maps have been published yet.</p>
    @endforelse
</div></div></div>
<script>
(function(){
    'use strict';
    document.querySelectorAll('[data-mormap-copy-embed]').forEach(button=>{
        button.addEventListener('click',async()=>{
            const row=button.closest('.well'),fallback=row.querySelector('.mormap-embed-fallback'),field=fallback.querySelector('textarea'),status=row.querySelector('.mormap-embed-status');
            const src=button.dataset.url.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            const snippet='<iframe src="'+src+'" width="100%" height="600" frameborder="0"></iframe>';
            field.value=snippet;
            try{
                if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
                await navigator.clipboard.writeText(snippet);
                fallback.hidden=true;
                status.textContent='Copied.';
            }catch(e){
                fallback.hidden=false;
                field.focus();
                field.select();
                status.textContent='Copy the selected HTML with Ctrl+C or Cmd+C, then paste it into a Notes widget.';
            }
        });
    });
})();
</script>
@endsection
