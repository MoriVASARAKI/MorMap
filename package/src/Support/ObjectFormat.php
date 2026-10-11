<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Support;

/** Optional equipment/asset presentation, independent of monitoring and identity. */
final class ObjectFormat
{
    public static function validate(mixed $value): array
    {
        if (!is_array($value) || array_diff(array_keys($value), ['opacity','label_size','label_color','label_bold'])) {
            throw new \InvalidArgumentException('Invalid object format.');
        }
        $result = [];
        foreach (['opacity'=>[.1,1], 'label_size'=>[4,72]] as $key=>$range) {
            if (!array_key_exists($key,$value)) continue;
            $n = $value[$key];
            if (!is_numeric($n) || !is_finite((float)$n) || $n<$range[0] || $n>$range[1]) throw new \InvalidArgumentException('Invalid '.$key.'.');
            $result[$key] = (float)$n;
        }
        if (array_key_exists('label_color',$value)) {
            if (!is_string($value['label_color']) || !preg_match('/^#[a-fA-F0-9]{6}$/D',$value['label_color'])) throw new \InvalidArgumentException('Invalid label color.');
            $result['label_color']=$value['label_color'];
        }
        if (array_key_exists('label_bold',$value)) {
            if (!is_bool($value['label_bold'])) throw new \InvalidArgumentException('Invalid label weight.');
            $result['label_bold']=$value['label_bold'];
        }
        return $result;
    }
}
