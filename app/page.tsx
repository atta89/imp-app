import { redirect } from "next/navigation";

export default function Home() {
  // Auth-aware routing lands here in step 3; for now go straight to the shell.
  redirect("/dashboard");
}
