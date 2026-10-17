<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Support;

use App\Facades\LibrenmsConfig;

/** Inventory classification, never the map image, hostname or a previous assignment. */
final class VirtualizationEligibility
{
    public static function describe(object $device, bool $discoveredHost = false): array
    {
        $os=(string)($device->os??'');
        $type=strtolower(trim((string)($device->type??'')));
        $osType=strtolower(trim((string)LibrenmsConfig::getOsSetting($os,'type','')));
        $reason='';
        if ($osType!=='' && $osType!=='server') {
            $reason='LibreNMS classifies this operating system as '.$osType.', not server.';
        } elseif ($type!=='' && $type!=='server') {
            $reason='LibreNMS classifies this device as '.$type.', not server.';
        } elseif ($osType!=='server' && $type!=='server') {
            $reason='LibreNMS has not identified this device as a server. Verify its OS and device type.';
        }
        $eligible=$reason==='';
        return ['type'=>$type,'os_type'=>$osType,'can_host'=>$eligible,'can_guest'=>$eligible,
            'virtualization_reason'=>$reason,'is_hypervisor'=>$eligible&&($discoveredHost||$os==='vmware-esxi')];
    }
}
