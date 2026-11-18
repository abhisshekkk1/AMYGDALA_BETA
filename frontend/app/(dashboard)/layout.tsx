"use client";

import React, { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();

  // For seamless local Windows development: auto-login demo student if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      login("student@amygdala.ai", "amygdala123").catch(() => {
        // demo login failed, route to login
        router.push("/login");
      });
    }
  }, [isLoading, user]);

  return (
    <div className="flex min-h-screen bg-[#0b0f17]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
