export interface SidebarProject {
  id: string;
  name: string;
}

export type ProjectDialog =
  | { type: "create" }
  | { type: "rename" | "delete"; project: SidebarProject };
