import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.CUC7tKH1.js","_app/immutable/chunks/DQV5tA9x.js","_app/immutable/chunks/CcNfbX7c.js","_app/immutable/chunks/eKz8nVri.js","_app/immutable/chunks/DpJMuPu_.js","_app/immutable/chunks/pjtpxPnz.js","_app/immutable/chunks/hjW-poWs.js","_app/immutable/chunks/CH4swi6y.js","_app/immutable/chunks/CsL-fT1w.js","_app/immutable/chunks/fukTWLM2.js"];
export const stylesheets = ["_app/immutable/assets/0.BobJevVB.css"];
export const fonts = [];
