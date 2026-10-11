<?php

declare(strict_types=1);

namespace PortMap\LibreNMS;

use Illuminate\Support\ServiceProvider;
use LibreNMS\Interfaces\Plugins\Hooks\MenuEntryHook;
use LibreNMS\Interfaces\Plugins\PluginManagerInterface;
use PortMap\LibreNMS\Hooks\PortMapMenu;

final class PortMapServiceProvider extends ServiceProvider
{
    public const SLUG = 'portmap';
    public const VERSION = '1.0.0';

    public function boot(PluginManagerInterface $manager): void
    {
        $base = dirname(__DIR__);
        $this->loadViewsFrom($base . '/resources/views', self::SLUG);
        $manager->publishHook(self::SLUG, MenuEntryHook::class, PortMapMenu::class);

        // Keep route registration independent of the cached enabled flag.
        // The controller checks that flag on every request.
        $this->loadRoutesFrom($base . '/routes/web.php');
    }
}
