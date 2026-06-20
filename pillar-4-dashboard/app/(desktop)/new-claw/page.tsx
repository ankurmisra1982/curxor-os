import { redirect } from "next/navigation";

export default function NewClawRedirectPage() {
  redirect("/claw-forge?new=1");
}
