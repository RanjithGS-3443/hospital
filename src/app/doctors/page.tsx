
"use client";

import type React from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { DoctorCard } from '@/components/doctor-card';
import { useAuth } from '@/hooks/use-auth';
import { LogOut, LayoutDashboard, Users as UsersIcon, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { doctorsData } from '@/lib/data'; // Import from shared data file

export default function DoctorsPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-card p-4 shadow-sm print:hidden">
        <Logo iconSize={6} textSize="text-xl" />
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <LayoutDashboard className="mr-0 h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div className="text-sm text-muted-foreground hidden md:flex items-center gap-1">
            <span className="hidden lg:inline">Welcome,</span> {user?.name?.split(' ')[0] || user?.email}
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="mr-0 h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="mb-8">
            <h1 className="flex items-center gap-3 text-2xl md:text-3xl font-bold text-primary">
              <UsersIcon className="h-8 w-8" /> Available Doctors
            </h1>
            <p className="text-muted-foreground mt-1">Browse our skilled medical professionals and request an appointment.</p>
        </div>

        {doctorsData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {doctorsData.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>No doctors are currently listed. Please check back later.</p>
            </CardContent>
          </Card>
        )}
      </main>
       <footer className="py-4 text-center text-sm text-muted-foreground border-t print:hidden">
        © {new Date().getFullYear()} HealthDesk. All rights reserved.
      </footer>
    </div>
  );
}
