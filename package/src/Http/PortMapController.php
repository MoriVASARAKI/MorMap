<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Http;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use LibreNMS\Interfaces\Plugins\PluginManagerInterface;
use PortMap\LibreNMS\PortMapServiceProvider;
use PortMap\LibreNMS\Storage\MapStore;
use PortMap\LibreNMS\Storage\InfrastructureStore;
use PortMap\LibreNMS\Support\DeviceStatus;
use PortMap\LibreNMS\Support\MapAccess;
use PortMap\LibreNMS\Support\SavedInventory;
use PortMap\LibreNMS\Support\AssetLibrary;
use PortMap\LibreNMS\Support\CableRules;
use PortMap\LibreNMS\Support\CableFormat;
use PortMap\LibreNMS\Support\PublishedMaps;
final class PortMapController extends Controller
{
    public function __construct()
    {
        $this->middleware(function (Request $request, $next) {
            abort_unless(app(PluginManagerInterface::class)->pluginEnabled(PortMapServiceProvider::SLUG), 404);
            abort_unless($request->user() && ($request->user()->can('admin') || in_array($request->route()->getActionMethod(), ['home', 'asset', 'publishedMaps'], true)), 403);
            return $next($request);
        });
    }
    public function home()
    {
        if (!(new MapAccess())->admin()) return redirect()->route('mormap.viewer.index');
        return view('portmap::home', ['pagetitle' => 'MorMap', 'show_menu' => true,
            'mormapVersion' => PortMapServiceProvider::VERSION, 'mormapUser'=>auth()->id(), 'readOnly' => false]);
    }
    public function asset(string $file)
    {
        abort_unless(in_array($file, ['diagram-groups-model.js','drawings.js','drawings.css','diagram-groups.js','diagram-groups.css','virtualization.js','virtualization.css','port-details.js','floor-background.js','selection.js','physical-trace.js','physical-path-ui.js','topology.js','topology-controls.js','hierarchy-links.js','workbench.js','workbench.css','help-content.js','help.css','help.js','editor.js', 'format-painter.js', 'cable-style.js', 'cable-controls.js', 'port-mapping.js', 'geometry.js', 'display.js', 'navigation.js', 'editor.css', 'ui.js', 'library.js', 'library.css', 'physical.js', 'physical-model.js', 'physical.css', 'chrome.css', 'mormap-logo.png', 'output.js', 'output-model.js', 'output.css', 'jspdf.umd.min.js', 'svg2pdf.umd.min.js', 'export-font.ttf', 'export-font-bold.ttf', 'infrastructure.js', 'physical-cables.js', 'workspace.js', 'workspace.css', 'comments.js', 'mormap-logo.svg', 'mormap-icon.svg'], true), 404);
        return response()->file(dirname(__DIR__, 2) . '/resources/assets/' . $file, [
            'Content-Type' => match (pathinfo($file, PATHINFO_EXTENSION)) { 'css'=>'text/css', 'png'=>'image/png', 'svg'=>'image/svg+xml', 'ttf'=>'font/ttf', default=>'application/javascript' },
            'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-cache']);
    }
    public function devices(Request $request)
    {
        $data = $request->validate(['q' => 'nullable|string|max:128']);
        $q = $data['q'] ?? '';
        return response()->json(DB::table('devices')->select('device_id', 'hostname', 'sysName')
            ->when($q !== '', function ($query) use ($q) {
                $query->where(function ($w) use ($q) {
                    $w->where('hostname', 'like', '%' . $q . '%')->orWhere('sysName', 'like', '%' . $q . '%');
                    if (filter_var($q, FILTER_VALIDATE_IP)) {
                        $w->orWhere('ip', inet_pton($q))->orWhere('ip', $q);
                    }
                });
            })
            ->orderBy('hostname')->limit(200)->get());
    }
    public function ports(int $device)
    {
        return response()->json(DB::table('ports')->where('device_id', $device)->where('deleted', 0)
            ->select('port_id', 'device_id', 'ifName', 'ifDescr', 'ifAlias', 'ifIndex', 'ifType', 'ifOperStatus', 'ifAdminStatus')
            ->orderBy('ifIndex')->limit(4000)->get());
    }
    public function status(Request $request)
    {
        $data = $request->validate([
            'ids' => 'present|array|max:2000', 'ids.*' => 'nullable|integer|min:1',
            'device_ids' => 'sometimes|array|max:200', 'device_ids.*' => 'nullable|integer|min:1',
        ]);
        $data['ids']=array_values(array_filter($data['ids']));if(isset($data['device_ids']))$data['device_ids']=array_values(array_filter($data['device_ids']));
        $ports = DeviceStatus::ports($data['ids']);
        // Keep the 0.2.0 response for an old tab until its page is refreshed.
        if (!array_key_exists('device_ids', $data)) { return response()->json($ports); }
        $devices = DeviceStatus::devices($data['device_ids']);
        return response()->json(['ports' => DeviceStatus::portsForDevices($data['device_ids']), 'devices' => $devices, 'infrastructure'=>$this->infrastructure()->snapshot()]);
    }
    public function publishedMaps()
    {
        return response()->json(PublishedMaps::all());
    }
    public function publish(Request $request, string $id)
    {
        $data = $request->validate(['revision' => 'required|integer|min:1']);
        abort_if($this->store()->read($id) === null, 404);
        try {
            CableRules::validate($this->store()->read($id));
            $snapshot = $this->store()->publish($id, (int) $data['revision'], new MapStore(storage_path('app/mormap/published')));
            return response()->json(['url' => route('mormap.viewer', ['id' => $id]), 'source_revision' => $snapshot['source_revision'], 'published_revision' => $snapshot['revision']]);
        } catch (\UnexpectedValueException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
    public function unpublish(Request $request, string $id)
    {
        $data = $request->validate(['published_revision'=>'required|integer|min:1']);
        try { return response()->json((new \PortMap\LibreNMS\Storage\MapDocuments(storage_path('app/mormap')))->unpublish('logical', $id, (int) $data['published_revision'])); }
        catch (\OutOfBoundsException $error) { return response()->json(['message'=>$error->getMessage()], 404); }
        catch (\UnexpectedValueException $error) { return response()->json(['message'=>$error->getMessage()], 409); }
        catch (\InvalidArgumentException $error) { return response()->json(['message'=>$error->getMessage()], 422); }
    }
    public function rename(Request $request, string $id)
    {
        $data = $request->validate(['name'=>'required|string|max:120', 'revision'=>'required|integer|min:1', 'infrastructure_revision'=>'required|integer|min:1']);
        return $this->changeDocument($id, $data, $data['name']);
    }
    public function delete(Request $request, string $id)
    {
        $data = $request->validate(['revision'=>'required|integer|min:1', 'infrastructure_revision'=>'required|integer|min:1']);
        return $this->changeDocument($id, $data, null);
    }
    private function changeDocument(string $id, array $data, ?string $name)
    {
        try { return response()->json((new \PortMap\LibreNMS\Storage\MapDocuments(storage_path('app/mormap')))->change('logical', $id, (int)$data['revision'], (int)$data['infrastructure_revision'], $name)); }
        catch (\OutOfBoundsException $e) { return response()->json(['message'=>$e->getMessage()],404); }
        catch (\UnexpectedValueException $e) { return response()->json(['message'=>$e->getMessage()],409); }
        catch (\InvalidArgumentException $e) { return response()->json(['message'=>$e->getMessage()],422); }
    }
    public function maps() { return response()->json($this->store()->all()); }
    public function load(string $id)
    {
        $map = $this->store()->read($id);
        abort_if($map === null, 404);
        return response()->json($this->infrastructure()->decorate($map + ['canvas' => ['width' => 1920, 'height' => 1080]]) + ['published_revision'=>$this->store(true)->read($id)['revision'] ?? null]);
    }
    public function create(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|max:120']);
        return response()->json($this->infrastructure()->decorate($this->store()->save((string) Str::uuid(), 0, [
            'schema' => 1, 'name' => $data['name'], 'canvas' => ['width' => 1920, 'height' => 1080], 'nodes' => [], 'anchors' => [], 'links' => []])), 201);
    }
    public function save(Request $request, string $id)
    {
        abort_if(strlen($request->getContent()) > 2 * 1024 * 1024, 413);
        $map = Validator::make($request->all(), [
            'infrastructure_revision'=>'required|integer|min:1', 'disconnect'=>'sometimes|array|max:2000','disconnect.*'=>'required|uuid|distinct',
            'vm_groups' => 'sometimes|array|max:1000',
            'shapes' => 'sometimes|array|max:2000',
            'clusters' => 'sometimes|array|max:500', 'ducts' => 'sometimes|array|max:500',
            'revision' => 'required|integer|min:1', 'schema' => 'required|integer|in:1', 'name' => 'required|string|max:120',
            'canvas' => 'sometimes|array:width,height|required_array_keys:width,height',
            'canvas.width' => 'required_with:canvas|integer|between:320,16384',
            'canvas.height' => 'required_with:canvas|integer|between:240,16384',
            'nodes' => 'present|array|max:200', 'nodes.*' => 'array:id,label,device_id,object_id,image,x,y,w,h,comment,comment_box,appearance,stack_member,profile_revision,hidden_ports,show_ip',
            'nodes.*.stack_member'=>'sometimes|integer|between:1,64','nodes.*.profile_revision'=>'sometimes|integer|min:0','nodes.*.hidden_ports'=>'sometimes|array|max:4000','nodes.*.hidden_ports.*'=>['string','regex:/^(?:lnms:port:[1-9][0-9]*|mm:port:[a-f0-9-]{36})$/D'],
            'nodes.*.appearance' => 'sometimes|array',
            'nodes.*.show_ip' => 'sometimes|boolean',
            'nodes.*.id' => 'required|uuid|distinct', 'nodes.*.label' => 'required|string|max:120',
            'nodes.*.device_id' => 'nullable|integer|min:1', 'nodes.*.object_id'=>'sometimes|string|max:70', 'nodes.*.image' => 'required|string|max:150',
            'nodes.*.x' => 'required|numeric|between:-100000,100000', 'nodes.*.y' => 'required|numeric|between:-100000,100000',
            'nodes.*.w' => 'required|numeric|between:40,4000', 'nodes.*.h' => 'required|numeric|between:20,4000',
            'anchors' => 'present|array|max:2000', 'anchors.*' => 'array:id,node_id,port_id,port_ref,label,x,y,comment,comment_box,asset_key',
            'anchors.*.asset_key' => ['sometimes', 'string', 'regex:/^[A-Za-z0-9_-]{1,100}:[A-Za-z0-9_-]{1,64}$/D'],
            'anchors.*.id' => 'required|uuid|distinct', 'anchors.*.node_id' => 'required|uuid',
            'anchors.*.port_id' => 'nullable|integer|min:1', 'anchors.*.port_ref'=>'sometimes|string|max:70', 'anchors.*.label' => 'required|string|max:255',
            'anchors.*.x' => 'required|numeric|between:0,1', 'anchors.*.y' => 'required|numeric|between:0,1',
            'links' => 'present|array|max:1000', 'links.*' => 'array:id,connection_id,source,target,points,connector,format,color,comment,info,name,kind,relationship_warning,comment_box,media',
            'links.*.connector'=>'sometimes|in:right-angle,straight,curved',
            'links.*.format'=>'sometimes|array','links.*.media'=>'sometimes|array',
            'links.*.connection_id'=>'sometimes|uuid','links.*.name'=>'sometimes|nullable|string|max:120','links.*.kind'=>'sometimes|in:cable,copper,fiber,power,building,stack,backbone','links.*.relationship_warning'=>'sometimes|boolean',
            'links.*.id' => 'required|uuid|distinct', 'links.*.source' => 'required|uuid', 'links.*.target' => 'required|uuid',
            'comment' => 'sometimes|nullable|string|max:4000',
            'nodes.*.comment' => 'sometimes|nullable|string|max:4000',
            'anchors.*.comment' => 'sometimes|nullable|string|max:4000',
            'links.*.comment' => 'sometimes|nullable|string|max:4000',
            'links.*.color' => ['sometimes', 'regex:/^#[a-fA-F0-9]{6}$/D'],
            'links.*.info' => 'sometimes|array:x,y,font_size,attachment|required_array_keys:x,y',
            'links.*.info.attachment'=>'sometimes|array:fraction,dx,dy|required_array_keys:fraction,dx,dy',
            'links.*.info.attachment.fraction'=>'required_with:links.*.info.attachment|numeric|between:0,1',
            'links.*.info.attachment.dx'=>'required_with:links.*.info.attachment|numeric|between:-200000,200000',
            'links.*.info.attachment.dy'=>'required_with:links.*.info.attachment|numeric|between:-200000,200000',
            'links.*.info.font_size'=>'sometimes|numeric|between:4,32',
            'links.*.info.x' => 'required_with:links.*.info|numeric|between:-100000,100000',
            'links.*.info.y' => 'required_with:links.*.info|numeric|between:-100000,100000',
            'links.*.points' => 'required|array|min:2|max:100', 'links.*.points.*' => 'array:x,y',
            'links.*.points.*.x' => 'required|numeric|between:-100000,100000',
            'links.*.points.*.y' => 'required|numeric|between:-100000,100000',
        ] + self::commentRules())->validate();
        try { $map=array_replace($map, \PortMap\LibreNMS\Support\DiagramGroups::validate($map,$map)); } catch (\InvalidArgumentException $e) { abort(422,$e->getMessage()); }
        if (array_key_exists('shapes',$map)) { try { $map['shapes']=\PortMap\LibreNMS\Support\Drawings::validate($map['shapes'],array_merge(array_column($map['nodes'],'id'),array_column($map['anchors'],'id'),array_column($map['links'],'id'))); } catch (\InvalidArgumentException $e) { abort(422,$e->getMessage()); } }
        if (array_key_exists('vm_groups',$map)) { try { $map['vm_groups']=\PortMap\LibreNMS\Support\VirtualizationLayout::validate($map['vm_groups']); } catch (\InvalidArgumentException $e) { abort(422,$e->getMessage()); } }
        foreach ($map['nodes'] as &$node) { try { $node += \PortMap\LibreNMS\Support\TopologySchema::ipVisibility($node); } catch (\InvalidArgumentException $e) { abort(422,$e->getMessage()); } if (array_key_exists('appearance',$node)) { try { $node['appearance']=\PortMap\LibreNMS\Support\ObjectFormat::validate($node['appearance']); } catch (\InvalidArgumentException $e) { abort(422,$e->getMessage()); } } }
        unset($node);
        try { \PortMap\LibreNMS\Support\TopologySchema::placements($map['nodes']); } catch (\InvalidArgumentException $e) { abort(422,$e->getMessage()); }
        $before=$this->store()->read($id);abort_if($before===null,404);$savedOwners=SavedInventory::portOwners($before);
        $nodes = array_column($map['nodes'], null, 'id');
        $anchors = array_column($map['anchors'], null, 'id');
        $devices = DB::table('devices')->whereIn('device_id', array_column($map['nodes'], 'device_id'))->pluck('device_id')->map(fn ($v) => (int) $v)->all();
        $ports = DB::table('ports')->whereIn('port_id', array_column($map['anchors'], 'port_id'))->where('deleted', 0)->pluck('device_id', 'port_id')->all();
        $library = new AssetLibrary();$graph=$this->infrastructure()->snapshot();
        foreach (\PortMap\LibreNMS\Support\DiagramGroups::images($map) as $image) abort_unless($library->exists($image),422,'Cluster icon not found in the asset library.');
        foreach ($nodes as $node) {
            abort_unless(!empty($node['device_id'])?(in_array((int)$node['device_id'],$devices,true)||SavedInventory::device($before,$node)):isset($graph['devices'][InfrastructureStore::deviceRef($node)]),422,'Equipment no longer exists.');
            abort_unless($library->exists($node['image']), 422, 'Image not found in the asset library.');
        }
        $used = [];
        foreach ($anchors as $anchor) {
            $node = $nodes[$anchor['node_id']] ?? null;
            abort_unless($node&&(!empty($anchor['port_id'])?((int)($ports[$anchor['port_id']]??0)===(int)$node['device_id']||($savedOwners[$anchor['port_id']]??null)===(int)$node['device_id']):($graph['ports'][InfrastructureStore::portRef($anchor)]['device_ref']??null)===InfrastructureStore::deviceRef($node)),422,'Port does not belong to this equipment or was removed.');
            $key=InfrastructureStore::portRef($anchor);
            abort_if(isset($used[$key]), 422, 'A port already has an X on this image.');
            $used[$key] = true;
        }
        try { CableRules::validate($map); } catch (\InvalidArgumentException $e) { abort(422, $e->getMessage()); }
        foreach ($map['links'] as &$link) {
            if(isset($link['media'])){try{$link['media']=\PortMap\LibreNMS\Support\TopologySchema::media($link['media']);}catch(\InvalidArgumentException $e){abort(422,$e->getMessage());}}
            if (array_key_exists('format',$link)) {
                try { $link['format']=CableFormat::validate($link['format']); }
                catch (\InvalidArgumentException $e) { abort(422,$e->getMessage()); }
            }
            abort_unless(isset($anchors[$link['source']], $anchors[$link['target']]) && $link['source'] !== $link['target'], 422, 'Invalid cable endpoints.');
            $connector=$link['connector']??'right-angle';
            abort_if(($connector==='straight'&&count($link['points'])!==2)||($connector==='curved'&&count($link['points'])!==4),422,'Invalid connector geometry.');
            for ($i = 1; $connector==='right-angle' && $i < count($link['points']); $i++) {
                $a = $link['points'][$i - 1]; $b = $link['points'][$i];
                abort_if(abs($a['x'] - $b['x']) > 0.01 && abs($a['y'] - $b['y']) > 0.01, 422, 'Cable segments must be horizontal or vertical.');
            }
            foreach (['source' => 0, 'target' => count($link['points']) - 1] as $end => $index) {
                $anchor = $anchors[$link[$end]]; $node = $nodes[$anchor['node_id']]; $point = $link['points'][$index];
                abort_if(abs($point['x'] - ($node['x'] + $anchor['x'] * $node['w'])) > 0.01 || abs($point['y'] - ($node['y'] + $anchor['y'] * $node['h'])) > 0.01, 422, 'Cable endpoint is detached from its X.');
            }
        }
        unset($link);
        $current = $this->store()->read($id);
        abort_if($current === null, 404);
        $map['canvas'] = $map['canvas'] ?? $current['canvas'] ?? ['width' => 1920, 'height' => 1080];
        try { return response()->json($this->infrastructure()->saveView('logical',$id,(int)$map['revision'],$map)); }
        catch (\UnexpectedValueException $e) { return response()->json(['message' => $e->getMessage()], 409); }
        catch (\InvalidArgumentException $e) { return response()->json(['message' => $e->getMessage()], 422); }
    }
    public function upload(Request $request)
    {
        $request->validate(['image' => 'required|file|max:8192', 'name' => 'sometimes|string|max:120']);
        $file = $request->file('image');
        try { return response()->json((new AssetLibrary())->import($file->getRealPath(), $request->input('name', pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME))), 201); }
        catch (\InvalidArgumentException|\JsonException $e) { abort(422, $e->getMessage()); }
    }
    public function image(string $id)
    {
        return (new AssetLibrary())->response($id);
    }
    private function imagePath(string $id): string
    {
        abort_unless(Str::isUuid($id), 404); return storage_path('app/mormap/images/' . $id);
    }
    private function infrastructure(): InfrastructureStore {return new InfrastructureStore(storage_path('app/mormap'));}
    private function store(bool $published = false): MapStore { return new MapStore(storage_path('app/mormap/' . ($published ? 'published' : 'maps'))); }
    public function libraryHome() { return view('portmap::library', ['pagetitle'=>'MorMap · Asset library','show_menu'=>true,'mormapVersion'=>PortMapServiceProvider::VERSION,'mormapUser'=>auth()->id()]); }
    public function library() { return response()->json(['assets'=>(new AssetLibrary())->all()]); }
    public function libraryAsset(string $id) { $asset=(new AssetLibrary())->get($id);abort_unless($asset,404);unset($asset['path']);return response()->json($asset); }
    public function updateAsset(Request $request, string $id)
    {
        $data=$request->validate(['name'=>'required|string|max:120','ports'=>'present|array|max:4000','meta_revision'=>'required|integer|min:0','appearance'=>'sometimes|array']);
        try { return response()->json((new AssetLibrary())->update($id,$data['name'],$data['ports'],(int)$data['meta_revision'],$data['appearance']??null)); }
        catch(\UnexpectedValueException $e){abort(409,$e->getMessage());}
        catch(\InvalidArgumentException $e){abort(422,$e->getMessage());}
    }
    public function exportAsset(string $id)
    {
        try {
            $pack=(new AssetLibrary())->export($id);$name=AssetLibrary::downloadName($pack['name']);
            $fallback=preg_replace('/[^\x20-\x7e]/','_',$name);
            return response()->json($pack)->header('Content-Disposition',\Symfony\Component\HttpFoundation\HeaderUtils::makeDisposition('attachment',$name,str_replace('%','_',$fallback)));
        }
        catch(\InvalidArgumentException $e){abort(422,$e->getMessage());}
    }
    private static function commentRules(): array
    {
        $rules=[];
        foreach(['nodes','anchors','links'] as $collection){$key=$collection.'.*.comment_box';$rules[$key]='sometimes|array:x,y|required_array_keys:x,y';$rules[$key.'.x']='required_with:'.$key.'|numeric|between:-100000,100000';$rules[$key.'.y']='required_with:'.$key.'|numeric|between:-100000,100000';}
        return $rules;
    }
    private function assetReferences(): \PortMap\LibreNMS\Support\AssetUsage
    {
        return new \PortMap\LibreNMS\Support\AssetUsage(storage_path('app/mormap'),new AssetLibrary());
    }
    public function assetUsage(string $id)
    {
        abort_unless((new AssetLibrary())->exists($id),404);
        return response()->json($this->assetReferences()->usage($id));
    }
    public function deleteAsset(Request $request,string $id)
    {
        $data=$request->validate(['token'=>'required|string|size:64']);
        try{return response()->json($this->assetReferences()->delete($id,$data['token']));}
        catch(\UnexpectedValueException $e){abort(409,$e->getMessage());}
        catch(\InvalidArgumentException $e){abort(422,$e->getMessage());}
    }
    public function replaceAsset(Request $request,string $id)
    {
        abort_if(strlen($request->getContent())>8*1024*1024,413);
        $data=$request->validate(['token'=>'required|string|size:64','replacement_id'=>'required|string|max:150','meta_revision'=>'required|integer|min:0','positions'=>'present|array|max:80000','delete_original'=>'required|boolean']);
        try{return response()->json($this->assetReferences()->replace($id,$data['replacement_id'],$data['token'],(int)$data['meta_revision'],$data['positions'],$data['delete_original']));}
        catch(\UnexpectedValueException $e){abort(409,$e->getMessage());}
        catch(\InvalidArgumentException $e){abort(422,$e->getMessage());}
    }

}
