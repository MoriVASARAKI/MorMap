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
        return (new WorkspaceTransaction(storage_path('app/mormap')))->run(function () use ($request, $next) {
            // Reconcile on map/infrastructure reads and status refreshes. Edits
            // retain their revision checks, and Undo remains an explicit action.
            $path = '/'.$request->path();
            $inventoryRead = ($request->isMethod('GET') && preg_match('~/(?:infrastructure|maps(?:/[a-f0-9-]{36})?|view/[a-f0-9-]{36}/data)$~D', $path))
                || ($request->isMethod('POST') && str_ends_with($path, '/status'));
            if ($inventoryRead && $request->user()?->can('admin') === true
                && app(\LibreNMS\Interfaces\Plugins\PluginManagerInterface::class)->pluginEnabled(\PortMap\LibreNMS\PortMapServiceProvider::SLUG)) {
                \PortMap\LibreNMS\Support\InfrastructureInventory::reconcile(storage_path('app/mormap'));
            }
            return $next($request);
        });
    }
}
