// Enhance the existing Code block. Without JavaScript the source stays readable.
export async function renderContent() {
  const blocks = document.querySelectorAll<HTMLElement>(
    ':is(.prose, .session-message__body) pre > code:is(.language-mermaid, .language-latex, .language-math)',
  );
  if (!blocks.length) return;

  // Load each renderer only on pages that use it. All assets are served locally.
  const mermaidLoader = [...blocks].some((code) => code.classList.contains('language-mermaid'))
    ? import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' });
      return mermaid;
    }) : undefined;
  const mathLoader = [...blocks].some((code) => !code.classList.contains('language-mermaid'))
    ? Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(([{ default: katex }]) => katex)
    : undefined;

  // Handle import failures even if another renderer is still working.
  const [mermaidResult, mathResult] = await Promise.allSettled([mermaidLoader, mathLoader]);
  const mermaid = mermaidResult.status === 'fulfilled' ? mermaidResult.value : undefined;
  const katex = mathResult.status === 'fulfilled' ? mathResult.value : undefined;

  for (const [index, code] of [...blocks].entries()) {
    const pre = code.parentElement!;
    const source = code.textContent || '';
    const diagram = code.classList.contains('language-mermaid');
    const output = document.createElement('figure');
    output.className = diagram ? 'content-diagram' : 'content-equation';
    output.setAttribute('aria-label', diagram ? 'Diagramme Mermaid' : 'Équation mathématique');

    try {
      if (diagram) {
        if (!mermaid) throw new Error('Mermaid unavailable');
        // Mermaid measures text in the DOM. Keep its temporary drawing hidden.
        output.style.visibility = 'hidden';
        output.style.position = 'absolute';
        pre.before(output);
        const { svg } = await mermaid.render(`content-mermaid-${index}`, source, output);
        output.innerHTML = svg;
        output.style.removeProperty('visibility');
        output.style.removeProperty('position');
      } else {
        if (!katex) throw new Error('KaTeX unavailable');
        katex.render(source, output, { displayMode: true, throwOnError: true, trust: false });
      }
      pre.replaceWith(output);
    } catch {
      output.remove();
      const error = document.createElement('p');
      error.className = 'content-render-error';
      error.setAttribute('role', 'status');
      error.textContent = diagram
        ? 'Diagramme indisponible : le code source est conservé ci-dessous.'
        : 'Équation indisponible : le code LaTeX est conservé ci-dessous.';
      pre.before(error);
    }
  }
}
