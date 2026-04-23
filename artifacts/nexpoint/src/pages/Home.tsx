import { motion } from "framer-motion";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Mail, Phone, PenTool, BarChart3, Target, Search, Share2, Activity, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const trialSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().min(2, "Company name is required"),
  companySize: z.string().min(1, "Please select company size"),
});

const demoSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().min(2, "Company name is required"),
  jobTitle: z.string().min(2, "Job title is required"),
  date: z.string().min(1, "Please select a date"),
  timeSlot: z.string().min(1, "Please select a time slot"),
});

const features = [
  {
    title: "Content Creation",
    description: "AI-powered content generation for blogs, emails, and social.",
    icon: PenTool,
  },
  {
    title: "Customer Analytics",
    description: "Deep insights into customer behavior and journey mapping.",
    icon: BarChart3,
  },
  {
    title: "Campaign Management",
    description: "Multi-channel automation from a single visual workflow builder.",
    icon: Target,
  },
  {
    title: "SEO Optimization",
    description: "AI-driven ranking recommendations and keyword tracking.",
    icon: Search,
  },
  {
    title: "Social Media Strategy",
    description: "AI scheduling, engagement tracking, and sentiment analysis.",
    icon: Share2,
  },
  {
    title: "Performance Tracking",
    description: "Real-time customizable dashboard connecting all your data sources.",
    icon: Activity,
  },
];

const testimonials = [
  {
    quote: "Nexpoint replaced 6 separate tools overnight. Our team productivity shot up 40%.",
    author: "Sarah Mitchell",
    role: "CMO @ TechVentures Inc.",
  },
  {
    quote: "The AI-driven campaign optimization alone paid for the platform in the first month.",
    author: "David Chen",
    role: "Marketing Director @ ScaleUp Solutions",
  },
  {
    quote: "Finally, a platform that actually learns how our business operates. Game-changer.",
    author: "Priya Sharma",
    role: "VP Marketing @ GlobalEdge Corp",
  },
  {
    quote: "Our SEO rankings improved 3x in 90 days. The unified dashboard gives us clarity we never had.",
    author: "James O'Brien",
    role: "Growth Lead @ NovaTech",
  },
  {
    quote: "The demo convinced us. The platform delivered more than promised.",
    author: "Amara Osei",
    role: "Head of Digital @ BrightPath Agency",
  },
];

const clients = ["TechVentures Inc.", "ScaleUp Solutions", "GlobalEdge Corp", "NovaTech", "BrightPath Agency"];

export default function Home() {
  const { toast } = useToast();

  const trialForm = useForm<z.infer<typeof trialSchema>>({
    resolver: zodResolver(trialSchema),
    defaultValues: { fullName: "", email: "", company: "", companySize: "" },
  });

  const demoForm = useForm<z.infer<typeof demoSchema>>({
    resolver: zodResolver(demoSchema),
    defaultValues: { fullName: "", email: "", company: "", jobTitle: "", date: "", timeSlot: "" },
  });

  const onTrialSubmit = (data: z.infer<typeof trialSchema>) => {
    toast({ title: "Trial Started!", description: "Check your email for access instructions." });
    trialForm.reset();
  };

  const onDemoSubmit = (data: z.infer<typeof demoSchema>) => {
    toast({ title: "Demo Requested!", description: "We will contact you shortly to confirm your slot." });
    demoForm.reset();
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 pb-32 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 max-w-4xl mx-auto leading-tight">
              An AI-Powered Single Point Solution for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">All Digital Marketing Needs.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto font-medium">
              One Platform. Infinite Possibilities.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-14 px-8 text-lg w-full sm:w-auto" onClick={() => scrollToSection('trial-form')}>
                Start Free 14-Day Trial
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg w-full sm:w-auto" onClick={() => scrollToSection('demo-form')}>
                Request a Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Client Logos Marquee */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-8 font-medium tracking-wide uppercase">
            Trusted by forward-thinking businesses worldwide
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60">
            {clients.map((client, i) => (
              <div key={i} className="text-xl md:text-2xl font-bold text-foreground grayscale hover:grayscale-0 transition-all duration-300 hover:text-primary">
                {client}
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-8 opacity-50">
            Client names for illustrative purposes
          </p>
        </div>
      </section>

      {/* About Section */}
      <section className="py-32 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Redefining Digital Marketing</h2>
            <div className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
              <p>
                At Nexpoint, we are redefining how businesses approach digital marketing. Powered by cutting-edge AI, we have built the industry's first unified ecosystem that eliminates silos — bringing content creation, customer analytics, campaign management, SEO optimization, social media strategy, and performance tracking into one intelligent platform.
              </p>
              <p>
                We believe marketing should not require juggling a dozen tools. Instead, it should be intuitive, interconnected, and powered by AI that learns your business. Our platform does not just execute, it predicts, adapts, and scales with you.
              </p>
              <p className="font-semibold text-foreground text-xl border-l-4 border-primary pl-6 py-2 my-8">
                From startups to enterprises, Nexpoint empowers teams to launch smarter campaigns, spend budgets more efficiently, and achieve measurable growth — all from a single dashboard.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-4 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need. Nothing you don't.</h2>
            <p className="text-xl text-muted-foreground">The complete toolkit for modern marketing teams.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="h-full border-none shadow-md hover:shadow-xl transition-shadow bg-background">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Forms Section */}
      <section className="py-32 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16">
            
            {/* Trial Form */}
            <motion.div
              id="trial-form"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="scroll-mt-32"
            >
              <Card className="border-primary/20 shadow-lg relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -mr-16 -mt-16 pointer-events-none" />
                <CardHeader>
                  <CardTitle className="text-3xl">Start Your Free 14-Day Trial</CardTitle>
                  <CardDescription className="text-lg">No credit card required. Full access. Cancel anytime.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...trialForm}>
                    <form onSubmit={trialForm.handleSubmit(onTrialSubmit)} className="space-y-4">
                      <FormField control={trialForm.control} name="fullName" render={({ field }) => (
                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={trialForm.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Business Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={trialForm.control} name="company" render={({ field }) => (
                        <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={trialForm.control} name="companySize" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Size</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="1-10">1-10</SelectItem>
                              <SelectItem value="11-50">11-50</SelectItem>
                              <SelectItem value="51-200">51-200</SelectItem>
                              <SelectItem value="201-500">201-500</SelectItem>
                              <SelectItem value="500+">500+</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full py-6 mt-4 text-lg">Start Free Trial <ArrowRight className="ml-2 h-5 w-5" /></Button>
                      <p className="text-center text-sm text-muted-foreground mt-4">14 days free, no commitment.</p>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Demo Form */}
            <motion.div
              id="demo-form"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="scroll-mt-32"
            >
              <Card className="bg-slate-900 text-slate-50 border-none shadow-2xl h-full">
                <CardHeader>
                  <CardTitle className="text-3xl">See Nexpoint in Action</CardTitle>
                  <CardDescription className="text-slate-400 text-lg">Get a personalized walkthrough tailored to your business needs.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...demoForm}>
                    <form onSubmit={demoForm.handleSubmit(onDemoSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={demoForm.control} name="fullName" render={({ field }) => (
                          <FormItem><FormLabel className="text-slate-300">Full Name</FormLabel><FormControl><Input className="bg-slate-800 border-slate-700 text-slate-100" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={demoForm.control} name="email" render={({ field }) => (
                          <FormItem><FormLabel className="text-slate-300">Business Email</FormLabel><FormControl><Input className="bg-slate-800 border-slate-700 text-slate-100" type="email" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={demoForm.control} name="company" render={({ field }) => (
                          <FormItem><FormLabel className="text-slate-300">Company Name</FormLabel><FormControl><Input className="bg-slate-800 border-slate-700 text-slate-100" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={demoForm.control} name="jobTitle" render={({ field }) => (
                          <FormItem><FormLabel className="text-slate-300">Job Title</FormLabel><FormControl><Input className="bg-slate-800 border-slate-700 text-slate-100" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={demoForm.control} name="date" render={({ field }) => (
                          <FormItem><FormLabel className="text-slate-300">Preferred Date</FormLabel><FormControl><Input className="bg-slate-800 border-slate-700 text-slate-100" type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={demoForm.control} name="timeSlot" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Time Slot</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100"><SelectValue placeholder="Select time" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="9AM EST">9AM EST</SelectItem>
                                <SelectItem value="11AM EST">11AM EST</SelectItem>
                                <SelectItem value="2PM EST">2PM EST</SelectItem>
                                <SelectItem value="4PM EST">4PM EST</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <Button type="submit" variant="secondary" className="w-full py-6 mt-4 text-lg bg-blue-600 hover:bg-blue-700 text-white border-none">Book My Demo</Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Don't just take our word for it.</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((test, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={i === testimonials.length - 1 ? "md:col-span-2 lg:col-span-1 lg:col-start-2" : ""}
              >
                <Card className="h-full bg-background border-none shadow-sm flex flex-col">
                  <CardContent className="pt-6 flex-grow">
                    <div className="text-primary text-4xl leading-none font-serif mb-2">"</div>
                    <p className="text-lg italic text-muted-foreground">{test.quote}</p>
                  </CardContent>
                  <CardFooter className="flex flex-col items-start border-t bg-muted/10 mt-auto pt-4">
                    <p className="font-semibold">{test.author}</p>
                    <p className="text-sm text-muted-foreground">{test.role}</p>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-24 px-4 bg-primary text-primary-foreground text-center">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold mb-8">Get in Touch</h2>
            <p className="text-xl opacity-90 mb-12 max-w-2xl mx-auto">
              Ready to unify your marketing stack? Have questions about our enterprise features? Our team is here to help.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-xl">
              <a href="mailto:hello@nexpoint.ai" className="flex items-center gap-3 hover:opacity-80 transition-opacity bg-white/10 px-8 py-4 rounded-full backdrop-blur-sm">
                <Mail className="h-6 w-6" />
                hello@nexpoint.ai
              </a>
              <span className="flex items-center gap-3 bg-white/10 px-8 py-4 rounded-full backdrop-blur-sm">
                <Phone className="h-6 w-6" />
                +1 (800) NEX-POINT
              </span>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}