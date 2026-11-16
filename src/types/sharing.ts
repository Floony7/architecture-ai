export interface ProjectCollaborator {
  email: string;
  name: string | null;
  imageUrl: string | null;
}

export interface ProjectSharing {
  isOwner: boolean;
  collaborators: ProjectCollaborator[];
}
