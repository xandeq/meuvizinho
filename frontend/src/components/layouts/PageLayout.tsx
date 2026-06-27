import { ReactNode } from "react";
import MainHeader from "./MainHeader";
import Footer from "./Footer";
import MobileNavBar from "./MobileNavBar";

export interface PageLayoutProps {
  children: ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-bg">
      <MainHeader />
      {/* pb-24 on mobile reserves space above the fixed BottomTabBar */}
      <main className="flex-1 px-4 sm:px-6 py-6 md:py-8 pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto w-full">{children}</div>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
      <MobileNavBar />
    </div>
  );
}
