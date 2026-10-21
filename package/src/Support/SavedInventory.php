<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Support;

/** Only an unchanged saved binding may survive an inventory deletion/reassignment. */
final class SavedInventory
{
    public static function device(array $before, array $device): bool
    {
        foreach ($before['equipment'] ?? $before['nodes'] ?? [] as $old) {
            if ($old['id'] === $device['id'] && !empty($old['device_id'])
                && (int)$old['device_id'] === (int)($device['device_id'] ?? 0)) return true;
        }
        return false;
    }
    public static function portOwners(array $before): array
    {
        $owners=[];
        if (isset($before['equipment'])) {
            foreach ($before['equipment'] as $device) foreach ($device['ports'] as $port) {
                if (!empty($port['port_id']) && !empty($device['device_id'])) $owners[(int)$port['port_id']]=(int)$device['device_id'];
            }
        } else {
            $nodes=array_column($before['nodes'] ?? [], null, 'id');
            foreach ($before['anchors'] ?? [] as $port) {
                $owner=$nodes[$port['node_id']]['device_id'] ?? null;
                if (!empty($port['port_id']) && $owner) $owners[(int)$port['port_id']]=(int)$owner;
            }
        }
        return $owners;
    }
}
