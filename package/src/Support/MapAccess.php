<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Support;

use App\Models\Device;
use PortMap\LibreNMS\Storage\MapStore;
use PortMap\LibreNMS\Storage\InfrastructureStore;

/** Published maps follow LibreNMS device policies; editing remains administrative. */
final class MapAccess
{
    private array $permissions = [];
    public function __construct(private mixed $user = null) { $this->user ??= auth()->user(); }
    public function admin(): bool { return $this->user?->can('admin') === true; }
    public function globalRead(): bool { return $this->admin() || $this->user?->can('global-read') === true; }
    public function allowedDeviceIds(array $ids): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids), fn($id) => $id > 0)));
        if (!$this->user) return [];
        if ($this->globalRead()) return $ids;
        $unknown = array_values(array_diff($ids, array_keys($this->permissions)));
        foreach ($unknown as $id) $this->permissions[$id] = false;
        if ($unknown) foreach (Device::whereIn('device_id', $unknown)->get() as $device) {
            $this->permissions[(int)$device->device_id] = $this->user->can('view', $device);
        }
        return array_values(array_filter($ids, fn($id) => $this->permissions[$id]));
    }
    public function canView(array $map): bool
    {
        if (!$this->user) return false;
        if ($this->globalRead()) return true;
        $ids = array_values(array_unique(array_filter(array_column($map['equipment'] ?? $map['nodes'] ?? [], 'device_id'))));
        return $ids !== [] && count($this->allowedDeviceIds($ids)) === count($ids);
    }
    public function assertView(array $map): void
    {
        abort_unless($this->canView($map), 403, 'This published map requires permission to view all of its LibreNMS devices.');
    }
    public function decorate(array $map, array $graph): array
    {
        $map['infrastructure'] = $this->graph($graph, $map);
        $map['infrastructure_revision'] = $graph['revision'];
        return $map;
    }
    /** Do not expose other users' equipment or unpublished placement metadata. */
    public function graph(array $graph, array $map): array
    {
        if ($this->admin()) return $graph;
        $allowed = array_fill_keys($this->allowedDeviceIds(array_column($graph['devices'], 'device_id')), true);
        $manual = []; $placements = [];
        $maps = [$map];
        foreach (['published', 'physical/published'] as $directory) {
            $store = new MapStore(storage_path('app/mormap/'.$directory));
            foreach ($store->all() as $summary) {
                $published = $store->read($summary['id']);
                if ($published && $this->canView($published)) $maps[] = $published;
            }
        }
        foreach ($maps as $published) {
            $locations = array_column($published['locations'] ?? [], null, 'id');
            foreach ($published['equipment'] ?? $published['nodes'] ?? [] as $device) {
                $ref = InfrastructureStore::deviceRef($device);
                if (empty($device['device_id'])) $manual[$ref] = true;
                if (($published['kind'] ?? '') !== 'physical') continue;
                $path = []; $hierarchy = []; $parent = $device['parent_id'] ?? null;
                $seen=[];
                while ($parent && isset($locations[$parent]) && !isset($seen[$parent])) {
                    $seen[$parent]=true;
                    $location = $locations[$parent];
                    array_unshift($path, $location['name']);
                    $hierarchy[$location['type']]=['id'=>$location['id'], 'name'=>$location['name']];
                    $parent = $location['parent_id'];
                }
                $key = $published['id'].(isset($device['stack_member']) ? ':member:'.$device['stack_member'] : '');
                $placements[$ref][$key] = ['plan_id'=>$published['id'], 'plan_name'=>$published['name'],
                    'location_id'=>$device['parent_id'], 'path'=>implode(' / ', $path), 'hierarchy'=>$hierarchy,
                    'rack_u'=>$device['rack_u'], 'rack_units'=>$device['rack_units'], 'stack_member'=>$device['stack_member'] ?? null,
                    'equipment_id'=>$device['id'], 'port_refs'=>array_map([InfrastructureStore::class, 'portRef'], $device['ports'])];
            }
        }
        $graph['devices'] = array_filter($graph['devices'], fn($d) => !empty($d['device_id']) ? isset($allowed[(int)$d['device_id']]) : isset($manual[$d['id']]));
        $graph['ports'] = array_filter($graph['ports'], fn($p) => isset($graph['devices'][$p['device_ref']]));
        foreach ($graph['devices'] as $ref => &$device) {
            unset($device['physical'], $device['placements']);
            if (!empty($placements[$ref])) { $device['placements'] = $placements[$ref]; $device['physical'] = reset($placements[$ref]); }
        }
        unset($device);
        foreach (['connections','disconnected','logical_connections','logical_disconnected'] as $key) {
            $graph[$key] = array_filter($graph[$key] ?? [], fn($c) => isset($graph['ports'][$c['source']], $graph['ports'][$c['target']]));
        }
        foreach ($graph['ports'] as &$port) if (!empty($port['peer_id']) && !isset($graph['ports'][$port['peer_id']])) $port['peer_id'] = null;
        unset($port);
        $graph['inventory_issues'] = array_intersect_key($graph['inventory_issues'] ?? [], $graph['ports']);
        $graph['migration_conflicts'] = [];
        $graph['published_only'] = true;
        return $graph;
    }
}
