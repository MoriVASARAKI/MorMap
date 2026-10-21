<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Http;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\{DB, Schema};
use LibreNMS\Interfaces\Plugins\PluginManagerInterface;
use LibreNMS\Util\Url;
use PortMap\LibreNMS\PortMapServiceProvider;
use PortMap\LibreNMS\Storage\VirtualizationStore;
use PortMap\LibreNMS\Support\DeviceStatus;
use PortMap\LibreNMS\Support\MapAccess;
use PortMap\LibreNMS\Support\VirtualizationEligibility;

final class VirtualizationController extends Controller
{
    public function __construct()
    {
        $this->middleware(function (Request $request, $next) {
            abort_unless(app(PluginManagerInterface::class)->pluginEnabled(PortMapServiceProvider::SLUG),404);
            abort_unless($request->user() && ($request->user()->can('admin') || $request->route()->getActionMethod()==='index'),403);
            return $next($request);
        });
    }
    private function store(): VirtualizationStore { return new VirtualizationStore(storage_path('app/mormap')); }
    private function discoveredHosts(array $ids): array
    {
        $hosts=[];
        if (Schema::hasTable('vminfo') && Schema::hasColumn('vminfo','device_id')) {
            $hosts=DB::table('vminfo')->whereIn('device_id',$ids)->distinct()->pluck('device_id')->all();
        }
        if (Schema::hasTable('applications') && Schema::hasColumns('applications',['device_id','app_type'])) {
            $query=DB::table('applications')->whereIn('device_id',$ids)->where('app_type','proxmox');
            if (Schema::hasColumn('applications','deleted_at')) $query->whereNull('deleted_at');
            $hosts=[...$hosts,...$query->distinct()->pluck('device_id')->all()];
        }
        return array_fill_keys(array_map('intval',$hosts),true);
    }
    private function records(array $ids): array
    {
        if (!$ids) return [];
        $ids=array_values(array_unique($ids)); $hosts=$this->discoveredHosts($ids);
        $columns=array_values(array_intersect(['device_id','sysName','hostname','ip','os','type','features','icon','status','disabled','last_polled'], Schema::getColumnListing('devices')));
        return DB::table('devices')->whereIn('device_id',$ids)->get($columns)->map(static function ($d) use ($hosts) {
            return ['device_id'=>(int)$d->device_id,'name'=>$d->sysName?:$d->hostname,
                'hostname'=>$d->hostname,'resolved_ip'=>DeviceStatus::resolvedIp($d->ip??null,$d->hostname),
                'os_icon'=>asset('images/os/'.Url::findOsImage($d->os??'', $d->features??null, $d->icon??null)),
                'os'=>$d->os??'', 'status'=>$d->status??null,'disabled'=>$d->disabled??null,'last_polled'=>$d->last_polled??null]
                +VirtualizationEligibility::describe($d,isset($hosts[(int)$d->device_id]));
        })->all();
    }
    public function index(Request $request)
    {
        $v=$request->validate(['hosts'=>'sometimes|array|max:500','hosts.*'=>'integer|min:1|distinct']);
        $access=new MapAccess();$hosts=$access->allowedDeviceIds($v['hosts']??[]); $state=$this->store()->snapshot();
        $rows=array_values(array_filter($state['assignments'],fn($g)=>in_array($g['host_id'],$hosts,true)||in_array($g['device_id'],$hosts,true)));
        $allowed=array_fill_keys($access->allowedDeviceIds([...$hosts,...array_column($rows,'device_id'),...array_column($rows,'host_id')]),true);
        $rows=array_values(array_filter($rows,fn($g)=>isset($allowed[$g['host_id']],$allowed[$g['device_id']])));
        return response()->json(['revision'=>$state['revision'],'assignments'=>$rows,'devices'=>$this->records([...$hosts,...array_column($rows,'device_id'),...array_column($rows,'host_id')])]);
    }
    public function devices(Request $request)
    {
        $v=$request->validate(['q'=>'nullable|string|max:200','page'=>'sometimes|integer|between:1,100000']);
        $q=trim($v['q']??''); $query=DB::table('devices');
        if ($q!=='') $query->where(function ($where) use ($q) {
            $where->where('sysName','like','%'.$q.'%')->orWhere('hostname','like','%'.$q.'%');
            if (ctype_digit($q)) $where->orWhere('device_id',(int)$q);
            if (filter_var($q,FILTER_VALIDATE_IP)) $where->orWhere('ip',inet_pton($q))->orWhere('ip',$q);
        });
        $ids=$query->orderBy('device_id')->offset((($v['page']??1)-1)*50)->limit(51)->pluck('device_id')->all();
        $more=count($ids)>50; $ids=array_slice($ids,0,50); $rows=$this->records($ids); $state=$this->store()->snapshot();
        $parents=[];
        foreach ($rows as &$d) { $d['assignment']=$state['assignments']['device-'.$d['device_id']]??null; if($d['assignment'])$parents[]=$d['assignment']['host_id']; }
        unset($d);
        return response()->json(['devices'=>$rows,'hosts'=>$this->records($parents),'has_more'=>$more]);
    }
    public function save(Request $request)
    {
        abort_if(strlen($request->getContent())>256*1024,413);
        $v=$request->validate(['revision'=>'required|integer|min:0','workspace'=>'required|in:logical,physical','map_id'=>'required|uuid',
            'changes'=>'required|array|min:1|max:200','changes.*'=>'array:device_id,host_id,kind,vmid',
            'changes.*.device_id'=>'required|integer|min:1|distinct','changes.*.host_id'=>'present|nullable|integer|min:1',
            'changes.*.kind'=>'required|in:vm,ct','changes.*.vmid'=>'nullable|string|max:80']);
        $changes=[]; $ids=[];
        foreach ($v['changes'] as $g) {
            $g=['device_id'=>(int)$g['device_id'],'host_id'=>isset($g['host_id'])?(int)$g['host_id']:null,'kind'=>$g['kind'],'vmid'=>trim($g['vmid']??'')];
            if ($g['host_id']!==null) $ids=[...$ids,$g['device_id'],$g['host_id']];
            $changes[]=$g;
        }
        $devices=array_column($this->records($ids),null,'device_id');
        abort_if(count(array_diff($ids,array_keys($devices)))>0,422,'A selected LibreNMS device no longer exists. Refresh the device list.');
        foreach ($changes as $g) {
            if ($g['host_id']===null) continue; // Cleanup of old or removed inventory stays available.
            $host=$devices[$g['host_id']]; $guest=$devices[$g['device_id']];
            abort_unless($host['can_host'],422,'Cannot use '.$host['name'].' as a hypervisor. '.$host['virtualization_reason']);
            abort_unless($guest['can_guest'],422,'Cannot assign '.$guest['name'].' as a virtual guest. '.$guest['virtualization_reason']);
        }
        try { return response()->json($this->store()->change((int)$v['revision'],$changes,['kind'=>'virtualization','workspace'=>$v['workspace'],'map_id'=>$v['map_id']])); }
        catch (\UnexpectedValueException $e) { abort(409,$e->getMessage()); }
        catch (\InvalidArgumentException $e) { abort(422,$e->getMessage()); }
    }
}
