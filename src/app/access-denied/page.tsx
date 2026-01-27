import Link from "next/link";
import { Button } from "@/components/ui";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg px-4">
      <div className="max-w-md w-full text-center card p-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Access Restricted
        </h1>

        <p className="mt-4 text-sm text-slate-600 dark:text-dark-muted">
          You don&apos;t have permission to access this resource.
        </p>

        <div className="mt-6 flex justify-center">
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
