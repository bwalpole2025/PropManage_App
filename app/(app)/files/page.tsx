import { redirect } from "next/navigation";

/** "Files & Dates" now splits into Documents / Notes / Reminders / Calendar. */
export default function FilesIndex() {
  redirect("/files/documents");
}
