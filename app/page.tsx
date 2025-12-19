import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LandingFeature } from "@/features/landing/landing-feature"

export default async function HomePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }
  return <LandingFeature />
}
