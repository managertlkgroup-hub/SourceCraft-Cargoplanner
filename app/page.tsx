import CargoPlanner from "@/components/cargo-planner";
import { I18nProvider } from "@/lib/i18n";

export default function HomePage() {
  return (
    <I18nProvider>
      <CargoPlanner />
    </I18nProvider>
  );
}
