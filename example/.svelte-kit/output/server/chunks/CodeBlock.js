import { h as spread_props, m as escape_html } from "./async.js";
import "clsx";
import { I as Icon } from "./Icon.js";
function Copy($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      [
        "rect",
        {
          "width": "14",
          "height": "14",
          "x": "8",
          "y": "8",
          "rx": "2",
          "ry": "2"
        }
      ],
      [
        "path",
        {
          "d": "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
        }
      ]
    ];
    Icon($$renderer2, spread_props([
      { name: "copy" },
      /**
       * @component @name Copy
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHg9IjgiIHk9IjgiIHJ4PSIyIiByeT0iMiIgLz4KICA8cGF0aCBkPSJNNCAxNmMtMS4xIDAtMi0uOS0yLTJWNGMwLTEuMS45LTIgMi0yaDEwYzEuMSAwIDIgLjkgMiAyIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/copy
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      props,
      {
        iconNode,
        children: ($$renderer3) => {
          props.children?.($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
function CodeBlock($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      code,
      lang = "typescript",
      theme = "github-dark",
      showCopy = true
    } = $$props;
    $$renderer2.push(`<div class="relative group">`);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<pre class="bg-zinc-950 text-zinc-100 p-4 rounded-xl font-mono text-sm overflow-x-auto border border-zinc-800">
      <code>${escape_html(code)}</code>
    </pre>`);
    }
    $$renderer2.push(`<!--]--> `);
    if (showCopy) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button class="absolute top-3 right-3 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors opacity-0 group-hover:opacity-100 z-10" aria-label="Copy code">`);
      {
        $$renderer2.push("<!--[!-->");
        Copy($$renderer2, { class: "w-4 h-4 text-zinc-400" });
      }
      $$renderer2.push(`<!--]--></button>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  CodeBlock as C
};
