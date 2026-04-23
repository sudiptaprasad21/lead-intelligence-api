import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const trialSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().min(2, "Company name is required"),
  plan: z.string(),
});

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof trialSchema>>({
    resolver: zodResolver(trialSchema),
    defaultValues: { fullName: "", email: "", company: "", plan: "" },
  });

  const handleOpenModal = (planName: string) => {
    setSelectedPlan(planName);
    form.setValue("plan", planName);
  };

  const onSubmit = (data: z.infer<typeof trialSchema>) => {
    toast({
      title: "Trial Activated!",
      description: `Your 14-day free trial for the ${data.plan} plan has started. Check your email.`,
    });
    setSelectedPlan(null);
    form.reset();
  };

  return (
    <div className="w-full pb-32">
      {/* Header Banner */}
      <section className="bg-primary/5 py-24 px-4 border-b">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground shadow mb-6">
              14 DAY FREE TRIAL - No obligation, cancel at any time
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Take your marketing to the next level!
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Simple, transparent pricing that scales with your business. All plans include our core AI engine.
            </p>

            <div className="flex items-center justify-center gap-4 text-lg">
              <Label htmlFor="billing-toggle" className={`cursor-pointer ${!isAnnual ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>Monthly</Label>
              <Switch 
                id="billing-toggle" 
                checked={isAnnual} 
                onCheckedChange={setIsAnnual} 
                className="scale-125 data-[state=checked]:bg-primary"
              />
              <Label htmlFor="billing-toggle" className={`cursor-pointer flex items-center gap-2 ${isAnnual ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                Annually <span className="text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">Save 20%</span>
              </Label>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pt-20 px-4 container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          
          {/* Trial Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <Card className="h-full flex flex-col relative overflow-hidden bg-background">
              <CardHeader className="pb-8">
                <CardTitle className="text-2xl mb-2">Trial (Free)</CardTitle>
                <div className="flex items-baseline text-5xl font-extrabold">
                  $0
                </div>
                <CardDescription className="text-base mt-2">/ 14 days</CardDescription>
                <p className="text-sm text-muted-foreground mt-4 font-medium">No credit card required.</p>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-4 text-sm">
                  {[
                    "All Starter features",
                    "1 user",
                    "Up to 500 contacts",
                    "14-day access",
                    "Basic analytics"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" /> {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-8">
                <Button className="w-full py-6 text-lg" variant="outline" onClick={() => handleOpenModal("Trial")}>
                  Start Free Trial
                </Button>
                <p className="text-xs text-muted-foreground text-center font-medium uppercase tracking-wide">Experience it for 14 Days FREE</p>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Starter Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <Card className="h-full flex flex-col relative overflow-hidden bg-background">
              <CardHeader className="pb-8">
                <CardTitle className="text-2xl mb-2">Starter</CardTitle>
                <div className="flex items-baseline text-5xl font-extrabold">
                  ${isAnnual ? "71" : "89"}
                </div>
                <CardDescription className="text-base mt-2">/ month {isAnnual && "(billed annually)"}</CardDescription>
                <p className="text-sm text-muted-foreground mt-4 font-medium">Perfect for growing marketing teams.</p>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-4 text-sm">
                  {[
                    "3 Sub-Accounts",
                    "Unlimited Contacts",
                    "Unlimited Users",
                    "24/7 Support",
                    "All Core Features",
                    "Content AI",
                    "Campaign Manager",
                    "SEO Tools"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" /> {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-8">
                <Button className="w-full py-6 text-lg" variant="outline" onClick={() => handleOpenModal("Starter")}>
                  Start Your Trial
                </Button>
                <p className="text-xs text-muted-foreground text-center font-medium uppercase tracking-wide">Experience it for 14 Days FREE</p>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Unlimited Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="relative z-10 md:-mt-4 md:-mb-4">
            <Card className="h-full flex flex-col relative overflow-hidden bg-slate-900 text-slate-50 border-primary shadow-2xl shadow-primary/20">
              <div className="absolute top-0 inset-x-0 bg-primary text-primary-foreground text-center text-sm font-bold py-1.5 uppercase tracking-wider">
                Most Popular
              </div>
              <CardHeader className="pb-8 pt-10">
                <CardTitle className="text-2xl mb-2">Unlimited</CardTitle>
                <div className="flex items-baseline text-5xl font-extrabold text-white">
                  ${isAnnual ? "199" : "249"}
                </div>
                <CardDescription className="text-base mt-2 text-slate-400">/ month {isAnnual && "(billed annually)"}</CardDescription>
                <p className="text-sm text-slate-300 mt-4 font-medium">Built for agencies and enterprises.</p>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-4 text-sm text-slate-200">
                  {[
                    "Everything in Starter",
                    "Unlimited Sub-Accounts",
                    "User/Agent Reporting",
                    "Phone and Email (no markup)",
                    "Advanced API Access",
                    "Priority Support",
                    "White-label options",
                    "Custom Integrations"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-cyan-400 flex-shrink-0" /> {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-8">
                <Button className="w-full py-6 text-lg bg-white text-slate-900 hover:bg-slate-200 border-none" onClick={() => handleOpenModal("Unlimited")}>
                  Start Your Trial
                </Button>
                <p className="text-xs text-slate-400 text-center font-medium uppercase tracking-wide">Experience it for 14 Days FREE</p>
              </CardFooter>
            </Card>
          </motion.div>

        </div>
      </section>

      {/* Trial Modal */}
      <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Activate Your Trial</DialogTitle>
            <DialogDescription>
              Enter your details to start your 14-day free trial of the <strong className="text-foreground">{selectedPlan}</strong> plan.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="plan" render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Business Email</FormLabel><FormControl><Input type="email" placeholder="jane@company.com" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="company" render={({ field }) => (
                <FormItem><FormLabel>Company</FormLabel><FormControl><Input placeholder="Acme Corp" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full mt-6">Activate My Trial</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}