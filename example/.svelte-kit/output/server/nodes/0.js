import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.BAmV5ftT.js","_app/immutable/chunks/CDtJAJDW.js","_app/immutable/chunks/43DoFiGK.js","_app/immutable/chunks/B5-rS708.js","_app/immutable/chunks/BC2wu9jn.js","_app/immutable/chunks/C-T-am70.js","_app/immutable/chunks/DnayzfWM.js","_app/immutable/chunks/DcIzPOfe.js","_app/immutable/chunks/BqN1ELlW.js","_app/immutable/chunks/B4gfF3h4.js"];
export const stylesheets = ["_app/immutable/assets/0.SmRA5ebc.css"];
export const fonts = [];
