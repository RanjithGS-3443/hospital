"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
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
import { Loader2, LogOut, UserCircle, Phone, ClipboardEdit, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [submittedData, setSubmittedData] = useState<PatientInfoFormData | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<SuggestServicesOutput | null>(null);
  const [isSubmittingInfo, setIsSubmittingInfo] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

  const form = useForm<PatientInfoFormData>({
    resolver: zodResolver(patientInfoSchema),
    defaultValues: {
      name: "",
      contactDetails: "",
      appointmentDetails: "",
    },
  });

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


  const handleInfoSubmit: SubmitHandler<PatientInfoFormData> = async (data) => {
    setIsSubmittingInfo(true);
    // Simulate brief processing
    await new Promise(resolve => setTimeout(resolve, 300));
    setSubmittedData(data);
    setAiSuggestions(null); // Clear previous suggestions
    toast({
      title: "Information Saved",
      description: "Your details have been recorded for confirmation.",
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

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card p-4 shadow-sm">
        <Logo iconSize={6} textSize="text-xl" />
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:inline">Welcome, {user?.name || user?.email}</span>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8 space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl md:text-2xl text-primary">
              <ClipboardEdit className="h-6 w-6" /> Patient Information
            </CardTitle>
            <CardDescription>Please enter the patient's details below.</CardDescription>
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
              <CardDescription>Please review the entered information. If correct, proceed to get assistance.</CardDescription>
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
                <div className="prose prose-sm max-w-none text-foreground">
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
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} HealthDesk. All rights reserved.
      </footer>
    </div>
  );
}
