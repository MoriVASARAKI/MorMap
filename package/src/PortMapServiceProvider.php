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
    public const VERSION = '1.0.2';

    /**
     * A route cache created before MorMap was installed does not contain the
     * package routes. Let Laravel load routes normally for this request,
     * without touching the application's cache files or requiring a second
     * installation command.
     */
    public function register(): void
    {
        if (! $this->app->routesAreCached()) {
            return;
        }

        $cachedRoutes = @file_get_contents($this->app->getCachedRoutesPath());

        if ($cachedRoutes === false
            || ! str_contains($cachedRoutes, "'mormap.home'")
            || ! str_contains($cachedRoutes, "'mormap.asset'")
            || ! str_contains($cachedRoutes, "'mormap.published'")) {
            $this->app->instance('routes.cached', false);
        }
    }

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
