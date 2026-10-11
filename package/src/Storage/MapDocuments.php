<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Storage;

/** Document metadata/deletion. HTTP callers hold the WorkspaceTransaction lock. */
final class MapDocuments
{
    public function __construct(private string $root) {}

    public function change(string $workspace, string $id, int $revision, int $infrastructureRevision, ?string $name): array
    {
        if (!in_array($workspace, ['logical', 'physical'], true)) throw new \InvalidArgumentException('Invalid workspace.');
        if ($name !== null && (trim($name) === '' || mb_strlen(trim($name)) > 120)) throw new \InvalidArgumentException('Name must have 1–120 characters.');
        $prefix = $workspace === 'physical' ? 'physical/' : '';
        $store = new MapStore($this->root . '/' . $prefix . 'maps');
        $map = $store->read($id);
        if ($map === null) throw new \OutOfBoundsException('This map was deleted. Choose another map.');
        if ($map['revision'] !== $revision) throw new \UnexpectedValueException('Map changed in another tab. Reload before continuing.');
        $graph = (new InfrastructureStore($this->root))->snapshot();
        if ($graph['revision'] !== $infrastructureRevision) throw new \UnexpectedValueException('Shared infrastructure changed. Reload before continuing.');
        $published = (new MapStore($this->root . '/' . $prefix . 'published'))->read($id);
        $original = $graph;
        if ($workspace === 'physical') {
            foreach ($graph['devices'] as &$device) {
                foreach ($device['placements'] ?? [] as $key => $place) if (($place['plan_id'] ?? null) === $id) {
                    if ($name === null) unset($device['placements'][$key]);
                    else $device['placements'][$key]['plan_name'] = trim($name);
                }
                if (($device['physical']['plan_id'] ?? null) === $id) {
                    if ($name !== null) $device['physical']['plan_name'] = trim($name);
                    else { unset($device['physical']); if (!empty($device['placements'])) $device['physical'] = reset($device['placements']); }
                }
            }
            unset($device);
        }
        if ($name === null) $graph['migration_conflicts'] = array_values(array_filter($graph['migration_conflicts'] ?? [], fn($c) => ($c['workspace'] ?? null) !== $workspace || ($c['map_id'] ?? null) !== $id));
        if ($graph !== $original || $name === null) $graph['revision']++;
        $writes = []; $deletes = [];
        if ($name === null) {
            $deletes = [$prefix . 'maps/' . $id . '.json', $prefix . 'published/' . $id . '.json'];
        } else {
            $map['name'] = trim($name); $map['revision']++; $map['updated_at'] = gmdate('c');
            $map['infrastructure_revision'] = $graph['revision'];
            $writes[$prefix . 'maps/' . $id . '.json'] = $map;
            if ($published !== null) {
                $published['name'] = $map['name']; $published['revision']++; $published['updated_at'] = $map['updated_at'];
                $writes[$prefix . 'published/' . $id . '.json'] = $published;
            }
        }
        if ($graph !== $original) $writes['infrastructure/graph.json'] = $graph;
        if($name===null)$token=(new UndoStore($this->root))->apply($writes,$deletes,[],['workspace'=>$workspace,'map_id'=>$id]);
        else (new WorkspaceTransaction($this->root))->apply($writes,$deletes);
        return $name === null ? ['deleted' => true, 'undo_token'=>$token, 'infrastructure_revision' => $graph['revision']] : $map + ['infrastructure' => $graph];
    }
}
