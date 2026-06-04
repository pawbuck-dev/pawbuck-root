export type ExportSection = {
  id: string;
  html: string;
  isEmpty: boolean;
};

export type ExportPage = {
  sections: ExportSection[];
};

export function section(id: string, html: string, isEmpty: boolean): ExportSection {
  return { id, html, isEmpty };
}

/** Drop pages with no non-empty sections unless forceKeep is true. */
export function compactPages(pages: ExportPage[], forceKeepIndices: number[] = []): ExportPage[] {
  return pages.filter((page, index) => {
    if (forceKeepIndices.includes(index)) return true;
    return page.sections.some((s) => !s.isEmpty);
  });
}

export function renderExportPages(
  pages: ExportPage[],
  renderPage: (pageIndex: number, totalPages: number, sectionHtml: string) => string
): string {
  const total = pages.length;
  return pages
    .map((page, i) => {
      const body = page.sections.map((s) => s.html).join("");
      return renderPage(i + 1, total, body);
    })
    .join("");
}

export function countRenderedPages(html: string): number {
  return (html.match(/class="page"/g) ?? []).length;
}
