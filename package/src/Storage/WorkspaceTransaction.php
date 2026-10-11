<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Storage;

/** Serializes map/asset operations and recovers interrupted multi-file replacements. */
final class WorkspaceTransaction
{
    public function __construct(private string $root) {}
    public function run(callable $operation): mixed
    {
        if (!is_dir($this->root) && !mkdir($this->root, 0770, true)) throw new \RuntimeException('Cannot open MorMap storage.');
        $lock = fopen($this->root . '/workspace.lock', 'c');
        if (!$lock) throw new \RuntimeException('Cannot open workspace lock.');
        try {
            if (!flock($lock, LOCK_EX)) throw new \RuntimeException('Cannot lock workspace.');
            $this->recover();
            return $operation();
        } finally { flock($lock, LOCK_UN); fclose($lock); }
    }
    private function path(string $relative): string
    {
        if (!preg_match('~^(?:(?:physical/)?(?:maps|published)/[a-f0-9-]{36}\.json|infrastructure/graph\.json|undo/[a-f0-9]{48}\.json|assets/(?:[a-f0-9-]{36}|stencil-[a-z0-9-]{1,80})\.json|images/[a-f0-9-]{36})$~D', $relative)) throw new \RuntimeException('Invalid asset transaction path.');
        return $this->root . '/' . $relative;
    }
    private function atomic(string $path, string $bytes): void
    {
        if(!is_dir(dirname($path))&&!mkdir(dirname($path),0770,true)&&!is_dir(dirname($path)))throw new \RuntimeException('Cannot create asset storage.');
        $temporary = tempnam(dirname($path), '.asset-change-');
        try {
            if (!$temporary || file_put_contents($temporary, $bytes, LOCK_EX) === false) throw new \RuntimeException('Cannot write asset replacement.');
            chmod($temporary, 0660);
            if (!rename($temporary, $path)) throw new \RuntimeException('Cannot apply asset replacement.');
        } finally { if ($temporary && is_file($temporary)) unlink($temporary); }
    }
    /** Call while holding the workspace lock. Durable journal contains after-images. */
    public function apply(array $writes, array $deletes, array $blobs=[]): void
    {
        foreach (array_merge(array_keys($writes), $deletes, array_keys($blobs)) as $path) $this->path($path);
        $this->atomic($this->root . '/asset-transaction.json', json_encode(['writes'=>$writes,'deletes'=>$deletes,'blobs'=>$blobs], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));
        $this->recover();
    }
    public function recover(): void
    {
        $file = $this->root . '/asset-transaction.json';
        if (!is_file($file)) return;
        $job = json_decode(file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
        foreach ($job['writes'] as $path=>$value) $this->atomic($this->path($path), json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));
        foreach ($job['blobs']??[] as $path=>$bytes) {$decoded=base64_decode($bytes,true);if($decoded===false)throw new \RuntimeException('Invalid undo image data.');$this->atomic($this->path($path),$decoded);}
        foreach ($job['deletes'] as $relative) { $path=$this->path($relative); if (is_file($path) && !unlink($path)) throw new \RuntimeException('Cannot remove the unused asset.'); }
        if (!unlink($file)) throw new \RuntimeException('Cannot finalize asset replacement.');
    }
}
