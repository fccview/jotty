"use client";

import { useState, useEffect } from "react";
import { PaintBrush04Icon } from "hugeicons-react";

interface DynamicIconProps {
  iconName: string;
  className?: string;
}

export const DynamicIcon = ({
  iconName,
  className = "h-4 w-4",
}: DynamicIconProps) => {
  const [IconComponent, setIconComponent] = useState<any>(null);

  useEffect(() => {
    if (!iconName) {
      setIconComponent(PaintBrush04Icon);
      return;
    }

    import("hugeicons-react")
      .then((hugeicons) => {
        const icon = (hugeicons as any)[iconName];
        if (icon) {
          setIconComponent(() => icon);
        } else {
          setIconComponent(PaintBrush04Icon);
        }
      })
      .catch(() => {
        setIconComponent(PaintBrush04Icon);
      });
  }, [iconName]);

  if (!IconComponent) {
    return <PaintBrush04Icon className={className} />;
  }

  return <IconComponent className={className} />;
};
