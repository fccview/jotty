import { redirect } from "next/navigation";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { readFile } from "@/app/_server/actions/file";
import { convertMarkdownToHtml } from "@/app/_utils/markdown-utils";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getHowtoGuideById, getHowtoFilePath, isValidHowtoGuide } from "@/app/_utils/howto-utils";

interface HowtoPageProps {
  params: {
    path: string;
  };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: HowtoPageProps): Promise<Metadata> {
  const { path } = params;
  const t = await getTranslations();
  const guide = getHowtoGuideById(path, t);

  if (!guide) {
    return {
      title: "How To - jotty·page",
    };
  }

  return {
    title: `${guide.name} - How To - jotty·page`,
    description: `Learn about ${guide.name.toLowerCase()} in jotty·page`,
  };
}

export default async function HowtoPage({ params }: HowtoPageProps) {
  const { path } = params;
  const t = await getTranslations();

  if (!isValidHowtoGuide(path, t)) {
    redirect("/howto/shortcuts");
  }

  const guide = getHowtoGuideById(path, t);
  if (!guide) {
    redirect("/howto/shortcuts");
  }

  const filePath = getHowtoFilePath(guide.filename);
  const markdownContent = await readFile(filePath);

  if (!markdownContent) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">{guide.name}</h1>
        </div>
        <div className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl dark:prose-invert max-w-none">
          <p>{t("errors.notFound")}</p>
        </div>
      </div>
    );
  }

  const htmlContent = convertMarkdownToHtml(markdownContent);

  return (
    <div>
      <div className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl dark:prose-invert max-w-none">
        <UnifiedMarkdownRenderer content={htmlContent} />
      </div>
    </div>
  );
}
