/**
 * AIGRC Dashboard Application
 *
 * Sample application demonstrating the dashboard components.
 * This can be used for development and demo purposes.
 */

import * as React from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardPage } from '@/pages/DashboardPage';
import { AssetsListPage } from '@/pages/AssetsListPage';
import { AssetDetailPage } from '@/pages/AssetDetailPage';
import { RuntimeMonitorPage } from '@/pages/RuntimeMonitorPage';

export function App() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="mr-4 flex">
              <a className="mr-6 flex items-center space-x-2" href="/">
                <span className="font-bold text-xl">AIGRC</span>
                <span className="text-muted-foreground text-sm">Dashboard</span>
              </a>
            </div>
            <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
              <nav className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  Development Mode
                </span>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content with Tab Navigation */}
        <main className="container py-6">
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 max-w-xl">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="detail">Asset Detail</TabsTrigger>
              <TabsTrigger value="runtime">Runtime</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="border-none p-0">
              <DashboardPage />
            </TabsContent>

            <TabsContent value="assets" className="border-none p-0">
              <AssetsListPage />
            </TabsContent>

            <TabsContent value="detail" className="border-none p-0">
              <AssetDetailPage />
            </TabsContent>

            <TabsContent value="runtime" className="border-none p-0">
              <RuntimeMonitorPage />
            </TabsContent>
          </Tabs>
        </main>

        {/* Footer */}
        <footer className="border-t py-6 md:py-0">
          <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row">
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              AIGRC Dashboard - AI Governance, Risk, and Compliance Platform
            </p>
            <p className="text-center text-sm text-muted-foreground md:text-right">
              Mock Data Mode - No Backend Connected
            </p>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}

export default App;
