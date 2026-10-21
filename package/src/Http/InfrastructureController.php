<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Http;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use LibreNMS\Interfaces\Plugins\PluginManagerInterface;
use PortMap\LibreNMS\PortMapServiceProvider;
use PortMap\LibreNMS\Storage\InfrastructureStore;
use PortMap\LibreNMS\Support\AssetLibrary;
use PortMap\LibreNMS\Support\DeviceStatus;
use PortMap\LibreNMS\Support\MapAccess;
final class InfrastructureController extends Controller
{
    public function __construct()
    {
        $this->middleware(function(Request $request,$next){abort_unless(app(PluginManagerInterface::class)->pluginEnabled(PortMapServiceProvider::SLUG),404);abort_unless($request->user() && ($request->user()->can('admin') || $request->route()->getActionMethod()==='port'),403);return $next($request);});
    }
    public function undo(Request $request)
    {
        $data=$request->validate(['token'=>['required','regex:/^[a-f0-9]{48}$/D']]);
        try{
            $result=(new \PortMap\LibreNMS\Storage\UndoStore(storage_path('app/mormap')))->revert($data['token']);
            $result['infrastructure']=(new InfrastructureStore(storage_path('app/mormap')))->snapshot();
            $context=$result['context']??[];
            if(($context['action']??'')==='unpublish'){
                $directory=($context['workspace']??'logical')==='physical'?'physical/published':'published';
                $result['published_revision']=(new \PortMap\LibreNMS\Storage\MapStore(storage_path('app/mormap/'.$directory)))->read($context['map_id'])['revision']??null;
            }
            return response()->json($result);
        }
        catch(\UnexpectedValueException $e){abort(409,$e->getMessage());}catch(\InvalidArgumentException $e){abort(422,$e->getMessage());}
    }
    public function index(){return response()->json((new InfrastructureStore(storage_path('app/mormap')))->snapshot());}
    public function add(Request $request)
    {
        $data=$request->validate(['revision'=>'required|integer|min:1','name'=>'required|string|max:120','type'=>'required|in:patch-panel,fiber-panel,wall-outlet,odf,coupler,splice-box,pdu,ups,cable-manager,passive,active','image'=>'required|string|max:100','port_count'=>'required|integer|between:0,192']);
        abort_unless((new AssetLibrary())->exists($data['image']),422,'Choose an image from the asset library.');
        try{return response()->json((new InfrastructureStore(storage_path('app/mormap')))->addComponent($data,(int)$data['revision']),201);}
        catch(\UnexpectedValueException $e){abort(409,$e->getMessage());}catch(\InvalidArgumentException $e){abort(422,$e->getMessage());}
    }
    public function port(int $port)
    {
        $owner=DB::table('ports')->where('port_id',$port)->where('deleted',0)->value('device_id');abort_unless($owner,404);
        $access=new MapAccess();abort_unless($access->allowedDeviceIds([(int)$owner]),403);
        $data=DeviceStatus::details($port);
        if(!$access->globalRead()){
            $owners=DB::table('ports')->whereIn('port_id',array_column($data['neighbors'],'remote_port_id'))->pluck('device_id','port_id')->all();
            $allowed=array_fill_keys($access->allowedDeviceIds([...array_column($data['neighbors'],'remote_device_id'),...array_values($owners)]),true);
            $data['neighbors']=array_values(array_filter($data['neighbors'],function($n)use($owners,$allowed){
                $id=(int)($n['remote_device_id']??0);$portOwner=(int)($owners[$n['remote_port_id']??0]??0);
                return ($id||$portOwner)&&(!$id||isset($allowed[$id]))&&(!$portOwner||isset($allowed[$portOwner]));
            }));
        }
        return response()->json($data);
    }
    public function addPort(Request $request)
    {
        $data=$request->validate(['revision'=>'required|integer|min:1','device_ref'=>['required','string','max:70','regex:/^(?:lnms:device:[1-9][0-9]*|mm:device:[a-f0-9-]{36})$/D'],'label'=>'required|string|max:120','kind'=>'required|in:ethernet,sfp,sfp+,qsfp,management,console,power,fiber,stack','paired'=>'sometimes|boolean','stack_member'=>'sometimes|nullable|integer|between:1,64']);
        $device=null;
        if(str_starts_with($data['device_ref'],'lnms:device:')){
            $id=(int)substr($data['device_ref'],12);$record=DB::table('devices')->where('device_id',$id)->first(['device_id','sysName','hostname']);
            abort_unless($record,422,'LibreNMS equipment no longer exists.');
            $device=['id'=>$data['device_ref'],'source'=>'librenms','device_id'=>$id,'name'=>$record->sysName?:$record->hostname];
            $names=[$data['label']];if($data['paired']??false)$names[]=$data['label'].' / rear';
            foreach(DB::table('ports')->where('device_id',$id)->where('deleted',0)->get(['ifName','ifDescr']) as $port)foreach($names as $name)abort_if(strcasecmp(trim($name),trim((string)($port->ifName?:$port->ifDescr)))===0,422,'That interface already exists in LibreNMS. Choose it under Existing port.');
        }
        try{return response()->json((new InfrastructureStore(storage_path('app/mormap')))->addPort($data,(int)$data['revision'],$device),201);}
        catch(\UnexpectedValueException $e){abort(409,$e->getMessage());}catch(\InvalidArgumentException $e){abort(422,$e->getMessage());}
    }
    public function groups(Request $request)
    {
        $data=$request->validate(['revision'=>'required|integer|min:1','device_ref'=>['required','regex:/^(?:lnms:device:[1-9][0-9]*|mm:device:[a-f0-9-]{36})$/D'],'groups'=>'present|array|max:128']);
        try{$data['groups']=array_map([\PortMap\LibreNMS\Support\TopologySchema::class,'group'],$data['groups']);}catch(\InvalidArgumentException $e){abort(422,$e->getMessage());}
        $owner=$data['device_ref'];$verified=[];$device=null;
        if(str_starts_with($owner,'lnms:device:')){
            $id=(int)substr($owner,12);$d=DB::table('devices')->where('device_id',$id)->first(['device_id','sysName','hostname']);abort_unless($d,422,'Device no longer exists.');
            $device=['id'=>$owner,'source'=>'librenms','device_id'=>$id,'name'=>$d->sysName?:$d->hostname];
            foreach(DB::table('ports')->where('device_id',$id)->where('deleted',0)->get(['port_id','device_id','ifName','ifDescr']) as $p)$verified['lnms:port:'.$p->port_id]=(array)$p;
            foreach($data['groups'] as $g)foreach(array_filter([...($g['ports']??[]),$g['aggregate']??null]) as $ref)if(is_string($ref)&&str_starts_with($ref,'lnms:'))abort_unless(isset($verified[$ref]),422,'Group port is not in this device inventory.');
        }
        try{return response()->json((new InfrastructureStore(storage_path('app/mormap')))->saveGroups($owner,$data['groups'],(int)$data['revision'],$verified,$device));}
        catch(\UnexpectedValueException $e){abort(409,$e->getMessage());}catch(\InvalidArgumentException $e){abort(422,$e->getMessage());}
    }

    public function connection(Request $request,?string $id=null)
    {
        $data=$request->validate(['revision'=>'required|integer|min:1','source'=>'sometimes|string|max:70','target'=>'sometimes|string|max:70','name'=>'sometimes|nullable|string|max:120','comment'=>'sometimes|nullable|string|max:4000','kind'=>'sometimes|in:cable,copper,fiber,power,building,stack,backbone','color'=>['sometimes','nullable','regex:/^#[a-fA-F0-9]{6}$/D'],'media'=>'sometimes|array']);
        foreach(['name','comment'] as $key)if(array_key_exists($key,$data))$data[$key]??='';
        if(!$request->isMethod('DELETE')){
            $g=(new InfrastructureStore(storage_path('app/mormap')))->snapshot();$record=$id!==null?($g['connections'][$id]??[]):[];
            foreach(['source','target'] as $side){$ref=$data[$side]??$record[$side]??'';$port=$g['ports'][$ref]??null;abort_unless($port,422,'Choose existing infrastructure terminations.');
                if(($port['source']??null)==='librenms')abort_unless(DB::table('ports')->where('port_id',$port['port_id'])->where('deleted',0)->where('device_id',(int)substr($port['device_ref'],12))->exists(),422,'A monitored interface no longer exists. Refresh its inventory.');
            }
        }

        try{return response()->json((new InfrastructureStore(storage_path('app/mormap')))->changeConnection($data,(int)$data['revision'],$id,$request->isMethod('DELETE')));}
        catch(\UnexpectedValueException $e){abort(409,$e->getMessage());}catch(\InvalidArgumentException $e){abort(422,$e->getMessage());}
    }

}
