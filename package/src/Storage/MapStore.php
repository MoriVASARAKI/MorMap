<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Storage;
/** Atomic files with revision checks; all users of this build must be administrators. */
final class MapStore
{
    public function __construct(private string $directory)
    {
        if (!is_dir($directory) && !mkdir($directory, 0770, true) && !is_dir($directory)) {
            throw new \RuntimeException('MorMap storage is not writable.');
        }
    }
    public function all(): array
    {
        $maps = [];
        foreach (glob($this->directory . '/*.json') ?: [] as $file) {
            $map = json_decode(file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
            $maps[] = ['id' => $map['id'], 'name' => $map['name'], 'revision' => $map['revision']];
        }
        usort($maps, fn ($a, $b) => strnatcasecmp($a['name'], $b['name']));
        return $maps;
    }
    public function read(string $id): ?array
    {
        $file = $this->path($id);
        return is_file($file) ? json_decode(file_get_contents($file), true, 512, JSON_THROW_ON_ERROR) : null;
    }
    public function save(string $id, int $expected, array $map): array
    {
        $file = $this->path($id);
        $lock = fopen($file . '.lock', 'c');
        if ($lock === false) { throw new \RuntimeException('Cannot open MorMap lock.'); }
        $temp = null;
        try {
            if (!flock($lock, LOCK_EX)) { throw new \RuntimeException('Cannot lock MorMap map.'); }
            $old = $this->read($id);
            if (($old['revision'] ?? 0) !== $expected) {
                throw new \UnexpectedValueException('Map changed in another tab. Reload it before saving.');
            }
            $map['id'] = $id;
            $map['revision'] = $expected + 1;
            $map['updated_at'] = gmdate('c');
            $temp = tempnam($this->directory, '.writing-');
            if ($temp === false || file_put_contents($temp, json_encode($map, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)) === false) {
                throw new \RuntimeException('Cannot write MorMap map.');
            }
            chmod($temp, 0660);
            if (!rename($temp, $file)) { throw new \RuntimeException('Cannot replace MorMap map.'); }
            return $map;
        } finally {
            if ($temp && is_file($temp)) { unlink($temp); }
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
    /** Publish one saved revision. Later draft edits do not change the snapshot. */
    public function publish(string $id, int $expected, self $destination): array
    {
        $lock = fopen($this->path($id) . '.lock', 'c');
        if ($lock === false) { throw new \RuntimeException('Cannot open draft lock.'); }
        try {
            if (!flock($lock, LOCK_EX)) { throw new \RuntimeException('Cannot lock draft.'); }
            $draft = $this->read($id);
            if ($draft === null || $draft['revision'] !== $expected) {
                throw new \UnexpectedValueException('Draft changed. Reload and save before publishing.');
            }
            $draft['source_revision'] = $expected;
            $draft['published_at'] = gmdate('c');
            $old = $destination->read($id);
            return $destination->save($id, (int) ($old['revision'] ?? 0), $draft);
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    private function path(string $id): string
    {
        if (!preg_match('/^[a-f0-9-]{36}$/D', $id)) { throw new \InvalidArgumentException('Invalid map ID.'); }
        return $this->directory . '/' . $id . '.json';
    }
}
