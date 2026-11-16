export function projectRoomId(name: string, suffix: string) {
  const slug = name
    .normalize()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100)
    .replace(/-$/, "");

  return `${slug || "project"}-${suffix}`;
}

export function isProjectRoomId(value: unknown): value is string {
  return typeof value === "string" &&
    value.length <= 113 &&
    /^[\p{L}\p{N}\p{M}]+(?:-[\p{L}\p{N}\p{M}]+)*-[a-f0-9]{12}$/u.test(value);
}
