export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["astral.png","cobalt.png","copper.png","favicon.png","gold.png","infernal.png","iron.png","mining-game.png","obsidian.png","silver.png"]),
	mimeTypes: {".png":"image/png"},
	_: {
		client: {start:"_app/immutable/entry/start.BlpTYxpc.js",app:"_app/immutable/entry/app.BT6d2Bl0.js",imports:["_app/immutable/entry/start.BlpTYxpc.js","_app/immutable/chunks/pjtpxPnz.js","_app/immutable/chunks/CcNfbX7c.js","_app/immutable/entry/app.BT6d2Bl0.js","_app/immutable/chunks/PPVm8Dsz.js","_app/immutable/chunks/CcNfbX7c.js","_app/immutable/chunks/DQV5tA9x.js","_app/immutable/chunks/hjW-poWs.js","_app/immutable/chunks/fukTWLM2.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js'))
		],
		remotes: {
			'q5s0im': __memo(() => import('./chunks/remote-q5s0im.js'))
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/auth/[...all]",
				pattern: /^\/api\/auth(?:\/([^]*))?\/?$/,
				params: [{"name":"all","optional":false,"rest":true,"chained":true}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/auth/_...all_/_server.ts.js'))
			},
			{
				id: "/docs",
				pattern: /^\/docs\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/docs/api",
				pattern: /^\/docs\/api\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/mission",
				pattern: /^\/mission\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
