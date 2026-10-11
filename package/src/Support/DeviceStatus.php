<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Support;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class DeviceStatus
{
    /** Devices.ip may be an INET-packed binary string; never serialize those bytes. */
    public static function resolvedIp(?string $ip, string $hostname = ''): string
    {
        if ($ip !== null && filter_var($ip, FILTER_VALIDATE_IP)) { return $ip; }
        if ($ip !== null && in_array(strlen($ip), [4, 16], true)) {
            $decoded = inet_ntop($ip);
            if ($decoded !== false) { return $decoded; }
        }
        return filter_var($hostname, FILTER_VALIDATE_IP) ? $hostname : 'Unavailable';
    }

    public static function devices(array $ids)
    {
        $fields=['device_id','sysName','hostname','ip','status','disabled','last_polled','status_reason'];
        foreach(['location_id','sysLocation','location'] as $field)if(Schema::hasColumn('devices',$field))$fields[]=$field;
        $locations=Schema::hasTable('locations')&&Schema::hasColumn('locations','id')&&Schema::hasColumn('locations','location')?DB::table('locations')->pluck('location','id')->all():[];
        return DB::table('devices')->whereIn('device_id', $ids)
            ->select($fields)
            ->get()->map(static function ($device) use ($locations) {
                return [
                    'device_id' => $device->device_id, 'sysName' => $device->sysName,
                    'resolved_ip' => self::resolvedIp($device->ip, $device->hostname),
                    'location' => $locations[$device->location_id??0]??($device->sysLocation??$device->location??null),
                    'status' => $device->status, 'disabled' => $device->disabled,
                    'last_polled' => $device->last_polled, 'status_reason' => $device->status_reason,
                ];
            });
    }

    public static function ports(array $ids)
    {
        return DB::table('ports')->whereIn('port_id', $ids)->where('deleted', 0)
            ->select('port_id', 'device_id', 'ifOperStatus', 'ifAdminStatus')->get();
    }
    public static function portsForDevices(array $ids)
    {
        $fields=['port_id','device_id','ifName','ifDescr','ifAlias','ifIndex','ifOperStatus','ifAdminStatus'];
        foreach(['ifSpeed','ifHighSpeed','ifInOctets_rate','ifOutOctets_rate'] as $field)if(Schema::hasColumn('ports',$field))$fields[]=$field;
        return DB::table('ports')->whereIn('device_id', $ids)->where('deleted', 0)
            ->select($fields)
            ->orderBy('device_id')->orderBy('ifIndex')->get();
    }
    /** Optional discovery columns differ between LibreNMS releases and device vendors. */
    private static function columns(string $table, array $wanted): array
    {
        return Schema::hasTable($table) ? array_values(array_intersect($wanted, Schema::getColumnListing($table))) : [];
    }

    public static function details(int $id): array
    {
        $fields=['port_id','device_id','ifName','ifDescr','ifAlias','ifOperStatus','ifAdminStatus'];
        $fields=array_merge($fields,self::columns('ports',['ifVlan','ifTrunk','ifDuplex','ifType','ifSpeed','ifHighSpeed','ifPhysAddress']));
        $port=DB::table('ports')->where('port_id',$id)->where('deleted',0)->first($fields);abort_unless($port,404);
        $device=DB::table('devices')->where('device_id',$port->device_id)->first(['device_id','sysName','hostname','ip']);
        $result=['interface'=>(array)$port,'device'=>$device?['device_id'=>$device->device_id,'name'=>$device->sysName?:$device->hostname,'resolved_ip'=>self::resolvedIp($device->ip,$device->hostname)]:null,'addresses'=>[],'neighbors'=>[],'vlans'=>[]];
        foreach(['ipv4_addresses'=>'ipv4_address','ipv6_addresses'=>'ipv6_address'] as $table=>$column)if(Schema::hasTable($table)&&Schema::hasColumn($table,'port_id')&&Schema::hasColumn($table,$column))$result['addresses']=array_merge($result['addresses'],DB::table($table)->where('port_id',$id)->pluck($column)->all());
        $columns=self::columns('links',['local_port_id','remote_port_id','remote_hostname','remote_port','remote_device_id','remote_ip','protocol','active']);
        if(in_array('local_port_id',$columns,true)){
            $query=DB::table('links')->where('local_port_id',$id);
            if(in_array('active',$columns,true))$query->where('active',1);
            $neighbors=$query->get($columns)->all();
            $deviceIds=array_values(array_unique(array_filter(array_column($neighbors,'remote_device_id'))));
            $portIds=array_values(array_unique(array_filter(array_column($neighbors,'remote_port_id'))));
            $remoteDevices=$deviceIds?DB::table('devices')->whereIn('device_id',$deviceIds)->get(['device_id','sysName','hostname','ip'])->keyBy('device_id')->all():[];
            $remotePorts=$portIds?DB::table('ports')->whereIn('port_id',$portIds)->where('deleted',0)->get(['port_id','ifName','ifDescr'])->keyBy('port_id')->all():[];
            foreach($neighbors as $entry){
                $n=(array)$entry;$remote=$remoteDevices[$n['remote_device_id']??0]??null;$remotePort=$remotePorts[$n['remote_port_id']??0]??null;
                $n['remote_name']=$n['remote_hostname']??'';
                if($remote&&(!$n['remote_name']||filter_var($n['remote_name'],FILTER_VALIDATE_IP)))$n['remote_name']=$remote->sysName?:$remote->hostname;
                $n['remote_ip']=self::resolvedIp($n['remote_ip']??null,$n['remote_hostname']??'');
                if($n['remote_ip']==='Unavailable'&&$remote)$n['remote_ip']=self::resolvedIp($remote->ip,$remote->hostname);
                if(empty($n['remote_port'])&&$remotePort)$n['remote_port']=$remotePort->ifName?:$remotePort->ifDescr;
                $result['neighbors'][]=$n;
            }
        }
        // Return every discovered membership, not just the first 200. A vlan_id is a
        // database row ID on some releases; only vlan / port_vlan are VLAN numbers.
        $columns=self::columns('ports_vlans',['port_id','vlan','port_vlan','untagged','voice']);
        if(in_array('port_id',$columns,true))$result['vlans']=DB::table('ports_vlans')->where('port_id',$id)->get($columns)->all();
        return $result;
    }
}
