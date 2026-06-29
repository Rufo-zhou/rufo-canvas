import { ProjectCanvas } from "@/components/canvas/ProjectCanvas";

export type ProjectCanvasPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    prompt?: string | string[];
  }>;
};

export default async function ProjectCanvasPage({ params, searchParams }: ProjectCanvasPageProps) {
  const { projectId } = await params;
  const { prompt } = searchParams ? await searchParams : {};
  const initialPrompt = Array.isArray(prompt) ? prompt[0] : prompt;

  return <ProjectCanvas projectId={projectId} initialPrompt={initialPrompt} />;
}
