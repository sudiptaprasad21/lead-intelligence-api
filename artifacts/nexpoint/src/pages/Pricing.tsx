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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLeadCapture } from "@/hooks/use-lead-capture";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];
const INDUSTRIES = ["Technology", "Marketing Agency", "E-commerce", "Finance", "Healthcare", "Retail", "Other"];
const REFERRAL_SOURCES = ["LinkedIn", "Google", "Referral", "Events", "Social Media", "Other"];

const trialSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().min(2, "Company name is required"),
  jobTitle: z.string().min(2, "Job title is required"),
  companySize: z.string().min(1, "Please select company size"),
  industry: z.string().min(1, "Please select your industry"),
  referralSource: z.string().min(1, "Please select an option"),
  plan: z.string(),
});

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { toast } = useToast();
  const { captureLead, isLoading } = useLeadCapture();

  const form = useForm<z.infer<typeof trialSchema>>({
    resolver: zodResolver(trialSchema),
    defaultValues: { fullName: "", email: "", company: "", jobTitle: "", companySize: "", industry: "", referralSource: "", plan: "" },
  });

  const handleOpenModal = (planName: string) => {
    setSelectedPlan(planName);
    form.setValue("plan", planName);
  };

  const onSubmit = async (data: z.infer<typeof trialSchema>) => {
    try {
      await captureLead(
        {
          email: data.email,
          full_name: data.fullName,
          company_name: data.company,
          job_title: data.jobTitle,
          company_size: data.companySize,
          industry: data.industry,
          referral_source: data.referralSource,
          form_type: "free_trial",
          campaign: `pricing_${data.plan.toLowerCase()}_trial`,
          source: "direct",
        },
        "trial_form_submitted",
        { plan: data.plan, billing: isAnnual ? "annual" : "monthly" }
      );
      toast({
        title: "Trial Activated!",
        description: `Your 14-day free trial for the ${data.plan} plan has started. Check your email.`,
      });
      setSelectedPlan(null);
      form.reset();
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    }
  };

  const starterFeatures = ["3 Sub-Accounts", "Unlimited Contacts", "Unlimited Users", "24/7 Support", "All Core Features", "Content AI", "Campaign Manager", "SEO Tools"];
  const unlimitedFeatures = ["Everything in Starter", "Unlimited Sub-Accounts", "User/Agent Reporting", "Phone and Email (no markup)", "Advanced API Access", "Priority Support", "White-label options", "Custom Integrations"];
  const trialFeatures = ["All Starter features", "1 user", "Up to 500 contacts", "14-day access", "Basic analytics"];

  return (
    <div className="w-full pb-32">
      {/* Header */}
      <section className="bg-primary/5 py-24 px-4 border-b">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold border-transparent bg-primary text-primary-foreground shadow mb-6">
              14 DAY FREE TRIAL - No obligation, cancel at any time
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">Take your marketing to the next level!</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">Simple, transparent pricing that scales with your business. All plans include our core AI engine.</p>
            <div className="flex items-center justify-center gap-4 text-lg">
              <Label htmlFor="billing-toggle" className={`cursor-pointer ${!isAnnual ? "font-bold text-foreground" : "text-muted-foreground"}`}>Monthly</Label>
              <Switch id="billing-toggle" checked={isAnnual} onCheckedChange={setIsAnnual} className="scale-125 data-[state=checked]:bg-primary" data-testid="switch-billing-toggle" />
              <Label htmlFor="billing-toggle" className={`cursor-pointer flex items-center gap-2 ${isAnnual ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                Annually <span className="text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">Save 20%</span>
              </Label>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pt-20 px-4 container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-3 gap-8 items-stretch">

          {/* Trial */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <Card className="h-full flex flex-col relative overflow-hidden bg-background">
              <CardHeader className="pb-8">
                <CardTitle className="text-2xl mb-2">Trial (Free)</CardTitle>
                <div className="flex items-baseline text-5xl font-extrabold">$0</div>
                <CardDescription className="text-base mt-2">/ 14 days</CardDescription>
                <p className="text-sm text-muted-foreground mt-4 font-medium">No credit card required.</p>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-4 text-sm">
                  {trialFeatures.map((f, i) => <li key={i} className="flex items-center gap-3"><Check className="h-5 w-5 text-primary flex-shrink-0" />{f}</li>)}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-8">
                <Button className="w-full py-6 text-lg" variant="outline" onClick={() => handleOpenModal("Trial")} data-testid="button-trial-plan">Start Free Trial</Button>
                <p className="text-xs text-muted-foreground text-center font-medium uppercase tracking-wide">Experience it for 14 Days FREE</p>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Starter */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <Card className="h-full flex flex-col relative overflow-hidden bg-background">
              <CardHeader className="pb-8">
                <CardTitle className="text-2xl mb-2">Starter</CardTitle>
                <div className="flex items-baseline text-5xl font-extrabold">${isAnnual ? "71" : "89"}</div>
                <CardDescription className="text-base mt-2">/ month {isAnnual && "(billed annually)"}</CardDescription>
                <p className="text-sm text-muted-foreground mt-4 font-medium">Perfect for growing marketing teams.</p>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-4 text-sm">
                  {starterFeatures.map((f, i) => <li key={i} className="flex items-center gap-3"><Check className="h-5 w-5 text-primary flex-shrink-0" />{f}</li>)}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-8">
                <Button className="w-full py-6 text-lg" variant="outline" onClick={() => handleOpenModal("Starter")} data-testid="button-starter-plan">Start Your Trial</Button>
                <p className="text-xs text-muted-foreground text-center font-medium uppercase tracking-wide">Experience it for 14 Days FREE</p>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Unlimited */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="relative z-10 md:-mt-4 md:-mb-4">
            <Card className="h-full flex flex-col relative overflow-hidden bg-slate-900 text-slate-50 border-primary shadow-2xl shadow-primary/20">
              <div className="absolute top-0 inset-x-0 bg-primary text-primary-foreground text-center text-sm font-bold py-1.5 uppercase tracking-wider">Most Popular</div>
              <CardHeader className="pb-8 pt-10">
                <CardTitle className="text-2xl mb-2">Unlimited</CardTitle>
                <div className="flex items-baseline text-5xl font-extrabold text-white">${isAnnual ? "199" : "249"}</div>
                <CardDescription className="text-base mt-2 text-slate-400">/ month {isAnnual && "(billed annually)"}</CardDescription>
                <p className="text-sm text-slate-300 mt-4 font-medium">Built for agencies and enterprises.</p>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-4 text-sm text-slate-200">
                  {unlimitedFeatures.map((f, i) => <li key={i} className="flex items-center gap-3"><Check className="h-5 w-5 text-cyan-400 flex-shrink-0" />{f}</li>)}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-8">
                <Button className="w-full py-6 text-lg bg-white text-slate-900 hover:bg-slate-200 border-none" onClick={() => handleOpenModal("Unlimited")} data-testid="button-unlimited-plan">Start Your Trial</Button>
                <p className="text-xs text-slate-400 text-center font-medium uppercase tracking-wide">Experience it for 14 Days FREE</p>
              </CardFooter>
            </Card>
          </motion.div>

        </div>
      </section>

      {/* Trial Modal — full data capture */}
      <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Activate Your Trial</DialogTitle>
            <DialogDescription>
              Enter your details to start your 14-day free trial of the <strong className="text-foreground">{selectedPlan}</strong> plan.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField control={form.control} name="plan" render={({ field }) => (
                <FormItem className="hidden"><FormControl><Input {...field} /></FormControl></FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input data-testid="input-modal-name" placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Business Email</FormLabel><FormControl><Input data-testid="input-modal-email" type="email" placeholder="jane@company.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="company" render={({ field }) => (
                  <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input data-testid="input-modal-company" placeholder="Acme Corp" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="jobTitle" render={({ field }) => (
                  <FormItem><FormLabel>Job Title / Designation</FormLabel><FormControl><Input data-testid="input-modal-jobtitle" placeholder="CMO" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="companySize" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Size</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-modal-size"><SelectValue placeholder="Select size" /></SelectTrigger></FormControl>
                      <SelectContent>{COMPANY_SIZES.map(s => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="industry" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-modal-industry"><SelectValue placeholder="Select industry" /></SelectTrigger></FormControl>
                      <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="referralSource" render={({ field }) => (
                <FormItem>
                  <FormLabel>How did you hear about us?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-modal-source"><SelectValue placeholder="Select an option" /></SelectTrigger></FormControl>
                    <SelectContent>{REFERRAL_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full mt-2" disabled={isLoading} data-testid="button-modal-activate">
                {isLoading ? "Activating..." : "Activate My Trial"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
