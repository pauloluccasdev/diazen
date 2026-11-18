const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const projectImage = new RegExp(
  `^${uuid}/${uuid}/${uuid}(-thumb)?\\.webp$`,
  "i",
);
const avatarImage = new RegExp(`^${uuid}/avatars/${uuid}\\.webp$`, "i");
export function isPrivateImageKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (projectImage.test(value) || avatarImage.test(value))
  );
}
