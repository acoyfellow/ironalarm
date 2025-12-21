
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/auth" | "/api/auth/[...all]" | "/docs" | "/docs/api" | "/mission";
		RouteParams(): {
			"/api/auth/[...all]": { all: string }
		};
		LayoutParams(): {
			"/": { all?: string };
			"/api": { all?: string };
			"/api/auth": { all?: string };
			"/api/auth/[...all]": { all: string };
			"/docs": Record<string, never>;
			"/docs/api": Record<string, never>;
			"/mission": Record<string, never>
		};
		Pathname(): "/" | "/api" | "/api/" | "/api/auth" | "/api/auth/" | `/api/auth/${string}` & {} | `/api/auth/${string}/` & {} | "/docs" | "/docs/" | "/docs/api" | "/docs/api/" | "/mission" | "/mission/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/astral.png" | "/cobalt.png" | "/copper.png" | "/favicon.png" | "/gold.png" | "/infernal.png" | "/iron.png" | "/mining-game.png" | "/obsidian.png" | "/silver.png" | string & {};
	}
}