import { listFlows } from "@/lib/flow/store";
import {
  getDefaultOrganizationId,
  listOrganizations,
} from "@/lib/workspace/org-store";

export function getWorkspaceShellProps() {
  return {
    flows: listFlows().map((flow) => ({
      id: flow.id,
      name: flow.name,
      updatedAt: flow.updatedAt,
    })),
    organizations: listOrganizations(),
    defaultOrgId: getDefaultOrganizationId(),
  };
}
