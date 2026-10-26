import { GlobalDialogs } from "@/components/dialogs/global-dialogs";
import { GlobalSearch } from "./global-search";
import { KeyboardShortcuts } from "./keyboard-shortcuts";
import { Sidebar } from "./sidebar";
import { TitleBar } from "./title-bar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-app">
      <TitleBar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
      <GlobalSearch />
      <GlobalDialogs />
      <KeyboardShortcuts />
    </div>
  );
}
