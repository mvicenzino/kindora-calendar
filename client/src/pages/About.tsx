import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Heart, ArrowRight, Users, Calendar, Sparkles, Quote } from "lucide-react";

const logo = "/kindora-logo.jpeg";

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border px-4 md:px-6 py-4 sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <img src={logo} alt="Kindora" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-foreground text-lg">Kindora</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/support">
              <Button variant="ghost" size="sm" data-testid="link-support">Support</Button>
            </Link>
            <Link href="/">
              <Button size="sm" data-testid="link-get-started">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 md:px-6 py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-primary/20">
            <Heart className="w-4 h-4" />
            Our Story
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            Built for the families<br />holding everything together
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Kindora exists because someone needed it badly — and nothing out there was built for families like ours.
          </p>
        </div>
      </section>

      {/* Founder story */}
      <section className="px-4 md:px-6 pb-16 md:pb-20">
        <div className="max-w-3xl mx-auto">

          {/* Pull quote */}
          <div className="relative mb-12 p-6 md:p-8 bg-card border border-border rounded-2xl">
            <Quote className="w-8 h-8 text-primary/30 mb-3" />
            <p className="text-xl md:text-2xl font-medium text-foreground leading-relaxed italic">
              "I was getting calls from my mom's doctor while simultaneously trying to remember if my son had soccer practice or a dentist appointment — and I was doing all of it through a mess of group texts and sticky notes."
            </p>
            <p className="mt-4 text-sm font-semibold text-primary">— Michael Vicenzino, Founder</p>
          </div>

          {/* Story body */}
          <div className="space-y-8 text-foreground/90 leading-relaxed text-lg">
            <p>
              There's a term for the generation caught between raising young children and caring for aging parents: the <strong className="text-foreground">sandwich generation</strong>. If you're in it, you know exactly what it feels like. You're the one who gets the call when dad misses a cardiology appointment. You're the one coordinating the caregiver schedule, the school pickups, the soccer carpools, and the medication reminders — all at once, all from your phone, all between meetings.
            </p>

            <p>
              That was my life a few years ago. My kids were young, full of activities and appointments that seemed to multiply weekly. My parents were getting older, and the complexity of keeping them safe, healthy, and not alone was growing in ways I hadn't anticipated. I was juggling two entirely different care systems in my head, with no good tools to help.
            </p>

            <p>
              I tried everything. Google Calendar was fine for my own schedule but terrible for sharing context with caregivers. Group texts worked until they didn't — too noisy, too scattered, nothing searchable. Apps built for parents didn't handle eldercare. Apps built for eldercare didn't handle kids. Nothing understood that families today aren't one-dimensional.
            </p>

            <div className="bg-muted/40 border border-border rounded-xl p-6 my-8">
              <p className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                The moment Kindora clicked
              </p>
              <p className="text-base text-muted-foreground leading-relaxed">
                I was trying to brief a home health aide about my dad's medication schedule, my sister about an upcoming specialist visit, and my wife about a schedule change for our son — all on the same Tuesday afternoon. Three separate conversations, three separate apps, zero coordination. I thought: <em>why doesn't something exist that holds all of this together?</em> A family operating system. One place for all the people, all the schedules, all the information that keeps a family functioning.
              </p>
            </div>

            <p>
              Kindora was born from that frustration — and from a deep belief that the people doing this work deserve better tools. The sandwich generation isn't a niche. There are 53 million family caregivers in the United States alone. They are parents and children simultaneously. They are CEOs of impossibly complex logistics. And most of them are doing it with apps that weren't designed for them.
            </p>

            <p>
              I built Kindora to be the tool I wished existed. A private, shared space where the whole care team — family members, professional caregivers, healthcare providers — can see what they need to see, coordinate in real time, and not drop the ball on the things that actually matter. A calendar that understands context. Messaging that lives next to the events it's about. A place to store documents, track medications, and keep memories.
            </p>

            <p>
              And with Kira — our AI family advisor — a place to get thoughtful guidance on the hard stuff. The conversations about dementia. The toddler who won't eat anything green. The caregiver burnout you don't want to admit to. Kindora is built to hold all of it.
            </p>

            <p>
              We're still early. Kindora is in beta, which means we're learning alongside families every day. If you're in the sandwich generation, if you're caring for someone you love while also raising someone you love, we built this for you. I hope it helps.
            </p>
          </div>

          {/* Signature block */}
          <div className="mt-10 pt-8 border-t border-border flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              M
            </div>
            <div>
              <p className="font-bold text-foreground">Michael Vicenzino</p>
              <p className="text-sm text-muted-foreground">Founder, Kindora</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values strip */}
      <section className="px-4 md:px-6 py-14 md:py-16 bg-muted/30 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">What we believe</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-xl p-6 text-center hover-elevate">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2">Families first</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">We are building for real families navigating real complexity — not a simplified version of family life.</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 text-center hover-elevate">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                <Users className="w-5 h-5 text-violet-500" />
              </div>
              <h3 className="font-bold text-foreground mb-2">Private by design</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Your family's information belongs to your family. No ads, no data selling, no algorithms deciding what you see.</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 text-center hover-elevate">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="font-bold text-foreground mb-2">Reduce the load</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Every feature we build asks: does this actually make a caregiver's day easier? If not, we don't ship it.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 md:px-6 py-16 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Have questions or feedback?</h2>
          <p className="text-muted-foreground mb-6">We'd love to hear from you — especially during beta. Every message goes directly to the team.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/support">
              <Button data-testid="link-contact-us">
                Contact us
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" data-testid="link-try-kindora">Try Kindora free</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 md:px-6 py-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">© 2026 Kindora Family, Inc.</p>
          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link href="/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Support</Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
