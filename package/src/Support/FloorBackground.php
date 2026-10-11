<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Support;

final class FloorBackground
{
    public static function validate(mixed $value): array
    {
        if (!is_array($value) || !is_string($value['image'] ?? null) || !preg_match('/^(?:[a-f0-9-]{36}|(?:stencil|symbol|logo)-[a-z0-9_-]{1,80})$/D', $value['image'])) throw new \InvalidArgumentException('Choose a floor background image.');
        $result = ['image' => $value['image']];
        foreach (['x' => [-100000, 100000], 'y' => [-100000, 100000], 'w' => [1, 16384], 'h' => [1, 16384], 'opacity' => [0.05, 1]] as $key => [$min, $max]) {
            $v = $value[$key] ?? null;
            if ((!is_int($v) && !is_float($v)) || !is_finite((float)$v) || $v < $min || $v > $max) throw new \InvalidArgumentException('Invalid floor background ' . $key . '.');
            $result[$key] = $v;
        }
        if (!is_bool($value['locked'] ?? null)) throw new \InvalidArgumentException('Invalid floor background lock.');
        $result['locked'] = $value['locked'];
        return $result;
    }
    public static function images(array $map): array
    {
        return array_values(array_unique(array_filter(array_map(fn($l) => $l['background']['image'] ?? null, $map['locations'] ?? []))));
    }
}
