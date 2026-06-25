export type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  plan: string;
};

export const demoUser: DemoUser = {
  id: "user-demo",
  name: "Alex Morgan",
  email: "alex@acme.io",
  role: "Admin",
  plan: "Pro",
};

export function userInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
