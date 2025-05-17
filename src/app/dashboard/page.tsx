
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/use-auth';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { patientInfoSchema, type PatientInfoFormData } from '@/lib/schemas';
import { getAISuggestions } from './actions';
import type { SuggestServicesOutput } from '@/ai/flows/suggest-services';
import type { Appointment } from '@/lib/types';
import { Loader2, LogOut, UserCircle, Phone, ClipboardEdit, Sparkles, CheckCircle2, AlertTriangle, Users, ListChecks, ClockIcon, CalendarX2, ThumbsUp, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

const APPOINTMENTS_STORAGE_KEY = 'healthdesk.appointments';

export default function DashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [submittedData, setSubmittedData] = useState<PatientInfoFormData | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<SuggestServicesOutput | null>(null);
  const [isSubmittingInfo, setIsSubmittingInfo] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);

  const form = useForm<PatientInfoFormData>({
    resolver: zodResolver(patientInfoSchema),
    defaultValues: {
      name: "",
      contactDetails: "",
      appointmentDetails: "",
    },
  });

  const loadAppointments = useCallback(() => {
    try {
      const storedAppointments = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      if (storedAppointments) {
        const parsedAppointments: Appointment[] = JSON.parse(storedAppointments);
        parsedAppointments.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
        setMyAppointments(parsedAppointments);
      } else {
        setMyAppointments([]);
      }
    } catch (error) {
      console.error("Failed to load appointments from localStorage", error);
      setMyAppointments([]);
       toast({
        title: "Error Loading Appointments",
        description: "Could not retrieve your appointment data. Please try refreshing.",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);
  
  useEffect(() => {
    if (user?.name) {
      form.setValue('name', user.name);
    }
  }, [user, form]);

  useEffect(() => {
    loadAppointments();
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === APPOINTMENTS_STORAGE_KEY) {
        loadAppointments();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadAppointments]);


  const handleInfoSubmit: SubmitHandler<PatientInfoFormData> = async (data) => {
    setIsSubmittingInfo(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call
    setSubmittedData(data);
    setAiSuggestions(null); 
    toast({
      title: "Information Saved",
      description: "Your details have been recorded.",
    });
    setIsSubmittingInfo(false);
  };

  const handleGetAssistance = async () => {
    if (!submittedData) {
      toast({ title: "No Data", description: "Please submit patient information first.", variant: "destructive" });
      return;
    }
    setIsFetchingSuggestions(true);
    setAiSuggestions(null);
    try {
      const suggestions = await getAISuggestions(submittedData);
      setAiSuggestions(suggestions);
      toast({
        title: "Suggestions Ready",
        description: "AI has provided some recommendations.",
      });
    } catch (error) {
      toast({
        title: "Error Fetching Suggestions",
        description: (error instanceof Error ? error.message : "Could not fetch AI suggestions."),
        variant: "destructive",
      });
    }
    setIsFetchingSuggestions(false);
  };
  
  const getStatusIcon = (status: Appointment['status']) => {
    switch (status) {
      case 'Pending Confirmation':
        return <ClockIcon className="h-4 w-4 text-yellow-500 mr-2 shrink-0" />;
      case 'Confirmed':
        return <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 shrink-0" />;
      case 'Cancelled':
        return <CalendarX2 className="h-4 w-4 text-red-500 mr-2 shrink-0" />;
      default:
        return null;
    }
  };

  const handleUpdateAppointmentStatus = (appointmentId: string, newStatus: Appointment['status']) => {
    try {
      const storedAppointments = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      let appointments: Appointment[] = storedAppointments ? JSON.parse(storedAppointments) : [];
      
      appointments = appointments.map(app => 
        app.id === appointmentId ? { ...app, status: newStatus } : app
      );
      
      localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
      loadAppointments(); // Reload to update UI and state

      toast({
        title: `Appointment ${newStatus}`,
        description: `The appointment has been successfully ${newStatus.toLowerCase()}.`,
      });
    } catch (error) {
      console.error("Failed to update appointment status", error);
      toast({
        title: "Update Error",
        description: "Could not update appointment status. Please try again.",
        variant: "destructive",
      });
    }
  };


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
          <Link href="/doctors" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <Users className="mr-0 h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Doctors</span>
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

      <main className="flex-grow container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl md:text-2xl text-primary">
                <ClipboardEdit className="h-6 w-6" /> Patient Information
              </CardTitle>
              <CardDescription>Please enter the patient's details below. This information can be used to get AI assistance for services.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleInfoSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1"><UserCircle className="h-4 w-4 text-muted-foreground" />Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1"><Phone className="h-4 w-4 text-muted-foreground" />Contact Details (Phone/Email)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., (555) 123-4567 or john.doe@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="appointmentDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1"><ClipboardEdit className="h-4 w-4 text-muted-foreground" />Reason for Visit / Appointment Details</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the reason for the visit or desired appointment details..." {...field} rows={4} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full sm:w-auto" disabled={isSubmittingInfo}>
                    {isSubmittingInfo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Information
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {submittedData && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl md:text-2xl text-primary">
                  <CheckCircle2 className="h-6 w-6 text-green-500" /> Information Confirmation
                </CardTitle>
                <CardDescription>Review the entered information. If correct, you can get AI-powered assistance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><strong>Name:</strong> {submittedData.name}</p>
                <p><strong>Contact Details:</strong> {submittedData.contactDetails}</p>
                <p><strong>Appointment Details:</strong> {submittedData.appointmentDetails}</p>
              </CardContent>
              <CardFooter>
                <Button onClick={handleGetAssistance} className="w-full sm:w-auto" disabled={isFetchingSuggestions}>
                  {isFetchingSuggestions ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Get Intelligent Assistance
                </Button>
              </CardFooter>
            </Card>
          )}

          {isFetchingSuggestions && !aiSuggestions && (
             <Card className="shadow-lg">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl md:text-2xl text-primary">
                      <Sparkles className="h-6 w-6 animate-pulse" /> AI Suggestions
                  </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
                  <p className="text-muted-foreground">Fetching suggestions from our AI assistant...</p>
              </CardContent>
             </Card>
          )}

          {aiSuggestions && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl md:text-2xl text-primary">
                  <Sparkles className="h-6 w-6" /> AI Suggested Services
                </CardTitle>
                <CardDescription>Based on the provided information, here are some relevant services and information:</CardDescription>
              </CardHeader>
              <CardContent>
                {aiSuggestions.suggestedServices ? (
                  <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                    {aiSuggestions.suggestedServices.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center text-muted-foreground">
                      <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500"/>
                      <p>No specific suggestions available at this time.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1 space-y-8">
           <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl md:text-2xl text-primary">
                <ListChecks className="h-6 w-6" /> My Appointments
              </CardTitle>
              <CardDescription>View and manage the status of your requested appointments.</CardDescription>
            </CardHeader>
            <CardContent>
              {myAppointments.length > 0 ? (
                <ul className="space-y-4">
                  {myAppointments.map((appointment) => (
                    <li key={appointment.id} className="p-4 border rounded-lg shadow-sm bg-card hover:bg-muted/50 transition-colors">
                      <h3 className="font-semibold text-md text-foreground">{appointment.doctorName}</h3>
                      <p className="text-sm text-muted-foreground">{appointment.doctorSpecialty}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Requested: {format(new Date(appointment.requestedAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                      <div className="mt-2 flex items-center text-sm">
                        {getStatusIcon(appointment.status)}
                        <span className={`font-medium ${
                          appointment.status === 'Pending Confirmation' ? 'text-yellow-600' :
                          appointment.status === 'Confirmed' ? 'text-green-600' :
                          appointment.status === 'Cancelled' ? 'text-red-600' : 'text-foreground'
                        }`}>
                          {appointment.status}
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border flex flex-col sm:flex-row gap-2">
                        {appointment.status === 'Pending Confirmation' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full sm:w-auto border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                              onClick={() => handleUpdateAppointmentStatus(appointment.id, 'Confirmed')}
                            >
                              <ThumbsUp className="mr-2 h-4 w-4" /> Confirm
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full sm:w-auto border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleUpdateAppointmentStatus(appointment.id, 'Cancelled')}
                            >
                              <XCircle className="mr-2 h-4 w-4" /> Cancel
                            </Button>
                          </>
                        )}
                        {appointment.status === 'Confirmed' && (
                           <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full sm:w-auto border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleUpdateAppointmentStatus(appointment.id, 'Cancelled')}
                          >
                            <XCircle className="mr-2 h-4 w-4" /> Cancel Appointment
                          </Button>
                        )}
                        {appointment.status === 'Cancelled' && (
                          <p className="text-xs text-muted-foreground italic">This appointment has been cancelled.</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center text-muted-foreground py-6">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No appointments requested yet.</p>
                  <Link href="/doctors" className={buttonVariants({ variant: "link", className: "mt-2" })}>
                    Find a Doctor
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t print:hidden">
        © {new Date().getFullYear()} HealthDesk. All rights reserved.
      </footer>
    </div>
  );
}

