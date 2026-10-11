<?php

declare(strict_types=1);

namespace PortMap\LibreNMS\Hooks;

use Illuminate\Support\Facades\Auth;
use PortMap\LibreNMS\Storage\MapStore;
use PortMap\LibreNMS\Support\PublishedMaps;
use LibreNMS\Interfaces\Plugins\Hooks\MenuEntryHook;

final class PortMapMenu implements MenuEntryHook
{
    public function authorize(): bool
    {
        return Auth::user()?->can('admin') === true;
    }

    /** @return array{0: string, 1: array<string, mixed>} */
    public function handle(string $pluginName): array
    {
        // A damaged snapshot must not break LibreNMS's navbar on other pages.
        try {
            $maps = PublishedMaps::all();
        } catch (\Throwable $error) {
            report($error);
            $maps = [];
        }
        return ['portmap::menu', ['mormapLinks' => $maps]];
    }
}
