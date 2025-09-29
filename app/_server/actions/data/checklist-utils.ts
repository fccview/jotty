import { Checklist, ChecklistType } from "@/app/_types";

const parseMarkdown = (
  content: string,
  id: string,
  category: string,
  owner?: string,
  isShared?: boolean,
  fileStats?: { birthtime: Date; mtime: Date }
): Checklist => {
  const lines = content.split("\n");
  const title = lines[0]?.replace(/^#\s*/, "") || "Untitled";

  let type: ChecklistType = "simple";
  if (content.includes("<!-- type:task -->")) {
    type = "task";
  } else if (
    content.includes(" | status:") ||
    content.includes(" | time:") ||
    content.includes(" | estimated:") ||
    content.includes(" | target:")
  ) {
    type = "task";
  }

  const items = lines
    .slice(1)
    .filter((line) => line.trim().startsWith("- ["))
    .map((line, index) => {
      const completed = line.includes("- [x]");
      const text = line.replace(/^-\s*\[[x ]\]\s*/, "");

      if (type === "task" && text.includes(" | ")) {
        const parts = text.split(" | ");
        const itemText = parts[0].replace(/∣/g, "|");
        const metadata = parts.slice(1);

        let status: "todo" | "in_progress" | "completed" | "paused" = "todo";
        let timeEntries: any[] = [];
        let estimatedTime: number | undefined;
        let targetDate: string | undefined;

        metadata.forEach((meta) => {
          if (meta.startsWith("status:")) {
            const statusValue = meta.substring(7);
            if (
              ["todo", "in_progress", "completed", "paused"].includes(
                statusValue
              )
            ) {
              status = statusValue as
                | "todo"
                | "in_progress"
                | "completed"
                | "paused";
            }
          } else if (meta.startsWith("time:")) {
            const timeValue = meta.substring(5);
            if (timeValue && timeValue !== "0") {
              try {
                timeEntries = JSON.parse(timeValue);
              } catch {
                timeEntries = [];
              }
            }
          } else if (meta.startsWith("estimated:")) {
            estimatedTime = parseInt(meta.substring(10));
          } else if (meta.startsWith("target:")) {
            targetDate = meta.substring(7);
          }
        });

        return {
          id: `${id}-${index}`,
          text: itemText,
          completed,
          order: index,
          status,
          timeEntries,
          estimatedTime,
          targetDate,
        };
      } else {
        // Check for plugin data
        const pluginMatch = text.match(/\|\s*plugins:(.*?)(?=\||$)/);
        let pluginData;
        if (pluginMatch) {
          try {
            pluginData = JSON.parse(pluginMatch[1].trim());
          } catch (e) {
            console.error('Failed to parse plugin data:', e);
          }
        }

        return {
          id: `${id}-${index}`,
          text: text.replace(/∣/g, "|").replace(/\|\s*plugins:.*?(?=\||$)/, '').trim(),
          completed,
          order: index,
          ...(pluginData && { pluginData }),
        };
      }
    });

  return {
    id,
    title,
    type,
    category,
    items,
    createdAt: fileStats
      ? fileStats.birthtime.toISOString()
      : new Date().toISOString(),
    updatedAt: fileStats
      ? fileStats.mtime.toISOString()
      : new Date().toISOString(),
    owner,
    isShared,
  };
};

const listToMarkdown = (list: Checklist): string => {
  const header =
    list.type === "task"
      ? `# ${list.title}\n<!-- type:task -->\n`
      : `# ${list.title}\n`;
  const items = list.items
    .sort((a, b) => a.order - b.order)
    .map((item) => {
      const escapedText = item.text.replace(/\|/g, "∣");

      if (list.type === "task") {
        const metadata: string[] = [];

        if (item.status && item.status !== "todo") {
          metadata.push(`status:${item.status}`);
        }

        if (item.timeEntries && item.timeEntries.length > 0) {
          metadata.push(`time:${JSON.stringify(item.timeEntries)}`);
        } else {
          metadata.push("time:0");
        }

        if (item.estimatedTime) {
          metadata.push(`estimated:${item.estimatedTime}`);
        }

        if (item.targetDate) {
          metadata.push(`target:${item.targetDate}`);
        }

        return `- [${item.completed ? "x" : " "
          }] ${escapedText} | ${metadata.join(" | ")}`;
      }

      // Add plugin data if present
      const pluginData = item.pluginData ? ` | plugins:${JSON.stringify(item.pluginData)}` : '';
      return `- [${item.completed ? "x" : " "}] ${escapedText}${pluginData}`;
    })
    .join("\n");
  return `${header}\n${items}`;
};

export { parseMarkdown, listToMarkdown };
