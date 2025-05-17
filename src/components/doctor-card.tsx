
"use client";

import type React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Stethoscope, CalendarClock, User, CheckCircle, Info } from 'lucide-react';
import type { Doctor } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface DoctorCardProps {
  doctor: Doctor;
}

export function DoctorCard({ doctor }: DoctorCardProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleBookingConfirm = () => {
    // Simulate booking
    toast({
      title: "Appointment Request Sent!",
      description: `Your request to book an appointment with ${doctor.name} has been sent. We will contact you shortly to confirm the details.`,
      duration: 5000, // Make toast last a bit longer
    });
    setIsDialogOpen(false);
  };

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
      <CardHeader className="p-0">
        <div className="relative h-56 w-full">
          <Image
            src={doctor.imageUrl}
            alt={`Photo of ${doctor.name}`}
            layout="fill"
            objectFit="cover"
            className="rounded-t-lg"
            data-ai-hint={doctor.aiHint || "doctor portrait"}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-xl mb-1 flex items-center">
          <User className="mr-2 h-5 w-5 text-primary shrink-0" />
          {doctor.name}
        </CardTitle>
        <CardDescription className="mb-3 flex items-center text-sm">
          <Stethoscope className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
          {doctor.specialty}
        </CardDescription>
        {doctor.bio && (
          <p className="text-sm text-muted-foreground mb-3 flex items-start">
            <Info className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span>{doctor.bio}</span>
          </p>
        )}
        {doctor.availability && doctor.availability.length > 0 && (
           <div className="text-sm">
             <h4 className="font-semibold text-foreground mb-1 flex items-center">
                <CalendarClock className="mr-2 h-4 w-4 text-primary shrink-0" />
                Availability:
             </h4>
             <ul className="list-disc list-inside pl-2 space-y-0.5">
                {doctor.availability.map((slot, index) => (
                    <li key={index} className="text-xs text-muted-foreground">{slot}</li>
                ))}
             </ul>
           </div>
        )}
      </CardContent>
      <CardFooter className="p-4 border-t mt-auto">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">Request Appointment</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Request Appointment with {doctor.name}</DialogTitle>
              <DialogDescription>
                You are about to request an appointment with {doctor.name} ({doctor.specialty}).
                A staff member will contact you to finalize the date and time based on availability.
              </DialogDescription>
            </DialogHeader>
             <div className="py-2">
                <p className="text-sm font-medium">Doctor: <span className="font-normal">{doctor.name}</span></p>
                <p className="text-sm font-medium">Specialty: <span className="font-normal">{doctor.specialty}</span></p>
                {doctor.availability && doctor.availability.length > 0 && (
                    <p className="text-sm font-medium mt-1">General Availability: <span className="font-normal">{doctor.availability.join(', ')}</span></p>
                )}
            </div>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleBookingConfirm}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirm Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
