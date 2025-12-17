import { ReactNode } from "react";

interface FormWrapperProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  contentMaxHeight?: string;
}

export const FormWrapper = ({
  title,
  children,
  action,
  contentMaxHeight,
}: FormWrapperProps) => {
  return (
    <div className="jotty-form-wrapper bg-background border border-border rounded-jotty p-6">
      <div className="jotty-form-wrapper-header flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {action}
      </div>
      <div
        className={`jotty-form-wrapper-content space-y-6 ${
          contentMaxHeight ? `max-h-[${contentMaxHeight}] overflow-y-auto` : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
};
