"use client";

interface DrawioRendererProps {
  svgData: string;
  className?: string;
}

export const DrawioRenderer = ({ svgData, className = "" }: DrawioRendererProps) => {
  if (!svgData) {
    return (
      <div className={`border border-border rounded p-4 my-4 text-center text-muted-foreground ${className}`}>
        <p>Draw.io diagram (no preview available)</p>
      </div>
    );
  }

  return (
    <div
      className={`flex justify-center items-center my-4 ${className}`}
      dangerouslySetInnerHTML={{ __html: svgData }}
    />
  );
};
