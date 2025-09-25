import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Separator } from '@/components/ui/separator'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  DollarSign,
  Wrench,
  Shield,
  BarChart3,
  Calendar,
  FileText,
  MessageSquare,
  Zap,
  Star,
  ChevronRight,
  Building2,
  Sparkles,
  Target,
  Gauge
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <Wrench className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">FieldLite CRM</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
              <Link href="#features" className="transition-colors hover:text-foreground/80">Features</Link>
              <Link href="#pricing" className="transition-colors hover:text-foreground/80">Pricing</Link>
              <Link href="#testimonials" className="transition-colors hover:text-foreground/80">Testimonials</Link>
              <Link href="#faq" className="transition-colors hover:text-foreground/80">FAQ</Link>
            </nav>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
        <div className="mx-auto flex max-w-[64rem] flex-col items-center gap-4 text-center">
          <Badge variant="outline" className="px-3 py-1">
            <Sparkles className="mr-2 h-3 w-3" />
            Trusted by 1,000+ Service Businesses
          </Badge>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold">
            Turn Your Boring Business Into a{' '}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Profit Machine
            </span>
          </h1>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            The only CRM built specifically for HVAC, plumbing, electrical, and other essential
            service businesses. Automate operations, delight customers, and scale profitably.
          </p>
          <div className="flex gap-4">
            <Button size="lg" asChild>
              <Link href="/auth/signup">
                Start 30-Day Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#demo">
                Watch Demo
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['No credit card required', '30-day money back', 'Cancel anytime'].map((item) => (
              <div key={item} className="flex items-center text-sm text-muted-foreground">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="container">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <p className="text-sm text-muted-foreground">TRUSTED BY LEADING SERVICE BUSINESSES</p>
          <div className="flex flex-wrap justify-center gap-8 mt-4">
            {['HVAC Pro', 'QuickPlumb', 'EliteElectric', 'PestShield', 'GreenScape'].map((company) => (
              <div key={company} className="flex items-center space-x-2 text-muted-foreground">
                <Building2 className="h-5 w-5" />
                <span className="font-semibold">{company}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Key Metrics */}
      <section className="container py-8 md:py-12">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { icon: Clock, label: '10+ Hours Saved', sublabel: 'Per week on admin' },
            { icon: TrendingUp, label: '30% More Revenue', sublabel: 'Average increase' },
            { icon: Users, label: '87% Win Rate', sublabel: 'On followed-up leads' },
            { icon: DollarSign, label: '15 Days Faster', sublabel: 'Payment collection' }
          ].map((stat, index) => (
            <Card key={index} className="border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-2xl font-bold">{stat.label}</CardTitle>
                <stat.icon className="h-8 w-8 text-primary opacity-50" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{stat.sublabel}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container space-y-6 py-8 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <Badge variant="outline" className="px-3 py-1">
            <Target className="mr-2 h-3 w-3" />
            Everything You Need
          </Badge>
          <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-5xl font-bold">
            Built for How Service Businesses Actually Work
          </h2>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-lg">
            From lead capture to getting paid, we've automated every step of your workflow.
          </p>
        </div>

        <Tabs defaultValue="operations" className="mx-auto max-w-5xl mt-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="sales">Sales & Marketing</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          <TabsContent value="operations" className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <Calendar className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Smart Scheduling</CardTitle>
                  <CardDescription>
                    Drag-and-drop calendar with route optimization, crew management, and conflict prevention.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>Auto-assign based on skills & location</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>SMS reminders reduce no-shows by 70%</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>Real-time GPS tracking of crews</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Gauge className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Field Mobile App</CardTitle>
                  <CardDescription>
                    Everything your techs need in their pocket - works offline too.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>Clock in/out with GPS verification</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>Photo documentation & checklists</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>Collect signatures & payments on-site</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sales" className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <Zap className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Instant Lead Response</CardTitle>
                  <CardDescription>
                    Respond to leads in under 5 minutes automatically with AI-powered routing.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>Web form to CRM in seconds</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>Auto-text new leads immediately</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>Smart lead scoring & routing</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <FileText className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Professional Estimates</CardTitle>
                  <CardDescription>
                    Create beautiful, branded estimates in minutes with e-signatures.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>Good/Better/Best options</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>Photo attachments & diagrams</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>Auto follow-up sequences</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <DollarSign className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Get Paid Faster</CardTitle>
                  <CardDescription>
                    Invoice instantly and accept payments on-site or online.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>Accept cards, ACH, financing</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>Automated payment reminders</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>QuickBooks sync</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <BarChart3 className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Real-Time Analytics</CardTitle>
                  <CardDescription>
                    Know exactly which jobs, techs, and marketing sources are profitable.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>Job costing & profit margins</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>Tech performance scorecards</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>Marketing ROI tracking</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="container py-8 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <Badge variant="outline" className="px-3 py-1">
            <Star className="mr-2 h-3 w-3" />
            Customer Success
          </Badge>
          <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-5xl font-bold">
            Boring Businesses, Extraordinary Results
          </h2>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3 mt-8">
          {[
            {
              name: 'Mike Johnson',
              company: 'Johnson HVAC',
              quote: 'FieldLite helped us go from 5 to 25 employees in 18 months. The automation alone saves us 15 hours a week.',
              rating: 5
            },
            {
              name: 'Sarah Chen',
              company: 'Precision Plumbing',
              quote: "Our close rate went from 30% to 65% just by responding to leads faster. This software paid for itself in 2 weeks.",
              rating: 5
            },
            {
              name: 'Tom Williams',
              company: 'Elite Electric',
              quote: 'Finally, a CRM that my techs actually use! The mobile app is perfect for the field.',
              rating: 5
            }
          ].map((testimonial, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex mb-2">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <CardDescription className="text-base">
                  "{testimonial.quote}"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">{testimonial.company}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container py-8 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <Badge variant="outline" className="px-3 py-1">
            <DollarSign className="mr-2 h-3 w-3" />
            Simple Pricing
          </Badge>
          <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-5xl font-bold">
            Pricing That Scales With You
          </h2>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-lg">
            Start free, upgrade when you're ready. No contracts, cancel anytime.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3 mt-8">
          {[
            {
              name: 'Starter',
              price: '$49',
              description: 'Perfect for solo operators',
              features: ['1 user', 'Up to 100 contacts', 'Basic scheduling', 'Email support'],
              cta: 'Start Free',
              variant: 'outline' as const
            },
            {
              name: 'Professional',
              price: '$149',
              description: 'For growing teams',
              features: ['Up to 5 users', 'Unlimited contacts', 'Advanced automation', 'Priority support', 'QuickBooks sync'],
              cta: 'Start Free Trial',
              variant: 'default' as const,
              popular: true
            },
            {
              name: 'Business',
              price: '$299',
              description: 'For established companies',
              features: ['Up to 20 users', 'Everything in Pro', 'API access', 'Custom training', 'Dedicated success manager'],
              cta: 'Contact Sales',
              variant: 'outline' as const
            }
          ].map((plan) => (
            <Card key={plan.name} className={plan.popular ? 'border-primary shadow-lg' : ''}>
              {plan.popular && (
                <div className="text-center">
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start text-sm">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={plan.variant}>
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="container py-8 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <Badge variant="outline" className="px-3 py-1">
            <MessageSquare className="mr-2 h-3 w-3" />
            FAQ
          </Badge>
          <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-5xl font-bold">
            Frequently Asked Questions
          </h2>
        </div>

        <Accordion type="single" collapsible className="mx-auto max-w-3xl mt-8">
          <AccordionItem value="item-1">
            <AccordionTrigger>How quickly can I get started?</AccordionTrigger>
            <AccordionContent>
              Most businesses are up and running in under 24 hours. We provide white-glove onboarding
              including data migration from your existing system, custom training for your team, and
              configuration of your workflows.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Do you integrate with QuickBooks?</AccordionTrigger>
            <AccordionContent>
              Yes! We have deep, two-way sync with QuickBooks Online and QuickBooks Desktop. Your
              customers, invoices, payments, and items stay perfectly in sync.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>What if my techs aren't tech-savvy?</AccordionTrigger>
            <AccordionContent>
              FieldLite is designed for field workers. Our mobile app is simpler than Facebook - if
              they can use a smartphone, they can use FieldLite. We also provide unlimited training
              and have a 98% adoption rate among field teams.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionTrigger>Can I import my existing data?</AccordionTrigger>
            <AccordionContent>
              Absolutely! We can import from any system including ServiceTitan, Housecall Pro, Jobber,
              or even Excel spreadsheets. Our migration team handles everything for you at no extra cost.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-5">
            <AccordionTrigger>Is there a contract or setup fee?</AccordionTrigger>
            <AccordionContent>
              No contracts, no setup fees, no hidden costs. It's month-to-month and you can cancel
              anytime. We believe in earning your business every month.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* CTA Section */}
      <section className="container py-8 md:py-12 lg:py-24">
        <Card className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0">
          <CardHeader className="text-center pb-8 pt-10">
            <CardTitle className="text-3xl md:text-4xl font-bold">
              Ready to 10x Your Boring Business?
            </CardTitle>
            <CardDescription className="text-white/90 text-lg mt-2">
              Join 1,000+ service businesses already using FieldLite to dominate their local market.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4 pb-10">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/auth/signup">
                  Start Your Free 30-Day Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20" asChild>
                <Link href="/demo">
                  Schedule a Demo
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {['No credit card required', '30-day money back guarantee', 'Cancel anytime'].map((item) => (
                <div key={item} className="flex items-center text-sm text-white/80">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container py-8 md:py-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Wrench className="h-6 w-6 text-primary" />
                <span className="font-bold">FieldLite CRM</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Optimize operations and customer relations for boring businesses.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-foreground">Pricing</Link></li>
                <li><Link href="/integrations" className="hover:text-foreground">Integrations</Link></li>
                <li><Link href="/changelog" className="hover:text-foreground">Changelog</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground">About</Link></li>
                <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-foreground">Careers</Link></li>
                <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground">Terms</Link></li>
                <li><Link href="/security" className="hover:text-foreground">Security</Link></li>
                <li><Link href="/gdpr" className="hover:text-foreground">GDPR</Link></li>
              </ul>
            </div>
          </div>
          <Separator className="my-8" />
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © 2025 FieldLite CRM. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Built with ❤️ for the businesses that keep America running.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}