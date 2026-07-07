import { useRef } from "react"

export default function App() {
  const projectsRef = useRef<HTMLElement>(null)
  const contactRef = useRef<HTMLElement>(null)

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth" })

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── VIDEO BACKGROUND ── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
          type="video/mp4"
        />
      </video>

      {/* ── NAVIGATION ── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <span
          className="text-3xl tracking-tight text-foreground"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Shriya<sup className="text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>®</sup>
        </span>

        <div className="hidden md:flex items-center gap-8">
          <a href="#" className="text-sm text-foreground transition-colors">Home</a>
          <a
            href="#projects"
            onClick={(e) => { e.preventDefault(); scrollTo(projectsRef) }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Projects
          </a>
          <a
            href="#contact"
            onClick={(e) => { e.preventDefault(); scrollTo(contactRef) }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Contact
          </a>
        </div>

        <button
          onClick={() => scrollTo(contactRef)}
          className="liquid-glass rounded-full px-6 py-2.5 text-sm text-foreground transition-all"
        >
          Begin Journey
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 min-h-[calc(100vh-80px)] py-[90px]">
        <h1
          className="animate-fade-rise text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-[-2.46px] max-w-7xl font-normal"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Where{" "}
          <em className="not-italic text-muted-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>
            dreams
          </em>{" "}
          rise{" "}
          <em className="not-italic text-muted-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>
            through the silence.
          </em>
        </h1>

        <p className="animate-fade-rise-delay text-muted-foreground text-base sm:text-lg max-w-2xl mt-8 leading-relaxed">
          I&apos;m an IT student passionate about building AI applications, modern websites,
          and innovative digital products. Turning ideas into practical solutions through technology.
        </p>

        <button
          onClick={() => scrollTo(projectsRef)}
          className="animate-fade-rise-delay-2 liquid-glass rounded-full px-14 py-5 text-base text-foreground mt-12 transition-all"
        >
          See My Work
        </button>
      </section>

      {/* ── ABOUT ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <p className="text-xs tracking-[3px] uppercase text-muted-foreground/70 mb-3 font-medium">About</p>
        <h2 className="text-4xl sm:text-5xl font-normal mb-6" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Professional Summary
        </h2>
        <p className="text-muted-foreground text-base sm:text-lg max-w-3xl leading-relaxed">
          Information Technology student passionate about building AI applications, modern websites,
          and innovative digital products. Interested in full-stack development, automation, and
          user-focused design. Enjoy turning ideas into practical solutions through technology.
        </p>
      </section>

      {/* ── EDUCATION ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <p className="text-xs tracking-[3px] uppercase text-muted-foreground/70 mb-3 font-medium">Education</p>
        <h2 className="text-4xl sm:text-5xl font-normal mb-12" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Academic Background
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { degree: "B.E. Information Technology", school: "Shree Rayeshwar Institute of Engineering & IT", tags: ["CGPA: 8.37", "SGPA: 8.40"] },
            { degree: "Higher Secondary (CBSE)", school: "Mount Litera Zee School, Goa", tags: ["2024", "66%"] },
            { degree: "Secondary (CBSE)", school: "The King's School, Goa", tags: ["2022", "85%"] },
          ].map((item, i) => (
            <div key={i} className="rounded-xl p-6 border border-border/40 bg-background/40 backdrop-blur-sm hover:border-border/80 transition-all">
              <div className="w-2 h-2 rounded-full bg-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-1">{item.degree}</h3>
              <p className="text-sm text-muted-foreground/80 mb-3">{item.school}</p>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span key={tag} className="text-xs px-3 py-1 rounded-full border border-border/40 text-muted-foreground">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SKILLS ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <p className="text-xs tracking-[3px] uppercase text-muted-foreground/70 mb-3 font-medium">Skills</p>
        <h2 className="text-4xl sm:text-5xl font-normal mb-12" style={{ fontFamily: "'Instrument Serif', serif" }}>
          What I Work With
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { label: "Programming", items: ["Java"] },
            { label: "AI & Automation", items: ["Prompt Engineering", "Claude Code", "n8n", "Vapi"] },
            { label: "Databases", items: ["Firebase", "MySQL (Basic)"] },
            { label: "Tools", items: ["VS Code", "Git", "GitHub", "Figma", "Postman"] },
            { label: "Core Concepts", items: ["OOP (Java)", "Operating Systems"] },
            { label: "Soft Skills", items: ["Problem Solving", "Creativity", "Adaptability", "Communication", "Continuous Learning"] },
          ].map((group) => (
            <div key={group.label}>
              <h3 className="text-xs tracking-[2px] uppercase text-muted-foreground/60 mb-3 font-medium">{group.label}</h3>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <span key={item} className="text-sm px-4 py-1.5 rounded-full border border-border/40 text-muted-foreground/90 hover:border-foreground/30 hover:text-foreground transition-all">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROJECT ── */}
      <section ref={projectsRef} className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <p className="text-xs tracking-[3px] uppercase text-muted-foreground/70 mb-3 font-medium">Projects</p>
        <h2 className="text-4xl sm:text-5xl font-normal mb-4" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Featured Work
        </h2>
        <p className="text-muted-foreground text-sm mb-10 max-w-xl">Here&apos;s what I&apos;ve been building.</p>

        <div className="rounded-2xl border border-border/40 bg-background/30 backdrop-blur-md p-8 sm:p-10">
          <span className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border border-foreground/20 text-muted-foreground mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-pulse" />
            AI Project
          </span>
          <h2 className="text-2xl sm:text-3xl font-normal mb-4 flex items-center gap-3" style={{ fontFamily: "'Instrument Serif', serif" }}>
            <span className="text-muted-foreground">✦</span> AI Voice Receptionist
          </h2>
          <div className="text-muted-foreground text-base leading-relaxed max-w-2xl space-y-3">
            <p>Built an AI voice receptionist that calls new leads, answers common queries, qualifies prospects, and schedules appointments — handling the full lead engagement pipeline from first call to booked meeting.</p>
            <p>Automated lead tracking, conversation summaries, and follow-up calls so no prospect falls through the cracks.</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-5">
            {["n8n", "OpenAI API", "Vapi", "Twilio"].map((tech) => (
              <span key={tech} className="text-xs font-medium px-4 py-1.5 rounded-full border border-border/40 text-muted-foreground">{tech}</span>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
            {[
              { icon: "📞", label: "Outbound calls" },
              { icon: "💬", label: "Answers queries" },
              { icon: "✓", label: "Qualifies leads" },
              { icon: "📅", label: "Schedules meetings" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border/30 bg-background/20 text-sm">
                <span className="text-xs">{f.icon}</span>
                <span className="text-muted-foreground">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MORE ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <p className="text-xs tracking-[3px] uppercase text-muted-foreground/70 mb-3 font-medium">More</p>
        <h2 className="text-4xl sm:text-5xl font-normal mb-8" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Beyond the Code
        </h2>
        <div className="flex flex-wrap gap-3 mb-8">
          {[
            { icon: "🥋", label: "Karate Practitioner" },
            { icon: "🌐", label: "English · Hindi · Konkani" },
          ].map((item) => (
            <span key={item.label} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border/40 text-sm text-muted-foreground bg-background/20">
              <span>{item.icon}</span>
              {item.label}
            </span>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: "💼", title: "Internship / Experience", desc: "Coming soon" },
            { icon: "🏅", title: "Certifications", desc: "Coming soon" },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-dashed border-border/40 p-6 text-center bg-background/10">
              <div className="text-2xl mb-2">{item.icon}</div>
              <h4 className="text-sm font-medium text-muted-foreground">{item.title}</h4>
              <p className="text-xs text-muted-foreground/60 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section ref={contactRef} className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <p className="text-xs tracking-[3px] uppercase text-muted-foreground/70 mb-3 font-medium">Contact</p>
        <h2 className="text-4xl sm:text-5xl font-normal mb-4" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Get in Touch
        </h2>
        <p className="text-muted-foreground text-sm mb-10 max-w-lg">Have a project in mind or just want to say hi?</p>
        <div className="flex flex-wrap gap-3">
          {[
            { href: "mailto:shriyauskaikar23@gmail.com", icon: "✉", label: "shriyauskaikar23@gmail.com" },
            { href: "tel:+918830254921", icon: "📱", label: "+91 88302 54921" },
            { href: "#", icon: "📍", label: "Margao, Goa" },
          ].map((link) => (
            <a key={link.label} href={link.href} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border/40 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-background/20 backdrop-blur-sm transition-all">
              <span>{link.icon}</span>
              {link.label}
            </a>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 text-center py-10 px-6 border-t border-border/20">
        <p className="text-sm text-muted-foreground/60">&copy; 2026 Shriya Uskaikar &mdash; built with curiosity</p>
      </footer>
    </div>
  )
}
