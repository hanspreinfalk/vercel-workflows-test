import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { demoUser, userInitials } from "@/lib/demo-user";

export default function ProfilePage() {
  const initials = userInitials(demoUser.name);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
      <h1 className="app-headline text-2xl">Profile</h1>
      <p className="app-subhead mt-2">Manage your account details.</p>

      <div className="app-card mt-8 p-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 rounded-xl">
            <AvatarFallback className="rounded-xl text-lg font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-medium">{demoUser.name}</p>
            <p className="text-sm text-muted-foreground">{demoUser.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {demoUser.role} · {demoUser.plan} plan
            </p>
          </div>
        </div>

        <dl className="mt-8 grid gap-4 border-t border-border pt-6 text-sm">
          <div className="grid gap-1 sm:grid-cols-3">
            <dt className="text-muted-foreground">Full name</dt>
            <dd className="sm:col-span-2 font-medium">{demoUser.name}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-3">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="sm:col-span-2 font-medium">{demoUser.email}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-3">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="sm:col-span-2 font-medium">{demoUser.role}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-3">
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="sm:col-span-2 font-medium">{demoUser.plan}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
