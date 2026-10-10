import { html as beautifyHtml } from "js-beautify";
import { NodeName, type BlockContext, type BlockWriter, type NodeJson, type Serializer } from "./types";

const ALIGN_RULES: Record<string, (width: number) => string> = {
  left: (width) => `:${"-".repeat(Math.max(width - 1, 2))}`,
  right: (width) => `${"-".repeat(Math.max(width - 1, 2))}:`,
  center: (width) => `:${"-".repeat(Math.max(width - 2, 1))}:`,
};

const cellsOf = (row: NodeJson) =>
  (row.content || []).filter((cell) => cell.type === NodeName.TableCell || cell.type === NodeName.TableHeader);

const isSpanned = (cell: NodeJson) =>
  Number(cell.attrs?.colspan ?? 1) > 1 || Number(cell.attrs?.rowspan ?? 1) > 1;

const isSimpleCell = (cell: NodeJson) => {
  const children = cell.content || [];
  return children.length <= 1 && children.every((child) => child.type === NodeName.Paragraph) && !isSpanned(cell);
};

export const needsHtmlTable = (node: NodeJson, context: BlockContext) => {
  const rows = node.content || [];
  if (context.options.tableSyntax === "html") return true;
  if (rows.length === 0) return false;
  const width = cellsOf(rows[0]).length;
  const headerOnTop = cellsOf(rows[0]).every((cell) => cell.type === NodeName.TableHeader);
  const headersBelow = rows.slice(1).some((row) => cellsOf(row).some((cell) => cell.type === NodeName.TableHeader));
  if (!headerOnTop || headersBelow) return true;
  return rows.some((row) => cellsOf(row).length !== width || !cellsOf(row).every(isSimpleCell));
};

const htmlTable = (node: NodeJson, context: BlockContext) => {
  const render = context.options.renderHtml;
  if (!render) throw new Error("renderHtml is required to write an html table");
  return beautifyHtml(render(node), { indent_size: 2, unformatted: [] });
};

const markdownTable = (node: NodeJson, context: BlockContext, serializer: Serializer) => {
  const rows = (node.content || []).map((row) =>
    cellsOf(row).map((cell) =>
      serializer.inline(cell.content?.[0]?.content, { ...context, inTable: true }).replace(/\n/g, " "),
    ),
  );
  if (rows.length === 0) return "";
  const aligns = cellsOf(node.content![0]).map((cell, index) => {
    const own = cell.attrs?.align;
    if (own) return String(own);
    const below = node.content!.slice(1).map((row) => cellsOf(row)[index]?.attrs?.align).find(Boolean);
    return below ? String(below) : "";
  });
  const widths = rows[0].map((_cell, index) =>
    Math.max(3, ...rows.map((row) => (row[index] ?? "").length)),
  );
  const line = (cells: string[]) => `| ${cells.map((cell, index) => cell.padEnd(widths[index])).join(" | ")} |`;
  const rule = `| ${widths.map((width, index) => (ALIGN_RULES[aligns[index]] ?? ((w: number) => "-".repeat(w)))(width)).join(" | ")} |`;
  return [line(rows[0]), rule, ...rows.slice(1).map(line)].join("\n");
};

export const table: BlockWriter = (node, context, serializer) =>
  needsHtmlTable(node, context) ? htmlTable(node, context) : markdownTable(node, context, serializer);

export const TABLE_BLOCKS = {
  [NodeName.Table]: table,
};
