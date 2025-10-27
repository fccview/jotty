import { Checklist, Note } from "@/app/_types";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { useTranslations } from "next-intl";

type ContentItem = (Checklist | Note) & { link: string; details: string };

export const AdminContentColumn = ({ title, icon, items }: { title: string; icon: ReactNode; items: ContentItem[] }) => {
    const t = useTranslations();

    return (
        <div>
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                {icon}
                {title} ({items.length})
            </h4>
            {items.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {items.map((item) => (
                        <Link
                            key={`${item.category}-${item.id}`}
                            href={item.link}
                            className="block p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-foreground text-sm truncate">{item.title}</p>
                                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{item.details}</p>
                                </div>
                                {item.isShared && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full ml-2 flex-shrink-0">
                                        {t("global.shared")}
                                    </span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            ) : null}
        </div>
    );
};