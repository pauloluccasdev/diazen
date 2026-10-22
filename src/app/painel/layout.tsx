import { PanelNav } from "@/components/panel-nav";
import { requireAccount } from "@/lib/data";
export const dynamic = "force-dynamic";
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAccount();
  return (
    <>
      <PanelNav />
      {children}
    </>
  );
}
