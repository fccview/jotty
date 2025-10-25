import { ReactNode } from "react";

interface FormWrapperProps {
    title: string;
    children: ReactNode;
    action?: ReactNode;
}

export const FormWrapper = ({ title, children, action }: FormWrapperProps) => {
    return (
        <div className="bg-background border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{title}</h3>
                {action}
            </div>
            <div className="space-y-6">
                {children}
            </div>
        </div>
    );
};
