<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Http;
use PortMap\LibreNMS\Storage\WorkspaceTransaction;

final class WorkspaceMiddleware
{
    public function handle($request, \Closure $next)
    {
        // Static resources and inventory queries do not read or change map files.
        if (preg_match('~/plugin/mormap/(?:assets/|devices(?:/|$)|ports/)~', '/'.$request->path())) return $next($request);
        return (new WorkspaceTransaction(storage_path('app/mormap')))->run(fn()=>$next($request));
    }
}
