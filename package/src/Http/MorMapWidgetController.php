<?php

declare(strict_types=1);

namespace PortMap\LibreNMS\Http;

use App\Models\UserWidget;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use LibreNMS\Interfaces\Plugins\PluginManagerInterface;
use PortMap\LibreNMS\PortMapServiceProvider;
use PortMap\LibreNMS\Support\PublishedMaps;

/** Uses LibreNMS's widget discovery, storage and settings-save endpoint. */
final class MorMapWidgetController extends Controller
{
    public function getTitle(): string
    {
        return 'MorMap';
    }

    public function __invoke(Request $request): JsonResponse
    {
        abort_unless(app(PluginManagerInterface::class)->pluginEnabled(PortMapServiceProvider::SLUG), 404);
        abort_unless($request->user()?->can('admin') === true, 403);

        $input = $request->validate(['id' => 'required|integer|min:1', 'settings' => 'sometimes|boolean']);
        $widget = UserWidget::findOrFail($input['id']);
        abort_unless($widget->widget === 'mormap' && $widget->dashboard
            && $request->user()->can('view', $widget->dashboard), 403);

        $settings = array_replace(['title' => '', 'mormap_map' => '', 'refresh' => 60], (array) $widget->settings);
        $settings['id'] = $widget->getKey();
        $settings['title'] = is_string($settings['title']) ? $settings['title'] : '';
        $settings['refresh'] = max(1, (int) $settings['refresh']);
        $maps = PublishedMaps::all();
        $map = null;
        foreach ($maps as $published) {
            if ($published['key'] === $settings['mormap_map']) {
                $map = $published;
                break;
            }
        }

        $showSettings = $request->boolean('settings');
        $html = view($showSettings ? 'portmap::widgets.settings' : 'portmap::widgets.map',
            array_merge($settings, ['maps' => $maps, 'map' => $map]))->render();

        return response()->json([
            'status' => 'ok',
            'title' => htmlspecialchars(trim($settings['title']) ?: ($map ? 'MorMap · ' . $map['name'] : 'MorMap'), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
            'html' => $html,
            'show_settings' => (int) $showSettings,
            'settings' => $settings,
        ]);
    }
}
