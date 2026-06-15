import React from 'react';
import PageHeader from '../components/shared/PageHeader';
import SectionReveal from '../components/shared/SectionReveal';
import { Heart, Eye, Users } from 'lucide-react';

const aboutHero = 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/b9de115e3_Screenshot2026-05-20at10320PM.png';
const rebeccaImage = 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/b9de115e3_Screenshot2026-05-20at10320PM.png';
const bryanImage = 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/6704075b6_Screenshot2026-05-20at10140PM.png';

const departments = [
  {
    name: 'Design',
    members: [
      { name: 'Rebecca Siewin', title: 'Owner & Director of Design' },
      { name: 'Veralin Bergen', title: 'Senior Interior & Cabinet Designer' },
      { name: 'Stephanie Reuter', title: 'Cabinet Designer' },
      { name: 'Anna Troup', title: 'Junior Interior & Cabinet Designer' },
      { name: 'Andrea Ortega', title: 'Junior Cabinet Designer' },
    ]
  },
  {
    name: 'Sales & Admin',
    members: [
      { name: 'Bryan Siewin', title: 'Owner & CEO' },
      { name: 'Bojana Sabic', title: 'Office Manager' },
      { name: 'Theresa Iselman', title: 'Lead Estimator' },
      { name: 'Steve Ramos', title: 'Estimator & Engineer' },
    ]
  },
  {
    name: 'Operations',
    members: [
      { name: 'Amber Siewin', title: 'Director of Business Services' },
      { name: 'Tess Berlinski', title: 'Administrative Assistant' },
      { name: 'Angel Vazquez', title: 'Field Project Manager' },
      { name: 'Alan Vasquez', title: 'Field Project Manager' },
    ]
  },
  {
    name: 'Engineering & Production',
    members: [
      { name: 'Chad Siewin', title: 'President of Operations' },
      { name: 'Michael Giambone', title: 'Lead Engineer' },
      { name: 'Matt Dew', title: 'Engineer' },
      { name: 'Kevin Scelza', title: 'Engineer' },
    ]
  },
  {
    name: 'Countertop Fabrication',
    members: [
      { name: 'Holly Grim', title: 'Fabrication Manager' },
      { name: 'Juan Ortiz', title: 'Fabrication Specialist' },
      { name: 'Jordan Rowell', title: 'Fabrication Specialist' },
    ]
  }
];

const values = [
  { icon: Heart, title: 'Craftsmanship', desc: 'Every detail matters. From the selection of premium hardwoods to the precision of our CNC machining, we treat each project as a masterwork — because that\'s exactly what it is.' },
  { icon: Eye, title: 'Transparency', desc: 'No surprises, no hidden costs. We walk you through every phase of your project with clear timelines, honest pricing, and open communication from start to finish.' },
  { icon: Users, title: 'Partnership', desc: 'Your project is a collaboration. We listen deeply, design thoughtfully, and build with the care we\'d give our own homes. Your vision drives every decision we make.' },
];

export default function About() {
  return (
    <div>
      <PageHeader
        title="The Dream Home Story"
        subtitle="Where craftsmanship meets artistry"
        imageUrl={aboutHero}
      />

      {/* Founders */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <SectionReveal>
            <div className="grid grid-cols-2 gap-4">
              <img src={rebeccaImage} alt="Rebecca Siewin" className="w-full h-80 object-cover object-top rounded-lg shadow-xl" />
              <img src={bryanImage} alt="Bryan Siewin" className="w-full h-80 object-cover object-top rounded-lg shadow-xl mt-8" />
            </div>
          </SectionReveal>
          <SectionReveal delay={0.2}>
            <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-3">The Founders</p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-6">Rebecca & Bryan Siewin</h2>
            <p className="font-body text-muted-foreground leading-relaxed mb-4">
              What started as a shared passion for exceptional design has grown into one of Arizona's most trusted custom cabinetry studios. Rebecca brings an artist's eye for design and a deep understanding of how spaces should feel, while Bryan brings the business acumen and operational excellence that ensures every project is delivered on time and beyond expectations.
            </p>
            <p className="font-body text-muted-foreground leading-relaxed">
              Together, they've assembled a team of designers, engineers, and craftspeople who share their commitment to quality and their belief that your home should be the most beautiful place in your world.
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 px-4 bg-cream">
        <div className="max-w-6xl mx-auto">
          <SectionReveal>
            <div className="text-center mb-16">
              <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-3">Our People</p>
              <h2 className="font-heading text-3xl md:text-4xl text-foreground">The Team Behind Your Dream</h2>
            </div>
          </SectionReveal>

          {departments.map((dept, di) => (
            <SectionReveal key={dept.name} delay={di * 0.1}>
              <div className="mb-12">
                <h3 className="font-heading text-xl text-foreground mb-6 pb-3 border-b border-gold/20">{dept.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {dept.members.map(member => (
                    <div key={member.name} className="text-center group">
                      <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-warm-gray overflow-hidden flex items-center justify-center group-hover:ring-2 group-hover:ring-gold/40 transition-all">
                        {member.headshot ? (
                          <img src={member.headshot} alt={member.name} className="w-full h-full object-cover object-top" />
                        ) : (
                          <span className="text-2xl font-heading text-gold/70">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        )}
                      </div>
                      <p className="font-body text-sm font-medium text-foreground">{member.name}</p>
                      <p className="font-body text-xs text-muted-foreground mt-1">{member.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </SectionReveal>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <SectionReveal>
            <div className="text-center mb-16">
              <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-3">Our Values</p>
              <h2 className="font-heading text-3xl md:text-4xl text-foreground">What We Stand For</h2>
            </div>
          </SectionReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {values.map((v, i) => (
              <SectionReveal key={v.title} delay={i * 0.1}>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gold/10 flex items-center justify-center">
                    <v.icon className="w-7 h-7 text-gold" />
                  </div>
                  <h3 className="font-heading text-xl text-foreground mb-3">{v.title}</h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}