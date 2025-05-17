
"use client";

import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { patientInfoSchema, type PatientInfoFormData } from '@/lib/schemas';
import { getAISuggestions, handleVoiceAppointmentBooking } from './actions';
import type { SuggestServicesInput, SuggestServicesOutput } from '@/ai/flows/suggest-services';
import type { BookAppointmentOutput } from '@/ai/flows/book-appointment-flow';
import type { Appointment } from '@/lib/types';
import { doctorsData } from '@/lib/data';
import { Loader2, LogOut, UserCircle, Phone, ClipboardEdit, Sparkles, CheckCircle2, AlertTriangle, Users, ListChecks, ClockIcon, CalendarX2, ThumbsUp, XCircle, Mic, MicOff, Volume2, MessagesSquare, Languages, MessageCircleQuestion } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

const APPOINTMENTS_STORAGE_KEY = 'healthdesk.appointments';

const voiceLanguages = [
  { value: 'en-US', label: 'English (US)', shortLabel: 'English' },
  { value: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)', shortLabel: 'Kannada' },
  { value: 'hi-IN', label: 'हिन्दी (Hindi)', shortLabel: 'Hindi' },
];

interface VoiceButtonLabels {
  default: string;
  listening: string;
}

const voiceButtonLabelsMap: Record<string, VoiceButtonLabels> = {
  'en-US': { default: 'Book by Voice', listening: 'Listening...' },
  'kn-IN': { default: 'ಧ್ವನಿ ಮೂಲಕ ಬುಕ್ ಮಾಡಿ', listening: 'ಕೇಳಲಾಗುತ್ತಿದೆ...' },
  'hi-IN': { default: 'आवाज से बुक करें', listening: 'सुन रहा है...' },
};


export default function DashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [submittedData, setSubmittedData] = useState<PatientInfoFormData | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<SuggestServicesOutput | null>(null);
  const [voiceBookingResponse, setVoiceBookingResponse] = useState<BookAppointmentOutput | null>(null);
  const [isSubmittingInfo, setIsSubmittingInfo] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [isProcessingVoiceBooking, setIsProcessingVoiceBooking] = useState(false);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);

  const [selectedVoiceLanguage, setSelectedVoiceLanguage] = useState<string>(voiceLanguages[0].value);
  const [voiceButtonLabel, setVoiceButtonLabel] = useState<string>(voiceButtonLabelsMap[voiceLanguages[0].value].default);
  const [listeningStateLabel, setListeningStateLabel] = useState<string>(voiceButtonLabelsMap[voiceLanguages[0].value].listening);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastVoiceTranscript, setLastVoiceTranscript] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const [speechSynthesisSupported, setSpeechSynthesisSupported] = useState(false);


  const form = useForm<PatientInfoFormData>({
    resolver: zodResolver(patientInfoSchema),
    defaultValues: {
      name: "",
      contactDetails: "",
      appointmentDetails: "", 
    },
  });

  useEffect(() => {
    const currentLabels = voiceButtonLabelsMap[selectedVoiceLanguage] || voiceButtonLabelsMap['en-US'];
    setVoiceButtonLabel(currentLabels.default);
    setListeningStateLabel(currentLabels.listening);
  }, [selectedVoiceLanguage]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        setSpeechRecognitionSupported(true);
        const instance = new SpeechRecognitionAPI();
        instance.continuous = false;
        instance.interimResults = false;
        recognitionRef.current = instance;
      } else {
        setSpeechRecognitionSupported(false);
        console.warn("Speech Recognition API not supported in this browser.");
      }

      if ('speechSynthesis' in window) {
        setSpeechSynthesisSupported(true);
        speechSynthesisRef.current = window.speechSynthesis;
        if (speechSynthesisRef.current) speechSynthesisRef.current.cancel(); 
      } else {
        setSpeechSynthesisSupported(false);
        console.warn("Speech Synthesis API not supported in this browser.");
      }
    }
  }, []);

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
     if (user?.email && !form.getValues('contactDetails')) { 
      form.setValue('contactDetails', user.email);
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
    setSubmittedData(data); 
    setAiSuggestions(null); 
    setVoiceBookingResponse(null); 
    toast({
      title: "Information Updated",
      description: "Your details have been updated. You can now get AI assistance for suggestions.",
    });
    setIsSubmittingInfo(false);
  };
  
  const speakText = useCallback((text: string, lang: string) => {
    if (!speechSynthesisRef.current || !speechSynthesisSupported || !text) return;
    speechSynthesisRef.current.cancel(); 
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang; 
    const selectedLangLabel = voiceLanguages.find(l => l.value === lang)?.label || lang;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      console.error("Speech synthesis error details:", { error: event.error, fullEvent: event });
      setIsSpeaking(false);
      let errorDescription = "Could not speak the response.";
      if (event.error === 'language-unavailable' || event.error === 'voice-unavailable') {
        errorDescription = `The selected voice (${selectedLangLabel}) is not available on your browser/system. Response cannot be spoken in this language.`;
      } else if (event.error === 'not-allowed') {
        errorDescription = "Speech synthesis was not allowed. Please check browser permissions.";
      }
      toast({ title: "Speech Error", description: errorDescription, variant: "destructive" });
    };
    speechSynthesisRef.current.speak(utterance);
  }, [speechSynthesisSupported, toast]);


  const handleGetGeneralAssistance = async () => {
    const currentData = submittedData || form.getValues();

    if (!currentData.name || !currentData.contactDetails || !currentData.appointmentDetails) {
      toast({ title: "Missing Information for Suggestions", description: "Please ensure name, contact, and appointment details are provided in the form for general suggestions.", variant: "destructive" });
      if (!submittedData) { 
        if (!currentData.name) form.setError("name", { type: "manual", message: "Name is required." });
        if (!currentData.contactDetails) form.setError("contactDetails", { type: "manual", message: "Contact details are required." });
        if (!currentData.appointmentDetails) form.setError("appointmentDetails", { type: "manual", message: "Appointment details are required for suggestions." });
      }
      return;
    }
    
    if (form.formState.isValid || submittedData) { // Check if form is valid OR if submittedData exists (meaning it was previously validated)
        setSubmittedData(form.getValues()); // Update submittedData with current form values if triggering via this button
    }


    setIsFetchingSuggestions(true);
    setAiSuggestions(null);
    setVoiceBookingResponse(null); 
    try {
      const aiInput: SuggestServicesInput = {
        ...(submittedData || currentData), // Prioritize already submitted data if available
        language: selectedVoiceLanguage, 
      };
      const suggestions = await getAISuggestions(aiInput);
      setAiSuggestions(suggestions);
      toast({
        title: "Suggestions Ready",
        description: "AI has provided some recommendations.",
      });
       if (suggestions.suggestedServices && speechSynthesisSupported && !isFetchingSuggestions) {
         if (speechSynthesisRef.current && !speechSynthesisRef.current.speaking) {
            speakText(suggestions.suggestedServices, selectedVoiceLanguage);
         }
       }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not fetch AI suggestions.";
      setAiSuggestions({ suggestedServices: `Error: ${errorMessage}` });
      toast({
        title: "Error Fetching Suggestions",
        description: errorMessage,
        variant: "destructive",
      });
    }
    setIsFetchingSuggestions(false);
  };
  
  const saveAppointmentToLocalStorage = (doctorId: string) => {
    const doctor = doctorsData.find(d => d.id === doctorId);
    if (!doctor) return;

    const newAppointment: Appointment = {
      id: Date.now().toString(),
      doctorId: doctor.id,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty,
      status: "Pending Confirmation",
      requestedAt: new Date().toISOString(),
    };

    try {
      const existingAppointmentsRaw = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      const existingAppointments: Appointment[] = existingAppointmentsRaw ? JSON.parse(existingAppointmentsRaw) : [];
      existingAppointments.push(newAppointment);
      localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(existingAppointments));
      
      window.dispatchEvent(new Event('storage')); 
      loadAppointments(); 

      toast({
        title: "Appointment Request Sent!",
        description: `Your request to book an appointment with ${doctor.name} has been sent and is pending confirmation.`,
        duration: 7000,
      });
    } catch (error) {
      console.error("Failed to save appointment to localStorage", error);
      toast({
        title: "Booking Error",
        description: "Could not save your appointment request locally. Please try again.",
        variant: "destructive",
      });
    }
  };


  const startListeningForBooking = () => {
    if (!recognitionRef.current || !speechRecognitionSupported) {
      toast({ title: "Voice Input Not Supported", description: "Your browser does not support speech recognition.", variant: "destructive" });
      return;
    }
    if (isSpeaking && speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel(); 
      setIsSpeaking(false);
    }

    setIsListening(true);
    setLastVoiceTranscript(null);
    setVoiceError(null);
    setAiSuggestions(null); 
    setVoiceBookingResponse(null);

    recognitionRef.current.lang = selectedVoiceLanguage;
    const selectedLangLabel = voiceLanguages.find(l => l.value === selectedVoiceLanguage)?.label || selectedVoiceLanguage;

    recognitionRef.current.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setLastVoiceTranscript(transcript);
      form.setValue('appointmentDetails', ""); 
      
      setIsProcessingVoiceBooking(true);
      try {
        const bookingResult = await handleVoiceAppointmentBooking(transcript, selectedVoiceLanguage);
        setVoiceBookingResponse(bookingResult);
        
        if (bookingResult.bookedDoctorId && !bookingResult.isError) {
          saveAppointmentToLocalStorage(bookingResult.bookedDoctorId);
        } else {
           toast({
            title: bookingResult.isError ? "Booking Issue" : "Voice Booking",
            description: bookingResult.bookingConfirmationMessage,
            variant: bookingResult.isError ? "destructive" : "default",
          });
        }
        if (bookingResult.bookingConfirmationMessage && speechSynthesisSupported) {
          speakText(bookingResult.bookingConfirmationMessage, selectedVoiceLanguage);
        }

      } catch (error) {
         const errorMsg = error instanceof Error ? error.message : "Could not process voice booking.";
         setVoiceBookingResponse({ bookingConfirmationMessage: errorMsg, isError: true });
         toast({ title: "Voice Booking Error", description: errorMsg, variant: "destructive" });
      }
      setIsProcessingVoiceBooking(false);
    };

    recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorType = event.error;
      const errorMessage = (event as any).message || "No specific message from event.";
      // Log detailed error information for debugging
      console.error("Speech recognition error details:", {
        error: errorType,
        message: errorMessage,
        selectedLang: selectedVoiceLanguage,
        // fullEvent: event, // Removed to simplify Next.js overlay summary
      });
      // For full event details, you can inspect 'event' in browser dev tools if needed.

      let title = "Voice Input Error";
      let description = `An unexpected error occurred during voice recognition for ${selectedLangLabel}.`;

      switch (errorType) {
        case 'no-speech':
          description = `No speech was detected for ${selectedLangLabel}. Please ensure your microphone is active, speak clearly after the '${listeningStateLabel}' prompt, and try again.`;
          break;
        case 'audio-capture':
          description = `Could not capture audio for ${selectedLangLabel}. Please check your microphone connection and browser permissions.`;
          break;
        case 'not-allowed':
          description = `Microphone access was denied for ${selectedLangLabel}. Please enable microphone permissions in your browser settings.`;
          break;
        case 'language-not-supported':
          description = `${selectedLangLabel} voice recognition is not currently supported by your browser. You might try a different browser or language.`;
          break;
        case 'network':
          description = `A network error occurred during voice recognition for ${selectedLangLabel}. Please check your internet connection.`;
          break;
        case 'aborted':
          description = `Voice input for ${selectedLangLabel} was stopped. If this was unintentional, please try again.`;
          break;
        case 'service-not-allowed':
           description = `The speech recognition service is not allowed for ${selectedLangLabel}, possibly due to browser or system policy.`;
           break;
        default:
          description = `An unknown error (${errorType}: ${errorMessage}) occurred during voice recognition for ${selectedLangLabel}. Please try again.`;
      }
      
      setVoiceError(description); 
      toast({ title, description, variant: "destructive" });
      
      setIsListening(false);
      setIsProcessingVoiceBooking(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListeningForBooking();
    }
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
      loadAppointments(); 

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
  
  const currentSelectedLanguageLabel = voiceLanguages.find(l => l.value === selectedVoiceLanguage)?.shortLabel || 'Voice';


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
                <ClipboardEdit className="h-6 w-6" /> Patient Information & General Assistance
              </CardTitle>
              <CardDescription>Enter patient details and reason for visit to get general AI suggestions. For voice appointment booking, use the "{voiceButtonLabel}" button below.</CardDescription>
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
                        <FormLabel className="flex items-center gap-1"><MessageCircleQuestion className="h-4 w-4 text-muted-foreground" />Reason for Visit / Symptoms (for AI Suggestions)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe symptoms or reason for visit for general AI suggestions..." {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <Button type="submit" className="w-full sm:w-auto" disabled={isSubmittingInfo}>
                      {isSubmittingInfo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save/Update Info
                   </Button>
                </form>
              </Form>
            </CardContent>
             <CardFooter className="flex flex-col sm:flex-row gap-4 items-start pt-4 border-t">
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Select value={selectedVoiceLanguage} onValueChange={setSelectedVoiceLanguage}>
                        <SelectTrigger className="w-full sm:w-[180px]" aria-label="Select voice language">
                            <Languages className="mr-2 h-4 w-4"/>
                            <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                            {voiceLanguages.map(lang => (
                                <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={toggleListening} 
                        className="w-full sm:w-auto" 
                        disabled={!speechRecognitionSupported || isSubmittingInfo || isFetchingSuggestions || isProcessingVoiceBooking || isListening}
                        title={!speechRecognitionSupported ? "Speech recognition not supported" : (isListening ? `Stop listening (${currentSelectedLanguageLabel})` : `Start voice input for booking (${currentSelectedLanguageLabel})`)}
                    >
                        {isListening ? <MicOff className="mr-2 h-4 w-4 text-red-500" /> : <Mic className="mr-2 h-4 w-4" />}
                        {isListening ? listeningStateLabel : voiceButtonLabel}
                        {(isProcessingVoiceBooking && !isListening) && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    </Button>
                </div>
             </CardFooter>
             <CardContent className="pt-2">
                <p className="text-xs text-muted-foreground mt-1">
                    Use "{voiceButtonLabel}" in {currentSelectedLanguageLabel} to request an appointment (e.g., "Book appointment with Dr. Reed"). AI will respond in {currentSelectedLanguageLabel}.
                </p>
                {!speechRecognitionSupported && <p className="text-xs text-destructive mt-2">Voice input is not supported by your browser.</p>}
             </CardContent>
          </Card>

          {lastVoiceTranscript && (
            <Card className="shadow-sm border-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-blue-600">
                  <MessagesSquare className="h-5 w-5" /> Last Voice Input ({currentSelectedLanguageLabel}) for Booking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground italic">"{lastVoiceTranscript}"</p>
                 {voiceError && <p className="text-sm text-destructive mt-2">{voiceError}</p>}
              </CardContent>
            </Card>
          )}
          
          {/* Section for general AI suggestions based on form input */}
          {(submittedData && submittedData.appointmentDetails) && !aiSuggestions && !isFetchingSuggestions && !voiceBookingResponse && (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl md:text-2xl text-primary">
                        <CheckCircle2 className="h-6 w-6 text-green-500" /> Ready for General Assistance
                    </CardTitle>
                    <CardDescription>
                        Patient information and reason for visit are saved. Click below to get AI-powered suggestions based on the typed details.
                    </CardDescription>
                </CardHeader>
                 <CardContent className="space-y-1 text-sm border-b pb-4 mb-4">
                    <p><strong>Name:</strong> {submittedData.name}</p>
                    <p><strong>Contact:</strong> {submittedData.contactDetails}</p>
                    <p><strong>Details for Suggestions:</strong> {submittedData.appointmentDetails}</p>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleGetGeneralAssistance} className="w-full sm:w-auto" disabled={isFetchingSuggestions || !submittedData.appointmentDetails}>
                    {isFetchingSuggestions ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Get Suggestions for Symptoms
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
                  <p className="text-muted-foreground">Fetching suggestions based on your input...</p>
              </CardContent>
             </Card>
          )}

          {aiSuggestions && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl md:text-2xl text-primary">
                  <Sparkles className="h-6 w-6" /> AI Suggested Services (from form)
                   {isSpeaking && <Volume2 className="h-5 w-5 ml-2 text-blue-500 animate-pulse" />}
                </CardTitle>
                <CardDescription>
                    Based on the information you typed, here are some relevant services. AI should respond in {currentSelectedLanguageLabel}.
                    {speechSynthesisSupported && !isSpeaking && aiSuggestions.suggestedServices && 
                    <Button variant="link" size="sm" className="p-0 h-auto ml-1" onClick={() => speakText(aiSuggestions.suggestedServices!, selectedVoiceLanguage)}>
                        Speak again ({currentSelectedLanguageLabel})
                    </Button>}
                </CardDescription>
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
                      <p>No specific suggestions available at this time, or an error occurred.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Section for Voice Booking Response */}
           {isProcessingVoiceBooking && !voiceBookingResponse && (
             <Card className="shadow-lg">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl md:text-2xl text-primary">
                      <Mic className="h-6 w-6 animate-pulse" /> Voice Appointment Booking
                  </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
                  <p className="text-muted-foreground">Processing your voice request for booking...</p>
              </CardContent>
             </Card>
          )}

          {voiceBookingResponse && (
            <Card className={`shadow-lg ${voiceBookingResponse.isError ? 'border-destructive' : 'border-green-500'}`}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 text-xl md:text-2xl ${voiceBookingResponse.isError ? 'text-destructive' : 'text-green-600'}`}>
                  {voiceBookingResponse.isError ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                   Voice Booking Attempt
                   {isSpeaking && <Volume2 className="h-5 w-5 ml-2 text-blue-500 animate-pulse" />}
                </CardTitle>
                 <CardDescription>
                    AI response to your voice booking request (in {currentSelectedLanguageLabel}).
                    {speechSynthesisSupported && !isSpeaking && voiceBookingResponse.bookingConfirmationMessage && 
                    <Button variant="link" size="sm" className="p-0 h-auto ml-1" onClick={() => speakText(voiceBookingResponse.bookingConfirmationMessage!, selectedVoiceLanguage)}>
                        Speak again ({currentSelectedLanguageLabel})
                    </Button>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                   <p>{voiceBookingResponse.bookingConfirmationMessage}</p>
                </div>
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
                    Find a Doctor or Book by Voice
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

