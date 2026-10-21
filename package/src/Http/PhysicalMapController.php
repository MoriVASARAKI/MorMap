<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Http;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use LibreNMS\Interfaces\Plugins\PluginManagerInterface;
use PortMap\LibreNMS\PortMapServiceProvider;
use PortMap\LibreNMS\Storage\MapStore;
use PortMap\LibreNMS\Storage\InfrastructureStore;
use PortMap\LibreNMS\Support\AssetLibrary;
use PortMap\LibreNMS\Support\DeviceStatus;
use PortMap\LibreNMS\Support\MapAccess;
use PortMap\LibreNMS\Support\SavedInventory;
use PortMap\LibreNMS\Support\PhysicalMapSchema;

/** Physical plans have their own drafts and published snapshots. */
final class PhysicalMapController extends Controller
{
    public function __construct()
    {
        $this->middleware(function (Request $request, $next) {
            abort_unless(app(PluginManagerInterface::class)->pluginEnabled(PortMapServiceProvider::SLUG), 404);
            abort_unless($request->user() && ($request->user()->can('admin') || in_array($request->route()->getActionMethod(), ['home', 'view', 'viewData', 'viewStatus', 'viewImage'], true)), 403);
            return $next($request);
        });
    }
    private function store(bool $published = false): MapStore
    {
        return new MapStore(storage_path('app/mormap/physical/' . ($published ? 'published' : 'maps')));
    }
    private function map(string $id, bool $published = false): array
    {
        $map = $this->store($published)->read($id); abort_if($map === null, 404);
        if ($published) (new MapAccess())->assertView($map);
        return $map;
    }
    public function home()
    {
        if (!(new MapAccess())->admin()) return redirect()->route('mormap.viewer.index');
        return view('portmap::physical', ['pagetitle' => 'MorMap · Physical', 'show_menu' => true,
            'mormapVersion' => PortMapServiceProvider::VERSION, 'mormapUser'=>auth()->id(), 'readOnly' => false]);
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
        try { return response()->json((new \PortMap\LibreNMS\Storage\MapDocuments(storage_path('app/mormap')))->change('physical', $id, (int)$data['revision'], (int)$data['infrastructure_revision'], $name)); }
        catch (\OutOfBoundsException $e) { return response()->json(['message'=>$e->getMessage()],404); }
        catch (\UnexpectedValueException $e) { return response()->json(['message'=>$e->getMessage()],409); }
        catch (\InvalidArgumentException $e) { return response()->json(['message'=>$e->getMessage()],422); }
    }
    public function maps() { return response()->json($this->store()->all()); }
    public function create(Request $request)
    {
        $input = $request->validate(['name' => 'required|string|max:120']);
        return response()->json($this->infrastructure()->decorate($this->store()->save((string) Str::uuid(), 0, PhysicalMapSchema::empty($input['name']))), 201);
    }
    private function infrastructure(): InfrastructureStore {return new InfrastructureStore(storage_path('app/mormap'));}
    public function load(string $id) { return response()->json($this->infrastructure()->decorate($this->map($id)) + ['published_revision'=>$this->store(true)->read($id)['revision'] ?? null]); }
    public function save(Request $request, string $id)
    {
        abort_if(strlen($request->getContent()) > 4 * 1024 * 1024, 413);
        $before=$this->map($id);$savedOwners=SavedInventory::portOwners($before);
        try { $map = PhysicalMapSchema::validate($request->all()); }
        catch (\InvalidArgumentException $error) { return response()->json(['message' => $error->getMessage()], 422); }
        $deviceIds = array_values(array_filter(array_column($map['equipment'], 'device_id')));
        $graph=$this->infrastructure()->snapshot();
        $existing = DB::table('devices')->whereIn('device_id', $deviceIds)->pluck('device_id')->map(static fn ($id) => (int) $id)->all();
        $mappedPorts = [];
        foreach ($map['equipment'] as $device) { foreach ($device['ports'] as $port) { if(!empty($port['port_id']))$mappedPorts[$port['port_id']] = $device['device_id'];elseif(($graph['ports'][$port['port_ref']]['device_ref']??null)!==$device['object_id'])abort(422,'Physical port does not belong to its component.'); } }
        $portOwners = DB::table('ports')->whereIn('port_id', array_keys($mappedPorts))->where('deleted', 0)->pluck('device_id', 'port_id')->all();
        $assets = new AssetLibrary();
        foreach (\PortMap\LibreNMS\Support\FloorBackground::images($map) as $image) {
            $background = $assets->get($image);
            abort_unless($background && in_array($background['mime'], ['image/png','image/jpeg','image/svg+xml'], true), 422, 'Choose a PNG, JPG or SVG floor background.');
        }
        foreach ($map['equipment'] as &$device) {
            abort_unless($device['device_id'] ? (in_array($device['device_id'], $existing, true) || SavedInventory::device($before,$device)) : isset($graph['devices'][$device['object_id']]), 422, 'Equipment no longer exists in the infrastructure.');
            $asset = $assets->get($device['image']);
            abort_unless($asset !== null, 422, 'A device image is missing from the asset library.');
            $device['image_width'] = $asset['width']; $device['image_height'] = $asset['height'];
        }
        unset($device);
        foreach ($mappedPorts as $port => $owner) { abort_unless(((int) ($portOwners[$port] ?? 0) === $owner || ($savedOwners[$port]??null)===$owner), 422, 'A mapped port does not belong to its equipment.'); }
        // Authoritative catalogue dimensions must obey the persisted schema too.
        try { $map = PhysicalMapSchema::validate($map); }
        catch (\InvalidArgumentException $error) { return response()->json(['message' => $error->getMessage()], 422); }
        try { return response()->json($this->infrastructure()->saveView('physical',$id,$map['revision'],$map)); }
        catch (\UnexpectedValueException $error) { return response()->json(['message' => $error->getMessage()], 409); }
        catch (\InvalidArgumentException $error) { return response()->json(['message' => $error->getMessage()], 422); }
    }
    public function publish(Request $request, string $id)
    {
        $data = $request->validate(['revision' => 'required|integer|min:1']); $this->map($id);
        try {
            $snapshot = $this->store()->publish($id, (int) $data['revision'], $this->store(true));
            return response()->json(['url' => route('mormap.physical.viewer', ['id' => $id]), 'source_revision' => $snapshot['source_revision'], 'published_revision' => $snapshot['revision']]);
        } catch (\UnexpectedValueException $error) { return response()->json(['message' => $error->getMessage()], 409); }
    }
    public function unpublish(Request $request, string $id)
    {
        $data = $request->validate(['published_revision'=>'required|integer|min:1']);
        try { return response()->json((new \PortMap\LibreNMS\Storage\MapDocuments(storage_path('app/mormap')))->unpublish('physical', $id, (int) $data['published_revision'])); }
        catch (\OutOfBoundsException $error) { return response()->json(['message'=>$error->getMessage()], 404); }
        catch (\UnexpectedValueException $error) { return response()->json(['message'=>$error->getMessage()], 409); }
        catch (\InvalidArgumentException $error) { return response()->json(['message'=>$error->getMessage()], 422); }
    }
    public function status(Request $request, string $id)
    {
        $map = $this->map($id);
        $input = $request->validate(['device_ids' => 'sometimes|array|max:500', 'device_ids.*' => 'nullable|integer|min:1', 'port_refs'=>'sometimes|array|max:5000', 'port_refs.*'=>'string|max:70']);
        return $this->statusResponse($input['device_ids'] ?? array_column($map['equipment'], 'device_id'),$input['port_refs']??self::portRefs($map));
    }
    private static function portRefs(array $map): array {return array_merge([], ...array_map(fn($d)=>array_map([InfrastructureStore::class,'portRef'],$d['ports']),$map['equipment']));}
    private function statusResponse(array $ids,array $refs=[],?array $published=null)
    {
        $ids = array_values(array_filter(array_unique($ids)));
        $graph=$this->infrastructure()->snapshot();$access=new MapAccess();if($published!==null)$graph=$access->graph($graph,$published);$ids=$access->allowedDeviceIds(InfrastructureStore::relatedDevices($graph,$ids,$refs));
        // The compact port list includes every nondeleted port, including ports without a drawn connection point.
        return response()->json(['devices' => DeviceStatus::devices($ids),
            'ports' => DeviceStatus::portsForDevices($ids), 'infrastructure'=>$graph]);
    }
    public function view(string $id)
    {
        $map = $this->map($id, true);
        return view('portmap::physical', ['pagetitle' => $map['name'] . ' · Physical', 'show_menu' => true,
            'mormapVersion' => PortMapServiceProvider::VERSION, 'readOnly' => true,
            'viewerBase' => route('mormap.physical.viewer', ['id' => $id])]);
    }
    public function viewData(string $id) { return response()->json((new MapAccess())->decorate($this->map($id, true), $this->infrastructure()->snapshot())); }
    public function viewStatus(string $id) { $map=$this->map($id,true);return $this->statusResponse(array_column($map['equipment'],'device_id'),self::portRefs($map),$map); }
    public function viewImage(string $id, string $image)
    {
        abort_unless(in_array($image, array_merge(array_column($this->map($id, true)['equipment'], 'image'), \PortMap\LibreNMS\Support\FloorBackground::images($this->map($id, true))), true), 404);
        return (new AssetLibrary())->response($image);
    }
}
