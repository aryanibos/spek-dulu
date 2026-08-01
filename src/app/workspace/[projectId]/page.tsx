import { WorkspaceApp } from "@/components/workspace/WorkspaceApp";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <WorkspaceApp projectId={projectId} />;
}
