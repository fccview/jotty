import { indent, LIST_TYPES, NodeName, type BlockContext, type BlockWriter, type NodeJson, type Serializer } from "./types";

const BULLETS = ["-", "*"];
const DELIMITERS = [".", ")"];

export const alternate = (options: string[], current?: string) =>
  options[(options.indexOf(current ?? options[0]) + 1) % options.length];

const needsBlankLine = (next: NodeJson) => !LIST_TYPES.has(next.type);

const itemBody = (item: NodeJson, context: BlockContext, serializer: Serializer) => {
  const children = item.content || [];
  const contexts = blockContexts(children, context);
  const parts = children.map((child, index) =>
    serializer.block(child, { ...contexts[index], soleChild: children.length === 1 || index === 0 }),
  );
  let body = "";
  let loose = false;
  parts.forEach((part, index) => {
    if (index === 0) {
      body = part;
      return;
    }
    const blank = needsBlankLine(children[index]);
    loose ||= blank;
    body += blank ? `\n\n${part}` : `\n${part}`;
  });
  return { body, loose };
};

const writeList = (
  node: NodeJson,
  context: BlockContext,
  serializer: Serializer,
  marker: (index: number, item: NodeJson) => string,
) => {
  const items = (node.content || []).map((item, index) => {
    const prefix = marker(index, item);
    const { body, loose } = itemBody(item, { ...context, bullet: undefined, delimiter: undefined }, serializer);
    const continuation = " ".repeat(prefix.replace(/\[[ xX]\] $/, "").length);
    const text = body ? indent(body, continuation, prefix) : prefix.trimEnd();
    return { text, loose };
  });
  const loose = items.some((item) => item.loose);
  return items.map((item) => item.text).join(loose ? "\n\n" : "\n");
};

export const bulletList: BlockWriter = (node, context, serializer) => {
  const bullet = context.bullet ?? BULLETS[0];
  return writeList(node, context, serializer, () => `${bullet} `);
};

export const taskList: BlockWriter = (node, context, serializer) => {
  const bullet = context.bullet ?? BULLETS[0];
  return writeList(node, context, serializer, (_index, item) => `${bullet} [${item.attrs?.checked ? "x" : " "}] `);
};

export const orderedList: BlockWriter = (node, context, serializer) => {
  const start = Number(node.attrs?.start ?? 1);
  const delimiter = context.delimiter ?? DELIMITERS[0];
  return writeList(node, context, serializer, (index) => `${start + index}${delimiter} `);
};

export const listStyleAfter = (previous: NodeJson | undefined, previousContext: BlockContext | undefined, node: NodeJson): Partial<BlockContext> => {
  if (!previous || !previousContext) return {};
  const bullets = new Set<string>([NodeName.BulletList, NodeName.TaskList]);
  if (bullets.has(previous.type) && bullets.has(node.type)) {
    return { bullet: alternate(BULLETS, previousContext.bullet) };
  }
  if (previous.type === NodeName.OrderedList && node.type === NodeName.OrderedList) {
    return { delimiter: alternate(DELIMITERS, previousContext.delimiter) };
  }
  return {};
};

export const blockContexts = (nodes: NodeJson[], base: BlockContext): BlockContext[] => {
  const contexts: BlockContext[] = [];
  nodes.forEach((node, index) => {
    contexts.push({
      ...base,
      bullet: undefined,
      delimiter: undefined,
      ...listStyleAfter(nodes[index - 1], contexts[index - 1], node),
    });
  });
  return contexts;
};

export const LIST_BLOCKS = {
  [NodeName.BulletList]: bulletList,
  [NodeName.TaskList]: taskList,
  [NodeName.OrderedList]: orderedList,
};
