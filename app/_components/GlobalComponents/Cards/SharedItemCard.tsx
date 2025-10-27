import { SharedItem } from "@/app/_types";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";

export const SharedItemCard = ({ item }: { item: SharedItem }) => {
    const t = useTranslations();

    return (
        <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{item.title}</p>
                    {item.isPubliclyShared && <Globe className="h-4 w-4 text-primary" />}
                </div>
                <div className="text-xs text-muted-foreground">
                    {new Date(item.sharedAt).toLocaleDateString()}
                </div>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{t("public.by", { username: item.owner })}</p>
            {item.isPubliclyShared ? (
                <div className="flex items-center gap-1 text-xs text-primary">
                    <Globe className="h-3 w-3" />
                    <span>{t("cards.publicly_accessible")}</span>
                </div>
            ) : (
                <div className="flex flex-wrap gap-1">
                    {item.sharedWith.map(username => (
                        <span key={username} className="inline-flex px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                            {username}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};
