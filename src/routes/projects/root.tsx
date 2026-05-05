import { Outlet, createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";

export const Route = createFileRoute("/projects")({
  component: ProjectsLayout,
});

function ProjectsLayout() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  );
}
