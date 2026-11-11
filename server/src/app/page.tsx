import { redirect } from "next/navigation";

/** The server only hosts the API and the admin console; the product itself is the mobile app. */
export default function Home() {
  redirect("/admin");
}
