import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Play } from "lucide-react";
import { useLeadCapture } from "@/hooks/use-lead-capture";

const eventSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().min(2, "Company name is required"),
  jobTitle: z.string().min(2, "Job title is required"),
  companySize: z.string().min(1, "Please select company size"),
  industry: z.string().min(1, "Please select an industry"),
  source: z.string().min(1, "Please select an option"),
  challenge: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

export default function Events() {
  const { toast } = useToast();
  const { captureLead, isLoading } = useLeadCapture();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      fullName: "",
      email: "",
      company: "",
      jobTitle: "",
      companySize: "",
      industry: "",
      source: "",
      challenge: "",
    },
  });

  const onSubmit = async (data: EventFormValues) => {
    try {
      await captureLead(
        {
          email: data.email,
          full_name: data.fullName,
          company_name: data.company,
          job_title: data.jobTitle,
          company_size: data.companySize,
          industry: data.industry,
          referral_source: data.source,
          marketing_challenge: data.challenge ?? null,
          form_type: "event_registration",
          campaign: "growth_summit_2026",
          source: "event",
        },
        "event_registration_submitted",
        {
          event: "Nexpoint Growth Summit 2026",
          company_size: data.companySize,
          industry: data.industry,
          referral_source: data.source,
          marketing_challenge: data.challenge,
        }
      );
      toast({
        title: "Application Submitted",
        description: "Applications reviewed within 24 hours. We will contact you via email.",
      });
      form.reset();
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="w-full">
      <section className="bg-primary/5 py-24 px-4 border-b">
        <div className="container mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Nexpoint Events & Insights
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Learn from industry leaders and join us at exclusive summits to discover the future of AI-powered digital marketing.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24 px-4 container mx-auto max-w-6xl">
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-4">Recorded Podcasts</h2>
          <p className="text-muted-foreground">Catch up on our latest discussions with marketing innovators.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card
              className="overflow-hidden border-0 shadow-lg group cursor-pointer h-full hover-elevate"
              data-testid="card-podcast-1"
            >
              <div className="h-48 bg-gradient-to-br from-blue-600 to-cyan-400 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                  <Play className="h-6 w-6 text-white fill-white ml-1" />
                </div>
                <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                  45 min
                </div>
              </div>
              <CardHeader>
                <div className="text-sm text-primary font-medium mb-2">Recorded: March 15, 2026</div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                  Ep 12: The AI Marketing Revolution
                </CardTitle>
                <CardDescription className="text-base text-foreground/80">
                  Guest: Dr. Rachel Kim, AI Research Lead at Stanford
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  How AI is fundamentally transforming digital marketing measurement and attribution.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card
              className="overflow-hidden border-0 shadow-lg group cursor-pointer h-full hover-elevate"
              data-testid="card-podcast-2"
            >
              <div className="h-48 bg-gradient-to-br from-indigo-900 to-blue-800 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                  <Play className="h-6 w-6 text-white fill-white ml-1" />
                </div>
                <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                  38 min
                </div>
              </div>
              <CardHeader>
                <div className="text-sm text-primary font-medium mb-2">Recorded: February 28, 2026</div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                  Ep 11: From 12 Tools to 1: A CMO Journey
                </CardTitle>
                <CardDescription className="text-base text-foreground/80">
                  Guest: Michael Torres, CMO @ Apex Digital
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  How consolidating the marketing stack with Nexpoint reduced our budget by 35% and tripled team output.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <section className="py-24 px-4 bg-slate-50 dark:bg-slate-900/50 border-y">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold tracking-wide mb-6">
                Upcoming Event
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Nexpoint Growth Summit 2026</h2>

              <div className="space-y-6 text-lg text-muted-foreground mb-8">
                <p>
                  <strong>Date:</strong> June 14-15, 2026<br />
                  <strong>Location:</strong> The Grand Hyatt, New York City, NY
                </p>
                <p>
                  Join 500+ marketing leaders, CMOs, and growth professionals for 2 days of AI marketing deep-dives,
                  live platform demos, hands-on workshops, and unparalleled networking.
                </p>
                <p>
                  Discover how leading enterprises are unifying their marketing stacks with Nexpoint to drive
                  measurable, scalable growth.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="bg-background rounded-lg p-4 border shadow-sm flex-1 min-w-[140px]">
                  <div className="text-3xl font-bold text-primary mb-1">500+</div>
                  <div className="text-sm text-muted-foreground">Attendees</div>
                </div>
                <div className="bg-background rounded-lg p-4 border shadow-sm flex-1 min-w-[140px]">
                  <div className="text-3xl font-bold text-primary mb-1">2</div>
                  <div className="text-sm text-muted-foreground">Days</div>
                </div>
                <div className="bg-background rounded-lg p-4 border shadow-sm flex-1 min-w-[140px]">
                  <div className="text-3xl font-bold text-primary mb-1">24</div>
                  <div className="text-sm text-muted-foreground">Sessions</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="shadow-xl border-primary/20">
                <CardHeader>
                  <CardTitle className="text-2xl">Apply to Attend</CardTitle>
                  <CardDescription>
                    Limited seats available. Priority access for qualified applicants.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name *</FormLabel>
                              <FormControl>
                                <Input data-testid="input-event-name" placeholder="Jane Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Email *</FormLabel>
                              <FormControl>
                                <Input data-testid="input-event-email" placeholder="jane@company.com" type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="company"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name *</FormLabel>
                              <FormControl>
                                <Input data-testid="input-event-company" placeholder="Acme Corp" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="jobTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Job Title *</FormLabel>
                              <FormControl>
                                <Input data-testid="input-event-jobtitle" placeholder="CMO" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="companySize"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Size *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-event-size">
                                    <SelectValue placeholder="Select size" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="1-10">1-10 employees</SelectItem>
                                  <SelectItem value="11-50">11-50 employees</SelectItem>
                                  <SelectItem value="51-200">51-200 employees</SelectItem>
                                  <SelectItem value="201-500">201-500 employees</SelectItem>
                                  <SelectItem value="500+">500+ employees</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="industry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Industry *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-event-industry">
                                    <SelectValue placeholder="Select industry" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Technology">Technology</SelectItem>
                                  <SelectItem value="Marketing Agency">Marketing Agency</SelectItem>
                                  <SelectItem value="E-commerce">E-commerce</SelectItem>
                                  <SelectItem value="Finance">Finance</SelectItem>
                                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                                  <SelectItem value="Retail">Retail</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="source"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>How did you hear about us? *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-event-source">
                                  <SelectValue placeholder="Select an option" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                                <SelectItem value="Google">Google</SelectItem>
                                <SelectItem value="Referral">Referral</SelectItem>
                                <SelectItem value="Events">Events</SelectItem>
                                <SelectItem value="Social Media">Social Media</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="challenge"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Biggest marketing challenge (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                data-testid="textarea-event-challenge"
                                placeholder="What are you looking to solve?"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full mt-6 py-6 text-lg"
                        size="lg"
                        disabled={isLoading}
                        data-testid="button-event-submit"
                      >
                        {isLoading ? "Submitting..." : "Apply for My Seat"}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                      <p className="text-center text-sm text-muted-foreground mt-4">
                        Applications reviewed within 24 hours. We will contact you via email.
                      </p>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
