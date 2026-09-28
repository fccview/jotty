import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import {
  BRAIN_DEPTH_DEFAULT,
  BRAIN_DEPTH_MAX,
  BRAIN_NODES_DEFAULT,
  BRAIN_NODES_MAX,
  BrainEdgeKinds,
  BrainNodeKinds,
  LinkKinds,
  LinkStyles,
  RelationsStatus,
} from "@/app/_consts/relations";
import { ShareDirections } from "@/app/_consts/sharing";
import { ItemTypes } from "@/app/_types/enums";
import { pageFields, required, totalField, uuidParam } from "./common";

const ORPHANS_DEFAULT = 25;

export const LINK_KINDS_TEXT =
  "kind says how the link is written. link is a [Title](/note/uuid) link standing on its own line, like the ones connect_items appends. mention is that same link inside a sentence, like connect_items style=mention makes. checklist is a link inside a checklist item or a - [ ] task. wiki is a [[Title]] link";

const statusField = z
  .enum(RelationsStatus)
  .describe("building while Jotty indexes links on first start, when every list comes back empty");

export const linkedItemSchema = z
  .object({
    uuid: z.string(),
    type: z.enum(ItemTypes),
    title: z.string(),
    category: z.string(),
    owner: z.string().optional(),
  })
  .register(apiNames, { id: "LinkedItem" });

const relatedItemSchema = linkedItemSchema.extend({
  kind: z
    .enum(LinkKinds)
    .describe(`${LINK_KINDS_TEXT}. When one item links another in several ways, the first of mention, link, checklist, wiki wins`),
});

export const relatedParams = uuidParam("itemId", "Note or checklist");

export const relatedSchema = linkedItemSchema
  .extend({
    status: statusField,
    tags: z.array(z.string()),
    backlinks: z.array(relatedItemSchema).describe("Items that link to this one"),
    links: z.array(relatedItemSchema).describe("Items this one links to"),
    unwritten: z.array(z.string()).describe("Titles this item links to with [[wikilinks]] that no note has yet"),
    mentions: z
      .array(linkedItemSchema.extend({ snippet: z.string() }))
      .describe("Notes that name this item in plain text without linking it"),
    suggestions: z
      .array(
        linkedItemSchema.extend({
          score: z.number().describe("0 to 1, higher shares more neighbours, relative to the strongest pair"),
          via: z
            .array(z.string())
            .describe("Titles of the items and #tags both share. One broad shared neighbour is weak evidence"),
        }),
      )
      .describe(
        "Items that share neighbours with this one but aren't linked to it. Jotty picks these from the link graph alone, so check via and read both items before linking",
      ),
  })
  .register(apiNames, { id: "Relations" });

export const brainQuery = z.object({
  focus: z
    .string()
    .optional()
    .describe("Item uuid to centre on. Without it you get the most linked items"),
  depth: z.coerce
    .number()
    .int()
    .min(1)
    .max(BRAIN_DEPTH_MAX)
    .default(BRAIN_DEPTH_DEFAULT)
    .describe("How many links away from focus to go"),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(BRAIN_NODES_MAX)
    .default(BRAIN_NODES_DEFAULT)
    .describe("Most nodes to return, nearest and most linked first"),
  suggestions: z
    .stringbool()
    .default(false)
    .describe("Include suggested links between the nodes returned"),
});

export const brainSchema = z
  .object({
    status: statusField,
    focus: z.string().optional(),
    nodes: z.array(
      z.object({
        id: z.string().describe("Item uuid, or ghost:<title> for a wikilink target nobody has written"),
        kind: z.enum(BrainNodeKinds),
        title: z.string(),
        category: z.string().optional(),
        owner: z.string().optional(),
        links: z.number().describe("Links to and from other items"),
        distance: z.number().optional().describe("Links away from focus"),
        tags: z.array(z.string()).optional(),
      }),
    ),
    edges: z.array(
      z.object({
        source: z.string(),
        target: z.string(),
        kind: z
          .enum(BrainEdgeKinds)
          .describe(`${LINK_KINDS_TEXT}. suggested is a likely link Jotty found. Two items linked in several ways get an edge per kind`),
        weight: z.number().describe("How many times source links to target, or the suggestion score"),
      }),
    ),
    total: z.number().describe("Nodes that matched before limit"),
    truncated: z.boolean().describe("True when limit left some out"),
  })
  .register(apiNames, { id: "Brain" });

export const orphansQuery = z.object({
  type: z.enum(ItemTypes).optional().describe("Only notes or only checklists, both when left out"),
  limit: z.coerce.number().int().min(1).default(ORPHANS_DEFAULT).describe("Most results to return"),
  offset: pageFields.offset,
});

export const orphansSchema = z.object({
  status: statusField,
  orphans: z.array(linkedItemSchema),
  total: z.number(),
});

export const unlinkBody = z.object({
  source: required("source").describe("Uuid of the note that holds the link"),
  target: required("target").describe("Uuid of the item it links to"),
});

export const unlinkedSchema = z.object({
  success: z.literal(true),
  removed: z.number().describe("Links taken out of the source note"),
  wikiLinks: z.number().describe("[[wikilinks]] from the source to the target, which this leaves alone"),
  warning: z.string().optional().describe("Set when a script manages the source note and may overwrite the change"),
});

export const linkedSchema = z.object({
  success: z.literal(true),
  warning: z.string().optional().describe("Set when a script manages the source note and may overwrite the change"),
});

export const linkBody = z.object({
  source: required("source").describe("Uuid of the note that gets the link"),
  target: required("target").describe("Uuid of the note or checklist to link to"),
  style: z
    .enum(LinkStyles)
    .default(LinkStyles.APPEND)
    .describe("append adds a link at the end of the note. mention turns the first plain mention of the target's title into a link"),
});

const permissionsSchema = z.object({
  canRead: z.boolean(),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
  canCreate: z.boolean().optional(),
});

export const sharesQuery = z.object({
  direction: z
    .enum(ShareDirections)
    .optional()
    .describe("withMe for items other people shared with you, byMe for yours. Both when left out"),
  type: z.enum(ItemTypes).optional().describe("Only notes or only checklists, both when left out"),
  ...pageFields,
});

export const shareSchema = linkedItemSchema
  .extend({
    direction: z.enum(ShareDirections),
    viaCategory: z.string().optional().describe("Set when the item is shared because its folder is"),
    permissions: permissionsSchema.optional().describe("What you can do with it, on withMe items"),
    isPublic: z.boolean().optional().describe("Anyone with the link can open it, on byMe items"),
    sharedWith: z
      .array(z.object({ username: z.string(), permissions: permissionsSchema }))
      .optional()
      .describe("Who holds it and what they can do, on byMe items"),
  })
  .register(apiNames, { id: "Share" });

export const sharesSchema = z.object({
  shares: z.array(shareSchema),
  total: totalField,
});
