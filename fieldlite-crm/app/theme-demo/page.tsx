'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sun,
  Moon,
  Palette,
  Settings,
  User,
  Bell,
  Search,
  Home,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Activity
} from 'lucide-react';

export default function ThemeDemoPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Claymorphism Theme Demo
          </h1>
          <p className="text-muted-foreground">
            Experience the beautiful clay-like aesthetic in both light and dark modes
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Color Palette Display */}
      <Card className="mb-8 clay-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Palette
          </CardTitle>
          <CardDescription>
            Current theme colors with soft, organic feel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="h-20 rounded-xl bg-primary clay-elevated mb-2"></div>
              <p className="text-sm font-medium">Primary</p>
              <p className="text-xs text-muted-foreground">Purple Accent</p>
            </div>
            <div>
              <div className="h-20 rounded-xl bg-secondary clay-elevated mb-2"></div>
              <p className="text-sm font-medium">Secondary</p>
              <p className="text-xs text-muted-foreground">Soft Beige</p>
            </div>
            <div>
              <div className="h-20 rounded-xl bg-accent clay-elevated mb-2"></div>
              <p className="text-sm font-medium">Accent</p>
              <p className="text-xs text-muted-foreground">Rose Tint</p>
            </div>
            <div>
              <div className="h-20 rounded-xl bg-muted clay-elevated mb-2"></div>
              <p className="text-sm font-medium">Muted</p>
              <p className="text-xs text-muted-foreground">Subtle Gray</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Components Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Buttons */}
        <Card className="clay-card">
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Clay-like buttons with soft shadows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button className="clay-button">Primary Button</Button>
              <Button variant="secondary" className="clay-button">Secondary</Button>
              <Button variant="outline" className="clay-button">Outline</Button>
              <Button variant="ghost" className="clay-button">Ghost</Button>
              <Button variant="destructive" className="clay-button">Destructive</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="sm" className="clay-button">Small</Button>
              <Button size="default" className="clay-button">Default</Button>
              <Button size="lg" className="clay-button">Large</Button>
              <Button size="icon" className="clay-button">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Form Elements */}
        <Card className="clay-card">
          <CardHeader>
            <CardTitle>Form Elements</CardTitle>
            <CardDescription>Inset inputs with clay aesthetics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="clay-inset"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search..."
                  className="pl-10 clay-inset"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Example */}
      <Card className="mb-8 clay-card">
        <CardHeader>
          <CardTitle>Tabbed Interface</CardTitle>
          <CardDescription>Navigate between different views</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-card border clay-elevated">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">$45,231</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-card border clay-elevated">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Users</p>
                      <p className="text-2xl font-bold">2,350</p>
                    </div>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-card border clay-elevated">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Growth Rate</p>
                      <p className="text-2xl font-bold">+12.5%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="analytics" className="mt-6">
              <div className="h-64 flex items-center justify-center rounded-xl bg-muted/50">
                <Activity className="h-12 w-12 text-muted-foreground" />
                <p className="ml-4 text-muted-foreground">Analytics view content</p>
              </div>
            </TabsContent>
            <TabsContent value="settings" className="mt-6">
              <div className="h-64 flex items-center justify-center rounded-xl bg-muted/50">
                <Settings className="h-12 w-12 text-muted-foreground" />
                <p className="ml-4 text-muted-foreground">Settings content</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Badges and Tags */}
      <Card className="mb-8 clay-card">
        <CardHeader>
          <CardTitle>Badges & Status Indicators</CardTitle>
          <CardDescription>Soft, rounded badges with clay shadows</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge className="bg-green-500 text-white">Success</Badge>
            <Badge className="bg-yellow-500 text-white">Warning</Badge>
            <Badge className="bg-blue-500 text-white">Info</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Theme Comparison */}
      <Card className="clay-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 rotate-0 scale-100 dark:-rotate-90 dark:scale-0 transition-all" />
            <Moon className="h-5 w-5 rotate-90 scale-0 dark:rotate-0 dark:scale-100 absolute transition-all" />
            <span className="ml-6">Theme Features</span>
          </CardTitle>
          <CardDescription>
            Toggle between light and dark modes to see the transformation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Light Mode</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✨ Warm, clay-like beige backgrounds</li>
                <li>🎨 Soft purple accent colors</li>
                <li>☁️ Gentle shadows for depth</li>
                <li>📱 High contrast for readability</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Dark Mode</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>🌙 Deep, rich dark backgrounds</li>
                <li>💜 Vibrant purple accents</li>
                <li>🌟 Subtle glow effects</li>
                <li>👁️ Easy on the eyes at night</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Note */}
      <div className="mt-12 text-center text-muted-foreground">
        <p className="text-sm">
          Claymorphism Theme • Soft, organic design with modern aesthetics
        </p>
        <p className="text-xs mt-2">
          Toggle the theme using the button in the top right corner
        </p>
      </div>
    </div>
  );
}