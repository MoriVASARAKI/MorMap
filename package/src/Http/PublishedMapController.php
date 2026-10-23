<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Http;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use LibreNMS\Interfaces\Plugins\PluginManagerInterface;
use PortMap\LibreNMS\PortMapServiceProvider;
use PortMap\LibreNMS\Storage\MapStore;
use PortMap\LibreNMS\Storage\InfrastructureStore;
use PortMap\LibreNMS\Support\DeviceStatus;
use PortMap\LibreNMS\Support\MapAccess;
use PortMap\LibreNMS\Support\AssetLibrary;
use PortMap\LibreNMS\Support\PublishedMaps;

/** Published snapshot viewer. No create/save/upload/publish action exists here. */
final class PublishedMapController extends Controller
{
    public function __construct()
    {
        $this->middleware(function (Request $request, $next) {
            abort_unless(app(PluginManagerInterface::class)->pluginEnabled(PortMapServiceProvider::SLUG), 404);
            abort_unless($request->user() && ($request->user()->can('admin') || in_array($request->route()->getActionMethod(), ['index', 'home', 'load', 'status', 'image'], true)), 403);
            return $next($request);
        });
    }
    private function map(string $id): array
    {
        $map = (new MapStore(storage_path('app/mormap/published')))->read($id);
        abort_if($map === null, 404);
        (new MapAccess())->assertView($map);
        return $map + ['canvas' => ['width' => 1920, 'height' => 1080]];
    }
    public function index()
    {
        return view('portmap::published', ['pagetitle' => 'MorMap maps', 'show_menu' => true,
            'maps' => PublishedMaps::all()]);
    }
    public function home(string $id)
    {
        $map = $this->map($id);
        return view('portmap::home', ['pagetitle' => $map['name'], 'show_menu' => true,
            'mormapVersion' => PortMapServiceProvider::VERSION, 'readOnly' => true,
            'viewerBase' => route('mormap.viewer', ['id' => $id])]);
    }
    public function load(string $id) { return response()->json((new MapAccess())->decorate($this->map($id), (new InfrastructureStore(storage_path('app/mormap')))->snapshot())); }
    public function status(string $id)
    {
        $map = $this->map($id);
        return response()->json([
            'infrastructure'=>(new MapAccess())->graph((new InfrastructureStore(storage_path('app/mormap')))->snapshot(), $map),
            'devices' => DeviceStatus::devices(array_values(array_unique(array_column($map['nodes'], 'device_id')))),
            'ports' => DeviceStatus::portsForDevices(array_values(array_unique(array_column($map['nodes'], 'device_id')))),
        ]);
    }
    public function image(string $id, string $image)
    {
        $map = $this->map($id);
        abort_unless(in_array($image, array_merge(array_column($map['nodes'], 'image'), \PortMap\LibreNMS\Support\DiagramGroups::images($map)), true), 404);
        return (new AssetLibrary())->response($image);
    }
}
