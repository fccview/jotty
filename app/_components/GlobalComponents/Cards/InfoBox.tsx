interface InfoBoxProps {
  title: string;
  items: string[];
  variant: "warning" | "info" | "success";
}

export const InfoBox = ({ title, items, variant }: InfoBoxProps) => {
  const isWarning = variant === "warning";
  const isSuccess = variant === "success";
  const baseClasses = "p-4 rounded-jotty border";
  const variantClasses = isWarning
    ? "bg-destructive/5 border-destructive/20 text-destructive"
    : isSuccess
      ? "bg-green-500/5 border-green-500/20 text-green-600 dark:text-green-400"
      : "bg-primary/5 border-primary/20 text-primary";

  return (
    <div className={`jotty-info-box ${baseClasses} ${variantClasses}`}>
      <h3 className="text-md lg:text-sm font-medium mb-2">{title}</h3>
      <ul className="text-md lg:text-sm text-muted-foreground space-y-1">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
};
