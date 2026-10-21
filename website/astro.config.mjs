import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import { base, repoUrl, site } from './site.config.mjs';

export default defineConfig({
  site,
  base,
  integrations: [
    mermaid({ autoTheme: true }),
    starlight({
      title: 'CityCycle',
      description: 'A worked example of RFC, ADR, and arc42 on a fictional bike-sharing service.',
      social: [{ icon: 'github', label: 'GitHub', href: repoUrl }],
      lastUpdated: false,
      sidebar: [
        { label: 'How this example works', slug: 'tour' },
        {
          label: 'Architecture (arc42)',
          items: [
            { label: 'How to use it', slug: 'architecture' },
            { label: '1. Introduction and goals', slug: 'architecture/01_introduction_and_goals' },
            { label: '2. Constraints', slug: 'architecture/02_architecture_constraints' },
            { label: '3. Context and scope', slug: 'architecture/03_context_and_scope' },
            { label: '4. Solution strategy', slug: 'architecture/04_solution_strategy' },
            { label: '5. Building block view', slug: 'architecture/05_building_block_view' },
            { label: '6. Runtime view', slug: 'architecture/06_runtime_view' },
            { label: '7. Deployment view', slug: 'architecture/07_deployment_view' },
            { label: '8. Cross-cutting concepts', slug: 'architecture/08_concepts' },
            { label: '9. Architecture decisions', slug: 'architecture/09_architecture_decisions' },
            { label: '10. Quality requirements', slug: 'architecture/10_quality_requirements' },
            { label: '11. Risks and technical debt', slug: 'architecture/11_technical_risks' },
            { label: '12. Glossary', slug: 'architecture/12_glossary' },
            {
              label: 'Diagrams',
              items: [
                { label: 'System context', slug: 'architecture/diagrams/c4-context' },
                { label: 'Containers', slug: 'architecture/diagrams/c4-containers' },
              ],
            },
            { label: 'About arc42', slug: 'architecture/about-arc42' },
          ],
        },
        { label: 'Decisions (ADR)', items: [{ autogenerate: { directory: 'adr' } }] },
        { label: 'Proposals (RFC)', items: [{ autogenerate: { directory: 'rfc' } }] },
      ],
    }),
  ],
});
