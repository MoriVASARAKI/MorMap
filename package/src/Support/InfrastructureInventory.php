<?php

declare(strict_types=1);

namespace PortMap\LibreNMS\Support;

use Illuminate\Support\Facades\DB;
use PortMap\LibreNMS\Storage\InfrastructureStore;

/** Verify IDs against LibreNMS; never infer deletion from a filtered status response. */
final class InfrastructureInventory
{
    public static function reconcile(string $root): array
    {
        $store = new InfrastructureStore($root);
        $graph = $store->snapshot();
        $deviceIds = [];
        $portIds = [];
        foreach ($graph['ports'] as $ref => $port) {
            $owner = $port['device_ref'] ?? '';
            if (str_starts_with($owner, 'lnms:device:')) $deviceIds[] = (int) substr($owner, 12);
            if (str_starts_with($ref, 'lnms:port:')) $portIds[] = (int) substr($ref, 10);
        }
        // All queries must succeed before any graph write. Chunking avoids SQL
        // parameter limits with large inventories; no status or permission filter.
        $devices = [];
        foreach (array_chunk(array_unique($deviceIds), 500) as $ids) {
            foreach (DB::table('devices')->whereIn('device_id', $ids)->pluck('device_id') as $id) $devices[(int) $id] = true;
        }
        $ports = [];
        foreach (array_chunk(array_unique($portIds), 500) as $ids) {
            foreach (DB::table('ports')->whereIn('port_id', $ids)->where('deleted', 0)->pluck('device_id', 'port_id') as $id => $owner) $ports[(int) $id] = (int) $owner;
        }
        return $store->reconcileInventory($graph['revision'], $devices, $ports);
    }
}
