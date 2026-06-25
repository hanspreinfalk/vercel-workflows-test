import Link from "next/link";

const settingsLinks = [
  { href: "/settings/profile", label: "Profile", description: "Name, email, and avatar" },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
      <h1 className="app-headline text-2xl">Settings</h1>
      <p className="app-subhead mt-2">Manage your workspace preferences.</p>

      <div className="mt-8 divide-y divide-border rounded-xl border border-border">
        {settingsLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col gap-0.5 px-5 py-4 transition hover:bg-muted/50"
          >
            <span className="text-sm font-medium">{item.label}</span>
            <span className="text-sm text-muted-foreground">{item.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
