import { SignUpForm } from "@/components/auth/sign-up-form";

interface PageProps {
  searchParams: Promise<{ invite?: string; clubId?: string; club?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const { invite, club } = await searchParams;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignUpForm inviteCode={invite} clubName={club} />
      </div>
    </div>
  );
}
