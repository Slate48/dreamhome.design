import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import SectionReveal from '../components/shared/SectionReveal';
import { Heart, Eye, Users } from 'lucide-react';

const aboutHero = 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/920e96a43_Screenshot2026-04-22094325.jpg';

const values = [
  { icon: Heart, title: 'Craftsmanship', desc: 'Every detail matters. From the selection of premium hardwoods to the precision of our CNC machining, we treat each project as a masterwork — because that\'s exactly what it is.' },
  { icon: Eye, title: 'Transparency', desc: 'No surprises, no hidden costs. We walk you through every phase of your project with clear timelines, honest pricing, and open communication from start to finish.' },
  { icon: Users, title: 'Partnership', desc: 'Your project is a collaboration. We listen deeply, design thoughtfully, and build with the care we\'d give our own homes. Your vision drives every decision we make.' },
];

const DEPT_ORDER = ['Sales', 'Cabinetry', 'Design', 'Estimating', 'Engineering', 'Project Management', 'Countertop', 'Administration', 'Management'];

export default function About() {
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    base44.entities.TeamMember.list('sort_order', 100).then(setTeamMembers);
  }, []);

  const founders = teamMembers.filter(m => m.is_founder);

  const grouped = DEPT_ORDER.reduce((acc, dept) => {
    const members = teamMembers
      .filter(m => m.department === dept)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    if (members.length) acc[dept] = members;
    return acc;
  }, {});

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
              {founders.length > 0 ? founders.map((f, i) => (
                <div key={f.id} className={i % 2 !== 0 ? 'mt-8' : ''}>
                  {f.photo_url
                    ? <img src={f.photo_url} alt={f.name} className="w-full h-80 object-cover object-top rounded-lg shadow-xl" />
                    : <div className="w-full h-80 rounded-lg shadow-xl bg-warm-gray flex items-center justify-center text-4xl font-heading text-gold/50">{f.name.split(' ').map(n => n[0]).join('')}</div>
                  }
                  <p className="text-center font-body text-sm text-muted-foreground mt-2">{f.name.split(' ')[0]}</p>
                </div>
              )) : (
                <>
                  <div>
                    <img src="https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/b9de115e3_Screenshot2026-05-20at10320PM.png" alt="Rebecca Siewin" className="w-full h-80 object-cover object-top rounded-lg shadow-xl" />
                    <p className="text-center font-body text-sm text-muted-foreground mt-2">Rebecca</p>
                  </div>
                  <div className="mt-8">
                    <img src="https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/6704075b6_Screenshot2026-05-20at10140PM.png" alt="Bryan Siewin" className="w-full h-80 object-cover object-top rounded-lg shadow-xl" />
                    <p className="text-center font-body text-sm text-muted-foreground mt-2">Bryan</p>
                  </div>
                </>
              )}
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

          {Object.entries(grouped).map(([dept, members], di) => (
            <SectionReveal key={dept} delay={di * 0.1}>
              <div className="mb-12">
                <h3 className="font-heading text-xl text-foreground mb-6 pb-3 border-b border-gold/20">{dept}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {members.map(member => (
                    <div key={member.id} className="text-center group">
                      <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-warm-gray overflow-hidden flex items-center justify-center text-2xl font-heading text-gold/70 group-hover:bg-gold/10 transition-colors">
                        {member.photo_url
                          ? <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover object-top" />
                          : member.name.split(' ').map(n => n[0]).join('')
                        }
                      </div>
                      <p className="font-body text-sm font-medium text-foreground">{member.name}</p>
                      {member.show_title !== false && member.title && (
                        <p className="font-body text-xs text-muted-foreground mt-1">{member.title}</p>
                      )}
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