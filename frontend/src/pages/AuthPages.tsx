import { SignIn, SignUp } from "@clerk/clerk-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Logo } from "../components/ui";

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-8">
      <Link to="/" aria-label="Sonic home">
        <Logo />
      </Link>
      <div className="flex flex-1 items-center py-10">{children}</div>
    </div>
  );
}

export function SignInPage() {
  return (
    <AuthShell>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </AuthShell>
  );
}

export function SignUpPage() {
  return (
    <AuthShell>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </AuthShell>
  );
}
