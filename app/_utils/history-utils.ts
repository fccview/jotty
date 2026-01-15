export const formatHistoryDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "Just now";
  }

  if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    create: "Created",
    update: "Updated",
    rename: "Renamed",
    move: "Moved",
    delete: "Deleted",
    init: "Initialized",
  };
  return labels[action] || "Changed";
};

export const getActionColor = (
  action: string
): "default" | "success" | "warning" | "destructive" => {
  const colors: Record<string, "default" | "success" | "warning" | "destructive"> = {
    create: "success",
    update: "default",
    rename: "warning",
    move: "warning",
    delete: "destructive",
    init: "default",
  };
  return colors[action] || "default";
};
