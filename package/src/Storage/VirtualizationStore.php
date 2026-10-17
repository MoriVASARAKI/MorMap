<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Storage;

/** Manual inventory relationships, independent of network ports and cables. */
final class VirtualizationStore
{
    public const FILE = 'virtualization/guests.json';
    public function __construct(private string $root) {}
    public function snapshot(): array
    {
        $file = $this->root.'/'.self::FILE;
        return is_file($file) ? json_decode(file_get_contents($file), true, 512, JSON_THROW_ON_ERROR)
            : ['schema'=>1, 'revision'=>0, 'assignments'=>[]];
    }
    public static function validate(array $state): void
    {
        $assignments = $state['assignments'] ?? [];
        if (count($assignments) > 10000) throw new \InvalidArgumentException('Maximum 10000 virtual guests.');
        foreach ($assignments as $key=>$guest) {
            if ($key !== 'device-'.$guest['device_id'] || !is_int($guest['device_id']) || $guest['device_id'] < 1
                || !is_int($guest['host_id']) || $guest['host_id'] < 1 || !in_array($guest['kind'], ['vm','ct'], true)
                || !is_string($guest['vmid']) || mb_strlen($guest['vmid']) > 80) {
                throw new \InvalidArgumentException('Invalid virtual guest assignment.');
            }
            $seen = [$guest['device_id']=>true]; $parent = $guest['host_id'];
            while ($parent) {
                if (isset($seen[$parent])) throw new \InvalidArgumentException('A hypervisor cannot be its own guest, directly or through another host.');
                $seen[$parent] = true;
                $parent = $assignments['device-'.$parent]['host_id'] ?? null;
            }
        }
    }
    /** Caller holds the workspace lock; assignment keys guarantee one host per guest. */
    public function change(int $revision, array $changes, array $context): array
    {
        $state = $this->snapshot();
        if ($state['revision'] !== $revision) throw new \UnexpectedValueException('Virtual guest assignments changed in another tab. Refresh this panel before applying your selection.');
        foreach ($changes as $guest) {
            $key = 'device-'.$guest['device_id'];
            if ($guest['host_id'] === null) unset($state['assignments'][$key]);
            else $state['assignments'][$key] = $guest;
        }
        self::validate($state);
        $state['revision']++;
        $token = (new UndoStore($this->root))->apply([self::FILE=>$state], [], [], $context);
        return ['revision'=>$state['revision'], 'undo_token'=>$token];
    }
}
