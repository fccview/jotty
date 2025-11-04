interface InfoBoxProps {
  title: string;
  items: string[];
  variant: "warning" | "info";
}

export const InfoBox = ({ title, items, variant }: InfoBoxProps) => {
  const isWarning = variant === "warning";
  const baseClasses = "p-4 rounded-lg border";
  const variantClasses = isWarning
    ? "bg-destructive/5 border-destructive/20 text-destructive"
    : "bg-primary/5 border-primary/20 text-primary";

  return (
    <div className={`jotty-info-box ${baseClasses} ${variantClasses}`}>
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      <ul className="text-sm text-muted-foreground space-y-1">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
};
