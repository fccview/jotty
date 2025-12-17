"use client";

import { useMemo, useState } from "react";
import { LinkIndex } from "@/app/_server/actions/link";
import dynamic from "next/dynamic";
import {
  File02Icon,
  Link04Icon,
  SharedWifiIcon,
  RefreshIcon,
} from "hugeicons-react";
import { Checklist, ItemType, Note } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { getUsername } from "@/app/_server/actions/users";
import { rebuildLinkIndex } from "@/app/_server/actions/link";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useAppMode } from "@/app/_providers/AppModeProvider";

const ResponsiveNetwork = dynamic(
  () => import("@nivo/network").then((mod) => mod.ResponsiveNetwork),
  { ssr: false }
);

const NOTES_COLOR = "#3b82f6";
const CHECKLISTS_COLOR = "#10b981";
const TEXT_COLOR = "rgb(var(--foreground))";
const BORDER_COLOR = "rgb(var(--muted-foreground))";

const getLabel = (
  node: any,
  notes: Partial<Note>[],
  checklists: Partial<Checklist>[]
) => {
  const fullItem =
    (notes.find((n) => n.uuid === node.data.id) as Note | undefined) ||
    (checklists.find((c) => c.uuid === node.data.id) as Checklist | undefined);
  return `${fullItem?.id}.md`;
};

const CustomNode = ({ node, onHover, onLeave }: any) => {
  const { notes, checklists } = useAppMode();
  const label = getLabel(node, notes, checklists);

  const nodeColors: Record<string, string> = {
    note: NOTES_COLOR,
    checklist: CHECKLISTS_COLOR,
  };

  const indicatorRadius = Math.max(
    3,
    Math.min(12, 3 + (node.data.connectionCount || 0) * 0.8)
  );
  const textOffset = indicatorRadius * 2 + 4;

  return (
    <g
      style={{ cursor: "pointer" }}
      onMouseEnter={(e) => onHover && onHover(node, e)}
      onMouseLeave={() => onLeave && onLeave()}
    >
      <circle
        cx={node.x}
        cy={node.y}
        r={indicatorRadius}
        fill={nodeColors[node.data.type] || NOTES_COLOR}
      />
      <text
        x={node.x + textOffset}
        y={node.y}
        textAnchor="start"
        dominantBaseline="central"
        fontSize="12"
        fill={TEXT_COLOR}
        fontWeight="500"
        style={{ pointerEvents: "none" }}
      >
        {label.length > 25 ? label.substring(0, 22) + "..." : label}
      </text>
    </g>
  );
};

interface LinksTabProps {
  linkIndex: LinkIndex;
}

interface NetworkNode {
  id: string;
  label: string;
  type: ItemType;
  size: number;
  color: string;
  connectionCount: number;
}

interface NetworkLink {
  source: string;
  target: string;
  distance: number;
}

export const LinksTab = ({ linkIndex }: LinksTabProps) => {
  const { notes, checklists } = useAppMode();
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [rebuildingIndex, setRebuildingIndex] = useState(false);

  const handleNodeHover = (node: any, event?: any) => {
    setHoveredNode(node);
    if (event) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  };

  const handleNodeLeave = () => {
    setHoveredNode(null);
  };

  const handleRebuildIndex = async () => {
    setRebuildingIndex(true);
    try {
      const username = await getUsername();
      await rebuildLinkIndex(username);
      alert(
        "Successfully rebuilt link index! The page will reload to show updated connections."
      );
      window.location.reload();
    } catch (error) {
      console.error("Failed to rebuild index:", error);
      alert("Failed to rebuild link index. Please try again.");
    } finally {
      setRebuildingIndex(false);
    }
  };

  const networkData = useMemo(() => {
    const nodes = new Map<string, NetworkNode>();
    const links: NetworkLink[] = [];

    Object.entries(linkIndex.notes).forEach(([uuid, itemLinks]) => {
      if (!nodes.has(uuid)) {
        const item = notes.find((n) => n.uuid === uuid);
        const label = item?.title || `Note ${uuid.slice(0, 8)}`;

        const connectionCount =
          itemLinks.isLinkedTo.notes.length +
          itemLinks.isLinkedTo.checklists.length +
          itemLinks.isReferencedIn.notes.length +
          itemLinks.isReferencedIn.checklists.length;
        const size = Math.max(5, Math.min(25, 5 + connectionCount * 2));
        nodes.set(uuid, {
          id: uuid,
          label: label,
          type: ItemTypes.NOTE,
          size: size,
          color: NOTES_COLOR,
          connectionCount,
        });
      }
    });

    Object.entries(linkIndex.checklists).forEach(([uuid, itemLinks]) => {
      if (!nodes.has(uuid)) {
        const item = checklists.find((c) => c.uuid === uuid);
        const label = item?.title || `Checklist ${uuid.slice(0, 8)}`;

        const connectionCount =
          itemLinks.isLinkedTo.notes.length +
          itemLinks.isLinkedTo.checklists.length +
          itemLinks.isReferencedIn.notes.length +
          itemLinks.isReferencedIn.checklists.length;
        const size = Math.max(5, Math.min(25, 5 + connectionCount * 2));
        nodes.set(uuid, {
          id: uuid,
          label: label,
          type: ItemTypes.CHECKLIST,
          size: size,
          color: CHECKLISTS_COLOR,
          connectionCount,
        });
      }
    });

    const linkSet = new Set<string>();

    Object.entries(linkIndex.notes).forEach(([sourcePath, itemLinks]) => {
      itemLinks.isLinkedTo.notes.forEach((targetPath) => {
        if (nodes.has(targetPath) && sourcePath !== targetPath) {
          const linkKey = [sourcePath, targetPath].sort().join("->");
          if (!linkSet.has(linkKey)) {
            linkSet.add(linkKey);
            links.push({
              source: sourcePath,
              target: targetPath,
              distance: 80,
            });
          }
        }
      });

      itemLinks.isLinkedTo.checklists.forEach((targetPath) => {
        if (nodes.has(targetPath) && sourcePath !== targetPath) {
          const linkKey = [sourcePath, targetPath].sort().join("->");
          if (!linkSet.has(linkKey)) {
            linkSet.add(linkKey);
            links.push({
              source: sourcePath,
              target: targetPath,
              distance: 80,
            });
          }
        }
      });
    });

    Object.entries(linkIndex.checklists).forEach(([sourcePath, itemLinks]) => {
      itemLinks.isLinkedTo.checklists.forEach((targetPath) => {
        if (nodes.has(targetPath) && sourcePath !== targetPath) {
          const linkKey = [sourcePath, targetPath].sort().join("->");
          if (!linkSet.has(linkKey)) {
            linkSet.add(linkKey);
            links.push({
              source: sourcePath,
              target: targetPath,
              distance: 80,
            });
          }
        }
      });

      itemLinks.isLinkedTo.notes.forEach((targetPath) => {
        if (nodes.has(targetPath) && sourcePath !== targetPath) {
          const linkKey = [sourcePath, targetPath].sort().join("->");
          if (!linkSet.has(linkKey)) {
            linkSet.add(linkKey);
            links.push({
              source: sourcePath,
              target: targetPath,
              distance: 80,
            });
          }
        }
      });
    });

    return {
      nodes: Array.from(nodes.values()),
      links: links,
    };
  }, [linkIndex, notes, checklists]);

  const totalNodes = networkData.nodes.length;
  const totalLinks = networkData.links.length;

  if (totalNodes === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Content Links</h2>
          <p className="text-muted-foreground">
            Visualize relationships between your notes and checklists
          </p>
        </div>

        <div className="bg-card border border-border rounded-jotty p-4 sm:p-6 mb-6 lg:mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary rounded-jotty">
                <File02Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {totalNodes}
                </div>
                <div className="text-xs text-muted-foreground">Total Items</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary rounded-jotty">
                <Link04Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {totalLinks}
                </div>
                <div className="text-xs text-muted-foreground">Connections</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary rounded-jotty">
                <SharedWifiIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {
                    networkData.nodes.filter((n) => n.connectionCount > 0)
                      .length
                  }
                </div>
                <div className="text-xs text-muted-foreground">
                  Connected Items
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-md p-8">
          <div className="text-center space-y-4">
            <div className="text-6xl">🔗</div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No Links Found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Start creating internal links in your notes and checklists to
                see the relationship network here. Use the format{" "}
                <code className="bg-muted px-1 py-0.5 rounded text-sm">
                  /note/your-note
                </code>{" "}
                or{" "}
                <code className="bg-muted px-1 py-0.5 rounded text-sm">
                  /checklist/your-list
                </code>{" "}
                in your content.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Content Links</h2>
        <p className="text-muted-foreground">
          Visualize relationships between your notes and checklists
        </p>
      </div>

      <div className="bg-card border border-border rounded-jotty p-4 sm:p-6 mb-6 lg:mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-jotty">
              <File02Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {totalNodes}
              </div>
              <div className="text-xs text-muted-foreground">Total Items</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-jotty">
              <SharedWifiIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {totalLinks}
              </div>
              <div className="text-xs text-muted-foreground">Connections</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-jotty">
              <SharedWifiIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {networkData.nodes.filter((n) => n.connectionCount > 0).length}
              </div>
              <div className="text-xs text-muted-foreground">
                Connected Items
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-md p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Link Network</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>Notes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Checklists</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={handleRebuildIndex}
                disabled={rebuildingIndex}
                className="flex items-center gap-2"
                title="Rebuild link indexes to update connection data"
              >
                <RefreshIcon
                  className={`h-3 w-3 ${rebuildingIndex ? "animate-spin" : ""}`}
                />
                {rebuildingIndex ? "Rebuilding..." : "Rebuild Indexes"}
              </Button>
            </div>
          </div>

          <div className="h-[600px] w-full">
            <ResponsiveNetwork
              data={networkData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              linkDistance={(e: any) => e.distance}
              centeringStrength={0.3}
              repulsivity={10}
              nodeSize={(n: any) => n.size}
              activeNodeSize={(n: any) => n.size * 1.5}
              nodeComponent={(props: any) => (
                <CustomNode
                  {...props}
                  onHover={handleNodeHover}
                  onLeave={handleNodeLeave}
                />
              )}
              linkThickness={2}
              linkColor={BORDER_COLOR}
              motionConfig={{
                mass: 1,
                tension: 120,
                friction: 14,
              }}
            />
          </div>

          {hoveredNode && (
            <div
              className="fixed z-50 bg-popover text-popover-foreground p-3 rounded-jotty border shadow-lg max-w-xs pointer-events-none"
              style={{
                left: mousePosition.x + 10,
                top: mousePosition.y - 10,
                transform: "translate(0, -100%)",
              }}
            >
              <div className="font-semibold text-sm">
                {hoveredNode.data.label}
              </div>
              <div className="text-xs text-muted-foreground capitalize mt-1">
                {hoveredNode.data.type} • {hoveredNode.data.connectionCount}{" "}
                connection{hoveredNode.data.connectionCount !== 1 ? "s" : ""}
                {hoveredNode.data.connectionCount >= 5
                  ? " (highly connected)"
                  : hoveredNode.data.connectionCount >= 2
                  ? " (moderately connected)"
                  : hoveredNode.data.connectionCount === 0
                  ? " (isolated)"
                  : ""}
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-mono line-clamp-1">
                {hoveredNode.data.id}
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground text-center">
            Hover nodes for details • Circle size indicates connections
          </div>
        </div>
      </div>
    </div>
  );
};
