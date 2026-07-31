import { redirect } from "next/navigation";

/** The workspace moved to `/`. Kept so older links (and their view) still land. */
export default async function SchemePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  redirect(view ? `/?view=${encodeURIComponent(view)}` : "/");
}
