import { redirect } from "next/navigation";

export default function LegacyCancellationQueuePage() {
  redirect("/orders?view=exceptions");
}
